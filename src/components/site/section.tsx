import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/site/reveal';

export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn('mx-auto max-w-6xl px-6 py-20 sm:py-28', className)}>
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  sweep = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  /** Apply the scroll-driven gradient text sweep to the title */
  sweep?: boolean;
}) {
  return (
    <Reveal
      className={cn(
        'flex flex-col gap-4',
        align === 'center' ? 'items-center text-center' : 'items-start',
      )}
    >
      {eyebrow && (
        <span className="rounded-full border border-border/80 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground">
          {eyebrow}
        </span>
      )}
      <h2
        className={cn(
          'max-w-2xl text-balance font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl',
          sweep && 'sda-text-sweep',
        )}
      >
        {title}
      </h2>
      {description && (
        <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </Reveal>
  );
}
