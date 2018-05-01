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

  public editedWordEntity: WordEntity = JSON.parse(JSON.stringify(this.emptyWordEntity));

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
    this.editedWordEntity = JSON.parse(JSON.stringify(this.emptyWordEntity));
  }

  public wordEntityCancelled() {
    this.editedWordEntity = JSON.parse(JSON.stringify(this.emptyWordEntity));
  }
}
