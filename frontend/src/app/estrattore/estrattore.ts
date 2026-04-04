import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { SelectComponent } from '../components/menutendina/menutendina';
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
  imports: [FormsModule, Upload, SelectComponent, InputComponent, MonthYearComponent, Button, AsyncPipe, ToastModule],
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

  /**
   * Carica i dati iniziali necessari alla pagina di upload documenti.
   */
  ngOnInit(): void {
    this.aiService.fetchCompanies();
    
  }

  /**
   * Aggiorna la categoria selezionata.
   * @param value Valore emesso dal componente select.
   */
  onCategoryChange(value: string | number | undefined): void {
    this.selectedCategory = String(value ?? '');
  }

  /**
   * Aggiorna il reparto selezionato.
   * @param value Valore emesso dal campo reparto.
   */
  onDepartmentChange(value: string | number | undefined): void {
    this.selectedDepartment = String(value ?? '');
  }

  /**
   * Aggiorna il mese/anno di competenza selezionato.
   * @param value Valore emesso dal componente month-year.
   */
  onCompetenceMonthYearChange(value: string | number | undefined): void {
    this.selectedCompetenceMonthYear = String(value ?? '');
  }

  /**
   * Imposta l'azienda selezionata e resetta i campi dipendenti dall'azienda.
   * @param company Azienda selezionata.
   */
  onCompanyChange(company: any): void {
    this.selectedCompany = company;
    this.selectedDepartment = '';
  }

  /**
   * Salva la lista file validati pronta per l'upload.
   * @param files File selezionati dal componente upload.
   */
  onFilesSelected(files: File[]): void {
    this.selectedFiles = files ?? [];
  }

  /**
   * Mostra un toast con i file non validi intercettati in upload.
   * @param error Errore di validazione con elenco file scartati.
   */
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

  /**
   * Avvia l'upload della batch e naviga alla pagina di riconoscimento.
   */
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
    this.router.navigate(['/riconoscimento-documenti'], {
      state: { preserveSession: true }
    });
  }
}
