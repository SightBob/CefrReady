export const FEEDBACK_DISCOVERY_SEEN_KEY = 'cefrready-feedback-modal-seen';
export const HOME_TOUR_COMPLETED_KEY = 'cefrready-tour-completed';
export const HOME_TOUR_FINISHED_EVENT = 'cefrready-tour-finished';

interface FeedbackDiscoveryState {
  authenticated: boolean;
  seen: boolean;
  tourCompleted: boolean;
}

export function shouldShowFeedbackDiscovery({
  authenticated,
  seen,
  tourCompleted,
}: FeedbackDiscoveryState) {
  return authenticated && !seen && tourCompleted;
}
