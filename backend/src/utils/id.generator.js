export function generateOrderId() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomPart = "";

  for (let i = 0; i < 16; i++) {
    randomPart += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return `order_${randomPart}`;
}