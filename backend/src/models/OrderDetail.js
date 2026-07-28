const mongoose = require("mongoose");

// CHI_TIET_DON_HANG: chi tiet mat hang + so luong + don gia trong 1 don nhap/xuat
const orderDetailSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 0 }, // so_luong
    unitPrice: { type: Number, default: 0 }, // don_gia
  },
  { timestamps: true }
);

orderDetailSchema.virtual("amount").get(function amount() {
  return this.quantity * this.unitPrice;
});
orderDetailSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("OrderDetail", orderDetailSchema);
