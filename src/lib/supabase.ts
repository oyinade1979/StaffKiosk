import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://eaovgbzbiqmrwehmspjb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_L2z8SNQA3hY8cF6QcGHITw_TZWZOINm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
