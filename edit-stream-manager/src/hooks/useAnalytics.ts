import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '@/lib/utils';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

export function useAnalytics() {
  const location = useLocation();

  // Track page views
  useEffect(() => {
    trackEvent('page_view', {
      path: location.pathname,
      search: location.search,
      hash: location.hash,
      title: document.title
    });
  }, [location]);

  // Track custom events
  const track = useCallback((eventName: string, properties?: Record<string, any>) => {
    trackEvent(eventName, {
      ...properties,
      timestamp: Date.now(),
      path: location.pathname
    });
  }, [location.pathname]);

  // Track user actions
  const trackUserAction = useCallback((action: string, details?: Record<string, any>) => {
    track('user_action', {
      action,
      ...details
    });
  }, [track]);

  // Track feature usage
  const trackFeatureUsage = useCallback((feature: string, details?: Record<string, any>) => {
    track('feature_usage', {
      feature,
      ...details
    });
  }, [track]);

  // Track errors
  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    track('error', {
      message: error.message,
      stack: error.stack,
      ...context
    });
  }, [track]);

  // Track performance
  const trackPerformance = useCallback((metric: string, value: number, details?: Record<string, any>) => {
    track('performance', {
      metric,
      value,
      ...details
    });
  }, [track]);

  return {
    track,
    trackUserAction,
    trackFeatureUsage,
    trackError,
    trackPerformance
  };
}

// Hook for tracking form interactions
export function useFormAnalytics(formName: string) {
  const { trackUserAction } = useAnalytics();

  const trackFormStart = useCallback(() => {
    trackUserAction('form_start', { form: formName });
  }, [trackUserAction, formName]);

  const trackFormComplete = useCallback((success: boolean, details?: Record<string, any>) => {
    trackUserAction('form_complete', {
      form: formName,
      success,
      ...details
    });
  }, [trackUserAction, formName]);

  const trackFormError = useCallback((error: string, details?: Record<string, any>) => {
    trackUserAction('form_error', {
      form: formName,
      error,
      ...details
    });
  }, [trackUserAction, formName]);

  return {
    trackFormStart,
    trackFormComplete,
    trackFormError
  };
}

// Hook for tracking file operations
export function useFileAnalytics() {
  const { trackFeatureUsage } = useAnalytics();

  const trackFileUpload = useCallback((fileCount: number, totalSize: number, fileTypes: string[]) => {
    trackFeatureUsage('file_upload', {
      fileCount,
      totalSize,
      fileTypes
    });
  }, [trackFeatureUsage]);

  const trackFileDownload = useCallback((fileCount: number, totalSize: number) => {
    trackFeatureUsage('file_download', {
      fileCount,
      totalSize
    });
  }, [trackFeatureUsage]);

  const trackFileDelete = useCallback((fileCount: number) => {
    trackFeatureUsage('file_delete', {
      fileCount
    });
  }, [trackFeatureUsage]);

  return {
    trackFileUpload,
    trackFileDownload,
    trackFileDelete
  };
}

// Hook for tracking scene generation
export function useSceneAnalytics() {
  const { trackFeatureUsage } = useAnalytics();

  const trackSceneGeneration = useCallback((shotType: string, frameCount: number) => {
    trackFeatureUsage('scene_generation', {
      shotType,
      frameCount
    });
  }, [trackFeatureUsage]);

  const trackSceneRegeneration = useCallback((sceneId: string, reason: string) => {
    trackFeatureUsage('scene_regeneration', {
      sceneId,
      reason
    });
  }, [trackFeatureUsage]);

  const trackSceneExport = useCallback((sceneCount: number, format: string) => {
    trackFeatureUsage('scene_export', {
      sceneCount,
      format
    });
  }, [trackFeatureUsage]);

  return {
    trackSceneGeneration,
    trackSceneRegeneration,
    trackSceneExport
  };
}
