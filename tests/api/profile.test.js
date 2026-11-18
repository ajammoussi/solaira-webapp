/**
 * /api/profile is the only write path for user settings (panel count, battery
 * size, timezone, consumption profile). It must:
 *   - reject unauthenticated requests
 *   - only allow PUT
 *   - write ONLY whitelisted columns for the authenticated user
 *
 * That whitelist is a trust boundary: without it a client could set `id` or
 * `preferences` to arbitrary values.
 */

jest.mock('../../lib/supabase', () => {
  // Shape mirrors the handler: req.supabase.from(table).upsert(payload).select('*').single()
  const single = jest.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null });
  const select = jest.fn(() => ({ single }));
  const upsert = jest.fn(() => ({ select }));
  const from = jest.fn(() => ({ upsert }));
  const client = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from,
    __mocks: { upsert, select, single },
  };
  return {
    supabase: client,
    createServerClient: () => client,
    isSupabaseConfigured: true,
    default: client,
  };
});

/**
 * Minimal Next.js API route harness: the handler is a plain (req, res) function.
 */
function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

const AUTH_HEADER = { authorization: 'Bearer test-token' };

describe('/api/profile', () => {
  let handler;

  beforeAll(() => {
    handler = require('../../pages/api/profile').default;
  });

  it('rejects requests without an authorization header', async () => {
    const res = makeRes();
    await handler({ method: 'PUT', headers: {}, body: {} }, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('rejects non-PUT methods', async () => {
    const res = makeRes();
    await handler({ method: 'GET', headers: AUTH_HEADER, body: {} }, res);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe('Method Not Allowed');
  });

  it('rejects a body with no whitelisted fields', async () => {
    const res = makeRes();
    await handler({ method: 'PUT', headers: AUTH_HEADER, body: { not_a_column: 1 } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('No valid fields provided');
  });

  it('drops fields outside the whitelist instead of writing them', async () => {
    const { createServerClient } = require('../../lib/supabase');
    const client = createServerClient();
    client.__mocks.upsert.mockClear();

    const res = makeRes();
    await handler(
      {
        method: 'PUT',
        headers: AUTH_HEADER,
        body: {
          display_name: 'Ada',
          current_system: 10,
          battery_size: 13.5,
          is_admin: true,
        },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    const written = client.__mocks.upsert.mock.calls.at(-1)[0];

    expect(written).toMatchObject({
      id: 'user-1',
      display_name: 'Ada',
      current_system: 10,
      battery_size: 13.5,
    });
    expect(written).not.toHaveProperty('is_admin');
  });

  it('never lets a client override the row id', async () => {
    const { createServerClient } = require('../../lib/supabase');
    const client = createServerClient();
    client.__mocks.upsert.mockClear();

    const res = makeRes();
    await handler(
      {
        method: 'PUT',
        headers: AUTH_HEADER,
        body: { id: 'attacker-chosen-id', current_system: 12 },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    const written = client.__mocks.upsert.mock.calls.at(-1)[0];
    expect(written.id).toBe('user-1');
    expect(written).not.toHaveProperty('updated_by');
  });
});
