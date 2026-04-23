const { createClient } = require('@supabase/supabase-js');

let _client = null;

const getSupabaseAdmin = () => {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for GitHub OAuth');
    }

    _client = createClient(url, key, {
      // Service-role clients use a permanent key and do not need token refresh or session persistence
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  return _client;
};

module.exports = { getSupabaseAdmin };
