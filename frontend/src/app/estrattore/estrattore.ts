import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { Menutendina } from '../components/menutendina/menutendina';
import { InputComponent } from '../components/input/input';
import { MonthYearComponent } from '../components/month-year/month-year';
import { Upload } from '../components/upload/upload';
import { Button } from '../components/button/button';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { UploadValidationError } from '../components/upload/upload';

// servizi
import { AiCoPilotService } from '../../services/ai-co-pilot-service/ai-co-pilot-service';

@Component({
  selector: 'app-estrattore',
  imports: [FormsModule, Upload, Menutendina, InputComponent, MonthYearComponent, Button, AsyncPipe, ToastModule],
  providers: [MessageService],
  templateUrl: './estrattore.html',
  styleUrl: './estrattore.css',
})
export class Estrattore implements OnInit {
  private router = inject(Router);
  private aiService = inject(AiCoPilotService);
  private messageService = inject(MessageService);
  companies$ = this.aiService.companies$;

  selectedCategory: string | undefined= '';
  selectedCompany: any = null;
  selectedDepartment: string = '';
  selectedCompetenceMonthYear: string = '';
  selectedFiles: File[] = [];

  get canUpload(): boolean {
    return !!(
      this.selectedFiles.length > 0
    );
  }

  ngOnInit(): void {
    this.aiService.fetchCompanies();
    
  }

  onCategoryChange(value: string | number | undefined): void {
    this.selectedCategory = String(value ?? '');
  }

  onDepartmentChange(value: string | number | undefined): void {
    this.selectedDepartment = String(value ?? '');
  }

  onCompetenceMonthYearChange(value: string | number | undefined): void {
    this.selectedCompetenceMonthYear = String(value ?? '');
  }

  onCompanyChange(company: any): void {
    this.selectedCompany = company;
    this.selectedDepartment = '';
  }

  onFilesSelected(files: File[]): void {
    this.selectedFiles = files ?? [];
  }

  onFileValidationError(error: UploadValidationError): void {
    const invalidList = error.invalidFiles.join(', ');
    this.messageService.add({
      severity: 'warn',
      summary: 'File immagine non valido',
      detail: invalidList
        ? `I seguenti file non sono validi: ${invalidList}`
        : 'Carica un file immagine valido.',
    });
  }

  upload(): void {
    if (!this.canUpload) {
      return;
    }
    this.aiService.uploadFiles(
    this.selectedFiles,
    this.selectedCompany?.name ?? '', // azienda opzionale
    this.selectedDepartment,
    this.selectedCategory ?? '',
    this.selectedCompetenceMonthYear
  );
  this.router.navigate(['/riconoscimento-documenti']);
  }
}
