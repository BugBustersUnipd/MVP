import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '../button/button';
import { DatePicker } from 'primeng/datepicker';
import { Menutendina } from '../menutendina/menutendina';

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [FormsModule, Button, DatePicker, Menutendina],
  templateUrl: './date-range-picker.html',
  styleUrls: ['./date-range-picker.css'],
})
export class DateRangePicker {
  @Input() periodoOptions: any[] = [];
  @Input() placeholderDefault: string = 'Seleziona periodo';
  @Output() rangeChange = new EventEmitter<Date[] | undefined>();

  dates: Date[] | undefined;
  selectedPeriodo: any = null;

  // Formatta la data in italiano
  formatDate(date: Date): string {
    return date.toLocaleDateString('it-IT');
  }

  // Etichetta da mostrare nella tendina
  getLabel(): string {
    if (this.dates && this.dates.length === 2) {
      const [start, end] = this.dates;
      return `${this.formatDate(start)} - ${this.formatDate(end)}`;
    }
    return this.selectedPeriodo?.name || this.placeholderDefault;
  }

  // Quando si seleziona un periodo predefinito dalla tendina
  onPeriodoChange(periodo: any) {
    const today = new Date();
    let start = new Date();

    switch (periodo.name) {
      case 'Sempre':
        this.dates = undefined;
        this.selectedPeriodo = periodo;
        this.emit();
        return;
      case 'Questo mese':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'Ultime 2 settimane':
        start = new Date();
        start.setDate(today.getDate() - 14);
        break;
      case 'Ultimi 3 mesi':
        start = new Date();
        start.setMonth(today.getMonth() - 3);
        break;
      case 'Ultimo anno':
        start = new Date();
        start.setFullYear(today.getFullYear() - 1);
        break;
    }

    this.dates = [start, today]; // mostra nel datepicker il range dei giorni selezionati
    this.selectedPeriodo = periodo; // mostra il periodo selezionato nel menu a tendina
    this.emit();
  }

  // Quando si seleziona manualmente un range nel datepicker
  onDateSelect() {
    if (!this.dates || this.dates.length !== 2 || !this.dates[0] || !this.dates[1]) return;

    this.selectedPeriodo = null; // annulla il periodo predefinito
    this.emit();
  }

  // Invia l'evento verso l'host
  emit() {
    this.rangeChange.emit(this.dates);
  }
}