import { Component, OnInit } from '@angular/core';
import { WordEntity, WordTypeEntity } from '../../model';
import { SettingsService } from '../../settings';
import { WordTypeEntityService } from '../../services';
import { MatDialogRef } from '@angular/material';

@Component({
  selector: 'word-add-dialog',
  templateUrl: './word-add-dialog.component.html',
  styleUrls: ['./word-add-dialog.component.scss']
})
export class WordAddDialogComponent implements OnInit {
  public wordTypeEntities: WordTypeEntity[] = [];
  public supportedLanguages: string[] = [];
  public newWordEntity: WordEntity;

  public constructor(
    private dialogRef: MatDialogRef<WordAddDialogComponent>,
    private settingsService: SettingsService,
    private wordTypeEntityService: WordTypeEntityService
  ) {
  }

  public ngOnInit() {
    this.supportedLanguages = this.settingsService.getLanguages();
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

  public onSave(wordEntity: WordEntity) {
    this.dialogRef.close({
      success: true,
      wordEntity: wordEntity
    });
  }
}
