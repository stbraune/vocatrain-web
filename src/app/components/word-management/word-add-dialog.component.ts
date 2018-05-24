import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material';

import { SettingsService } from '../../../settings';
import { WordTypeEntityService, WordTypeEntity, WordEntity } from '../../../shared';

import { WordEditComponent } from './word-edit.component';

@Component({
  selector: 'word-add-dialog',
  templateUrl: './word-add-dialog.component.html',
  styleUrls: ['./word-add-dialog.component.scss']
})
export class WordAddDialogComponent implements OnInit {
  public wordTypeEntities: WordTypeEntity[] = [];
  public supportedLanguages: string[] = [];
  public newWordEntity: WordEntity;

  private _wordEditComponent: WordEditComponent;

  @ViewChild('wordEdit')
  public set wordEditComponent(value: WordEditComponent) {
    this._wordEditComponent = value;
  }

  public get wordEditComponent() {
    return this._wordEditComponent;
  }

  public constructor(
    private dialogRef: MatDialogRef<WordAddDialogComponent>,
    private settingsService: SettingsService,
    private wordTypeEntityService: WordTypeEntityService
  ) {
  }

  public ngOnInit() {
    this.settingsService.appSettingsChanged.subscribe((appSettings) => {
      this.supportedLanguages = appSettings.userLanguages.filter((userLanguage) => userLanguage.enabled)
        .map((userLanguage) => userLanguage.iso);
    });
    this.loadWordTypeEntities();
  }

  private loadWordTypeEntities() {
    this.wordTypeEntityService.getWordTypeEntities().subscribe((wordTypeEntities) => {
      this.wordTypeEntities = wordTypeEntities;
      this.newWordEntity = {
        type: this.wordTypeEntities.length > 0 && this.wordTypeEntities[0],
        texts: [
          {
            meta: '',
            tags: [],
            words: {}
          }
        ]
      };
    });
  }

  public onCancel() {
    this.dialogRef.close({
      success: false
    });
  }

  public onSave(wordEntity?: WordEntity) {
    this.dialogRef.close({
      success: true,
      wordEntity: wordEntity || (this.wordEditComponent && this.wordEditComponent.editedWordEntity)
    });
  }
}
