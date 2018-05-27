import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'chip',
  templateUrl: './chip.component.html',
  styleUrls: ['./chip.component.scss']
})
export class ChipComponent {
  @Input()
  public chip = '';

  @Output()
  public chipDeleteClicked = new EventEmitter<string>();

  @Output()
  public chipClicked = new EventEmitter<string>();

  @Input()
  public mode: 'read' | 'update' = 'update';

  public deleteChip($event: MouseEvent, chip: string) {
    $event.stopPropagation();
    if (this.mode === 'update') {
      this.chipDeleteClicked.emit(chip);
    }
  }

  public onChipClicked(chip: string) {
    this.chipClicked.emit(chip);
  }
}
