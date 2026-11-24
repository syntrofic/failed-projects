import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Reveal } from '@/components/site/reveal';
import { Section, SectionHeading } from '@/components/site/section';
import { PlaceholderBadge } from '@/components/site/site-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Braces, Workflow } from 'lucide-react';

const CAPABILITIES = [
  {
    icon: Bot,
    title: 'Agent Orchestration',
    description:
      'From single-turn chat to multi-agent collaboration. Define roles, tools, and workflows declaratively — and embed AI into real business processes.',
  },
  {
    icon: Workflow,
    title: 'Workflow Automation',
    description:
      'Hand repetitive work to observable, replayable pipelines. Humans decide at the critical nodes; agents handle the rest.',
  },
  {
    icon: Braces,
    title: 'Developer First',
    description:
      'Type-safe SDKs, open protocols, and local-first tooling. Built for engineering teams, not black boxes.',
  },
];

const TRUSTED_BY = [
  'Mercedes-Benz',
  'NVIDIA',
  'Fox',
  'AngelList',
  'Vercel',
];

const TERMINAL_LINES = [
  { prompt: '$', cmd: 'syntrofic deploy ./agent-flow', tone: 'cmd' },
  { out: '✓ Parsed workflow definition (3 agents, 7 tools)', tone: 'ok' },
  { out: '✓ Build completed — 1.2s', tone: 'ok' },
  { out: '→ Agent "researcher" connected WebSearch, ReadFile', tone: 'info' },
  { out: '→ Agent "writer" connected writing toolchain', tone: 'info' },
  { out: '● Pipeline running… type `syntrofic logs` to stream output', tone: 'run' },
] as const;

export default function HomePage() {
  return (
    <>
      {/* Hero — fades and drifts up as you scroll away */}
      <section className="relative overflow-hidden">
        {/* Dark ambience: radial glow + grid */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[oklch(0.145_0.005_260)] dark:bg-[oklch(0.12_0.005_260)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60 [background:radial-gradient(900px_480px_at_50%_-10%,oklch(0.53_0.22_275/0.35),transparent_70%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 [background-image:linear-gradient(oklch(1_0_0/0.04)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/0.04)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
        />

        <div className="hero-scroll mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 pb-24 pt-28 text-center sm:pb-32 sm:pt-36">
          <Reveal>
            <Badge
              variant="outline"
              className="gap-1.5 rounded-full border-white/15 bg-white/5 px-3.5 py-1 text-white/80"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Agent platform · Public beta
            </Badge>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="max-w-3xl text-balance font-serif text-4xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">
              Agents,
              <span className="hero-accent bg-gradient-to-r from-primary via-[oklch(0.72_0.16_200)] to-primary bg-clip-text text-transparent">
                {' '}woven into your workflow
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="max-w-xl text-pretty text-base leading-relaxed text-white/60 sm:text-lg">
              Syntrofic builds the next generation of agent collaboration — declarative
              orchestration, open protocols, developer first. Give repetitive work to agents;
              keep the decisions that matter with people.
            </p>
          </Reveal>

          <Reveal delay={240} className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/products">
                Get started
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link to="/about">About us</Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-border/60 bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10">
          <Reveal className="flex items-center gap-3">
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Trusted by leading teams
            </p>
            <PlaceholderBadge />
          </Reveal>
          <Reveal delay={100} mode="slide-right" className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {TRUSTED_BY.map((name) => (
              <span key={name} className="text-lg font-semibold text-muted-foreground/70">
                {name}
              </span>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Capabilities */}
      <Section id="capabilities">
        <SectionHeading
          eyebrow="Capabilities"
          title={
            <>
              Agent infrastructure
              <br className="hidden sm:block" />
              built for engineering teams
            </>
          }
          description="Not another chat window. A composable, observable, trustworthy runtime for agents."
          sweep
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {CAPABILITIES.map((cap, i) => (
            <Reveal key={cap.title} mode={i === 0 ? 'slide-right' : i === 2 ? 'slide-left' : 'scroll'}>
              <Card className="h-full border-border/60 transition-colors hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <cap.icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{cap.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground">
                  {cap.description}
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Terminal demo */}
      <section className="border-y border-border/60 bg-muted/40">
        <Section className="py-20 sm:py-24">
          <SectionHeading
            align="left"
            eyebrow="Developer experience"
            title="Deploy a multi-agent pipeline in three commands"
            description="Declarative definitions, local hot reload, one-command deploys. Manage agents like code."
            sweep
          />
          <Reveal mode="slide-left" delay={0} className="mt-10">
            <div className="overflow-hidden rounded-xl border border-border/80 bg-[oklch(0.145_0.005_260)] shadow-2xl">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="size-3 rounded-full bg-white/15" />
                <span className="size-3 rounded-full bg-white/15" />
                <span className="size-3 rounded-full bg-white/15" />
                <span className="ml-2 font-mono text-xs text-white/40">syntrofic — zsh</span>
                <span className="ml-auto"><PlaceholderBadge label="Demo" /></span>
              </div>
              <div className="flex flex-col gap-2.5 p-6 font-mono text-sm">
                {TERMINAL_LINES.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.tone === 'cmd'
                        ? 'text-white'
                        : line.tone === 'ok'
                          ? 'text-emerald-400'
                          : line.tone === 'info'
                            ? 'text-sky-400'
                            : 'text-white/60'
                    }
                  >
                    {line.tone === 'cmd' ? (
                      <>
                        <span className="mr-2 text-primary">{line.prompt}</span>
                        {line.cmd}
                      </>
                    ) : (
                      line.out
                    )}
                  </div>
                ))}
                <div className="mt-1 flex items-center gap-2 text-white">
                  <span className="text-primary">$</span>
                  <span className="inline-block h-4 w-2 animate-pulse bg-white/80 motion-reduce:animate-none" />
                </div>
              </div>
            </div>
          </Reveal>
        </Section>
      </section>

      {/* CTA */}
      <Section>
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 px-8 py-16 text-center sm:px-16">
            <h2 className="text-balance font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to add agents to your team?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground">
              Join the public beta and help define the future of agent collaboration.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/products">
                  View products
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="mailto:contact@syntrofic.com">Contact us</a>
              </Button>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
