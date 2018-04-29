import { Component, OnInit } from '@angular/core';
import { WordTypeEntityService } from '../../services';
import { WordTypeEntity, WordEntity } from '../../model';

@Component({
  selector: 'words',
  templateUrl: './words.component.html',
  styleUrls: ['./words.component.scss']
})
export class WordsComponent implements OnInit {
  public wordTypeEntities: WordTypeEntity[] = [];

  public editedWordTypeEntity: WordTypeEntity;

  public editedWordEntity: WordEntity = {
    type: undefined,
    texts: {}
  };

  public constructor(
    private wordTypeEntityService: WordTypeEntityService
  ) {
  }

  public ngOnInit(): void {
    this.loadWordTypeEntities();
  }

  private loadWordTypeEntities() {
    this.editedWordTypeEntity = undefined;
    this.wordTypeEntityService.getWordTypeEntities().subscribe((wordTypeEntities) => {
      this.wordTypeEntities = wordTypeEntities;
    });
  }

  public wordEntitySaved(wordEntity: WordEntity) {
    console.log('persisted', wordEntity);
    this.editedWordEntity = {
      type: undefined,
      texts: {}
    };
  }

  public wordEntityCancelled() {
    this.editedWordEntity = {
      type: undefined,
      texts: {}
    };
  }
}
