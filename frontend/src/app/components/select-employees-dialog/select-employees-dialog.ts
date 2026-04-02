import { AsyncPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { map, Observable } from 'rxjs';
import { Button } from '../button/button';
import { Menutendina } from '../menutendina/menutendina';
import { RecipientInfo } from '../../shared/models/result-split.model';

interface EmployeeMenuOption {
  id: number;
  name: string;
  recipient: RecipientInfo;
}

export interface SelectEmployeeDialogData {
  extractedEmployeeName: string;
  employees$: Observable<RecipientInfo[]>;
}

@Component({
  selector: 'bb-select-employees-dialog',
  imports: [Menutendina, Button, AsyncPipe],
  templateUrl: './select-employees-dialog.html',
  styleUrl: './select-employees-dialog.css'
})
export class SelectEmployeesDialog implements OnInit {
  public ref: DynamicDialogRef = inject(DynamicDialogRef);
  public config: DynamicDialogConfig = inject(DynamicDialogConfig);

  employees$: Observable<RecipientInfo[]> | null = null;
  menuEmployees$: Observable<EmployeeMenuOption[]> | null = null;
  extractedEmployeeName: string = '';
  selectedEmployee: EmployeeMenuOption | null = null;

  ngOnInit(): void {
    const data = (this.config.data || {}) as Partial<SelectEmployeeDialogData>;
    this.extractedEmployeeName = data.extractedEmployeeName || '';
    this.employees$ = data.employees$ || null;
    this.menuEmployees$ = this.employees$?.pipe(
      map((employees) =>
        employees.map((employee) => ({
          id: employee.recipientId,
          name: employee.recipientName,
          recipient: employee,
        }))
      )
    ) ?? null;
  }

  closeDialog(): void {
    this.ref.close();
  }

  saveDialog(): void {
    if (!this.selectedEmployee) {
      return;
    }

    const payload: RecipientInfo = this.selectedEmployee.recipient;

    this.ref.close(payload);
  }
}