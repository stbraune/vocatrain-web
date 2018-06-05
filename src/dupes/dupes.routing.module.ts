import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { DupesComponent } from './dupes.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: 'dupes',
        component: DupesComponent
      }
    ])
  ],
  exports: [
    RouterModule
  ]
})
export class DupesRoutingModule {
}
