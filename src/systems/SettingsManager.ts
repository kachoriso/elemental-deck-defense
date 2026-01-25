import {
  GameSettings,
  DEFAULT_SETTINGS,
  SETTINGS_CONFIG,
} from '../types';

/**
 * ゲーム設定管理クラス
 * 音量、表示設定などをローカルストレージで永続化
 */
export class SettingsManager {
  private settings: GameSettings;
  
  // 設定変更時のコールバック
  private onSettingsChange: ((settings: GameSettings) => void) | null;

  constructor() {
    this.settings = this.loadSettings();
    this.onSettingsChange = null;
  }

  /**
   * ローカルストレージから設定を読み込む
   */
  private loadSettings(): GameSettings {
    try {
      const saved = localStorage.getItem(SETTINGS_CONFIG.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GameSettings;
        if (this.isValidSettings(parsed)) {
          // デフォルト値とマージ（新しい設定項目に対応）
          return { ...DEFAULT_SETTINGS, ...parsed };
        }
      }
    } catch (e) {
      console.warn('設定データの読み込みに失敗しました:', e);
    }

    return { ...DEFAULT_SETTINGS };
  }

  /**
   * 設定データのバリデーション
   */
  private isValidSettings(data: unknown): data is Partial<GameSettings> {
    if (!data || typeof data !== 'object') return false;
    return true; // 基本的なオブジェクトチェック
  }

  /**
   * 設定を保存
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_CONFIG.STORAGE_KEY, JSON.stringify(this.settings));
      
      // コールバックを呼び出し
      if (this.onSettingsChange) {
        this.onSettingsChange(this.settings);
      }
    } catch (e) {
      console.error('設定データの保存に失敗しました:', e);
    }
  }

  /**
   * 設定変更コールバックを設定
   */
  setOnSettingsChange(callback: (settings: GameSettings) => void): void {
    this.onSettingsChange = callback;
  }

  /**
   * 設定をリセット
   */
  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
  }

  // ============================
  // Getters
  // ============================

  /**
   * 現在の設定を取得
   */
  getSettings(): GameSettings {
    return { ...this.settings };
  }

  /**
   * マスター音量を取得
   */
  getMasterVolume(): number {
    return this.settings.masterVolume;
  }

  /**
   * 効果音音量を取得
   */
  getSFXVolume(): number {
    return this.settings.sfxVolume;
  }

  /**
   * BGM音量を取得
   */
  getBGMVolume(): number {
    return this.settings.bgmVolume;
  }

  /**
   * 実効効果音音量を取得（マスター音量を考慮）
   */
  getEffectiveSFXVolume(): number {
    return (this.settings.masterVolume / 100) * (this.settings.sfxVolume / 100);
  }

  /**
   * 実効BGM音量を取得（マスター音量を考慮）
   */
  getEffectiveBGMVolume(): number {
    return (this.settings.masterVolume / 100) * (this.settings.bgmVolume / 100);
  }

  /**
   * ダメージ表示が有効か
   */
  isShowDamageNumbers(): boolean {
    return this.settings.showDamageNumbers;
  }

  /**
   * パーティクルが有効か
   */
  isShowParticles(): boolean {
    return this.settings.showParticles;
  }

  /**
   * シナジープレビューが有効か
   */
  isShowSynergyPreview(): boolean {
    return this.settings.showSynergyPreview;
  }

  // ============================
  // Setters
  // ============================

  /**
   * マスター音量を設定
   */
  setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(100, volume));
    this.saveSettings();
  }

  /**
   * 効果音音量を設定
   */
  setSFXVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(100, volume));
    this.saveSettings();
  }

  /**
   * BGM音量を設定
   */
  setBGMVolume(volume: number): void {
    this.settings.bgmVolume = Math.max(0, Math.min(100, volume));
    this.saveSettings();
  }

  /**
   * ダメージ表示を設定
   */
  setShowDamageNumbers(show: boolean): void {
    this.settings.showDamageNumbers = show;
    this.saveSettings();
  }

  /**
   * パーティクルを設定
   */
  setShowParticles(show: boolean): void {
    this.settings.showParticles = show;
    this.saveSettings();
  }

  /**
   * シナジープレビューを設定
   */
  setShowSynergyPreview(show: boolean): void {
    this.settings.showSynergyPreview = show;
    this.saveSettings();
  }

  // ============================
  // Toggle Helpers
  // ============================

  /**
   * ダメージ表示をトグル
   */
  toggleShowDamageNumbers(): boolean {
    this.settings.showDamageNumbers = !this.settings.showDamageNumbers;
    this.saveSettings();
    return this.settings.showDamageNumbers;
  }

  /**
   * パーティクルをトグル
   */
  toggleShowParticles(): boolean {
    this.settings.showParticles = !this.settings.showParticles;
    this.saveSettings();
    return this.settings.showParticles;
  }

  /**
   * シナジープレビューをトグル
   */
  toggleShowSynergyPreview(): boolean {
    this.settings.showSynergyPreview = !this.settings.showSynergyPreview;
    this.saveSettings();
    return this.settings.showSynergyPreview;
  }
}
