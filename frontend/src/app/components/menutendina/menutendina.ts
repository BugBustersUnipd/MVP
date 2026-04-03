import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { IftaLabelModule } from 'primeng/iftalabel';
import { ButtonModule } from 'primeng/button';
import { Button } from '../button/button';

@Component({
  selector: 'menutendina',
  imports: [CommonModule, FormsModule, SelectModule, IftaLabelModule, ButtonModule, Button],
  templateUrl: './menutendina.html',
  styleUrl: './menutendina.css',
})
export class SelectComponent {
  @Input() options: { id: number; name: string }[] | null | undefined;
  @Input() label: string='';
  @Input() selected: any;
  @Input() placeholder: string = '';
  @Input() addButtonLabel: string = 'Nuovo';
  @Input() showAddNew: boolean = true;
  @Input() showRemove: boolean = true;
  @Input() disabled: boolean = false;   /** Rende la select parametrica per usarla in più pagine */
  @Output() selectedChange = new EventEmitter<any>();
  @Output() addNew = new EventEmitter<void>();
  @Output() remove = new EventEmitter<number>();

  emitRemove(optionId: number): void {
    this.remove.emit(optionId);
  }

  emitAddNew(): void {
    this.addNew.emit();
  }
}
