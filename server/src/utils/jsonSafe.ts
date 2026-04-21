/** MySQL2 can return bigint; JSON.stringify throws on BigInt — normalize for res.json(). */
export function toJsonSafe<T>(row: T): T {
  return JSON.parse(
    JSON.stringify(row, (_, v) => (typeof v === 'bigint' ? Number(v) : v))
  );
}
