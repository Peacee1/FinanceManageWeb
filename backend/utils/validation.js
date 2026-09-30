const isPositiveInteger = value => (typeof value === 'number' || typeof value === 'string') && /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
const isDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const isPassword = value => typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72 && value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
function transactionError(body, partial = false) {
  const check = field => !partial || body[field] !== undefined;
  if (check('type') && !['INCOME', 'EXPENSE'].includes(body.type)) return 'Loại giao dịch không hợp lệ.';
  if (check('amount') && !isPositiveInteger(body.amount)) return 'Số tiền phải là số nguyên dương hợp lệ.';
  if (check('category') && (typeof body.category !== 'string' || !body.category.trim() || body.category.length > 100)) return 'Danh mục không hợp lệ.';
  if (check('date') && !isDate(body.date)) return 'Ngày giao dịch không hợp lệ.';
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 2000)) return 'Mô tả tối đa 2000 ký tự.';
  return null;
}
module.exports = { isPositiveInteger, isDate, isPassword, transactionError };
