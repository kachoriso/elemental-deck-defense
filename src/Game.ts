import { GameState, GAME_CONFIG, ElementType, SpellType, SPELL_CONFIGS, EnemyType, ShopItem, ECONOMY_CONFIG, HAND_CONFIG, StarterDeckType, MapType, SceneType, ArtifactEffectType, EncyclopediaCategoryType } from './types';
import { Enemy, Tower, Projectile, Card } from './entities';
import { PathSystem, GridSystem, HandSystem, SynergySystem, ReactionSystem, SpellSystem, DeckManager, EconomyManager, ShopManager, ShopUI, ProgressManager, TitleScreen, SceneManager, EncyclopediaManager, SettingsManager } from './systems';
import { ParticleSystem, DamagePopupManager } from './effects';

/**
 * スペルエフェクトのアニメーション状態
 */
interface SpellAnimation {
  spellType: SpellType;
  position: { x: number; y: number };
  startTime: number;
  duration: number;
}

/**
 * メインゲームクラス
 * ゲームループ、状態管理、描画を統括
 * マップは「中央防衛型」で、4方向から敵が中央の拠点に向かって進む
 */
export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  // システム
  private pathSystem: PathSystem;
  private gridSystem: GridSystem;
  private handSystem: HandSystem;
  private synergySystem: SynergySystem;
  private reactionSystem: ReactionSystem;
  private spellSystem: SpellSystem;
  
  // ローグライトシステム
  private deckManager: DeckManager;
  private economyManager: EconomyManager;
  private shopManager: ShopManager;
  private shopUI: ShopUI;
  
  // Meta Progressionシステム
  private progressManager: ProgressManager;
  private titleScreen: TitleScreen;
  private sceneManager: SceneManager;
  
  // 図鑑・設定システム
  private encyclopediaManager: EncyclopediaManager;
  private settingsManager: SettingsManager;
  private currentGrimoireTab: EncyclopediaCategoryType;
  
  // 手札サイズ
  private currentHandSize: number;
  
  // ゲーム統計（経験値計算用）
  private totalEnemiesKilledThisGame: number;
  private totalTokensEarnedThisGame: number;
  private gameStartTime: number;
  private towerUsageCount: Map<ElementType, number>;
  
  // エフェクトシステム
  private particleSystem: ParticleSystem;
  private damagePopupManager: DamagePopupManager;
  
  // エンティティ
  private enemies: Enemy[];
  private towers: Tower[];
  private projectiles: Projectile[];
  
  // スペルアニメーション
  private activeSpellAnimations: SpellAnimation[];
  
  // ゲーム状態
  private gameState: GameState;
  private lastTime: number;
  private animationFrameId: number | null;
  private waveNumber: number;
  private baseHP: number;
  private maxBaseHP: number;
  
  // 一時停止
  private isPaused: boolean = false;
  private pauseOverlay: HTMLElement;
  private pauseButton: HTMLElement;
  private resumeButton: HTMLElement;
  private returnTitleButton: HTMLElement;
  
  // ドラッグ中のカード情報
  private draggingCard: Card | null;
  private dragPosition: { x: number; y: number } | null;
  
  // 入力状態
  private hoverCell: { row: number; col: number } | null;
  
  // UI要素
  private startButton: HTMLButtonElement;
  private waveCountElement: HTMLElement;
  private enemyCountElement: HTMLElement;
  private towerCountElement: HTMLElement;
  private baseHPElement: HTMLElement;
  private synergyListElement: HTMLElement;
  private deckTotalElement: HTMLElement;
  private upgradeListElement: HTMLElement;
  private tokenDisplayElement: HTMLElement;
  
  // ウェーブ管理
  private enemiesSpawned: number;
  private enemiesPerWave: number;
  private spawnInterval: number;
  private lastSpawnTime: number;
  
  // カード補充管理
  private enemiesKilledThisWave: number;
  private lastCardRefillKillCount: number;

  // ボスウェーブ管理
  private isBossWave: boolean = false;
  private bossWarningStartTime: number = 0;
  private showBossWarning: boolean = false;
  private bossSpawned: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context を取得できませんでした');
    }
    this.ctx = ctx;

    // システム初期化
    this.pathSystem = new PathSystem();
    this.gridSystem = new GridSystem(this.pathSystem);
    this.synergySystem = new SynergySystem();
    this.reactionSystem = new ReactionSystem();
    this.spellSystem = new SpellSystem();
    
    // Meta Progressionシステム初期化
    this.progressManager = new ProgressManager();
    this.sceneManager = new SceneManager(canvas);
    this.titleScreen = new TitleScreen(this.progressManager, canvas);
    
    // 図鑑・設定システム初期化
    this.encyclopediaManager = new EncyclopediaManager();
    this.settingsManager = new SettingsManager();
    this.currentGrimoireTab = 'towers';
    
    this.setupTitleScreenCallbacks();
    this.setupSceneManagerCallbacks();
    this.setupSettingsCallbacks();
    
    // ローグライトシステム初期化
    this.deckManager = new DeckManager();
    this.economyManager = new EconomyManager();
    this.shopManager = new ShopManager();
    this.shopUI = new ShopUI();
    this.currentHandSize = HAND_CONFIG.HAND_SIZE;
    this.totalEnemiesKilledThisGame = 0;
    this.totalTokensEarnedThisGame = 0;
    this.gameStartTime = 0;
    this.towerUsageCount = new Map();
    
    // 手札システム（デッキマネージャーと連携）
    this.handSystem = new HandSystem('hand-container');
    
    // エフェクトシステム初期化
    this.particleSystem = new ParticleSystem(500);
    this.damagePopupManager = new DamagePopupManager(50);

    // エンティティ初期化
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.activeSpellAnimations = [];

    // ゲーム状態初期化（タイトル画面から開始するのでidleで待機）
    this.gameState = 'idle';
    this.lastTime = 0;
    this.animationFrameId = null;
    this.waveNumber = 1;
    this.hoverCell = null;
    this.draggingCard = null;
    this.dragPosition = null;
    
    // 拠点HP
    this.maxBaseHP = 100;
    this.baseHP = this.maxBaseHP;

    // ウェーブ設定（4ルートからスポーンするので敵数を増やす）
    this.enemiesSpawned = 0;
    this.enemiesPerWave = 16; // 4ルート × 4体
    this.spawnInterval = 800; // 少し短めに
    this.lastSpawnTime = 0;
    
    // カード補充管理
    this.enemiesKilledThisWave = 0;
    this.lastCardRefillKillCount = 0;

    // UI要素取得
    this.startButton = document.getElementById('start-button') as HTMLButtonElement;
    this.waveCountElement = document.getElementById('wave-count') as HTMLElement;
    this.enemyCountElement = document.getElementById('enemy-count') as HTMLElement;
    this.towerCountElement = document.getElementById('tower-count') as HTMLElement;
    this.baseHPElement = document.getElementById('base-hp') as HTMLElement;
    this.synergyListElement = document.getElementById('synergy-list') as HTMLElement;
    this.deckTotalElement = document.getElementById('deck-total') as HTMLElement;
    this.upgradeListElement = document.getElementById('upgrade-list') as HTMLElement;
    this.tokenDisplayElement = document.getElementById('token-count') as HTMLElement;

    // 一時停止UI要素取得
    this.pauseOverlay = document.getElementById('pause-overlay') as HTMLElement;
    this.pauseButton = document.getElementById('pause-button') as HTMLElement;
    this.resumeButton = document.getElementById('resume-button') as HTMLElement;
    this.returnTitleButton = document.getElementById('return-title-button') as HTMLElement;

    // イベントリスナー設定
    this.setupEventListeners();
    this.setupHandSystemCallbacks();
    this.setupShopUICallbacks();

    // タイトル画面から開始するので手札配布は後で
    // this.dealHandFromDeck();

    // タイトル画面を表示して開始
    this.titleScreen.show();

    // 初回描画（タイトル画面）
    this.draw();
    this.updateUI();
  }

  /**
   * タイトル画面のコールバックを設定
   */
  private setupTitleScreenCallbacks(): void {
    this.titleScreen.setOnStartGame((_starterDeck: StarterDeckType, _map: MapType) => {
      this.sceneManager.changeScene('game');
      this.startNewGame();
    });

    this.titleScreen.setOnOpenGrimoire(() => {
      this.sceneManager.changeScene('grimoire');
      this.populateGrimoire();
    });

    this.titleScreen.setOnOpenUpgrades(() => {
      this.sceneManager.changeScene('upgrades');
      this.populateUpgrades();
    });

    this.titleScreen.setOnOpenArchives(() => {
      this.sceneManager.changeScene('archives');
      this.populateArchives();
    });

    this.titleScreen.setOnOpenSettings(() => {
      this.sceneManager.changeScene('settings');
    });
  }

  /**
   * シーンマネージャーのコールバックを設定
   */
  private setupSceneManagerCallbacks(): void {
    this.sceneManager.setOnSceneChange((scene: SceneType) => {
      this.handleSceneChange(scene);
    });

    // 各シーンの戻るボタンを設定
    this.setupMenuBackButtons();
  }

  /**
   * メニュー画面の戻るボタンを設定
   */
  private setupMenuBackButtons(): void {
    const backToTitle = () => {
      this.sceneManager.changeScene('title');
      this.titleScreen.show();
    };

    document.getElementById('btn-grimoire-back')?.addEventListener('click', backToTitle);
    document.getElementById('btn-upgrades-back')?.addEventListener('click', backToTitle);
    document.getElementById('btn-archives-back')?.addEventListener('click', backToTitle);
    document.getElementById('btn-settings-back')?.addEventListener('click', backToTitle);

    // 図鑑タブの設定
    document.querySelectorAll('.grimoire-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabName = target.dataset.tab as EncyclopediaCategoryType;
        if (tabName) {
          this.currentGrimoireTab = tabName;
          document.querySelectorAll('.grimoire-tab').forEach(t => t.classList.remove('active'));
          target.classList.add('active');
          this.populateGrimoireGrid();
        }
      });
    });

    // リセットボタン
    document.getElementById('btn-reset-progress')?.addEventListener('click', () => {
      if (confirm('本当に進捗をリセットしますか？この操作は元に戻せません。\n\n以下のデータが削除されます:\n・ランクとXP\n・図鑑の発見データ\n・全ての設定')) {
        this.progressManager.reset();
        this.encyclopediaManager.reset();
        this.settingsManager.reset();
        this.titleScreen.show(); // UI更新
        alert('進捗がリセットされました。');
      }
    });
  }

  /**
   * 設定画面のコールバックを設定
   */
  private setupSettingsCallbacks(): void {
    // 現在の設定を読み込んでUIに反映
    const settings = this.settingsManager.getSettings();
    
    // スライダーの初期値設定
    const masterSlider = document.getElementById('slider-master') as HTMLInputElement;
    const sfxSlider = document.getElementById('slider-sfx') as HTMLInputElement;
    const bgmSlider = document.getElementById('slider-bgm') as HTMLInputElement;
    
    if (masterSlider) {
      masterSlider.value = String(settings.masterVolume);
      (document.getElementById('value-master') as HTMLElement).textContent = String(settings.masterVolume);
      masterSlider.addEventListener('input', (e) => {
        const value = Number((e.target as HTMLInputElement).value);
        this.settingsManager.setMasterVolume(value);
        (document.getElementById('value-master') as HTMLElement).textContent = String(value);
      });
    }
    
    if (sfxSlider) {
      sfxSlider.value = String(settings.sfxVolume);
      (document.getElementById('value-sfx') as HTMLElement).textContent = String(settings.sfxVolume);
      sfxSlider.addEventListener('input', (e) => {
        const value = Number((e.target as HTMLInputElement).value);
        this.settingsManager.setSFXVolume(value);
        (document.getElementById('value-sfx') as HTMLElement).textContent = String(value);
      });
    }
    
    if (bgmSlider) {
      bgmSlider.value = String(settings.bgmVolume);
      (document.getElementById('value-bgm') as HTMLElement).textContent = String(settings.bgmVolume);
      bgmSlider.addEventListener('input', (e) => {
        const value = Number((e.target as HTMLInputElement).value);
        this.settingsManager.setBGMVolume(value);
        (document.getElementById('value-bgm') as HTMLElement).textContent = String(value);
      });
    }
    
    // トグルの初期状態設定
    const damageToggle = document.getElementById('toggle-damage');
    const particlesToggle = document.getElementById('toggle-particles');
    const synergyToggle = document.getElementById('toggle-synergy');
    
    if (damageToggle) {
      damageToggle.classList.toggle('active', settings.showDamageNumbers);
      damageToggle.addEventListener('click', () => {
        const isActive = this.settingsManager.toggleShowDamageNumbers();
        damageToggle.classList.toggle('active', isActive);
      });
    }
    
    if (particlesToggle) {
      particlesToggle.classList.toggle('active', settings.showParticles);
      particlesToggle.addEventListener('click', () => {
        const isActive = this.settingsManager.toggleShowParticles();
        particlesToggle.classList.toggle('active', isActive);
      });
    }
    
    if (synergyToggle) {
      synergyToggle.classList.toggle('active', settings.showSynergyPreview);
      synergyToggle.addEventListener('click', () => {
        const isActive = this.settingsManager.toggleShowSynergyPreview();
        synergyToggle.classList.toggle('active', isActive);
      });
    }
  }

  /**
   * シーン変更時の処理
   */
  private handleSceneChange(scene: SceneType): void {
    switch (scene) {
      case 'title':
        // タイトル画面表示時はゲームループを一時停止
        if (this.animationFrameId !== null) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
        this.titleScreen.show();
        break;
      
      case 'game':
        // ゲームシーンに入ったらタイトル画面を非表示
        this.titleScreen.hide();
        break;
      
      case 'grimoire':
      case 'upgrades':
      case 'settings':
      case 'archives':
        // メニュー画面ではタイトル画面の背景アニメーションを停止
        this.titleScreen.hide();
        break;
    }
  }

  /**
   * 図鑑を表示
   */
  private populateGrimoire(): void {
    // 発見率を更新
    this.updateDiscoveryStats();
    
    // グリッドを表示
    this.populateGrimoireGrid();
    
    // 詳細パネルをリセット
    this.clearGrimoireDetail();
  }

  /**
   * 発見率の統計を更新
   */
  private updateDiscoveryStats(): void {
    const statsEl = document.getElementById('discovery-stats');
    if (!statsEl) return;

    const stats = this.encyclopediaManager.getDiscoveryStats();
    statsEl.innerHTML = `
      <span>🏰 タワー: ${stats.towers.discovered}/${stats.towers.total}</span>
      <span>👹 敵: ${stats.enemies.discovered}/${stats.enemies.total}</span>
      <span>✨ アーティファクト: ${stats.artifacts.discovered}/${stats.artifacts.total}</span>
      <span style="color: #ffd700;">📊 全体: ${Math.round(stats.overall.discovered / stats.overall.total * 100)}%</span>
    `;
  }

  /**
   * 図鑑グリッドを表示
   */
  private populateGrimoireGrid(): void {
    const grid = document.getElementById('grimoire-grid');
    if (!grid) return;

    grid.innerHTML = '';

    switch (this.currentGrimoireTab) {
      case 'towers':
        this.populateTowerGrid(grid);
        break;
      case 'enemies':
        this.populateEnemyGrid(grid);
        break;
      case 'artifacts':
        this.populateArtifactGrid(grid);
        break;
    }
  }

  /**
   * タワーグリッドを表示
   */
  private populateTowerGrid(grid: HTMLElement): void {
    const entries = this.encyclopediaManager.getAllTowerEntries();

    for (const { entry, detail } of entries) {
      const item = document.createElement('div');
      item.className = `grimoire-item ${entry.discovered ? '' : 'locked'}`;
      
      if (entry.discovered) {
        item.innerHTML = `
          <div class="grimoire-icon">${detail.icon}</div>
          <div class="grimoire-name">${detail.name}</div>
          <div class="grimoire-stats">配置: ${entry.timesPlaced}回 / 最高Lv${entry.maxLevelReached}</div>
        `;
        item.addEventListener('click', () => this.showTowerDetail(entry.element));
      } else {
        item.innerHTML = `
          <div class="grimoire-icon">❓</div>
          <div class="grimoire-name">Unknown</div>
          <div class="grimoire-stats">未発見</div>
        `;
      }

      grid.appendChild(item);
    }
  }

  /**
   * 敵グリッドを表示
   */
  private populateEnemyGrid(grid: HTMLElement): void {
    const entries = this.encyclopediaManager.getAllEnemyEntries();

    for (const { entry, detail } of entries) {
      const item = document.createElement('div');
      item.className = `grimoire-item ${entry.discovered ? '' : 'locked'}`;
      
      if (entry.discovered) {
        item.innerHTML = `
          <div class="grimoire-icon">${detail.icon}</div>
          <div class="grimoire-name">${detail.name}</div>
          <div class="grimoire-stats">遭遇: ${entry.timesEncountered} / 撃破: ${entry.timesDefeated}</div>
        `;
        item.addEventListener('click', () => this.showEnemyDetail(entry.type));
      } else {
        item.innerHTML = `
          <div class="grimoire-icon">❓</div>
          <div class="grimoire-name">Unknown</div>
          <div class="grimoire-stats">未発見</div>
        `;
      }

      grid.appendChild(item);
    }
  }

  /**
   * アーティファクトグリッドを表示
   */
  private populateArtifactGrid(grid: HTMLElement): void {
    const entries = this.encyclopediaManager.getAllArtifactEntries();

    for (const { entry, detail } of entries) {
      const item = document.createElement('div');
      item.className = `grimoire-item ${entry.discovered ? '' : 'locked'}`;
      
      if (entry.discovered) {
        item.innerHTML = `
          <div class="grimoire-icon">${detail.icon}</div>
          <div class="grimoire-name">${detail.name}</div>
          <div class="grimoire-stats">入手: ${entry.timesObtained}回</div>
        `;
        item.addEventListener('click', () => this.showArtifactDetail(entry.effect));
      } else {
        item.innerHTML = `
          <div class="grimoire-icon">❓</div>
          <div class="grimoire-name">Unknown</div>
          <div class="grimoire-stats">未発見</div>
        `;
      }

      grid.appendChild(item);
    }
  }

  /**
   * 図鑑詳細パネルをクリア
   */
  private clearGrimoireDetail(): void {
    const detailEl = document.getElementById('grimoire-detail');
    if (!detailEl) return;
    
    detailEl.innerHTML = `
      <div class="detail-placeholder">
        アイテムをクリックして詳細を表示
      </div>
    `;
  }

  /**
   * タワー詳細を表示
   */
  private showTowerDetail(element: ElementType): void {
    const detailEl = document.getElementById('grimoire-detail');
    const entry = this.encyclopediaManager.getTowerEntry(element);
    const detail = this.encyclopediaManager.getTowerDetail(element);
    
    if (!detailEl || !entry || !detail) return;

    detailEl.innerHTML = `
      <div class="detail-header">
        <div class="detail-icon" style="color: ${detail.color};">${detail.icon}</div>
        <div class="detail-title">
          <h3>${detail.name}</h3>
          <p>${detail.description}</p>
        </div>
      </div>
      <div class="detail-body">
        <div class="detail-section">
          <h4>📊 基本ステータス</h4>
          <div class="detail-stats">
            <div class="stat-item"><span class="stat-label">攻撃力:</span> <span class="stat-value">${detail.baseStats.damage}</span></div>
            <div class="stat-item"><span class="stat-label">射程:</span> <span class="stat-value">${detail.baseStats.range}px</span></div>
            <div class="stat-item"><span class="stat-label">攻撃間隔:</span> <span class="stat-value">${detail.baseStats.fireRate}ms</span></div>
          </div>
        </div>
        <div class="detail-section">
          <h4>📈 あなたの記録</h4>
          <div class="detail-stats">
            <div class="stat-item"><span class="stat-label">配置回数:</span> <span class="stat-value">${entry.timesPlaced}</span></div>
            <div class="stat-item"><span class="stat-label">最高レベル:</span> <span class="stat-value">Lv${entry.maxLevelReached}</span></div>
            <div class="stat-item"><span class="stat-label">総ダメージ:</span> <span class="stat-value">${entry.totalDamageDealt.toLocaleString()}</span></div>
          </div>
        </div>
      </div>
      <div class="flavor-text">${detail.flavorText}</div>
    `;
  }

  /**
   * 敵詳細を表示
   */
  private showEnemyDetail(type: EnemyType): void {
    const detailEl = document.getElementById('grimoire-detail');
    const entry = this.encyclopediaManager.getEnemyEntry(type);
    const detail = this.encyclopediaManager.getEnemyDetail(type);
    
    if (!detailEl || !entry || !detail) return;

    const defeatRate = entry.timesEncountered > 0 
      ? Math.round(entry.timesDefeated / entry.timesEncountered * 100) 
      : 0;

    detailEl.innerHTML = `
      <div class="detail-header">
        <div class="detail-icon" style="color: ${detail.color};">${detail.icon}</div>
        <div class="detail-title">
          <h3>${detail.name}</h3>
          <p>${detail.description}</p>
        </div>
      </div>
      <div class="detail-body">
        <div class="detail-section">
          <h4>📊 基本ステータス</h4>
          <div class="detail-stats">
            <div class="stat-item"><span class="stat-label">体力:</span> <span class="stat-value">${detail.baseStats.health}</span></div>
            <div class="stat-item"><span class="stat-label">速度:</span> <span class="stat-value">${detail.baseStats.speed}</span></div>
            <div class="stat-item"><span class="stat-label">攻撃力:</span> <span class="stat-value">${detail.baseStats.attackDamage}</span></div>
          </div>
          <p style="margin-top: 10px; color: #e74c3c;"><strong>弱点:</strong> ${detail.weakness}</p>
        </div>
        <div class="detail-section">
          <h4>📈 あなたの記録</h4>
          <div class="detail-stats">
            <div class="stat-item"><span class="stat-label">遭遇回数:</span> <span class="stat-value">${entry.timesEncountered}</span></div>
            <div class="stat-item"><span class="stat-label">撃破回数:</span> <span class="stat-value">${entry.timesDefeated}</span></div>
            <div class="stat-item"><span class="stat-label">撃破率:</span> <span class="stat-value">${defeatRate}%</span></div>
          </div>
        </div>
      </div>
      <div class="flavor-text">${detail.flavorText}</div>
    `;
  }

  /**
   * アーティファクト詳細を表示
   */
  private showArtifactDetail(effect: ArtifactEffectType): void {
    const detailEl = document.getElementById('grimoire-detail');
    const entry = this.encyclopediaManager.getArtifactEntry(effect);
    const detail = this.encyclopediaManager.getArtifactDetail(effect);
    
    if (!detailEl || !entry || !detail) return;

    detailEl.innerHTML = `
      <div class="detail-header">
        <div class="detail-icon">${detail.icon}</div>
        <div class="detail-title">
          <h3>${detail.name}</h3>
          <p>${detail.description}</p>
        </div>
      </div>
      <div class="detail-body">
        <div class="detail-section">
          <h4>📈 あなたの記録</h4>
          <div class="detail-stats">
            <div class="stat-item"><span class="stat-label">入手回数:</span> <span class="stat-value">${entry.timesObtained}</span></div>
          </div>
        </div>
      </div>
      <div class="flavor-text">${detail.flavorText}</div>
    `;
  }

  /**
   * アップグレード画面を表示
   */
  private populateUpgrades(): void {
    // Token表示を更新
    const permanentTokensEl = document.getElementById('permanent-tokens');
    const totalTokensEl = document.getElementById('total-tokens-earned');
    
    if (permanentTokensEl) {
      permanentTokensEl.textContent = String(this.progressManager.getPermanentTokens());
    }
    if (totalTokensEl) {
      totalTokensEl.textContent = String(this.progressManager.getTotalTokensEarned());
    }

    // アップグレードリストを生成
    const list = document.getElementById('upgrade-scene-list');
    if (!list) return;

    list.innerHTML = '';

    const upgrades = this.progressManager.getAllUpgrades();

    for (const { config, level, cost, canPurchase } of upgrades) {
      const isMaxed = level >= config.maxLevel;
      const effectText = config.effectType === 'percent' 
        ? `+${config.effectPerLevel * level}%`
        : `+${config.effectPerLevel * level}`;

      const item = document.createElement('div');
      item.className = `upgrade-item ${isMaxed ? 'maxed' : ''}`;
      item.innerHTML = `
        <div class="upgrade-left">
          <div class="upgrade-icon">${config.icon}</div>
          <div class="upgrade-info">
            <div class="upgrade-name">${config.name}</div>
            <div class="upgrade-desc">${config.description}</div>
            <div class="upgrade-effect">現在の効果: ${effectText}</div>
          </div>
        </div>
        <div class="upgrade-right">
          <div class="upgrade-level">Lv${level}/${config.maxLevel}</div>
          <button class="upgrade-buy-btn ${isMaxed ? 'maxed' : ''}" 
                  data-upgrade="${config.id}"
                  ${!canPurchase || isMaxed ? 'disabled' : ''}>
            ${isMaxed ? 'MAX' : `💰 ${cost}`}
          </button>
        </div>
      `;

      // 購入ボタンのイベント
      const btn = item.querySelector('.upgrade-buy-btn') as HTMLButtonElement;
      if (btn && !isMaxed) {
        btn.addEventListener('click', () => {
          this.handleUpgradePurchase(config.id);
        });
      }

      list.appendChild(item);
    }
  }

  /**
   * 永続強化を購入
   */
  private handleUpgradePurchase(upgradeId: string): void {
    const success = this.progressManager.purchaseUpgrade(upgradeId as import('./types').PermanentUpgradeType);
    if (success) {
      // 購入成功 - UIを更新
      this.populateUpgrades();
    }
  }

  /**
   * 戦歴画面を表示
   */
  private populateArchives(): void {
    // 統計を更新
    const totalGamesEl = document.getElementById('archive-total-games');
    const highestWaveEl = document.getElementById('archive-highest-wave');
    const totalKillsEl = document.getElementById('archive-total-kills');

    if (totalGamesEl) {
      totalGamesEl.textContent = String(this.progressManager.getTotalGamesPlayed());
    }
    if (highestWaveEl) {
      highestWaveEl.textContent = String(this.progressManager.getHighestWave());
    }
    
    // 累計撃破数を計算（戦歴から）
    const history = this.progressManager.getMatchHistory();
    const totalKills = history.reduce((sum, match) => sum + match.enemiesKilled, 0);
    if (totalKillsEl) {
      totalKillsEl.textContent = String(totalKills);
    }

    // 戦歴リストを生成
    const list = document.getElementById('match-list');
    if (!list) return;

    list.innerHTML = '';

    if (history.length === 0) {
      list.innerHTML = '<div class="no-matches">まだプレイ記録がありません</div>';
      return;
    }

    history.forEach((match, index) => {
      const date = new Date(match.date);
      const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      
      const durationMin = Math.floor(match.duration / 60);
      const durationSec = match.duration % 60;
      const durationStr = `${durationMin}:${String(durationSec).padStart(2, '0')}`;

      // 使用タワーのアイコン
      const towerIcons = match.mainTowers
        .map(el => this.getElementIcon(el))
        .join('');

      const item = document.createElement('div');
      item.className = 'match-item';
      item.innerHTML = `
        <div class="match-left">
          <div class="match-rank">#${index + 1}</div>
          <div class="match-info">
            <div class="match-date">${dateStr} (${durationStr})</div>
            <div class="match-result">
              Wave <span class="match-wave">${match.waveReached}</span> 到達 
              / ${match.enemiesKilled} 撃破
            </div>
          </div>
        </div>
        <div class="match-right">
          <div class="match-towers">${towerIcons || '—'}</div>
          <div class="match-score">
            <div class="match-score-label">スコア</div>
            <div class="match-score-value">${match.score.toLocaleString()}</div>
          </div>
        </div>
      `;

      list.appendChild(item);
    });
  }

  /**
   * 属性のアイコンを取得
   */
  private getElementIcon(element: ElementType): string {
    const icons: Record<ElementType, string> = {
      physical: '🏹',
      fire: '🔥',
      ice: '❄️',
      lightning: '⚡',
      poison: '☠️',
      light: '✨',
      arcane: '🔮',
    };
    return icons[element] || '❓';
  }

  /**
   * 新しいゲームを開始
   */
  private startNewGame(): void {
    // タイトル画面を非表示
    this.titleScreen.hide();
    
    // ゲーム状態をリセット
    this.resetGameState();
    
    // ゲーム開始時刻を記録
    this.gameStartTime = Date.now();
    this.totalTokensEarnedThisGame = 0;
    this.towerUsageCount.clear();
    
    // アンロック機能を適用（ランクベース + 永続強化）
    this.applyUnlockedFeatures();
    this.applyPermanentUpgrades();
    
    // 手札を配る
    this.dealHandFromDeck();
    
    // ゲーム状態をidleに
    this.gameState = 'idle';
    this.startButton.disabled = false;
    this.startButton.textContent = 'Start Wave 1';
    
    this.draw();
    this.updateUI();
  }

  /**
   * ゲーム状態をリセット
   */
  private resetGameState(): void {
    this.enemies = [];
    this.towers.forEach(t => this.gridSystem.releaseCell(t.gridRow, t.gridCol));
    this.towers = [];
    this.projectiles = [];
    this.activeSpellAnimations = [];
    this.particleSystem.clear();
    this.damagePopupManager.clear();
    
    this.waveNumber = 1;
    this.baseHP = this.maxBaseHP;
    this.enemiesSpawned = 0;
    this.enemiesPerWave = 16;
    this.lastSpawnTime = 0;
    this.enemiesKilledThisWave = 0;
    this.lastCardRefillKillCount = 0;
    this.totalEnemiesKilledThisGame = 0;
    
    this.currentHandSize = HAND_CONFIG.HAND_SIZE;
    
    // システムをリセット
    this.deckManager.reset();
    this.economyManager.reset();
    this.shopManager.reset();
    this.synergySystem.calculateAndApplySynergies(this.towers);
  }

  /**
   * アンロック済み機能を適用
   */
  private applyUnlockedFeatures(): void {
    // 初期手札+1
    if (this.progressManager.hasFeature('feature_extra_hand')) {
      this.currentHandSize++;
    }
    
    // 初期ボーナス（50 Token）
    if (this.progressManager.hasFeature('feature_starting_bonus')) {
      this.economyManager.addTokens(50);
    }
  }

  /**
   * 永続強化の効果を適用
   */
  private applyPermanentUpgrades(): void {
    // 初期Token増加
    const startingGold = this.progressManager.getUpgradeEffect('starting_gold');
    if (startingGold > 0) {
      this.economyManager.addTokens(startingGold);
    }

    // 拠点HP増加
    const baseHpBonus = this.progressManager.getUpgradeEffect('base_hp');
    if (baseHpBonus > 0) {
      this.maxBaseHP += baseHpBonus;
      this.baseHP = this.maxBaseHP;
    }

    // 火の恵み: 初期デッキに火タワー+1
    const startWithFire = this.progressManager.getUpgradeLevel('start_with_fire');
    if (startWithFire > 0) {
      this.deckManager.addStarterCard('fire');
    }

    // 属性マスタリー: 属性タワーダメージ+10%/Lv（DeckManager側で適用）
    const elementalMastery = this.progressManager.getUpgradeEffect('elemental_mastery');
    if (elementalMastery > 0) {
      // 属性タワーのダメージボーナスを適用
      this.deckManager.applyUpgrade('damage', elementalMastery / 100, 'fire');
      this.deckManager.applyUpgrade('damage', elementalMastery / 100, 'ice');
      this.deckManager.applyUpgrade('damage', elementalMastery / 100, 'lightning');
    }

    // リロール割引は EconomyManager 側で処理
    // レアカード確率は ShopManager 側で処理
    // タワー攻撃力・射程は Tower 生成時に適用
  }

  /**
   * デッキから手札を配る
   */
  private dealHandFromDeck(): void {
    const cards = this.deckManager.drawHand(this.currentHandSize);
    this.handSystem.setHand(cards);
  }

  /**
   * 敵撃破時の処理
   */
  private onEnemyKilled(): void {
    this.enemiesKilledThisWave++;
    this.totalEnemiesKilledThisGame++;
    
    // カード補充チェック（一定数撃破ごと）
    const killsNeeded = ECONOMY_CONFIG.ENEMIES_PER_CARD_REFILL;
    const killsSinceLastRefill = this.enemiesKilledThisWave - this.lastCardRefillKillCount;
    
    if (killsSinceLastRefill >= killsNeeded) {
      this.lastCardRefillKillCount = this.enemiesKilledThisWave;
      this.tryRefillCard();
    }
  }

  /**
   * ボスのスキルを処理
   */
  private handleBossSkill(boss: Enemy, currentTime: number, aliveTowers: Tower[]): void {
    const skill = boss.useSkill(currentTime);
    if (!skill) return;

    switch (skill) {
      case 'summon':
        // 雑魚敵を3体召喚
        this.bossSummonMinions(boss);
        if (this.settingsManager.isShowDamageNumbers()) {
          this.damagePopupManager.createTextPopup(
            boss.position,
            '👹 SUMMON!',
            '#9b59b6'
          );
        }
        break;

      case 'heal':
        // HP回復（最大HPの10%）
        const healAmount = Math.floor(boss.maxHealth * 0.1);
        boss.heal(healAmount);
        if (this.settingsManager.isShowDamageNumbers()) {
          this.damagePopupManager.createTextPopup(
            boss.position,
            `+${healAmount} HP`,
            '#2ecc71'
          );
        }
        if (this.settingsManager.isShowParticles()) {
          this.particleSystem.createHitEffect(boss.position, '#2ecc71', 15);
        }
        break;

      case 'silence':
        // ランダムなタワーを沈黙
        if (aliveTowers.length > 0) {
          const target = aliveTowers[Math.floor(Math.random() * aliveTowers.length)];
          target.applySilence(3000); // 3秒間沈黙
          if (this.settingsManager.isShowDamageNumbers()) {
            this.damagePopupManager.createTextPopup(
              target.position,
              '🔇 SILENCED!',
              '#800080'
            );
          }
          if (this.settingsManager.isShowParticles()) {
            this.particleSystem.createHitEffect(target.position, '#800080', 10);
          }
        }
        break;
    }
  }

  /**
   * ボスの召喚スキル - 雑魚敵を3体出現
   */
  private bossSummonMinions(boss: Enemy): void {
    for (let i = 0; i < 3; i++) {
      // ボスと同じルートに雑魚を出す
      const path = this.pathSystem.getPath(boss.routeIndex);
      
      // ボスの少し後ろから出現（現在位置からスタート）
      const minionPath = path.slice(); // パスをコピー
      const minion = new Enemy(minionPath, boss.routeIndex, 'normal', this.waveNumber, undefined, null);
      
      // ボスの近くに配置
      const offsetAngle = (Math.PI * 2 / 3) * i;
      minion.position.x = boss.position.x + Math.cos(offsetAngle) * 40;
      minion.position.y = boss.position.y + Math.sin(offsetAngle) * 40;
      
      this.enemies.push(minion);
    }
  }

  /**
   * ボス撃破時の特別報酬
   */
  private handleBossDefeat(position: { x: number; y: number }): void {
    // 大量のToken報酬（ウェーブに応じて増加）
    const bossTokenReward = 100 + this.waveNumber * 20;
    this.economyManager.addTokens(bossTokenReward);
    this.totalTokensEarnedThisGame += bossTokenReward;

    // ポップアップ表示
    if (this.settingsManager.isShowDamageNumbers()) {
      this.damagePopupManager.createTextPopup(
        { x: position.x, y: position.y - 30 },
        '👑 BOSS DEFEATED!',
        '#ffd700'
      );
      this.damagePopupManager.createTextPopup(
        { x: position.x, y: position.y },
        `+${bossTokenReward}💰`,
        '#f1c40f'
      );
    }

    // ボーナスカードをデッキに追加（ランダムな属性タワー）
    const bonusElements: import('./types').ElementType[] = ['fire', 'ice', 'lightning'];
    const bonusElement = bonusElements[Math.floor(Math.random() * bonusElements.length)];
    this.deckManager.addCard('tower', bonusElement);
    
    if (this.settingsManager.isShowDamageNumbers()) {
      this.damagePopupManager.createTextPopup(
        { x: position.x, y: position.y + 30 },
        `+${this.getElementIcon(bonusElement)} カード`,
        '#2ecc71'
      );
    }
  }

  /**
   * カードを補充（手札がいっぱいなら古いカードを捨てる）
   */
  private tryRefillCard(): void {
    const currentHand = this.handSystem.getCards();
    
    if (currentHand.length >= this.currentHandSize) {
      // 手札がいっぱい - 最も古いカードを自動破棄
      const discardedCard = this.handSystem.discardOldestCard();
      if (discardedCard) {
        // リサイクル効果があればToken獲得
        if (this.economyManager.hasRecycleBin()) {
          const recycleTokens = this.economyManager.getRecycleTokens(discardedCard.isSpellCard());
          this.economyManager.addTokens(recycleTokens);
          
          // ポップアップ表示
          this.damagePopupManager.createTextPopup(
            { x: GAME_CONFIG.CANVAS_WIDTH / 2, y: GAME_CONFIG.CANVAS_HEIGHT - 80 },
            `♻️ +${recycleTokens}💰`,
            '#2ecc71'
          );
        }
      }
    }
    
    // 新しいカードを1枚引く
    const newCards = this.deckManager.drawHand(1);
    if (newCards.length > 0) {
      this.handSystem.addCard(newCards[0]);
      
      // 補充通知
      this.damagePopupManager.createTextPopup(
        { x: GAME_CONFIG.CANVAS_WIDTH / 2, y: GAME_CONFIG.CANVAS_HEIGHT - 100 },
        '🃏 +1',
        '#4a90d9'
      );
    }
  }

  /**
   * ショップUIのコールバックを設定
   */
  private setupShopUICallbacks(): void {
    // アイテム購入
    this.shopUI.setOnItemPurchased((item: ShopItem) => {
      return this.handleShopPurchase(item);
    });

    // リロール
    this.shopUI.setOnReroll(() => {
      return this.handleShopReroll();
    });

    // 続行
    this.shopUI.setOnContinue(() => {
      this.shopUI.hide();
      this.prepareNextWave();
    });
  }

  /**
   * ショップ購入処理
   */
  private handleShopPurchase(item: ShopItem): boolean {
    // 購入可能かチェック
    if (!this.economyManager.canAfford(item.price)) {
      return false;
    }

    // トークンを消費
    this.economyManager.spendTokens(item.price);

    // アイテム効果を適用
    switch (item.type) {
      case 'new_card':
        if (item.cardType === 'tower' && item.element) {
          this.deckManager.addCard('tower', item.element);
        } else if (item.cardType === 'spell' && item.spellType) {
          this.deckManager.addCard('spell', undefined, item.spellType);
        }
        break;

      case 'hand_size_up':
        if (this.currentHandSize < HAND_CONFIG.MAX_HAND_SIZE) {
          this.currentHandSize++;
        }
        break;

      case 'reroll_token':
        this.shopManager.addRerollToken();
        break;

      case 'base_repair':
        this.baseHP = Math.min(this.maxBaseHP, this.baseHP + 30);
        break;

      case 'artifact':
        if (item.artifactEffect) {
          this.economyManager.addArtifact(item.artifactEffect);
          // 図鑑に記録
          this.encyclopediaManager.recordArtifactObtained(item.artifactEffect);
        }
        break;

      case 'tower_upgrade':
        if (item.element) {
          this.deckManager.applyUpgrade('damage', 0.1, item.element);
        }
        break;

      case 'expansion_pack':
        // アーティファクトとして登録
        this.economyManager.addArtifact('expansion_pack');
        this.encyclopediaManager.recordArtifactObtained('expansion_pack');
        break;

      case 'vip_membership':
        // アーティファクトとして登録
        this.economyManager.addArtifact('vip_membership');
        this.encyclopediaManager.recordArtifactObtained('vip_membership');
        break;

      case 'recycle_bin':
        // アーティファクトとして登録
        this.economyManager.addArtifact('recycle_bin');
        this.encyclopediaManager.recordArtifactObtained('recycle_bin');
        break;
    }

    // 購入成功したらアイテムを削除
    this.shopManager.purchaseItem(item.id);

    // UI更新
    this.shopUI.updateTokens(this.economyManager.getTokens());
    this.updateUI();

    return true;
  }

  /**
   * ショップリロール処理
   */
  private handleShopReroll(): boolean {
    const shopExpansion = this.economyManager.getShopExpansion();
    const rarityBonus = this.economyManager.getRarityBonus();

    // リロールトークンがあれば使用
    if (this.shopManager.useRerollToken()) {
      const newItems = this.shopManager.rerollItems(this.waveNumber, shopExpansion, rarityBonus);
      this.shopUI.updateItems(newItems);
      return true;
    }

    // トークンでリロール
    if (this.economyManager.canAfford(ECONOMY_CONFIG.SHOP_REROLL_COST)) {
      this.economyManager.spendTokens(ECONOMY_CONFIG.SHOP_REROLL_COST);
      const newItems = this.shopManager.rerollItems(this.waveNumber, shopExpansion, rarityBonus);
      this.shopUI.updateItems(newItems);
      this.shopUI.updateTokens(this.economyManager.getTokens());
      return true;
    }

    return false;
  }

  /**
   * 次のウェーブを準備
   */
  private prepareNextWave(): void {
    this.gameState = 'idle';
    this.waveNumber++;
    this.startButton.disabled = false;
    this.startButton.textContent = `Start Wave ${this.waveNumber}`;

    // 新しい手札をデッキから配る
    this.dealHandFromDeck();

    // 最終描画とUI更新
    this.draw();
    this.updateUI();
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    // スタートボタン
    this.startButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.startWave();
    });

    // 一時停止ボタン
    this.pauseButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.togglePause();
    });

    // 再開ボタン
    this.resumeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.resumeGame();
    });

    // タイトルへ戻るボタン
    this.returnTitleButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.returnToTitle();
    });

    // キャンバスへのドラッグオーバー
    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
      this.canvas.classList.add('drag-over');
      
      // ドラッグ位置を更新
      const rect = this.canvas.getBoundingClientRect();
      this.dragPosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      this.hoverCell = this.gridSystem.getGridPosition(this.dragPosition.x, this.dragPosition.y);
      this.draw();
    });

    // キャンバスからのドラッグ離脱
    this.canvas.addEventListener('dragleave', () => {
      this.canvas.classList.remove('drag-over');
      this.hoverCell = null;
      this.dragPosition = null;
      this.draw();
    });

    // キャンバスへのドロップ
    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      this.canvas.classList.remove('drag-over');
      this.hoverCell = null;
      this.dragPosition = null;
    });

    // マウス移動（ホバー表示）- ドラッグ中でないとき
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // ゲームシーンでない場合は何もしない
      if (!this.sceneManager.isGameScene()) return;

      // ショップ画面の場合
      if (this.gameState === 'shop') {
        this.shopUI.handleMouseMove(x, y);
        this.draw();
        return;
      }

      if (this.draggingCard) return;
      
      this.hoverCell = this.gridSystem.getGridPosition(x, y);
      
      // idle状態でも描画更新（ホバー表示のため）
      if (this.gameState === 'idle') {
        this.draw();
      }
    });

    // クリック（ショップ用）
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // ゲームシーンでない場合は何もしない
      if (!this.sceneManager.isGameScene()) return;

      // ショップ画面の場合のみ
      if (this.gameState !== 'shop') return;

      this.shopUI.handleClick(x, y);
      this.draw();
    });

    // マウスがキャンバスから離れた
    this.canvas.addEventListener('mouseleave', () => {
      if (!this.draggingCard) {
        this.hoverCell = null;
        if (this.gameState === 'idle') {
          this.draw();
        }
      }
    });
  }

  /**
   * 手札システムのコールバックを設定
   */
  private setupHandSystemCallbacks(): void {
    // ドラッグ開始
    this.handSystem.setOnCardDragStart((card) => {
      this.draggingCard = card;
    });

    // ドラッグ終了（ドロップ処理）
    this.handSystem.setOnCardDragEnd((card, dropX, dropY) => {
      this.draggingCard = null;
      this.dragPosition = null;
      
      // キャンバス上の座標に変換
      const rect = this.canvas.getBoundingClientRect();
      const canvasX = dropX - rect.left;
      const canvasY = dropY - rect.top;

      // キャンバス外ならキャンセル
      if (canvasX < 0 || canvasX > GAME_CONFIG.CANVAS_WIDTH ||
          canvasY < 0 || canvasY > GAME_CONFIG.CANVAS_HEIGHT) {
        this.draw();
        return false;
      }

      // スペルカードの場合
      if (card.isSpellCard() && card.spellType) {
        return this.handleSpellDrop(card, canvasX, canvasY);
      }

      // タワーカードの場合
      if (card.isTowerCard() && card.element) {
        return this.handleTowerDrop(card, canvasX, canvasY);
      }

      this.draw();
      return false;
    });
  }

  /**
   * タワーカードのドロップ処理
   */
  private handleTowerDrop(card: Card, canvasX: number, canvasY: number): boolean {
    // グリッド座標を取得
    const gridPos = this.gridSystem.getGridPosition(canvasX, canvasY);
    if (!gridPos || !card.element) {
      this.draw();
      return false;
    }

    // 既存タワーがあるかチェック（合成判定）
    const existingTower = this.getTowerAt(gridPos.row, gridPos.col);
    
    if (existingTower) {
      // 合成可能かチェック
      if (existingTower.canMergeWith(card.element, 1)) {
        // 合成実行（レベルアップ）
        existingTower.levelUp();
        
        // 図鑑に記録
        this.encyclopediaManager.recordTowerLevelUp(existingTower.element, existingTower.level);
        
        // レベルアップエフェクト
        this.particleSystem.createSynergySparkle(existingTower.position);
        
        // シナジー再計算
        this.synergySystem.calculateAndApplySynergies(this.towers);
        
        this.updateUI();
        this.draw();
        return true; // カード消費
      } else {
        // 合成不可（属性またはレベルが違う）
        this.draw();
        return false;
      }
    }

    // 新規配置の場合
    if (!this.gridSystem.canPlaceTower(gridPos.row, gridPos.col)) {
      this.draw();
      return false;
    }

    // タワーを配置
    const centerPos = this.gridSystem.getCellCenter(gridPos.row, gridPos.col);
    const tower = new Tower(gridPos.row, gridPos.col, centerPos, card.element);
    this.towers.push(tower);
    this.gridSystem.occupyCell(gridPos.row, gridPos.col);
    
    // 図鑑に記録
    this.encyclopediaManager.recordTowerPlaced(card.element);
    
    // タワー使用カウント（戦歴用）
    const count = this.towerUsageCount.get(card.element) || 0;
    this.towerUsageCount.set(card.element, count + 1);
    
    // シナジー計算
    this.synergySystem.calculateAndApplySynergies(this.towers);
    
    this.updateUI();
    this.draw();
    
    return true; // 配置成功
  }

  /**
   * スペルカードのドロップ処理
   */
  private handleSpellDrop(card: Card, canvasX: number, canvasY: number): boolean {
    if (!card.spellType) {
      this.draw();
      return false;
    }

    // ウェーブ中のみ使用可能
    if (this.gameState !== 'playing') {
      this.damagePopupManager.createPopup(
        { x: canvasX, y: canvasY },
        0,
        false,
        '#ff6666'
      );
      this.draw();
      return false;
    }

    // 使用回数チェック
    if (!this.spellSystem.canUseSpell(card.spellType)) {
      this.damagePopupManager.createPopup(
        { x: canvasX, y: canvasY },
        0,
        false,
        '#ff6666'
      );
      this.draw();
      return false;
    }

    // スペル発動
    const result = this.spellSystem.castSpell(
      card.spellType,
      { x: canvasX, y: canvasY },
      this.enemies
    );

    if (result) {
      // スペルアニメーションを追加
      this.activeSpellAnimations.push({
        spellType: card.spellType,
        position: { x: canvasX, y: canvasY },
        startTime: Date.now(),
        duration: 1000,
      });

      // ダメージポップアップ
      if (result.totalDamage > 0) {
        this.damagePopupManager.createPopup(
          { x: canvasX, y: canvasY },
          result.totalDamage,
          false,
          SPELL_CONFIGS[card.spellType].color
        );
      }

      // スペル名ポップアップ
      const config = SPELL_CONFIGS[card.spellType];
      this.damagePopupManager.createPopup(
        { x: canvasX, y: canvasY - 30 },
        0,
        false,
        config.color
      );

      // エフェクト
      this.particleSystem.createDeathExplosion(
        { x: canvasX, y: canvasY },
        config.color,
        30
      );

      this.draw();
      return true;
    }

    this.draw();
    return false;
  }

  /**
   * 指定位置のタワーを取得
   */
  private getTowerAt(row: number, col: number): Tower | undefined {
    return this.towers.find(t => t.gridRow === row && t.gridCol === col);
  }

  /**
   * 一時停止をトグル
   */
  private togglePause(): void {
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  /**
   * ゲームを一時停止
   */
  private pauseGame(): void {
    if (this.gameState !== 'playing') return;
    
    this.isPaused = true;
    this.updatePausePopup();
    this.pauseOverlay.classList.remove('hidden');
    this.pauseButton.textContent = '▶️';
    
    // ゲームループを停止
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * ゲームを再開
   */
  private resumeGame(): void {
    if (!this.isPaused) return;
    
    this.isPaused = false;
    this.pauseOverlay.classList.add('hidden');
    this.pauseButton.textContent = '⏸️';
    
    // ゲームループを再開
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  /**
   * 一時停止ポップアップの情報を更新
   */
  private updatePausePopup(): void {
    const pauseWave = document.getElementById('pause-wave');
    const pauseTokens = document.getElementById('pause-tokens');
    const pauseKills = document.getElementById('pause-kills');
    const pauseTowers = document.getElementById('pause-towers');
    const pauseHp = document.getElementById('pause-hp');
    const pauseTime = document.getElementById('pause-time');

    if (pauseWave) pauseWave.textContent = String(this.waveNumber);
    if (pauseTokens) pauseTokens.textContent = String(this.totalTokensEarnedThisGame);
    if (pauseKills) pauseKills.textContent = String(this.totalEnemiesKilledThisGame);
    if (pauseTowers) pauseTowers.textContent = String(this.towers.filter(t => t.isAlive).length);
    if (pauseHp) pauseHp.textContent = `${this.baseHP}/${this.maxBaseHP}`;
    
    // プレイ時間を計算
    if (pauseTime) {
      const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      pauseTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * タイトル画面に戻る
   */
  private returnToTitle(): void {
    // 一時停止画面を閉じる
    this.isPaused = false;
    this.pauseOverlay.classList.add('hidden');
    this.pauseButton.textContent = '⏸️';
    
    // ゲームループを停止
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // ゲーム状態をリセット
    this.gameState = 'idle';
    
    // タイトル画面に遷移
    this.sceneManager.changeScene('title');
    this.titleScreen.show();
  }

  /**
   * ウェーブを開始
   */
  private startWave(): void {
    // ゲームシーンでない場合は無視
    if (!this.sceneManager.isGameScene()) return;
    if (this.gameState === 'playing') return;

    this.gameState = 'playing';
    this.enemiesSpawned = 0;
    this.lastSpawnTime = 0;
    this.startButton.disabled = true;
    this.startButton.textContent = 'Wave in Progress...';

    // ボスウェーブ判定（10ウェーブごと）
    this.isBossWave = this.waveNumber % 10 === 0;
    this.bossSpawned = false;
    
    if (this.isBossWave) {
      // ボスウェーブの警告を表示
      this.showBossWarning = true;
      this.bossWarningStartTime = performance.now();
      this.startButton.textContent = '⚠️ BOSS WAVE ⚠️';
    }

    // ウェーブごとに敵数を増加（ボスウェーブは雑魚も出る）
    this.enemiesPerWave = 12 + this.waveNumber * 4;

    // カード補充カウンターをリセット
    this.enemiesKilledThisWave = 0;
    this.lastCardRefillKillCount = 0;

    // スペル使用回数をリセット
    this.spellSystem.resetUsageCounts();

    // ゲームループ開始
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  /**
   * メインゲームループ
   */
  private gameLoop(currentTime: number): void {
    // 一時停止中はループを止める
    if (this.isPaused) {
      return;
    }

    // ゲームオーバーチェック
    if (this.baseHP <= 0) {
      this.gameOver();
      return;
    }

    // 敵のスポーン
    this.spawnEnemies(currentTime);

    // エンティティ更新
    this.update(currentTime);

    // 描画
    this.draw();

    // UI更新
    this.updateUI();

    // ウェーブ終了チェック
    if (this.checkWaveComplete()) {
      this.endWave();
      return;
    }

    // 次のフレーム
    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  /**
   * 敵をスポーン（4ルートからランダムに、タイプも混合）
   */
  private spawnEnemies(currentTime: number): void {
    // ボスウェーブで警告中はスポーンしない（2秒間）
    if (this.showBossWarning && currentTime - this.bossWarningStartTime < 2000) {
      return;
    }
    // 警告終了後
    if (this.showBossWarning && currentTime - this.bossWarningStartTime >= 2000) {
      this.showBossWarning = false;
    }

    // ボスウェーブでボス未出現なら最初にボスを出す
    if (this.isBossWave && !this.bossSpawned) {
      this.spawnBoss();
      this.bossSpawned = true;
      this.lastSpawnTime = currentTime;
      return;
    }

    if (this.enemiesSpawned >= this.enemiesPerWave) return;

    if (currentTime - this.lastSpawnTime >= this.spawnInterval) {
      // ランダムなルートを選択
      const routeIndex = this.pathSystem.getRandomRouteIndex();
      const path = this.pathSystem.getPath(routeIndex);
      
      // 敵タイプをランダムに決定（ウェーブが進むと特殊タイプが増加）
      const enemyType = this.selectEnemyType();
      
      // 属性耐性を決定（Wave5以降で10-20%の確率）
      const resistance = this.selectEnemyResistance();
      
      // 敵を生成
      const enemy = new Enemy(path, routeIndex, enemyType, this.waveNumber, undefined, resistance);
      
      this.enemies.push(enemy);
      this.enemiesSpawned++;
      this.lastSpawnTime = currentTime;
      
      // 図鑑に記録
      this.encyclopediaManager.recordEnemyEncountered(enemyType);
    }
  }

  /**
   * ボスを出現させる
   */
  private spawnBoss(): void {
    // ランダムなルートを選択
    const routeIndex = this.pathSystem.getRandomRouteIndex();
    const path = this.pathSystem.getPath(routeIndex);
    
    // ボスを生成（HPはウェーブに応じてさらに増加）
    const boss = new Enemy(path, routeIndex, 'boss', this.waveNumber, undefined, null);
    
    this.enemies.push(boss);
    
    // 図鑑に記録
    this.encyclopediaManager.recordEnemyEncountered('boss');
  }

  /**
   * 敵の属性耐性を決定
   * Wave5以降で10-20%の確率で耐性持ちが出現
   */
  private selectEnemyResistance(): import('./entities').ResistanceType {
    // Wave5未満は耐性なし
    if (this.waveNumber < 5) return null;

    // 耐性出現率（Wave5で10%、以降1Waveごとに2%上昇、最大20%）
    const resistanceChance = Math.min(20, 10 + (this.waveNumber - 5) * 2);
    
    if (Math.random() * 100 < resistanceChance) {
      // 耐性タイプをランダムに選択
      const resistanceTypes: import('./entities').ResistanceType[] = ['fire', 'ice', 'lightning'];
      return resistanceTypes[Math.floor(Math.random() * resistanceTypes.length)];
    }

    return null;
  }

  /**
   * スポーンする敵タイプを選択
   */
  private selectEnemyType(): EnemyType {
    const roll = Math.random() * 100;
    
    // ウェーブが進むと特殊タイプの出現率が上がる
    const specialChance = Math.min(60, 10 + this.waveNumber * 5); // 最大60%
    
    if (roll < specialChance) {
      // ウェーブ3以降でブレイカー、ウェーブ5以降でゴースト
      const availableTypes: EnemyType[] = ['tank'];
      if (this.waveNumber >= 3) availableTypes.push('breaker');
      if (this.waveNumber >= 5) availableTypes.push('ghost');
      
      return availableTypes[Math.floor(Math.random() * availableTypes.length)];
    }
    
    return 'normal';
  }

  /**
   * ゲーム状態を更新
   */
  private update(currentTime: number): void {
    // 生存中のタワーリスト
    const aliveTowers = this.towers.filter(t => t.isAlive);

    // 敵の更新
    for (const enemy of this.enemies) {
      if (enemy.isAlive) {
        // ボスのスキル発動
        if (enemy.isBoss() && enemy.canUseSkill(currentTime)) {
          this.handleBossSkill(enemy, currentTime, aliveTowers);
        }

        // ブレイカーがタワーに接触した場合
        if (enemy.enemyType === 'breaker' && enemy.targetTower && enemy.targetTower.isAlive) {
          const tower = enemy.targetTower;
          const dx = tower.position.x - enemy.position.x;
          const dy = tower.position.y - enemy.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < enemy.size / 2 + tower.size / 2) {
            // 自爆攻撃
            const damage = enemy.attackTower(tower, currentTime);
            const destroyed = tower.takeDamage(damage);
            
            // エフェクト
            this.particleSystem.createDeathExplosion(tower.position, '#e67e22', 30);
            this.damagePopupManager.createPopup(tower.position, damage, true, '#e67e22');
            
            if (destroyed) {
              this.handleTowerDestruction(tower);
            }
            continue; // 自爆したので移動処理をスキップ
          }
        }

        const reachedGoal = enemy.update(aliveTowers);
        
        // ブレイカーがタワーに到達（moveTowardsTowerがtrueを返した）
        if (reachedGoal && enemy.enemyType === 'breaker' && enemy.targetTower && enemy.targetTower.isAlive) {
          const tower = enemy.targetTower;
          const damage = enemy.attackTower(tower, currentTime);
          const destroyed = tower.takeDamage(damage);
          
          // エフェクト
          this.particleSystem.createDeathExplosion(tower.position, '#e67e22', 30);
          this.damagePopupManager.createPopup(tower.position, damage, true, '#e67e22');
          
          if (destroyed) {
            this.handleTowerDestruction(tower);
          }
        } else if (reachedGoal) {
          enemy.isAlive = false;
          // 拠点にダメージ
          this.baseHP -= 10;
          
          // 拠点ダメージエフェクト
          const basePos = this.pathSystem.getBasePosition();
          this.particleSystem.createHitEffect(basePos, '#ff0000', 15);
          this.damagePopupManager.createPopup(basePos, 10, false, '#ff4444');
        }
      }
    }

    // 敵がタワー隣接時に攻撃
    this.processEnemyAttacks(currentTime);

    // 死んだ敵を削除
    this.enemies = this.enemies.filter((e) => e.isAlive);

    // 死んだタワーを削除してグリッドを解放
    for (const tower of this.towers) {
      if (!tower.isAlive) {
        this.gridSystem.releaseCell(tower.gridRow, tower.gridCol);
      }
    }
    this.towers = this.towers.filter((t) => t.isAlive);

    // シナジー再計算（タワーが破壊された場合）
    if (this.towers.some(t => !t.isAlive)) {
      this.synergySystem.calculateAndApplySynergies(this.towers.filter(t => t.isAlive));
    }

    // タワーの更新（ターゲット探索と発射、優先度考慮）
    for (const tower of this.towers) {
      if (!tower.isAlive) continue;
      tower.findTarget(this.enemies);
      const projectile = tower.tryFire(currentTime);
      if (projectile) {
        this.projectiles.push(projectile);
      }
    }

    // 弾の更新と命中判定
    for (const projectile of this.projectiles) {
      const hitResult = projectile.update();
      
      if (hitResult && hitResult.hit) {
        // ゴーストの回避判定
        if (hitResult.target.tryEvade()) {
          // 回避成功
          this.damagePopupManager.createTextPopup(
            hitResult.position,
            'MISS!',
            '#aaaaaa'
          );
          continue;
        }

        // 元素反応をチェック
        const reaction = this.reactionSystem.checkAndTriggerReaction(
          hitResult.target,
          hitResult.element,
          hitResult.damage,
          this.enemies
        );

        if (reaction) {
          // 元素反応発生！
          this.handleReaction(reaction, hitResult.position);
        } else {
          // 耐性チェックしてダメージを与える
          const actualDamage = hitResult.target.takeDamage(hitResult.damage, hitResult.element);
          const isResisted = actualDamage < hitResult.damage;
          
          // ダメージポップアップを表示（設定で有効な場合）
          if (this.settingsManager.isShowDamageNumbers()) {
            if (isResisted) {
              // 耐性で軽減された場合は特別な表示
              this.damagePopupManager.createTextPopup(
                hitResult.position,
                'RESIST!',
                '#888888'
              );
            } else {
              this.damagePopupManager.createPopup(
                hitResult.position,
                actualDamage,
                hitResult.isCritical,
                hitResult.isCritical ? '#ffd700' : '#ffffff'
              );
            }
          }
          
          // ヒットエフェクト（設定で有効な場合）
          if (this.settingsManager.isShowParticles()) {
            this.particleSystem.createHitEffect(
              hitResult.position,
              isResisted ? '#888888' : projectile.color,
              hitResult.isCritical ? 10 : 6
            );
          }
        }
        
        // 敵が死んだ場合は爆発パーティクル + トークンドロップ
        if (!hitResult.target.isAlive) {
          // パーティクル（設定で有効な場合）
          if (this.settingsManager.isShowParticles()) {
            this.particleSystem.createDeathExplosion(
              hitResult.position,
              hitResult.targetColor,
              hitResult.target.isBoss() ? 50 : 20  // ボスは大きな爆発
            );
          }
          
          // 図鑑に記録
          this.encyclopediaManager.recordEnemyDefeated(hitResult.target.enemyType);
          
          // ボス撃破時の特別報酬
          if (hitResult.target.isBoss()) {
            this.handleBossDefeat(hitResult.position);
          } else {
            // 通常のトークンドロップ判定
            const droppedTokens = this.economyManager.tryEnemyDrop();
            if (droppedTokens > 0) {
              this.totalTokensEarnedThisGame += droppedTokens;
              this.damagePopupManager.createTextPopup(
                { x: hitResult.position.x, y: hitResult.position.y - 20 },
                `+${droppedTokens}💰`,
                '#f1c40f'
              );
            }
          }
          
          // 敵撃破カウント＆カード補充チェック
          this.onEnemyKilled();
        }
      }
    }

    // 非アクティブな弾を削除
    this.projectiles = this.projectiles.filter((p) => p.isActive);

    // スペルアニメーション更新
    const now = Date.now();
    this.activeSpellAnimations = this.activeSpellAnimations.filter(
      anim => now - anim.startTime < anim.duration
    );

    // エフェクト更新
    this.particleSystem.update();
    this.damagePopupManager.update();
  }

  /**
   * 敵がタワー隣接時に攻撃する処理
   */
  private processEnemyAttacks(currentTime: number): void {
    const { GRID_SIZE } = GAME_CONFIG;
    
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;
      if (enemy.enemyType === 'breaker') continue; // ブレイカーは別処理
      
      // 攻撃可能かチェック
      if (!enemy.canAttackTower(currentTime)) continue;
      
      // 隣接タワーを探す
      for (const tower of this.towers) {
        if (!tower.isAlive) continue;
        
        const dx = tower.position.x - enemy.position.x;
        const dy = tower.position.y - enemy.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 隣接マス（1.5セル以内）でタワーに攻撃
        if (distance < GRID_SIZE * 1.5) {
          const damage = enemy.attackTower(tower, currentTime);
          const destroyed = tower.takeDamage(damage);
          
          // ダメージエフェクト
          this.particleSystem.createHitEffect(tower.position, '#ff6600', 8);
          this.damagePopupManager.createPopup(
            tower.position,
            damage,
            false,
            '#ff6600'
          );
          
          if (destroyed) {
            this.handleTowerDestruction(tower);
          }
          
          break; // 1体の敵は1回の攻撃で1つのタワーのみ
        }
      }
    }
  }

  /**
   * タワー破壊時の処理
   */
  private handleTowerDestruction(tower: Tower): void {
    // 破壊エフェクト
    this.particleSystem.createDeathExplosion(
      tower.position,
      tower.getElementConfig().color,
      25
    );
    
    // グリッドを解放
    this.gridSystem.releaseCell(tower.gridRow, tower.gridCol);
    
    // シナジー再計算
    this.synergySystem.calculateAndApplySynergies(this.towers.filter(t => t.isAlive));
  }

  /**
   * 元素反応を処理
   */
  private handleReaction(
    reaction: { type: string; config: { name: string; color: string }; position: { x: number; y: number }; damage: number; affectedEnemies: Enemy[] },
    hitPosition: { x: number; y: number }
  ): void {
    // 反応名のテキストポップアップ（大きく表示）
    this.damagePopupManager.createTextPopup(
      { x: hitPosition.x, y: hitPosition.y - 30 },
      reaction.config.name,
      reaction.config.color
    );

    // ダメージポップアップ（反応ダメージ）
    if (reaction.damage > 0) {
      this.damagePopupManager.createPopup(
        hitPosition,
        reaction.damage,
        true, // 反応は常にクリティカル表示
        reaction.config.color
      );
    }

    // 反応タイプに応じたエフェクト
    switch (reaction.type) {
      case 'melt':
        // 融解エフェクト（オレンジの爆発）
        this.particleSystem.createDeathExplosion(hitPosition, '#ff9800', 25);
        break;
      
      case 'freeze':
        // 凍結エフェクト（青い結晶）
        this.particleSystem.createHitEffect(hitPosition, '#00bcd4', 20);
        break;
      
      case 'explosion':
        // 爆発エフェクト（大きな赤い爆発）
        this.particleSystem.createDeathExplosion(hitPosition, '#ff5722', 40);
        
        // 影響を受けた全ての敵にエフェクト
        for (const enemy of reaction.affectedEnemies) {
          if (enemy.isAlive) {
            this.particleSystem.createHitEffect(enemy.getCenter(), '#ff5722', 8);
          }
        }
        break;
    }
  }

  /**
   * ウェーブ終了チェック
   */
  private checkWaveComplete(): boolean {
    return (
      this.enemiesSpawned >= this.enemiesPerWave &&
      this.enemies.length === 0
    );
  }

  /**
   * ウェーブ終了処理
   */
  private endWave(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // ウェーブクリアボーナス付与
    const waveBonus = this.economyManager.applyWaveClearBonus();
    this.totalTokensEarnedThisGame += waveBonus.total;

    // ショップフェーズに移行
    this.gameState = 'shop';
    this.startButton.disabled = true;
    this.startButton.textContent = 'ショップ...';

    // ショップアイテムを生成（拡張効果を適用）
    const shopExpansion = this.economyManager.getShopExpansion();
    const rarityBonus = this.economyManager.getRarityBonus();
    const shopItems = this.shopManager.generateShopItems(this.waveNumber, shopExpansion, rarityBonus);
    
    // ショップUIを表示
    this.shopUI.show(shopItems, this.economyManager.getTokens(), waveBonus);

    // 描画更新
    this.draw();
    this.updateUI();
  }

  /**
   * ゲームオーバー処理
   */
  private gameOver(): void {
    this.gameState = 'gameover';
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // プレイ時間を計算
    const duration = Math.floor((Date.now() - this.gameStartTime) / 1000);

    // スコアを計算
    const score = this.calculateScore();

    // メインタワー（使用頻度Top3）を取得
    const mainTowers = this.getMainTowers();

    // 図鑑データを保存
    this.encyclopediaManager.saveAll();

    // 経験値を付与
    const result = this.progressManager.addGameResult(
      this.waveNumber,
      this.totalEnemiesKilledThisGame,
      false // ゲームオーバーなのでクリアではない
    );

    // 永続Tokenを付与（獲得Tokenの一部が永続化）
    const permanentTokenBonus = Math.floor(this.totalTokensEarnedThisGame * 0.5);
    this.progressManager.addPermanentTokens(permanentTokenBonus);

    // 戦歴を追加
    this.progressManager.addMatchHistory({
      date: new Date().toISOString(),
      waveReached: this.waveNumber,
      enemiesKilled: this.totalEnemiesKilledThisGame,
      tokensEarned: this.totalTokensEarnedThisGame,
      xpEarned: result.xpGained,
      score,
      mainTowers,
      duration,
    });

    this.startButton.disabled = false;
    this.startButton.textContent = 'タイトルに戻る';
    
    // ボタンにワンショットイベントを追加
    const returnToTitle = () => {
      this.startButton.removeEventListener('click', returnToTitle);
      this.returnToTitle();
    };
    this.startButton.addEventListener('click', returnToTitle);

    // 最終描画
    this.draw();
    
    // ゲームオーバー表示
    this.drawGameOverScreen(result);
  }

  /**
   * ゲームオーバー画面を描画
   */
  private drawGameOverScreen(result: { xpGained: number; newRank: number; rankUp: boolean; newUnlocks: { name: string; icon: string }[] }): void {
    const { CANVAS_WIDTH, CANVAS_HEIGHT } = GAME_CONFIG;
    const centerX = CANVAS_WIDTH / 2;
    const permanentTokenBonus = Math.floor(this.totalTokensEarnedThisGame * 0.5);
    const score = this.calculateScore();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // タイトル
    this.ctx.font = 'bold 42px sans-serif';
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('GAME OVER', centerX, 60);
    
    // 結果
    this.ctx.font = '20px sans-serif';
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(`Wave ${this.waveNumber} まで到達`, centerX, 110);
    
    this.ctx.font = '16px sans-serif';
    this.ctx.fillStyle = '#aaa';
    this.ctx.fillText(`撃破数: ${this.totalEnemiesKilledThisGame}  |  スコア: ${score.toLocaleString()}`, centerX, 140);

    // 報酬表示
    let rewardY = 180;
    
    // 経験値獲得
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.fillStyle = '#ffd700';
    this.ctx.fillText(`+${result.xpGained} XP`, centerX - 60, rewardY);
    
    // 永続Token獲得
    this.ctx.fillStyle = '#f1c40f';
    this.ctx.fillText(`+${permanentTokenBonus} 💰`, centerX + 60, rewardY);

    // ランクアップ表示
    if (result.rankUp) {
      rewardY += 50;
      this.ctx.font = 'bold 24px sans-serif';
      this.ctx.fillStyle = '#2ecc71';
      this.ctx.fillText(`🎉 RANK UP! → Rank ${result.newRank}`, centerX, rewardY);
      
      // 新しいアンロック
      if (result.newUnlocks.length > 0) {
        rewardY += 35;
        this.ctx.font = '14px sans-serif';
        this.ctx.fillStyle = '#ffd700';
        this.ctx.fillText('新しくアンロック:', centerX, rewardY);
        
        result.newUnlocks.forEach((unlock, i) => {
          this.ctx.fillText(`${unlock.icon} ${unlock.name}`, centerX, rewardY + 25 + i * 22);
        });
      }
    }

    // 使用タワー表示
    const mainTowers = this.getMainTowers();
    if (mainTowers.length > 0) {
      this.ctx.font = '14px sans-serif';
      this.ctx.fillStyle = '#888';
      this.ctx.fillText('メインタワー:', centerX, CANVAS_HEIGHT - 100);
      
      this.ctx.font = '28px sans-serif';
      const towerIcons = mainTowers.map(el => this.getElementIcon(el)).join(' ');
      this.ctx.fillText(towerIcons, centerX, CANVAS_HEIGHT - 70);
    }

    // 続行ボタンの案内
    this.ctx.font = '14px sans-serif';
    this.ctx.fillStyle = '#888';
    this.ctx.fillText('クリックでタイトルに戻る', centerX, CANVAS_HEIGHT - 30);
  }

  /**
   * スコアを計算
   */
  private calculateScore(): number {
    const waveScore = this.waveNumber * 1000;
    const killScore = this.totalEnemiesKilledThisGame * 50;
    const tokenScore = this.totalTokensEarnedThisGame * 10;
    const towerScore = this.towers.length * 100;
    
    return waveScore + killScore + tokenScore + towerScore;
  }

  /**
   * 使用頻度の高いタワーTop3を取得
   */
  private getMainTowers(): ElementType[] {
    const sorted = [...this.towerUsageCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([element]) => element);
    
    return sorted;
  }

  /**
   * Canvasに描画
   */
  private draw(): void {
    const { CANVAS_WIDTH, CANVAS_HEIGHT, BACKGROUND_COLOR } = GAME_CONFIG;

    // 背景クリア
    this.ctx.fillStyle = BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // グリッド描画
    this.gridSystem.draw(this.ctx);

    // パス描画（グリッドの上に）
    this.pathSystem.draw(this.ctx);

    // ホバーセル描画（ドラッグ中またはマウスホバー中）
    if (this.hoverCell) {
      this.drawHoverCellWithMergePreview();
    }

    // タワー描画
    for (const tower of this.towers) {
      tower.draw(this.ctx, true);
    }

    // 敵描画
    for (const enemy of this.enemies) {
      enemy.draw(this.ctx);
    }

    // 弾描画
    for (const projectile of this.projectiles) {
      projectile.draw(this.ctx);
    }

    // スペルエフェクト描画
    this.drawSpellEffects();

    // パーティクル描画
    this.particleSystem.draw(this.ctx);

    // ダメージポップアップ描画
    this.damagePopupManager.draw(this.ctx);

    // ドラッグ中のカードプレビュー
    if (this.draggingCard && this.dragPosition) {
      this.drawDragPreview();
    }

    // ショップ画面を描画
    if (this.gameState === 'shop') {
      this.shopUI.draw(
        this.ctx, 
        ECONOMY_CONFIG.SHOP_REROLL_COST,
        this.shopManager.getRerollTokens()
      );
    }

    // ボスウェーブ警告を描画
    if (this.showBossWarning) {
      this.drawBossWarning();
    }

    // タイトル画面はDOMベースになったため、Canvasでの描画は不要
    // SceneManagerがタイトルシーンの場合は背景アニメーションがTitleScreenで処理される
  }

  /**
   * ボスウェーブ警告を描画
   */
  private drawBossWarning(): void {
    const { CANVAS_WIDTH, CANVAS_HEIGHT } = GAME_CONFIG;
    const elapsed = performance.now() - this.bossWarningStartTime;
    
    // 2秒間表示
    if (elapsed > 2000) return;

    // 画面を赤く点滅
    const flash = Math.sin(elapsed / 100) * 0.3 + 0.3;
    this.ctx.fillStyle = `rgba(192, 57, 43, ${flash})`;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 警告テキスト
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    
    // 背景ボックス
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(centerX - 200, centerY - 60, 400, 120);
    this.ctx.strokeStyle = '#c0392b';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(centerX - 200, centerY - 60, 400, 120);

    // WARNING テキスト（点滅）
    const textFlash = Math.floor(elapsed / 300) % 2 === 0;
    if (textFlash) {
      this.ctx.font = 'bold 36px sans-serif';
      this.ctx.fillStyle = '#e74c3c';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('⚠️ WARNING ⚠️', centerX, centerY - 20);
    }

    // BOSS APPROACHING テキスト
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.fillStyle = '#ffd700';
    this.ctx.fillText('BOSS APPROACHING', centerX, centerY + 25);
  }

  /**
   * スペルエフェクトを描画
   */
  private drawSpellEffects(): void {
    const now = Date.now();
    
    for (const anim of this.activeSpellAnimations) {
      const elapsed = now - anim.startTime;
      const progress = Math.min(1, elapsed / anim.duration);
      
      this.spellSystem.drawSpellEffect(
        this.ctx,
        anim.spellType,
        anim.position,
        progress
      );
    }
  }

  /**
   * ホバーセルを描画（合成プレビュー対応）
   */
  private drawHoverCellWithMergePreview(): void {
    if (!this.hoverCell) return;

    const { row, col } = this.hoverCell;
    const existingTower = this.getTowerAt(row, col);

    // タワーカードの場合のみ合成プレビュー
    if (existingTower && this.draggingCard && this.draggingCard.isTowerCard()) {
      // 合成可能かチェック
      const canMerge = this.draggingCard.element && 
        existingTower.canMergeWith(this.draggingCard.element, 1);
      
      if (canMerge) {
        // 合成可能：金色でハイライト
        const { GRID_SIZE } = GAME_CONFIG;
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
        this.ctx.fillRect(col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);

        // 「Lv UP!」テキスト
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.fillStyle = '#ffd700';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
          'Lv UP!', 
          col * GRID_SIZE + GRID_SIZE / 2, 
          row * GRID_SIZE + GRID_SIZE - 8
        );
      } else {
        // 合成不可：赤でハイライト
        this.gridSystem.drawHoverCell(this.ctx, row, col);
      }
    } else if (!this.draggingCard?.isSpellCard()) {
      // 通常のホバー表示（スペルカード以外）
      this.gridSystem.drawHoverCell(this.ctx, row, col);
    }
  }

  /**
   * ドラッグ中のカードプレビューを描画
   */
  private drawDragPreview(): void {
    if (!this.draggingCard || !this.dragPosition) return;

    // スペルカードの場合
    if (this.draggingCard.isSpellCard() && this.draggingCard.spellType) {
      this.spellSystem.drawSpellPreview(
        this.ctx,
        this.draggingCard.spellType,
        this.dragPosition
      );
      return;
    }

    // タワーカードの場合
    if (!this.draggingCard.isTowerCard() || !this.hoverCell) return;

    const { row, col } = this.hoverCell;
    const existingTower = this.getTowerAt(row, col);

    // 既存タワーがある場合は合成プレビュー（drawHoverCellWithMergePreviewで処理済み）
    if (existingTower) {
      return;
    }

    const canPlace = this.gridSystem.canPlaceTower(row, col);
    if (!canPlace) return;

    const centerPos = this.gridSystem.getCellCenter(row, col);
    const elementConfig = this.draggingCard.getElementConfig();
    if (!elementConfig) return;

    const size = 30;
    const halfSize = size / 2;

    // 半透明のタワープレビュー
    this.ctx.globalAlpha = 0.6;
    
    this.ctx.fillStyle = elementConfig.color;
    this.ctx.fillRect(
      centerPos.x - halfSize,
      centerPos.y - halfSize,
      size,
      size
    );
    
    this.ctx.strokeStyle = elementConfig.borderColor;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      centerPos.x - halfSize,
      centerPos.y - halfSize,
      size,
      size
    );

    // 範囲プレビュー
    this.ctx.beginPath();
    this.ctx.arc(centerPos.x, centerPos.y, 120, 0, Math.PI * 2);
    this.ctx.fillStyle = `${elementConfig.color}30`;
    this.ctx.fill();
    
    this.ctx.globalAlpha = 1.0;

    // シナジープレビュー（設定で有効な場合）
    if (this.draggingCard.element && this.settingsManager.isShowSynergyPreview()) {
      this.drawSynergyPreview(row, col, this.draggingCard.element);
    }
  }

  /**
   * シナジープレビューを描画
   */
  private drawSynergyPreview(row: number, col: number, element: ElementType): void {
    const preview = this.synergySystem.previewSynergies(
      element, row, col, this.towers
    );

    // 新タワーが得るシナジーを表示
    if (preview.newTowerSynergies.length > 0) {
      const centerPos = this.gridSystem.getCellCenter(row, col);
      this.ctx.font = 'bold 10px sans-serif';
      this.ctx.fillStyle = '#ffd700';
      this.ctx.textAlign = 'center';
      const synergyText = preview.newTowerSynergies.map(s => s.icon).join('');
      this.ctx.fillText(synergyText, centerPos.x, centerPos.y - 25);
    }

    // 影響を受けるタワーをハイライト
    for (const { tower, newSynergies } of preview.affectedTowers) {
      if (newSynergies.length > tower.activeSynergies.length) {
        // シナジーが増える場合、金色の枠を表示
        const { GRID_SIZE } = GAME_CONFIG;
        this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]);
        this.ctx.strokeRect(
          tower.gridCol * GRID_SIZE + 2,
          tower.gridRow * GRID_SIZE + 2,
          GRID_SIZE - 4,
          GRID_SIZE - 4
        );
        this.ctx.setLineDash([]);
      }
    }
  }

  /**
   * UI更新
   */
  private updateUI(): void {
    this.waveCountElement.textContent = String(this.waveNumber);
    this.enemyCountElement.textContent = String(this.enemies.length);
    this.towerCountElement.textContent = String(this.towers.length);
    
    // 拠点HP表示
    if (this.baseHPElement) {
      this.baseHPElement.textContent = String(Math.max(0, this.baseHP));
      // HPに応じて色を変える
      if (this.baseHP <= 30) {
        this.baseHPElement.style.color = '#e74c3c';
      } else if (this.baseHP <= 60) {
        this.baseHPElement.style.color = '#f39c12';
      } else {
        this.baseHPElement.style.color = '#2ecc71';
      }
    }

    // トークン表示を更新
    if (this.tokenDisplayElement) {
      this.tokenDisplayElement.textContent = String(this.economyManager.getTokens());
    }

    // シナジー表示を更新
    this.updateSynergyDisplay();

    // デッキ情報を更新
    this.updateDeckDisplay();
  }

  /**
   * シナジー表示を更新
   */
  private updateSynergyDisplay(): void {
    if (!this.synergyListElement) return;

    const synergySummary = this.synergySystem.getActiveSynergySummary(this.towers);
    
    if (synergySummary.size === 0) {
      this.synergyListElement.innerHTML = '<span class="no-synergy">なし</span>';
      return;
    }

    const items: string[] = [];
    synergySummary.forEach((count, name) => {
      items.push(`<span class="synergy-item">${name} ×${count}</span>`);
    });
    
    this.synergyListElement.innerHTML = items.join('');
  }

  /**
   * デッキ情報を更新
   */
  private updateDeckDisplay(): void {
    if (this.deckTotalElement) {
      this.deckTotalElement.textContent = String(this.deckManager.getTotalCardCount());
    }

    if (this.upgradeListElement) {
      const upgrades = this.deckManager.getUpgrades();
      const upgradeTexts: string[] = [];

      // ダメージボーナス
      for (const [element, bonus] of Object.entries(upgrades.damageBonus)) {
        if (bonus > 1.0) {
          const icon = element === 'fire' ? '🔥' : element === 'ice' ? '❄️' : '⚡';
          upgradeTexts.push(`${icon} +${Math.round((bonus - 1) * 100)}%`);
        }
      }

      // 全体ダメージボーナス
      if (upgrades.allDamageBonus > 1.0) {
        upgradeTexts.push(`⚔️ 全体 +${Math.round((upgrades.allDamageBonus - 1) * 100)}%`);
      }

      // 発射速度ボーナス
      if (upgrades.fireRateBonus < 1.0) {
        upgradeTexts.push(`⚡ 速度 +${Math.round((1 - upgrades.fireRateBonus) * 100)}%`);
      }

      // 射程ボーナス
      if (upgrades.rangeBonus > 0) {
        upgradeTexts.push(`🎯 射程 +${upgrades.rangeBonus}`);
      }

      if (upgradeTexts.length === 0) {
        this.upgradeListElement.innerHTML = '<span style="color: #555;">なし</span>';
      } else {
        this.upgradeListElement.innerHTML = upgradeTexts.map(t => 
          `<div style="margin-bottom: 2px; color: #2ecc71;">${t}</div>`
        ).join('');
      }
    }
  }
}
