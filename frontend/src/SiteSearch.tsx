import {useEffect, useId, useRef, useState} from 'react';
import {CommandPalette, CommandPaletteInput, useCommandPaletteContext} from '@astryxdesign/core/CommandPalette';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Text} from '@astryxdesign/core/Text';
import type {SearchSource} from '@astryxdesign/core/Typeahead/utils';
import {VStack} from '@astryxdesign/core/VStack';
import {InternationalizationProvider} from '@astryxdesign/core/i18n';
import zhCN from '@astryxdesign/core/locales/zh-CN.generated.js';
import {site} from './content';
import {pages} from './routes';

type Result = {
  id: string;
  label: string;
  summary: string;
  auxiliaryData: {group: string};
};

const searchablePages = pages.flatMap<Result>(page => {
  const id = page.path;
  switch (page.kind) {
    case 'about':
      return [{id, label: '关于我们', summary: site.about[0] ?? site.description, auxiliaryData: {group: '站点信息'}}];
    case 'section':
      return [{id, label: page.section.title, summary: page.section.description, auxiliaryData: {group: '栏目'}}];
    case 'entry':
      return [{id, label: page.entry.title, summary: page.entry.summary, auxiliaryData: {group: page.section.title}}];
    default:
      return [];
  }
});

const searchSource: SearchSource<Result> = {
  bootstrap: () => [],
  search(query) {
    const keywords = query.normalize('NFKC').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (keywords.length === 0) return [];
    return searchablePages.filter(({label, summary}) => {
      const text = `${label} ${summary}`.normalize('NFKC').toLowerCase();
      return keywords.every(keyword => text.includes(keyword));
    });
  },
};

const searchMessages = {'zh-CN': zhCN};
const searchOverrides = {'zh-CN': {'@astryx.commandPalette.list.label': '搜索结果'}};

function SearchInput() {
  const palette = useCommandPaletteContext();
  return (
    <CommandPaletteInput
      label="搜索关键词"
      placeholder="搜索栏目和文章"
      endContent={<IconButton label="关闭搜索" icon={<Icon icon="close" />} size="sm" variant="ghost" onClick={palette?.onClose} />}
    />
  );
}

export function SiteSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.shiftKey ||
        !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;

      const trigger = triggerRef.current;
      // The header renders desktop and mobile navigation in separate subtrees.
      if (!trigger?.getClientRects().length) return;

      const modal = document.querySelector('dialog:modal');
      if (modal && !modal.classList.contains('site-search-dialog')) return;
      event.preventDefault();
      if (!modal && !event.repeat) trigger.click();
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  return (
    <InternationalizationProvider locale="zh-CN" messages={searchMessages} overrides={searchOverrides}>
      <IconButton
        ref={triggerRef}
        className="site-search-trigger"
        label="搜索网站"
        tooltip="搜索网站（Ctrl 或 ⌘ + K）"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? dialogId : undefined}
        aria-keyshortcuts="Control+K Meta+K"
        icon={<Icon icon="search" />}
        size="md"
        variant="ghost"
        onClick={() => {
          triggerRef.current?.focus({preventScroll: true});
          setIsOpen(true);
        }}
      />
      <CommandPalette
        id={dialogId}
        className="site-search-dialog"
        label="搜索网站"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        width={560}
        searchSource={searchSource}
        input={<SearchInput />}
        emptyBootstrapText="输入关键词开始搜索。"
        emptySearchText="没有找到匹配的内容。"
        onValueChange={path => window.location.assign(path)}
        renderItem={({label, summary}) => (
          <VStack gap={1}>
            <Text weight="semibold">{label}</Text>
            <Text as="p" color="secondary" type="supporting">{summary}</Text>
          </VStack>
        )}
      />
    </InternationalizationProvider>
  );
}
