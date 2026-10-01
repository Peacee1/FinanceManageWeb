function calculateTableFee(startedAt, endedAt, hourlyRate, billingUnit) {
  const elapsed = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isSafeInteger(elapsed) || elapsed < 0 || !Number.isSafeInteger(Number(hourlyRate)) || Number(hourlyRate) < 1 || !['MINUTE', 'HOUR'].includes(billingUnit)) throw new Error('Invalid table billing input');
  const units = Math.max(1, Math.ceil(elapsed / (billingUnit === 'HOUR' ? 3600000 : 60000)));
  const divisor = billingUnit === 'HOUR' ? 1n : 60n;
  const amount = (BigInt(units) * BigInt(hourlyRate) + divisor - 1n) / divisor;
  if (amount > BigInt(Number.MAX_SAFE_INTEGER) || units > 2147483647) throw new Error('Table fee exceeds supported range');
  return { units, amount: Number(amount) };
}
module.exports = { calculateTableFee };
