import { ArrowUpRight, Bot, Check, Lock, Plug, Server, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Reveal } from '@/components/site/reveal';
import { Section, SectionHeading } from '@/components/site/section';
import { PlaceholderBadge, CONTACT_EMAIL } from '@/components/site/site-layout';

const FEATURES = [
  {
    icon: Bot,
    title: 'Multi-agent collaboration',
    description: 'Declare agent roles, capability boundaries, and collaboration topology. Complex tasks decompose and execute automatically.',
  },
  {
    icon: Workflow,
    title: 'Visual workflows',
    description: 'Drag-and-drop pipeline editor that stays in sync with code mode. Business people and engineers share one language.',
  },
  {
    icon: Plug,
    title: 'Open tool ecosystem',
    description: 'Native MCP protocol support. Connect any tool or data source in one click — no vendor lock-in.',
  },
  {
    icon: Server,
    title: 'Enterprise runtime',
    description: 'Self-hosted deployment, fine-grained permissions, and complete audit logs. Ready for regulated industries.',
  },
  {
    icon: Lock,
    title: 'Data sovereignty',
    description: 'Your data never leaves your domain. Encrypted model calls, keys under your control.',
  },
  {
    icon: Check,
    title: 'Observability',
    description: 'Every call and every decision is traceable, replayable, and evaluable. Improvement with evidence.',
  },
];

const PRICING = [
  {
    name: 'Developer',
    price: 'Free',
    note: 'Individual & non-commercial use',
    features: ['Local runtime', '3 agents', 'Community support'],
    cta: 'Download',
    highlight: false,
  },
  {
    name: 'Team',
    price: 'Coming soon',
    note: 'Small and mid-size teams',
    features: ['Cloud workspace', 'Unlimited agents', 'Visual orchestration', 'Priority support'],
    cta: 'Join waitlist',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    note: 'Self-hosted & compliance',
    features: ['Self-hosted deployment', 'SSO / audit', 'Dedicated success team', 'SLA guarantee'],
    cta: 'Contact sales',
    highlight: false,
  },
];

export default function ProductsPage() {
  return (
    <>
      <section className="border-b border-border/60 bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6 py-24 text-center sm:py-28">
          <Reveal>
            <Badge variant="outline" className="rounded-full px-3.5 py-1">
              Products
            </Badge>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="max-w-2xl text-balance font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
              One platform for your entire agent pipeline
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="max-w-xl text-pretty leading-relaxed text-muted-foreground">
              From a single agent to company-wide automation, Syntrofic covers the full
              lifecycle: build, deploy, and govern.
            </p>
          </Reveal>
        </div>
      </section>

      <Section>
        <SectionHeading align="left" eyebrow="Features" title="Core features" />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80}>
              <Card className="h-full border-border/60">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <section className="border-y border-border/60 bg-muted/40">
        <Section className="py-20 sm:py-24">
          <SectionHeading
            eyebrow="Pricing"
            title="Choose the plan that fits"
            description={<PlaceholderBadge label="Pricing TBD" />}
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {PRICING.map((tier, i) => (
              <Reveal key={tier.name} delay={i * 100}>
                <Card
                  className={
                    tier.highlight
                      ? 'relative h-full border-primary/50 shadow-lg shadow-primary/5 ring-1 ring-primary/30'
                      : 'h-full border-border/60'
                  }
                >
                  {tier.highlight && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 text-primary-foreground">
                      Recommended
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="text-base">{tier.name}</CardTitle>
                    <div className="mt-2 text-3xl font-semibold tracking-tight">{tier.price}</div>
                    <p className="text-sm text-muted-foreground">{tier.note}</p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <ul className="flex flex-col gap-2.5">
                      {tier.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2 text-sm">
                          <Check className="size-4 text-primary" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-2 w-full"
                      variant={tier.highlight ? 'default' : 'outline'}
                      asChild
                    >
                      <a href={`mailto:${CONTACT_EMAIL}`}>{tier.cta}</a>
                    </Button>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </Section>
      </section>

      <Section className="flex flex-col items-center gap-6 text-center">
        <Reveal>
          <h2 className="text-balance font-serif text-3xl font-semibold tracking-tight">
            Need something custom?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            We offer dedicated solutions and co-design programs for scale deployments.
          </p>
          <Button size="lg" className="mt-6" asChild>
            <a href={`mailto:${CONTACT_EMAIL}`}>
              Contact us
              <ArrowUpRight className="size-4" />
            </a>
          </Button>
        </Reveal>
      </Section>
    </>
  );
}
