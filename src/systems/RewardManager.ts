import {
  Reward,
  RewardRarity,
  RewardType,
  NewCardReward,
  UpgradeReward,
  HealReward,
  RARITY_CONFIGS,
  ElementType,
  SpellType,
  ELEMENT_CONFIGS,
  SPELL_CONFIGS,
} from '../types';

/**
 * 報酬管理クラス
 * ウェーブクリア時の報酬生成と管理を担当
 */
export class RewardManager {
  private rewardIdCounter: number;

  constructor() {
    this.rewardIdCounter = 0;
  }

  /**
   * 報酬IDを生成
   */
  private generateRewardId(): string {
    return `reward-${++this.rewardIdCounter}`;
  }

  /**
   * 報酬選択肢を生成
   * @param waveNumber 現在のウェーブ番号（難易度に影響）
   * @param currentHP 現在の拠点HP
   * @param maxHP 最大拠点HP
   * @returns 3つの報酬選択肢
   */
  generateRewardChoices(
    waveNumber: number,
    currentHP: number,
    maxHP: number
  ): Reward[] {
    const rewards: Reward[] = [];
    const usedTypes = new Set<string>();

    // 3つの報酬を生成
    for (let i = 0; i < 3; i++) {
      const rarity = this.selectRarity(waveNumber);
      const type = this.selectRewardType(currentHP, maxHP, usedTypes);
      
      let reward: Reward;
      
      switch (type) {
        case 'new_card':
          reward = this.generateNewCardReward(rarity);
          break;
        case 'upgrade':
          reward = this.generateUpgradeReward(rarity);
          break;
        case 'heal':
          reward = this.generateHealReward(rarity, currentHP, maxHP);
          break;
      }
      
      // 重複を避けるためにキーを記録
      const key = this.getRewardKey(reward);
      if (!usedTypes.has(key)) {
        usedTypes.add(key);
        rewards.push(reward);
      } else {
        // 重複した場合はやり直し
        i--;
        if (i < -10) break; // 無限ループ防止
      }
    }

    return rewards;
  }

  /**
   * 報酬の一意キーを取得
   */
  private getRewardKey(reward: Reward): string {
    if (reward.type === 'new_card') {
      const r = reward as NewCardReward;
      return `card-${r.cardType}-${r.element || r.spellType}`;
    } else if (reward.type === 'upgrade') {
      const r = reward as UpgradeReward;
      return `upgrade-${r.upgradeType}-${r.targetElement || 'all'}`;
    } else {
      return `heal-${(reward as HealReward).healAmount}`;
    }
  }

  /**
   * レアリティを選択（ウェーブが進むほどレアが出やすい）
   */
  private selectRarity(waveNumber: number): RewardRarity {
    // ウェーブごとにレア・エピックの確率を上げる
    const rareBonus = Math.min(waveNumber * 2, 20); // 最大+20%
    const epicBonus = Math.min(waveNumber * 0.5, 10); // 最大+10%

    const weights = {
      common: RARITY_CONFIGS.common.weight - rareBonus - epicBonus,
      rare: RARITY_CONFIGS.rare.weight + rareBonus,
      epic: RARITY_CONFIGS.epic.weight + epicBonus,
    };

    const total = weights.common + weights.rare + weights.epic;
    const random = Math.random() * total;

    if (random < weights.epic) {
      return 'epic';
    } else if (random < weights.epic + weights.rare) {
      return 'rare';
    } else {
      return 'common';
    }
  }

  /**
   * 報酬タイプを選択（HPが減っていると回復が出やすい）
   */
  private selectRewardType(
    currentHP: number,
    maxHP: number,
    _usedTypes: Set<string>
  ): RewardType {
    const hpRatio = currentHP / maxHP;
    
    // 回復が必要かどうか
    const needsHeal = hpRatio < 0.8;
    
    // 基本確率
    let cardChance = 40;
    let upgradeChance = 40;
    let healChance = needsHeal ? 20 : 0;
    
    // HPが低いほど回復の確率を上げる
    if (hpRatio < 0.5) {
      healChance = 40;
      cardChance = 30;
      upgradeChance = 30;
    } else if (hpRatio < 0.3) {
      healChance = 60;
      cardChance = 20;
      upgradeChance = 20;
    }

    const total = cardChance + upgradeChance + healChance;
    const random = Math.random() * total;

    if (random < healChance && needsHeal) {
      return 'heal';
    } else if (random < healChance + upgradeChance) {
      return 'upgrade';
    } else {
      return 'new_card';
    }
  }

  /**
   * 新カード報酬を生成
   */
  private generateNewCardReward(rarity: RewardRarity): NewCardReward {
    const isSpell = Math.random() < 0.3; // 30%でスペル
    const rarityConfig = RARITY_CONFIGS[rarity];

    if (isSpell) {
      const spells: SpellType[] = ['meteor', 'blizzard', 'oil_bomb'];
      const spellType = spells[Math.floor(Math.random() * spells.length)];
      const spellConfig = SPELL_CONFIGS[spellType];

      return {
        id: this.generateRewardId(),
        type: 'new_card',
        rarity,
        name: `${spellConfig.name}カード`,
        description: `${spellConfig.description}\nデッキに追加`,
        icon: spellConfig.icon,
        color: rarityConfig.color,
        cardType: 'spell',
        spellType,
      };
    } else {
      const elements: ElementType[] = ['fire', 'ice', 'lightning'];
      const element = elements[Math.floor(Math.random() * elements.length)];
      const elementConfig = ELEMENT_CONFIGS[element];

      return {
        id: this.generateRewardId(),
        type: 'new_card',
        rarity,
        name: `${elementConfig.name}タワーカード`,
        description: `${elementConfig.name}属性のタワー\nデッキに追加`,
        icon: elementConfig.icon,
        color: rarityConfig.color,
        cardType: 'tower',
        element,
      };
    }
  }

  /**
   * アップグレード報酬を生成
   */
  private generateUpgradeReward(rarity: RewardRarity): UpgradeReward {
    const rarityConfig = RARITY_CONFIGS[rarity];
    
    // レアリティに応じて強力なアップグレードを選択
    let selectedType: 'damage' | 'range' | 'fire_rate' | 'all_damage';
    let value: number;
    let targetElement: ElementType | undefined;
    let name: string;
    let description: string;
    let icon: string;

    if (rarity === 'epic') {
      // エピック: 全属性ダメージアップ
      selectedType = 'all_damage';
      value = 0.25; // 25%アップ
      name = '全属性強化';
      description = '全タワーのダメージ+25%';
      icon = '⚔️';
    } else if (rarity === 'rare') {
      // レア: 発射速度アップまたは射程アップ
      if (Math.random() < 0.5) {
        selectedType = 'fire_rate';
        value = 0.15; // 15%速く
        name = '連射強化';
        description = '全タワーの発射速度+15%';
        icon = '⚡';
      } else {
        selectedType = 'range';
        value = 15; // +15px
        name = '射程強化';
        description = '全タワーの射程+15';
        icon = '🎯';
      }
    } else {
      // コモン: 特定属性のダメージアップ
      selectedType = 'damage';
      const elements: ElementType[] = ['fire', 'ice', 'lightning'];
      targetElement = elements[Math.floor(Math.random() * elements.length)];
      const elementConfig = ELEMENT_CONFIGS[targetElement];
      value = 0.15; // 15%アップ
      name = `${elementConfig.name}強化`;
      description = `${elementConfig.name}タワーのダメージ+15%`;
      icon = elementConfig.icon;
    }

    return {
      id: this.generateRewardId(),
      type: 'upgrade',
      rarity,
      name,
      description,
      icon,
      color: rarityConfig.color,
      upgradeType: selectedType,
      targetElement,
      value,
    };
  }

  /**
   * 回復報酬を生成
   */
  private generateHealReward(
    rarity: RewardRarity,
    currentHP: number,
    maxHP: number
  ): HealReward {
    const rarityConfig = RARITY_CONFIGS[rarity];
    const missingHP = maxHP - currentHP;
    
    let healAmount: number;
    let name: string;
    let description: string;

    switch (rarity) {
      case 'epic':
        healAmount = maxHP; // 全回復
        name = '完全回復';
        description = `拠点HPを全回復`;
        break;
      case 'rare':
        healAmount = Math.min(50, missingHP);
        name = '大回復';
        description = `拠点HP+50`;
        break;
      default:
        healAmount = Math.min(20, missingHP);
        name = '回復';
        description = `拠点HP+20`;
        break;
    }

    return {
      id: this.generateRewardId(),
      type: 'heal',
      rarity,
      name,
      description,
      icon: '💚',
      color: rarityConfig.color,
      healAmount,
    };
  }

  /**
   * 報酬の効果を適用
   * @returns 適用されたかどうか
   */
  applyReward(
    reward: Reward,
    deckManager: { addCard: (cardType: 'tower' | 'spell', element?: ElementType, spellType?: SpellType) => void; applyUpgrade: (upgradeType: 'damage' | 'range' | 'fire_rate' | 'all_damage', value: number, targetElement?: ElementType) => void },
    healCallback: (amount: number) => void
  ): boolean {
    switch (reward.type) {
      case 'new_card':
        const cardReward = reward as NewCardReward;
        deckManager.addCard(cardReward.cardType, cardReward.element, cardReward.spellType);
        return true;
      
      case 'upgrade':
        const upgradeReward = reward as UpgradeReward;
        deckManager.applyUpgrade(
          upgradeReward.upgradeType,
          upgradeReward.value,
          upgradeReward.targetElement
        );
        return true;
      
      case 'heal':
        const healReward = reward as HealReward;
        healCallback(healReward.healAmount);
        return true;
    }
  }
}
