/**
 * Demo-banner gate (Design-System.md, "Demo chrome" rule).
 *
 * The prototype disclaimer in the footer is only shown in development builds
 * or when explicitly opted in via NEXT_PUBLIC_DEMO_BANNER=1. Production-facing
 * builds must not advertise the prototype.
 */
export function isDemoBannerVisible(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEMO_BANNER === "1"
  );
}
