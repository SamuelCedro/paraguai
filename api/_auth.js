const crypto = require('node:crypto');

const COOKIE = '__Host-pe_session';
const MAX_AGE = 7 * 24 * 60 * 60;

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.AUTH_COOKIE_KEY;
  if (!url || !key || !/^[a-f\d]{64}$/i.test(secret || '')) {
    throw new Error('AUTH_NOT_CONFIGURED');
  }
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('AUTH_NOT_CONFIGURED');
  return { url: parsed.origin, key, secret: Buffer.from(secret, 'hex') };
}

function cookieValue(req) {
  const raw = req.headers.cookie || '';
  const part = raw.split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`));
  return part ? part.slice(COOKIE.length + 1) : null;
}

function seal(value, secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secret, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}

function unseal(value, secret) {
  if (!value || value.length > 4096) return null;
  try {
    const bytes = Buffer.from(value, 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', secret, bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
  } catch { return null; }
}

function setSession(res, tokens, secret) {
  const expiresAt = Date.now() + Number(tokens.expires_in ?? 3600) * 1000;
  const value = seal({ access: tokens.access_token, refresh: tokens.refresh_token, expiresAt }, secret);
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
}

async function authRequest(path, options = {}) {
  const { url, key } = config();
  return fetch(`${url}/auth/v1/${path}`, {
    ...options,
    headers: { apikey: key, 'Content-Type': 'application/json', ...options.headers },
    signal: AbortSignal.timeout(8000)
  });
}

async function refresh(session, res, secret) {
  const response = await authRequest('token?grant_type=refresh_token', {
    method: 'POST', body: JSON.stringify({ refresh_token: session.refresh })
  });
  if (!response.ok) return null;
  const tokens = await response.json();
  if (!tokens.access_token || !tokens.refresh_token) return null;
  setSession(res, tokens, secret);
  return tokens.access_token;
}

async function getUser(req, res) {
  const value = cookieValue(req);
  if (!value) return null;
  const { secret } = config();
  const session = unseal(value, secret);
  if (!session?.access || !session?.refresh) return null;
  let access = session.access;
  if (session.expiresAt <= Date.now() + 60_000) {
    access = await refresh(session, res, secret);
    if (!access) { clearSession(res); return null; }
  }
  let response = await authRequest('user', { headers: { Authorization: `Bearer ${access}` } });
  if (response.status === 401 && access === session.access) {
    access = await refresh(session, res, secret);
    if (access) response = await authRequest('user', { headers: { Authorization: `Bearer ${access}` } });
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) { clearSession(res); return null; }
    throw new Error('AUTH_UNAVAILABLE');
  }
  const user = await response.json();
  return user?.id ? user : null;
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

module.exports = { config, authRequest, clearSession, getUser, sameOrigin, setSession, unseal, cookieValue };
