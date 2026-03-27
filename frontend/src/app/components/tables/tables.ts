import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MenuModule } from 'primeng/menu';
import { MenuItem, MessageService } from 'primeng/api';
import { DatePipe } from '@angular/common';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag'
@Component({
  selector: 'app-tables',
  imports: [FormsModule, TableModule, ButtonModule, ToastModule, MenuModule, DatePipe, CommonModule, TagModule],
  providers: [MessageService],
  templateUrl: './tables.html',
  styleUrl: './tables.css',
})
export class Tables {

@Input() RisultatoFiltrato: any[] = [];
@Input() columns: any[] = [];
@Input() items: MenuItem[] = [];
@Input() class: string = '';
@Output() titleClick = new EventEmitter<any>();

onTitleClick(row: any): void {
  this.titleClick.emit(row);
}

}
