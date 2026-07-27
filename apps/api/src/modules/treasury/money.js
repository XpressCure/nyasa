export function rupeesToPaise(amountRupees) {
  return Math.round(Number(amountRupees) * 100);
}

export function paiseToRupees(amountPaise) {
  return amountPaise / 100;
}
