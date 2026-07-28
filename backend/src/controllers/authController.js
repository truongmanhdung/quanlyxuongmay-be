const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Worker = require("../models/Worker");
const { signToken } = require("../utils/jwt");
const asyncHandler = require("../utils/asyncHandler");

// POST /api/auth/admin/login  { username, password }
const adminLogin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Vui lòng nhập tài khoản và mật khẩu" });
  }

  const user = await User.findOne({ username: username.toLowerCase(), active: true });
  if (!user) {
    return res.status(401).json({ message: "Tài khoản hoặc mật khẩu không đúng" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Tài khoản hoặc mật khẩu không đúng" });
  }

  const token = signToken({ sub: user._id.toString(), role: "admin" });
  res.json({
    token,
    user: { id: user._id, username: user.username, name: user.name, role: "admin" },
  });
});

// POST /api/auth/worker/login  { code }
const workerLogin = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ message: "Vui lòng nhập mã đăng nhập" });
  }

  const worker = await Worker.findOne({ code: code.trim().toUpperCase(), active: true });
  if (!worker) {
    return res.status(401).json({ message: "Mã đăng nhập không tồn tại hoặc đã bị khoá" });
  }

  const token = signToken({ sub: worker._id.toString(), role: "worker", code: worker.code });
  res.json({
    token,
    worker: { id: worker._id, code: worker.code, name: worker.name, phone: worker.phone },
  });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  if (req.auth.role === "admin") {
    const user = await User.findById(req.auth.sub).select("-passwordHash");
    return res.json({ role: "admin", user });
  }
  const worker = await Worker.findById(req.auth.sub);
  return res.json({ role: "worker", worker });
});

// PATCH /api/auth/admin/change-password  (admin)  { currentPassword, newPassword }
const changePassword = asyncHandler(async (req, res) => {
  if (req.auth.role !== "admin") {
    return res.status(403).json({ message: "Chỉ tài khoản quản lý mới đổi được mật khẩu tại đây" });
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
  }

  const user = await User.findById(req.auth.sub);
  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy tài khoản" });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Mật khẩu hiện tại không đúng" });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: "Đổi mật khẩu thành công" });
});

// PATCH /api/auth/fcm-token  (worker)  { token } - dang ky device token de nhan push notification
const registerFcmToken = asyncHandler(async (req, res) => {
  if (req.auth.role !== "worker") {
    return res.status(403).json({ message: "Chỉ tài khoản công nhân mới đăng ký được push token tại đây" });
  }
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: "Thiếu token" });
  }
  await Worker.findByIdAndUpdate(req.auth.sub, { $set: { fcmToken: token } });
  res.json({ message: "Đã đăng ký nhận thông báo" });
});

module.exports = { adminLogin, workerLogin, me, changePassword, registerFcmToken };
