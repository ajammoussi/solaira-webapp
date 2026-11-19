/**
 * Profile API
 * Updates authenticated user's profile.
 *
 * Uses server-side Supabase client (service role if available) to avoid RLS issues.
 */

import { withApiAuth } from '../../lib/auth/apiMiddleware';

function pickAllowedUpdates(body) {
  const allowedKeys = [
    'display_name',
    'phone_number',
    'timezone',
    'consumption_profile',
    'current_system',
    'battery_size',
    'preferences',
  ];
  const updates = {};

  if (!body || typeof body !== 'object') return updates;

  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updates[key] = body[key];
    }
  }

  return updates;
}

async function handler(req, res) {
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const updates = pickAllowedUpdates(req.body);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    // Ensure we only ever write to the authenticated user's row
    const payload = {
      id: req.user.id,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    console.log(`[profile][${requestId}] update requested`, {
      userId: req.user.id,
      keys: Object.keys(updates),
    });

    const { data, error } = await req.supabase
      .from('profiles')
      .upsert(payload)
      .select('*')
      .single();

    if (error) {
      console.error(`[profile][${requestId}] supabase error`, error);
      return res.status(400).json({ error: error.message, details: error });
    }

    console.log(`[profile][${requestId}] update success`);
    return res.status(200).json({ data });
  } catch (error) {
    console.error(`[profile][${requestId}] unexpected error`, error);
    return res.status(500).json({ error: 'Internal Server Error', message: error?.message });
  }
}

export default withApiAuth(handler, { allowGuest: false });
