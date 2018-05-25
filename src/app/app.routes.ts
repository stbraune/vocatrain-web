import { Routes } from '@angular/router';
import { WordsComponent, WordTypesComponent } from './components';

export const AppRoutes: Routes = [
  {
    path: '',
    redirectTo: 'guess',
    pathMatch: 'full'
  },
  {
    path: 'words',
    component: WordsComponent
  },
  {
    path: 'word-types',
    component: WordTypesComponent
  }
];
