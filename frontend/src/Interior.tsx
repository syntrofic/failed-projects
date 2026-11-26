import type {ReactNode} from 'react';
import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {BreadcrumbItem, Breadcrumbs} from '@astryxdesign/core/Breadcrumbs';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Link} from '@astryxdesign/core/Link';
import {Section as AstryxSection} from '@astryxdesign/core/Section';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {sections, site, type Cover, type Entry, type Section} from './content';
import {entryPath, sectionPath, type Page} from './routes';

type InteriorPage = Exclude<Page, {kind: 'home' | 'missing'}>;

function PageBreadcrumbs({title, parent}: {title: string; parent?: Section}) {
  return (
    <Breadcrumbs label="当前位置">
      <BreadcrumbItem href="/" isCurrent={false}>首页</BreadcrumbItem>
      {parent && (
        <BreadcrumbItem href={sectionPath(parent.slug)} isCurrent={false}>
          {parent.title}
        </BreadcrumbItem>
      )}
      <BreadcrumbItem isCurrent>{title}</BreadcrumbItem>
    </Breadcrumbs>
  );
}

function PageIntro({title, children}: {title: string; children: ReactNode}) {
  return (
    <VStack gap={6}>
      <PageBreadcrumbs title={title} />
      <AstryxSection variant="transparent" padding={0} className="interior-intro">
        {children}
      </AstryxSection>
    </VStack>
  );
}

function PublishedDate({date}: {date: string}) {
  return (
    <Text type="supporting" color="secondary" className="interior-entry-date" hasTabularNumbers>
      <time dateTime={date}>{date.replaceAll('-', '.')}</time>
    </Text>
  );
}

function EntryCover({cover, ratio, className, loading = 'lazy'}: {
  cover: Cover;
  ratio: number;
  className?: string;
  loading?: 'eager' | 'lazy';
}) {
  return (
    <AspectRatio ratio={ratio} fit="contain" className={className}>
      <img
        src={cover.src}
        alt={cover.alt}
        width={cover.width}
        height={cover.height}
        loading={loading}
        className={cover.alt === '' && cover.src.startsWith('/images/flow-') ? 'interior-curve-art' : undefined}
      />
    </AspectRatio>
  );
}

function ArticleRows({section, entries}: {section: Section; entries: readonly Entry[]}) {
  return (
    <VStack as="ul" role="list" gap={6}>
      {entries.map(entry => (
        <VStack as="li" key={entry.slug}>
          <Grid className="interior-entry-row" columns={1} columnGap={5} align="center" data-cover={entry.cover ? 'true' : undefined}>
            {entry.cover && <EntryCover cover={entry.cover} ratio={4 / 3} className="interior-row-media" />}
            <VStack gap={2} className="interior-entry-copy">
              {entry.date && <PublishedDate date={entry.date} />}
              <Heading level={3} className="interior-entry-title">
                <Link href={entryPath(section.slug, entry.slug)} type="inherit" color="primary">
                  {entry.title}
                </Link>
              </Heading>
              <Text as="p" color="secondary">{entry.summary}</Text>
            </VStack>
          </Grid>
        </VStack>
      ))}
    </VStack>
  );
}

function AboutPage() {
  const [statement, ...direction] = site.about;

  return (
    <VStack className="shell interior-page">
      <PageIntro title="关于我们">
        <Grid className="interior-surface-content" columns={{minWidth: 330, max: 2}} gap={8} align="center">
          <Heading level={1} type="display-1" weight="semibold" textWrap="balance" className="interior-title">{site.headline}</Heading>
          <VStack gap={4} maxWidth="49ch" hAlign="start">
            <Text as="p" type="label" weight="semibold">{site.companyName}</Text>
            {statement && <Text as="p" type="large" color="secondary">{statement}</Text>}
          </VStack>
        </Grid>
      </PageIntro>

      <VStack as="section" aria-labelledby="company-purpose" gap={6}>
        <Heading id="company-purpose" level={2} type="display-2">我们的工作</Heading>
        <Grid columns={{minWidth: 214, max: 4}} gap={6} align="start">
          {sections.map(section => (
            <VStack key={section.slug} gap={3}>
              <Heading level={3} className="interior-entry-title">
                <Link href={sectionPath(section.slug)} type="inherit" color="primary">{section.title}</Link>
              </Heading>
              <Text as="p" color="secondary">{section.description}</Text>
            </VStack>
          ))}
        </Grid>
      </VStack>

      {direction.length > 0 && (
        <AstryxSection variant="transparent" padding={0} role="region" aria-labelledby="company-direction" className="interior-direction" data-surface="sage">
          <Grid className="interior-surface-content" columns={site.aboutCover ? {minWidth: 340, max: 2} : 1} gap={8} align="center">
            <VStack gap={4} maxWidth="44ch">
              <Heading id="company-direction" level={2} type="display-2">我们的方向</Heading>
              {direction.map((paragraph, index) => <Text key={index} as="p">{paragraph}</Text>)}
            </VStack>
            {site.aboutCover && <EntryCover cover={site.aboutCover} ratio={3 / 2} />}
          </Grid>
        </AstryxSection>
      )}
    </VStack>
  );
}

function LatestStory({section, entry, className, isLead = false}: {
  section: Section;
  entry: Entry;
  className: string;
  isLead?: boolean;
}) {
  return (
    <VStack as="article" gap={4} className={className}>
      {entry.cover && <EntryCover cover={entry.cover} ratio={isLead ? 3 / 2 : 4 / 3} className="interior-story-media" loading={isLead ? 'eager' : 'lazy'} />}
      <VStack gap={2}>
        {entry.date && <PublishedDate date={entry.date} />}
        <Heading level={3} type={isLead ? 'display-3' : undefined} weight="semibold" textWrap="balance" className="interior-entry-title">
          <Link href={entryPath(section.slug, entry.slug)} type="inherit" color="primary">{entry.title}</Link>
        </Heading>
        <Text as="p" color="secondary">{entry.summary}</Text>
      </VStack>
    </VStack>
  );
}

function BlogPage({section}: {section: Section}) {
  const entries = [...section.entries].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const [lead, leftStory, rightStory] = entries;

  return (
    <VStack className="shell interior-page">
      <PageIntro title={section.title}>
        <VStack gap={3} hAlign="start" className="interior-surface-content">
          <Heading level={1} type="display-1" weight="semibold" className="interior-title">{section.title}</Heading>
          <Text as="p" type="large" color="secondary">{section.description}</Text>
        </VStack>
      </PageIntro>

      {lead && (
        <VStack as="section" gap={8} aria-labelledby="blog-latest" data-surface="blog">
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
            <Heading id="blog-latest" level={2} type="display-2">最新文章</Heading>
            <Link href="#blog-archive" weight="semibold">全部文章</Link>
          </HStack>

          <Grid
            className="interior-editorial-grid"
            columns={1}
            data-side-stories={rightStory ? 2 : leftStory ? 1 : 0}
            gap={8}
            align="start"
          >
            <LatestStory section={section} entry={lead} isLead className="editorial-lead" />
            {leftStory && <LatestStory section={section} entry={leftStory} className="editorial-left" />}
            {rightStory && <LatestStory section={section} entry={rightStory} className="editorial-right" />}
          </Grid>
        </VStack>
      )}

      <VStack as="section" id="blog-archive" gap={8} aria-labelledby="blog-archive-title" className="interior-listing" data-surface="blog">
        <Heading id="blog-archive-title" level={2} type="display-2">文章归档</Heading>
        <ArticleRows section={section} entries={entries} />
      </VStack>
    </VStack>
  );
}

function SectionPage({section}: {section: Section}) {
  return (
    <VStack className="shell interior-page">
      <PageIntro title={section.title}>
        <Grid className="interior-surface-content" columns={{minWidth: 330, max: 2}} gap={8} align="center">
          <Heading level={1} type="display-1" weight="semibold" textWrap="balance" className="interior-title">{section.title}</Heading>
          <Text as="p" type="large" color="secondary" className="interior-section-summary">
            {section.description}
          </Text>
        </Grid>
      </PageIntro>

      <VStack as="section" gap={8} aria-labelledby="section-entries-title" className="interior-listing" data-surface={section.slug}>
        <Heading id="section-entries-title" level={2} type="display-2">栏目内容</Heading>
        <ArticleRows section={section} entries={section.entries} />
      </VStack>
    </VStack>
  );
}

function DetailPage({section, entry}: {section: Section; entry: Entry}) {
  return (
    <VStack className="shell interior-page">
      <VStack as="article" className="interior-article" gap={8}>
        <VStack gap={6}>
          <PageBreadcrumbs title={entry.title} parent={section} />
          <VStack as="header" gap={4} hAlign="start" className="interior-intro interior-surface-content">
            {entry.date && <PublishedDate date={entry.date} />}
            <Heading level={1} type="display-1" weight="semibold" textWrap="balance" className="interior-title">{entry.title}</Heading>
            <Text as="p" type="large" color="secondary">{entry.summary}</Text>
          </VStack>
        </VStack>

        {entry.cover && (
          <EntryCover cover={entry.cover} ratio={16 / 9} className="interior-detail-media" loading="eager" />
        )}

        <VStack gap={4} hAlign="start" className="interior-article-copy">
          <Text as="p" type="supporting" color="secondary">内容草稿</Text>
          {entry.body.map((paragraph, index) => <Text key={index} as="p" type="large" weight="normal">{paragraph}</Text>)}
          {entry.href && entry.linkLabel && (
            <Link href={entry.href} isExternalLink newTabLabel="（在新标签页打开）">{entry.linkLabel}</Link>
          )}
        </VStack>
      </VStack>
    </VStack>
  );
}

export function Interior({page}: {page: InteriorPage}) {
  switch (page.kind) {
    case 'about':
      return <AboutPage />;
    case 'section':
      return page.section.slug === 'blog' ? <BlogPage section={page.section} /> : <SectionPage section={page.section} />;
    case 'entry':
      return <DetailPage section={page.section} entry={page.entry} />;
  }
}
