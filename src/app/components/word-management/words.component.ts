import { Component, OnInit, Input, ViewChild, TemplateRef } from '@angular/core';
import { MatDialog, MatSnackBar } from '@angular/material';

import { Observable, Subject, forkJoin } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import {
  WordEntityService,
  WordEntity,
  DatabaseFulltextQueryResult,
  DatabaseQueryResult,
  LoadingIndicatorService,
  WordsEditorComponent
} from '../../../shared';
import { SettingsService } from '../../../shared';

import { WordAddDialogComponent } from './word-add-dialog.component';
import { WordEditComponent } from '../../../shared';

@Component({
  selector: 'words',
  templateUrl: './words.component.html',
  styleUrls: ['./words.component.scss']
})
export class WordsComponent implements OnInit {
  public wordEntities: WordEntity[] = [];
  public wordEntitiesPerPage = 50;
  public wordEntitiesNextKey: any;
  public wordEntityDetails: WordEntity;

  @ViewChild('wordDetailsDialogContentTemplate')
  public wordDetailsDialogContentTemplate: TemplateRef<void>;

  @ViewChild(WordsEditorComponent)
  public wordsEditor: WordsEditorComponent;

  public emptyWordEntity: WordEntity = {
    texts: [
      {
        meta: '',
        tags: [],
        words: {}
      }
    ]
  };

  public duplicatesFilter: { [lang: string]: boolean } = {};
  public duplicatesFiltered = false;

  public query = '';
  public queryAvailable = false;

  public queryChanged = new Subject<string>();
  public queryHelpFields: string[] = [];

  public availableTags = [];

  public sorting: {
    property: string,
    descending: boolean
  } = {
      property: 'creation',
      descending: true
    };

  @Input()
  public supportedLanguages: string[] = [];

  public constructor(
    private loadingIndicatorService: LoadingIndicatorService,
    private settingsService: SettingsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private wordEntityService: WordEntityService
  ) {
  }

  public ngOnInit(): void {
    this.settingsService.appSettingsChanged.subscribe((appSettings) => {
      this.supportedLanguages = appSettings.userLanguages.filter((userLanguage) => userLanguage.enabled)
        .map((userLanguage) => userLanguage.iso);
    });
    this.queryAvailable = !!this.settingsService.getDatabaseSettings().fti.couchDbLuceneUrl;
    this.loadWordEntities();
    this.loadQueryHelpFields();

    this.queryChanged
      .pipe(debounceTime(300))
      .subscribe((query) => {
        this.reloadWordEntities();
      });

    this.wordEntityService.getTags().subscribe((tags) => {
      this.availableTags = tags;
    });
  }

  public onDuplicatesFilterChanged(lang) {
    Object.keys(this.duplicatesFilter)
      .filter((l) => l !== lang)
      .forEach((l) => this.duplicatesFilter[l] = false);
    this.duplicatesFiltered = Object.keys(this.duplicatesFilter).some((l) => this.duplicatesFilter[l]);
    this.reloadWordEntities();
  }

  public reloadWordEntities() {
    if (this.query.trim() !== '') {
      this.sorting = {
        property: 'creation',
        descending: true
      };
    }

    this.wordEntitiesNextKey = undefined;
    this.wordEntities.splice(0);
    this.loadWordEntities();
  }

  public loadWordEntities() {
    this.loadingIndicatorService.notifyLoading();
    this.getWordEntitiesQuery().subscribe((result) => {
      this.loadingIndicatorService.notifyFinished();
      const rows = <{ key?: any, doc?: WordEntity }[]>result.rows;
      if (result.rows.length === this.wordEntitiesPerPage + 1) {
        this.wordEntitiesNextKey = rows[this.wordEntitiesPerPage].key
          || (this.wordEntities.length + this.wordEntitiesPerPage);
        this.wordEntities.push(...rows.slice(0, this.wordEntitiesPerPage).map((row) => row.doc));
      } else {
        this.wordEntitiesNextKey = undefined;
        this.wordEntities.push(...rows.map((row) => row.doc));
      }
    }, (error) => {
      this.loadingIndicatorService.notifyFinished();
      console.error(error);
    });
  }

  private getWordEntitiesQuery(): Observable<
    DatabaseFulltextQueryResult<WordEntity>
    | DatabaseQueryResult<WordEntity, {}, {}>
    > {
    if (this.duplicatesFiltered) {
      return this.wordEntityService.getDuplicateWordEntities({
        startkey: this.wordEntitiesNextKey || [Object.keys(this.duplicatesFilter).find((lang) => this.duplicatesFilter[lang]), undefined],
        endkey: [Object.keys(this.duplicatesFilter).find((lang) => this.duplicatesFilter[lang]), '\uffff'],
        limit: this.wordEntitiesPerPage + 1
      });
    }

    return this.wordEntityService.getWordEntities({
      query: this.query,
      startkey: this.wordEntitiesNextKey,
      limit: this.wordEntitiesPerPage + 1,
      sort: this.sorting.property,
      descending: this.sorting.descending
    });
  }

  public loadQueryHelpFields() {
    if (!this.queryAvailable) {
      return;
    }

    this.loadingIndicatorService.notifyLoading();
    this.wordEntityService.getWordEntitiesFields().subscribe((queryFields) => {
      this.loadingIndicatorService.notifyFinished();
      this.queryHelpFields.push(...queryFields);
    }, (error) => {
      this.loadingIndicatorService.notifyFinished();
      console.error(error);
    });
  }

  public onQueryChanged() {
    this.queryChanged.next(this.query);
  }

  public onClearQuery() {
    if (this.query !== '') {
      this.query = '';
      this.onQueryChanged();
    }
  }

  public onHelpQuery() {
    window.open('http://lucene.apache.org/core/3_6_2/queryparsersyntax.html', '_blank');
  }

  public sortBy(property: string) {
    if (this.query !== '' || this.duplicatesFiltered) {
      return;
    }

    if (this.sorting.property === property) {
      this.sorting.descending = !this.sorting.descending;
    } else {
      this.sorting.property = property;
      this.sorting.descending = false;
    }
    this.reloadWordEntities();
  }

  public createWordEntity() {
    const dialogRef = this.dialog.open(WordAddDialogComponent);
    dialogRef.componentInstance.availableTags = this.availableTags;
    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.success) {
        this.saveWordEntity(result.wordEntity);
      }
    }, (error) => {
      console.error(error);
    });
  }

  public saveWordEntity(wordEntity: WordEntity) {
    this.wordsEditor.saveWordEntity(wordEntity);
  }

  public deleteWordEntity(wordEntity: WordEntity) {
    this.wordsEditor.deleteWordEntity(wordEntity);
  }
}
