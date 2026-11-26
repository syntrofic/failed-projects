import {defineConfig} from 'vite';

export default defineConfig(({isPreview}) => ({
  // Development resolves routes in React; the production preview serves generated pages.
  appType: isPreview ? 'mpa' : 'spa',
  oxc: {jsx: {runtime: 'automatic'}},
  css: {lightningcss: {exclude: 4}},
  build: {
    target: 'es2022',
    rolldownOptions: {
      onLog(level, log, handler) {
        const file = log.id ?? log.loc?.file ?? '';
        // React Server Component directives in dependencies are unused in this static site.
        if (log.code === 'MODULE_LEVEL_DIRECTIVE' && file.includes('node_modules/')) return;
        handler(level, log);
      },
      output: {
        codeSplitting: {
          groups: [{name: 'react', test: /[\\/]node_modules[\\/](?:react|react-dom|scheduler)[\\/]/}],
        },
      },
    },
  },
}));
