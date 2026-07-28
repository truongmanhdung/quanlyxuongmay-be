function notFound(req, res) {
  res.status(404).json({ message: `Không tìm thấy: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ message: `Giá trị '${field}' đã tồn tại` });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: `ID không hợp lệ: ${err.value}` });
  }

  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Lỗi máy chủ" });
}

module.exports = { notFound, errorHandler };
