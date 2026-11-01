// LittleKrishna.com — Supabase Edge Function scaffold
// Single router that mirrors the local Node backend. Implement handlers in ./handlers/*.
// Deploy: supabase functions deploy api

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "http://localhost:5173")
  .split(",").map((s) => s.trim()).filter(Boolean);

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  // Health check
  if (path === "/api/v1/health" && req.method === "GET") {
    return new Response(JSON.stringify({ ok: true, service: "littlekrishna-api", runtime: "supabase-edge" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // All other routes are scaffolded. Implement handlers in ./handlers/* and wire them here.
  // See docs/API.md and backend/server.mjs for the canonical local implementation.
  return new Response(JSON.stringify({
    ok: false,
    error: { code: "not_implemented", message: `Route ${req.method} ${path} is not yet implemented in the Edge Function scaffold.` },
  }), { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});