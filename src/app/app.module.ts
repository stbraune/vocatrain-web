import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoaderFactory } from './translate-http-loader-factory';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

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
  MatProgressSpinnerModule,
  MatTableModule,
  MatExpansionModule,
  MatDialogModule,
  MatTooltipModule,
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
  GuessService,
  SearchOptionsComponent
} from './components';

import { AppRoutes } from './app.routes';
import { SettingsModule } from './settings';
import { WordAddDialogComponent } from './components/word-management/word-add-dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    ChipsComponent,
    ChipInputComponent,
    WordsComponent,
    WordTypesComponent,
    WordAddDialogComponent,
    WordTypeEditComponent,
    WordEditComponent,
    SearchOptionsComponent,
    GuessComponent,
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
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatListModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatToolbarModule,
    MatTooltipModule,
    SettingsModule.forRoot()
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
  entryComponents: [
    WordAddDialogComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
