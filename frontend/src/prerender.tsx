import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {renderToString} from 'react-dom/server';
import {App} from './App';
import {pageMetadata, pages} from './routes';

const dist = resolve(import.meta.dirname, '../dist');
const template = await readFile(join(dist, 'index.html'), 'utf8');

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

const paths = new Set<string>();
for (const page of pages) {
  if (paths.has(page.path) || (page.kind !== 'missing' && !/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/){0,2}$/.test(page.path))) {
    throw new Error(`Duplicate or invalid page path: ${page.path}`);
  }
  paths.add(page.path);

  const {title, description} = pageMetadata(page);
  const html = template
    .replace(/<title>.*?<\/title>/, () => `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, () => `<meta name="description" content="${escapeHtml(description)}">`)
    .replace('<div id="root"></div>', () => `<div id="root" data-page-path="${page.path}">${renderToString(<App page={page} />)}</div>`);

  const destination = join(dist, page.path, page.kind === 'missing' ? '' : 'index.html');
  await mkdir(dirname(destination), {recursive: true});
  await writeFile(destination, html);
}

console.log(`Prerendered ${paths.size} pages to frontend/dist`);
