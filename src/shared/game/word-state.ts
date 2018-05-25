export type WordState =
    { state: 'undefined', reason: 'undefined' | 'next-word' }
  | { state: 'covered', reason: 'covered' | 'by-user' }
  | { state: 'uncovered', reason: 'uncovered' | 'by-user' }
  | { state: 'solved', reason: 'correct' | 'wrong' };
