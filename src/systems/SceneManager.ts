import { SceneType } from '../types';

/**
 * シーン管理クラス
 * アプリケーション全体のシーン切り替えとDOM表示制御を管理
 */
export class SceneManager {
  private currentScene: SceneType;
  private sceneContainers: Map<SceneType, HTMLElement>;
  private canvas: HTMLCanvasElement;
  private uiLayer: HTMLElement;
  
  // シーン変更時のコールバック
  private onSceneChange: ((scene: SceneType) => void) | null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.currentScene = 'title';
    this.sceneContainers = new Map();
    this.onSceneChange = null;

    // UIレイヤーを取得または作成
    this.uiLayer = document.getElementById('ui-layer') as HTMLElement;
    if (!this.uiLayer) {
      throw new Error('UI Layer element not found');
    }

    // 各シーンのコンテナを登録
    this.registerSceneContainer('title', 'scene-title');
    this.registerSceneContainer('game', 'scene-game');
    this.registerSceneContainer('grimoire', 'scene-grimoire');
    this.registerSceneContainer('upgrades', 'scene-upgrades');
    this.registerSceneContainer('settings', 'scene-settings');
    this.registerSceneContainer('archives', 'scene-archives');

    // 初期シーン（タイトル）を表示
    this.initializeScene();
  }

  /**
   * 初期シーンを設定（起動時にタイトル画面を表示）
   */
  private initializeScene(): void {
    // 全シーンを非表示にする
    this.sceneContainers.forEach((container) => {
      container.style.display = 'none';
      container.classList.remove('active');
    });

    // タイトルシーンを表示
    const titleContainer = this.sceneContainers.get('title');
    if (titleContainer) {
      titleContainer.style.display = 'flex';
      titleContainer.classList.add('active');
    }

    // Canvasの表示状態を設定
    this.updateCanvasVisibility('title');
  }

  /**
   * シーンコンテナを登録
   */
  private registerSceneContainer(scene: SceneType, elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      this.sceneContainers.set(scene, element);
    }
  }

  /**
   * シーン変更コールバックを設定
   */
  setOnSceneChange(callback: (scene: SceneType) => void): void {
    this.onSceneChange = callback;
  }

  /**
   * 現在のシーンを取得
   */
  getCurrentScene(): SceneType {
    return this.currentScene;
  }

  /**
   * シーンを変更
   */
  changeScene(newScene: SceneType): void {
    if (this.currentScene === newScene) return;

    const oldScene = this.currentScene;
    this.currentScene = newScene;

    // DOM表示を切り替え
    this.updateSceneVisibility(oldScene, newScene);

    // Canvas表示を制御
    this.updateCanvasVisibility(newScene);

    // コールバックを呼び出し
    if (this.onSceneChange) {
      this.onSceneChange(newScene);
    }
  }

  /**
   * シーンコンテナの表示/非表示を更新
   */
  private updateSceneVisibility(oldScene: SceneType, newScene: SceneType): void {
    // 旧シーンを非表示
    const oldContainer = this.sceneContainers.get(oldScene);
    if (oldContainer) {
      oldContainer.classList.remove('active');
      oldContainer.style.display = 'none';
    }

    // 新シーンを表示
    const newContainer = this.sceneContainers.get(newScene);
    if (newContainer) {
      newContainer.style.display = 'flex';
      // アニメーション用に少し遅らせてactiveクラスを追加
      requestAnimationFrame(() => {
        newContainer.classList.add('active');
      });
    }
  }

  /**
   * Canvasの表示状態を更新
   */
  private updateCanvasVisibility(scene: SceneType): void {
    // ゲームシーンとタイトルシーンではCanvasを表示
    const showCanvas = scene === 'game' || scene === 'title';
    this.canvas.style.display = showCanvas ? 'block' : 'none';
    
    // タイトルシーンではCanvasを暗くする
    if (scene === 'title') {
      this.canvas.style.opacity = '0.3';
    } else {
      this.canvas.style.opacity = '1';
    }
  }

  /**
   * ゲームシーンかどうか
   */
  isGameScene(): boolean {
    return this.currentScene === 'game';
  }

  /**
   * タイトルシーンかどうか
   */
  isTitleScene(): boolean {
    return this.currentScene === 'title';
  }

  /**
   * メニューシーンかどうか（図鑑、アップグレード、設定、戦歴）
   */
  isMenuScene(): boolean {
    return ['grimoire', 'upgrades', 'settings', 'archives'].includes(this.currentScene);
  }

  /**
   * 戦歴シーンかどうか
   */
  isArchivesScene(): boolean {
    return this.currentScene === 'archives';
  }
}
