import { Subject } from 'rxjs';

import { GameLogEntity } from '../game-log';

import { SearchOptions } from '../search-options';
import { SearchResult } from '../search-result';
import { GameState } from './game-state';
import { WordState } from './word-state';

export interface Game {
  mode: string;

  searchOptions: SearchOptions;
  gameLogEntity: GameLogEntity;

  gameState: GameState;
  gameStateChanged: Subject<{ previous: GameState, current: GameState }>;

  durationReferenceDate: Date;
  duration: number;
  durationInterval: any;
  amount: number;

  word: SearchResult;
  wordState: WordState;
  wordStateChanged: Subject<{ previous: WordState, current: WordState }>;
}
