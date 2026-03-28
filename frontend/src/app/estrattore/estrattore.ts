import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { Menutendina } from '../components/menutendina/menutendina';
import { InputComponent } from '../components/input/input';
import { MonthYearComponent } from '../components/month-year/month-year';
import { Upload } from '../components/upload/upload';
import { Button } from '../components/button/button';
import { Router } from '@angular/router';

// servizi
import { AiCoPilotService } from '../../services/ai-co-pilot-service/ai-co-pilot-service';

@Component({
  selector: 'app-estrattore',
  imports: [FormsModule, Upload, Menutendina, InputComponent, MonthYearComponent, Button, AsyncPipe],
  templateUrl: './estrattore.html',
  styleUrl: './estrattore.css',
})
export class Estrattore implements OnInit {
  private router = inject(Router);
  private aiService = inject(AiCoPilotService);
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
    console.log('Files selezionati:', files);
    this.selectedFiles = files ?? [];
  }

  upload(): void {
    if (!this.canUpload) {
      return;
    }
    this.aiService.uploadFiles(
    this.selectedFiles,
    this.selectedCompany.name, // oppure id se serve
    this.selectedDepartment,
    this.selectedCategory ?? '',
    this.selectedCompetenceMonthYear
  );
    this.router.navigate(['/storico-ai-copilot']);
  }
}
