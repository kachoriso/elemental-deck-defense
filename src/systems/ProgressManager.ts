import {
  PlayerProgress,
  ElementType,
  MapType,
  StarterDeckType,
  META_CONFIG,
  RANK_CONFIGS,
  UNLOCK_CONFIGS,
  UnlockInfo,
  RankConfig,
  BASE_ELEMENTS,
  PermanentUpgradeType,
  PermanentUpgradeState,
  PermanentUpgradeConfig,
  PERMANENT_UPGRADE_CONFIGS,
  MatchHistoryEntry,
  MATCH_HISTORY_CONFIG,
} from '../types';

/**
 * Meta Progression管理クラス
 * プレイヤーの永続的な進捗とアンロックを管理
 */
export class ProgressManager {
  private progress: PlayerProgress;

  constructor() {
    this.progress = this.loadProgress();
  }

  /**
   * ローカルストレージから進捗を読み込む
   */
  private loadProgress(): PlayerProgress {
    try {
      const saved = localStorage.getItem(META_CONFIG.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PlayerProgress;
        // バリデーション
        if (this.isValidProgress(parsed)) {
          // 古いデータをマイグレーション
          return this.migrateProgress(parsed);
        }
      }
    } catch (e) {
      console.warn('進捗データの読み込みに失敗しました:', e);
    }
    
    return this.createInitialProgress();
  }

  /**
   * 進捗データのバリデーション
   */
  private isValidProgress(data: unknown): data is PlayerProgress {
    if (!data || typeof data !== 'object') return false;
    const p = data as PlayerProgress;
    return (
      typeof p.rank === 'number' &&
      typeof p.totalXP === 'number' &&
      typeof p.highestWave === 'number' &&
      typeof p.totalGamesPlayed === 'number' &&
      Array.isArray(p.unlockedElements) &&
      Array.isArray(p.unlockedMaps) &&
      Array.isArray(p.unlockedStarterDecks)
    );
  }

  /**
   * 古いデータを新形式にマイグレーション
   */
  private migrateProgress(data: PlayerProgress): PlayerProgress {
    // 新しいフィールドがない場合はデフォルト値を設定
    if (typeof data.totalTokensEarned !== 'number') {
      data.totalTokensEarned = 0;
    }
    if (typeof data.permanentTokens !== 'number') {
      data.permanentTokens = 0;
    }
    if (!data.permanentUpgrades) {
      data.permanentUpgrades = this.createInitialUpgradeState();
    }
    if (!Array.isArray(data.matchHistory)) {
      data.matchHistory = [];
    }
    return data;
  }

  /**
   * 初期進捗を作成
   */
  private createInitialProgress(): PlayerProgress {
    return {
      rank: 1,
      totalXP: 0,
      highestWave: 0,
      totalGamesPlayed: 0,
      totalTokensEarned: 0,
      permanentTokens: 0,
      unlockedElements: [...BASE_ELEMENTS],
      unlockedMaps: ['fortress'],
      unlockedStarterDecks: ['balanced'],
      permanentUpgrades: this.createInitialUpgradeState(),
      matchHistory: [],
    };
  }

  /**
   * 初期永続強化状態を作成
   */
  private createInitialUpgradeState(): PermanentUpgradeState {
    return {
      starting_gold: 0,
      base_hp: 0,
      reroll_discount: 0,
      rare_chance: 0,
      tower_damage: 0,
      tower_range: 0,
      elemental_mastery: 0,
      start_with_fire: 0,
    };
  }

  /**
   * 進捗をローカルストレージに保存
   */
  private saveProgress(): void {
    try {
      localStorage.setItem(META_CONFIG.STORAGE_KEY, JSON.stringify(this.progress));
    } catch (e) {
      console.error('進捗データの保存に失敗しました:', e);
    }
  }

  /**
   * 進捗をリセット
   */
  reset(): void {
    this.progress = this.createInitialProgress();
    this.saveProgress();
  }

  /**
   * ゲーム終了時の経験値を計算して付与
   */
  addGameResult(waveReached: number, enemiesKilled: number, isCleared: boolean): {
    xpGained: number;
    newRank: number;
    rankUp: boolean;
    newUnlocks: UnlockInfo[];
  } {
    const oldRank = this.progress.rank;
    
    // 経験値計算
    let xpGained = waveReached * META_CONFIG.XP_PER_WAVE;
    xpGained += enemiesKilled * META_CONFIG.XP_PER_KILL;
    
    if (isCleared) {
      xpGained = Math.floor(xpGained * META_CONFIG.XP_BONUS_MULTIPLIER);
    }
    
    // 経験値を追加
    this.progress.totalXP += xpGained;
    this.progress.totalGamesPlayed++;
    
    // 最高ウェーブ更新
    if (waveReached > this.progress.highestWave) {
      this.progress.highestWave = waveReached;
    }
    
    // ランクアップチェック
    const newRank = this.calculateRank(this.progress.totalXP);
    const rankUp = newRank > oldRank;
    
    // 新しいアンロックを取得
    const newUnlocks: UnlockInfo[] = [];
    if (rankUp) {
      for (let rank = oldRank + 1; rank <= newRank; rank++) {
        const rankConfig = RANK_CONFIGS.find(r => r.rank === rank);
        if (rankConfig) {
          for (const unlockId of rankConfig.unlocks) {
            const unlock = UNLOCK_CONFIGS[unlockId];
            if (unlock) {
              newUnlocks.push(unlock);
              this.applyUnlock(unlock);
            }
          }
        }
      }
      this.progress.rank = newRank;
    }
    
    this.saveProgress();
    
    return { xpGained, newRank, rankUp, newUnlocks };
  }

  /**
   * 経験値からランクを計算
   */
  private calculateRank(xp: number): number {
    let rank = 1;
    for (const config of RANK_CONFIGS) {
      if (xp >= config.xpRequired) {
        rank = config.rank;
      }
    }
    return Math.min(rank, META_CONFIG.MAX_RANK);
  }

  /**
   * アンロックを適用
   */
  private applyUnlock(unlock: UnlockInfo): void {
    switch (unlock.type) {
      case 'element':
        if (unlock.unlockData && !this.progress.unlockedElements.includes(unlock.unlockData as ElementType)) {
          this.progress.unlockedElements.push(unlock.unlockData as ElementType);
        }
        break;
      case 'map':
        if (unlock.unlockData && !this.progress.unlockedMaps.includes(unlock.unlockData as MapType)) {
          this.progress.unlockedMaps.push(unlock.unlockData as MapType);
        }
        break;
      case 'starter_deck':
        if (unlock.unlockData && !this.progress.unlockedStarterDecks.includes(unlock.unlockData as StarterDeckType)) {
          this.progress.unlockedStarterDecks.push(unlock.unlockData as StarterDeckType);
        }
        break;
    }
  }

  /**
   * 現在のランクを取得
   */
  getRank(): number {
    return this.progress.rank;
  }

  /**
   * 現在のランク設定を取得
   */
  getRankConfig(): RankConfig {
    return RANK_CONFIGS.find(r => r.rank === this.progress.rank) || RANK_CONFIGS[0];
  }

  /**
   * 次のランクまでの必要経験値を取得
   */
  getXPToNextRank(): { current: number; required: number; progress: number } {
    const currentRankConfig = RANK_CONFIGS.find(r => r.rank === this.progress.rank);
    const nextRankConfig = RANK_CONFIGS.find(r => r.rank === this.progress.rank + 1);
    
    if (!nextRankConfig) {
      // 最大ランク
      return { current: this.progress.totalXP, required: this.progress.totalXP, progress: 1 };
    }
    
    const currentThreshold = currentRankConfig?.xpRequired || 0;
    const nextThreshold = nextRankConfig.xpRequired;
    const xpInCurrentRank = this.progress.totalXP - currentThreshold;
    const xpNeededForNext = nextThreshold - currentThreshold;
    
    return {
      current: xpInCurrentRank,
      required: xpNeededForNext,
      progress: xpInCurrentRank / xpNeededForNext,
    };
  }

  /**
   * 総経験値を取得
   */
  getTotalXP(): number {
    return this.progress.totalXP;
  }

  /**
   * 最高ウェーブを取得
   */
  getHighestWave(): number {
    return this.progress.highestWave;
  }

  /**
   * 総プレイ回数を取得
   */
  getTotalGamesPlayed(): number {
    return this.progress.totalGamesPlayed;
  }

  /**
   * アンロック済み属性を取得
   */
  getUnlockedElements(): ElementType[] {
    return [...this.progress.unlockedElements];
  }

  /**
   * アンロック済みマップを取得
   */
  getUnlockedMaps(): MapType[] {
    return [...this.progress.unlockedMaps];
  }

  /**
   * アンロック済みスターターデッキを取得
   */
  getUnlockedStarterDecks(): StarterDeckType[] {
    return [...this.progress.unlockedStarterDecks];
  }

  /**
   * 特定の機能がアンロックされているか
   */
  hasFeature(featureId: string): boolean {
    const unlock = UNLOCK_CONFIGS[featureId];
    if (!unlock) return false;
    return this.progress.rank >= unlock.requiredRank;
  }

  /**
   * 全アンロック一覧を取得（解除済み/未解除を含む）
   */
  getAllUnlocks(): { unlock: UnlockInfo; isUnlocked: boolean }[] {
    return Object.values(UNLOCK_CONFIGS).map(unlock => ({
      unlock,
      isUnlocked: this.progress.rank >= unlock.requiredRank,
    }));
  }

  /**
   * 次にアンロックされる要素を取得
   */
  getNextUnlocks(): UnlockInfo[] {
    const nextRankConfig = RANK_CONFIGS.find(r => r.rank === this.progress.rank + 1);
    if (!nextRankConfig) return [];
    
    return nextRankConfig.unlocks
      .map(id => UNLOCK_CONFIGS[id])
      .filter((u): u is UnlockInfo => u !== undefined);
  }

  /**
   * 進捗をリセット（デバッグ用）
   */
  resetProgress(): void {
    this.progress = this.createInitialProgress();
    this.saveProgress();
  }

  /**
   * 進捗データを取得
   */
  getProgress(): PlayerProgress {
    return { ...this.progress };
  }

  // ==============================
  // 永続強化システム
  // ==============================

  /**
   * 永続Token（永続強化用通貨）を取得
   */
  getPermanentTokens(): number {
    return this.progress.permanentTokens;
  }

  /**
   * 累計獲得Tokenを取得
   */
  getTotalTokensEarned(): number {
    return this.progress.totalTokensEarned;
  }

  /**
   * ゲーム終了時に永続Tokenを追加
   */
  addPermanentTokens(amount: number): void {
    this.progress.permanentTokens += amount;
    this.progress.totalTokensEarned += amount;
    this.saveProgress();
  }

  /**
   * 永続強化のレベルを取得
   */
  getUpgradeLevel(upgradeType: PermanentUpgradeType): number {
    return this.progress.permanentUpgrades[upgradeType];
  }

  /**
   * 永続強化の購入コストを計算
   */
  getUpgradeCost(upgradeType: PermanentUpgradeType): number {
    const config = PERMANENT_UPGRADE_CONFIGS[upgradeType];
    const currentLevel = this.progress.permanentUpgrades[upgradeType];
    
    if (currentLevel >= config.maxLevel) {
      return Infinity;
    }
    
    return Math.floor(config.baseCost * Math.pow(config.costMultiplier, currentLevel));
  }

  /**
   * 永続強化を購入できるか
   */
  canPurchaseUpgrade(upgradeType: PermanentUpgradeType): boolean {
    const config = PERMANENT_UPGRADE_CONFIGS[upgradeType];
    const currentLevel = this.progress.permanentUpgrades[upgradeType];
    
    if (currentLevel >= config.maxLevel) {
      return false;
    }
    
    const cost = this.getUpgradeCost(upgradeType);
    return this.progress.permanentTokens >= cost;
  }

  /**
   * 永続強化を購入
   */
  purchaseUpgrade(upgradeType: PermanentUpgradeType): boolean {
    if (!this.canPurchaseUpgrade(upgradeType)) {
      return false;
    }
    
    const cost = this.getUpgradeCost(upgradeType);
    this.progress.permanentTokens -= cost;
    this.progress.permanentUpgrades[upgradeType]++;
    this.saveProgress();
    
    return true;
  }

  /**
   * 永続強化の効果値を取得
   */
  getUpgradeEffect(upgradeType: PermanentUpgradeType): number {
    const config = PERMANENT_UPGRADE_CONFIGS[upgradeType];
    const level = this.progress.permanentUpgrades[upgradeType];
    return config.effectPerLevel * level;
  }

  /**
   * 全永続強化の状態を取得
   */
  getAllUpgrades(): { config: PermanentUpgradeConfig; level: number; cost: number; canPurchase: boolean }[] {
    return (Object.keys(PERMANENT_UPGRADE_CONFIGS) as PermanentUpgradeType[]).map(type => ({
      config: PERMANENT_UPGRADE_CONFIGS[type],
      level: this.progress.permanentUpgrades[type],
      cost: this.getUpgradeCost(type),
      canPurchase: this.canPurchaseUpgrade(type),
    }));
  }

  // ==============================
  // 戦歴システム
  // ==============================

  /**
   * 戦歴を追加
   */
  addMatchHistory(entry: Omit<MatchHistoryEntry, 'id'>): void {
    const newEntry: MatchHistoryEntry = {
      ...entry,
      id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    // 先頭に追加
    this.progress.matchHistory.unshift(newEntry);
    
    // 最大件数を超えた分を削除
    if (this.progress.matchHistory.length > MATCH_HISTORY_CONFIG.MAX_ENTRIES) {
      this.progress.matchHistory = this.progress.matchHistory.slice(0, MATCH_HISTORY_CONFIG.MAX_ENTRIES);
    }
    
    this.saveProgress();
  }

  /**
   * 戦歴を取得
   */
  getMatchHistory(): MatchHistoryEntry[] {
    return [...this.progress.matchHistory];
  }

  /**
   * 戦歴をクリア
   */
  clearMatchHistory(): void {
    this.progress.matchHistory = [];
    this.saveProgress();
  }
}
