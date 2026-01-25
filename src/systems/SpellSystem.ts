import { Position, SpellType, SPELL_CONFIGS } from '../types';
import { Enemy } from '../entities/Enemy';

/**
 * スペル発動結果
 */
export interface SpellResult {
  spellType: SpellType;
  position: Position;
  affectedEnemies: Enemy[];
  totalDamage: number;
}

/**
 * スペルシステム
 * スペルカードの発動と効果を処理
 */
export class SpellSystem {
  // スペル使用回数管理（ウェーブごと）
  private spellUsageCounts: Map<SpellType, number> = new Map();
  
  constructor() {
    this.resetUsageCounts();
  }

  /**
   * ウェーブ開始時に使用回数をリセット
   */
  resetUsageCounts(): void {
    this.spellUsageCounts.clear();
    for (const spellType of Object.keys(SPELL_CONFIGS) as SpellType[]) {
      this.spellUsageCounts.set(spellType, 0);
    }
  }

  /**
   * スペルが使用可能かチェック
   */
  canUseSpell(spellType: SpellType): boolean {
    const config = SPELL_CONFIGS[spellType];
    const usedCount = this.spellUsageCounts.get(spellType) || 0;
    return usedCount < config.cooldown;
  }

  /**
   * スペルの残り使用回数を取得
   */
  getRemainingUses(spellType: SpellType): number {
    const config = SPELL_CONFIGS[spellType];
    const usedCount = this.spellUsageCounts.get(spellType) || 0;
    return Math.max(0, config.cooldown - usedCount);
  }

  /**
   * スペルを発動
   */
  castSpell(
    spellType: SpellType,
    targetPosition: Position,
    allEnemies: Enemy[]
  ): SpellResult | null {
    if (!this.canUseSpell(spellType)) {
      return null;
    }

    const config = SPELL_CONFIGS[spellType];
    const affectedEnemies: Enemy[] = [];
    let totalDamage = 0;

    switch (spellType) {
      case 'meteor':
        // メテオ: 指定範囲にダメージ
        for (const enemy of allEnemies) {
          if (!enemy.isAlive) continue;
          
          const pos = enemy.getCenter();
          const dx = pos.x - targetPosition.x;
          const dy = pos.y - targetPosition.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance <= config.radius) {
            // 距離に応じてダメージ減衰
            const damageRatio = 1 - (distance / config.radius) * 0.5;
            const damage = Math.floor((config.damage || 0) * damageRatio);
            enemy.takeDamage(damage);
            totalDamage += damage;
            affectedEnemies.push(enemy);
            
            // 火属性を付与
            enemy.applyStatus('fire');
          }
        }
        break;

      case 'blizzard':
        // ブリザード: 全体減速 + 氷属性付与
        for (const enemy of allEnemies) {
          if (!enemy.isAlive) continue;
          
          enemy.applySlow(config.slowDuration || 3000, config.slowMultiplier || 0.4);
          
          if (config.appliesStatus) {
            enemy.applyStatus(config.appliesStatus);
          }
          
          affectedEnemies.push(enemy);
        }
        break;

      case 'oil_bomb':
        // オイルボム: 範囲にオイル状態を付与 + 小ダメージ
        for (const enemy of allEnemies) {
          if (!enemy.isAlive) continue;
          
          const pos = enemy.getCenter();
          const dx = pos.x - targetPosition.x;
          const dy = pos.y - targetPosition.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance <= config.radius) {
            const damage = config.damage || 0;
            enemy.takeDamage(damage);
            totalDamage += damage;
            
            if (config.appliesStatus) {
              enemy.applyStatus(config.appliesStatus);
            }
            
            affectedEnemies.push(enemy);
          }
        }
        break;
    }

    // 使用回数をインクリメント
    const currentCount = this.spellUsageCounts.get(spellType) || 0;
    this.spellUsageCounts.set(spellType, currentCount + 1);

    return {
      spellType,
      position: targetPosition,
      affectedEnemies,
      totalDamage,
    };
  }

  /**
   * スペルの効果範囲を描画（プレビュー用）
   */
  drawSpellPreview(
    ctx: CanvasRenderingContext2D,
    spellType: SpellType,
    position: Position
  ): void {
    const config = SPELL_CONFIGS[spellType];
    
    if (spellType === 'blizzard') {
      // ブリザードは全画面なのでプレビュー不要
      return;
    }

    // 範囲円を描画
    ctx.beginPath();
    ctx.arc(position.x, position.y, config.radius, 0, Math.PI * 2);
    ctx.fillStyle = `${config.color}30`;
    ctx.fill();
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // アイコンを中央に表示
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(config.icon, position.x, position.y);
  }

  /**
   * スペル発動エフェクトを描画
   */
  drawSpellEffect(
    ctx: CanvasRenderingContext2D,
    spellType: SpellType,
    position: Position,
    progress: number // 0-1のアニメーション進行度
  ): void {
    const config = SPELL_CONFIGS[spellType];

    switch (spellType) {
      case 'meteor':
        // メテオ: 落下する火球と爆発
        const impactRadius = config.radius * (1 + progress * 0.3);
        
        // 爆発波
        ctx.beginPath();
        ctx.arc(position.x, position.y, impactRadius * progress, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 100, 50, ${1 - progress})`;
        ctx.lineWidth = 5;
        ctx.stroke();
        
        // 中心の炎
        if (progress < 0.5) {
          ctx.beginPath();
          ctx.arc(position.x, position.y, 20 * (1 - progress * 2), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 200, 50, ${1 - progress * 2})`;
          ctx.fill();
        }
        break;

      case 'blizzard':
        // ブリザード: 画面全体に雪のエフェクト
        ctx.fillStyle = `rgba(135, 206, 235, ${0.3 * (1 - progress)})`;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        break;

      case 'oil_bomb':
        // オイルボム: 黒い液体が広がるエフェクト
        const oilRadius = config.radius * progress;
        
        ctx.beginPath();
        ctx.arc(position.x, position.y, oilRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(50, 30, 20, ${0.5 * (1 - progress)})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(100, 60, 30, ${1 - progress})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        break;
    }
  }
}
