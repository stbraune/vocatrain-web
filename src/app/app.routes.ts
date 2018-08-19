import { Routes } from '@angular/router';
import { WordsComponent } from './components';

export const AppRoutes: Routes = [
  {
    path: '',
    redirectTo: 'guess',
    pathMatch: 'full'
  },
  {
    path: 'words',
    component: WordsComponent
  }
];
