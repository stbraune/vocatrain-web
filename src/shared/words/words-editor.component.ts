import { Component, OnInit, Input, ViewChild, TemplateRef } from '@angular/core';
import { MatSnackBar, MatDialog } from '@angular/material';

import { Observable, Subject, forkJoin } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { LoadingIndicatorService } from '../loading-indicator';
import { SettingsService } from '../settings';

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

  @Input()
  public availableTags: string[] = [];

  public wordEntityDetails: WordEntity;

  @Input()
  public showTags = true;

  @Input()
  public showLanguages;

  @Input()
  public showTagsAtLanguage;

  public emptyWordEntity: WordEntity = {
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
    function splitWords() {
      const isDialogText = wordEntity.texts.every((text) => text.tags.indexOf('text') === -1);
      if (!isDialogText) {
        wordEntity.texts.forEach((text) => {
          if (text.tags.indexOf('text') === -1) {
            text.tags.push('text');
          }
        });
        return [wordEntity];
      }

      const splittedWordEntities = wordEntity.texts.map((text) => Object.assign({}, wordEntity, {
        _id: undefined,
        _rev: undefined,
        texts: [text]
      }));

      if (wordEntity._id && splittedWordEntities.length > 0) {
        splittedWordEntities[0]._id = wordEntity._id;
        splittedWordEntities[0]._rev = wordEntity._rev;
      }

      return splittedWordEntities;
    }

    const splittedWordsObservables = splitWords().map((w) => this.wordEntityService.putWordEntity(w));
    if (splittedWordsObservables.length === 0) {
      return;
    }

    this.loadingIndicatorService.notifyLoading();
    forkJoin(splittedWordsObservables)
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
