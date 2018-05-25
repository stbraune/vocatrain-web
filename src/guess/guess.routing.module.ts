import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { GuessComponent } from './guess.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: 'guess',
        component: GuessComponent
      }
    ])
  ],
  exports: [
    RouterModule
  ]
})
export class GuessRoutingModule {
}
