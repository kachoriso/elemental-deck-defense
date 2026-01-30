import { defineConfig } from 'vite';

// GitHub Pages は https://<user>.github.io/<repo>/ で配信されるため base を設定
const repoName = 'elemental-deck-defense';

export default defineConfig(({ mode }) => {
  // 本番ビルド時のみ base を付与（vite build は mode === 'production'）
  const base = mode === 'production' ? `/${repoName}/` : '/';
  return {
    base,
    build: {
      outDir: 'dist',
    },
  };
});
