export type GameState =
    { state: 'undefined', reason: 'undefined' }
  | { state: 'started', reason: 'started' }
  | { state: 'paused', reason: 'paused' }
  | { state: 'stopped', reason: 'no-more-words' | 'reached-amount' | 'reached-minutes' | 'stopped' };
