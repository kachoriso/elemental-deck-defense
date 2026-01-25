import { Position, GridCell, GAME_CONFIG } from '../types';
import { PathSystem } from './PathSystem';

/**
 * グリッドシステム
 * ゲームフィールドのグリッド管理とタワー配置の制御
 */
export class GridSystem {
  private cells: GridCell[][];
  private pathSystem: PathSystem;

  constructor(pathSystem: PathSystem) {
    this.pathSystem = pathSystem;
    this.cells = this.initializeGrid();
  }

  /**
   * グリッドを初期化
   */
  private initializeGrid(): GridCell[][] {
    const { GRID_ROWS, GRID_COLS } = GAME_CONFIG;
    const grid: GridCell[][] = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      grid[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        grid[row][col] = {
          row,
          col,
          isPath: this.pathSystem.isPathCell(row, col) || this.pathSystem.isBaseCell(row, col),
          isOccupied: false,
        };
      }
    }

    return grid;
  }

  /**
   * ピクセル座標からグリッド座標を取得
   */
  getGridPosition(pixelX: number, pixelY: number): { row: number; col: number } | null {
    const { GRID_SIZE, GRID_ROWS, GRID_COLS } = GAME_CONFIG;
    
    const col = Math.floor(pixelX / GRID_SIZE);
    const row = Math.floor(pixelY / GRID_SIZE);

    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
      return null;
    }

    return { row, col };
  }

  /**
   * グリッド座標からセルの中心ピクセル座標を取得
   */
  getCellCenter(row: number, col: number): Position {
    const { GRID_SIZE } = GAME_CONFIG;
    return {
      x: col * GRID_SIZE + GRID_SIZE / 2,
      y: row * GRID_SIZE + GRID_SIZE / 2,
    };
  }

  /**
   * 指定したセルにタワーを配置できるかチェック
   */
  canPlaceTower(row: number, col: number): boolean {
    const { GRID_ROWS, GRID_COLS } = GAME_CONFIG;
    
    // 範囲外チェック
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
      return false;
    }

    const cell = this.cells[row][col];
    
    // パス上、拠点上、または既に占有されているセルには配置不可
    return !cell.isPath && !cell.isOccupied;
  }

  /**
   * セルを占有状態にする（タワー配置時）
   */
  occupyCell(row: number, col: number): void {
    if (this.cells[row] && this.cells[row][col]) {
      this.cells[row][col].isOccupied = true;
    }
  }

  /**
   * セルの占有を解除する（タワー削除時）
   */
  releaseCell(row: number, col: number): void {
    if (this.cells[row] && this.cells[row][col]) {
      this.cells[row][col].isOccupied = false;
    }
  }

  /**
   * Canvasにグリッドを描画
   */
  draw(ctx: CanvasRenderingContext2D): void {
    const { GRID_SIZE, GRID_ROWS, GRID_COLS, GRID_COLOR } = GAME_CONFIG;

    // 薄いグリッド線を描画（作戦盤風）
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;

    // 縦線
    for (let col = 0; col <= GRID_COLS; col++) {
      ctx.beginPath();
      ctx.moveTo(col * GRID_SIZE, 0);
      ctx.lineTo(col * GRID_SIZE, GRID_ROWS * GRID_SIZE);
      ctx.stroke();
    }

    // 横線
    for (let row = 0; row <= GRID_ROWS; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * GRID_SIZE);
      ctx.lineTo(GRID_COLS * GRID_SIZE, row * GRID_SIZE);
      ctx.stroke();
    }

    // 5マスごとに少し太い線を描画（座標の目安）
    ctx.strokeStyle = `${GRID_COLOR}`;
    ctx.lineWidth = 1;

    for (let col = 0; col <= GRID_COLS; col += 5) {
      ctx.beginPath();
      ctx.moveTo(col * GRID_SIZE, 0);
      ctx.lineTo(col * GRID_SIZE, GRID_ROWS * GRID_SIZE);
      ctx.stroke();
    }

    for (let row = 0; row <= GRID_ROWS; row += 5) {
      ctx.beginPath();
      ctx.moveTo(0, row * GRID_SIZE);
      ctx.lineTo(GRID_COLS * GRID_SIZE, row * GRID_SIZE);
      ctx.stroke();
    }
  }

  /**
   * マウスホバー中のセルをハイライト
   */
  drawHoverCell(ctx: CanvasRenderingContext2D, row: number, col: number): void {
    const { GRID_SIZE } = GAME_CONFIG;
    const canPlace = this.canPlaceTower(row, col);

    ctx.fillStyle = canPlace 
      ? 'rgba(46, 204, 113, 0.3)'  // 配置可能: 緑
      : 'rgba(231, 76, 60, 0.3)';   // 配置不可: 赤

    ctx.fillRect(col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);

    ctx.strokeStyle = canPlace ? '#2ecc71' : '#e74c3c';
    ctx.lineWidth = 2;
    ctx.strokeRect(col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);
  }
}
