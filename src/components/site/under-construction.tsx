import { useEffect, useState } from 'react';
import { Globe, Hammer, FileCheck, Mail, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CONTACT_EMAIL } from '@/components/site/site-layout';

type Lang = 'en' | 'zh';

const COPY = {
  en: {
    toggle: '中文',
    badge: 'Under construction',
    title: 'Something is taking shape',
    body: 'Our full website is in active development, and ICP filing is in progress. Stay tuned.',
    status: [
      { icon: Hammer, label: 'Website development', value: 'In progress' },
      { icon: FileCheck, label: 'ICP filing', value: 'Pending approval' },
    ],
    cta: 'Get in touch',
  },
  zh: {
    toggle: 'English',
    badge: '网站建设中',
    title: '我们正在打磨全新官网',
    body: '网站正在积极开发中，ICP 备案同步办理，敬请期待。',
    status: [
      { icon: Hammer, label: '网站开发', value: '进行中' },
      { icon: FileCheck, label: 'ICP 备案', value: '审核中' },
    ],
    cta: '联系我们',
  },
} as const;

/**
 * 全站遮罩层：毛玻璃模糊背景 + 开发/备案中说明，支持中英切换。
 * 固定覆盖在所有内容之上，占位期间 visitors 无法滚动下方页面。
 */
export function UnderConstruction() {
  const [lang, setLang] = useState<Lang>('zh');
  const t = COPY[lang];

  // 遮罩层挂载期间锁定 body 滚动：滚轮/触摸不会再带动底层页面。
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background/60 backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(800px_420px_at_50%_-10%,oklch(0.53_0.22_275/0.18),transparent_70%)]" />

      <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <div className="absolute right-6 top-6">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={() => setLang((l) => (l === 'en' ? 'zh' : 'en'))}
          >
            <Globe className="size-3.5" />
            {t.toggle}
          </Button>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wide text-primary">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          {t.badge}
        </span>

        <h1 className="text-balance font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          {t.title}
        </h1>

        <p className="max-w-md text-pretty leading-relaxed text-muted-foreground">
          {t.body}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {t.status.map((s) => (
            <span
              key={s.label}
              className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-card/60 px-4 py-2 text-sm"
            >
              <s.icon className="size-4 text-primary" />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-medium">{s.value}</span>
            </span>
          ))}
        </div>

        <Button size="lg" className="mt-2" asChild>
          <a href={`mailto:${CONTACT_EMAIL}`}>
            <Mail className="size-4" />
            {t.cta}
            <ArrowUpRight className="size-4" />
          </a>
        </Button>

        <p className="mt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Syntrofic
        </p>
      </div>
    </div>
  );
}
