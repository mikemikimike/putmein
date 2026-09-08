import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol;
  const isHttps = proto.includes("https");

  const response = NextResponse.json({ success: true });
  response.cookies.set("ray_token", "", {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
