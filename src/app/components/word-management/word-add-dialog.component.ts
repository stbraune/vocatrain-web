import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material';

import { SettingsService } from '../../../shared';
import { WordEntity } from '../../../shared';

import { WordEditComponent } from '../../../shared';

@Component({
  selector: 'word-add-dialog',
  templateUrl: './word-add-dialog.component.html',
  styleUrls: ['./word-add-dialog.component.scss']
})
export class WordAddDialogComponent implements OnInit {
  public supportedLanguages: string[] = [];
  public newWordEntity: WordEntity;

  private _wordEditComponent: WordEditComponent;

  @Input()
  public availableTags: string[] = [];

  @ViewChild('wordEdit')
  public set wordEditComponent(value: WordEditComponent) {
    this._wordEditComponent = value;
  }

  public get wordEditComponent() {
    return this._wordEditComponent;
  }

  public constructor(
    private dialogRef: MatDialogRef<WordAddDialogComponent>,
    private settingsService: SettingsService
  ) {
  }

  public ngOnInit() {
    this.settingsService.appSettingsChanged.subscribe((appSettings) => {
      this.supportedLanguages = appSettings.userLanguages.filter((userLanguage) => userLanguage.enabled)
        .map((userLanguage) => userLanguage.iso);
    });
    this.newWordEntity = {
      texts: [
        {
          meta: '',
          tags: [],
          words: {}
        }
      ]
    };
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
