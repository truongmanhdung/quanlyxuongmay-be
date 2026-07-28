const { Server } = require("socket.io");
const { verifyToken } = require("../utils/jwt");
const { isAllowedOrigin } = require("../utils/corsOrigin");

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error("unauthorized"));
    try {
      socket.auth = verifyToken(token);
      return next();
    } catch (err) {
      return next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { sub, role } = socket.auth;
    if (role === "admin") {
      socket.join("admins");
    } else {
      socket.join(`worker:${sub}`);
    }
  });

  return io;
}

// Bao cao/lo hang/hang loi moi... - phia quan ly xem realtime
function emitToAdmins(event, payload) {
  if (!io) return;
  io.to("admins").emit(event, payload);
}

// Ket qua duyet bao cao, thong bao nhac nho... - danh cho dung 1 cong nhan
function emitToWorker(workerId, event, payload) {
  if (!io) return;
  io.to(`worker:${workerId}`).emit(event, payload);
}

module.exports = { initSocket, emitToAdmins, emitToWorker };
