import { NextResponse } from "next/server";
import { isPublicHttpsOrigin, resolvePublicOrigin } from "@/lib/github-manifest";

// GET /api/github/app/manifest — generates GitHub App manifest
export async function GET() {
  let origin: string;
  try {
    origin = resolvePublicOrigin();
  } catch (error) {
    console.error("GitHub App manifest public URL configuration error:", error);
    return NextResponse.json(
      { error: "GitHub App manifest public URL is not configured correctly." },
      { status: 500 },
    );
  }

  const isPublicHttps = isPublicHttpsOrigin(origin);

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const appName = `Ray-Cloud-${randomSuffix}`;

  const manifest: Record<string, unknown> = {
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
