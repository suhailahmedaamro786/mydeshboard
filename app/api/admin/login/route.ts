import { NextResponse } from "next/server";
import { createAdminSession, ADMIN_COOKIE, sessionTtl } from "@/lib/adminAuth";
import { timingSafeEqual } from "node:crypto";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || typeof password !== "string") {
      return NextResponse.json({ error: "Admin authentication is not configured" }, { status: 500 });
    }

    const expected = Buffer.from(adminPassword);
    const received = Buffer.from(password);
    const valid = expected.length === received.length && timingSafeEqual(expected, received);
    if (!valid) return NextResponse.json({ error: "Invalid password" }, { status: 401 });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, createAdminSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionTtl(),
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
