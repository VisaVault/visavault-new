import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/ssr';
import { type Database } from '../types/supabase';

export const createClient = (cookieStore?: cookies) =>
  createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore?.get(name)?.value; },
        set(name: string, value: string, options) {
          cookieStore?.set({ name, value, ...options });
        },
        remove(name: string, options) {
          cookieStore?.set({ name, value: '', ...options });
        },
      },
    }
  );

export const createClientComponentClient = () => createClient<Database>({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});