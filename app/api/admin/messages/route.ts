import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_COOKIE, isValidAdminSession } from "@/lib/adminAuth";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase server credentials are not configured");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function isAdmin() {
  const cookieStore = await cookies();
  return isValidAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);
}

export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  try {
    const { data, error } = await adminClient().from("messages").select("*").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
    return NextResponse.json({ messages: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const { id, read } = await request.json();
    if (typeof id !== "string" || typeof read !== "boolean") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { error } = await adminClient().from("messages").update({ read }).eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const body = await request.json().catch(() => ({}));
    const id = body?.id;
    const query = adminClient().from("messages").delete();
    const { error } = typeof id === "string" ? await query.eq("id", id) : await query.neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return NextResponse.json({ error: "Failed to delete message(s)" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
