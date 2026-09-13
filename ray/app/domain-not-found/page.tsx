import { headers } from "next/headers";

export const metadata = {
  title: "404 - Domain Not Found",
  robots: "noindex, nofollow",
};

export default async function DomainNotFoundPage() {
  const reqHeaders = await headers();
  const host =
    reqHeaders.get("x-domain-requested") ||
    reqHeaders.get("host") ||
    "unknown-domain";

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#080808",
        color: "#ffffff",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#101010",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          padding: "36px 32px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          textAlign: "center",
        }}
      >
        {/* Status Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "9999px",
            padding: "4px 12px",
            fontSize: "11px",
            fontFamily: "monospace",
            color: "#f87171",
            marginBottom: "20px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#ef4444",
            }}
          />
          <span>404 NOT FOUND</span>
        </div>

        {/* Big 404 */}
        <h1
          style={{
            fontSize: "64px",
            lineHeight: 1,
            margin: "0 0 12px 0",
            fontWeight: 800,
            fontFamily: "monospace",
            letterSpacing: "-0.04em",
            color: "rgba(255, 255, 255, 0.95)",
          }}
        >
          404
        </h1>

        <h2
          style={{
            fontSize: "18px",
            fontWeight: 600,
            margin: "0 0 12px 0",
            color: "rgba(255, 255, 255, 0.9)",
          }}
        >
          Domain Not Linked
        </h2>

        <p
          style={{
            fontSize: "13px",
            lineHeight: "1.6",
            color: "rgba(255, 255, 255, 0.45)",
            margin: "0 0 24px 0",
          }}
        >
          The domain{" "}
          <code
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "4px",
              padding: "2px 6px",
              fontFamily: "monospace",
              color: "#38bdf8",
              fontSize: "12px",
            }}
          >
            {host}
          </code>{" "}
          points to this server, but is not linked to any active application or deployment.
        </p>

        {/* Technical details block */}
        <div
          style={{
            background: "#0a0a0a",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "8px",
            padding: "12px 14px",
            fontSize: "11px",
            fontFamily: "monospace",
            color: "rgba(255, 255, 255, 0.35)",
            textAlign: "left",
            lineHeight: 1.6,
          }}
        >
          <div>• Host: {host}</div>
          <div>• Status: DNS Verified • Route Missing</div>
          <div>• Note: To serve content, link this domain in project settings.</div>
        </div>
      </div>
    </div>
  );
}
