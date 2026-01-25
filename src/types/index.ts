/**
 * ゲーム内で使用する型定義
 */

// 2D座標を表す型
export interface Position {
  x: number;
  y: number;
}

// ==============================
// シーン管理
// ==============================

// アプリケーションのシーン
export type SceneType = 'title' | 'game' | 'grimoire' | 'upgrades' | 'settings' | 'archives';

// ゲーム内の状態（GameシーンでのみSub-state）
export type GameState = 'idle' | 'playing' | 'paused' | 'gameover' | 'shop';

// ==============================
// Meta Progression (永続アンロック)
// ==============================

// プレイヤー進捗データ
export interface PlayerProgress {
  rank: number;
  totalXP: number;
  highestWave: number;
  totalGamesPlayed: number;
  totalTokensEarned: number;       // 累計獲得Token
  permanentTokens: number;         // 永続強化用Token
  unlockedElements: ElementType[];
  unlockedMaps: MapType[];
  unlockedStarterDecks: StarterDeckType[];
  permanentUpgrades: PermanentUpgradeState;  // 永続強化の状態
  matchHistory: MatchHistoryEntry[];          // 戦歴
}

// マップタイプ
export type MapType = 'fortress' | 'desert' | 'snowfield' | 'volcano';

// スターターデッキタイプ
export type StarterDeckType = 'balanced' | 'fire' | 'ice' | 'lightning';

// アンロック情報
export interface UnlockInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredRank: number;
  type: 'element' | 'map' | 'starter_deck' | 'feature';
  unlockData?: ElementType | MapType | StarterDeckType;
}

// ランク設定
export interface RankConfig {
  rank: number;
  name: string;
  xpRequired: number;
  unlocks: string[]; // UnlockInfo.id の配列
}

// ==============================
// 永続強化システム (Permanent Upgrades)
// ==============================

// 永続強化タイプ
export type PermanentUpgradeType = 
  | 'starting_gold'
  | 'base_hp'
  | 'reroll_discount'
  | 'rare_chance'
  | 'tower_damage'
  | 'tower_range'
  | 'elemental_mastery'
  | 'start_with_fire';

// 永続強化の状態（各強化のレベル）
export interface PermanentUpgradeState {
  starting_gold: number;    // Lv (0-5)
  base_hp: number;          // Lv (0-5)
  reroll_discount: number;  // Lv (0-3)
  rare_chance: number;      // Lv (0-5)
  tower_damage: number;     // Lv (0-5)
  tower_range: number;      // Lv (0-3)
  elemental_mastery: number;  // Lv (0-5) 属性タワーダメージ+10%/Lv
  start_with_fire: number;    // Lv (0-1) 初期デッキに火タワー追加
}

// 永続強化の設定
export interface PermanentUpgradeConfig {
  id: PermanentUpgradeType;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  baseCost: number;           // 基本コスト
  costMultiplier: number;     // レベルごとのコスト増加倍率
  effectPerLevel: number;     // レベルごとの効果量
  effectType: 'flat' | 'percent';  // 固定値か割合か
}

// 永続強化設定マップ
export const PERMANENT_UPGRADE_CONFIGS: Record<PermanentUpgradeType, PermanentUpgradeConfig> = {
  starting_gold: {
    id: 'starting_gold',
    name: '初期Token増加',
    description: 'ゲーム開始時のToken',
    icon: '💰',
    maxLevel: 5,
    baseCost: 100,
    costMultiplier: 1.5,
    effectPerLevel: 10,
    effectType: 'flat',
  },
  base_hp: {
    id: 'base_hp',
    name: '拠点HP増加',
    description: '拠点の最大HP',
    icon: '❤️',
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 1.5,
    effectPerLevel: 50,
    effectType: 'flat',
  },
  reroll_discount: {
    id: 'reroll_discount',
    name: 'リロール割引',
    description: 'リロールコスト軽減',
    icon: '🔄',
    maxLevel: 3,
    baseCost: 200,
    costMultiplier: 2.0,
    effectPerLevel: 10,
    effectType: 'percent',
  },
  rare_chance: {
    id: 'rare_chance',
    name: 'レア出現率UP',
    description: 'レアカード出現率',
    icon: '✨',
    maxLevel: 5,
    baseCost: 250,
    costMultiplier: 1.8,
    effectPerLevel: 5,
    effectType: 'percent',
  },
  tower_damage: {
    id: 'tower_damage',
    name: 'タワー攻撃力UP',
    description: '全タワーの基本攻撃力',
    icon: '⚔️',
    maxLevel: 5,
    baseCost: 300,
    costMultiplier: 1.6,
    effectPerLevel: 5,
    effectType: 'percent',
  },
  tower_range: {
    id: 'tower_range',
    name: 'タワー射程UP',
    description: '全タワーの射程',
    icon: '🎯',
    maxLevel: 3,
    baseCost: 350,
    costMultiplier: 2.0,
    effectPerLevel: 10,
    effectType: 'flat',
  },
  elemental_mastery: {
    id: 'elemental_mastery',
    name: '属性マスタリー',
    description: '属性タワーのダメージ',
    icon: '🔥❄️⚡',
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.7,
    effectPerLevel: 10,
    effectType: 'percent',
  },
  start_with_fire: {
    id: 'start_with_fire',
    name: '火の恵み',
    description: '初期デッキに火タワー+1',
    icon: '🔥',
    maxLevel: 1,
    baseCost: 300,
    costMultiplier: 1.0,
    effectPerLevel: 1,
    effectType: 'flat',
  },
};

// ==============================
// 戦歴システム (Match History)
// ==============================

// 戦歴エントリー
export interface MatchHistoryEntry {
  id: string;                    // ユニークID
  date: string;                  // ISO日時文字列
  waveReached: number;           // 到達ウェーブ
  enemiesKilled: number;         // 撃破数
  tokensEarned: number;          // 獲得Token
  xpEarned: number;              // 獲得XP
  score: number;                 // スコア
  mainTowers: ElementType[];     // 使用したメインタワー（上位3つ）
  duration: number;              // プレイ時間（秒）
}

// 戦歴設定
export const MATCH_HISTORY_CONFIG = {
  MAX_ENTRIES: 10,  // 最大保存件数
} as const;

// Meta Progression設定
export const META_CONFIG = {
  STORAGE_KEY: 'elemental_deck_defense_progress',
  XP_PER_WAVE: 100,
  XP_PER_KILL: 5,
  XP_BONUS_MULTIPLIER: 1.5, // クリア時ボーナス
  MAX_RANK: 10,
} as const;

// ランク定義
export const RANK_CONFIGS: RankConfig[] = [
  { rank: 1, name: '新米守護者', xpRequired: 0, unlocks: [] },
  { rank: 2, name: '見習い魔術師', xpRequired: 500, unlocks: ['element_poison', 'element_light'] },
  { rank: 3, name: '守備隊長', xpRequired: 1500, unlocks: ['map_desert', 'map_snowfield'] },
  { rank: 4, name: '精鋭術師', xpRequired: 3000, unlocks: ['feature_reroll_start'] },
  { rank: 5, name: '要塞指揮官', xpRequired: 5000, unlocks: ['starter_fire', 'starter_ice', 'starter_lightning'] },
  { rank: 6, name: '元素の使い手', xpRequired: 8000, unlocks: ['map_volcano'] },
  { rank: 7, name: '伝説の守護者', xpRequired: 12000, unlocks: ['feature_extra_hand'] },
  { rank: 8, name: '大魔導師', xpRequired: 17000, unlocks: ['element_arcane'] },
  { rank: 9, name: '不滅の英雄', xpRequired: 25000, unlocks: ['feature_starting_bonus'] },
  { rank: 10, name: '世界の守護神', xpRequired: 40000, unlocks: ['feature_master_mode'] },
];

// アンロック定義
export const UNLOCK_CONFIGS: Record<string, UnlockInfo> = {
  // 新属性
  element_poison: {
    id: 'element_poison',
    name: '毒属性',
    description: '敵に継続ダメージを与える毒タワー',
    icon: '☠️',
    requiredRank: 2,
    type: 'element',
    unlockData: 'poison' as ElementType,
  },
  element_light: {
    id: 'element_light',
    name: '光属性',
    description: '広範囲を照らし敵を減速させる光タワー',
    icon: '✨',
    requiredRank: 2,
    type: 'element',
    unlockData: 'light' as ElementType,
  },
  element_arcane: {
    id: 'element_arcane',
    name: '秘術属性',
    description: '全属性の力を宿す究極のタワー',
    icon: '🔮',
    requiredRank: 8,
    type: 'element',
    unlockData: 'arcane' as ElementType,
  },
  // マップ
  map_desert: {
    id: 'map_desert',
    name: '砂漠マップ',
    description: '広大な砂漠での戦い',
    icon: '🏜️',
    requiredRank: 3,
    type: 'map',
    unlockData: 'desert' as MapType,
  },
  map_snowfield: {
    id: 'map_snowfield',
    name: '雪原マップ',
    description: '凍てつく雪原での戦い',
    icon: '❄️',
    requiredRank: 3,
    type: 'map',
    unlockData: 'snowfield' as MapType,
  },
  map_volcano: {
    id: 'map_volcano',
    name: '火山マップ',
    description: '灼熱の火山での戦い',
    icon: '🌋',
    requiredRank: 6,
    type: 'map',
    unlockData: 'volcano' as MapType,
  },
  // スターターデッキ
  starter_fire: {
    id: 'starter_fire',
    name: '炎のデッキ',
    description: '火属性に特化した初期デッキ',
    icon: '🔥',
    requiredRank: 5,
    type: 'starter_deck',
    unlockData: 'fire' as StarterDeckType,
  },
  starter_ice: {
    id: 'starter_ice',
    name: '氷のデッキ',
    description: '氷属性に特化した初期デッキ',
    icon: '❄️',
    requiredRank: 5,
    type: 'starter_deck',
    unlockData: 'ice' as StarterDeckType,
  },
  starter_lightning: {
    id: 'starter_lightning',
    name: '雷のデッキ',
    description: '雷属性に特化した初期デッキ',
    icon: '⚡',
    requiredRank: 5,
    type: 'starter_deck',
    unlockData: 'lightning' as StarterDeckType,
  },
  // 機能
  feature_reroll_start: {
    id: 'feature_reroll_start',
    name: '開始時リロール',
    description: 'ゲーム開始時に手札をリロール可能',
    icon: '🔄',
    requiredRank: 4,
    type: 'feature',
  },
  feature_extra_hand: {
    id: 'feature_extra_hand',
    name: '初期手札+1',
    description: '初期手札サイズが+1',
    icon: '🃏',
    requiredRank: 7,
    type: 'feature',
  },
  feature_starting_bonus: {
    id: 'feature_starting_bonus',
    name: '初期ボーナス',
    description: 'ゲーム開始時に50 Token獲得',
    icon: '💰',
    requiredRank: 9,
    type: 'feature',
  },
  feature_master_mode: {
    id: 'feature_master_mode',
    name: 'マスターモード',
    description: '超高難易度モードが解放',
    icon: '💀',
    requiredRank: 10,
    type: 'feature',
  },
};

// ==============================
// 経済システム
// ==============================

// ショップアイテムのタイプ
export type ShopItemType = 
  | 'new_card' 
  | 'hand_size_up' 
  | 'reroll_token' 
  | 'base_repair' 
  | 'artifact'
  | 'tower_upgrade'
  | 'expansion_pack'
  | 'vip_membership'
  | 'recycle_bin';

// アーティファクト効果タイプ
export type ArtifactEffectType = 
  | 'fire_damage_up' 
  | 'ice_damage_up' 
  | 'lightning_damage_up'
  | 'all_damage_up'
  | 'tower_hp_up'
  | 'interest_rate_up'
  | 'expansion_pack'
  | 'vip_membership'
  | 'recycle_bin';

// ショップアイテム
export interface ShopItem {
  id: string;
  type: ShopItemType;
  name: string;
  description: string;
  icon: string;
  price: number;
  // 追加データ
  cardType?: 'tower' | 'spell';
  element?: ElementType;
  spellType?: SpellType;
  artifactEffect?: ArtifactEffectType;
  artifactValue?: number;
}

// 経済設定
export const ECONOMY_CONFIG = {
  INITIAL_TOKENS: 0,
  WAVE_CLEAR_BONUS: 50,
  ENEMY_DROP_CHANCE: 0.1, // 10%
  ENEMY_DROP_AMOUNT: 5,
  INTEREST_RATE: 0.1, // 10%
  MAX_INTEREST: 30,
  SHOP_REROLL_COST: 10,
  SHOP_ITEMS_COUNT: 4,
  // 手札補充設定
  ENEMIES_PER_CARD_REFILL: 5, // 5体撃破ごとにカード補充
  RECYCLE_TOKEN_BASE: 10, // カード破棄時の基本Token
} as const;

// ショップアイテム価格
export const SHOP_PRICES = {
  new_card: 50,
  hand_size_up: 150,
  reroll_token: 30,
  base_repair: 20,
  artifact: 200,
  tower_upgrade: 80,
  expansion_pack: 120,
  vip_membership: 180,
  recycle_bin: 100,
} as const;

// アーティファクト設定
export const ARTIFACT_CONFIGS: Record<ArtifactEffectType, { name: string; description: string; icon: string; value: number }> = {
  fire_damage_up: { name: '炎の印章', description: '火属性ダメージ+25%', icon: '🔥', value: 0.25 },
  ice_damage_up: { name: '氷の印章', description: '氷属性ダメージ+25%', icon: '❄️', value: 0.25 },
  lightning_damage_up: { name: '雷の印章', description: '雷属性ダメージ+25%', icon: '⚡', value: 0.25 },
  all_damage_up: { name: '戦神の加護', description: '全ダメージ+15%', icon: '⚔️', value: 0.15 },
  tower_hp_up: { name: '鉄壁の守り', description: 'タワーHP+50%', icon: '🛡️', value: 0.5 },
  expansion_pack: { name: '拡張パック', description: 'ショップ選択肢+1', icon: '📦', value: 1 },
  vip_membership: { name: 'VIPメンバーシップ', description: 'レア出現率+15%', icon: '👑', value: 0.15 },
  recycle_bin: { name: 'リサイクルビン', description: 'カード破棄時Token獲得', icon: '♻️', value: 1 },
  interest_rate_up: { name: '商人の知恵', description: '利子率+5%', icon: '💰', value: 0.05 },
};

// ==============================
// ローグライト報酬システム
// ==============================

// 報酬のレアリティ
export type RewardRarity = 'common' | 'rare' | 'epic';

// 報酬のタイプ
export type RewardType = 'new_card' | 'upgrade' | 'heal';

// 報酬アイテムの基本インターフェース
export interface RewardItem {
  id: string;
  type: RewardType;
  rarity: RewardRarity;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// 新カード報酬
export interface NewCardReward extends RewardItem {
  type: 'new_card';
  cardType: CardType;
  element?: ElementType;    // タワーカードの場合
  spellType?: SpellType;    // スペルカードの場合
}

// アップグレード報酬
export interface UpgradeReward extends RewardItem {
  type: 'upgrade';
  upgradeType: 'damage' | 'range' | 'fire_rate' | 'all_damage';
  targetElement?: ElementType;  // 特定属性の場合
  value: number;                // アップグレード量（倍率または固定値）
}

// 回復報酬
export interface HealReward extends RewardItem {
  type: 'heal';
  healAmount: number;
}

// 報酬のユニオン型
export type Reward = NewCardReward | UpgradeReward | HealReward;

// レアリティの設定
export const RARITY_CONFIGS: Record<RewardRarity, { name: string; color: string; weight: number }> = {
  common: { name: 'コモン', color: '#aaaaaa', weight: 70 },
  rare: { name: 'レア', color: '#4a90d9', weight: 25 },
  epic: { name: 'エピック', color: '#9b59b6', weight: 5 },
};

// デッキカードの定義（デッキに入るカードの重み付け）
export interface DeckCard {
  id: string;
  cardType: CardType;
  element?: ElementType;
  spellType?: SpellType;
  count: number;  // このカードの枚数（重み）
}

// プレイヤーのアップグレード状態
export interface PlayerUpgrades {
  damageBonus: Record<ElementType, number>;  // 属性ごとのダメージボーナス（倍率）
  rangeBonus: number;                         // 射程ボーナス
  fireRateBonus: number;                      // 発射速度ボーナス（倍率、低いほど速い）
  allDamageBonus: number;                     // 全属性ダメージボーナス（倍率）
}

// グリッドのセル情報
export interface GridCell {
  row: number;
  col: number;
  isPath: boolean;      // パス上かどうか
  isOccupied: boolean;  // タワーが配置されているか
}

// 属性タイプ（基本 + アンロック可能）
export type ElementType = 'physical' | 'fire' | 'ice' | 'lightning' | 'poison' | 'light' | 'arcane';

// 物理属性（無属性、初期デッキ用）
export const PHYSICAL_ELEMENT: ElementType = 'physical';

// 属性タワー（元素属性のみ、物理を除く）
export const ELEMENTAL_ELEMENTS: ElementType[] = ['fire', 'ice', 'lightning'];

// 基本属性（初期から使用可能 - ショップ用）
export const BASE_ELEMENTS: ElementType[] = ['physical', 'fire', 'ice', 'lightning'];

// 特殊状態タイプ（オイルなど）
export type StatusType = ElementType | 'oil' | 'frozen';

// 属性ごとの設定
export interface ElementConfig {
  name: string;
  color: string;
  borderColor: string;
  projectileColor: string;
  icon: string;
}

// 元素反応タイプ
export type ReactionType = 'melt' | 'freeze' | 'explosion';

// 元素反応の設定
export interface ReactionConfig {
  name: string;
  description: string;
  trigger: [StatusType, ElementType]; // [敵の現在状態, 攻撃属性]
  icon: string;
  color: string;
  damageMultiplier?: number;     // ダメージ倍率
  freezeDuration?: number;       // 凍結時間（ms）
  explosionRadius?: number;      // 爆発半径
}

// 元素反応設定マップ
export const REACTION_CONFIGS: Record<ReactionType, ReactionConfig> = {
  melt: {
    name: 'MELT!',
    description: '融解: 大ダメージを与える',
    trigger: ['ice', 'fire'],
    icon: '💧🔥',
    color: '#ff9800',
    damageMultiplier: 3.0,
  },
  freeze: {
    name: 'FREEZE!',
    description: '凍結: 2秒間動きを止める',
    trigger: ['ice', 'lightning'],
    icon: '❄️⚡',
    color: '#00bcd4',
    freezeDuration: 2000,
  },
  explosion: {
    name: 'EXPLOSION!',
    description: '爆発: 周囲にダメージ',
    trigger: ['oil', 'fire'],
    icon: '💥',
    color: '#ff5722',
    damageMultiplier: 1.5,
    explosionRadius: 80,
  },
};

// カードタイプ
export type CardType = 'tower' | 'spell';

// スペルタイプ
export type SpellType = 'meteor' | 'blizzard' | 'oil_bomb';

// スペル設定
export interface SpellConfig {
  name: string;
  description: string;
  icon: string;
  color: string;
  borderColor: string;
  radius: number;            // 効果範囲
  damage?: number;           // ダメージ
  slowDuration?: number;     // 遅延効果時間（ms）
  slowMultiplier?: number;   // 速度倍率
  appliesStatus?: StatusType; // 付与する状態
  cooldown: number;          // クールダウン（1ウェーブあたりの使用回数）
}

// スペル設定マップ
export const SPELL_CONFIGS: Record<SpellType, SpellConfig> = {
  meteor: {
    name: 'メテオ',
    description: '指定範囲に大ダメージ',
    icon: '☄️',
    color: '#e74c3c',
    borderColor: '#c0392b',
    radius: 60,
    damage: 200,
    cooldown: 2,
  },
  blizzard: {
    name: 'ブリザード',
    description: '全体を3秒間減速',
    icon: '🌨️',
    color: '#3498db',
    borderColor: '#2980b9',
    radius: 9999, // 全画面
    slowDuration: 3000,
    slowMultiplier: 0.4,
    appliesStatus: 'ice',
    cooldown: 1,
  },
  oil_bomb: {
    name: 'オイルボム',
    description: '範囲にオイル状態を付与',
    icon: '🛢️',
    color: '#6b4423',
    borderColor: '#3d2817',
    radius: 70,
    damage: 30,
    appliesStatus: 'oil',
    cooldown: 3,
  },
};

// 属性設定マップ
export const ELEMENT_CONFIGS: Record<ElementType, ElementConfig> = {
  // 物理属性（無属性）
  physical: {
    name: '物理',
    color: '#7f8c8d',
    borderColor: '#5d6d7e',
    projectileColor: '#95a5a6',
    icon: '🏹',
  },
  fire: {
    name: '火',
    color: '#e74c3c',
    borderColor: '#c0392b',
    projectileColor: '#ff6b4a',
    icon: '🔥',
  },
  ice: {
    name: '氷',
    color: '#3498db',
    borderColor: '#2980b9',
    projectileColor: '#74b9ff',
    icon: '❄️',
  },
  lightning: {
    name: '雷',
    color: '#f1c40f',
    borderColor: '#d4a800',
    projectileColor: '#fff176',
    icon: '⚡',
  },
  // アンロック属性
  poison: {
    name: '毒',
    color: '#27ae60',
    borderColor: '#1e8449',
    projectileColor: '#58d68d',
    icon: '☠️',
  },
  light: {
    name: '光',
    color: '#f8e71c',
    borderColor: '#d4c100',
    projectileColor: '#fff9c4',
    icon: '✨',
  },
  arcane: {
    name: '秘術',
    color: '#9b59b6',
    borderColor: '#7d3c98',
    projectileColor: '#bb8fce',
    icon: '🔮',
  },
};

// レベルごとの色の濃さ調整
export const LEVEL_COLOR_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 0.8,  // 20%濃く
  3: 0.6,  // 40%濃く
};

// レベルごとのサイズ増加
export const LEVEL_SIZE_BONUS: Record<number, number> = {
  1: 0,
  2: 4,   // +4px
  3: 8,   // +8px
};

// シナジータイプ
export type SynergyType = 'fire_ice' | 'ice_lightning' | 'lightning_fire';

// シナジー効果の設定
export interface SynergyEffect {
  name: string;
  description: string;
  sourceElement: ElementType;
  requiredElement: ElementType;
  damageMultiplier: number;
  icon: string;
}

// シナジー設定マップ
export const SYNERGY_CONFIGS: Record<SynergyType, SynergyEffect> = {
  fire_ice: {
    name: '蒸気爆発',
    description: '火の攻撃力2倍',
    sourceElement: 'fire',
    requiredElement: 'ice',
    damageMultiplier: 2.0,
    icon: '💨',
  },
  ice_lightning: {
    name: '凍結雷撃',
    description: '氷の攻撃力1.5倍',
    sourceElement: 'ice',
    requiredElement: 'lightning',
    damageMultiplier: 1.5,
    icon: '⚡❄️',
  },
  lightning_fire: {
    name: '炎雷',
    description: '雷の攻撃力1.5倍',
    sourceElement: 'lightning',
    requiredElement: 'fire',
    damageMultiplier: 1.5,
    icon: '🔥⚡',
  },
};

// タワーの最大レベル
export const MAX_TOWER_LEVEL = 3;

// ==============================
// 敵タイプシステム
// ==============================

// 敵のタイプ
export type EnemyType = 'normal' | 'tank' | 'breaker' | 'ghost' | 'boss';

// 敵タイプの設定
export interface EnemyTypeConfig {
  name: string;
  baseHealth: number;
  baseSpeed: number;
  size: number;
  color: string;
  attackDamage: number;      // タワーへのダメージ
  attackCooldown: number;    // 攻撃間隔（ms）
  evasionChance: number;     // 回避率（0-1）
  priority: number;          // ターゲット優先度（高いほど狙われやすい）
  ignoresPath: boolean;      // パスを無視するか（飛行タイプ）
  targetsNearestTower: boolean; // 最寄りタワーを狙うか
  icon: string;
  isBoss?: boolean;          // ボスかどうか
  ccImmunity?: number;       // CC（凍結等）免疫率（0-1）
  skillCooldown?: number;    // スキル使用間隔（ms）
}

// 敵タイプ設定マップ
export const ENEMY_TYPE_CONFIGS: Record<EnemyType, EnemyTypeConfig> = {
  normal: {
    name: '通常',
    baseHealth: 80,
    baseSpeed: 1.5,
    size: 24,
    color: '#e74c3c',
    attackDamage: 5,
    attackCooldown: 2000,
    evasionChance: 0,
    priority: 1,
    ignoresPath: false,
    targetsNearestTower: false,
    icon: '👹',
  },
  tank: {
    name: 'タンク',
    baseHealth: 250,
    baseSpeed: 0.8,
    size: 32,
    color: '#8e44ad',
    attackDamage: 15,
    attackCooldown: 3000,
    evasionChance: 0,
    priority: 3, // 優先的に狙われる
    ignoresPath: false,
    targetsNearestTower: false,
    icon: '🛡️',
  },
  breaker: {
    name: 'ブレイカー',
    baseHealth: 40,
    baseSpeed: 2.0,
    size: 22,
    color: '#e67e22',
    attackDamage: 80, // 自爆ダメージ（高い）
    attackCooldown: 500,
    evasionChance: 0,
    priority: 2,
    ignoresPath: false,
    targetsNearestTower: true, // タワーを狙う
    icon: '💣',
  },
  ghost: {
    name: 'ゴースト',
    baseHealth: 60,
    baseSpeed: 1.2,
    size: 26,
    color: '#9b59b6',
    attackDamage: 8,
    attackCooldown: 2500,
    evasionChance: 0.5, // 50%回避
    priority: 1,
    ignoresPath: true, // パスを無視
    targetsNearestTower: false,
    icon: '👻',
  },
  boss: {
    name: 'ボス',
    baseHealth: 2000,     // 雑魚の約25倍
    baseSpeed: 0.5,       // 非常にゆっくり
    size: 60,             // 巨大
    color: '#c0392b',
    attackDamage: 30,
    attackCooldown: 4000,
    evasionChance: 0,
    priority: 5,          // 最優先ターゲット
    ignoresPath: false,
    targetsNearestTower: false,
    icon: '👑',
    isBoss: true,
    ccImmunity: 0.8,      // CC効果80%軽減
    skillCooldown: 5000,  // 5秒ごとにスキル発動
  },
};

// 敵の設定（後方互換用）
export interface EnemyConfig {
  speed: number;
  health: number;
  size: number;
  color: string;
}

// タワーの設定
export interface TowerConfig {
  element: ElementType;
  range: number;        // 攻撃範囲（ピクセル）
  fireRate: number;     // 発射間隔（ミリ秒）
  damage: number;       // ダメージ量
  size: number;
}

// カード設定
export interface CardConfig {
  id: string;
  element: ElementType;
}

// 弾の設定
export interface ProjectileConfig {
  speed: number;
  size: number;
  color: string;
  damage: number;
}

// ゲーム定数
export const GAME_CONFIG = {
  CANVAS_WIDTH: 600,
  CANVAS_HEIGHT: 600,
  GRID_SIZE: 40,        // 1セルのサイズ（ピクセル）
  GRID_COLS: 15,        // 600 / 40 = 15
  GRID_ROWS: 15,
  BASE_ROW: 7,          // 中央拠点の行（0-indexed、中央）
  BASE_COL: 7,          // 中央拠点の列
  PATH_COLOR: '#2a2a3d',
  GRID_COLOR: '#1f1f2e',
  BACKGROUND_COLOR: '#12121a',
  BASE_COLOR: '#4a90d9',
} as const;

// パスルートのインデックス
export type RouteIndex = 0 | 1 | 2 | 3;
export const ROUTE_NAMES: Record<RouteIndex, string> = {
  0: '左上',
  1: '右上',
  2: '左下',
  3: '右下',
};

// ルートごとのスポーン色（視覚的な区別用）
export const ROUTE_COLORS: Record<RouteIndex, string> = {
  0: '#e74c3c', // 赤
  1: '#9b59b6', // 紫
  2: '#27ae60', // 緑
  3: '#e67e22', // オレンジ
};

// デフォルトの敵設定
export const DEFAULT_ENEMY_CONFIG: EnemyConfig = {
  speed: 1.5,
  health: 100,
  size: 30,
  color: '#e74c3c',
};

// 属性別のタワー設定を生成（レベル対応）
// 属性別の基本ダメージ設定
// 物理: 安定した中ダメージ
// 属性: 低ダメージだがシナジーで強化
export const ELEMENT_BASE_DAMAGE: Record<ElementType, number> = {
  physical: 40,   // 物理は安定
  fire: 28,       // 属性は弱め (40 * 0.7 = 28)
  ice: 28,
  lightning: 28,
  poison: 28,
  light: 28,
  arcane: 28,
};

export const getTowerConfigByElement = (element: ElementType, level: number = 1): TowerConfig => {
  const baseDamage = ELEMENT_BASE_DAMAGE[element];
  
  return {
    element,
    range: 120 + (level - 1) * 20,          // レベルごとに射程+20
    fireRate: Math.max(500, 1000 - (level - 1) * 200), // レベルごとに発射間隔-200ms（最小500ms）
    damage: baseDamage * level,              // レベルごとにダメージ倍増
    size: 30 + LEVEL_SIZE_BONUS[level],      // レベルごとにサイズ増加
  };
};

// デフォルトのタワー設定（後方互換性のため）
export const DEFAULT_TOWER_CONFIG: TowerConfig = getTowerConfigByElement('physical');

// 手札関連の設定
export const HAND_CONFIG = {
  CARD_WIDTH: 100,
  CARD_HEIGHT: 140,
  CARD_GAP: 20,
  HAND_SIZE: 3,           // 初期手札サイズ（序盤は厳しい）
  MAX_HAND_SIZE: 7,       // 最大手札サイズ
  SPELL_CHANCE: 0.3,      // スペルカードの出現確率
} as const;

// デフォルトの弾設定
export const DEFAULT_PROJECTILE_CONFIG: ProjectileConfig = {
  speed: 8,
  size: 6,
  color: '#f1c40f',
  damage: 50,
};

// ==============================
// 図鑑システム (Encyclopedia)
// ==============================

// 図鑑のカテゴリー
export type EncyclopediaCategoryType = 'towers' | 'enemies' | 'artifacts';

// タワー図鑑エントリー
export interface TowerEncyclopediaEntry {
  element: ElementType;
  discovered: boolean;
  timesPlaced: number;
  maxLevelReached: number;
  totalDamageDealt: number;
}

// 敵図鑑エントリー
export interface EnemyEncyclopediaEntry {
  type: EnemyType;
  discovered: boolean;
  timesEncountered: number;
  timesDefeated: number;
}

// アーティファクト図鑑エントリー
export interface ArtifactEncyclopediaEntry {
  effect: ArtifactEffectType;
  discovered: boolean;
  timesObtained: number;
}

// 図鑑データ全体
export interface EncyclopediaData {
  towers: Record<ElementType, TowerEncyclopediaEntry>;
  enemies: Record<EnemyType, EnemyEncyclopediaEntry>;
  artifacts: Record<ArtifactEffectType, ArtifactEncyclopediaEntry>;
}

// タワー詳細情報（表示用）
export interface TowerDetailInfo {
  element: ElementType;
  name: string;
  icon: string;
  color: string;
  description: string;
  flavorText: string;
  baseStats: {
    damage: number;
    range: number;
    fireRate: number;
  };
}

// 敵詳細情報（表示用）
export interface EnemyDetailInfo {
  type: EnemyType;
  name: string;
  icon: string;
  color: string;
  description: string;
  flavorText: string;
  weakness: string;
  baseStats: {
    health: number;
    speed: number;
    attackDamage: number;
  };
}

// アーティファクト詳細情報（表示用）
export interface ArtifactDetailInfo {
  effect: ArtifactEffectType;
  name: string;
  icon: string;
  description: string;
  flavorText: string;
}

// タワー詳細定義
export const TOWER_DETAILS: Record<ElementType, TowerDetailInfo> = {
  physical: {
    element: 'physical',
    name: '弓矢タワー',
    icon: '🏹',
    color: '#7f8c8d',
    description: '特殊効果を持たないシンプルなタワー。安定したダメージを与える。',
    flavorText: '「派手さはないが、確実に仕事をこなす」 - 衛兵長マーカス',
    baseStats: { damage: 40, range: 120, fireRate: 1000 },
  },
  fire: {
    element: 'fire',
    name: '炎のタワー',
    icon: '🔥',
    color: '#e74c3c',
    description: '敵に炎属性を付与するタワー。氷との融解反応で大ダメージ。',
    flavorText: '「燃え上がれ、我が魂よ！」 - 火炎術師ジェイク',
    baseStats: { damage: 28, range: 120, fireRate: 1000 },
  },
  ice: {
    element: 'ice',
    name: '氷のタワー',
    icon: '❄️',
    color: '#3498db',
    description: '攻撃した敵を減速させるタワー。火との融解、雷との凍結反応。',
    flavorText: '「永久凍土の力、今ここに」 - 氷結師エレナ',
    baseStats: { damage: 28, range: 130, fireRate: 1100 },
  },
  lightning: {
    element: 'lightning',
    name: '雷のタワー',
    icon: '⚡',
    color: '#f1c40f',
    description: '高速で攻撃するタワー。氷との凍結反応で敵を完全停止。',
    flavorText: '「稲妻の如く速く、雷鳴の如く強く」 - 雷撃師ボルト',
    baseStats: { damage: 28, range: 110, fireRate: 700 },
  },
  poison: {
    element: 'poison',
    name: '毒のタワー',
    icon: '☠️',
    color: '#27ae60',
    description: '敵に継続ダメージを与える毒状態を付与するタワー。',
    flavorText: '「一滴でも触れれば、命は蝕まれる」 - 毒術師ヴェノム',
    baseStats: { damage: 30, range: 100, fireRate: 1200 },
  },
  light: {
    element: 'light',
    name: '光のタワー',
    icon: '✨',
    color: '#f8e71c',
    description: '広範囲の敵を照らして減速させるタワー。',
    flavorText: '「闇を払い、道を照らす」 - 聖光師ルミナ',
    baseStats: { damage: 25, range: 150, fireRate: 1000 },
  },
  arcane: {
    element: 'arcane',
    name: '秘術のタワー',
    icon: '🔮',
    color: '#9b59b6',
    description: '全属性の力を宿す究極のタワー。全ての反応を引き起こせる。',
    flavorText: '「あらゆる元素は、一つに還る」 - 大魔導師アルケイン',
    baseStats: { damage: 60, range: 140, fireRate: 900 },
  },
};

// 敵詳細定義
export const ENEMY_DETAILS: Record<EnemyType, EnemyDetailInfo> = {
  normal: {
    type: 'normal',
    name: '通常の敵',
    icon: '👹',
    color: '#e74c3c',
    description: '特に能力を持たない標準的な敵。',
    flavorText: '群れをなして押し寄せる、無数の魔物たち。',
    weakness: '特になし',
    baseStats: { health: 80, speed: 1.5, attackDamage: 5 },
  },
  tank: {
    type: 'tank',
    name: 'タンク',
    icon: '🛡️',
    color: '#8e44ad',
    description: '高いHPを持ち、移動は遅いが非常に頑丈。',
    flavorText: '鋼鉄の鎧に身を包み、どんな攻撃も恐れない。',
    weakness: '氷属性で減速させ、集中攻撃',
    baseStats: { health: 250, speed: 0.8, attackDamage: 15 },
  },
  breaker: {
    type: 'breaker',
    name: 'ブレイカー',
    icon: '💣',
    color: '#e67e22',
    description: 'タワーに向かって突進し、接触すると自爆する危険な敵。',
    flavorText: '爆発に命を捧げた狂信者。近づいてはならない。',
    weakness: '遠距離から速攻で撃破',
    baseStats: { health: 40, speed: 2.0, attackDamage: 80 },
  },
  ghost: {
    type: 'ghost',
    name: 'ゴースト',
    icon: '👻',
    color: '#9b59b6',
    description: 'パスを無視して直接拠点に向かう。物理攻撃を回避する。',
    flavorText: '幽体となった者は、壁すらすり抜ける。',
    weakness: '元素攻撃で確実にダメージ',
    baseStats: { health: 60, speed: 1.2, attackDamage: 8 },
  },
  boss: {
    type: 'boss',
    name: '魔王',
    icon: '👑',
    color: '#c0392b',
    description: '10ウェーブごとに出現する強大な敵。CC耐性を持ち、特殊能力を使う。',
    flavorText: '「我は破壊の化身なり。ひれ伏せ、愚かな者どもよ！」',
    weakness: '物理と属性を組み合わせ、持久戦で削る',
    baseStats: { health: 2000, speed: 0.5, attackDamage: 30 },
  },
};

// アーティファクト詳細定義
export const ARTIFACT_DETAILS: Record<ArtifactEffectType, ArtifactDetailInfo> = {
  fire_damage_up: {
    effect: 'fire_damage_up',
    name: '炎の印章',
    icon: '🔥',
    description: '火属性タワーのダメージを25%上昇させる。',
    flavorText: '太古の炎を封じた紋章。持つ者に火の力を与える。',
  },
  ice_damage_up: {
    effect: 'ice_damage_up',
    name: '氷の印章',
    icon: '❄️',
    description: '氷属性タワーのダメージを25%上昇させる。',
    flavorText: '永久凍土の結晶。決して溶けることはない。',
  },
  lightning_damage_up: {
    effect: 'lightning_damage_up',
    name: '雷の印章',
    icon: '⚡',
    description: '雷属性タワーのダメージを25%上昇させる。',
    flavorText: '雷雲から落ちた稲妻の欠片。今も微弱な電流が流れる。',
  },
  all_damage_up: {
    effect: 'all_damage_up',
    name: '戦神の加護',
    icon: '⚔️',
    description: '全てのタワーのダメージを15%上昇させる。',
    flavorText: '戦の神アレスの祝福。勝利を約束する。',
  },
  tower_hp_up: {
    effect: 'tower_hp_up',
    name: '鉄壁の守り',
    icon: '🛡️',
    description: '全てのタワーの耐久力を50%上昇させる。',
    flavorText: '古代の防壁から削り出された石片。不屈の守りを授ける。',
  },
  interest_rate_up: {
    effect: 'interest_rate_up',
    name: '商人の知恵',
    icon: '💰',
    description: 'ウェーブクリア時の利子率を5%上昇させる。',
    flavorText: '富を増やす秘訣は、お金を眠らせないこと。',
  },
  expansion_pack: {
    effect: 'expansion_pack',
    name: '拡張パック',
    icon: '📦',
    description: 'ショップの選択肢が1つ増える。',
    flavorText: '選択肢が増えることは、常に良いことだ。',
  },
  vip_membership: {
    effect: 'vip_membership',
    name: 'VIPメンバーシップ',
    icon: '👑',
    description: 'レアアイテムの出現率が15%上昇する。',
    flavorText: '特別な待遇を受ける権利。高級品が手に入りやすくなる。',
  },
  recycle_bin: {
    effect: 'recycle_bin',
    name: 'リサイクルビン',
    icon: '♻️',
    description: 'カードを捨てた時にTokenを獲得する。',
    flavorText: '捨てるものにも価値がある。それを活かすのが知恵。',
  },
};

// 図鑑設定
export const ENCYCLOPEDIA_CONFIG = {
  STORAGE_KEY: 'elemental_deck_defense_encyclopedia',
} as const;

// ==============================
// 設定システム (Settings)
// ==============================

// ゲーム設定
export interface GameSettings {
  masterVolume: number;       // 0-100
  sfxVolume: number;          // 0-100
  bgmVolume: number;          // 0-100
  showDamageNumbers: boolean;
  showParticles: boolean;
  showSynergyPreview: boolean;
}

// 設定のデフォルト値
export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 80,
  sfxVolume: 80,
  bgmVolume: 60,
  showDamageNumbers: true,
  showParticles: true,
  showSynergyPreview: true,
};

// 設定の設定
export const SETTINGS_CONFIG = {
  STORAGE_KEY: 'elemental_deck_defense_settings',
} as const;
