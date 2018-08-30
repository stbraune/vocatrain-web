import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { DialogTextsComponent } from './dialog-texts.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: 'dialog-texts',
        component: DialogTextsComponent
      }
    ])
  ],
  exports: [
    RouterModule
  ]
})
export class DialogTextsRoutingModule {
}
