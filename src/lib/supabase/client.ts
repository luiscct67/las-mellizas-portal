import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://oepctyamffehjhhuxiqo.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_EUhsRVHXRYBU3aSBv82vAQ_azKX6i6D";

export const createClient = () => createBrowserClient(supabaseUrl, supabaseAnonKey);

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);