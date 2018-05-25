import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { TypeComponent } from './type.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: 'type',
        component: TypeComponent
      }
    ])
  ],
  exports: [
    RouterModule
  ]
})
export class TypeRoutingModule {
}
