export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-black flex items-center justify-center p-4 ray-grid-bg">
      {/* Ambient glow — top center */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top, rgba(255,255,255,0.04) 0%, transparent 70%)",
          zIndex: 0,
        }}
      />
      <div className="relative z-10 w-full max-w-[400px]">{children}</div>
    </div>
  );
}
