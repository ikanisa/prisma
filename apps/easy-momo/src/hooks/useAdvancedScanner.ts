
import { useState, useEffect, useCallback } from 'react';
import { advancedScannerIntelligence, ScanPrediction, ScanAnalytics } from '@/services/AdvancedScannerIntelligence';
import { mobileCameraOptimizer } from '@/services/MobileCameraOptimizer';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

export interface AdvancedScannerState {
  isAnalyzing: boolean;
  environmentAnalysis: {
    lightingQuality: 'excellent' | 'good' | 'poor' | 'very-poor';
    stabilityScore: number;
    recommendedSettings: any;
  } | null;
  scanPrediction: ScanPrediction | null;
  analytics: ScanAnalytics | null;
  isLearningMode: boolean;
  adaptiveRetryCount: number;
}

export const useAdvancedScanner = () => {
  const { trackUserAction } = usePerformanceMonitoring('AdvancedScanner');
  
  const [state, setState] = useState<AdvancedScannerState>({
    isAnalyzing: false,
    environmentAnalysis: null,
    scanPrediction: null,
    analytics: null,
    isLearningMode: true,
    adaptiveRetryCount: 0
  });

  const updateState = useCallback((updates: Partial<AdvancedScannerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const analyzeEnvironment = useCallback(async () => {
    updateState({ isAnalyzing: true });
    trackUserAction('environment_analysis_started');
    
    try {
      const analysis = await advancedScannerIntelligence.analyzeScanEnvironment();
      updateState({ 
        environmentAnalysis: analysis,
        isAnalyzing: false 
      });
      
      // Apply recommended settings automatically
      if (analysis.recommendedSettings) {
        mobileCameraOptimizer.updateSettings(analysis.recommendedSettings);
        trackUserAction('auto_settings_applied', { 
          lighting: analysis.lightingQuality,
          stability: analysis.stabilityScore 
        });
      }
      
      trackUserAction('environment_analysis_completed', {
        lightingQuality: analysis.lightingQuality,
        stabilityScore: analysis.stabilityScore
      });
    } catch (error) {
      console.error('Environment analysis failed:', error);
      updateState({ isAnalyzing: false });
      trackUserAction('environment_analysis_failed');
    }
  }, [updateState, trackUserAction]);

  const predictScanSuccess = useCallback(async (qrData: string) => {
    if (!qrData) return;
    
    trackUserAction('scan_prediction_requested');
    
    try {
      const prediction = await advancedScannerIntelligence.predictScanSuccess(qrData);
      updateState({ scanPrediction: prediction });
      
      trackUserAction('scan_prediction_completed', {
        confidence: prediction.confidence,
        suggestedAction: prediction.suggestedAction
      });
    } catch (error) {
      console.error('Scan prediction failed:', error);
      trackUserAction('scan_prediction_failed');
    }
  }, [updateState, trackUserAction]);

  const handleScanFailure = useCallback(async (errorType: string, context: any) => {
    const startTime = Date.now();
    trackUserAction('intelligent_failure_handling', { errorType });
    
    try {
      const result = await advancedScannerIntelligence.handleScanFailure(errorType, {
        ...context,
        startTime
      });
      
      updateState({ adaptiveRetryCount: result.shouldRetry ? state.adaptiveRetryCount + 1 : 0 });
      
      trackUserAction('failure_handling_completed', {
        shouldRetry: result.shouldRetry,
        retryDelay: result.retryDelay,
        adaptiveActions: result.adaptiveActions
      });
      
      return result;
    } catch (error) {
      console.error('Intelligent failure handling failed:', error);
      trackUserAction('failure_handling_error');
      return {
        shouldRetry: false,
        retryDelay: 0,
        adaptiveActions: ['show_manual_input']
      };
    }
  }, [state.adaptiveRetryCount, updateState, trackUserAction]);

  const recordScanSuccess = useCallback((duration: number, lightingCondition: string) => {
    advancedScannerIntelligence.recordScanAttempt(true, duration, lightingCondition);
    updateState({ adaptiveRetryCount: 0 });
    trackUserAction('scan_success_recorded', { duration, lightingCondition });
  }, [updateState, trackUserAction]);

  const getAnalytics = useCallback(async () => {
    const analytics = advancedScannerIntelligence.getAnalytics();
    updateState({ analytics });
    trackUserAction('analytics_retrieved', {
      scanAttempts: analytics.scanAttempts,
      successRate: analytics.successRate
    });
    return analytics;
  }, [updateState, trackUserAction]);

  const toggleLearningMode = useCallback(() => {
    const newMode = !state.isLearningMode;
    updateState({ isLearningMode: newMode });
    trackUserAction('learning_mode_toggled', { enabled: newMode });
  }, [state.isLearningMode, updateState, trackUserAction]);

  const resetLearning = useCallback(() => {
    advancedScannerIntelligence.resetLearning();
    updateState({ 
      analytics: null,
      scanPrediction: null,
      adaptiveRetryCount: 0 
    });
    trackUserAction('learning_data_reset');
  }, [updateState, trackUserAction]);

  // Auto-analyze environment on mount
  useEffect(() => {
    analyzeEnvironment();
  }, [analyzeEnvironment]);

  // Periodic analytics update
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.isLearningMode) {
        getAnalytics();
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [state.isLearningMode, getAnalytics]);

  return {
    // State
    ...state,
    
    // Actions
    analyzeEnvironment,
    predictScanSuccess,
    handleScanFailure,
    recordScanSuccess,
    getAnalytics,
    toggleLearningMode,
    resetLearning,
    
    // Utilities
    isOptimized: state.environmentAnalysis?.lightingQuality === 'excellent' || state.environmentAnalysis?.lightingQuality === 'good',
    needsOptimization: state.environmentAnalysis?.stabilityScore && state.environmentAnalysis.stabilityScore < 50,
    confidenceLevel: state.scanPrediction?.confidence || 0,
    shouldShowPrediction: state.scanPrediction && state.scanPrediction.confidence > 0.7
  };
};
