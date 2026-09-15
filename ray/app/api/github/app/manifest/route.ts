import { NextRequest, NextResponse } from "next/server";

// GET /api/github/app/manifest — generates GitHub App manifest
export async function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:4567";
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const isPublicHttps = origin.startsWith("https://") && !origin.includes("localhost") && !origin.includes("127.0.0.1");

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const appName = `Ray-Cloud-${randomSuffix}`;

  const manifest: Record<string, any> = {
    name: appName,
    url: origin,
    hook_attributes: {
      url: isPublicHttps ? `${origin}/api/webhooks/github/app` : `https://smee.io/ray-cloud-${randomSuffix}`,
      active: isPublicHttps,
    },
    redirect_url: `${origin}/api/github/app/callback`,
    callback_urls: [`${origin}/api/github/app/callback`],
    public: false,
    default_permissions: {
      contents: "read",
      metadata: "read",
      pull_requests: "read",
      emails: "read",
    },
  };

  if (isPublicHttps) {
    manifest.default_events = ["push", "pull_request"];
  }

  return NextResponse.json({
    actionUrl: "https://github.com/settings/apps/new",
    manifest: JSON.stringify(manifest),
  });
}
