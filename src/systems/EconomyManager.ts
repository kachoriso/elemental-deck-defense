import { ECONOMY_CONFIG, ArtifactEffectType, ARTIFACT_CONFIGS, ElementType } from '../types';

/**
 * 経済システム管理クラス
 * トークンの入手・消費・利子を管理
 */
export class EconomyManager {
  private tokens: number;
  private interestRate: number;
  private maxInterest: number;
  
  // アーティファクト効果
  private artifacts: Map<ArtifactEffectType, number>;

  constructor() {
    this.tokens = ECONOMY_CONFIG.INITIAL_TOKENS;
    this.interestRate = ECONOMY_CONFIG.INTEREST_RATE;
    this.maxInterest = ECONOMY_CONFIG.MAX_INTEREST;
    this.artifacts = new Map();
  }

  /**
   * 現在のトークン数を取得
   */
  getTokens(): number {
    return this.tokens;
  }

  /**
   * トークンを追加
   */
  addTokens(amount: number): void {
    this.tokens += amount;
  }

  /**
   * トークンを消費
   * @returns 消費成功かどうか
   */
  spendTokens(amount: number): boolean {
    if (this.tokens < amount) {
      return false;
    }
    this.tokens -= amount;
    return true;
  }

  /**
   * 購入可能かチェック
   */
  canAfford(price: number): boolean {
    return this.tokens >= price;
  }

  /**
   * 敵撃破時のドロップ判定
   * @returns ドロップしたトークン数（0ならドロップなし）
   */
  tryEnemyDrop(): number {
    if (Math.random() < ECONOMY_CONFIG.ENEMY_DROP_CHANCE) {
      const amount = ECONOMY_CONFIG.ENEMY_DROP_AMOUNT;
      this.tokens += amount;
      return amount;
    }
    return 0;
  }

  /**
   * ウェーブクリアボーナスを付与
   * @returns 獲得したトークン数（ボーナス + 利子）
   */
  applyWaveClearBonus(): { base: number; interest: number; total: number } {
    const base = ECONOMY_CONFIG.WAVE_CLEAR_BONUS;
    const interest = Math.min(
      Math.floor(this.tokens * this.interestRate),
      this.maxInterest
    );
    
    this.tokens += base + interest;
    
    return { base, interest, total: base + interest };
  }

  /**
   * アーティファクトを追加
   */
  addArtifact(effect: ArtifactEffectType): void {
    const config = ARTIFACT_CONFIGS[effect];
    const currentValue = this.artifacts.get(effect) || 0;
    this.artifacts.set(effect, currentValue + config.value);
    
    // 利子率アップの場合は直接適用
    if (effect === 'interest_rate_up') {
      this.interestRate += config.value;
    }
  }

  /**
   * 特定属性のダメージ倍率を取得
   */
  getDamageMultiplier(element?: ElementType): number {
    let multiplier = 1.0;
    
    // 全体ダメージアップ
    multiplier += this.artifacts.get('all_damage_up') || 0;
    
    // 属性別ダメージアップ
    if (element) {
      switch (element) {
        case 'fire':
          multiplier += this.artifacts.get('fire_damage_up') || 0;
          break;
        case 'ice':
          multiplier += this.artifacts.get('ice_damage_up') || 0;
          break;
        case 'lightning':
          multiplier += this.artifacts.get('lightning_damage_up') || 0;
          break;
      }
    }
    
    return multiplier;
  }

  /**
   * タワーHPボーナスを取得
   */
  getTowerHPMultiplier(): number {
    return 1.0 + (this.artifacts.get('tower_hp_up') || 0);
  }

  /**
   * ショップ選択肢の追加数を取得（Expansion Pack効果）
   */
  getShopExpansion(): number {
    return Math.floor(this.artifacts.get('expansion_pack') || 0);
  }

  /**
   * レアリティボーナスを取得（VIP Membership効果）
   */
  getRarityBonus(): number {
    return this.artifacts.get('vip_membership') || 0;
  }

  /**
   * リサイクル機能が有効かどうか
   */
  hasRecycleBin(): boolean {
    return (this.artifacts.get('recycle_bin') || 0) > 0;
  }

  /**
   * カード破棄時のToken獲得量を計算
   */
  getRecycleTokens(isSpell: boolean): number {
    if (!this.hasRecycleBin()) return 0;
    // スペルカードは高めに設定
    return isSpell ? ECONOMY_CONFIG.RECYCLE_TOKEN_BASE + 5 : ECONOMY_CONFIG.RECYCLE_TOKEN_BASE;
  }

  /**
   * 所持アーティファクト一覧を取得
   */
  getArtifacts(): Map<ArtifactEffectType, number> {
    return new Map(this.artifacts);
  }

  /**
   * アーティファクト数を取得
   */
  getArtifactCount(): number {
    return this.artifacts.size;
  }

  /**
   * リセット（ニューゲーム時）
   */
  reset(): void {
    this.tokens = ECONOMY_CONFIG.INITIAL_TOKENS;
    this.interestRate = ECONOMY_CONFIG.INTEREST_RATE;
    this.artifacts.clear();
  }
}
