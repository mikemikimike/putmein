import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Extract IP address
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfIp = req.headers.get("cf-connecting-ip");
    const ip = (cfIp || realIp || (forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1")).trim();

    // Extract User Agent
    const userAgent = req.headers.get("user-agent") || null;

    // Extract Location from hosting headers
    const city = req.headers.get("x-vercel-ip-city") || req.headers.get("cf-ipcity") || null;
    const region = req.headers.get("x-vercel-ip-country-region") || req.headers.get("cf-region") || null;
    const country = req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || req.headers.get("x-country") || null;

    let location: string | null = null;
    if (city || region || country) {
      location = [city, region, country].filter(Boolean).join(", ");
    }

    // IP Geolocation fallback for non-local IPs
    if (!location && ip && ip !== "127.0.0.1" && ip !== "::1" && !ip.startsWith("192.168.") && !ip.startsWith("10.") && !ip.startsWith("172.")) {
      try {
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
          signal: AbortSignal.timeout(1500),
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && (geoData.city || geoData.country_name)) {
            location = [geoData.city, geoData.region, geoData.country_name].filter(Boolean).join(", ");
          }
        }
      } catch {
        // Fallback silently if geo lookup times out
      }
    }

    const entry = await prisma.cohenWaitlist.create({
      data: {
        email: cleanEmail,
        ip,
        location: location || "Unknown",
        userAgent,
      },
    });

    return NextResponse.json({ success: true, id: entry.id }, { status: 201 });
  } catch (error: any) {
    console.error("Error in Cohen waitlist POST:", error);
    return NextResponse.json(
      { error: "Failed to join waitlist. Please try again." },
      { status: 500 }
    );
  }
}
