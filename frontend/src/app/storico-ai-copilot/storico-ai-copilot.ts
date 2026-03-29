import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router  } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Tables } from '../components/tables/tables';
import { Filters } from '../components/filters/filters';
import { MenuItem} from 'primeng/api';
import { Button } from '../components/button/button';
import { ResultSplit } from '../shared/models/result-split.model';
import {State} from '../shared/models/result-split.model'; 
import { AiCoPilotService } from '../../services/ai-co-pilot-service/ai-co-pilot-service';

type StoricoSplitRow = {
  Company: string;
  TypeofDocument: string;
  DocumentName: string;
  Id: string;
  SplitId: number;
  Confidence: string;
  Recepient: string;
  State: State;
  Data: Date;
};

@Component({
  selector: 'app-storico-ai-copilot',
  imports: [FormsModule, Tables, Filters, Button],
  templateUrl: './storico-ai-copilot.html',
  styleUrl: './storico-ai-copilot.css',
})
export class StoricoAiCopilot {
  pages: number = 22; //todo questa info si prende dal docuumento originale, viene restituita dal backend in quache modo
  router = inject(Router);
  private aiCoPilotService = inject(AiCoPilotService);
  private destroyRef = inject(DestroyRef);

  private resultSplits: ResultSplit[] = [];
  private parentNames: Record<number, string> = {};
  Documents: StoricoSplitRow[] = [];
  FilteredDocuments: StoricoSplitRow[] = [];
  items : MenuItem[] = [];
  dates: Date[] | undefined;
  searchvalue = '';
  Companies: string[] = [];
  selectedCompany: string | undefined;
  DocumentType: string[] = [];
  selectedDocument: string | undefined;
  columns = [
    { field: 'DocumentName', header: 'Nome Documento Originale' },
    { field: 'Id', header: 'Id' },
    { field: 'Confidence', header: 'Confidenza' },
    { field: 'Recepient', header: 'Destinatario' },
    { field: 'State', header: 'Stato' },
    { field: 'Data', header: 'Data analisi', type: 'date' },
  ];
  ngOnInit() {
        this.items = [
            {
                items: [
                    {
                        label: 'Modifica',
                        icon: 'pi pi-pencil',
                    },
                    {   
                        label: 'Elimina',
                        icon: 'pi pi-trash'
                    }
                ]
            }
        ];
    this.aiCoPilotService.fetchHistoryResults();
    this.aiCoPilotService.fetchCompanies();

    this.aiCoPilotService.currentResultsHistory$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((results) => {
        this.resultSplits = [...(results ?? [])];
        this.Documents = this.resultSplits.map((split) => this.toStoricoRow(split));
        this.DocumentType = [...new Set(this.Documents.map((d) => d.TypeofDocument).filter(Boolean))];
        this.applyFilters();
      });

    this.aiCoPilotService.currentParentNames$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((names) => {
        this.parentNames = { ...names };
        this.Documents = this.resultSplits.map((split) => this.toStoricoRow(split));
        this.applyFilters();
      });

    this.aiCoPilotService.companies$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((companies) => {
        this.Companies = companies.map((company) => company.name).filter(Boolean);
      });
  }
  onSearchChange(value: string) {
    this.searchvalue = value;
    this.applyFilters();
  }
  onDateChange(dates: Date[]) {
    this.dates = dates;
    this.applyFilters();
  }
  onDocumentChange(document: string | number) {
    this.selectedDocument = document !== undefined && document !== null ? String(document) : undefined;
    this.applyFilters();
  }
  onCompanyChange(company: string | number) {
    this.selectedCompany = company !== undefined && company !== null ? String(company) : undefined;
    this.applyFilters();
  }
  applyFilters() {
    this.FilteredDocuments = this.Documents.filter((g) => {
      const matchSearch =
        !this.searchvalue ||
        g.DocumentName.toLowerCase().includes(this.searchvalue.toLowerCase()) ||
        g.Id.toString().toLowerCase().includes(this.searchvalue.toLowerCase()) ||
        g.Confidence.toLowerCase().includes(this.searchvalue.toLowerCase()) ||
        g.Recepient.toLowerCase().includes(this.searchvalue.toLowerCase()) ||
        g.State.toLowerCase().includes(this.searchvalue.toLowerCase());
      const matchDocument = !this.selectedDocument || g.TypeofDocument === this.selectedDocument;
      const matchCompany = !this.selectedCompany || g.Company === this.selectedCompany;
      const matchDate =
        !this.dates ||
        this.dates.length !== 2 ||
        (this.normalizeDate(g.Data) >= this.normalizeDate(this.dates[0]) &&
          this.normalizeDate(g.Data) <= this.normalizeDate(this.dates[1]));
      return matchCompany && matchDate && matchDocument && matchSearch;
    });
  }

  private normalizeDate(value: Date): number {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  private toStoricoRow(split: ResultSplit): StoricoSplitRow {
    const originalDocumentName = this.parentNames[split.parentId] || split.name;

    return {
      Company: split.company,
      TypeofDocument: split.category,
      DocumentName: originalDocumentName,
      Id: `${split.parentId}.${split.id}`,
      SplitId: split.id,
      Confidence: `${split.confidence}%`,
      Recepient: split.recipientName,
      State: split.state,
      Data: split.data,
    };
  }

  // al momento questa funzione mi serve solo per predisporre il passaggio del risultato alla pagina anteprima-documento
  navigateToResult(){
    // al momento apriamo il primo result split filtrato disponibile
    const firstFiltered = this.FilteredDocuments[0];
    const result = this.resultSplits.find((split) => split.id === firstFiltered?.SplitId);
      if (result) {
        this.router.navigate(['/anteprima-documento'], {
          state: {
            result: result,
            pages: this.pages //todo passare le pagine del documento originale, rispetto il ResultSplit cliccato nello storico
          }
        });
      }
  }


}
