import { Server } from "socket.io";
import { logger } from "./logger.js";
import { verifyAccessToken } from "./jwt.js";
import { isAllowedOrigin } from "../config/index.js";
import {
  initPresenceBroadcast,
  registerSocket,
  unregisterSocket,
  touchPresence,
} from "../modules/monitoring/services/presence.js";

let io;

function initRealtime(server) {
  io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: (origin, callback) => {
        callback(null, isAllowedOrigin(origin));
      },
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

import { usersTable } from "../models/schema/index.js";
import {
  isUserAccountActive,
  REALTIME_EVENTS_WHEN_INACTIVE,
} from "../modules/identity/services/user-access.js";
import { sendHighPriorityFcmToTokens } from "../modules/collab/services/push-notifications.js";

async function notifyUser(userId, event, data) {
  const user = await usersTable
    .findOne({ id: userId }, { status: 1, fcmTokens: 1 })
    .lean();
  const active = isUserAccountActive(user);

  if (!active && !REALTIME_EVENTS_WHEN_INACTIVE.has(event)) {
    return;
  }

  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
  // Work-session alerts already call sendWebPushToUser — skip duplicate FCM here.
  if (
    event === "notification" &&
    data.title &&
    data.body &&
    active &&
    data.type !== "work_session"
  ) {
    try {
      if (user?.fcmTokens?.length > 0) {
        // Always high priority on Android / APNs / Web — same as work-session pushes.
        await sendHighPriorityFcmToTokens(user.fcmTokens, {
          title: data.title,
          body: data.body,
          data: {
            click_action: "FLUTTER_NOTIFICATION_CLICK",
            ...data,
          },
        });
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
