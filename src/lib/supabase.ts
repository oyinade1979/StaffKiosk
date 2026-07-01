import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://eaovgbzbiqmrwehmspjb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhb3ZnYnpiaXFtcndlaG1zcGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTMyMDcsImV4cCI6MjA5MjU4OTIwN30.VNSZiex06CSFSTGLDiz5Ra8sQU1jDIYA-r45-1C8xnM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
