import { 
  Position, 
  TowerConfig, 
  ElementType, 
  ELEMENT_CONFIGS,
  LEVEL_COLOR_MULTIPLIERS,
  MAX_TOWER_LEVEL,
  getTowerConfigByElement,
  SynergyEffect
} from '../types';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';

/**
 * タワークラス
 * 範囲内の敵を検知し、弾を発射する
 * レベルアップとシナジー効果に対応
 */
export class Tower {
  public position: Position;
  public element: ElementType;
  public level: number;
  public range: number;
  public fireRate: number;
  public baseDamage: number;    // 基本ダメージ
  public size: number;
  
  // グリッド上の位置
  public gridRow: number;
  public gridCol: number;
  
  // HP関連
  public hp: number;
  public maxHp: number;
  public isAlive: boolean;
  
  // 沈黙状態（ボスのSilenceスキル）
  public isSilenced: boolean = false;
  public silenceEndTime: number = 0;
  
  // シナジー効果
  public activeSynergies: SynergyEffect[];
  public synergyDamageMultiplier: number;
  
  // 発射管理
  private lastFireTime: number;
  private currentTarget: Enemy | null;
  
  // アニメーション状態
  private animationScale: number;
  private animationPhase: 'idle' | 'squash' | 'stretch' | 'recover' | 'damage';
  private animationTimer: number;

  constructor(
    gridRow: number,
    gridCol: number,
    centerPosition: Position,
    element: ElementType = 'ice',
    level: number = 1,
    config?: TowerConfig
  ) {
    this.gridRow = gridRow;
    this.gridCol = gridCol;
    this.position = { ...centerPosition };
    this.element = element;
    this.level = Math.min(level, MAX_TOWER_LEVEL);
    
    // 設定が渡されなければレベルに応じたデフォルト設定を使用
    const towerConfig = config ?? getTowerConfigByElement(element, this.level);
    
    this.range = towerConfig.range;
    this.fireRate = towerConfig.fireRate;
    this.baseDamage = towerConfig.damage;
    this.size = towerConfig.size;
    
    // HP初期化（レベルに応じてHP増加）
    this.maxHp = 100 + (this.level - 1) * 50;
    this.hp = this.maxHp;
    this.isAlive = true;
    
    // シナジー初期化
    this.activeSynergies = [];
    this.synergyDamageMultiplier = 1.0;
    
    this.lastFireTime = 0;
    this.currentTarget = null;
    
    // アニメーション初期化
    this.animationScale = 1.0;
    this.animationPhase = 'idle';
    this.animationTimer = 0;
  }

  /**
   * ダメージを受ける
   * @returns タワーが破壊されたかどうか
   */
  takeDamage(damage: number): boolean {
    if (!this.isAlive) return false;
    
    this.hp -= damage;
    this.triggerDamageAnimation();
    
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      return true; // 破壊された
    }
    return false;
  }

  /**
   * 沈黙状態を付与（ボスのSilenceスキル）
   */
  applySilence(duration: number): void {
    this.isSilenced = true;
    this.silenceEndTime = Date.now() + duration;
  }

  /**
   * 沈黙中かどうか
   */
  checkSilenced(): boolean {
    if (this.isSilenced && Date.now() >= this.silenceEndTime) {
      this.isSilenced = false;
    }
    return this.isSilenced;
  }

  /**
   * ダメージアニメーションをトリガー
   */
  triggerDamageAnimation(): void {
    this.animationPhase = 'damage';
    this.animationTimer = 0;
  }

  /**
   * HPを回復
   */
  heal(amount: number): void {
    if (!this.isAlive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /**
   * 属性設定を取得
   */
  getElementConfig() {
    return ELEMENT_CONFIGS[this.element];
  }

  /**
   * 現在の実効ダメージを取得（シナジー込み）
   */
  getEffectiveDamage(): number {
    return Math.floor(this.baseDamage * this.synergyDamageMultiplier);
  }

  /**
   * シナジー効果を設定
   */
  setSynergies(synergies: SynergyEffect[]): void {
    this.activeSynergies = synergies;
    
    // ダメージ倍率を計算（複数シナジーは乗算）
    this.synergyDamageMultiplier = synergies.reduce(
      (multiplier, synergy) => multiplier * synergy.damageMultiplier,
      1.0
    );
  }

  /**
   * シナジーをクリア
   */
  clearSynergies(): void {
    this.activeSynergies = [];
    this.synergyDamageMultiplier = 1.0;
  }

  /**
   * レベルアップ
   * @returns レベルアップ成功したかどうか
   */
  levelUp(): boolean {
    if (this.level >= MAX_TOWER_LEVEL) {
      return false;
    }
    
    this.level++;
    
    // 新しいレベルの設定を適用
    const newConfig = getTowerConfigByElement(this.element, this.level);
    this.range = newConfig.range;
    this.fireRate = newConfig.fireRate;
    this.baseDamage = newConfig.damage;
    this.size = newConfig.size;
    
    // レベルアップ時にHP増加・全回復
    this.maxHp = 100 + (this.level - 1) * 50;
    this.hp = this.maxHp;
    
    // レベルアップアニメーション
    this.triggerFireAnimation();
    
    return true;
  }

  /**
   * 合成可能かチェック
   */
  canMergeWith(element: ElementType, level: number): boolean {
    return (
      this.element === element &&
      this.level === level &&
      this.level < MAX_TOWER_LEVEL
    );
  }

  /**
   * 発射アニメーションをトリガー
   */
  triggerFireAnimation(): void {
    this.animationPhase = 'squash';
    this.animationTimer = 0;
  }

  /**
   * アニメーション更新
   */
  updateAnimation(): void {
    const squashDuration = 4;
    const stretchDuration = 6;
    const recoverDuration = 8;
    const damageDuration = 10;

    switch (this.animationPhase) {
      case 'squash':
        this.animationTimer++;
        // 縮む（0.85まで）
        this.animationScale = 1.0 - (this.animationTimer / squashDuration) * 0.15;
        if (this.animationTimer >= squashDuration) {
          this.animationPhase = 'stretch';
          this.animationTimer = 0;
        }
        break;

      case 'stretch':
        this.animationTimer++;
        // 伸びる（1.15まで）
        this.animationScale = 0.85 + (this.animationTimer / stretchDuration) * 0.30;
        if (this.animationTimer >= stretchDuration) {
          this.animationPhase = 'recover';
          this.animationTimer = 0;
        }
        break;

      case 'recover':
        this.animationTimer++;
        // 元に戻る
        this.animationScale = 1.15 - (this.animationTimer / recoverDuration) * 0.15;
        if (this.animationTimer >= recoverDuration) {
          this.animationPhase = 'idle';
          this.animationScale = 1.0;
        }
        break;

      case 'damage':
        this.animationTimer++;
        // 揺れるアニメーション
        this.animationScale = 1.0 + Math.sin(this.animationTimer * 0.8) * 0.1;
        if (this.animationTimer >= damageDuration) {
          this.animationPhase = 'idle';
          this.animationScale = 1.0;
        }
        break;

      case 'idle':
      default:
        this.animationScale = 1.0;
        break;
    }
  }

  /**
   * 範囲内の敵を探してターゲットを更新
   * 優先度が高い敵（タンクなど）を優先的に狙う
   */
  findTarget(enemies: Enemy[]): void {
    // 現在のターゲットが有効かチェック
    if (this.currentTarget && this.currentTarget.isAlive && this.isInRange(this.currentTarget)) {
      return; // 現在のターゲットを維持
    }

    // 新しいターゲットを探す（優先度順、同じ優先度なら最も近い敵）
    this.currentTarget = null;
    let bestPriority = 0;
    let closestDistance = Infinity;

    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;

      const distance = this.getDistanceTo(enemy);
      if (distance > this.range) continue;

      // 優先度が高い敵を優先
      const priority = enemy.priority;
      if (priority > bestPriority || (priority === bestPriority && distance < closestDistance)) {
        bestPriority = priority;
        closestDistance = distance;
        this.currentTarget = enemy;
      }
    }
  }

  /**
   * 弾を発射（発射可能な場合）
   * @returns 発射した弾、または null
   */
  tryFire(currentTime: number): Projectile | null {
    // 沈黙解除チェック
    if (this.isSilenced) {
      if (currentTime >= this.silenceEndTime) {
        this.isSilenced = false;
      } else {
        // 沈黙中は攻撃不可
        return null;
      }
    }

    if (!this.currentTarget || !this.currentTarget.isAlive) {
      return null;
    }

    // 発射間隔のチェック
    if (currentTime - this.lastFireTime < this.fireRate) {
      return null;
    }

    // 範囲内かチェック
    if (!this.isInRange(this.currentTarget)) {
      this.currentTarget = null;
      return null;
    }

    // 発射アニメーションをトリガー
    this.triggerFireAnimation();

    // 弾を発射（属性に応じた色で、シナジー込みのダメージ）
    const elementConfig = this.getElementConfig();
    this.lastFireTime = currentTime;
    
    // シナジー発動中は弾を大きくして光らせる
    const hasActiveSynergy = this.activeSynergies.length > 0;
    const projectileSize = hasActiveSynergy ? 8 : 6;
    
    return new Projectile(
      { ...this.position },
      this.currentTarget,
      this.element, // 属性を渡す
      {
        speed: 8,
        size: projectileSize,
        color: elementConfig.projectileColor,
        damage: this.getEffectiveDamage(),
      }
    );
  }

  /**
   * 敵が範囲内にいるかチェック
   */
  private isInRange(enemy: Enemy): boolean {
    return this.getDistanceTo(enemy) <= this.range;
  }

  /**
   * 敵との距離を計算
   */
  private getDistanceTo(enemy: Enemy): number {
    const enemyPos = enemy.getCenter();
    const dx = enemyPos.x - this.position.x;
    const dy = enemyPos.y - this.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * レベルに応じた色を取得（濃くする）
   */
  private getLevelAdjustedColor(baseColor: string): string {
    const multiplier = LEVEL_COLOR_MULTIPLIERS[this.level] ?? 1.0;
    
    // HEXカラーをRGBに変換して暗くする
    const hex = baseColor.replace('#', '');
    const r = Math.floor(parseInt(hex.substring(0, 2), 16) * multiplier);
    const g = Math.floor(parseInt(hex.substring(2, 4), 16) * multiplier);
    const b = Math.floor(parseInt(hex.substring(4, 6), 16) * multiplier);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Canvasにタワーを描画
   */
  draw(ctx: CanvasRenderingContext2D, showRange: boolean = false): void {
    // アニメーション更新
    this.updateAnimation();
    
    // 沈黙状態チェック
    this.checkSilenced();
    
    const elementConfig = this.getElementConfig();
    const hasActiveSynergy = this.activeSynergies.length > 0;
    
    // アニメーションスケールを適用したサイズ
    const animatedSize = this.size * this.animationScale;
    const halfSize = animatedSize / 2;

    // 沈黙エフェクト（紫の鎖）
    if (this.isSilenced) {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.size * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(128, 0, 128, 0.4)';
      ctx.fill();
      ctx.strokeStyle = '#800080';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // シナジー発動中のオーラ効果
    if (hasActiveSynergy && !this.isSilenced) {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.size * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.fill();
      
      // パルスエフェクト
      const pulseSize = this.size * 0.9 + Math.sin(Date.now() / 200) * 3;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, pulseSize, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 範囲表示（オプション）
    if (showRange) {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.range, 0, Math.PI * 2);
      ctx.fillStyle = `${elementConfig.color}20`;
      ctx.fill();
      ctx.strokeStyle = `${elementConfig.color}50`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // タワー本体（レベルに応じて色を濃く、アニメーション適用）
    ctx.save();
    
    // 発射時の光るエフェクト
    if (this.animationPhase === 'stretch') {
      ctx.shadowColor = elementConfig.projectileColor;
      ctx.shadowBlur = 15;
    }

    const towerColor = this.getLevelAdjustedColor(elementConfig.color);
    ctx.fillStyle = towerColor;
    ctx.fillRect(
      this.position.x - halfSize,
      this.position.y - halfSize,
      animatedSize,
      animatedSize
    );

    // 枠線（レベルに応じて太く）
    ctx.strokeStyle = this.getLevelAdjustedColor(elementConfig.borderColor);
    ctx.lineWidth = 2 + this.level;
    ctx.strokeRect(
      this.position.x - halfSize,
      this.position.y - halfSize,
      animatedSize,
      animatedSize
    );

    ctx.restore();

    // 砲台（中央の円）- レベルに応じて大きく
    const cannonSize = (4 + this.level * 2) * this.animationScale;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, cannonSize, 0, Math.PI * 2);
    ctx.fillStyle = '#2c3e50';
    ctx.fill();

    // 属性アイコン（上に表示）
    ctx.font = `${12 + this.level * 2}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(elementConfig.icon, this.position.x, this.position.y - this.size / 2 - 10);

    // レベル表示（右下）
    if (this.level > 1) {
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      const lvText = `Lv${this.level}`;
      ctx.strokeText(lvText, this.position.x + this.size / 2 - 2, this.position.y + this.size / 2 - 2);
      ctx.fillText(lvText, this.position.x + this.size / 2 - 2, this.position.y + this.size / 2 - 2);
    }

    // シナジーアイコン表示（左上）
    if (hasActiveSynergy) {
      ctx.font = '10px sans-serif';
      const synergyIcons = this.activeSynergies.map(s => s.icon).join('');
      ctx.fillText(synergyIcons, this.position.x - this.size / 2 + 8, this.position.y - this.size / 2 + 8);
    }

    // ターゲットへの照準線（ターゲットがいる場合）
    if (this.currentTarget && this.currentTarget.isAlive) {
      const targetPos = this.currentTarget.getCenter();
      ctx.beginPath();
      ctx.moveTo(this.position.x, this.position.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.strokeStyle = hasActiveSynergy 
        ? 'rgba(255, 215, 0, 0.5)' 
        : `${elementConfig.projectileColor}50`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // HPバー（タワーの下に表示）
    this.drawHealthBar(ctx);

    // ダメージ状態のエフェクト（赤く点滅）
    if (this.animationPhase === 'damage') {
      ctx.fillStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(this.animationTimer * 0.8) * 0.2})`;
      ctx.fillRect(
        this.position.x - halfSize,
        this.position.y - halfSize,
        animatedSize,
        animatedSize
      );
    }
  }

  /**
   * HPバーを描画
   */
  private drawHealthBar(ctx: CanvasRenderingContext2D): void {
    const barWidth = this.size;
    const barHeight = 4;
    const barY = this.position.y + this.size / 2 + 4;
    const barX = this.position.x - barWidth / 2;
    const hpRatio = this.hp / this.maxHp;

    // 背景（黒）
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // HP量に応じた色
    let hpColor: string;
    if (hpRatio > 0.6) {
      hpColor = '#2ecc71'; // 緑
    } else if (hpRatio > 0.3) {
      hpColor = '#f39c12'; // オレンジ
    } else {
      hpColor = '#e74c3c'; // 赤
    }

    // HP（現在値）
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // 枠
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
}
