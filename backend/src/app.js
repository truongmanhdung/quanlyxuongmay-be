const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { isAllowedOrigin } = require("./utils/corsOrigin");

const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const productRoutes = require("./routes/productRoutes");
const workerRoutes = require("./routes/workerRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reportRoutes = require("./routes/reportRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const revenueRoutes = require("./routes/revenueRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const defectRoutes = require("./routes/defectRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// Cho phep web admin (Next.js), Flutter web dev server (cong bat ky) va cac client mobile (khong gui Origin)
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/revenue", revenueRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/defects", defectRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/attendance", attendanceRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
