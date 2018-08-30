import { Subject } from 'rxjs';

import { GameLogEntity } from '../game-log';

import { DialogTextSearchOptions } from './dialog-text-search-options';
import { DialogTextSearchResult } from './dialog-text-search-result';
import { DialogTextGameState } from './dialog-text-game-state';
import { DialogTextWordState } from './dialog-text-word-state';

export interface DialogTextGame {
  mode: string;

  searchOptions: DialogTextSearchOptions;
  gameLogEntity: GameLogEntity;

  gameState: DialogTextGameState;
  gameStateChanged: Subject<{ previous: DialogTextGameState, current: DialogTextGameState }>;

  durationReferenceDate: Date;
  duration: number;
  durationInterval: any;

  word: DialogTextSearchResult;
  wordState: DialogTextWordState[];
  wordStateChanged: Subject<{ previous: DialogTextWordState[], current: DialogTextWordState[] }>;
}
