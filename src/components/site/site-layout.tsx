import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollProgress } from '@/components/site/scroll-progress';
import { UnderConstruction } from '@/components/site/under-construction';

export const CONTACT_EMAIL = 'contact@syntrofic.com';

const NAV_ITEMS = [
  { to: '/products', label: 'Products' },
  { to: '/about', label: 'About' },
  { to: '/blog', label: 'Blog' },
];

/** 占位内容标记：所有未定稿/虚构内容统一用这个徽章标识。 */
export function PlaceholderBadge({ label = 'Placeholder' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-amber-600 uppercase dark:text-amber-400">
      {label}
    </span>
  );
}

function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        'text-lg font-semibold tracking-tight text-foreground',
        className,
      )}
    >
      Syntrofic
    </Link>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Wordmark />

        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-accent-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
          </Button>
          <Button size="sm" asChild>
            <Link to="/products">
              Learn more
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-foreground md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border/60 bg-background/95 px-6 py-4 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2.5 text-sm text-muted-foreground',
                    isActive && 'bg-accent text-accent-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
              </Button>
              <Button size="sm" className="flex-1" asChild>
                <Link to="/products" onClick={() => setOpen(false)}>Learn more</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Wordmark />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Building agentic products and the next generation of human–AI collaboration.
          </p>
        </div>
        <div className="flex gap-16">
          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-medium">Site</span>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-medium">Contact</span>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Syntrofic. All rights reserved.</span>
          <span className="flex items-center gap-2">
            <PlaceholderBadge label="ICP pending" />
          </span>
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <UnderConstruction />
      <ScrollProgress />
      <Navbar />
      <main key={pathname} className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
