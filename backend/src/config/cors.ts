import { env } from "./env";

export const getAllowedOrigins = (): string[] => {
  const normalizedFrontend = env.FRONTEND_URL.replace(/\/+$/, "");
  if (env.NODE_ENV === "production") {
    return [normalizedFrontend];
  }
  return [
    normalizedFrontend,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
  ];
};

export const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // Allow curl, mobile clients, server-to-server
  const normalizedOrigin = origin.replace(/\/+$/, "");
  const allowed = getAllowedOrigins();
  return allowed.includes(normalizedOrigin);
};
