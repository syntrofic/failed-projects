import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type RevealMode =
  /** Fade up once when entering the viewport (IntersectionObserver, works everywhere). */
  | 'once'
  /** CSS scroll-driven animation: progress follows the element's position in the viewport. */
  | 'scroll'
  /** Same as 'scroll' but sliding in from the right (content flows leftward). */
  | 'slide-left'
  /** Same as 'scroll' but sliding in from the left. */
  | 'slide-right';

const modeClass: Record<Exclude<RevealMode, 'once'>, string> = {
  scroll: 'sda-fade-up',
  'slide-left': 'sda-slide-left',
  'slide-right': 'sda-slide-right',
};

/**
 * Scroll reveal container.
 *
 * - mode="once": IntersectionObserver triggers a one-shot fade-in-up
 *   (pure CSS transition, works in every browser).
 * - mode="scroll" | "slide-left" | "slide-right": native CSS scroll-driven
 *   animation (`animation-timeline: view()`). Progress is bound to scroll
 *   position — scrubbing backwards replays the effect in reverse. Browsers
 *   without support render the final state (progressive enhancement).
 *
 * All modes respect `prefers-reduced-motion`.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
  mode = 'once',
}: {
  children: ReactNode;
  className?: string;
  /** 毫秒级延迟，用于编排多元素错落出现（仅 mode="once" 生效） */
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'span';
  mode?: RevealMode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const useSda = mode !== 'once';

  useEffect(() => {
    if (useSda) return; // scroll-driven modes are pure CSS
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [useSda]);

  return (
    <Tag
      ref={ref as never}
      style={delay > 0 && mode === 'once' ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        !useSda &&
          cn(
            'transition-all duration-700 ease-out motion-reduce:transition-none',
            visible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
          ),
        useSda && modeClass[mode],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
