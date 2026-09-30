function stockBalances(movements) {
  let quantity = 0;
  return movements.map(movement => {
    quantity += movement.type === 'IN' ? Number(movement.quantity) : -Number(movement.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 2147483647) {
      throw Object.assign(new Error('Thay đổi này khiến tồn kho âm hoặc vượt giới hạn. Hãy kiểm tra các phiếu nhập/xuất liên quan.'), { status: 409 });
    }
    return { id: movement.id, stockAfter: quantity };
  });
}
async function recalculateStock(client, productId) {
  const movements = (await client.query('SELECT id, type, quantity FROM stock_movements WHERE product_id = $1 AND deleted_at IS NULL ORDER BY movement_date, id', [productId])).rows;
  const balances = stockBalances(movements);
  if (balances.length) await client.query('UPDATE stock_movements m SET stock_after = b.stock FROM unnest($1::int[], $2::int[]) AS b(id, stock) WHERE m.id = b.id', [balances.map(balance => balance.id), balances.map(balance => balance.stockAfter)]);
  const stock = balances.at(-1)?.stockAfter || 0;
  await client.query('UPDATE products SET stock_quantity = $1 WHERE id = $2', [stock, productId]);
  return stock;
}
module.exports = { stockBalances, recalculateStock };
