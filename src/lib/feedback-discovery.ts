interface FeedbackDiscoveryState {
  authenticated: boolean;
  eligible: boolean;
  submitted: boolean;
}

export function shouldShowFeedbackDiscovery({
  authenticated,
  eligible,
  submitted,
}: FeedbackDiscoveryState) {
  return authenticated && eligible && !submitted;
}
