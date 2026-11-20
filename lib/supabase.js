import { createClient } from '@supabase/supabase-js';

let client;
// Hanya dipakai di SERVER. Service role key tidak pernah dikirim ke browser.
export function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi');
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      // Next.js meng-cache fetch bawaan; matikan agar data (mis. Settings) selalu yang terbaru
      global: { fetch: (u, o = {}) => fetch(u, { ...o, cache: 'no-store' }) },
    });
  }
  return client;
}
