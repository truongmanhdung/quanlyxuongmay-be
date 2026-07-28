import { io, Socket } from "socket.io-client";
import { getToken } from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;
export function connectSocket(): Socket | null {
  const token = getToken();
  if (!token) return null;
  if (socket) {
    if (socket.connected) return socket;
    socket.disconnect();
  }
  socket = io(SOCKET_URL, { auth: { token } });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
