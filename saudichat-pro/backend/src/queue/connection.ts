export function getConnection() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return { url };
}
