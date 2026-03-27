import {Component, EventEmitter, Input, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormsModule} from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-month-year',
  imports: [CommonModule, FormsModule, DatePickerModule],
  templateUrl: './month-year.html',
  styleUrl: './month-year.css'
})
export class MonthYearComponent {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Output() monthYearChange = new EventEmitter<string>();

  selectedMonthYear: Date | null = null;

  onMonthYearChange(): void {
    if (this.selectedMonthYear) {
      const month = this.selectedMonthYear.getMonth() + 1; // I mesi in JavaScript sono indicizzati da 0
      const year = this.selectedMonthYear.getFullYear();
      const formattedValue = `${year}-${month.toString().padStart(2, '0')}`;
      this.monthYearChange.emit(formattedValue);
    } else {
      this.monthYearChange.emit('');
    }
  }
}

