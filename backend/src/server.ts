import http from "http";
import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { realtimeService } from "./realtime/realtime.service";

const httpServer = http.createServer(app);

// Initialize Socket.IO with HTTP Server
realtimeService.initialize(httpServer);

const server = httpServer.listen(env.PORT, () => {
  console.log(`[SERVER] GuardianAI Backend listening on port ${env.PORT} [${env.NODE_ENV}]`);
  console.log(`[SERVER] Health check available at: http://localhost:${env.PORT}/health`);
  console.log(`[SERVER] Socket.IO realtime server initialized`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  await realtimeService.close();
  server.close(async () => {
    console.log("HTTP server closed.");
    try {
      await prisma.$disconnect();
      console.log("Database connection closed.");
    } catch (err) {
      console.error("Error disconnecting database:", err);
    }
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export { httpServer, server };