const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://auth.example.com';
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-public-key';
process.env.AUTH_COOKIE_KEY = Buffer.alloc(32, 7).toString('hex');

const session = require('../api/session');
const member = require('../api/member');
const { setSession } = require('../api/_auth');

function response() {
  const headers = {};
  return {
    statusCode: 200, headers, body: '',
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    end(value = '') { this.body = String(value); }
  };
}

function request(method, cookie = '', body) {
  return { method, body, headers: { host: 'example.com', origin: 'https://example.com', cookie } };
}

test('login creates a protected session and serves the member page', async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push(String(url));
    if (String(url).includes('grant_type=password')) {
      return new Response(JSON.stringify({ access_token: 'valid-access', refresh_token: 'valid-refresh', expires_in: 3600 }), { status: 200 });
    }
    if (String(url).endsWith('/user') && options.headers.Authorization === 'Bearer valid-access') {
      return new Response(JSON.stringify({ id: 'student-1', email: 'aluno@exemplo.com' }), { status: 200 });
    }
    return new Response('{}', { status: 401 });
  };
  const login = response();
  await session(request('POST', '', { email: 'ALUNO@EXEMPLO.COM', password: 'senha' }), login);
  assert.equal(login.statusCode, 200);
  assert.match(login.headers['set-cookie'], /HttpOnly; Secure; SameSite=Lax/);
  const cookie = login.headers['set-cookie'].split(';')[0];

  const status = response();
  await session(request('GET', cookie), status);
  assert.deepEqual(JSON.parse(status.body), { authenticated: true, email: 'aluno@exemplo.com' });

  const page = response();
  await member(request('GET', cookie), page);
  assert.equal(page.statusCode, 200);
  assert.match(page.body, /Paraguai Expresso \| Área de Membros/);
  assert.equal(page.headers['cache-control'], 'private, no-store');
  assert.equal(calls.filter(url => url.endsWith('/user')).length, 2);
});

test('unknown visitor and tampered cookie cannot read the member page', async () => {
  for (const cookie of ['', '__Host-pe_session=invalid']) {
    const page = response();
    await member(request('GET', cookie), page);
    assert.equal(page.statusCode, 302);
    assert.equal(page.headers.location, '/');
    assert.equal(page.body, '');
  }
});

test('invalid credentials, malformed input and cross-origin submission are rejected', async () => {
  global.fetch = async () => new Response('{}', { status: 400 });
  const wrong = response();
  await session(request('POST', '', { email: 'aluno@exemplo.com', password: 'errada' }), wrong);
  assert.equal(wrong.statusCode, 401);
  assert.equal(wrong.headers['set-cookie'], undefined);

  const malformed = response();
  await session(request('POST', '', '{'), malformed);
  assert.equal(malformed.statusCode, 400);

  const external = request('POST', '', { email: 'aluno@exemplo.com', password: 'senha' });
  external.headers.origin = 'https://evil.example';
  const blocked = response();
  await session(external, blocked);
  assert.equal(blocked.statusCode, 403);
});

test('expired access token is refreshed before the protected page is served', async () => {
  const initial = response();
  setSession(initial, { access_token: 'expired', refresh_token: 'refresh-1', expires_in: 0 }, Buffer.from(process.env.AUTH_COOKIE_KEY, 'hex'));
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push(String(url));
    if (String(url).includes('grant_type=refresh_token')) {
      assert.equal(JSON.parse(options.body).refresh_token, 'refresh-1');
      return new Response(JSON.stringify({ access_token: 'fresh', refresh_token: 'refresh-2', expires_in: 3600 }), { status: 200 });
    }
    if (String(url).endsWith('/user') && options.headers.Authorization === 'Bearer fresh') {
      return new Response(JSON.stringify({ id: 'student-1' }), { status: 200 });
    }
    return new Response('{}', { status: 401 });
  };
  const page = response();
  await member(request('GET', initial.headers['set-cookie'].split(';')[0]), page);
  assert.equal(page.statusCode, 200);
  assert.ok(page.headers['set-cookie'].includes('__Host-pe_session='));
  assert.equal(calls.length, 2);
});

test('logout clears the browser cookie and revokes the provider session', async () => {
  const initial = response();
  setSession(initial, { access_token: 'valid', refresh_token: 'refresh', expires_in: 3600 }, Buffer.from(process.env.AUTH_COOKIE_KEY, 'hex'));
  let revoked = false;
  global.fetch = async (url, options) => {
    revoked = String(url).includes('/logout?scope=local') && options.headers.Authorization === 'Bearer valid';
    return new Response('{}', { status: 204 });
  };
  const result = response();
  await session(request('DELETE', initial.headers['set-cookie'].split(';')[0]), result);
  assert.equal(result.statusCode, 200);
  assert.equal(revoked, true);
  assert.match(result.headers['set-cookie'], /Max-Age=0/);
});
