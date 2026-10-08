export interface SocketUser {
  id: string;
  email: string;
  role: string;
}

export interface SocketData {
  user: SocketUser;
}

export interface ServerToClientEvents {
  "alert:created": (alert: any) => void;
  "alert:updated": (alert: any) => void;
  "device:status_changed": (device: any) => void;
  "device:updated": (device: any) => void;
  "evidence:created": (evidence: any) => void;
  "evidence:deleted": (data: { id: string; alertId: string }) => void;
  "risk:assessment_created": (assessment: any) => void;
}

export interface ClientToServerEvents {
  ping: () => void;
}

export interface InterServerEvents {
  ping: () => void;
}