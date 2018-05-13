import { Component, OnInit, Input } from '@angular/core';
import { MatDialog, MatSnackBar } from '@angular/material';

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/debounceTime';

import { WordTypeEntityService, WordEntityService } from '../../services';
import { WordTypeEntity, WordEntity } from '../../model';
import { SettingsService } from '../../settings';
import { WordEditComponent } from '.';
import { WordAddDialogComponent } from './word-add-dialog.component';

@Component({
  selector: 'words',
  templateUrl: './words.component.html',
  styleUrls: ['./words.component.scss']
})
export class WordsComponent implements OnInit {
  public wordEntities: WordEntity[] = [];
  public wordEntitiesPerPage = 50;
  public wordEntitiesNextKey: any;
  public wordTypeEntities: WordTypeEntity[] = [];

  public emptyWordEntity: WordEntity = {
    type: undefined,
    texts: [
      {
        meta: '',
        tags: [],
        words: {}
      }
    ]
  };

  public query = '';

  public queryChanged = new Subject<string>();
  public queryHelpFields = ['type', 'meta', 'tags'];

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
    private settingsService: SettingsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private wordTypeEntityService: WordTypeEntityService,
    private wordEntityService: WordEntityService
  ) {
  }

  public ngOnInit(): void {
    this.supportedLanguages = this.settingsService.getLanguages();
    this.queryHelpFields.push(...this.supportedLanguages);
    this.loadWordTypeEntities();
    this.loadWordEntities();

    this.queryChanged
      .debounceTime(300)
      .subscribe((query) => {
        this.reloadWordEntities();
      });
  }

  private loadWordTypeEntities() {
    this.wordTypeEntityService.getWordTypeEntities().subscribe((wordTypeEntities) => {
      this.wordTypeEntities = wordTypeEntities;
    });
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
    this.wordEntityService.getWordEntities({
      query: this.query,
      startkey: this.wordEntitiesNextKey,
      limit: this.wordEntitiesPerPage + 1,
      sort: this.sorting.property,
      descending: this.sorting.descending
    }).subscribe((result) => {
      if (result.rows.length === this.wordEntitiesPerPage + 1) {
        this.wordEntitiesNextKey = result.rows[this.wordEntitiesPerPage].key || (this.wordEntities.length + this.wordEntitiesPerPage);
        this.wordEntities.push(...result.rows.slice(0, this.wordEntitiesPerPage).map((row) => row.doc));
      } else {
        this.wordEntitiesNextKey = undefined;
        this.wordEntities.push(...result.rows.map((row) => row.doc));
      }
    }, (error) => {
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
    if (this.query !== '') {
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
    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.success) {
        this.saveWordEntity(result.wordEntity);
      }
    }, (error) => {
      console.error(error);
    });
  }

  public saveWordEntity(wordEntity: WordEntity) {
    const splittedWordEntities = wordEntity.texts.map((text) => Object.assign({}, wordEntity, {
      _id: undefined,
      _rev: undefined,
      texts: [text]
    }));

    if (wordEntity._id && splittedWordEntities.length > 0) {
      splittedWordEntities[0]._id = wordEntity._id;
      splittedWordEntities[0]._rev = wordEntity._rev;
    }

    Observable.forkJoin(splittedWordEntities.map((w) => this.wordEntityService.putWordEntity(w)))
      .subscribe((wordEntities) => {
        this.snackBar.open('Saved!', null, {
          duration: 3000
        });
        console.log('persisted', splittedWordEntities);

        wordEntities.reverse().forEach((persistedWordEntity) => {
          const indexOf = this.wordEntities.findIndex((w) => w._id === persistedWordEntity._id);
          if (indexOf === -1) {
            this.wordEntities.unshift(persistedWordEntity);
          } else {
            this.wordEntities.splice(indexOf, 1, persistedWordEntity);
          }
        });
      }, (error) => {
        console.error(error);
        this.snackBar.open('Error!', 'Ok', {
          panelClass: 'error'
        });
      });
  }

  public deleteWordEntity(wordEntity: WordEntity) {
    this.wordEntityService.deleteWordEntity(wordEntity).subscribe((result) => {
      this.snackBar.open('Entry deleted', null, { duration: 3000 });
      const indexOf = this.wordEntities.findIndex((w) => w._id === wordEntity._id);
      if (indexOf !== -1) {
        this.wordEntities.splice(indexOf, 1);
      }
    }, (error) => {
      console.error(error);
      this.snackBar.open('Error!', 'Ok', { panelClass: 'error' });
    });
  }
}
