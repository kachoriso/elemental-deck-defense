import { HAND_CONFIG, ElementType, SpellType } from '../types';
import { Card, createRandomCard, createRandomTowerCard } from '../entities/Card';

/**
 * 手札システム
 * カードの生成、管理、ドラッグ＆ドロップを制御
 * タワーカードとスペルカードの両方に対応
 */
export class HandSystem {
  private cards: Card[];
  private handContainer: HTMLElement;
  private draggedCard: Card | null;
  
  // コールバック
  private onCardDragStart: ((card: Card) => void) | null;
  private onCardDragEnd: ((card: Card, x: number, y: number) => boolean) | null;

  constructor(handContainerId: string) {
    const container = document.getElementById(handContainerId);
    if (!container) {
      throw new Error(`手札コンテナ要素が見つかりません: ${handContainerId}`);
    }
    this.handContainer = container;
    this.cards = [];
    this.draggedCard = null;
    this.onCardDragStart = null;
    this.onCardDragEnd = null;
    
    // 初期手札はdealNewHandを呼ばない（DeckManagerから配る）
  }

  /**
   * ドラッグ開始時のコールバックを設定
   */
  setOnCardDragStart(callback: (card: Card) => void): void {
    this.onCardDragStart = callback;
  }

  /**
   * ドラッグ終了時のコールバックを設定
   * @param callback 配置成功時はtrue、失敗時はfalseを返す
   */
  setOnCardDragEnd(callback: (card: Card, x: number, y: number) => boolean): void {
    this.onCardDragEnd = callback;
  }

  /**
   * 新しい手札を配る
   * タワーカードとスペルカードがランダムに混ざる
   */
  dealNewHand(): void {
    // 既存のカードをクリア
    this.cards = [];
    this.handContainer.innerHTML = '';

    // 新しいカードを生成（最低1枚のタワーカードを保証）
    // 最初の3枚はタワーカード、残りはランダム
    const guaranteedTowers = Math.min(3, HAND_CONFIG.HAND_SIZE);
    
    for (let i = 0; i < HAND_CONFIG.HAND_SIZE; i++) {
      let card: Card;
      if (i < guaranteedTowers) {
        card = createRandomTowerCard({ x: 0, y: 0 });
      } else {
        card = createRandomCard({ x: 0, y: 0 });
      }
      this.cards.push(card);
      this.addCardToDOM(card);
    }
  }

  /**
   * カードをDOMに追加
   */
  private addCardToDOM(card: Card): void {
    const cardElement = card.createElement();
    
    // ドラッグイベントの設定
    cardElement.draggable = true;
    
    cardElement.addEventListener('dragstart', (e) => {
      this.handleDragStart(e, card);
    });
    
    cardElement.addEventListener('dragend', (e) => {
      this.handleDragEnd(e, card);
    });

    this.handContainer.appendChild(cardElement);
  }

  /**
   * ドラッグ開始処理
   */
  private handleDragStart(e: DragEvent, card: Card): void {
    this.draggedCard = card;
    
    // ドラッグ中のゴースト画像を設定
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.id);
      e.dataTransfer.setData('cardType', card.cardType);
      
      // カスタムドラッグイメージ
      const dragImage = this.createDragImage(card);
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 40, 40);
      
      // 少し遅れて削除
      setTimeout(() => dragImage.remove(), 0);
    }

    // 元のカードを半透明に
    const cardElement = e.target as HTMLElement;
    cardElement.classList.add('dragging');

    if (this.onCardDragStart) {
      this.onCardDragStart(card);
    }
  }

  /**
   * ドラッグ用の画像を生成
   */
  private createDragImage(card: Card): HTMLDivElement {
    const icon = card.getIcon();
    const color = card.getColor();
    const borderColor = card.getBorderColor();
    
    const dragImage = document.createElement('div');
    dragImage.className = 'drag-preview';
    dragImage.innerHTML = icon;
    
    // スペルカードは円形、タワーカードは四角形
    const borderRadius = card.isSpellCard() ? '50%' : '8px';
    
    dragImage.style.cssText = `
      position: absolute;
      left: -9999px;
      width: 80px;
      height: 80px;
      background: ${color};
      border: 3px solid ${borderColor};
      border-radius: ${borderRadius};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    `;
    return dragImage;
  }

  /**
   * ドラッグ終了処理
   */
  private handleDragEnd(e: DragEvent, card: Card): void {
    const cardElement = this.handContainer.querySelector(
      `[data-card-id="${card.id}"]`
    ) as HTMLElement | null;
    
    if (cardElement) {
      cardElement.classList.remove('dragging');
    }

    // ドロップ位置を取得
    const dropX = e.clientX;
    const dropY = e.clientY;

    // コールバックでドロップ処理
    let placed = false;
    if (this.onCardDragEnd) {
      placed = this.onCardDragEnd(card, dropX, dropY);
    }

    // 配置成功時はカードを手札から削除
    if (placed) {
      this.removeCard(card);
    }

    this.draggedCard = null;
  }

  /**
   * カードを手札から削除
   */
  removeCard(card: Card): void {
    const index = this.cards.findIndex((c) => c.id === card.id);
    if (index !== -1) {
      this.cards.splice(index, 1);
      
      const cardElement = this.handContainer.querySelector(
        `[data-card-id="${card.id}"]`
      );
      if (cardElement) {
        cardElement.remove();
      }
    }
  }

  /**
   * 現在ドラッグ中のカードを取得
   */
  getDraggedCard(): Card | null {
    return this.draggedCard;
  }

  /**
   * 手札のカード一覧を取得
   */
  getCards(): Card[] {
    return [...this.cards];
  }

  /**
   * 手札が空かどうか
   */
  isEmpty(): boolean {
    return this.cards.length === 0;
  }

  /**
   * 手札を設定（DeckManagerから配られたカード）
   */
  setHand(cards: Card[]): void {
    // 既存のカードをクリア
    this.cards = [];
    this.handContainer.innerHTML = '';

    // 新しいカードを追加
    for (const card of cards) {
      this.cards.push(card);
      this.addCardToDOM(card);
    }
  }

  /**
   * 特定の属性のタワーカードを追加
   */
  addTowerCard(element: ElementType): void {
    const card = new Card('tower', { x: 0, y: 0 }, element);
    this.cards.push(card);
    this.addCardToDOM(card);
  }

  /**
   * 特定のスペルカードを追加
   */
  addSpellCard(spellType: SpellType): void {
    const card = new Card('spell', { x: 0, y: 0 }, undefined, spellType);
    this.cards.push(card);
    this.addCardToDOM(card);
  }

  /**
   * タワーカードの数を取得
   */
  getTowerCardCount(): number {
    return this.cards.filter(c => c.isTowerCard()).length;
  }

  /**
   * スペルカードの数を取得
   */
  getSpellCardCount(): number {
    return this.cards.filter(c => c.isSpellCard()).length;
  }

  /**
   * カードを1枚追加
   */
  addCard(card: Card): void {
    this.cards.push(card);
    this.addCardToDOM(card);
  }

  /**
   * 最も古いカードを破棄（手札がいっぱいの時用）
   * @returns 破棄されたカード（なければnull）
   */
  discardOldestCard(): Card | null {
    if (this.cards.length === 0) return null;
    
    const oldestCard = this.cards[0];
    this.removeCard(oldestCard);
    return oldestCard;
  }

  /**
   * 手札のカード数を取得
   */
  getCardCount(): number {
    return this.cards.length;
  }
}
