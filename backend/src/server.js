require("dotenv").config();
const http = require("node:http");
const app = require("./app");
const connectDB = require("./config/db");
const reminderScheduler = require("./services/reminderScheduler");
const { initSocket } = require("./realtime/socket");

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();
  reminderScheduler.start();
  const httpServer = http.createServer(app);
  initSocket(httpServer);
  httpServer.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});
