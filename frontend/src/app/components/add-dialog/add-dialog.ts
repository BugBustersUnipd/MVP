import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { Button } from '../button/button';

export type AddDialogType = 'tone' | 'style' | 'template' | 'company';

export interface AddDialogSaveData {
  type: AddDialogType;
  name: string;
  description: string;
}

@Component({
  selector: 'app-add-dialog',
  imports: [CommonModule, FormsModule, DialogModule, Button],
  templateUrl: './add-dialog.html',
  styleUrl: './add-dialog.css',
})
export class AddDialog {
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saveRequested = new EventEmitter<AddDialogSaveData>();

  @Input() type: AddDialogType = 'tone';

  name: string = '';
  description: string = '';
  submitted: boolean = false;

  get dialogTitle(): string {
    return this.type === 'tone' ? 'Aggiungi un tono' : this.type === 'style' ? 'Aggiungi uno stile' : 'Aggiungi un template';
  }

  get saveLabel(): string {
    return this.type === 'tone' ? 'Salva tono' : this.type === 'style' ? 'Salva stile' : 'Salva template';
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }

  save(): void {
    this.submitted = true;

    const normalizedName = this.name.trim();
    if (!normalizedName) {
      return;
    }

    const normalizedDescription = this.description.trim() || normalizedName;

    this.saveRequested.emit({
      type: this.type,
      name: normalizedName,
      description: normalizedDescription,
    });

    this.close();
  }

  private resetForm(): void {
    this.name = '';
    this.description = '';
    this.submitted = false;
  }
}
