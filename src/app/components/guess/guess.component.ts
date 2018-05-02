import { Component, OnInit } from '@angular/core';
import { WordEntityService } from '../../services';
import { GuessService } from './guess.service';

@Component({
  selector: 'guess',
  templateUrl: './guess.component.html',
  styleUrls: ['./guess.component.scss']
})
export class GuessComponent implements OnInit {
  public constructor(
    private wordEntityService: WordEntityService,
    private guessService: GuessService
  ) {
  }

  public ngOnInit(): void {
    console.log(this.guessService);
    this.guessService.findGuessWords(new Date(), 'de', 'bg').subscribe((result) => {
      console.log(result);
    });
  }
}
