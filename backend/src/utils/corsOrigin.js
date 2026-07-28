// Logic kiem tra origin dung chung cho Express CORS va Socket.IO CORS,
// de tranh 2 noi bi lech cau hinh.
const allowedOriginList = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true; // mobile app, curl, Postman...
  if (allowedOriginList.length === 0) return true;
  if (allowedOriginList.includes(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
    return true; // moi cong localhost khi phat trien (Next.js, Flutter web...)
  }
  if (/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)) {
    return true; // tunnel Cloudflare Quick Tunnel dung de demo tam thoi
  }
  return false;
}

module.exports = { isAllowedOrigin };
