// Sinh ma tu dong dang <prefix><so_thu_tu_dem_0>, vd KH001, CN012, PN0007.
// Chi dem cac ma dung dinh dang nay (bo qua ma cu nhap tay kieu khac) de tranh trung
// voi du lieu cu, roi tiep tuc tang dan tu do.
async function nextCode(Model, prefix, digits) {
  const regex = new RegExp(`^${prefix}\\d{${digits}}$`);
  const latest = await Model.findOne({ code: regex }).sort({ code: -1 }).select("code").lean();
  let n = 1;
  if (latest) {
    const parsed = parseInt(latest.code.slice(prefix.length), 10);
    if (!Number.isNaN(parsed)) n = parsed + 1;
  }
  return `${prefix}${String(n).padStart(digits, "0")}`;
}

// Goi keo cho create(): tu sinh ma + thu lai neu dung phai trung (hiem, do 2 nguoi tao cung luc).
async function createWithGeneratedCode(Model, prefix, digits, buildDoc, attempts = 5) {
  for (let i = 0; i < attempts; i += 1) {
    const code = await nextCode(Model, prefix, digits);
    try {
      return await Model.create(buildDoc(code));
    } catch (err) {
      const isDuplicateCode = err?.code === 11000 && err?.keyPattern?.code;
      if (!isDuplicateCode || i === attempts - 1) throw err;
    }
  }
  throw new Error("Không tạo được mã tự động, vui lòng thử lại");
}

module.exports = { nextCode, createWithGeneratedCode };
