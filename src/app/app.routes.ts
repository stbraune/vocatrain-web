import { Routes } from '@angular/router';

import { WordsComponent, WordTypesComponent, GuessComponent } from './components';
import { SettingsComponent } from './settings';

export const AppRoutes: Routes = [
  {
    path: '',
    redirectTo: 'guess',
    pathMatch: 'full'
  },
  {
    path: 'guess',
    component: GuessComponent
  },
  {
    path: 'words',
    component: WordsComponent
  },
  {
    path: 'word-types',
    component: WordTypesComponent
  },
  {
    path: 'settings',
    component: SettingsComponent
  }
];
