import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
  const url = process.env.SUPABASE_URL || "https://taqslvhnxnsugjcvqnwh.supabase.co";
  const key = process.env.SUPABASE_KEY || "sb_publishable_peUQnl4YMbB0u0NZsjFxoQ_44Ngchey";
  
  const supabase = createClient(url, key);
  
  console.log("Checking general tables...");
  
  // Try to query 'projets'
  const { data: proj, error: projErr } = await supabase.from("projets").select("*").limit(1);
  console.log("projets schema check:", { success: !projErr, data: proj, error: projErr });

  // Try to query 'utilisateurs' or 'users'
  const { data: users, error: usersErr } = await supabase.from("users").select("*").limit(1);
  console.log("users schema check:", { success: !usersErr, data: users, error: usersErr });

  const { data: profiles, error: profilesErr } = await supabase.from("profiles").select("*").limit(1);
  console.log("profiles schema check:", { success: !profilesErr, data: profiles, error: profilesErr });

  const { data: clients, error: clientsErr } = await supabase.from("clients").select("*").limit(1);
  console.log("clients schema check:", { success: !clientsErr, data: clients, error: clientsErr });
}

run().catch(console.error);
