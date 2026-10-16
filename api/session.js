const { authRequest, clearSession, config, cookieValue, getUser, sameOrigin, setSession, unseal } = require('./_auth');

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const user = await getUser(req, res);
      return json(res, 200, { authenticated: !!user, email: user?.email || null });
    } catch { return json(res, 503, { error: 'Login temporariamente indisponível.' }); }
  }
  if (!['POST', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return json(res, 405, { error: 'Método não permitido.' });
  }
  if (!sameOrigin(req)) return json(res, 403, { error: 'Origem não permitida.' });
  if (req.method === 'DELETE') {
    try {
      const old = unseal(cookieValue(req), config().secret);
      if (old?.access) await authRequest('logout?scope=local', {
        method: 'POST', headers: { Authorization: `Bearer ${old.access}` }
      });
    } catch { /* A sessão local é removida mesmo se o provedor estiver indisponível. */ }
    clearSession(res);
    return json(res, 200, { ok: true });
  }

  const size = Number(req.headers['content-length'] || 0);
  if (size > 2048) return json(res, 413, { error: 'Dados inválidos.' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return json(res, 400, { error: 'Dados inválidos.' }); }
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body?.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof password !== 'string' || !password || password.length > 256) {
    return json(res, 400, { error: 'Informe um e-mail e uma senha válidos.' });
  }
  try {
    const response = await authRequest('token?grant_type=password', {
      method: 'POST', body: JSON.stringify({ email, password })
    });
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      return json(res, 401, { error: 'E-mail ou senha incorretos.' });
    }
    if (!response.ok) return json(res, 503, { error: 'Login temporariamente indisponível.' });
    const tokens = await response.json();
    if (!tokens.access_token || !tokens.refresh_token) throw new Error('AUTH_UNAVAILABLE');
    setSession(res, tokens, config().secret);
    return json(res, 200, { ok: true });
  } catch { return json(res, 503, { error: 'Login temporariamente indisponível.' }); }
};
