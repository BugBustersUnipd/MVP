import { AsyncPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Observable } from 'rxjs';
import { Button } from '../button/button';
import { Menutendina } from '../menutendina/menutendina';

export interface EmployeeOption {
  id: number;
  name: string;
  email?: string;
  employeeCode?: string;
}

export interface SelectEmployeeDialogData {
  extractedEmployeeName: string;
  employees$: Observable<EmployeeOption[]>;
}

export interface SelectEmployeeDialogResult {
  id: number;
  name: string;
  email?: string;
  employeeCode?: string;
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

  employees$: Observable<EmployeeOption[]> | null = null;
  extractedEmployeeName: string = '';
  selectedEmployee: EmployeeOption | null = null;

  ngOnInit(): void {
    const data = (this.config.data || {}) as Partial<SelectEmployeeDialogData>;
    this.extractedEmployeeName = data.extractedEmployeeName || '';
    this.employees$ = data.employees$ || null;
  }

  closeDialog(): void {
    this.ref.close();
  }

  saveDialog(): void {
    if (!this.selectedEmployee) {
      return;
    }

    const payload: SelectEmployeeDialogResult = {
      id: this.selectedEmployee.id,
      name: this.selectedEmployee.name,
      email: this.selectedEmployee.email,
      employeeCode: this.selectedEmployee.employeeCode,
    };

    this.ref.close(payload);
  }
}