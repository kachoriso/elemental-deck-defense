import { 
  Position, 
  EnemyConfig, 
  RouteIndex, 
  StatusType,
  ELEMENT_CONFIGS,
  EnemyType,
  EnemyTypeConfig,
  ENEMY_TYPE_CONFIGS,
  GAME_CONFIG,
  ElementType
} from '../types';
import { Tower } from './Tower';

// 耐性タイプ（fire, ice, lightningのみ）
export type ResistanceType = 'fire' | 'ice' | 'lightning' | null;

/**
 * 敵クラス
 * パスに沿って移動し、タワーの攻撃対象となる
 * 属性状態を持ち、元素反応の対象となる
 * 各種敵タイプに対応
 */
export class Enemy {
  public position: Position;
  public health: number;
  public maxHealth: number;
  public speed: number;
  public baseSpeed: number;      // 基本速度（減速解除用）
  public size: number;
  public color: string;
  public isAlive: boolean;
  
  // 敵タイプ
  public enemyType: EnemyType;
  public typeConfig: EnemyTypeConfig;
  
  // 属性耐性（この属性の攻撃を無効化）
  public resistance: ResistanceType = null;
  
  // ルート情報
  public routeIndex: RouteIndex;
  
  // 属性状態
  public status: StatusType | null = null;
  public statusDuration: number = 0;  // 状態の残り時間（ms）
  
  // 凍結状態
  public isFrozen: boolean = false;
  public freezeEndTime: number = 0;
  
  // 減速状態
  public isSlowed: boolean = false;
  public slowEndTime: number = 0;
  public slowMultiplier: number = 1;
  
  // タワー攻撃用
  public attackDamage: number;
  public lastAttackTime: number = 0;
  public attackCooldown: number;
  public evasionChance: number;
  public priority: number;
  
  // ブレイカー用（タワーターゲット）
  public targetTower: Tower | null = null;
  
  // ボス用スキル
  public lastSkillTime: number = 0;
  public skillCooldown: number;
  public ccImmunity: number;  // CC効果軽減率（0-1）
  
  // パス追従用
  private pathIndex: number;
  private path: Position[];

  constructor(
    path: Position[], 
    routeIndex: RouteIndex,
    enemyType: EnemyType = 'normal',
    waveNumber: number = 1,
    config?: EnemyConfig,
    resistance: ResistanceType = null
  ) {
    this.enemyType = enemyType;
    this.typeConfig = ENEMY_TYPE_CONFIGS[enemyType];
    this.resistance = resistance;
    
    // パスの最初の位置から開始
    this.path = path;
    this.routeIndex = routeIndex;
    this.pathIndex = 0;
    this.position = { ...path[0] };
    
    // ウェーブに応じてステータス調整（難易度上昇：Wave5あたりで厳しくなる）
    const waveMultiplier = 1 + (waveNumber - 1) * 0.25;
    
    if (config) {
      // 互換性のため旧形式のconfigを使用
      this.health = config.health;
      this.maxHealth = config.health;
      this.speed = config.speed;
      this.baseSpeed = config.speed;
      this.size = config.size;
      this.color = config.color;
    } else {
      // タイプ設定から生成
      this.health = Math.floor(this.typeConfig.baseHealth * waveMultiplier);
      this.maxHealth = this.health;
      this.speed = this.typeConfig.baseSpeed;
      this.baseSpeed = this.typeConfig.baseSpeed;
      this.size = this.typeConfig.size;
      this.color = this.typeConfig.color;
    }
    
    // 攻撃関連
    this.attackDamage = Math.floor(this.typeConfig.attackDamage * waveMultiplier);
    this.attackCooldown = this.typeConfig.attackCooldown;
    this.evasionChance = this.typeConfig.evasionChance;
    this.priority = this.typeConfig.priority;
    
    // ボス用スキル設定
    this.skillCooldown = this.typeConfig.skillCooldown || 5000;
    this.ccImmunity = this.typeConfig.ccImmunity || 0;
    this.lastSkillTime = 0;
    
    this.isAlive = true;
  }

  /**
   * ボスかどうか
   */
  isBoss(): boolean {
    return this.typeConfig.isBoss === true;
  }

  /**
   * ボススキルを使用可能かチェック
   */
  canUseSkill(currentTime: number): boolean {
    if (!this.isBoss()) return false;
    return currentTime - this.lastSkillTime >= this.skillCooldown;
  }

  /**
   * ボススキルを使用（スキルタイプを返す）
   */
  useSkill(currentTime: number): 'summon' | 'heal' | 'silence' | null {
    if (!this.canUseSkill(currentTime)) return null;
    
    this.lastSkillTime = currentTime;
    
    // ランダムにスキルを選択
    const skills: ('summon' | 'heal' | 'silence')[] = ['summon', 'heal', 'silence'];
    return skills[Math.floor(Math.random() * skills.length)];
  }

  /**
   * 自己回復（ボススキル）
   */
  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /**
   * 攻撃を回避するかチェック
   */
  tryEvade(): boolean {
    return Math.random() < this.evasionChance;
  }

  /**
   * タワーを攻撃可能かチェック
   */
  canAttackTower(currentTime: number): boolean {
    return currentTime - this.lastAttackTime >= this.attackCooldown;
  }

  /**
   * タワーに攻撃を実行
   */
  attackTower(_tower: Tower, currentTime: number): number {
    this.lastAttackTime = currentTime;
    
    // ブレイカーは自爆
    if (this.enemyType === 'breaker') {
      this.isAlive = false;
      this.health = 0;
    }
    
    return this.attackDamage;
  }

  /**
   * 最も近いタワーを探す（ブレイカー用）
   */
  findNearestTower(towers: Tower[]): Tower | null {
    let nearestTower: Tower | null = null;
    let minDistance = Infinity;
    
    for (const tower of towers) {
      if (!tower.isAlive) continue;
      
      const dx = tower.position.x - this.position.x;
      const dy = tower.position.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestTower = tower;
      }
    }
    
    return nearestTower;
  }

  /**
   * タワーに向かって移動（ブレイカー用）
   */
  moveTowardsTower(tower: Tower): boolean {
    const dx = tower.position.x - this.position.x;
    const dy = tower.position.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // タワーに接触
    if (distance < this.size / 2 + tower.size / 2) {
      return true; // 接触した
    }
    
    // 移動
    const vx = (dx / distance) * this.speed;
    const vy = (dy / distance) * this.speed;
    this.position.x += vx;
    this.position.y += vy;
    
    return false;
  }

  /**
   * 拠点に向かって直線移動（ゴースト用）
   */
  moveTowardsBase(): boolean {
    const { BASE_ROW, BASE_COL, GRID_SIZE } = GAME_CONFIG;
    const baseX = BASE_COL * GRID_SIZE + GRID_SIZE / 2;
    const baseY = BASE_ROW * GRID_SIZE + GRID_SIZE / 2;
    
    const dx = baseX - this.position.x;
    const dy = baseY - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 拠点に到達
    if (distance < GRID_SIZE / 2) {
      return true;
    }
    
    // 移動
    const vx = (dx / distance) * this.speed;
    const vy = (dy / distance) * this.speed;
    this.position.x += vx;
    this.position.y += vy;
    
    return false;
  }

  /**
   * 属性状態を付与
   */
  applyStatus(status: StatusType, duration: number = 3000): void {
    this.status = status;
    this.statusDuration = duration;
  }

  /**
   * 属性状態をクリア
   */
  clearStatus(): void {
    this.status = null;
    this.statusDuration = 0;
  }

  /**
   * 凍結状態を付与（CC耐性により効果時間が短縮される）
   */
  freeze(duration: number): void {
    // CC耐性による効果時間短縮
    const actualDuration = Math.floor(duration * (1 - this.ccImmunity));
    
    // 効果時間が短すぎる場合は無効化
    if (actualDuration < 200) return;
    
    this.isFrozen = true;
    this.freezeEndTime = Date.now() + actualDuration;
    this.status = 'frozen';
  }

  /**
   * 減速効果を付与（CC耐性により効果時間が短縮される）
   */
  applySlow(duration: number, multiplier: number): void {
    // CC耐性による効果時間短縮
    const actualDuration = Math.floor(duration * (1 - this.ccImmunity));
    
    // 効果時間が短すぎる場合は無効化
    if (actualDuration < 200) return;
    
    this.isSlowed = true;
    this.slowEndTime = Date.now() + actualDuration;
    this.slowMultiplier = multiplier;
    this.speed = this.baseSpeed * multiplier;
  }

  /**
   * 敵の位置を更新（パスに沿って移動）
   * @param towers タワーのリスト（ブレイカー用）
   * @returns ゴールに到達したかどうか
   */
  update(towers?: Tower[]): boolean {
    if (!this.isAlive) return false;

    const now = Date.now();

    // 凍結解除チェック
    if (this.isFrozen && now >= this.freezeEndTime) {
      this.isFrozen = false;
      if (this.status === 'frozen') {
        this.clearStatus();
      }
    }

    // 減速解除チェック
    if (this.isSlowed && now >= this.slowEndTime) {
      this.isSlowed = false;
      this.slowMultiplier = 1;
      this.speed = this.baseSpeed;
    }

    // 凍結中は動かない
    if (this.isFrozen) {
      return false;
    }

    // 状態持続時間の減少
    if (this.statusDuration > 0) {
      this.statusDuration -= 16; // 約60FPS想定
      if (this.statusDuration <= 0) {
        this.clearStatus();
      }
    }

    // ゴースト: パスを無視して拠点へ直進
    if (this.typeConfig.ignoresPath) {
      return this.moveTowardsBase();
    }

    // ブレイカー: タワーを優先して狙う
    if (this.typeConfig.targetsNearestTower && towers && towers.length > 0) {
      // ターゲットタワーが無効なら再探索
      if (!this.targetTower || !this.targetTower.isAlive) {
        this.targetTower = this.findNearestTower(towers);
      }
      
      // タワーがあればそちらへ移動
      if (this.targetTower) {
        return this.moveTowardsTower(this.targetTower);
      }
      // タワーがなければ通常移動（拠点へ）
    }

    // 通常の移動（パス追従）
    return this.followPath();
  }

  /**
   * パスに沿って移動
   */
  private followPath(): boolean {
    // 次のウェイポイントがない場合はゴール到達
    if (this.pathIndex >= this.path.length - 1) {
      return true; // ゴール到達
    }

    const target = this.path[this.pathIndex + 1];
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // ウェイポイントに十分近づいたら次へ
    if (distance < this.speed) {
      this.pathIndex++;
      if (this.pathIndex >= this.path.length - 1) {
        return true; // ゴール到達
      }
    } else {
      // ウェイポイントに向かって移動
      const vx = (dx / distance) * this.speed;
      const vy = (dy / distance) * this.speed;
      this.position.x += vx;
      this.position.y += vy;
    }

    return false;
  }

  /**
   * ダメージを受ける
   * @param damage ダメージ量
   * @param attackElement 攻撃属性（耐性チェック用）
   * @returns 実際に与えたダメージ（耐性により軽減される場合あり）
   */
  takeDamage(damage: number, attackElement?: ElementType): number {
    // 物理攻撃は耐性を無視
    if (attackElement === 'physical') {
      this.health -= damage;
      if (this.health <= 0) {
        this.health = 0;
        this.isAlive = false;
      }
      return damage;
    }

    // 耐性チェック
    if (this.resistance && attackElement === this.resistance) {
      // 耐性がある属性からの攻撃は1ダメージに軽減
      const reducedDamage = 1;
      this.health -= reducedDamage;
      if (this.health <= 0) {
        this.health = 0;
        this.isAlive = false;
      }
      return reducedDamage;
    }

    // 通常ダメージ
    this.health -= damage;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
    }
    return damage;
  }

  /**
   * 攻撃が耐性によって軽減されるかチェック
   */
  isResistantTo(element: ElementType): boolean {
    // 物理は常に有効
    if (element === 'physical') return false;
    return this.resistance === element;
  }

  /**
   * Canvasに敵を描画
   */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    const halfSize = this.size / 2;

    // ゴースト: 半透明
    if (this.enemyType === 'ghost') {
      ctx.globalAlpha = 0.6;
    }

    // 属性耐性オーラ（耐性持ちの敵を強調）
    if (this.resistance) {
      this.drawResistanceAura(ctx);
    }

    // 凍結エフェクト
    if (this.isFrozen) {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, halfSize + 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(135, 206, 235, 0.4)';
      ctx.fill();
      ctx.strokeStyle = '#87CEEB';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 減速エフェクト
    if (this.isSlowed && !this.isFrozen) {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, halfSize + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(135, 206, 235, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // タイプ別の描画
    const displayColor = this.isFrozen ? '#87CEEB' : this.color;
    
    switch (this.enemyType) {
      case 'boss':
        // ボス: 特別な描画
        this.drawBoss(ctx, displayColor);
        break;
      case 'tank':
        // タンク: 六角形
        this.drawHexagon(ctx, displayColor);
        break;
      case 'breaker':
        // ブレイカー: 三角形（危険を示す）
        this.drawTriangle(ctx, displayColor);
        break;
      case 'ghost':
        // ゴースト: 円形
        this.drawCircle(ctx, displayColor);
        break;
      default:
        // 通常: 四角形
        this.drawSquare(ctx, displayColor);
        break;
    }

    // 属性状態アイコン（敵の右上に表示）
    if (this.status && this.status !== 'frozen') {
      this.drawStatusIcon(ctx);
    }

    // 耐性アイコン（敵の左上に表示）
    if (this.resistance) {
      this.drawResistanceIcon(ctx);
    }

    // タイプアイコン（敵の中央）
    ctx.font = `${Math.floor(this.size * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(this.typeConfig.icon, this.position.x, this.position.y);

    // HPバー（敵の上に表示）
    const barWidth = this.size;
    const barHeight = 4;
    const barY = this.position.y - halfSize - 8;
    const healthRatio = this.health / this.maxHealth;

    // HPバー背景
    ctx.fillStyle = '#333';
    ctx.fillRect(this.position.x - halfSize, barY, barWidth, barHeight);

    // HPバー（残りHP）
    ctx.fillStyle = healthRatio > 0.5 ? '#2ecc71' : healthRatio > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(this.position.x - halfSize, barY, barWidth * healthRatio, barHeight);

    // ゴースト: 透明度を戻す
    if (this.enemyType === 'ghost') {
      ctx.globalAlpha = 1.0;
    }
  }

  /**
   * 四角形を描画（通常敵）
   */
  private drawSquare(ctx: CanvasRenderingContext2D, color: string): void {
    const halfSize = this.size / 2;
    ctx.fillStyle = color;
    ctx.fillRect(
      this.position.x - halfSize,
      this.position.y - halfSize,
      this.size,
      this.size
    );
    ctx.strokeStyle = this.getDarkerColor(color);
    ctx.lineWidth = 2;
    ctx.strokeRect(
      this.position.x - halfSize,
      this.position.y - halfSize,
      this.size,
      this.size
    );
  }

  /**
   * 六角形を描画（タンク）
   */
  private drawHexagon(ctx: CanvasRenderingContext2D, color: string): void {
    const radius = this.size / 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = this.position.x + radius * Math.cos(angle);
      const y = this.position.y + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = this.getDarkerColor(color);
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  /**
   * 三角形を描画（ブレイカー）
   */
  private drawTriangle(ctx: CanvasRenderingContext2D, color: string): void {
    const halfSize = this.size / 2;
    ctx.beginPath();
    ctx.moveTo(this.position.x, this.position.y - halfSize);
    ctx.lineTo(this.position.x + halfSize, this.position.y + halfSize);
    ctx.lineTo(this.position.x - halfSize, this.position.y + halfSize);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = this.getDarkerColor(color);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * 円形を描画（ゴースト）
   */
  private drawCircle(ctx: CanvasRenderingContext2D, color: string): void {
    const radius = this.size / 2;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = this.getDarkerColor(color);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * ボスを描画（特別な見た目）
   */
  private drawBoss(ctx: CanvasRenderingContext2D, color: string): void {
    const radius = this.size / 2;
    const time = Date.now() / 1000;
    const pulse = 1 + Math.sin(time * 2) * 0.1;

    // 脈動するオーラ
    const auraRadius = radius * 1.5 * pulse;
    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, radius,
      this.position.x, this.position.y, auraRadius
    );
    gradient.addColorStop(0, 'rgba(192, 57, 43, 0.6)');
    gradient.addColorStop(0.5, 'rgba(192, 57, 43, 0.3)');
    gradient.addColorStop(1, 'rgba(192, 57, 43, 0)');
    
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, auraRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 本体（八角形）
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i - Math.PI / 8;
      const x = this.position.x + radius * Math.cos(angle);
      const y = this.position.y + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    
    // 金色の縁取り
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 内側の装飾
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, radius * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * 属性耐性オーラを描画
   */
  private drawResistanceAura(ctx: CanvasRenderingContext2D): void {
    if (!this.resistance) return;

    const halfSize = this.size / 2;
    const auraRadius = halfSize + 12;
    const time = Date.now() / 1000;
    const pulse = 0.7 + Math.sin(time * 3) * 0.3; // 脈動効果

    let auraColor: string;
    let auraGradientStart: string;
    let auraGradientEnd: string;

    switch (this.resistance) {
      case 'fire':
        auraColor = `rgba(231, 76, 60, ${0.4 * pulse})`;
        auraGradientStart = 'rgba(231, 76, 60, 0.6)';
        auraGradientEnd = 'rgba(231, 76, 60, 0)';
        break;
      case 'ice':
        auraColor = `rgba(52, 152, 219, ${0.4 * pulse})`;
        auraGradientStart = 'rgba(52, 152, 219, 0.6)';
        auraGradientEnd = 'rgba(52, 152, 219, 0)';
        break;
      case 'lightning':
        auraColor = `rgba(241, 196, 15, ${0.4 * pulse})`;
        auraGradientStart = 'rgba(241, 196, 15, 0.6)';
        auraGradientEnd = 'rgba(241, 196, 15, 0)';
        break;
      default:
        return;
    }

    // オーラ（放射状グラデーション）
    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, halfSize,
      this.position.x, this.position.y, auraRadius
    );
    gradient.addColorStop(0, auraGradientStart);
    gradient.addColorStop(1, auraGradientEnd);

    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, auraRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 内側の輪郭
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, halfSize + 3, 0, Math.PI * 2);
    ctx.strokeStyle = auraColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * 耐性アイコンを描画（盾マーク）
   */
  private drawResistanceIcon(ctx: CanvasRenderingContext2D): void {
    if (!this.resistance) return;

    const halfSize = this.size / 2;
    const iconX = this.position.x - halfSize - 2;
    const iconY = this.position.y - halfSize - 2;

    // 盾の背景
    ctx.beginPath();
    ctx.arc(iconX, iconY, 9, 0, Math.PI * 2);
    
    let bgColor: string;
    switch (this.resistance) {
      case 'fire':
        bgColor = 'rgba(231, 76, 60, 0.9)';
        break;
      case 'ice':
        bgColor = 'rgba(52, 152, 219, 0.9)';
        break;
      case 'lightning':
        bgColor = 'rgba(241, 196, 15, 0.9)';
        break;
      default:
        bgColor = 'rgba(100, 100, 100, 0.9)';
    }
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 盾アイコン
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('🛡️', iconX, iconY);
  }

  /**
   * 属性状態アイコンを描画
   */
  private drawStatusIcon(ctx: CanvasRenderingContext2D): void {
    if (!this.status) return;

    const halfSize = this.size / 2;
    const iconX = this.position.x + halfSize - 4;
    const iconY = this.position.y - halfSize - 4;

    // 背景円
    ctx.beginPath();
    ctx.arc(iconX, iconY, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();

    // アイコン
    let icon = '';
    switch (this.status) {
      case 'fire':
        icon = ELEMENT_CONFIGS.fire.icon;
        break;
      case 'ice':
        icon = ELEMENT_CONFIGS.ice.icon;
        break;
      case 'lightning':
        icon = ELEMENT_CONFIGS.lightning.icon;
        break;
      case 'oil':
        icon = '🛢️';
        break;
    }

    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(icon, iconX, iconY);
  }

  /**
   * 色を少し暗くする
   */
  private getDarkerColor(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    const r = Math.floor(parseInt(hex.substring(0, 2), 16) * 0.7);
    const g = Math.floor(parseInt(hex.substring(2, 4), 16) * 0.7);
    const b = Math.floor(parseInt(hex.substring(4, 6), 16) * 0.7);
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * 敵の中心位置を取得
   */
  getCenter(): Position {
    return { ...this.position };
  }
}
