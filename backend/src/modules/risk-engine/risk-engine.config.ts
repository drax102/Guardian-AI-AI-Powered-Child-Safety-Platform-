import { AlertType, Severity, RiskLevel } from "@prisma/client";

/**
 * Model Provenance Information
 * Identifies the deterministic baseline risk model and version.
 */
export const RISK_ENGINE_MODEL = "guardianai-rule-engine";
export const RISK_ENGINE_VERSION = "1.0.0";

/**
 * Base Risk Contribution by Alert Type (Max: 40 points)
 * Maps each domain alert category to a calibrated risk weight.
 */
export const ALERT_TYPE_WEIGHTS: Record<AlertType, number> = {
  [AlertType.ONLINE_PREDATION]: 40,
  [AlertType.STRANGER_DANGER]: 35,
  [AlertType.EXPLICIT_CONTENT]: 30,
  [AlertType.CYBERBULLYING]: 25,
  [AlertType.SUSPICIOUS_MESSAGING]: 20,
  [AlertType.UNAUTHORIZED_APP]: 15,
  [AlertType.SCREEN_TIME_VIOLATION]: 10,
};

/**
 * Severity Contribution (Max: 35 points)
 * Calibrated according to incident severity level.
 */
export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  [Severity.CRITICAL]: 35,
  [Severity.HIGH]: 25,
  [Severity.MEDIUM]: 15,
  [Severity.LOW]: 5,
};

/**
 * Repetition Signal Configuration (Max: 15 points)
 * Escalates risk when related incidents occur repeatedly within a 7-day rolling window.
 * Strictly bounded to prevent score runaway.
 */
export const REPETITION_CONFIG = {
  WINDOW_DAYS: 7,
  MAX_CONTRIBUTION: 15,
  TIERS: [
    { minCount: 3, points: 15 },
    { minCount: 2, points: 10 },
    { minCount: 1, points: 5 },
  ],
};

/**
 * Evidence Signal Configuration (Max: 10 points)
 * Evidence existence provides forensic confidence; capped to prevent treating evidence
 * presence as standalone proof of danger.
 */
export const EVIDENCE_CONFIG = {
  MAX_CONTRIBUTION: 10,
  SINGLE_ITEM_POINTS: 5,
  MULTIPLE_ITEMS_OR_VIDEO_POINTS: 10,
};

/**
 * Risk Level Classification Thresholds
 * 0–24: LOW
 * 25–49: MEDIUM
 * 50–74: HIGH
 * 75–100: CRITICAL
 */
export function getRiskLevelForScore(score: number): RiskLevel {
  if (score >= 75) return RiskLevel.CRITICAL;
  if (score >= 50) return RiskLevel.HIGH;
  if (score >= 25) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}
