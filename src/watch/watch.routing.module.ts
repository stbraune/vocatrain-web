import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { WatchComponent } from './watch.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: 'watch',
        component: WatchComponent
      }
    ])
  ],
  exports: [
    RouterModule
  ]
})
export class WatchRoutingModule {
}
