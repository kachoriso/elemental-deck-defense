import {
  ElementType,
  EnemyType,
  ArtifactEffectType,
  EncyclopediaData,
  TowerEncyclopediaEntry,
  EnemyEncyclopediaEntry,
  ArtifactEncyclopediaEntry,
  ENCYCLOPEDIA_CONFIG,
  TOWER_DETAILS,
  ENEMY_DETAILS,
  ARTIFACT_DETAILS,
  TowerDetailInfo,
  EnemyDetailInfo,
  ArtifactDetailInfo,
  BASE_ELEMENTS,
  ENEMY_TYPE_CONFIGS,
  ARTIFACT_CONFIGS,
} from '../types';

/**
 * 図鑑管理クラス
 * プレイヤーが遭遇したタワー、敵、アーティファクトを記録
 */
export class EncyclopediaManager {
  private data: EncyclopediaData;

  constructor() {
    this.data = this.loadData();
  }

  /**
   * ローカルストレージからデータを読み込む
   */
  private loadData(): EncyclopediaData {
    try {
      const saved = localStorage.getItem(ENCYCLOPEDIA_CONFIG.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as EncyclopediaData;
        if (this.isValidData(parsed)) {
          return this.migrateData(parsed);
        }
      }
    } catch (e) {
      console.warn('図鑑データの読み込みに失敗しました:', e);
    }

    return this.createInitialData();
  }

  /**
   * データのバリデーション
   */
  private isValidData(data: unknown): data is EncyclopediaData {
    if (!data || typeof data !== 'object') return false;
    const d = data as EncyclopediaData;
    return (
      typeof d.towers === 'object' &&
      typeof d.enemies === 'object' &&
      typeof d.artifacts === 'object'
    );
  }

  /**
   * 新しい要素が追加された場合のマイグレーション
   */
  private migrateData(data: EncyclopediaData): EncyclopediaData {
    const initial = this.createInitialData();

    // 新しいタワー属性を追加
    for (const element of Object.keys(initial.towers) as ElementType[]) {
      if (!data.towers[element]) {
        data.towers[element] = initial.towers[element];
      }
    }

    // 新しい敵タイプを追加
    for (const type of Object.keys(initial.enemies) as EnemyType[]) {
      if (!data.enemies[type]) {
        data.enemies[type] = initial.enemies[type];
      }
    }

    // 新しいアーティファクトを追加
    for (const effect of Object.keys(initial.artifacts) as ArtifactEffectType[]) {
      if (!data.artifacts[effect]) {
        data.artifacts[effect] = initial.artifacts[effect];
      }
    }

    return data;
  }

  /**
   * 初期データを作成
   */
  private createInitialData(): EncyclopediaData {
    const towers: Record<ElementType, TowerEncyclopediaEntry> = {} as Record<ElementType, TowerEncyclopediaEntry>;
    const enemies: Record<EnemyType, EnemyEncyclopediaEntry> = {} as Record<EnemyType, EnemyEncyclopediaEntry>;
    const artifacts: Record<ArtifactEffectType, ArtifactEncyclopediaEntry> = {} as Record<ArtifactEffectType, ArtifactEncyclopediaEntry>;

    // タワー（全ての属性）
    const allElements: ElementType[] = ['fire', 'ice', 'lightning', 'poison', 'light', 'arcane'];
    for (const element of allElements) {
      towers[element] = {
        element,
        // 基本属性は最初から発見済み
        discovered: BASE_ELEMENTS.includes(element),
        timesPlaced: 0,
        maxLevelReached: 0,
        totalDamageDealt: 0,
      };
    }

    // 敵（全てのタイプ）
    const allEnemyTypes = Object.keys(ENEMY_TYPE_CONFIGS) as EnemyType[];
    for (const type of allEnemyTypes) {
      enemies[type] = {
        type,
        discovered: false,
        timesEncountered: 0,
        timesDefeated: 0,
      };
    }

    // アーティファクト（全ての効果）
    const allArtifacts = Object.keys(ARTIFACT_CONFIGS) as ArtifactEffectType[];
    for (const effect of allArtifacts) {
      artifacts[effect] = {
        effect,
        discovered: false,
        timesObtained: 0,
      };
    }

    return { towers, enemies, artifacts };
  }

  /**
   * データを保存
   */
  private saveData(): void {
    try {
      localStorage.setItem(ENCYCLOPEDIA_CONFIG.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('図鑑データの保存に失敗しました:', e);
    }
  }

  /**
   * データをリセット
   */
  reset(): void {
    this.data = this.createInitialData();
    this.saveData();
  }

  // ============================
  // タワー記録
  // ============================

  /**
   * タワーを配置したことを記録
   */
  recordTowerPlaced(element: ElementType): void {
    const entry = this.data.towers[element];
    if (entry) {
      entry.discovered = true;
      entry.timesPlaced++;
      if (entry.maxLevelReached === 0) {
        entry.maxLevelReached = 1;
      }
      this.saveData();
    }
  }

  /**
   * タワーがレベルアップしたことを記録
   */
  recordTowerLevelUp(element: ElementType, newLevel: number): void {
    const entry = this.data.towers[element];
    if (entry && newLevel > entry.maxLevelReached) {
      entry.maxLevelReached = newLevel;
      this.saveData();
    }
  }

  /**
   * タワーが与えたダメージを記録
   */
  recordTowerDamage(element: ElementType, damage: number): void {
    const entry = this.data.towers[element];
    if (entry) {
      entry.totalDamageDealt += damage;
      // 頻繁に呼ばれるので、保存はバッチで行う（ゲーム終了時など）
    }
  }

  /**
   * タワーのエントリーを取得
   */
  getTowerEntry(element: ElementType): TowerEncyclopediaEntry | undefined {
    return this.data.towers[element];
  }

  /**
   * タワーの詳細情報を取得
   */
  getTowerDetail(element: ElementType): TowerDetailInfo | undefined {
    return TOWER_DETAILS[element];
  }

  /**
   * 全てのタワーエントリーを取得
   */
  getAllTowerEntries(): { entry: TowerEncyclopediaEntry; detail: TowerDetailInfo }[] {
    return (Object.keys(this.data.towers) as ElementType[]).map(element => ({
      entry: this.data.towers[element],
      detail: TOWER_DETAILS[element],
    }));
  }

  // ============================
  // 敵記録
  // ============================

  /**
   * 敵と遭遇したことを記録
   */
  recordEnemyEncountered(type: EnemyType): void {
    const entry = this.data.enemies[type];
    if (entry) {
      entry.discovered = true;
      entry.timesEncountered++;
      // 頻繁に呼ばれるので、保存はバッチで行う
    }
  }

  /**
   * 敵を倒したことを記録
   */
  recordEnemyDefeated(type: EnemyType): void {
    const entry = this.data.enemies[type];
    if (entry) {
      entry.timesDefeated++;
      // 頻繁に呼ばれるので、保存はバッチで行う
    }
  }

  /**
   * 敵のエントリーを取得
   */
  getEnemyEntry(type: EnemyType): EnemyEncyclopediaEntry | undefined {
    return this.data.enemies[type];
  }

  /**
   * 敵の詳細情報を取得
   */
  getEnemyDetail(type: EnemyType): EnemyDetailInfo | undefined {
    return ENEMY_DETAILS[type];
  }

  /**
   * 全ての敵エントリーを取得
   */
  getAllEnemyEntries(): { entry: EnemyEncyclopediaEntry; detail: EnemyDetailInfo }[] {
    return (Object.keys(this.data.enemies) as EnemyType[]).map(type => ({
      entry: this.data.enemies[type],
      detail: ENEMY_DETAILS[type],
    }));
  }

  // ============================
  // アーティファクト記録
  // ============================

  /**
   * アーティファクトを入手したことを記録
   */
  recordArtifactObtained(effect: ArtifactEffectType): void {
    const entry = this.data.artifacts[effect];
    if (entry) {
      entry.discovered = true;
      entry.timesObtained++;
      this.saveData();
    }
  }

  /**
   * アーティファクトのエントリーを取得
   */
  getArtifactEntry(effect: ArtifactEffectType): ArtifactEncyclopediaEntry | undefined {
    return this.data.artifacts[effect];
  }

  /**
   * アーティファクトの詳細情報を取得
   */
  getArtifactDetail(effect: ArtifactEffectType): ArtifactDetailInfo | undefined {
    return ARTIFACT_DETAILS[effect];
  }

  /**
   * 全てのアーティファクトエントリーを取得
   */
  getAllArtifactEntries(): { entry: ArtifactEncyclopediaEntry; detail: ArtifactDetailInfo }[] {
    return (Object.keys(this.data.artifacts) as ArtifactEffectType[]).map(effect => ({
      entry: this.data.artifacts[effect],
      detail: ARTIFACT_DETAILS[effect],
    }));
  }

  // ============================
  // 統計
  // ============================

  /**
   * 発見率を取得
   */
  getDiscoveryStats(): {
    towers: { discovered: number; total: number };
    enemies: { discovered: number; total: number };
    artifacts: { discovered: number; total: number };
    overall: { discovered: number; total: number };
  } {
    const towerEntries = Object.values(this.data.towers);
    const enemyEntries = Object.values(this.data.enemies);
    const artifactEntries = Object.values(this.data.artifacts);

    const towers = {
      discovered: towerEntries.filter(e => e.discovered).length,
      total: towerEntries.length,
    };

    const enemies = {
      discovered: enemyEntries.filter(e => e.discovered).length,
      total: enemyEntries.length,
    };

    const artifacts = {
      discovered: artifactEntries.filter(e => e.discovered).length,
      total: artifactEntries.length,
    };

    return {
      towers,
      enemies,
      artifacts,
      overall: {
        discovered: towers.discovered + enemies.discovered + artifacts.discovered,
        total: towers.total + enemies.total + artifacts.total,
      },
    };
  }

  /**
   * バッチ保存（ゲーム終了時に呼び出す）
   */
  saveAll(): void {
    this.saveData();
  }
}
