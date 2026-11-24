import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Fixed top progress bar. Width follows page scroll via a native CSS
 * scroll-driven animation (`animation-timeline: scroll()`) — zero JS per
 * frame, no layout thrash. Hidden in browsers without support (bar simply
 * has width 0 via the `both` fill fallback… actually unsupported browsers
 * never run the animation, so scaleX stays at its unanimated value 0).
 */
export function ScrollProgress() {
  const { pathname } = useLocation();

  // Remount per route so the bar restarts at the top of each page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5"
    >
      <div className="scroll-progress h-full origin-left bg-gradient-to-r from-primary via-primary to-[oklch(0.68_0.18_200)]" />
    </div>
  );
}
