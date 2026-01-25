import { Game } from './Game';

/**
 * アプリケーションのエントリーポイント
 */
const initGame = (): void => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  
  if (!canvas) {
    console.error('Canvas要素が見つかりません');
    return;
  }

  // ゲームインスタンスを作成
  const game = new Game(canvas);
  
  // デバッグ用にグローバルに公開
  (window as unknown as { game: Game }).game = game;

  console.log('🎮 Elemental Deck Defense が起動しました');
};

// DOMContentLoaded後にゲームを初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
