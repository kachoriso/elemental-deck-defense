import { Position } from '../types';

/**
 * ダメージポップアップクラス
 * ダメージを与えた時に数値を表示
 */
export class DamagePopup {
  public position: Position;
  public damage: number;
  public isCritical: boolean;
  public color: string;
  public isActive: boolean;
  
  private velocity: Position;
  private alpha: number;
  private scale: number;
  private life: number;
  private maxLife: number;

  constructor(
    position: Position,
    damage: number,
    isCritical: boolean = false,
    color: string = '#ffffff'
  ) {
    this.position = { ...position };
    this.damage = damage;
    this.isCritical = isCritical;
    this.color = isCritical ? '#ffd700' : color;
    this.isActive = true;
    
    // 上方向に浮かび上がる
    this.velocity = {
      x: (Math.random() - 0.5) * 2,
      y: -3 - Math.random() * 2,
    };
    
    this.alpha = 1;
    this.scale = isCritical ? 1.5 : 1.0;
    this.life = isCritical ? 60 : 45;
    this.maxLife = this.life;
  }

  /**
   * ポップアップを更新
   */
  update(): void {
    if (!this.isActive) return;

    // 移動
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    // 減速
    this.velocity.y += 0.1; // 軽い重力
    this.velocity.x *= 0.95;

    // 寿命減少
    this.life--;

    // フェードアウト（後半でフェード）
    if (this.life < this.maxLife * 0.4) {
      this.alpha = this.life / (this.maxLife * 0.4);
    }

    // クリティカルは最初に拡大してから縮小
    if (this.isCritical) {
      const progress = 1 - (this.life / this.maxLife);
      if (progress < 0.1) {
        this.scale = 1.5 + progress * 5; // 拡大
      } else if (progress < 0.2) {
        this.scale = 2.0 - (progress - 0.1) * 5; // 縮小
      } else {
        this.scale = 1.5;
      }
    }

    // 寿命切れ
    if (this.life <= 0) {
      this.isActive = false;
    }
  }

  /**
   * ポップアップを描画
   */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive || this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    const text = this.damage.toString();
    const fontSize = this.isCritical ? 20 * this.scale : 14 * this.scale;
    
    ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // クリティカルは光るエフェクト
    if (this.isCritical) {
      // 外側の光
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#fff';
      ctx.fillText(text, this.position.x, this.position.y);
      
      // 「CRITICAL!」テキスト
      ctx.font = `bold 10px 'Segoe UI', sans-serif`;
      ctx.fillStyle = '#ff6b6b';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 5;
      ctx.fillText('CRITICAL!', this.position.x, this.position.y - fontSize / 2 - 8);
    }

    // メインテキスト
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // 縁取り
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(text, this.position.x, this.position.y);

    // 本体
    ctx.fillStyle = this.color;
    ctx.fillText(text, this.position.x, this.position.y);

    ctx.restore();
  }
}

/**
 * テキストポップアップクラス（元素反応などの特殊表示用）
 */
export class TextPopup {
  public position: Position;
  public text: string;
  public color: string;
  public isActive: boolean;
  
  private velocity: Position;
  private alpha: number;
  private scale: number;
  private life: number;
  private maxLife: number;

  constructor(
    position: Position,
    text: string,
    color: string = '#ffffff'
  ) {
    this.position = { ...position };
    this.text = text;
    this.color = color;
    this.isActive = true;
    
    // 上方向に浮かび上がる
    this.velocity = {
      x: 0,
      y: -2,
    };
    
    this.alpha = 1;
    this.scale = 0.5;  // 小さく始まる
    this.life = 80;
    this.maxLife = this.life;
  }

  /**
   * ポップアップを更新
   */
  update(): void {
    if (!this.isActive) return;

    // 移動
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    // 減速
    this.velocity.y *= 0.95;

    // 寿命減少
    this.life--;

    // スケールアニメーション（最初に大きくなる）
    const progress = 1 - (this.life / this.maxLife);
    if (progress < 0.15) {
      this.scale = 0.5 + progress * 5; // 0.5 -> 1.25
    } else if (progress < 0.3) {
      this.scale = 1.25 - (progress - 0.15) * 2; // 1.25 -> 0.95
    } else {
      this.scale = 0.95 + Math.sin(progress * 10) * 0.05; // 揺れ
    }

    // フェードアウト（後半でフェード）
    if (this.life < this.maxLife * 0.3) {
      this.alpha = this.life / (this.maxLife * 0.3);
    }

    // 寿命切れ
    if (this.life <= 0) {
      this.isActive = false;
    }
  }

  /**
   * ポップアップを描画
   */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive || this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    const fontSize = 24 * this.scale;
    
    ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 光るエフェクト
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;

    // 縁取り
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeText(this.text, this.position.x, this.position.y);

    // 本体
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.position.x, this.position.y);

    ctx.restore();
  }
}

/**
 * ダメージポップアップマネージャー
 */
export class DamagePopupManager {
  private popups: DamagePopup[];
  private textPopups: TextPopup[];
  private maxPopups: number;

  constructor(maxPopups: number = 50) {
    this.popups = [];
    this.textPopups = [];
    this.maxPopups = maxPopups;
  }

  /**
   * ダメージポップアップを作成
   */
  createPopup(
    position: Position,
    damage: number,
    isCritical: boolean = false,
    color: string = '#ffffff'
  ): void {
    // 上限チェック
    if (this.popups.length >= this.maxPopups) {
      // 最も古いものを削除
      this.popups.shift();
    }

    // 少しランダムな位置にずらす
    const offsetPosition: Position = {
      x: position.x + (Math.random() - 0.5) * 20,
      y: position.y - 10,
    };

    const popup = new DamagePopup(offsetPosition, damage, isCritical, color);
    this.popups.push(popup);
  }

  /**
   * テキストポップアップを作成（元素反応表示用）
   */
  createTextPopup(
    position: Position,
    text: string,
    color: string = '#ffffff'
  ): void {
    // 上限チェック
    if (this.textPopups.length >= this.maxPopups / 2) {
      this.textPopups.shift();
    }

    const popup = new TextPopup(position, text, color);
    this.textPopups.push(popup);
  }

  /**
   * 全ポップアップを更新
   */
  update(): void {
    for (const popup of this.popups) {
      popup.update();
    }

    for (const popup of this.textPopups) {
      popup.update();
    }

    // 非アクティブなポップアップを削除
    this.popups = this.popups.filter(p => p.isActive);
    this.textPopups = this.textPopups.filter(p => p.isActive);
  }

  /**
   * 全ポップアップを描画
   */
  draw(ctx: CanvasRenderingContext2D): void {
    for (const popup of this.popups) {
      popup.draw(ctx);
    }

    for (const popup of this.textPopups) {
      popup.draw(ctx);
    }
  }

  /**
   * 全ポップアップをクリア
   */
  clear(): void {
    this.popups = [];
    this.textPopups = [];
  }
}
