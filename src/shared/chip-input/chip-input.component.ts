import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import * as XRegExp from 'xregexp/xregexp-all';

@Component({
  selector: 'chip-input',
  templateUrl: './chip-input.component.html',
  styleUrls: ['./chip-input.component.scss']
})
export class ChipInputComponent {
  @Input()
  public placeholder = '';

  @Input()
  public signs = '#@';

  @Input()
  public chips: string[] = [];

  @Input()
  public allowedChips: string[];

  @Output()
  public chipsChange = new EventEmitter<string[]>();

  @Input()
  public hideChips = false;

  @Input()
  public value: string;

  @Output()
  public valueChange = new EventEmitter<string>();

  @Output()
  public cursorPressed = new EventEmitter<'up' | 'right' | 'down' | 'left'>();

  @Output()
  public backspacePressed = new EventEmitter<void>();

  @Output()
  public enterPressed = new EventEmitter<void>();

  @ViewChild('input')
  public inputElement: ElementRef;

  public focus() {
    this.inputElement.nativeElement.focus();
  }

  public setValue(value: string) {
    if (value !== this.value) {
      this.value = value;
      this.emitValueChange();
    }
  }

  public addChips(...chips: string[]) {
    const filtered = chips.filter((chip) => this.chips.indexOf(chip) === -1).filter((chip) => this.isAllowed(chip));
    if (filtered.length > 0) {
      this.chips.push(...filtered);
      this.emitChipsChange();
    }
  }

  public popChip() {
    if (this.chips.length > 0) {
      this.chips.pop();
      this.emitChipsChange();
    }
  }

  public removeChips(...chips: string[]) {
    chips.forEach((chip) => {
      const index = this.chips.indexOf(chip);
      if (index !== -1) {
        this.chips.splice(index, 1);
      }
    });
    this.emitChipsChange();
  }

  public toggleChip(chip: string) {
    if (!this.isAllowed(chip)) {
      return;
    }

    const index = this.chips.indexOf(chip);
    if (index === -1) {
      this.chips.push(chip);
    } else {
      this.chips.splice(index, 1);
    }
    this.emitChipsChange();
  }

  public deleteChip(chip: string) {
    const index = this.chips.indexOf(chip);
    if (index !== -1) {
      this.chips.splice(index, 1);
      this.emitChipsChange();
    }
  }

  public isAllowed(chip: string) {
    return this.allowedChips === undefined || this.allowedChips.indexOf(chip) !== -1;
  }

  public onKeyDown($event: KeyboardEvent) {
    this.chips = this.chips || [];
    const target = <HTMLInputElement>$event.target;
    if ($event.which === 37 || $event.which === 36) {
      // left, home
      if (target.selectionStart === 0 && target.selectionEnd === 0) {
        this.cursorPressed.emit('left');
        $event.preventDefault();
      }
    }

    if ($event.which === 38 || $event.which === 33) {
      // up, page up
      this.cursorPressed.emit('up');
      $event.preventDefault();
    }

    if ($event.which === 39 || $event.which === 35) {
      // right, end
      if (target.selectionStart === target.value.length && target.selectionEnd === target.value.length) {
        this.cursorPressed.emit('right');
        $event.preventDefault();
      }
    }

    if ($event.which === 40 || $event.which === 34) {
      // down, page down
      this.cursorPressed.emit('down');
      $event.preventDefault();
    }

    if ($event.which === 9) {
      // tab
      const result = this.parseChips(this.value);
      if (result.success) {
        this.addChips(...result.chips);
        this.setValue(result.value);
        $event.preventDefault();
      }
    }

    if ($event.which === 8) {
      // backspace
      if (target.selectionStart === 0 && target.selectionEnd === 0) {
        if (this.chips.length > 0) {
          this.popChip();
        } else {
          this.backspacePressed.emit();
          $event.preventDefault();
        }
      }
    }
  }

  public onKeyUp($event: KeyboardEvent) {
    const target = <HTMLInputElement>$event.target;

    this.chips = this.chips || [];

    if ($event.which === 13 || $event.which === 32) {
      // enter, space
      const result = this.parseChips(this.value);
      if (result.success) {
        this.addChips(...result.chips);
        this.setValue(result.value);
        $event.preventDefault();
      }
    }
  }

  public onKeyPress($event: KeyboardEvent) {
    if ($event.which === 13) {
      this.enterPressed.emit();
      $event.preventDefault();
    }

    if (($event.which === 10 || $event.which === 13) && ($event.ctrlKey || $event.metaKey)) {
      this.setValue(this.value + '\n');
    }
  }

  private parseChips(value: string) {
    if (!value) {
      return { value, success: false, chips: [] };
    }

    const matches = [];
    const regex = XRegExp(`([${this.signs}][\\pL-\\d]+)\\s*`, 'g');
    const sanitized: string = XRegExp.replace(value, regex, (match) => {
      matches.push(match);
      return ``;
    });

    if (matches) {
      const chips = matches.map((match) => <string>match.substr(1))
        .map((match) => match.trim())
        .filter((match) => !!match)
        .filter((match) => this.isAllowed(match))
        .reduce((uniqs, match) => uniqs.indexOf(match) === -1 ? [...uniqs, match] : uniqs, <string[]>[]);
      if (chips.length === 0) {
        return { value, chips: [], success: false };
      }

      return {
        value: sanitized.replace(/\s+/g, ' ').trim(),
        chips: chips,
        success: true
      };
    }

    return { value, chips: [], success: false };
  }

  public emitChipsChange() {
    this.chipsChange.emit(this.chips);
  }

  public emitValueChange() {
    this.valueChange.emit(this.value);
  }
}
