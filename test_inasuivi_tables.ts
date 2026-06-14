import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
  const url = process.env.SUPABASE_URL || "https://taqslvhnxnsugjcvqnwh.supabase.co";
  const key = process.env.SUPABASE_KEY || "sb_publishable_peUQnl4YMbB0u0NZsjFxoQ_44Ngchey";
  
  const supabase = createClient(url, key);
  
  console.log("Checking inasuivi tables...");
  
  const { data: users, error: usersErr } = await supabase.from("inasuivi_users").select("*").limit(1);
  console.log("inasuivi_users:", { success: !usersErr, data: users, error: usersErr });

  const { data: projects, error: projectsErr } = await supabase.from("inasuivi_projects").select("*").limit(1);
  console.log("inasuivi_projects:", { success: !projectsErr, data: projects, error: projectsErr });
}

run().catch(console.error);
