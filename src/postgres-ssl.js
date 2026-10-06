/** Use certificate verification for remote PostgreSQL connections. */
export function postgresSslOptions(databaseUrl, ca = process.env.DATABASE_SSL_CA) {
  const value = String(databaseUrl || '');
  let host = '';
  try { host = new URL(value).hostname.replace(/^\[|\]$/g, '').toLowerCase(); } catch {}
  const local = ['localhost', '127.0.0.1', '::1'].includes(host);
  if (local) return false;

  const options = { rejectUnauthorized: true };
  if (ca) options.ca = String(ca).replace(/\\n/g, '\n');
  return options;
}

/** Prevent URL SSL parameters from replacing the enforced TLS policy. */
export function postgresConnectionString(databaseUrl) {
  const url = new URL(String(databaseUrl || ''));
  for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat']) {
    url.searchParams.delete(key);
  }
  return url.toString();
}
