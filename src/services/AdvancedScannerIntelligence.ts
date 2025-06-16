import { toastService } from './toastService';
import { feedbackService } from './feedbackService';
import { mobileCameraOptimizer } from './MobileCameraOptimizer';

export interface ScanPrediction {
  confidence: number;
  suggestedAction: string;
  estimatedValue?: number;
  recommendations: string[];
}

export interface ScanAnalytics {
  scanAttempts: number;
  successRate: number;
  averageTime: number;
  commonErrors: string[];
  userPatterns: {
    preferredLighting: string;
    deviceOrientation: string;
    scanDistance: string;
  };
}

export class AdvancedScannerIntelligence {
  private static instance: AdvancedScannerIntelligence;
  private scanHistory: Array<{
    timestamp: number;
    success: boolean;
    duration: number;
    lightingCondition: string;
    errorType?: string;
  }> = [];
  
  private userPreferences = {
    retryCount: 0,
    preferredRetryDelay: 1000,
    adaptiveFeedback: true,
    learningMode: true
  };

  constructor() {
    this.loadUserPreferences();
  }

  static getInstance(): AdvancedScannerIntelligence {
    if (!AdvancedScannerIntelligence.instance) {
      AdvancedScannerIntelligence.instance = new AdvancedScannerIntelligence();
    }
    return AdvancedScannerIntelligence.instance;
  }

  private loadUserPreferences(): void {
    try {
      const saved = localStorage.getItem('scanner_intelligence_prefs');
      if (saved) {
        this.userPreferences = { ...this.userPreferences, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }

  private saveUserPreferences(): void {
    try {
      localStorage.setItem('scanner_intelligence_prefs', JSON.stringify(this.userPreferences));
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  }

  async analyzeScanEnvironment(): Promise<{
    lightingQuality: 'excellent' | 'good' | 'poor' | 'very-poor';
    stabilityScore: number;
    recommendedSettings: any;
  }> {
    // Simulate environment analysis
    // In a real implementation, this would analyze camera frames
    const mockLightingQuality = Math.random() > 0.7 ? 'excellent' : 
                               Math.random() > 0.4 ? 'good' : 
                               Math.random() > 0.2 ? 'poor' : 'very-poor';
    
    const mockStabilityScore = Math.random() * 100;
    
    const recommendedSettings = await this.generateOptimalSettings(mockLightingQuality, mockStabilityScore);
    
    return {
      lightingQuality: mockLightingQuality,
      stabilityScore: mockStabilityScore,
      recommendedSettings
    };
  }

  private async generateOptimalSettings(lighting: string, stability: number) {
    const currentSettings = mobileCameraOptimizer.getCurrentSettings();
    const recommendations: any = { ...currentSettings };

    // Adaptive settings based on environment
    if (lighting === 'poor' || lighting === 'very-poor') {
      recommendations.enableTorch = true;
      recommendations.frameRate = Math.max(15, currentSettings.frameRate - 10);
    }

    if (stability < 50) {
      recommendations.resolution = 'medium'; // Lower resolution for better stability
      toastService.info('Scanner Intelligence', 'Adjusting settings for better stability');
    }

    return recommendations;
  }

  async predictScanSuccess(qrData: string): Promise<ScanPrediction> {
    const analysis = await this.analyzeQRContent(qrData);
    const userHistory = this.getUserScanHistory();
    
    // Calculate confidence based on content analysis and user history
    let confidence = analysis.contentQuality * 0.6 + userHistory.recentSuccessRate * 0.4;
    
    const suggestions = this.generateActionSuggestions(analysis, userHistory);
    
    return {
      confidence,
      suggestedAction: suggestions.primary,
      estimatedValue: analysis.estimatedAmount,
      recommendations: suggestions.secondary
    };
  }

  private async analyzeQRContent(qrData: string): Promise<{
    contentQuality: number;
    estimatedAmount?: number;
    paymentMethod: string;
  }> {
    // Enhanced QR content analysis
    const hasUSSD = qrData.includes('*182*');
    const hasValidStructure = /\*182\*\d+\*\d+\*[\d*#]+/.test(qrData);
    const amountMatch = qrData.match(/\*(\d+)#/);
    
    let contentQuality = 0.5;
    if (hasUSSD) contentQuality += 0.3;
    if (hasValidStructure) contentQuality += 0.2;
    
    return {
      contentQuality: Math.min(1.0, contentQuality),
      estimatedAmount: amountMatch ? parseInt(amountMatch[1]) : undefined,
      paymentMethod: hasUSSD ? 'mobile_money' : 'unknown'
    };
  }

  private generateActionSuggestions(analysis: any, history: any): {
    primary: string;
    secondary: string[];
  } {
    const suggestions = {
      primary: 'proceed_with_payment',
      secondary: [] as string[]
    };

    if (analysis.contentQuality < 0.7) {
      suggestions.primary = 'verify_code_manually';
      suggestions.secondary.push('Double-check the QR code quality');
    }

    if (history.recentSuccessRate < 0.5) {
      suggestions.secondary.push('Try adjusting camera angle');
      suggestions.secondary.push('Ensure good lighting conditions');
    }

    return suggestions;
  }

  private getUserScanHistory(): {
    recentSuccessRate: number;
    averageScanTime: number;
    commonIssues: string[];
  } {
    const recentScans = this.scanHistory.slice(-10);
    const successCount = recentScans.filter(scan => scan.success).length;
    const recentSuccessRate = recentScans.length > 0 ? successCount / recentScans.length : 0.8;
    
    const averageScanTime = recentScans.length > 0 
      ? recentScans.reduce((sum, scan) => sum + scan.duration, 0) / recentScans.length
      : 2000;

    return {
      recentSuccessRate,
      averageScanTime,
      commonIssues: ['poor_lighting', 'camera_shake']
    };
  }

  async handleScanFailure(errorType: string, context: any): Promise<{
    shouldRetry: boolean;
    retryDelay: number;
    adaptiveActions: string[];
  }> {
    this.recordScanAttempt(false, Date.now() - context.startTime, context.lightingCondition, errorType);
    
    const retryCount = this.userPreferences.retryCount++;
    const maxRetries = 3;
    
    if (retryCount >= maxRetries) {
      this.userPreferences.retryCount = 0;
      return {
        shouldRetry: false,
        retryDelay: 0,
        adaptiveActions: ['show_manual_input', 'provide_guidance']
      };
    }

    // Adaptive retry strategy
    const adaptiveActions = await this.generateAdaptiveActions(errorType, retryCount);
    const retryDelay = this.calculateAdaptiveDelay(retryCount, errorType);

    // Provide intelligent feedback
    await this.provideIntelligentFeedback(errorType, retryCount);

    return {
      shouldRetry: true,
      retryDelay,
      adaptiveActions
    };
  }

  private async generateAdaptiveActions(errorType: string, retryCount: number): Promise<string[]> {
    const actions = [];
    
    switch (errorType) {
      case 'camera_permission':
        actions.push('request_permission_again', 'show_permission_guide');
        break;
      case 'poor_lighting':
        actions.push('suggest_torch', 'recommend_lighting_adjustment');
        if (retryCount > 1) actions.push('auto_enable_torch');
        break;
      case 'qr_not_detected':
        actions.push('adjust_focus', 'stabilize_camera');
        if (retryCount > 1) actions.push('reduce_resolution');
        break;
      default:
        actions.push('general_optimization');
    }
    
    return actions;
  }

  private calculateAdaptiveDelay(retryCount: number, errorType: string): number {
    const baseDelay = this.userPreferences.preferredRetryDelay;
    const backoffMultiplier = Math.pow(1.5, retryCount);
    
    // Shorter delays for quick fixes, longer for complex issues
    const errorDelayMap: Record<string, number> = {
      'camera_permission': 2000,
      'poor_lighting': 1000,
      'qr_not_detected': 1500,
      'default': 1000
    };
    
    const errorDelay = errorDelayMap[errorType] || errorDelayMap.default;
    return Math.min(5000, errorDelay * backoffMultiplier);
  }

  private async provideIntelligentFeedback(errorType: string, retryCount: number): Promise<void> {
    if (!this.userPreferences.adaptiveFeedback) return;

    const feedbackMessages: Record<string, string[]> = {
      'poor_lighting': [
        'Try moving to a brighter area',
        'Consider enabling the flashlight',
        'Lighting seems challenging - enabling auto-torch'
      ],
      'qr_not_detected': [
        'Hold the camera steady',
        'Move closer to the QR code',
        'Adjusting focus for better detection'
      ],
      'camera_permission': [
        'Camera access is needed for scanning',
        'Please allow camera permission',
        'Check your browser settings for camera access'
      ]
    };

    const messages = feedbackMessages[errorType] || ['Optimizing scanner settings...'];
    const message = messages[Math.min(retryCount, messages.length - 1)];
    
    toastService.info('Smart Scanner', message);
    
    // Enhanced haptic feedback for mobile
    if ('vibrate' in navigator && retryCount === 0) {
      navigator.vibrate([100, 50, 100]);
    }
  }

  recordScanAttempt(success: boolean, duration: number, lightingCondition: string, errorType?: string): void {
    this.scanHistory.push({
      timestamp: Date.now(),
      success,
      duration,
      lightingCondition,
      errorType
    });

    // Keep only last 50 entries
    if (this.scanHistory.length > 50) {
      this.scanHistory = this.scanHistory.slice(-50);
    }

    // Learn from patterns
    if (this.userPreferences.learningMode) {
      this.updateLearningModel(success, duration, lightingCondition, errorType);
    }
  }

  private updateLearningModel(success: boolean, duration: number, lightingCondition: string, errorType?: string): void {
    // Simple learning: adjust preferences based on success patterns
    if (success && duration < 3000) {
      // Fast success - maintain current settings
      if (lightingCondition === 'good') {
        this.userPreferences.preferredRetryDelay = Math.max(500, this.userPreferences.preferredRetryDelay - 100);
      }
    } else if (!success && errorType === 'poor_lighting') {
      // Learn from lighting issues
      mobileCameraOptimizer.optimizeForLighting('dark');
    }

    this.saveUserPreferences();
  }

  getAnalytics(): ScanAnalytics {
    const recentScans = this.scanHistory.slice(-20);
    const successCount = recentScans.filter(scan => scan.success).length;
    
    return {
      scanAttempts: this.scanHistory.length,
      successRate: recentScans.length > 0 ? successCount / recentScans.length : 0,
      averageTime: recentScans.length > 0 
        ? recentScans.reduce((sum, scan) => sum + scan.duration, 0) / recentScans.length 
        : 0,
      commonErrors: this.getCommonErrors(),
      userPatterns: this.analyzeUserPatterns()
    };
  }

  private getCommonErrors(): string[] {
    const errorCounts = this.scanHistory
      .filter(scan => !scan.success && scan.errorType)
      .reduce((acc, scan) => {
        acc[scan.errorType!] = (acc[scan.errorType!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([error]) => error);
  }

  private analyzeUserPatterns(): ScanAnalytics['userPatterns'] {
    const recentScans = this.scanHistory.slice(-10);
    const lightingCounts = recentScans.reduce((acc, scan) => {
      acc[scan.lightingCondition] = (acc[scan.lightingCondition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const preferredLighting = Object.entries(lightingCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';

    return {
      preferredLighting,
      deviceOrientation: 'portrait', // Could be detected from device orientation API
      scanDistance: 'medium' // Could be estimated from QR code size in frame
    };
  }

  resetLearning(): void {
    this.scanHistory = [];
    this.userPreferences.retryCount = 0;
    this.saveUserPreferences();
    toastService.success('Scanner Intelligence', 'Learning data reset successfully');
  }
}

export const advancedScannerIntelligence = AdvancedScannerIntelligence.getInstance();
