import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.error(
    'Brak konfiguracji Supabase. Ustaw zmienne środowiskowe VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY (patrz README.md).'
  );
}

export const supabase = createClient(url || '', key || '');

export const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;
