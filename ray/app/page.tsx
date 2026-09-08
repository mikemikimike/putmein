import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ray_token")?.value;

  if (token) {
    const user = await verifyToken(token);
    if (user) {
      redirect("/chat");
    }
  }

  redirect("/login");
}
