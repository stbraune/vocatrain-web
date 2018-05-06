import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';

import {
  MatButtonModule,
  MatCardModule,
  MatChipsModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatSelectModule,
  MatToolbarModule,
  MatListModule,
  MatSnackBarModule,
  MatRadioModule,
  MatCheckboxModule,
} from '@angular/material';

import {
  DatabaseService, WordTypeEntityService, WordEntityService
} from './services';

import { AppComponent } from './app.component';
import {
  WordsComponent,
  WordTypeEditComponent,
  WordEditComponent,
  WordTypesComponent,
  ChipInputComponent,
  ChipsComponent,
  GuessComponent,
  GuessService
} from './components';

import { AppRoutes } from './app.routes';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoaderFactory } from './translate-http-loader-factory';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

@NgModule({
  declarations: [
    AppComponent,
    ChipsComponent,
    ChipInputComponent,
    WordsComponent,
    WordTypesComponent,
    WordTypeEditComponent,
    WordEditComponent,
    GuessComponent
  ],
  imports: [
    RouterModule.forRoot(AppRoutes, {
      useHash: true
    }),
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useExisting: TranslateHttpLoader
      }
    }),
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatListModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatSnackBarModule,
    MatToolbarModule
  ],
  providers: [
    {
      provide: TranslateHttpLoader,
      useFactory: TranslateHttpLoaderFactory,
      deps: [HttpClient]
    },
    DatabaseService,
    WordTypeEntityService,
    WordEntityService,
    GuessService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
