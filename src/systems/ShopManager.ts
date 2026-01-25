import {
  ShopItem,
  ShopItemType,
  ECONOMY_CONFIG,
  SHOP_PRICES,
  ARTIFACT_CONFIGS,
  ArtifactEffectType,
  ElementType,
  SpellType,
  ELEMENT_CONFIGS,
  SPELL_CONFIGS,
} from '../types';

/**
 * ショップ管理クラス
 * ショップアイテムの生成と購入処理を管理
 */
export class ShopManager {
  private currentItems: ShopItem[];
  private itemIdCounter: number;
  private handSizeUpsPurchased: number;
  private rerollTokens: number;

  constructor() {
    this.currentItems = [];
    this.itemIdCounter = 0;
    this.handSizeUpsPurchased = 0;
    this.rerollTokens = 0;
  }

  /**
   * アイテムIDを生成
   */
  private generateItemId(): string {
    return `shop-item-${++this.itemIdCounter}`;
  }

  /**
   * ショップの商品を生成
   * @param shopExpansion Expansion Pack効果による追加枠
   * @param rarityBonus VIP Membership効果によるレアリティボーナス
   */
  generateShopItems(waveNumber: number, shopExpansion: number = 0, rarityBonus: number = 0): ShopItem[] {
    this.currentItems = [];
    const itemCount = ECONOMY_CONFIG.SHOP_ITEMS_COUNT + shopExpansion;

    // 必ず含めるアイテムタイプ
    const guaranteedTypes: ShopItemType[] = ['new_card'];
    
    // 利用可能なアイテムタイプ（ウェーブに応じて解放）
    const availableTypes: ShopItemType[] = [
      'new_card',
      'base_repair',
    ];
    
    if (waveNumber >= 2) {
      availableTypes.push('reroll_token');
      availableTypes.push('expansion_pack'); // 早めに入手できるように
    }
    if (waveNumber >= 3) {
      availableTypes.push('tower_upgrade');
      availableTypes.push('vip_membership');
      availableTypes.push('recycle_bin');
    }
    if (waveNumber >= 4 && this.handSizeUpsPurchased < 2) {
      availableTypes.push('hand_size_up');
    }
    if (waveNumber >= 5) {
      availableTypes.push('artifact');
    }

    // 保証アイテムを追加
    for (const type of guaranteedTypes) {
      this.currentItems.push(this.createItem(type, waveNumber, rarityBonus));
    }

    // 残りをランダムに追加（無限ループ防止）
    let attempts = 0;
    const maxAttempts = 50;
    while (this.currentItems.length < itemCount && attempts < maxAttempts) {
      attempts++;
      const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      
      // 同じタイプが重複しすぎないようにチェック
      const sameTypeCount = this.currentItems.filter(i => i.type === randomType).length;
      if (randomType === 'new_card' && sameTypeCount >= 2) continue;
      if (randomType !== 'new_card' && sameTypeCount >= 1) continue;
      
      this.currentItems.push(this.createItem(randomType, waveNumber, rarityBonus));
    }
    
    // それでも足りなければnew_cardで埋める
    while (this.currentItems.length < itemCount) {
      this.currentItems.push(this.createItem('new_card', waveNumber, rarityBonus));
    }

    return this.currentItems;
  }

  /**
   * 個別アイテムを作成
   */
  private createItem(type: ShopItemType, _waveNumber: number, _rarityBonus: number = 0): ShopItem {
    const basePrice = SHOP_PRICES[type];
    
    switch (type) {
      case 'new_card':
        return this.createNewCardItem(basePrice);
      case 'hand_size_up':
        return this.createHandSizeUpItem(basePrice);
      case 'reroll_token':
        return this.createRerollTokenItem(basePrice);
      case 'base_repair':
        return this.createBaseRepairItem(basePrice);
      case 'artifact':
        return this.createArtifactItem(basePrice);
      case 'tower_upgrade':
        return this.createTowerUpgradeItem(basePrice);
      case 'expansion_pack':
        return this.createExpansionPackItem(basePrice);
      case 'vip_membership':
        return this.createVIPMembershipItem(basePrice);
      case 'recycle_bin':
        return this.createRecycleBinItem(basePrice);
      default:
        return this.createNewCardItem(basePrice);
    }
  }

  /**
   * 新カードアイテムを作成
   * 出現率: Physical 60%, Elemental 40%（スペルは別枠）
   */
  private createNewCardItem(basePrice: number): ShopItem {
    // タワーカードかスペルカードをランダムに決定（20%でスペル）
    const isSpell = Math.random() < 0.2;
    
    if (isSpell) {
      const spells: SpellType[] = ['meteor', 'blizzard', 'oil_bomb'];
      const spellType = spells[Math.floor(Math.random() * spells.length)];
      const config = SPELL_CONFIGS[spellType];
      
      return {
        id: this.generateItemId(),
        type: 'new_card',
        name: `${config.name}カード`,
        description: config.description,
        icon: config.icon,
        price: basePrice + 20, // スペルは少し高い
        cardType: 'spell',
        spellType,
      };
    } else {
      // Physical: 60%, Elemental: 40%
      const isPhysical = Math.random() < 0.6;
      
      if (isPhysical) {
        const config = ELEMENT_CONFIGS['physical'];
        return {
          id: this.generateItemId(),
          type: 'new_card',
          name: `${config.name}タワー`,
          description: 'シンプルで安定したタワー',
          icon: config.icon,
          price: Math.floor(basePrice * 0.8), // 物理は安い
          cardType: 'tower',
          element: 'physical',
        };
      } else {
        // 属性タワー（fire, ice, lightning）
        const elements: ElementType[] = ['fire', 'ice', 'lightning'];
        const element = elements[Math.floor(Math.random() * elements.length)];
        const config = ELEMENT_CONFIGS[element];
        
        return {
          id: this.generateItemId(),
          type: 'new_card',
          name: `${config.name}タワー`,
          description: `${config.name}属性のタワーカード（シナジー効果あり）`,
          icon: config.icon,
          price: Math.floor(basePrice * 1.2), // 属性は高い
          cardType: 'tower',
          element,
        };
      }
    }
  }

  /**
   * 手札上限アップアイテムを作成
   */
  private createHandSizeUpItem(basePrice: number): ShopItem {
    // 購入回数に応じて価格上昇
    const price = basePrice + this.handSizeUpsPurchased * 50;
    
    return {
      id: this.generateItemId(),
      type: 'hand_size_up',
      name: '手札拡張',
      description: '手札上限+1（永続）',
      icon: '🃏',
      price,
    };
  }

  /**
   * リロールトークンアイテムを作成
   */
  private createRerollTokenItem(basePrice: number): ShopItem {
    return {
      id: this.generateItemId(),
      type: 'reroll_token',
      name: 'リロールトークン',
      description: '手札を引き直せる',
      icon: '🔄',
      price: basePrice,
    };
  }

  /**
   * 拠点修復アイテムを作成
   */
  private createBaseRepairItem(basePrice: number): ShopItem {
    return {
      id: this.generateItemId(),
      type: 'base_repair',
      name: '拠点修復',
      description: '拠点HP+30',
      icon: '🔧',
      price: basePrice,
    };
  }

  /**
   * アーティファクトアイテムを作成
   */
  private createArtifactItem(basePrice: number): ShopItem {
    const effects: ArtifactEffectType[] = [
      'fire_damage_up',
      'ice_damage_up',
      'lightning_damage_up',
      'all_damage_up',
      'tower_hp_up',
      'interest_rate_up',
    ];
    
    const effect = effects[Math.floor(Math.random() * effects.length)];
    const config = ARTIFACT_CONFIGS[effect];
    
    return {
      id: this.generateItemId(),
      type: 'artifact',
      name: config.name,
      description: config.description,
      icon: config.icon,
      price: basePrice,
      artifactEffect: effect,
      artifactValue: config.value,
    };
  }

  /**
   * タワーアップグレードアイテムを作成
   */
  private createTowerUpgradeItem(basePrice: number): ShopItem {
    const elements: ElementType[] = ['physical', 'fire', 'ice', 'lightning'];
    const element = elements[Math.floor(Math.random() * elements.length)];
    const config = ELEMENT_CONFIGS[element];
    
    return {
      id: this.generateItemId(),
      type: 'tower_upgrade',
      name: `${config.name}強化`,
      description: `${config.name}タワーのダメージ+10%`,
      icon: `⬆️${config.icon}`,
      price: basePrice,
      element,
    };
  }

  /**
   * 拡張パックアイテムを作成
   */
  private createExpansionPackItem(basePrice: number): ShopItem {
    return {
      id: this.generateItemId(),
      type: 'expansion_pack',
      name: '拡張パック',
      description: 'ショップ選択肢+1（永続）',
      icon: '📦',
      price: basePrice,
      artifactEffect: 'expansion_pack',
    };
  }

  /**
   * VIPメンバーシップアイテムを作成
   */
  private createVIPMembershipItem(basePrice: number): ShopItem {
    return {
      id: this.generateItemId(),
      type: 'vip_membership',
      name: 'VIPメンバーシップ',
      description: 'レア出現率+15%（永続）',
      icon: '👑',
      price: basePrice,
      artifactEffect: 'vip_membership',
    };
  }

  /**
   * リサイクルビンアイテムを作成
   */
  private createRecycleBinItem(basePrice: number): ShopItem {
    return {
      id: this.generateItemId(),
      type: 'recycle_bin',
      name: 'リサイクルビン',
      description: 'カード破棄時Token獲得',
      icon: '♻️',
      price: basePrice,
      artifactEffect: 'recycle_bin',
    };
  }

  /**
   * 現在の商品一覧を取得
   */
  getCurrentItems(): ShopItem[] {
    return [...this.currentItems];
  }

  /**
   * 商品を購入（削除）
   */
  purchaseItem(itemId: string): ShopItem | null {
    const index = this.currentItems.findIndex(item => item.id === itemId);
    if (index === -1) return null;
    
    const item = this.currentItems[index];
    this.currentItems.splice(index, 1);
    
    // 購入回数を記録
    if (item.type === 'hand_size_up') {
      this.handSizeUpsPurchased++;
    }
    
    return item;
  }

  /**
   * 商品をリロール
   */
  rerollItems(waveNumber: number, shopExpansion: number = 0, rarityBonus: number = 0): ShopItem[] {
    return this.generateShopItems(waveNumber, shopExpansion, rarityBonus);
  }

  /**
   * リロールトークンを追加
   */
  addRerollToken(): void {
    this.rerollTokens++;
  }

  /**
   * リロールトークンを使用
   */
  useRerollToken(): boolean {
    if (this.rerollTokens > 0) {
      this.rerollTokens--;
      return true;
    }
    return false;
  }

  /**
   * リロールトークン数を取得
   */
  getRerollTokens(): number {
    return this.rerollTokens;
  }

  /**
   * 手札サイズアップ購入回数を取得
   */
  getHandSizeUpsPurchased(): number {
    return this.handSizeUpsPurchased;
  }

  /**
   * リセット
   */
  reset(): void {
    this.currentItems = [];
    this.handSizeUpsPurchased = 0;
    this.rerollTokens = 0;
  }
}
