import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminDashboard from "./AdminDashboard";

function isValidSession(value: string | undefined) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!value || !adminPassword || !sessionSecret) return false;

  const [password, signature] = value.split(".");
  if (!password || !signature || password !== adminPassword) return false;

  const expected = createHmac("sha256", sessionSecret).update(adminPassword).digest("hex");
  const received = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;

  if (!isValidSession(session)) redirect("/admin/login");

  return <AdminDashboard />;
}
