export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, unknown>;
};

let initialised = false;

export const initAnalytics = () => {
  initialised = true;
};

export const trackEvent = (_event: AnalyticsEvent) => {
  if (!initialised) {
    // TODO: wire analytics when a provider is selected
    return;
  }
  // Intentionally left blank – production builds can replace this module.
};
