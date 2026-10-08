import { AlertType, Severity, RiskLevel } from "@prisma/client";

export interface RiskSignals {
  alertId: string;
  type: AlertType;
  severity: Severity;
  childId: string | null;
  deviceId: string | null;
  hasEvidence: boolean;
  evidenceCount: number;
  hasVideoEvidence: boolean;
  repeatAlertCount: number;
  metadata?: any;
}

export interface RiskAnalysisResult {
  score: number;
  riskLevel: RiskLevel;
  safetyScore: number;
  cyberbullyingRisk: number;
  contentRisk: number;
  predatorRisk: number;
  screenTimeRisk: number;
  model: string;
  modelVersion: string;
  explanation: string;
  signals: RiskSignals;
}

export interface AnalyzeAlertContext {
  userId?: string;
}
