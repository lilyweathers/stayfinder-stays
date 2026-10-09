// Decimal arithmetic avoids binary floating-point rounding when saving money.
export function calculateBookingPrice(checkIn: string, checkOut: string, rate: number) {
  if (!Number.isFinite(rate) || rate < 0) throw new Error("Invalid saved nightly rate");
  const nights = (Date.parse(checkOut + "T00:00:00Z") - Date.parse(checkIn + "T00:00:00Z")) / 86400000;
  if (!Number.isSafeInteger(nights) || nights <= 0) throw new Error("Invalid stay dates");
  const [mantissa, exponent = "0"] = rate.toString().toLowerCase().split("e");
  const [whole, fraction = ""] = mantissa!.split(".");
  let cents = BigInt(whole! + fraction);
  const power = Number(exponent) - fraction.length + 2;
  if (power >= 0) cents *= 10n ** BigInt(power);
  else {
    const divisor = 10n ** BigInt(-power);
    cents = (cents + divisor / 2n) / divisor;
  }
  const total = cents * BigInt(nights);
  if (cents > 99999999999999n || total > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Booking price exceeds supported range");
  return { nightly_price: Number(cents) / 100, total_price: Number(total) / 100 };
}
