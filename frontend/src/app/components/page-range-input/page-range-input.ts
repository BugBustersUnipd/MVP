import { Component, EventEmitter, Input, Output } from '@angular/core';
import { InputComponent } from '../input/input';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'bb-page-range-input',
  imports: [InputComponent, FormsModule, CommonModule],
  templateUrl: './page-range-input.html',
  styleUrl: './page-range-input.css',
})
export class PageRangeInput {
  @Input() editable: boolean = false;
  @Input() page_start: number | undefined;
  @Input() page_end: number | undefined;
  @Input() page_min: number = 1;
  @Input() page_max: number = 1;
  @Output() pageStartChange = new EventEmitter<number | undefined>();
  @Output() pageEndChange = new EventEmitter<number | undefined>();

  onPageStartChange(value: string | number | undefined): void {
    const normalizedValue = this.toNumber(value);
    this.page_start = normalizedValue;
    this.pageStartChange.emit(this.page_start);

    if (
      this.page_start !== undefined &&
      this.page_end !== undefined &&
      this.page_end < this.page_start
    ) {
      this.page_end = this.page_start;
      this.pageEndChange.emit(this.page_end);
    }
  }

  onPageEndChange(value: string | number | undefined): void {
    const normalizedValue = this.toNumber(value);

    if (
      normalizedValue !== undefined &&
      this.page_start !== undefined &&
      normalizedValue < this.page_start
    ) {
      this.page_end = this.page_start;
      this.pageEndChange.emit(this.page_end);
      return;
    }

    this.page_end = normalizedValue;
    this.pageEndChange.emit(this.page_end);
  }

  get pageEndMin(): number {
    if (this.page_start === undefined) {
      return this.page_min;
    }

    return Math.max(this.page_min, this.page_start);
  }

  private toNumber(value: string | number | undefined): number | undefined {
    if (value === undefined || value === '') {
      return undefined;
    }

    const parsedValue = Number(value);
    return Number.isNaN(parsedValue) ? undefined : parsedValue;
  }
}
