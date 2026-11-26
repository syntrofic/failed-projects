import {sections, site, type Entry, type Section, type SectionSlug} from './content';

export type Page =
  | {kind: 'home'; path: '/'}
  | {kind: 'about'; path: '/about/'}
  | {kind: 'section'; path: string; section: Section}
  | {kind: 'entry'; path: string; section: Section; entry: Entry}
  | {kind: 'missing'; path: '/404.html'};

export function sectionPath(slug: SectionSlug) {
  return `/${slug}/`;
}

export function entryPath(section: SectionSlug, entry: string) {
  return `${sectionPath(section)}${entry}/`;
}

const missingPage: Page = {kind: 'missing', path: '/404.html'};

export const pages: readonly Page[] = [
  {kind: 'home', path: '/'},
  ...sections.flatMap<Extract<Page, {kind: 'section' | 'entry'}>>(section => [
    {kind: 'section', path: sectionPath(section.slug), section},
    ...section.entries.map(entry => ({
      kind: 'entry' as const, path: entryPath(section.slug, entry.slug), section, entry,
    })),
  ]),
  {kind: 'about', path: '/about/'},
  missingPage,
];

export function findPage(pathname: string): Page {
  const directory = pathname.replace(/\/index\.html$/, '/');
  const path = directory.endsWith('/') || directory === missingPage.path ? directory : `${directory}/`;
  return pages.find(page => page.path === path) ?? missingPage;
}

export function pageMetadata(page: Page): {title: string; description: string} {
  switch (page.kind) {
    case 'home':
      return {title: site.name, description: site.description};
    case 'about':
      return {title: `关于 · ${site.name}`, description: site.description};
    case 'section':
      return {title: `${page.section.title} · ${site.name}`, description: page.section.description};
    case 'entry':
      return {title: `${page.entry.title} · ${site.name}`, description: page.entry.summary};
    case 'missing':
      return {title: `页面未找到 · ${site.name}`, description: '访问的页面不存在。'};
  }
}
