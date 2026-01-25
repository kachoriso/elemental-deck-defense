import { 
  Position, 
  ElementType, 
  ELEMENT_CONFIGS, 
  HAND_CONFIG,
  CardType,
  SpellType,
  SPELL_CONFIGS
} from '../types';

/**
 * カードクラス
 * 手札に表示され、ドラッグ＆ドロップでタワーを配置したりスペルを発動する
 */
export class Card {
  public id: string;
  public cardType: CardType;        // 'tower' または 'spell'
  public element: ElementType | null;  // タワーカードの場合の属性
  public spellType: SpellType | null;  // スペルカードの場合のスペルタイプ
  public position: Position;
  public width: number;
  public height: number;
  
  // ドラッグ状態
  public isDragging: boolean;
  public dragOffset: Position;
  
  // 元の位置（ドラッグキャンセル時に戻す用）
  public originalPosition: Position;

  constructor(
    cardType: CardType,
    position: Position,
    element?: ElementType,
    spellType?: SpellType
  ) {
    this.id = `card-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.cardType = cardType;
    this.element = element ?? null;
    this.spellType = spellType ?? null;
    this.position = { ...position };
    this.originalPosition = { ...position };
    this.width = HAND_CONFIG.CARD_WIDTH;
    this.height = HAND_CONFIG.CARD_HEIGHT;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
  }

  /**
   * タワーカードかどうか
   */
  isTowerCard(): boolean {
    return this.cardType === 'tower' && this.element !== null;
  }

  /**
   * スペルカードかどうか
   */
  isSpellCard(): boolean {
    return this.cardType === 'spell' && this.spellType !== null;
  }

  /**
   * カードの属性設定を取得（タワーカード用）
   */
  getElementConfig() {
    if (this.element) {
      return ELEMENT_CONFIGS[this.element];
    }
    return null;
  }

  /**
   * スペル設定を取得（スペルカード用）
   */
  getSpellConfig() {
    if (this.spellType) {
      return SPELL_CONFIGS[this.spellType];
    }
    return null;
  }

  /**
   * カードの色を取得
   */
  getColor(): string {
    if (this.cardType === 'tower' && this.element) {
      return ELEMENT_CONFIGS[this.element].color;
    }
    if (this.cardType === 'spell' && this.spellType) {
      return SPELL_CONFIGS[this.spellType].color;
    }
    return '#888';
  }

  /**
   * カードの枠色を取得
   */
  getBorderColor(): string {
    if (this.cardType === 'tower' && this.element) {
      return ELEMENT_CONFIGS[this.element].borderColor;
    }
    if (this.cardType === 'spell' && this.spellType) {
      return SPELL_CONFIGS[this.spellType].borderColor;
    }
    return '#666';
  }

  /**
   * カードのアイコンを取得
   */
  getIcon(): string {
    if (this.cardType === 'tower' && this.element) {
      return ELEMENT_CONFIGS[this.element].icon;
    }
    if (this.cardType === 'spell' && this.spellType) {
      return SPELL_CONFIGS[this.spellType].icon;
    }
    return '?';
  }

  /**
   * カードの名前を取得
   */
  getName(): string {
    if (this.cardType === 'tower' && this.element) {
      return ELEMENT_CONFIGS[this.element].name;
    }
    if (this.cardType === 'spell' && this.spellType) {
      return SPELL_CONFIGS[this.spellType].name;
    }
    return '???';
  }

  /**
   * ドラッグ開始
   */
  startDrag(mouseX: number, mouseY: number): void {
    this.isDragging = true;
    this.dragOffset = {
      x: mouseX - this.position.x,
      y: mouseY - this.position.y,
    };
  }

  /**
   * ドラッグ中の位置更新
   */
  updateDragPosition(mouseX: number, mouseY: number): void {
    if (!this.isDragging) return;
    this.position = {
      x: mouseX - this.dragOffset.x,
      y: mouseY - this.dragOffset.y,
    };
  }

  /**
   * ドラッグ終了
   */
  endDrag(): void {
    this.isDragging = false;
  }

  /**
   * 元の位置に戻す
   */
  resetPosition(): void {
    this.position = { ...this.originalPosition };
    this.isDragging = false;
  }

  /**
   * 元の位置を更新
   */
  setOriginalPosition(position: Position): void {
    this.originalPosition = { ...position };
    this.position = { ...position };
  }

  /**
   * 指定した座標がカード内にあるかチェック
   */
  containsPoint(x: number, y: number): boolean {
    return (
      x >= this.position.x &&
      x <= this.position.x + this.width &&
      y >= this.position.y &&
      y <= this.position.y + this.height
    );
  }

  /**
   * DOM要素としてカードを描画（手札エリア用）
   */
  createElement(): HTMLDivElement {
    const cardElement = document.createElement('div');
    cardElement.className = `card ${this.cardType}-card`;
    cardElement.dataset.cardId = this.id;
    cardElement.dataset.cardType = this.cardType;
    
    if (this.element) {
      cardElement.dataset.element = this.element;
    }
    if (this.spellType) {
      cardElement.dataset.spellType = this.spellType;
    }
    
    const icon = this.getIcon();
    const name = this.getName();
    const color = this.getColor();
    const borderColor = this.getBorderColor();

    // スペルカードには追加のラベル
    const typeLabel = this.cardType === 'spell' ? '<div class="card-type-label">SPELL</div>' : '';
    
    cardElement.innerHTML = `
      ${typeLabel}
      <div class="card-icon">${icon}</div>
      <div class="card-name">${name}</div>
    `;
    
    // 属性に応じた色を設定
    cardElement.style.setProperty('--card-color', color);
    cardElement.style.setProperty('--card-border-color', borderColor);
    
    return cardElement;
  }

  /**
   * Canvas上にカードを描画（ドラッグ中のプレビュー用）
   */
  drawPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.isDragging) return;

    const previewSize = 30;
    const halfSize = previewSize / 2;
    const color = this.getColor();
    const borderColor = this.getBorderColor();

    // 半透明のプレビュー
    ctx.globalAlpha = 0.7;
    
    if (this.cardType === 'tower') {
      // タワーのプレビュー（四角形）
      ctx.fillStyle = color;
      ctx.fillRect(
        this.position.x + this.width / 2 - halfSize,
        this.position.y + this.height / 2 - halfSize,
        previewSize,
        previewSize
      );
      
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        this.position.x + this.width / 2 - halfSize,
        this.position.y + this.height / 2 - halfSize,
        previewSize,
        previewSize
      );
    } else {
      // スペルのプレビュー（円形）
      ctx.beginPath();
      ctx.arc(
        this.position.x + this.width / 2,
        this.position.y + this.height / 2,
        previewSize,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `${color}40`;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
  }
}

/**
 * ランダムなタワーカードを生成
 */
export const createRandomTowerCard = (position: Position): Card => {
  const elements: ElementType[] = ['fire', 'ice', 'lightning'];
  const randomElement = elements[Math.floor(Math.random() * elements.length)];
  return new Card('tower', position, randomElement);
};

/**
 * ランダムなスペルカードを生成
 */
export const createRandomSpellCard = (position: Position): Card => {
  const spells: SpellType[] = ['meteor', 'blizzard', 'oil_bomb'];
  const randomSpell = spells[Math.floor(Math.random() * spells.length)];
  return new Card('spell', position, undefined, randomSpell);
};

/**
 * ランダムなカードを生成（タワーまたはスペル）
 */
export const createRandomCard = (position: Position): Card => {
  if (Math.random() < HAND_CONFIG.SPELL_CHANCE) {
    return createRandomSpellCard(position);
  }
  return createRandomTowerCard(position);
};
