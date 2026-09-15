import { redirect } from "next/navigation";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ password?: string }>;
}) {
  const params = await searchParams;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || params.password !== adminPassword) {
    redirect("/admin/login");
  }

  return <AdminDashboard />;
}
