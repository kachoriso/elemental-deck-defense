import { 
  ElementType, 
  SynergyEffect, 
  SYNERGY_CONFIGS,
  GAME_CONFIG 
} from '../types';
import { Tower } from '../entities/Tower';

/**
 * シナジーシステム
 * タワー間の属性シナジーを判定・適用する
 */
export class SynergySystem {
  /**
   * 全タワーのシナジーを計算して適用
   */
  calculateAndApplySynergies(towers: Tower[]): void {
    // タワーをグリッド位置でマップ化
    const towerMap = this.createTowerMap(towers);

    // 各タワーのシナジーを計算
    for (const tower of towers) {
      const synergies = this.calculateSynergiesForTower(tower, towerMap);
      tower.setSynergies(synergies);
    }
  }

  /**
   * タワーをグリッド位置でマップ化
   */
  private createTowerMap(towers: Tower[]): Map<string, Tower> {
    const map = new Map<string, Tower>();
    for (const tower of towers) {
      const key = `${tower.gridRow},${tower.gridCol}`;
      map.set(key, tower);
    }
    return map;
  }

  /**
   * 特定のタワーのシナジーを計算
   */
  private calculateSynergiesForTower(
    tower: Tower, 
    towerMap: Map<string, Tower>
  ): SynergyEffect[] {
    const synergies: SynergyEffect[] = [];
    
    // 上下左右の隣接タワーを取得
    const adjacentTowers = this.getAdjacentTowers(tower, towerMap);
    
    // 隣接タワーの属性をセットで管理
    const adjacentElements = new Set<ElementType>();
    for (const adjTower of adjacentTowers) {
      adjacentElements.add(adjTower.element);
    }

    // シナジー判定
    for (const synergyConfig of Object.values(SYNERGY_CONFIGS)) {
      // このタワーがシナジーの発動元で、必要な属性が隣接にある場合
      if (
        tower.element === synergyConfig.sourceElement &&
        adjacentElements.has(synergyConfig.requiredElement)
      ) {
        synergies.push(synergyConfig);
      }
    }

    return synergies;
  }

  /**
   * 上下左右の隣接タワーを取得
   */
  private getAdjacentTowers(
    tower: Tower, 
    towerMap: Map<string, Tower>
  ): Tower[] {
    const { gridRow, gridCol } = tower;
    const { GRID_ROWS, GRID_COLS } = GAME_CONFIG;
    
    // 上下左右の方向
    const directions = [
      [-1, 0],  // 上
      [1, 0],   // 下
      [0, -1],  // 左
      [0, 1],   // 右
    ];

    const adjacentTowers: Tower[] = [];

    for (const [dRow, dCol] of directions) {
      const newRow = gridRow + dRow;
      const newCol = gridCol + dCol;

      // 範囲チェック
      if (newRow < 0 || newRow >= GRID_ROWS || newCol < 0 || newCol >= GRID_COLS) {
        continue;
      }

      const key = `${newRow},${newCol}`;
      const adjacentTower = towerMap.get(key);
      if (adjacentTower) {
        adjacentTowers.push(adjacentTower);
      }
    }

    return adjacentTowers;
  }

  /**
   * 特定の位置にタワーを配置した場合のシナジープレビューを取得
   */
  previewSynergies(
    element: ElementType,
    gridRow: number,
    gridCol: number,
    existingTowers: Tower[]
  ): { 
    newTowerSynergies: SynergyEffect[]; 
    affectedTowers: { tower: Tower; newSynergies: SynergyEffect[] }[] 
  } {
    // 仮のタワーマップを作成
    const towerMap = this.createTowerMap(existingTowers);
    
    // 仮のタワーを作成
    const tempTower = {
      gridRow,
      gridCol,
      element,
    } as Tower;
    
    const tempKey = `${gridRow},${gridCol}`;
    towerMap.set(tempKey, tempTower);

    // 新タワーのシナジーを計算
    const newTowerSynergies = this.calculateSynergiesForTower(tempTower, towerMap);

    // 影響を受ける既存タワーを計算
    const affectedTowers: { tower: Tower; newSynergies: SynergyEffect[] }[] = [];
    
    // 隣接タワーのみチェック
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dRow, dCol] of directions) {
      const adjRow = gridRow + dRow;
      const adjCol = gridCol + dCol;
      const adjTower = existingTowers.find(
        t => t.gridRow === adjRow && t.gridCol === adjCol
      );
      
      if (adjTower) {
        const newSynergies = this.calculateSynergiesForTower(adjTower, towerMap);
        // 既存のシナジーと異なる場合のみ追加
        if (newSynergies.length !== adjTower.activeSynergies.length) {
          affectedTowers.push({ tower: adjTower, newSynergies });
        }
      }
    }

    return { newTowerSynergies, affectedTowers };
  }

  /**
   * 現在発動中のシナジー一覧を取得
   */
  getActiveSynergySummary(towers: Tower[]): Map<string, number> {
    const summary = new Map<string, number>();
    
    for (const tower of towers) {
      for (const synergy of tower.activeSynergies) {
        const count = summary.get(synergy.name) ?? 0;
        summary.set(synergy.name, count + 1);
      }
    }

    return summary;
  }
}
