import http from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { isOriginAllowed } from "../config/cors";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./realtime.types";

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export class RealtimeService {
  private io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  > | null = null;

  public initialize(httpServer: http.Server) {
    if (this.io) {
      return this.io;
    }
    this.io = new Server<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (isOriginAllowed(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`CORS blocked for origin: ${origin}`));
          }
        },
        credentials: true,
      },
    });

    // Socket.IO JWT Authentication Middleware
    this.io.use((socket: AppSocket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          (typeof socket.handshake.headers?.authorization === "string"
            ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, "")
            : undefined);

        if (!token) {
          if (process.env.NODE_ENV !== "test") {
            console.warn("[SOCKET AUTH] Connection rejected: Missing token");
          }
          return next(new Error("Authentication error: Token required"));
        }

        const decoded = jwt.verify(
          token,
          env.JWT_ACCESS_SECRET
        ) as jwt.JwtPayload;

        if (!decoded || decoded.type !== "access" || !decoded.sub) {
          if (process.env.NODE_ENV !== "test") {
            console.warn(
              "[SOCKET AUTH] Connection rejected: Invalid token type or subject"
            );
          }
          return next(
            new Error("Authentication error: Invalid token type or payload")
          );
        }

        socket.data.user = {
          id: decoded.sub as string,
          email: decoded.email as string,
          role: decoded.role as string,
        };

        next();
      } catch (err: any) {
        if (process.env.NODE_ENV !== "test") {
          console.warn("[SOCKET AUTH] Connection rejected: Token verification failed");
        }
        next(new Error("Authentication error: Invalid or expired token"));
      }
    });

    // Connection Handler
    this.io.on("connection", (socket: AppSocket) => {
      const userId = socket.data.user.id;
      const userRoom = `user:${userId}`;

      // Join private user room strictly derived from JWT identity
      socket.join(userRoom);

      if (process.env.NODE_ENV !== "test") {
        console.log(`[SOCKET] User connected [Room: ${userRoom}, SocketID: ${socket.id}]`);
      }

      socket.on("disconnect", (reason) => {
        if (process.env.NODE_ENV !== "test") {
          console.log(`[SOCKET] User disconnected [Room: ${userRoom}, Reason: ${reason}]`);
        }
      });
    });

    return this.io;
  }

  /**
   * Emit an event strictly to a verified user's private room.
   */
  public emitToUser<Event extends keyof ServerToClientEvents>(
    userId: string,
    event: Event,
    payload: Parameters<ServerToClientEvents[Event]>[0]
  ): void {
    if (!this.io) {
      return;
    }

    const userRoom = `user:${userId}`;
    (this.io.to(userRoom).emit as (ev: string, data: any) => boolean)(event, payload);
  }

  public getIO() {
    return this.io;
  }

  public async close(): Promise<void> {
    if (this.io) {
      await new Promise<void>((resolve) => {
        this.io!.close(() => {
          this.io = null;
          resolve();
        });
      });
    }
  }
}

export const realtimeService = new RealtimeService();