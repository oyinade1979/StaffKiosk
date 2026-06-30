import { createClient } from "@supabase/supabase-js";

// OnSpace Cloud client — used for Auth, Edge Functions, and accounts table
const ONSPACE_URL = import.meta.env.VITE_SUPABASE_URL;
const ONSPACE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const onspaceClient = createClient(ONSPACE_URL, ONSPACE_ANON_KEY);
