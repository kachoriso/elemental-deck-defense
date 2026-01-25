import { 
  Position, 
  ElementType, 
  StatusType, 
  ReactionType, 
  REACTION_CONFIGS,
  ReactionConfig
} from '../types';
import { Enemy } from '../entities/Enemy';

/**
 * 元素反応の結果
 */
export interface ReactionResult {
  type: ReactionType;
  config: ReactionConfig;
  position: Position;
  damage: number;
  affectedEnemies: Enemy[];  // 爆発などで影響を受けた敵
}

/**
 * 元素反応システム
 * 敵の属性状態と攻撃属性の組み合わせによる特殊効果を処理
 */
export class ReactionSystem {
  
  /**
   * 攻撃が敵に当たった時の元素反応をチェック・実行
   * @param enemy 攻撃を受けた敵
   * @param attackElement 攻撃の属性
   * @param baseDamage 基本ダメージ
   * @param allEnemies 全ての敵（爆発用）
   * @returns 反応結果（反応が起きなければnull）
   */
  checkAndTriggerReaction(
    enemy: Enemy,
    attackElement: ElementType,
    baseDamage: number,
    allEnemies: Enemy[]
  ): ReactionResult | null {
    const currentStatus = enemy.status;
    
    if (!currentStatus) {
      // 状態がない場合は属性を付与して終了
      enemy.applyStatus(attackElement as StatusType);
      return null;
    }

    // 各反応をチェック
    for (const [reactionType, config] of Object.entries(REACTION_CONFIGS)) {
      const [requiredStatus, requiredAttack] = config.trigger;
      
      if (currentStatus === requiredStatus && attackElement === requiredAttack) {
        // 反応発動！
        return this.executeReaction(
          reactionType as ReactionType,
          config,
          enemy,
          baseDamage,
          allEnemies
        );
      }
    }

    // 反応が起きなければ、新しい属性で上書き
    enemy.applyStatus(attackElement as StatusType);
    return null;
  }

  /**
   * 元素反応を実行
   */
  private executeReaction(
    type: ReactionType,
    config: ReactionConfig,
    enemy: Enemy,
    baseDamage: number,
    allEnemies: Enemy[]
  ): ReactionResult {
    const position = enemy.getCenter();
    const affectedEnemies: Enemy[] = [enemy];
    let totalDamage = baseDamage;

    switch (type) {
      case 'melt':
        // 融解: 大ダメージを与え、状態を解除
        totalDamage = Math.floor(baseDamage * (config.damageMultiplier || 3));
        enemy.takeDamage(totalDamage);
        enemy.clearStatus();
        break;

      case 'freeze':
        // 凍結: 敵を一定時間停止
        enemy.freeze(config.freezeDuration || 2000);
        enemy.clearStatus();
        break;

      case 'explosion':
        // 爆発: 範囲内の敵全員にダメージ
        totalDamage = Math.floor(baseDamage * (config.damageMultiplier || 1.5));
        const radius = config.explosionRadius || 80;
        
        // 範囲内の敵を探す
        for (const otherEnemy of allEnemies) {
          if (!otherEnemy.isAlive) continue;
          
          const otherPos = otherEnemy.getCenter();
          const dx = otherPos.x - position.x;
          const dy = otherPos.y - position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance <= radius) {
            // 距離に応じてダメージ減衰
            const damageRatio = 1 - (distance / radius) * 0.5;
            const explosionDamage = Math.floor(totalDamage * damageRatio);
            otherEnemy.takeDamage(explosionDamage);
            
            if (!affectedEnemies.includes(otherEnemy)) {
              affectedEnemies.push(otherEnemy);
            }
            
            // オイル状態を解除
            if (otherEnemy.status === 'oil') {
              otherEnemy.clearStatus();
            }
          }
        }
        
        // 元の敵のオイル状態も解除
        enemy.clearStatus();
        break;
    }

    return {
      type,
      config,
      position,
      damage: totalDamage,
      affectedEnemies,
    };
  }

  /**
   * 反応タイプからアイコンを取得
   */
  getReactionIcon(type: ReactionType): string {
    return REACTION_CONFIGS[type].icon;
  }

  /**
   * 反応タイプから名前を取得
   */
  getReactionName(type: ReactionType): string {
    return REACTION_CONFIGS[type].name;
  }

  /**
   * 反応タイプから色を取得
   */
  getReactionColor(type: ReactionType): string {
    return REACTION_CONFIGS[type].color;
  }
}
