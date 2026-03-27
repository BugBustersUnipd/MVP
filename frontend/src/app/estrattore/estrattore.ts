import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  imports: [FormsModule, Upload, Menutendina, InputComponent, MonthYearComponent, Button],
  templateUrl: './estrattore.html',
  styleUrl: './estrattore.css',
})
export class Estrattore implements OnInit {
  private router = inject(Router);
  private aiService = inject(AiCoPilotService);

  // cambiabile quando c'e backend
  companies = [
    { id: 1, name: 'ACME S.p.A.' },
    { id: 2, name: 'Globex S.r.l.' },
    { id: 3, name: 'Initech' },
  ];

  selectedCategory: string | undefined= '';
  selectedCompany: any = null;
  selectedDepartment: string = '';
  selectedCompetenceMonthYear: string = '';
  selectedFiles: File[] = [];

  // Controlla se tutti i campi necessari sono compilati e se ci sono file da caricare.
  get canUpload(): boolean {
    return !!(
      this.selectedCategory?.trim() &&
      this.selectedCompany &&
      this.selectedDepartment.trim() &&
      this.selectedCompetenceMonthYear.trim() &&
      this.selectedFiles.length > 0
    );
  }

  ngOnInit(): void {
    this.aiService.fetchCompanies();
  }

  // Gestisce il cambio di categoria con conversione di tipo sicura
  onCategoryChange(value: string | number | undefined): void {
    this.selectedCategory = String(value ?? '');
  }

  // Gestisce il cambio di reparto con conversione di tipo sicura
  onDepartmentChange(value: string | number | undefined): void {
    this.selectedDepartment = String(value ?? '');
  }

  // Gestisce il cambio di mese/anno con conversione di tipo sicura
  onCompetenceMonthYearChange(value: string | number | undefined): void {
    this.selectedCompetenceMonthYear = String(value ?? '');
  }

  // Quando cambia l'azienda, resetta il reparto.
  onCompanyChange(company: any): void {
    this.selectedCompany = company;
    this.selectedDepartment = '';
  }

  // Riceve i file selezionati dal componente di upload e li memorizza nello stato del componente.
  onFilesSelected(files: File[]): void {
    this.selectedFiles = files ?? [];
  }

  // Quando l'utente clicca su "Carica", verifica se e possibile caricare e poi naviga alla pagina dello storico.
  upload(): void {
    if (!this.canUpload) {
      return;
    }

    this.router.navigate(['/storico-ai-copilot']);
  }
}
