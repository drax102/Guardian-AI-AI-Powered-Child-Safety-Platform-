import { AlertType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { realtimeService } from "../../realtime/realtime.service";
import {
  ALERT_TYPE_WEIGHTS,
  SEVERITY_WEIGHTS,
  REPETITION_CONFIG,
  EVIDENCE_CONFIG,
  RISK_ENGINE_MODEL,
  RISK_ENGINE_VERSION,
  getRiskLevelForScore,
} from "./risk-engine.config";
import { AnalyzeAlertContext, RiskSignals } from "./risk-engine.types";

export class RiskEngineService {
  /**
   * Internal method to analyze an alert and its structured signals.
   * Produces a normalized risk assessment, persists it idempotently,
   * and emits a realtime Socket.IO notification to the owning parent.
   */
  async analyzeAlert(alertId: string, context?: AnalyzeAlertContext) {
    // 1. Load Alert with relations
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        evidence: true,
        child: true,
        device: true,
      },
    });

    if (!alert) {
      throw new AppError("Alert not found", 404);
    }

    // 2. Tenant isolation check when invoked from a user context
    if (context?.userId && alert.userId !== context.userId) {
      throw new AppError("Alert not found", 404);
    }

    // 3. Extract and evaluate input signals
    const typeWeight = ALERT_TYPE_WEIGHTS[alert.type] ?? 10;
    const severityWeight = SEVERITY_WEIGHTS[alert.severity] ?? 15;

    // Repetition Signal: Count related alerts in rolling 7-day window for the same tenant
    const windowStart = new Date(
      Date.now() - REPETITION_CONFIG.WINDOW_DAYS * 24 * 60 * 60 * 1000
    );
    const repeatAlertCount = await prisma.alert.count({
      where: {
        userId: alert.userId,
        type: alert.type,
        id: { not: alert.id },
        createdAt: { gte: windowStart },
        ...(alert.childId ? { childId: alert.childId } : {}),
      },
    });

    let repetitionWeight = 0;
    for (const tier of REPETITION_CONFIG.TIERS) {
      if (repeatAlertCount >= tier.minCount) {
        repetitionWeight = tier.points;
        break;
      }
    }

    // Evidence Signal: Count and types of attached evidence
    const evidenceCount = alert.evidence ? alert.evidence.length : 0;
    const hasVideoEvidence = alert.evidence
      ? alert.evidence.some((e) => e.resourceType === "video")
      : false;

    let evidenceWeight = 0;
    if (evidenceCount >= 2 || hasVideoEvidence) {
      evidenceWeight = EVIDENCE_CONFIG.MULTIPLE_ITEMS_OR_VIDEO_POINTS;
    } else if (evidenceCount === 1) {
      evidenceWeight = EVIDENCE_CONFIG.SINGLE_ITEM_POINTS;
    }

    // 4. Calculate deterministic score and clamp to [0, 100]
    const rawScore =
      typeWeight + severityWeight + repetitionWeight + evidenceWeight;
    const score = Math.max(0, Math.min(100, rawScore));
    const riskLevel = getRiskLevelForScore(score);
    const safetyScore = 100 - score;

    // 5. Categorize breakdown scores
    let cyberbullyingRisk = 0;
    let contentRisk = 0;
    let predatorRisk = 0;
    let screenTimeRisk = 0;

    switch (alert.type) {
      case AlertType.CYBERBULLYING:
        cyberbullyingRisk = score;
        break;
      case AlertType.EXPLICIT_CONTENT:
        contentRisk = score;
        break;
      case AlertType.ONLINE_PREDATION:
      case AlertType.STRANGER_DANGER:
      case AlertType.SUSPICIOUS_MESSAGING:
        predatorRisk = score;
        break;
      case AlertType.SCREEN_TIME_VIOLATION:
      case AlertType.UNAUTHORIZED_APP:
        screenTimeRisk = score;
        break;
    }

    // 6. Generate transparent, factual signal explanation
    const explanationParts = [
      `${alert.severity} severity (+${severityWeight})`,
      `${alert.type.replace(/_/g, " ")} alert type (+${typeWeight})`,
    ];
    if (repeatAlertCount > 0) {
      explanationParts.push(
        `repeated incidents (${repeatAlertCount} in past ${REPETITION_CONFIG.WINDOW_DAYS}d, +${repetitionWeight})`
      );
    }
    if (evidenceCount > 0) {
      explanationParts.push(
        `evidence attached (${evidenceCount} asset${
          evidenceCount > 1 ? "s" : ""
        }, +${evidenceWeight})`
      );
    }
    const explanation =
      explanationParts.join(", ") +
      `. Total risk score: ${score}/100 (${riskLevel}).`;

    // 7. Persist RiskAssessment idempotently via upsert on unique alertId
    const assessment = await prisma.riskAssessment.upsert({
      where: { alertId: alert.id },
      create: {
        alertId: alert.id,
        childId: alert.childId,
        score,
        riskLevel,
        safetyScore,
        cyberbullyingRisk,
        contentRisk,
        predatorRisk,
        screenTimeRisk,
        model: RISK_ENGINE_MODEL,
        modelVersion: RISK_ENGINE_VERSION,
        explanation,
        summaryNotes: `Assessed by ${RISK_ENGINE_MODEL} v${RISK_ENGINE_VERSION} for alert ${alert.id}`,
      },
      update: {
        childId: alert.childId,
        score,
        riskLevel,
        safetyScore,
        cyberbullyingRisk,
        contentRisk,
        predatorRisk,
        screenTimeRisk,
        model: RISK_ENGINE_MODEL,
        modelVersion: RISK_ENGINE_VERSION,
        explanation,
        summaryNotes: `Re-assessed by ${RISK_ENGINE_MODEL} v${RISK_ENGINE_VERSION} for alert ${alert.id}`,
        calculatedAt: new Date(),
      },
      include: {
        child: {
          select: { id: true, name: true, age: true },
        },
        alert: {
          select: { id: true, type: true, severity: true, message: true },
        },
      },
    });

    // 8. Emit realtime event to alert owner's room
    realtimeService.emitToUser(
      alert.userId,
      "risk:assessment_created",
      assessment
    );

    return assessment;
  }
}

export const riskEngineService = new RiskEngineService();
