export const HOME_TOUR_COMPLETED_KEY = 'cefrready-tour-completed';
export const HOME_TOUR_FINISHED_EVENT = 'cefrready-tour-finished';

interface FeedbackDiscoveryState {
  authenticated: boolean;
  tourCompleted: boolean;
  eligible: boolean;
  submitted: boolean;
}

export function shouldShowFeedbackDiscovery({
  authenticated,
  tourCompleted,
  eligible,
  submitted,
}: FeedbackDiscoveryState) {
  return authenticated && tourCompleted && eligible && !submitted;
}
