import { defineConfig } from 'vite';

// GitHub Pages は https://<user>.github.io/<repo>/ で配信されるため base を設定
const repoName = 'elemental-deck-defense';
const base = process.env.NODE_ENV === 'production' ? `/${repoName}/` : '/';

export default defineConfig({
  base,
  build: {
    outDir: 'dist',
  },
});
