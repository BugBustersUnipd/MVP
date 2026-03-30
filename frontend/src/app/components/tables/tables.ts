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

getPlainCellText(row: any, col: any): string {
  const value = row?.[col?.field];
  return this.stripHtmlTags(value);
}

private stripHtmlTags(value: unknown): string {
  const input = typeof value === 'string' ? value : (value ?? '').toString();
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/&(amp|lt|gt|quot|apos|#39);/gi, (match) => {
      const normalized = match.toLowerCase();
      if (normalized === '&amp;') return '&';
      if (normalized === '&lt;') return '<';
      if (normalized === '&gt;') return '>';
      if (normalized === '&quot;') return '"';
      if (normalized === '&apos;' || normalized === '&#39;') return "'";
      return match;
    })
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\s+/g, ' ')
    .trim();
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
