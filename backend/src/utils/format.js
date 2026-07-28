function formatNumber(n) {
  return new Intl.NumberFormat("vi-VN").format(n || 0);
}

function formatCurrency(n) {
  return `${formatNumber(n)} đ`;
}

module.exports = { formatNumber, formatCurrency };
