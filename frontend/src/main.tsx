import {createRoot, hydrateRoot} from 'react-dom/client';
import '@astryxdesign/theme-neutral/fonts.css';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './theme/syntrofic.css';
import './site.css';
import './interior.css';
import './research-figure.css';
import {App} from './App';
import {findPage, pageMetadata} from './routes';

const page = findPage(window.location.pathname);
const root = document.getElementById('root');

if (!root) {
  throw new Error('Missing React mount element');
}

if (root.dataset.pagePath === page.path) {
  hydrateRoot(root, <App page={page} />);
} else {
  const {title, description} = pageMetadata(page);
  document.title = title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  createRoot(root).render(<App page={page} />);
}
