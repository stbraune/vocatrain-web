import { Component, OnInit, Input, ViewChild, TemplateRef } from '@angular/core';
import { MatSnackBar, MatDialog } from '@angular/material';

import { Observable, Subject, forkJoin } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { LoadingIndicatorService } from '../loading-indicator';
import { SettingsService } from '../settings';

import { WordTypeEntity } from '../word-types';
import { WordEntity } from './word-entity';
import { WordEntityService } from './word-entity.service';
import { WordEditComponent } from './word-edit.component';

@Component({
  selector: 'words-editor',
  templateUrl: './words-editor.component.html',
  styleUrls: ['./words-editor.component.scss']
})
export class WordsEditorComponent implements OnInit {
  @Input()
  public wordEntities: WordEntity[] = [];
  public wordEntityDetails: WordEntity;

  @Input()
  public wordTypeEntities: WordTypeEntity[] = [];

  @Input()
  public showTags = true;

  @Input()
  public showLanguages;

  @Input()
  public showTagsAtLanguage;

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

  @ViewChild('wordDetailsDialogContentTemplate')
  public wordDetailsDialogContentTemplate: TemplateRef<void>;

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

    this.loadingIndicatorService.notifyLoading();
    forkJoin(splittedWordEntities.map((w) => this.wordEntityService.putWordEntity(w)))
      .subscribe((wordEntities) => {
        this.loadingIndicatorService.notifyFinished();
        this.snackBar.open('Saved!', null, {
          duration: 3000
        });

        wordEntities.reverse().forEach((persistedWordEntity) => {
          const indexOf = this.wordEntities.findIndex((w) => w._id === persistedWordEntity._id);
          if (indexOf === -1) {
            this.wordEntities.unshift(persistedWordEntity);
          } else {
            this.wordEntities.splice(indexOf, 1, persistedWordEntity);
          }
        });
      }, (error) => {
        this.loadingIndicatorService.notifyFinished();
        console.error(error);
        this.snackBar.open('Error!', 'Ok', {
          panelClass: 'error'
        });
      });
  }

  public deleteWordEntity(wordEntity: WordEntity) {
    this.loadingIndicatorService.notifyLoading();
    this.wordEntityService.deleteWordEntity(wordEntity).subscribe((result) => {
      this.loadingIndicatorService.notifyFinished();
      this.snackBar.open('Entry deleted', null, { duration: 3000 });
      const indexOf = this.wordEntities.findIndex((w) => w._id === wordEntity._id);
      if (indexOf !== -1) {
        this.wordEntities.splice(indexOf, 1);
      }
    }, (error) => {
      this.loadingIndicatorService.notifyFinished();
      console.error(error);
      this.snackBar.open('Error!', 'Ok', { panelClass: 'error' });
    });
  }

  public openWordEntityDetails($event: MouseEvent, wordEntity: WordEntity) {
    $event.stopPropagation();
    this.wordEntityDetails = wordEntity;
    this.dialog.open(this.wordDetailsDialogContentTemplate);
  }
}
