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

@Input() risultatoFiltrato: any[] = [];
@Input() columns: any[] = [];
@Input() items: MenuItem[] = [];
@Input() class: string = '';
@Output() titleClick = new EventEmitter<any>();
@Output() menuAction = new EventEmitter<{ row: any; item: MenuItem }>();
@Output() rowRemoved = new EventEmitter<any>();
rowMenuItems: MenuItem[] = [];

onTitleClick(row: any): void {
  this.titleClick.emit(row);
}

openRowMenu(menu: { toggle: (event: Event) => void }, event: Event, row: any): void {
  this.rowMenuItems = this.items.map((item) => this.bindMenuItemToRow(item, row));
  menu.toggle(event);
}

private bindMenuItemToRow(item: MenuItem, row: any): MenuItem {
  const boundItem: MenuItem = { ...item };

  // Nascondi "Riprova" se lo stato non è "Failed"
  if (item.label?.toLowerCase() === 'riprova' && row.state !== 'Failed' && row.state?.toString() !== 'Failed') {
    return { ...boundItem, visible: false };
  }

  if (item.items?.length) {
    boundItem.items = item.items.map((child) => this.bindMenuItemToRow(child, row));
    return boundItem;
  }

  const existingCommand = item.command;
  boundItem.command = (event) => {
    existingCommand?.(event);
    const action = item.label?.toLowerCase();
    this.menuAction.emit({ row, item });

    // Retrocompatibilita': alcuni container ascoltano ancora rowRemoved.
    if (action === 'elimina') {
      this.rowRemoved.emit(row);
    }
  };

  return boundItem;
}

}
