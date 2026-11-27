import { createBrowserClient } from '@supabase/ssr';

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ouxwimiirtopfkbbgpmg.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Q05Dh5wlieMw8Y4AD0cxgg_kG532rvR';
  if (!url || !key) throw new Error('Supabase environment variables are not configured.');
  browserClient ??= createBrowserClient(url, key);
  return browserClient;
}

export function appPath(path: string) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
}
