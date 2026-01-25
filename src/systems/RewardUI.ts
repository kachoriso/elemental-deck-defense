import { Reward, RARITY_CONFIGS, GAME_CONFIG } from '../types';

/**
 * 報酬カードのレイアウト
 */
interface RewardCardLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  reward: Reward;
  isHovered: boolean;
  isSelected: boolean;
}

/**
 * 報酬選択UI
 * ウェーブクリア後に表示される報酬選択画面
 */
export class RewardUI {
  private rewards: Reward[];
  private cardLayouts: RewardCardLayout[];
  private hoveredIndex: number;
  private selectedIndex: number;
  private isVisible: boolean;
  
  // コールバック
  private onRewardSelected: ((reward: Reward) => void) | null;
  
  // アニメーション
  private animationProgress: number;
  private animationStartTime: number;
  
  // レイアウト設定
  private readonly CARD_WIDTH = 150;
  private readonly CARD_HEIGHT = 220;
  private readonly CARD_GAP = 20;
  private readonly ANIMATION_DURATION = 500;

  constructor() {
    this.rewards = [];
    this.cardLayouts = [];
    this.hoveredIndex = -1;
    this.selectedIndex = -1;
    this.isVisible = false;
    this.onRewardSelected = null;
    this.animationProgress = 0;
    this.animationStartTime = 0;
  }

  /**
   * 報酬選択画面を表示
   */
  show(rewards: Reward[]): void {
    this.rewards = rewards;
    this.isVisible = true;
    this.hoveredIndex = -1;
    this.selectedIndex = -1;
    this.animationStartTime = Date.now();
    this.animationProgress = 0;
    
    this.calculateCardLayouts();
  }

  /**
   * 報酬選択画面を非表示
   */
  hide(): void {
    this.isVisible = false;
    this.rewards = [];
    this.cardLayouts = [];
  }

  /**
   * 表示中かどうか
   */
  isShowing(): boolean {
    return this.isVisible;
  }

  /**
   * 選択コールバックを設定
   */
  setOnRewardSelected(callback: (reward: Reward) => void): void {
    this.onRewardSelected = callback;
  }

  /**
   * カードレイアウトを計算
   */
  private calculateCardLayouts(): void {
    this.cardLayouts = [];
    
    const totalWidth = this.rewards.length * this.CARD_WIDTH + 
      (this.rewards.length - 1) * this.CARD_GAP;
    const startX = (GAME_CONFIG.CANVAS_WIDTH - totalWidth) / 2;
    const y = (GAME_CONFIG.CANVAS_HEIGHT - this.CARD_HEIGHT) / 2;
    
    for (let i = 0; i < this.rewards.length; i++) {
      this.cardLayouts.push({
        x: startX + i * (this.CARD_WIDTH + this.CARD_GAP),
        y,
        width: this.CARD_WIDTH,
        height: this.CARD_HEIGHT,
        reward: this.rewards[i],
        isHovered: false,
        isSelected: false,
      });
    }
  }

  /**
   * マウス移動を処理
   */
  handleMouseMove(mouseX: number, mouseY: number): void {
    if (!this.isVisible) return;

    this.hoveredIndex = -1;
    
    for (let i = 0; i < this.cardLayouts.length; i++) {
      const layout = this.cardLayouts[i];
      layout.isHovered = this.isPointInCard(mouseX, mouseY, layout);
      if (layout.isHovered) {
        this.hoveredIndex = i;
      }
    }
  }

  /**
   * クリックを処理
   */
  handleClick(mouseX: number, mouseY: number): boolean {
    if (!this.isVisible) return false;

    for (let i = 0; i < this.cardLayouts.length; i++) {
      const layout = this.cardLayouts[i];
      if (this.isPointInCard(mouseX, mouseY, layout)) {
        this.selectedIndex = i;
        layout.isSelected = true;
        
        // コールバック呼び出し
        if (this.onRewardSelected) {
          this.onRewardSelected(layout.reward);
        }
        
        return true;
      }
    }
    
    return false;
  }

  /**
   * 点がカード内にあるかチェック
   */
  private isPointInCard(x: number, y: number, layout: RewardCardLayout): boolean {
    return (
      x >= layout.x &&
      x <= layout.x + layout.width &&
      y >= layout.y &&
      y <= layout.y + layout.height
    );
  }

  /**
   * アニメーションを更新
   */
  update(): void {
    if (!this.isVisible) return;

    const elapsed = Date.now() - this.animationStartTime;
    this.animationProgress = Math.min(1, elapsed / this.ANIMATION_DURATION);
  }

  /**
   * 報酬選択画面を描画
   */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isVisible) return;

    this.update();

    // 半透明の黒背景
    ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * this.animationProgress})`;
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    // タイトル
    const titleAlpha = Math.min(1, this.animationProgress * 2);
    ctx.globalAlpha = titleAlpha;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('🎁 報酬を選択 🎁', GAME_CONFIG.CANVAS_WIDTH / 2, 50);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('カードをクリックして選択', GAME_CONFIG.CANVAS_WIDTH / 2, 80);
    ctx.globalAlpha = 1;

    // 報酬カードを描画
    for (let i = 0; i < this.cardLayouts.length; i++) {
      const layout = this.cardLayouts[i];
      
      // カードごとにアニメーション遅延
      const cardDelay = i * 0.1;
      const cardProgress = Math.max(0, Math.min(1, (this.animationProgress - cardDelay) * 2));
      
      this.drawRewardCard(ctx, layout, cardProgress);
    }
  }

  /**
   * 報酬カードを描画
   */
  private drawRewardCard(
    ctx: CanvasRenderingContext2D,
    layout: RewardCardLayout,
    progress: number
  ): void {
    const { x, y, width, height, reward, isHovered, isSelected } = layout;
    const rarityConfig = RARITY_CONFIGS[reward.rarity];

    // アニメーション（下から出てくる）
    const animY = y + (1 - progress) * 100;
    ctx.globalAlpha = progress;

    // ホバー時のスケールと影
    const scale = isHovered ? 1.05 : 1;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    const scaledX = x - (scaledWidth - width) / 2;
    const scaledY = animY - (scaledHeight - height) / 2;

    ctx.save();

    // 影
    if (isHovered) {
      ctx.shadowColor = rarityConfig.color;
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 5;
    }

    // カード背景
    ctx.fillStyle = isSelected ? '#2a4a2a' : '#1a1a2e';
    ctx.strokeStyle = isHovered ? '#fff' : rarityConfig.color;
    ctx.lineWidth = isHovered ? 4 : 2;
    
    // 角丸の矩形
    this.drawRoundedRect(ctx, scaledX, scaledY, scaledWidth, scaledHeight, 12);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // レアリティバッジ
    this.drawRarityBadge(ctx, scaledX, scaledY, scaledWidth, rarityConfig);

    // アイコン
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(reward.icon, scaledX + scaledWidth / 2, scaledY + 55);

    // 名前
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = rarityConfig.color;
    ctx.fillText(reward.name, scaledX + scaledWidth / 2, scaledY + 100);

    // タイプラベル
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#888';
    const typeLabel = this.getTypeLabel(reward.type);
    ctx.fillText(typeLabel, scaledX + scaledWidth / 2, scaledY + 120);

    // 説明文（複数行対応）
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#ddd';
    const lines = reward.description.split('\n');
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], scaledX + scaledWidth / 2, scaledY + 145 + i * 14);
    }

    // 選択プロンプト
    if (isHovered && !isSelected) {
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.fillText('クリックで選択', scaledX + scaledWidth / 2, scaledY + scaledHeight - 15);
    }

    ctx.globalAlpha = 1;
  }

  /**
   * レアリティバッジを描画
   */
  private drawRarityBadge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    rarityConfig: { name: string; color: string }
  ): void {
    const badgeWidth = 55;
    const badgeHeight = 16;
    const badgeX = x + width - badgeWidth - 8;
    const badgeY = y + 8;

    ctx.fillStyle = rarityConfig.color;
    this.drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 3);
    ctx.fill();

    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(rarityConfig.name, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
  }

  /**
   * タイプラベルを取得
   */
  private getTypeLabel(type: string): string {
    switch (type) {
      case 'new_card': return '📦 新規カード';
      case 'upgrade': return '⬆️ アップグレード';
      case 'heal': return '💚 回復';
      default: return '';
    }
  }

  /**
   * 角丸の矩形を描画
   */
  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * 現在ホバー中のインデックスを取得
   */
  getHoveredIndex(): number {
    return this.hoveredIndex;
  }

  /**
   * 選択されたインデックスを取得
   */
  getSelectedIndex(): number {
    return this.selectedIndex;
  }
}
