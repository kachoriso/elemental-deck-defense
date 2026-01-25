import { Position, GAME_CONFIG, RouteIndex, ROUTE_COLORS } from '../types';

/**
 * パスシステム
 * 敵が移動する4つの経路を管理（中央防衛型）
 */
export class PathSystem {
  private paths: Position[][];           // 4つのルート
  private pathCells: Set<string>;        // "row,col" 形式で全パスセルを管理
  private basePosition: Position;        // 中央拠点の位置

  constructor() {
    this.paths = [[], [], [], []];
    this.pathCells = new Set();
    
    const { GRID_SIZE, BASE_ROW, BASE_COL } = GAME_CONFIG;
    this.basePosition = {
      x: BASE_COL * GRID_SIZE + GRID_SIZE / 2,
      y: BASE_ROW * GRID_SIZE + GRID_SIZE / 2,
    };
    
    this.generateAllPaths();
  }

  /**
   * 4つのルートを生成
   */
  private generateAllPaths(): void {
    // ルート0: 左上から時計回りに渦を巻いて中央へ
    this.paths[0] = this.generatePath(this.getRoute0Waypoints());
    
    // ルート1: 右上から反時計回りに渦を巻いて中央へ
    this.paths[1] = this.generatePath(this.getRoute1Waypoints());
    
    // ルート2: 左下から反時計回りに渦を巻いて中央へ
    this.paths[2] = this.generatePath(this.getRoute2Waypoints());
    
    // ルート3: 右下から時計回りに渦を巻いて中央へ
    this.paths[3] = this.generatePath(this.getRoute3Waypoints());
  }

  /**
   * ルート0: 左上スタート → L字型で中央へ（上側のルート）
   * セル: 列0〜2を専用使用
   */
  private getRoute0Waypoints(): [number, number][] {
    return [
      [0, 0],    // 左上スタート
      [0, 2],    // 右へ少し
      [5, 2],    // 下へ
      [5, 6],    // 右へ中央方向
      [7, 6],    // 中央へ
      [7, 7],    // ゴール
    ];
  }

  /**
   * ルート1: 右上スタート → L字型で中央へ（上側のルート）
   * セル: 列12〜14を専用使用
   */
  private getRoute1Waypoints(): [number, number][] {
    return [
      [0, 14],   // 右上スタート
      [0, 12],   // 左へ少し
      [5, 12],   // 下へ
      [5, 8],    // 左へ中央方向
      [7, 8],    // 中央へ
      [7, 7],    // ゴール
    ];
  }

  /**
   * ルート2: 左下スタート → L字型で中央へ（下側のルート）
   * セル: 列0〜2を専用使用（行9〜14）
   */
  private getRoute2Waypoints(): [number, number][] {
    return [
      [14, 0],   // 左下スタート
      [14, 2],   // 右へ少し
      [9, 2],    // 上へ
      [9, 6],    // 右へ中央方向
      [7, 6],    // 中央へ
      [7, 7],    // ゴール
    ];
  }

  /**
   * ルート3: 右下スタート → L字型で中央へ（下側のルート）
   * セル: 列12〜14を専用使用（行9〜14）
   */
  private getRoute3Waypoints(): [number, number][] {
    return [
      [14, 14],  // 右下スタート
      [14, 12],  // 左へ少し
      [9, 12],   // 上へ
      [9, 8],    // 左へ中央方向
      [7, 8],    // 中央へ
      [7, 7],    // ゴール
    ];
  }

  /**
   * ウェイポイントからパスを生成
   */
  private generatePath(waypoints: [number, number][]): Position[] {
    const { GRID_SIZE } = GAME_CONFIG;
    const halfGrid = GRID_SIZE / 2;
    const path: Position[] = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const [startRow, startCol] = waypoints[i];
      const [endRow, endCol] = waypoints[i + 1];

      // 現在のウェイポイントをパスに追加
      path.push({
        x: startCol * GRID_SIZE + halfGrid,
        y: startRow * GRID_SIZE + halfGrid,
      });
      this.pathCells.add(`${startRow},${startCol}`);

      // 中間セルを追加
      const rowDir = endRow > startRow ? 1 : endRow < startRow ? -1 : 0;
      const colDir = endCol > startCol ? 1 : endCol < startCol ? -1 : 0;

      let currentRow = startRow;
      let currentCol = startCol;

      while (currentRow !== endRow || currentCol !== endCol) {
        if (currentRow !== endRow) {
          currentRow += rowDir;
        } else if (currentCol !== endCol) {
          currentCol += colDir;
        }

        path.push({
          x: currentCol * GRID_SIZE + halfGrid,
          y: currentRow * GRID_SIZE + halfGrid,
        });
        this.pathCells.add(`${currentRow},${currentCol}`);
      }
    }

    // 最後のウェイポイントを追加
    const [lastRow, lastCol] = waypoints[waypoints.length - 1];
    if (path.length === 0 || 
        path[path.length - 1].x !== lastCol * GRID_SIZE + halfGrid ||
        path[path.length - 1].y !== lastRow * GRID_SIZE + halfGrid) {
      path.push({
        x: lastCol * GRID_SIZE + halfGrid,
        y: lastRow * GRID_SIZE + halfGrid,
      });
      this.pathCells.add(`${lastRow},${lastCol}`);
    }

    return path;
  }

  /**
   * 指定ルートのパスを取得
   */
  getPath(routeIndex: RouteIndex): Position[] {
    return [...this.paths[routeIndex]];
  }

  /**
   * ランダムなルートインデックスを取得
   */
  getRandomRouteIndex(): RouteIndex {
    return Math.floor(Math.random() * 4) as RouteIndex;
  }

  /**
   * 全ルート数を取得
   */
  getRouteCount(): number {
    return this.paths.length;
  }

  /**
   * 中央拠点の位置を取得
   */
  getBasePosition(): Position {
    return { ...this.basePosition };
  }

  /**
   * 指定したグリッド座標がパス上かどうかを判定
   */
  isPathCell(row: number, col: number): boolean {
    return this.pathCells.has(`${row},${col}`);
  }

  /**
   * 指定したグリッド座標が中央拠点かどうかを判定
   */
  isBaseCell(row: number, col: number): boolean {
    const { BASE_ROW, BASE_COL } = GAME_CONFIG;
    // 中央1セルを拠点エリアとする（15x15では小さめに）
    return row === BASE_ROW && col === BASE_COL;
  }

  /**
   * Canvasにパスと拠点を描画
   */
  draw(ctx: CanvasRenderingContext2D): void {
    const { GRID_SIZE, PATH_COLOR, BASE_ROW, BASE_COL, BASE_COLOR } = GAME_CONFIG;

    // パスセルを描画（薄い床色）
    ctx.fillStyle = PATH_COLOR;
    for (const cellKey of this.pathCells) {
      const [row, col] = cellKey.split(',').map(Number);
      // 拠点エリアは別途描画するのでスキップ
      if (!this.isBaseCell(row, col)) {
        ctx.fillRect(col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);
      }
    }

    // 各ルートの線を描画
    for (let i = 0; i < this.paths.length; i++) {
      const path = this.paths[i];
      if (path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let j = 1; j < path.length; j++) {
          ctx.lineTo(path[j].x, path[j].y);
        }
        ctx.strokeStyle = `${ROUTE_COLORS[i as RouteIndex]}60`; // 薄く
        ctx.lineWidth = 2;
        ctx.stroke();

        // スタート地点（ルートごとの色）
        ctx.beginPath();
        ctx.arc(path[0].x, path[0].y, 10, 0, Math.PI * 2);
        ctx.fillStyle = ROUTE_COLORS[i as RouteIndex];
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // 中央拠点を描画（1セル + 周囲のハイライト）
    const baseX = BASE_COL * GRID_SIZE;
    const baseY = BASE_ROW * GRID_SIZE;

    // 拠点周囲のハイライト（薄く）
    ctx.fillStyle = `${BASE_COLOR}20`;
    ctx.fillRect(
      (BASE_COL - 1) * GRID_SIZE, 
      (BASE_ROW - 1) * GRID_SIZE, 
      GRID_SIZE * 3, 
      GRID_SIZE * 3
    );

    // 拠点の背景
    ctx.fillStyle = `${BASE_COLOR}60`;
    ctx.fillRect(baseX, baseY, GRID_SIZE, GRID_SIZE);

    // 拠点の枠
    ctx.strokeStyle = BASE_COLOR;
    ctx.lineWidth = 3;
    ctx.strokeRect(baseX + 2, baseY + 2, GRID_SIZE - 4, GRID_SIZE - 4);

    // 拠点アイコン
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('🏰', this.basePosition.x, this.basePosition.y);
  }
}
