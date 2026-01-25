import { GAME_CONFIG, StarterDeckType, MapType } from '../types';
import { ProgressManager } from './ProgressManager';

/**
 * タイトル画面クラス
 * DOM UIとCanvas背景アニメーションを管理
 */
export class TitleScreen {
  private progressManager: ProgressManager;
  private ctx: CanvasRenderingContext2D;
  private isVisible: boolean;
  
  // コールバック
  private onStartGame: ((starterDeck: StarterDeckType, map: MapType) => void) | null;
  private onOpenGrimoire: (() => void) | null;
  private onOpenUpgrades: (() => void) | null;
  private onOpenArchives: (() => void) | null;
  private onOpenSettings: (() => void) | null;
  
  // 背景パーティクル
  private particles: TitleParticle[];
  private animationId: number | null;

  constructor(progressManager: ProgressManager, canvas: HTMLCanvasElement) {
    this.progressManager = progressManager;
    this.ctx = canvas.getContext('2d')!;
    this.isVisible = true;
    this.particles = [];
    this.animationId = null;
    
    this.onStartGame = null;
    this.onOpenGrimoire = null;
    this.onOpenUpgrades = null;
    this.onOpenArchives = null;
    this.onOpenSettings = null;
    
    // パーティクルを初期化
    this.initParticles();
    
    // DOM要素にイベントリスナーを設定
    this.setupDOMListeners();
  }

  /**
   * DOM要素のイベントリスナーを設定
   */
  private setupDOMListeners(): void {
    // New Game
    const btnNewGame = document.getElementById('btn-new-game');
    if (btnNewGame) {
      btnNewGame.addEventListener('click', () => {
        if (this.onStartGame) {
          this.onStartGame('balanced', 'fortress');
        }
      });
    }

    // Grimoire
    const btnGrimoire = document.getElementById('btn-grimoire');
    if (btnGrimoire) {
      btnGrimoire.addEventListener('click', () => {
        if (this.onOpenGrimoire) {
          this.onOpenGrimoire();
        }
      });
    }

    // Upgrades
    const btnUpgrades = document.getElementById('btn-upgrades');
    if (btnUpgrades) {
      btnUpgrades.addEventListener('click', () => {
        if (this.onOpenUpgrades) {
          this.onOpenUpgrades();
        }
      });
    }

    // Archives
    const btnArchives = document.getElementById('btn-archives');
    if (btnArchives) {
      btnArchives.addEventListener('click', () => {
        if (this.onOpenArchives) {
          this.onOpenArchives();
        }
      });
    }

    // Settings
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        if (this.onOpenSettings) {
          this.onOpenSettings();
        }
      });
    }
  }

  /**
   * パーティクルを初期化
   */
  private initParticles(): void {
    this.particles = [];
    const numParticles = 50;
    
    for (let i = 0; i < numParticles; i++) {
      this.particles.push(this.createParticle());
    }
  }

  /**
   * パーティクルを作成
   */
  private createParticle(): TitleParticle {
    const elements = ['🔥', '❄️', '⚡', '✨', '💫'];
    return {
      x: Math.random() * GAME_CONFIG.CANVAS_WIDTH,
      y: Math.random() * GAME_CONFIG.CANVAS_HEIGHT,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5 - 0.3,
      size: Math.random() * 16 + 10,
      alpha: Math.random() * 0.5 + 0.3,
      element: elements[Math.floor(Math.random() * elements.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
    };
  }

  /**
   * コールバックを設定
   */
  setOnStartGame(callback: (starterDeck: StarterDeckType, map: MapType) => void): void {
    this.onStartGame = callback;
  }

  setOnOpenGrimoire(callback: () => void): void {
    this.onOpenGrimoire = callback;
  }

  setOnOpenUpgrades(callback: () => void): void {
    this.onOpenUpgrades = callback;
  }

  setOnOpenArchives(callback: () => void): void {
    this.onOpenArchives = callback;
  }

  setOnOpenSettings(callback: () => void): void {
    this.onOpenSettings = callback;
  }

  /**
   * タイトル画面を表示
   */
  show(): void {
    this.isVisible = true;
    this.updateDOMUI();
    this.startAnimation();
  }

  /**
   * タイトル画面を非表示
   */
  hide(): void {
    this.isVisible = false;
    this.stopAnimation();
  }

  /**
   * 表示中かどうか
   */
  isShowing(): boolean {
    return this.isVisible;
  }

  /**
   * DOM UIを更新
   */
  private updateDOMUI(): void {
    // ランク情報を更新
    const rankConfig = this.progressManager.getRankConfig();
    const xpInfo = this.progressManager.getXPToNextRank();

    const titleRank = document.getElementById('title-rank');
    if (titleRank) {
      titleRank.textContent = `Rank ${rankConfig.rank}: ${rankConfig.name}`;
    }

    const titleXpFill = document.getElementById('title-xp-fill') as HTMLElement;
    if (titleXpFill) {
      titleXpFill.style.width = `${xpInfo.progress * 100}%`;
    }

    const titleXpText = document.getElementById('title-xp-text');
    if (titleXpText) {
      if (this.progressManager.getRank() >= 10) {
        titleXpText.textContent = 'MAX RANK';
      } else {
        titleXpText.textContent = `${xpInfo.current} / ${xpInfo.required} XP`;
      }
    }

    // 統計を更新
    const titleGames = document.getElementById('title-games');
    if (titleGames) {
      titleGames.textContent = String(this.progressManager.getTotalGamesPlayed());
    }

    const titleHighest = document.getElementById('title-highest');
    if (titleHighest) {
      titleHighest.textContent = String(this.progressManager.getHighestWave());
    }
  }

  /**
   * アニメーションを開始
   */
  private startAnimation(): void {
    if (this.animationId !== null) return;
    
    const animate = () => {
      if (!this.isVisible) return;
      
      this.updateParticles();
      this.drawBackground();
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * アニメーションを停止
   */
  private stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * パーティクルを更新
   */
  private updateParticles(): void {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      // 画面外に出たら反対側から
      if (p.y < -20) p.y = GAME_CONFIG.CANVAS_HEIGHT + 20;
      if (p.y > GAME_CONFIG.CANVAS_HEIGHT + 20) p.y = -20;
      if (p.x < -20) p.x = GAME_CONFIG.CANVAS_WIDTH + 20;
      if (p.x > GAME_CONFIG.CANVAS_WIDTH + 20) p.x = -20;
    }
  }

  /**
   * 背景を描画
   */
  private drawBackground(): void {
    const { CANVAS_WIDTH, CANVAS_HEIGHT } = GAME_CONFIG;

    // 暗い背景
    this.ctx.fillStyle = '#0a0a12';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 中央からの放射状グラデーション
    const gradient = this.ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 400
    );
    gradient.addColorStop(0, 'rgba(74, 144, 217, 0.15)');
    gradient.addColorStop(0.5, 'rgba(74, 144, 217, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // グリッド線（うっすら）
    this.ctx.strokeStyle = 'rgba(74, 144, 217, 0.1)';
    this.ctx.lineWidth = 1;
    const gridSize = GAME_CONFIG.GRID_SIZE;
    
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, CANVAS_HEIGHT);
      this.ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(CANVAS_WIDTH, y);
      this.ctx.stroke();
    }

    // パーティクルを描画
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.font = `${p.size}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(p.element, 0, 0);
      this.ctx.restore();
    }

    // 中央の城アイコン（ゆっくり脈動）
    const pulseScale = 1 + Math.sin(Date.now() / 1000) * 0.05;
    this.ctx.save();
    this.ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    this.ctx.scale(pulseScale, pulseScale);
    this.ctx.font = '80px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.globalAlpha = 0.2;
    this.ctx.fillText('🏰', 0, 0);
    this.ctx.restore();
  }
}

/**
 * タイトル画面のパーティクル
 */
interface TitleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  element: string;
  rotation: number;
  rotationSpeed: number;
}
