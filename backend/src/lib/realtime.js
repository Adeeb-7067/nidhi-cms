import { Server } from "socket.io";
import { logger } from "./logger.js";
import { verifyAccessToken } from "./jwt.js";
import {
  initPresenceBroadcast,
  registerSocket,
  unregisterSocket,
  touchPresence,
} from "../services/presence.js";

let io;

function initRealtime(server) {
  io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : true,
      credentials: true,
    },
    pingInterval: 25e3,
    pingTimeout: 6e4,
  });

  initPresenceBroadcast((snapshot) => {
    io.emit("presence:update", snapshot);
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const queryUserId = socket.handshake.query?.userId;
    if (!token || !queryUserId) {
      next(new Error("unauthorized"));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      if (String(payload.userId) !== String(queryUserId)) {
        next(new Error("unauthorized"));
        return;
      }
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    if (userId) {
      socket.join(`user:${userId}`);
      void registerSocket(userId, socket.id);
      logger.info({ userId, socketId: socket.id }, "User connected to realtime");
    }

    socket.on("presence:heartbeat", (payload) => {
      if (!socket.data.userId) return;
      const tabVisible =
        payload && typeof payload === "object" && "tabVisible" in payload
          ? Boolean(payload.tabVisible)
          : true;
      touchPresence(socket.data.userId, { tabVisible });
    });

    socket.on("disconnect", () => {
      if (socket.data.userId) {
        void unregisterSocket(socket.data.userId, socket.id);
      }
      logger.info({ socketId: socket.id }, "User disconnected from realtime");
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Realtime not initialized");
  }
  return io;
}

import { getFirebaseAdmin } from "./firebase.js";
import { usersTable } from "../models/schema/index.js";

async function notifyUser(userId, event, data) {
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
              click_action: "FLUTTER_NOTIFICATION_CLICK",
              ...data,
            },
          });
        }
      }
    } catch (err) {
      logger.error({ err, userId }, "Failed to send FCM push notification");
    }
  }
}

function broadcast(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

function emitToUsers(userIds, event, data) {
  if (!io || !userIds?.length) return;
  const unique = [...new Set(userIds.filter((id) => id != null))];
  for (const userId of unique) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export {
  broadcast,
  emitToUsers,
  getIO,
  initRealtime,
  notifyUser,
};
