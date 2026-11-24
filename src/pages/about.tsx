import { Target, Compass, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Reveal } from '@/components/site/reveal';
import { Section, SectionHeading } from '@/components/site/section';
import { PlaceholderBadge, CONTACT_EMAIL } from '@/components/site/site-layout';

const VALUES = [
  {
    icon: Target,
    title: 'Pragmatic',
    description: 'We don\u2019t build for demos. Every feature must answer one question: how does it genuinely make the user\u2019s work better?',
  },
  {
    icon: Compass,
    title: 'Open',
    description: 'Open protocols, open ecosystem, open mind. We believe the future of agents belongs to no single company.',
  },
  {
    icon: Users,
    title: 'Human-centered',
    description: 'Agents are colleagues, not replacements. Every design ends at human judgment and creativity.',
  },
];

const MILESTONES = [
  { year: '2024', event: 'Company founded in Shanghai, focused on agent infrastructure.' },
  { year: '2025', event: 'Core platform in private beta; first seed users and validated use cases.' },
  { year: '2026', event: 'Public beta launched; product matrix and developer ecosystem under construction.' },
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-border/60 bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-24 sm:py-28">
          <Reveal>
            <h1 className="max-w-3xl text-balance font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
              We believe agents will redefine how work is organized
            </h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground">
              Syntrofic was founded in Shanghai by engineers with a long-term conviction in
              agent infrastructure. &ldquo;Syn&rdquo; stands for perception extended across people
              and machines; &ldquo;trofic&rdquo; for collaboration that flows like rhythm.
            </p>
          </Reveal>
        </div>
      </section>

      <Section>
        <SectionHeading align="left" eyebrow="Values" title="How we work" />
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={i * 100}>
              <Card className="h-full border-border/60">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <v.icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{v.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground">
                  {v.description}
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <section className="border-y border-border/60 bg-muted/40">
        <Section className="py-20 sm:py-24">
          <SectionHeading
            align="left"
            eyebrow="Journey"
            title="Where we've been"
            description={<PlaceholderBadge label="Timeline TBD" />}
          />
          <div className="mt-12 flex flex-col gap-0">
            {MILESTONES.map((m, i) => (
              <Reveal key={m.year} delay={i * 100}>
                <div className="flex gap-6 border-l border-border/80 py-6 pl-8 sm:gap-12">
                  <span className="w-16 shrink-0 font-serif text-2xl font-semibold text-primary">
                    {m.year}
                  </span>
                  <p className="pt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {m.event}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      </section>

      <Section className="flex flex-col items-center gap-4 text-center">
        <Reveal>
          <h2 className="text-balance font-serif text-3xl font-semibold tracking-tight">
            Join us
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            We are always looking for engineers and designers who care deeply about agents.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </Reveal>
      </Section>
    </>
  );
}
