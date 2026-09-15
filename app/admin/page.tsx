import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminDashboard from "./AdminDashboard";
import { ADMIN_COOKIE, isValidAdminSession } from "@/lib/adminAuth";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE)?.value;

  if (!isValidAdminSession(session)) redirect("/admin/login");

  return <AdminDashboard />;
}
