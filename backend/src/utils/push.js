// Gui push notification that qua Firebase Cloud Messaging.
// Chua co project Firebase nen mac dinh se no-op (chi log) cho toi khi
// bien moi truong FIREBASE_SERVICE_ACCOUNT_JSON duoc cau hinh (chua JSON cua service account key).
// firebase-admin v14 dung API modular (firebase-admin/app, firebase-admin/messaging),
// khong con admin.credential/admin.apps/admin.messaging() nhu ban cu.
const { initializeApp, getApps, getApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

let app = null;
let initTried = false;

function getFirebaseApp() {
  if (initTried) return app;
  initTried = true;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const serviceAccount = JSON.parse(raw);
    app = getApps().length ? getApp() : initializeApp({ credential: cert(serviceAccount) });
    return app;
  } catch (err) {
    console.error("[push] Khong khoi tao duoc Firebase, se bo qua push that:", err.message);
    return null;
  }
}

// worker: document Worker (can co fcmToken); payload: { title, body }
async function sendPushToWorker(worker, payload) {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp || !worker || !worker.fcmToken) {
    console.log(`[push] (bo qua - chua cau hinh Firebase hoac worker chua co token) -> ${worker && worker.code}: ${payload.title}`);
    return { sent: false };
  }
  try {
    await getMessaging(firebaseApp).send({
      token: worker.fcmToken,
      notification: { title: payload.title, body: payload.body || "" },
    });
    return { sent: true };
  } catch (err) {
    console.error(`[push] Gui that bai cho ${worker.code}:`, err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendPushToWorker };
