import {useEffect, useRef, useState} from 'react';
import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';
import {Carousel, type CarouselHandle} from '@astryxdesign/core/Carousel';
import {Collapsible, CollapsibleGroup} from '@astryxdesign/core/Collapsible';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Link} from '@astryxdesign/core/Link';
import {Section as AstryxSection} from '@astryxdesign/core/Section';
import {Text} from '@astryxdesign/core/Text';
import {TopNav, TopNavItem} from '@astryxdesign/core/TopNav';
import {VStack} from '@astryxdesign/core/VStack';
import {Theme} from '@astryxdesign/core/theme';
import {syntroficTheme} from './theme/syntrofic.js';
import {sections, site, type Entry, type Section} from './content';
import {Interior} from './Interior';
import {ResearchFigure} from './ResearchFigure';
import {SiteSearch} from './SiteSearch';
import {entryPath, sectionPath, type Page} from './routes';

type SectionEntry = {section: Section; entry: Entry};

function Brand({footer = false}: {footer?: boolean}) {
  return (
    <Link href="/" className={footer ? 'brand-link footer-wordmark' : 'brand-link header-mark'} label={`${site.name}首页`} hasUnderline={false}>
      {footer ? <img src="/brand/wordmark-footer.svg" width="185" height="49" alt="" /> : <span aria-hidden="true" />}
    </Link>
  );
}

function Header({page}: {page: Page}) {
  const [scrolled, setScrolled] = useState(false);
  const isHome = page.kind === 'home';
  const activeSection = page.kind === 'section' || page.kind === 'entry' ? page.section.slug : undefined;
  const about = <Button label="关于我们" href="/about/" size="sm" variant="primary" aria-current={page.kind === 'about' ? 'page' : undefined} />;

  useEffect(() => {
    if (!isHome) return;
    const updateHeader = () => setScrolled(window.scrollY > 8);
    updateHeader();
    window.addEventListener('scroll', updateHeader, {passive: true});
    return () => window.removeEventListener('scroll', updateHeader);
  }, [isHome]);

  return (
    <header className="site-header" data-hero={isHome && !scrolled ? 'true' : undefined}>
      <div className="header-shell">
        <TopNav
          label="主导航"
          className="desktop-nav"
          startContent={<Brand />}
          centerContent={sections.map(section => (
            <TopNavItem
              key={section.slug}
              label={section.title}
              href={sectionPath(section.slug)}
              size="sm"
              isSelected={activeSection === section.slug}
              className="nav-item"
            />
          ))}
          endContent={<HStack gap={2} vAlign="center"><SiteSearch />{about}</HStack>}
        />
        <TopNav
          label="主导航"
          className="mobile-nav"
          heading={<Brand />}
          endContent={
            <HStack gap={2} vAlign="center">
              <SiteSearch />
              {about}
              <DropdownMenu
                items={sections.map(section => ({id: section.slug, label: section.title, href: sectionPath(section.slug)}))}
                renderTrigger={props => <IconButton {...props} label="打开网站导航" icon={<Icon icon="menu" />} size="sm" variant="ghost" />}
              />
            </HStack>
          }
        />
      </div>
    </header>
  );
}

function HomeHero() {
  const [opening, ...emphasis] = site.headline.split('\n');

  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="shell">
        <VStack gap={4} hAlign="center" className="home-hero-content">
          <span className="hero-wordmark" aria-hidden="true" />
          <Heading id="home-title" level={1} type="display-1" weight="normal" justify="center" textWrap="balance" className="mission">
            {opening}
            {emphasis.length > 0 && <strong>{'\n' + emphasis.join('\n')}</strong>}
          </Heading>
          <Text as="p" type="large" weight="normal" color="secondary" justify="center" textWrap="balance" className="mission-summary">
            {site.intro}
          </Text>
          <HStack gap={3} className="hero-actions">
            <Button href="#work" label="探索我们的工作" size="lg" variant="primary" width="100%" />
            <Button href="/blog/" label="阅读 Blog" size="lg" variant="secondary" width="100%" />
          </HStack>
        </VStack>
      </div>
      <ul className="hero-previews" role="list" aria-label="主要栏目">
        {sections.map(section => {
          const showCover = section.slug === 'public-interest' || section.slug === 'open-source';
          return (
            <li key={section.slug} data-section={section.slug}>
              <ClickableCard
                label={section.title}
                href={sectionPath(section.slug)}
                padding={3}
                elevation="low"
                className="hero-preview"
              >
                <VStack gap={2} className="hero-preview-content">
                  <Text type="body" weight="semibold">{section.title}</Text>
                  {section.entries[0] && <Text as="p" type="supporting" color="secondary">{section.entries[0].title}</Text>}
                  {showCover && section.cover && (
                    <AspectRatio ratio={5 / 4} fit="contain" className="hero-preview-media" data-section={section.slug}>
                      <img {...section.cover} />
                    </AspectRatio>
                  )}
                </VStack>
              </ClickableCard>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-layout">
          <div className="footer-brand"><Brand footer /></div>
          <nav aria-label="页脚导航" className="footer-links">
            <CollapsibleGroup type="multiple">
              {sections.map(section => (
                <Collapsible key={section.slug} trigger={section.title} value={section.slug}>
                  <VStack gap={3} hAlign="start" className="footer-subnav">
                    <Link href={sectionPath(section.slug)} color="primary">浏览{section.title === 'Blog' ? '文章' : section.title}</Link>
                    {section.entries.map(entry => (
                      <Link key={entry.slug} href={entryPath(section.slug, entry.slug)} color="secondary">{entry.title}</Link>
                    ))}
                  </VStack>
                </Collapsible>
              ))}
            </CollapsibleGroup>
          </nav>
          <VStack gap={3} hAlign="start" className="footer-mission">
            <Heading level={2} className="band-title">我们的方向</Heading>
            <Text as="p" color="secondary">{site.intro}</Text>
            <Link href="/about/" color="primary">关于我们</Link>
          </VStack>
          <Text as="p" type="label" color="secondary" className="footer-legal">{site.companyName}</Text>
        </div>
      </div>
    </footer>
  );
}

function FeatureBanner({section, entry}: SectionEntry) {
  return (
    <AstryxSection variant="transparent" padding={0} className="feature-banner" role="region" aria-labelledby="featured-title">
      <div className="feature-layout">
        <VStack gap={4} hAlign="start" className="feature-copy">
          <Link href={sectionPath(section.slug)} type="label" color="secondary" weight="semibold">
            {section.title}
          </Link>
          <Heading id="featured-title" level={2} type="display-1" weight="semibold" textWrap="balance" className="feature-title">
            {entry.title}
          </Heading>
          <Text as="p" type="large" weight="normal" color="secondary" textWrap="balance" className="feature-description">{entry.summary}</Text>
          <Button href={entryPath(section.slug, entry.slug)} label="阅读详情" size="md" variant="primary" />
        </VStack>
        <div className="feature-artwork"><ResearchFigure /></div>
      </div>
    </AstryxSection>
  );
}

function UpdateCard({section, entry}: SectionEntry) {
  const href = entryPath(section.slug, entry.slug);
  return (
    <Card variant="transparent" padding={0} elevation="none" className="update-card">
      {entry.cover && (
        <AspectRatio ratio={16 / 9} fit="contain" className="update-cover">
          <img {...entry.cover} loading="lazy" />
        </AspectRatio>
      )}
      <VStack gap={3} hAlign="start" className="update-copy">
        {entry.date && (
          <Text type="label" color="secondary" hasTabularNumbers>
            <time dateTime={entry.date}>{entry.date.replaceAll('-', '.')}</time>
          </Text>
        )}
        <Heading level={3} className="update-title">
          <Link href={href} type="inherit" color="primary" hasUnderline={false}>{entry.title}</Link>
        </Heading>
        <Text as="p" color="secondary">{entry.summary}</Text>
      </VStack>
    </Card>
  );
}

function Explore() {
  const carousel = useRef<CarouselHandle>(null);

  return (
    <AstryxSection id="work" variant="transparent" padding={0} role="region" aria-labelledby="work-title">
      <VStack gap={5} className="explore">
        <Heading id="work-title" level={2} type="display-2" className="band-title">了解更多</Heading>
        <Carousel aria-label="探索我们的工作" handleRef={carousel} gap={4} hasSnap hasLoop hasButtons={false} hasEdgeFade={false}>
          {sections.map(section => (
            <VStack key={section.slug} gap={4} hAlign="start" as="article" className="explore-item">
              {section.cover && (
                <AspectRatio ratio={5 / 4} fit="contain" className="explore-media" data-section={section.slug}>
                  <img {...section.cover} loading="lazy" />
                </AspectRatio>
              )}
              <Heading level={3} className="explore-title">
                <Link href={sectionPath(section.slug)} color="primary" hasUnderline={false}>{section.title}</Link>
              </Heading>
              <Text as="p" color="secondary">{section.description}</Text>
            </VStack>
          ))}
        </Carousel>
        <HStack gap={2} hAlign="end" className="explore-controls">
          <IconButton icon={<Icon icon="chevronLeft" />} label="上一个栏目" variant="ghost" onClick={() => carousel.current?.scrollPrev()} />
          <IconButton icon={<Icon icon="chevronRight" />} label="下一个栏目" variant="ghost" onClick={() => carousel.current?.scrollNext()} />
        </HStack>
      </VStack>
    </AstryxSection>
  );
}

function Home() {
  const featuredSection = sections.find(section => section.slug === site.featured.section);
  const featuredEntry = featuredSection?.entries.find(entry => entry.slug === site.featured.entry);
  const blog = sections.find(section => section.slug === 'blog');
  const updates = blog
    ? [...blog.entries].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 3)
    : [];

  return (
    <>
      <HomeHero />
      <div className="home-body">
        <div className="shell home-layout">
          {featuredSection && featuredEntry && <FeatureBanner section={featuredSection} entry={featuredEntry} />}

          {blog && updates.length > 0 && (
            <AstryxSection padding={0} variant="transparent" role="region" aria-labelledby="updates-title">
              <VStack gap={6}>
                <HStack hAlign="between" vAlign="center" gap={3}>
                  <Heading id="updates-title" level={2} type="display-2" className="band-title">近期动态</Heading>
                  <Button href={sectionPath(blog.slug)} label="全部文章" size="sm" variant="secondary" />
                </HStack>
                <ul className="updates-grid" role="list">
                  {updates.map(entry => (
                    <li key={entry.slug}><UpdateCard section={blog} entry={entry} /></li>
                  ))}
                </ul>
              </VStack>
            </AstryxSection>
          )}

          <Explore />
        </div>
      </div>
    </>
  );
}

export function App({page}: {page: Page}) {
  return (
    <Theme theme={syntroficTheme} mode="light">
      <div className="site">
        <Link className="skip-link" href="#content" color="primary">跳到正文</Link>
        <Header page={page} />
        <main id="content" tabIndex={-1}>
          {page.kind === 'home' && <Home />}
          {page.kind !== 'home' && page.kind !== 'missing' && <Interior page={page} />}
          {page.kind === 'missing' && (
            <div className="shell missing-page">
              <AstryxSection variant="transparent" padding={0} className="missing-panel">
                <VStack gap={4} hAlign="start">
                  <Heading level={1} type="display-2">页面未找到</Heading>
                  <Text as="p" type="large" color="secondary">请从首页浏览网站内容。</Text>
                  <Button href="/" label="返回首页" variant="primary" />
                </VStack>
              </AstryxSection>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </Theme>
  );
}
