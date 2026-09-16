import { NextRequest, NextResponse } from "next/server";
import { revokeSessionToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("ray_token")?.value;
  if (token) {
    await revokeSessionToken(token);
  }

  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol;
  const isHttps = proto.includes("https");

  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.set("ray_token", "", {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
