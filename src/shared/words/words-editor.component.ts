import { Component, OnInit, OnDestroy, Input, ViewChild, TemplateRef } from '@angular/core';
import { MatSnackBar, MatDialog, MatDialogRef } from '@angular/material';

import { Observable, Subject, forkJoin, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { LoadingIndicatorService } from '../loading-indicator';
import { SettingsService } from '../settings';

import { Text } from './text';
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

  private wordDetailsDialogRef: MatDialogRef<void, any>;

  private wordSavedSubscription: Subscription;
  private wordDeletedSubscription: Subscription;

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

    this.wordSavedSubscription = this.wordEntityService.wordSaved.subscribe((savedWordEntity) => {
      const index = this.wordEntities.findIndex((w) => w._id === savedWordEntity._id);
      if (index !== -1) {
        this.wordEntities[index] = Object.assign(this.wordEntities[index], savedWordEntity);
      }
    });

    this.wordDeletedSubscription = this.wordEntityService.wordDeleted.subscribe((deletedWordEntity) => {
      const index = this.wordEntities.findIndex((w) => w._id === deletedWordEntity._id);
      if (index !== -1) {
        this.wordEntities.splice(index, 1);
      }

      if (this.wordEntityDetails._id === deletedWordEntity._id) {
        this.closeWordEntityDetails();
      }
    });
  }

  public saveWordEntity(wordEntity: WordEntity) {
    function isEmptyText(text: Text) {
      return text.meta === ''
        && (!text.tags || text.tags.length === 0)
        && (Object.keys(text.words).length === 0 || Object.keys(text.words).every((k) => text.words[k].value === ''));
    }

    function removeEmptyTexts(wordEntity1: WordEntity) {
      wordEntity1.texts.filter((text) => isEmptyText(text))
        .forEach((text) => {
          const index = wordEntity1.texts.indexOf(text);
          if (index !== -1) {
            wordEntity1.texts.splice(index, 1);
          }
        });
      return wordEntity1;
    }

    function splitWords(wordEntity1: WordEntity) {
      const isDialogText = wordEntity1.texts.every((text) => text.tags.indexOf('text') === -1);
      if (!isDialogText) {
        wordEntity1.texts.forEach((text) => {
          if (text.tags.indexOf('text') === -1) {
            text.tags.push('text');
          }
        });
        return [wordEntity1];
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

    const splittedWordsObservables = splitWords(removeEmptyTexts(wordEntity))
      .map((w) => this.wordEntityService.putWordEntity(w, this.wordEntityService.reconcileItemTakeConflictingTexts));
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
    this.wordDetailsDialogRef = this.dialog.open(this.wordDetailsDialogContentTemplate);
  }

  public closeWordEntityDetails() {
    if (this.wordDetailsDialogRef) {
      this.wordDetailsDialogRef.close();
      this.wordDetailsDialogRef = undefined;
    }
  }
}
