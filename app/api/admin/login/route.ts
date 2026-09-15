import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const COOKIE_NAME = "admin_session";

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;

    if (!adminPassword || !sessionSecret || typeof password !== "string") {
      return NextResponse.json({ error: "Admin authentication is not configured" }, { status: 500 });
    }

    const expected = Buffer.from(adminPassword);
    const received = Buffer.from(password);
    const validPassword = expected.length === received.length && timingSafeEqual(expected, received);

    if (!validPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const value = `${adminPassword}.${sign(adminPassword, sessionSecret)}`;
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
