import { CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Reveal } from '@/components/site/reveal';
import { Section } from '@/components/site/section';
import { PlaceholderBadge } from '@/components/site/site-layout';

const POSTS = [
  {
    slug: 'hello-world',
    title: 'Why we decided to build agent infrastructure',
    date: '2026-11-15',
    tag: 'Announcement',
    excerpt: 'From tool calling to multi-agent collaboration — the shifts we see, and the direction we are betting on.',
  },
];

export default function BlogPage() {
  return (
    <Section>
      <Reveal className="flex flex-col gap-4">
        <Badge variant="outline" className="w-fit rounded-full px-3.5 py-1">
          Blog
        </Badge>
        <h1 className="text-balance font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          Ideas & updates
        </h1>
      </Reveal>

      <div className="mt-12 flex flex-col gap-4">
        {POSTS.map((post, i) => (
          <Reveal key={post.slug} delay={i * 100}>
            <Card className="border-border/60 transition-colors hover:border-primary/40">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="rounded-full">
                    {post.tag}
                  </Badge>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {post.date}
                  </span>
                  <PlaceholderBadge />
                </div>
                <CardTitle className="mt-3 text-xl leading-snug">{post.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {post.excerpt}
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
