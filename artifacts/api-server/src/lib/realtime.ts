import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { logger } from "./logger";

let io: Server;

export function initRealtime(server: HttpServer) {
  io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : true,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      socket.join(`user:${userId}`);
      logger.info({ userId, socketId: socket.id }, "User connected to realtime");
    }

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "User disconnected from realtime");
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Realtime not initialized");
  }
  return io;
}

import { getFirebaseAdmin } from './firebase';
import { usersTable } from '@workspace/db/schema';

export async function notifyUser(userId: number, event: string, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
  
  if (event === "notification" && data.title && data.body) {
    try {
      const user = await usersTable.findOne({ id: userId });
      if (user && user.fcmTokens && user.fcmTokens.length > 0) {
        const admin = getFirebaseAdmin();
        if (admin.apps.length > 0) {
          await admin.messaging().sendEachForMulticast({
            tokens: user.fcmTokens,
            notification: {
              title: data.title,
              body: data.body,
            },
            data: {
              click_action: "FLUTTER_NOTIFICATION_CLICK", // for flexibility
              ...data,
            }
          });
        }
      }
    } catch (err) {
      logger.error({ err, userId }, "Failed to send FCM push notification");
    }
  }
}

export function broadcast(event: string, data: any) {
  if (io) {
    io.emit(event, data);
  }
}
