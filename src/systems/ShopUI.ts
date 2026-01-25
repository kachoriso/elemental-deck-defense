import { ShopItem, GAME_CONFIG } from '../types';

/**
 * ショップアイテムカードのレイアウト
 */
interface ShopCardLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  item: ShopItem;
  isHovered: boolean;
  canAfford: boolean;
}

/**
 * ショップ画面UI
 */
export class ShopUI {
  private items: ShopItem[];
  private cardLayouts: ShopCardLayout[];
  private isVisible: boolean;
  private tokens: number;
  private waveBonus: { base: number; interest: number; total: number } | null;
  
  // コールバック
  private onItemPurchased: ((item: ShopItem) => boolean) | null;
  private onReroll: (() => boolean) | null;
  private onContinue: (() => void) | null;
  
  // レイアウト設定
  private readonly CARD_WIDTH = 130;
  private readonly CARD_HEIGHT = 180;
  private readonly CARD_GAP = 15;
  
  // ボタン領域
  private rerollButtonBounds: { x: number; y: number; width: number; height: number };
  private continueButtonBounds: { x: number; y: number; width: number; height: number };

  constructor() {
    this.items = [];
    this.cardLayouts = [];
    this.isVisible = false;
    this.tokens = 0;
    this.waveBonus = null;
    this.onItemPurchased = null;
    this.onReroll = null;
    this.onContinue = null;
    
    // ボタン位置（後で計算）
    this.rerollButtonBounds = { x: 0, y: 0, width: 100, height: 35 };
    this.continueButtonBounds = { x: 0, y: 0, width: 150, height: 40 };
  }

  /**
   * ショップを表示
   */
  show(items: ShopItem[], tokens: number, waveBonus?: { base: number; interest: number; total: number }): void {
    this.items = items;
    this.tokens = tokens;
    this.waveBonus = waveBonus || null;
    this.isVisible = true;
    
    this.calculateLayouts();
  }

  /**
   * ショップを非表示
   */
  hide(): void {
    this.isVisible = false;
    this.items = [];
    this.cardLayouts = [];
    this.waveBonus = null;
  }

  /**
   * 表示中かどうか
   */
  isShowing(): boolean {
    return this.isVisible;
  }

  /**
   * トークン数を更新
   */
  updateTokens(tokens: number): void {
    this.tokens = tokens;
    this.updateAffordability();
  }

  /**
   * アイテムを更新
   */
  updateItems(items: ShopItem[]): void {
    this.items = items;
    this.calculateLayouts();
  }

  /**
   * コールバックを設定
   */
  setOnItemPurchased(callback: (item: ShopItem) => boolean): void {
    this.onItemPurchased = callback;
  }

  setOnReroll(callback: () => boolean): void {
    this.onReroll = callback;
  }

  setOnContinue(callback: () => void): void {
    this.onContinue = callback;
  }

  /**
   * レイアウトを計算
   */
  private calculateLayouts(): void {
    this.cardLayouts = [];
    
    const totalWidth = this.items.length * this.CARD_WIDTH + 
      (this.items.length - 1) * this.CARD_GAP;
    const startX = (GAME_CONFIG.CANVAS_WIDTH - totalWidth) / 2;
    const y = 180;
    
    for (let i = 0; i < this.items.length; i++) {
      this.cardLayouts.push({
        x: startX + i * (this.CARD_WIDTH + this.CARD_GAP),
        y,
        width: this.CARD_WIDTH,
        height: this.CARD_HEIGHT,
        item: this.items[i],
        isHovered: false,
        canAfford: this.tokens >= this.items[i].price,
      });
    }
    
    // ボタン位置を計算
    const buttonY = y + this.CARD_HEIGHT + 40;
    this.rerollButtonBounds = {
      x: GAME_CONFIG.CANVAS_WIDTH / 2 - 160,
      y: buttonY,
      width: 100,
      height: 35,
    };
    this.continueButtonBounds = {
      x: GAME_CONFIG.CANVAS_WIDTH / 2 + 10,
      y: buttonY,
      width: 150,
      height: 40,
    };
  }

  /**
   * 購入可能状態を更新
   */
  private updateAffordability(): void {
    for (const layout of this.cardLayouts) {
      layout.canAfford = this.tokens >= layout.item.price;
    }
  }

  /**
   * マウス移動を処理
   */
  handleMouseMove(mouseX: number, mouseY: number): void {
    if (!this.isVisible) return;
    
    for (let i = 0; i < this.cardLayouts.length; i++) {
      const layout = this.cardLayouts[i];
      layout.isHovered = this.isPointInRect(mouseX, mouseY, layout);
    }
  }

  /**
   * クリックを処理
   */
  handleClick(mouseX: number, mouseY: number): boolean {
    if (!this.isVisible) return false;

    // アイテムクリック
    for (const layout of this.cardLayouts) {
      if (this.isPointInRect(mouseX, mouseY, layout)) {
        if (layout.canAfford && this.onItemPurchased) {
          const success = this.onItemPurchased(layout.item);
          if (success) {
            // アイテムを削除して再レイアウト
            this.items = this.items.filter(i => i.id !== layout.item.id);
            this.calculateLayouts();
          }
          return true;
        }
      }
    }

    // リロールボタン
    if (this.isPointInRect(mouseX, mouseY, this.rerollButtonBounds)) {
      if (this.onReroll) {
        const success = this.onReroll();
        if (success) {
          this.calculateLayouts();
        }
      }
      return true;
    }

    // 続行ボタン
    if (this.isPointInRect(mouseX, mouseY, this.continueButtonBounds)) {
      if (this.onContinue) {
        this.onContinue();
      }
      return true;
    }

    return false;
  }

  /**
   * 点が矩形内にあるかチェック
   */
  private isPointInRect(x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean {
    return (
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height
    );
  }

  /**
   * ショップ画面を描画
   */
  draw(ctx: CanvasRenderingContext2D, rerollCost: number, rerollTokens: number): void {
    if (!this.isVisible) return;

    // 半透明の黒背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    // タイトル
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('🏪 SHOP 🏪', GAME_CONFIG.CANVAS_WIDTH / 2, 40);

    // ウェーブクリアボーナス表示
    if (this.waveBonus) {
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#2ecc71';
      ctx.fillText(
        `ウェーブクリア！ +${this.waveBonus.base} Token` +
        (this.waveBonus.interest > 0 ? ` (+${this.waveBonus.interest} 利子)` : ''),
        GAME_CONFIG.CANVAS_WIDTH / 2, 70
      );
    }

    // トークン表示
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#f1c40f';
    ctx.fillText(`💰 ${this.tokens} Token`, GAME_CONFIG.CANVAS_WIDTH / 2, 100);

    // 説明
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('アイテムをクリックして購入', GAME_CONFIG.CANVAS_WIDTH / 2, 130);

    // 商品カードを描画
    for (const layout of this.cardLayouts) {
      this.drawShopCard(ctx, layout);
    }

    // リロールボタン
    this.drawRerollButton(ctx, rerollCost, rerollTokens);

    // 続行ボタン
    this.drawContinueButton(ctx);
  }

  /**
   * 商品カードを描画
   */
  private drawShopCard(ctx: CanvasRenderingContext2D, layout: ShopCardLayout): void {
    const { x, y, width, height, item, isHovered, canAfford } = layout;

    // ホバー時のスケール
    const scale = isHovered ? 1.05 : 1;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    const scaledX = x - (scaledWidth - width) / 2;
    const scaledY = y - (scaledHeight - height) / 2;

    ctx.save();

    // 影
    if (isHovered && canAfford) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 20;
    }

    // カード背景
    ctx.fillStyle = canAfford ? '#1a2a3a' : '#1a1a1a';
    ctx.strokeStyle = isHovered && canAfford ? '#ffd700' : canAfford ? '#4a90d9' : '#555';
    ctx.lineWidth = isHovered ? 3 : 2;
    
    this.drawRoundedRect(ctx, scaledX, scaledY, scaledWidth, scaledHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // 購入不可オーバーレイ
    if (!canAfford) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.drawRoundedRect(ctx, scaledX, scaledY, scaledWidth, scaledHeight, 8);
      ctx.fill();
    }

    // アイコン
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = canAfford ? '#fff' : '#666';
    ctx.fillText(item.icon, scaledX + scaledWidth / 2, scaledY + 45);

    // 名前
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = canAfford ? '#fff' : '#666';
    ctx.fillText(item.name, scaledX + scaledWidth / 2, scaledY + 85);

    // 説明（複数行対応）
    ctx.font = '10px sans-serif';
    ctx.fillStyle = canAfford ? '#aaa' : '#555';
    const lines = this.wrapText(item.description, scaledWidth - 16);
    for (let i = 0; i < Math.min(lines.length, 2); i++) {
      ctx.fillText(lines[i], scaledX + scaledWidth / 2, scaledY + 105 + i * 12);
    }

    // 価格
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = canAfford ? '#f1c40f' : '#e74c3c';
    ctx.fillText(`💰 ${item.price}`, scaledX + scaledWidth / 2, scaledY + scaledHeight - 20);

    // ホバー時の「購入」テキスト
    if (isHovered && canAfford) {
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#2ecc71';
      ctx.fillText('クリックで購入', scaledX + scaledWidth / 2, scaledY + scaledHeight - 40);
    }
  }

  /**
   * リロールボタンを描画
   */
  private drawRerollButton(ctx: CanvasRenderingContext2D, rerollCost: number, rerollTokens: number): void {
    const { x, y, width, height } = this.rerollButtonBounds;
    const canReroll = this.tokens >= rerollCost || rerollTokens > 0;
    
    ctx.fillStyle = canReroll ? '#2c3e50' : '#1a1a1a';
    ctx.strokeStyle = canReroll ? '#3498db' : '#555';
    ctx.lineWidth = 2;
    
    this.drawRoundedRect(ctx, x, y, width, height, 5);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = canReroll ? '#fff' : '#666';
    
    if (rerollTokens > 0) {
      ctx.fillText(`🔄 (${rerollTokens}個)`, x + width / 2, y + height / 2);
    } else {
      ctx.fillText(`🔄 ${rerollCost}💰`, x + width / 2, y + height / 2);
    }
  }

  /**
   * 続行ボタンを描画
   */
  private drawContinueButton(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = this.continueButtonBounds;
    
    ctx.fillStyle = '#27ae60';
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 2;
    
    this.drawRoundedRect(ctx, x, y, width, height, 5);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('次のウェーブへ ▶', x + width / 2, y + height / 2);
  }

  /**
   * テキストを折り返す
   */
  private wrapText(text: string, _maxWidth: number): string[] {
    // 簡易的な折り返し（maxWidthは将来の拡張用）
    if (text.length <= 12) return [text];
    
    const mid = Math.ceil(text.length / 2);
    return [text.substring(0, mid), text.substring(mid)];
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
}
