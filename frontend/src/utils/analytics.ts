/**
 * Lightweight analytics tracker for DealLens AI.
 * Sends events to backend `/api/analytics/event`. Never throws — silent failure.
 */
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export type AnalyticsEventType =
  | 'app_opened'
  | 'login_started'
  | 'login_success'
  | 'logout'
  | 'language_changed'
  | 'scan_started'
  | 'scan_completed'
  | 'scan_failed'
  | 'text_scan_started'
  | 'text_scan_completed'
  | 'text_scan_failed'
  | 'history_viewed'
  | 'result_viewed'
  | 'profile_viewed';

export async function trackEvent(
  eventType: AnalyticsEventType,
  metadata: Record<string, any> = {},
  token?: string | null,
): Promise<void> {
  if (!token) return;
  try {
    await fetch(`${BACKEND_URL}/api/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        event_type: eventType,
        metadata,
      }),
    });
  } catch {
    // Silent - analytics should never break the app
  }
}
