import { Component, OnInit, Input } from '@angular/core';
import { MatDialog, MatSnackBar } from '@angular/material';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/forkJoin';

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
    this.loadWordTypeEntities();
    this.loadWordEntities();
  }

  private loadWordTypeEntities() {
    this.wordTypeEntityService.getWordTypeEntities().subscribe((wordTypeEntities) => {
      this.wordTypeEntities = wordTypeEntities;
    });
  }

  private loadWordEntities() {
    this.wordEntityService.getWordEntities().subscribe((wordEntities) => {
      this.wordEntities = wordEntities;
    });
  }

  public createWordEntity() {
    const dialogRef = this.dialog.open(WordAddDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result.success) {
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

        wordEntities.forEach((persistedWordEntity) => {
          const indexOf = this.wordEntities.findIndex((w) => w._id === persistedWordEntity._id);
          if (indexOf === -1) {
            this.wordEntities.push(persistedWordEntity);
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
