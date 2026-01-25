import { Position, ProjectileConfig, DEFAULT_PROJECTILE_CONFIG, ElementType, GAME_CONFIG } from '../types';
import { Enemy } from './Enemy';

/**
 * 命中結果の情報
 */
export interface HitResult {
  hit: boolean;
  damage: number;
  isCritical: boolean;
  position: Position;
  targetDied: boolean;
  targetColor: string;
  element: ElementType;        // 攻撃の属性
  target: Enemy;               // ターゲットの敵
}

/**
 * 弾クラス
 * タワーから発射され、敵に向かって飛んでいく
 * 属性を持ち、元素反応の引き金となる
 */
export class Projectile {
  public position: Position;
  public speed: number;
  public size: number;
  public color: string;
  public damage: number;
  public isActive: boolean;
  public element: ElementType;   // 攻撃の属性
  
  // クリティカル確率（10%）
  private criticalChance: number = 0.1;
  private criticalMultiplier: number = 2.0;
  
  private target: Enemy;
  private velocity: Position;
  
  // 軌跡エフェクト用
  private trail: Position[];
  private maxTrailLength: number = 5;

  constructor(
    startPosition: Position,
    target: Enemy,
    element: ElementType,
    config: ProjectileConfig = DEFAULT_PROJECTILE_CONFIG
  ) {
    this.position = { ...startPosition };
    this.target = target;
    this.element = element;
    this.speed = config.speed;
    this.size = config.size;
    this.color = config.color;
    this.damage = config.damage;
    this.isActive = true;
    this.velocity = { x: 0, y: 0 };
    this.trail = [];
    
    // 初期速度を計算
    this.updateVelocity();
  }

  /**
   * ターゲットに向かう速度ベクトルを更新
   */
  private updateVelocity(): void {
    if (!this.target.isAlive) {
      // ターゲットが死んでいる場合は現在の方向を維持
      return;
    }

    const targetPos = this.target.getCenter();
    const dx = targetPos.x - this.position.x;
    const dy = targetPos.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      this.velocity.x = (dx / distance) * this.speed;
      this.velocity.y = (dy / distance) * this.speed;
    }
  }

  /**
   * 弾の位置を更新
   * @returns 命中結果（命中しなかった場合はnull）
   */
  update(): HitResult | null {
    if (!this.isActive) return null;

    // 軌跡を記録
    this.trail.push({ ...this.position });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    // ターゲットが生きている場合は追尾
    if (this.target.isAlive) {
      this.updateVelocity();
    }

    // 移動
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    // 画面外に出たら非アクティブ化
    if (this.isOutOfBounds()) {
      this.isActive = false;
      return null;
    }

    // ターゲットとの衝突判定
    if (this.target.isAlive && this.checkCollision()) {
      // クリティカル判定
      const isCritical = Math.random() < this.criticalChance;
      const finalDamage = isCritical 
        ? Math.floor(this.damage * this.criticalMultiplier) 
        : this.damage;
      
      // ダメージは元素反応システムで処理するので、ここでは与えない
      // 元素反応の結果によってダメージが変わる可能性があるため
      this.isActive = false;
      
      return {
        hit: true,
        damage: finalDamage,
        isCritical,
        position: { ...this.position },
        targetDied: false, // 元素反応後に判定
        targetColor: this.target.color,
        element: this.element,
        target: this.target,
      };
    }

    return null;
  }

  /**
   * 画面外判定
   */
  private isOutOfBounds(): boolean {
    const { CANVAS_WIDTH, CANVAS_HEIGHT } = GAME_CONFIG;
    return (
      this.position.x < -50 ||
      this.position.x > CANVAS_WIDTH + 50 ||
      this.position.y < -50 ||
      this.position.y > CANVAS_HEIGHT + 50
    );
  }

  /**
   * ターゲットとの衝突判定（円形）
   */
  private checkCollision(): boolean {
    const targetPos = this.target.getCenter();
    const dx = targetPos.x - this.position.x;
    const dy = targetPos.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 弾のサイズ + 敵のサイズの半分で衝突判定
    const collisionDistance = this.size + this.target.size / 2;
    return distance < collisionDistance;
  }

  /**
   * Canvasに弾を描画
   */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive) return;

    // 軌跡を描画
    if (this.trail.length > 1) {
      for (let i = 0; i < this.trail.length - 1; i++) {
        const alpha = (i + 1) / this.trail.length * 0.5;
        const trailSize = this.size * (i + 1) / this.trail.length;
        
        ctx.beginPath();
        ctx.arc(this.trail[i].x, this.trail[i].y, trailSize, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // 弾本体（円形）
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // 光る効果
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.size + 2, 0, Math.PI * 2);
    ctx.strokeStyle = `${this.color}80`;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 中心のハイライト
    ctx.beginPath();
    ctx.arc(this.position.x - this.size * 0.3, this.position.y - this.size * 0.3, this.size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
  }
}
