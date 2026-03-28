import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';


type FilterType = 'dateRange' | 'text' | 'number' | 'searchbar';
@Component({
  selector: 'app-filters',
  imports: [DatePicker, FloatLabelModule, FormsModule, SelectModule, IconFieldModule, InputIconModule, InputTextModule],
  templateUrl: './filters.html',
  styleUrl: './filters.css',
})
export class Filters {

@Input() TypeOfFilter: FilterType = "text";

@Input() DatepickerLabel: string = 'Label Datepicker Generico';
@Input() dates: Date[] | undefined;
@Output() datesChange = new EventEmitter<Date[]>();

@Input() TextFilterLabel: string = 'Label Text Generico';
@Input() textOptions: string[] = [];
@Input() selectedTextOption: number | undefined | string;
@Output() selectedTextOptionChange = new EventEmitter<number | string>();

@Input() searchvalue : string = '';
@Output() searchvalueChange = new EventEmitter<string>();

onSearchChange() {
  this.searchvalueChange.emit(this.searchvalue);
}

onTextOptionChange() {
  this.selectedTextOptionChange.emit(this.selectedTextOption);
}

onDateSelect() {
  this.datesChange.emit(this.dates);
}
}
