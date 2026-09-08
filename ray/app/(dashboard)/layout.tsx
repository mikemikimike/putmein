import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import ClientLayout from "@/components/ClientLayout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ray_token")?.value;

  if (!token) redirect("/login");

  const user = await verifyToken(token);
  if (!user) redirect("/login");

  return (
    <ClientLayout user={{ name: user.name, email: user.email, role: user.role }}>
      {children}
    </ClientLayout>
  );
}
