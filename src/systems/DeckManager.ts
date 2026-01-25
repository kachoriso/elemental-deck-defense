import {
  DeckCard,
  CardType,
  ElementType,
  SpellType,
  PlayerUpgrades,
  HAND_CONFIG,
} from '../types';
import { Card } from '../entities/Card';

/**
 * デッキ管理クラス
 * プレイヤーの所持カードとアップグレード状態を管理
 */
export class DeckManager {
  private deck: DeckCard[];
  private upgrades: PlayerUpgrades;
  private cardIdCounter: number;

  constructor() {
    this.cardIdCounter = 0;
    this.deck = this.createInitialDeck();
    this.upgrades = this.createInitialUpgrades();
  }

  /**
   * 初期デッキを作成
   * 物理タワーのみでスタート（属性タワーはショップ・報酬で獲得）
   */
  private createInitialDeck(): DeckCard[] {
    return [
      // 物理タワーカード（初期デッキ）
      { id: this.generateCardId(), cardType: 'tower', element: 'physical', count: 3 },
      // 属性タワーやスペルカードはショップ・報酬でのみ獲得
    ];
  }

  /**
   * 初期アップグレード状態を作成
   */
  private createInitialUpgrades(): PlayerUpgrades {
    return {
      damageBonus: {
        physical: 1.0,
        fire: 1.0,
        ice: 1.0,
        lightning: 1.0,
        poison: 1.0,
        light: 1.0,
        arcane: 1.0,
      },
      rangeBonus: 0,
      fireRateBonus: 1.0,
      allDamageBonus: 1.0,
    };
  }

  /**
   * カードIDを生成
   */
  private generateCardId(): string {
    return `deck-card-${++this.cardIdCounter}`;
  }

  /**
   * デッキにカードを追加
   */
  addCard(cardType: CardType, element?: ElementType, spellType?: SpellType): void {
    // 既存のカードを探す
    const existingCard = this.deck.find(card => {
      if (cardType === 'tower') {
        return card.cardType === 'tower' && card.element === element;
      } else {
        return card.cardType === 'spell' && card.spellType === spellType;
      }
    });

    if (existingCard) {
      // 既存カードの枚数を増やす
      existingCard.count++;
    } else {
      // 新しいカードを追加
      this.deck.push({
        id: this.generateCardId(),
        cardType,
        element,
        spellType,
        count: 1,
      });
    }
  }

  /**
   * デッキから手札を引く
   * 重み付けに基づいてランダムに選択
   */
  drawHand(handSize: number = HAND_CONFIG.HAND_SIZE): Card[] {
    const hand: Card[] = [];
    
    // 総重みを計算
    const totalWeight = this.deck.reduce((sum, card) => sum + card.count, 0);
    
    if (totalWeight === 0) {
      console.warn('デッキが空です');
      return hand;
    }

    // 最低1枚はタワーカードを保証
    const towerCards = this.deck.filter(c => c.cardType === 'tower');
    if (towerCards.length > 0) {
      const randomTower = this.weightedRandomSelect(towerCards);
      if (randomTower) {
        hand.push(this.createCardFromDeckCard(randomTower));
      }
    }

    // 残りをランダムに引く
    while (hand.length < handSize) {
      const selectedDeckCard = this.weightedRandomSelect(this.deck);
      if (selectedDeckCard) {
        hand.push(this.createCardFromDeckCard(selectedDeckCard));
      } else {
        break;
      }
    }

    return hand;
  }

  /**
   * 重み付けランダム選択
   */
  private weightedRandomSelect(cards: DeckCard[]): DeckCard | null {
    const totalWeight = cards.reduce((sum, card) => sum + card.count, 0);
    if (totalWeight === 0) return null;

    let random = Math.random() * totalWeight;
    
    for (const card of cards) {
      random -= card.count;
      if (random <= 0) {
        return card;
      }
    }
    
    return cards[cards.length - 1];
  }

  /**
   * DeckCardからCardインスタンスを作成
   */
  private createCardFromDeckCard(deckCard: DeckCard): Card {
    if (deckCard.cardType === 'tower' && deckCard.element) {
      return new Card('tower', { x: 0, y: 0 }, deckCard.element);
    } else if (deckCard.cardType === 'spell' && deckCard.spellType) {
      return new Card('spell', { x: 0, y: 0 }, undefined, deckCard.spellType);
    }
    // フォールバック
    return new Card('tower', { x: 0, y: 0 }, 'fire');
  }

  /**
   * アップグレードを適用
   */
  applyUpgrade(
    upgradeType: 'damage' | 'range' | 'fire_rate' | 'all_damage',
    value: number,
    targetElement?: ElementType
  ): void {
    switch (upgradeType) {
      case 'damage':
        if (targetElement) {
          this.upgrades.damageBonus[targetElement] *= (1 + value);
        }
        break;
      case 'range':
        this.upgrades.rangeBonus += value;
        break;
      case 'fire_rate':
        this.upgrades.fireRateBonus *= (1 - value); // 低いほど速い
        break;
      case 'all_damage':
        this.upgrades.allDamageBonus *= (1 + value);
        break;
    }
  }

  /**
   * 特定属性のダメージ倍率を取得
   */
  getDamageMultiplier(element: ElementType): number {
    return this.upgrades.damageBonus[element] * this.upgrades.allDamageBonus;
  }

  /**
   * 射程ボーナスを取得
   */
  getRangeBonus(): number {
    return this.upgrades.rangeBonus;
  }

  /**
   * 発射速度倍率を取得
   */
  getFireRateMultiplier(): number {
    return this.upgrades.fireRateBonus;
  }

  /**
   * デッキの内容を取得
   */
  getDeck(): DeckCard[] {
    return [...this.deck];
  }

  /**
   * アップグレード状態を取得
   */
  getUpgrades(): PlayerUpgrades {
    return { ...this.upgrades };
  }

  /**
   * 特定のカードの枚数を取得
   */
  getCardCount(cardType: CardType, element?: ElementType, spellType?: SpellType): number {
    const card = this.deck.find(c => {
      if (cardType === 'tower') {
        return c.cardType === 'tower' && c.element === element;
      } else {
        return c.cardType === 'spell' && c.spellType === spellType;
      }
    });
    return card?.count ?? 0;
  }

  /**
   * デッキの総カード枚数を取得
   */
  getTotalCardCount(): number {
    return this.deck.reduce((sum, card) => sum + card.count, 0);
  }

  /**
   * デッキをリセット（ニューゲーム時）
   */
  reset(): void {
    this.deck = this.createInitialDeck();
    this.upgrades = this.createInitialUpgrades();
  }

  /**
   * 初期デッキにカードを追加（永続強化用）
   */
  addStarterCard(element: ElementType): void {
    this.addCard('tower', element);
  }
}
