import { Position } from '../types';

/**
 * パーティクルクラス
 * 敵撃破時などに飛び散るエフェクト
 */
export class Particle {
  public position: Position;
  public velocity: Position;
  public size: number;
  public color: string;
  public alpha: number;
  public life: number;
  public maxLife: number;
  public isActive: boolean;
  
  // 物理パラメータ
  private gravity: number;
  private friction: number;
  private shrinkRate: number;

  constructor(
    position: Position,
    velocity: Position,
    size: number,
    color: string,
    life: number = 60,
    gravity: number = 0.15,
    friction: number = 0.98
  ) {
    this.position = { ...position };
    this.velocity = { ...velocity };
    this.size = size;
    this.color = color;
    this.alpha = 1;
    this.life = life;
    this.maxLife = life;
    this.isActive = true;
    this.gravity = gravity;
    this.friction = friction;
    this.shrinkRate = size / life;
  }

  /**
   * パーティクルを更新
   */
  update(): void {
    if (!this.isActive) return;

    // 移動
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    // 重力
    this.velocity.y += this.gravity;

    // 摩擦
    this.velocity.x *= this.friction;
    this.velocity.y *= this.friction;

    // 寿命減少
    this.life--;
    
    // フェードアウト
    this.alpha = Math.max(0, this.life / this.maxLife);
    
    // サイズ縮小
    this.size = Math.max(0, this.size - this.shrinkRate * 0.5);

    // 寿命切れ
    if (this.life <= 0 || this.size <= 0) {
      this.isActive = false;
    }
  }

  /**
   * パーティクルを描画
   */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive || this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    // 光るエフェクト
    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, 0,
      this.position.x, this.position.y, this.size
    );
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(0.5, this.color);
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
  }
}

/**
 * パーティクルシステム
 * パーティクルの生成と管理
 */
export class ParticleSystem {
  private particles: Particle[];
  private maxParticles: number;

  constructor(maxParticles: number = 500) {
    this.particles = [];
    this.maxParticles = maxParticles;
  }

  /**
   * 敵撃破時の爆発パーティクル
   */
  createDeathExplosion(position: Position, color: string, count: number = 15): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      // ランダムな方向に飛び散る
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 3 + Math.random() * 5;
      const velocity: Position = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed - 2, // 少し上向き
      };

      const size = 4 + Math.random() * 6;
      const life = 30 + Math.random() * 30;

      const particle = new Particle(
        position,
        velocity,
        size,
        color,
        life,
        0.2,  // 重力
        0.96  // 摩擦
      );

      this.particles.push(particle);
    }

    // 追加の小さいパーティクル（キラキラ）
    for (let i = 0; i < count / 2; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const velocity: Position = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      };

      const particle = new Particle(
        position,
        velocity,
        2 + Math.random() * 2,
        '#ffffff',
        20 + Math.random() * 20,
        0.05,
        0.99
      );

      this.particles.push(particle);
    }
  }

  /**
   * 弾が命中した時のヒットエフェクト
   */
  createHitEffect(position: Position, color: string, count: number = 6): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      const velocity: Position = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      };

      const particle = new Particle(
        position,
        velocity,
        2 + Math.random() * 3,
        color,
        15 + Math.random() * 15,
        0.1,
        0.95
      );

      this.particles.push(particle);
    }
  }

  /**
   * シナジー発動時のスパークエフェクト
   */
  createSynergySparkle(position: Position): void {
    const colors = ['#ffd700', '#fff176', '#ffeb3b'];
    
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (Math.PI * 2 * i) / 8;
      const speed = 2 + Math.random() * 2;
      const velocity: Position = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed - 1,
      };

      const color = colors[Math.floor(Math.random() * colors.length)];

      const particle = new Particle(
        position,
        velocity,
        3 + Math.random() * 2,
        color,
        25 + Math.random() * 15,
        0.08,
        0.97
      );

      this.particles.push(particle);
    }
  }

  /**
   * 全パーティクルを更新
   */
  update(): void {
    for (const particle of this.particles) {
      particle.update();
    }

    // 非アクティブなパーティクルを削除
    this.particles = this.particles.filter(p => p.isActive);
  }

  /**
   * 全パーティクルを描画
   */
  draw(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.particles) {
      particle.draw(ctx);
    }
  }

  /**
   * パーティクル数を取得
   */
  getParticleCount(): number {
    return this.particles.length;
  }

  /**
   * 全パーティクルをクリア
   */
  clear(): void {
    this.particles = [];
  }
}
