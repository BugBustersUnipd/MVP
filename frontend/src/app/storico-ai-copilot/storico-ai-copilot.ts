import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router  } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { Tables } from '../components/tables/tables';
import { Filters } from '../components/filters/filters';
import { MenuItem} from 'primeng/api';
import { Button } from '../components/button/button';
import { ResultSplit } from '../shared/models/result-split.model';
import { AiCoPilotService } from '../../services/ai-co-pilot-service/ai-co-pilot-service';



@Component({
  selector: 'app-storico-ai-copilot',
  imports: [FormsModule, Tables, Filters, Button, AsyncPipe],
  templateUrl: './storico-ai-copilot.html',
  styleUrl: './storico-ai-copilot.css',
})
export class StoricoAiCopilot {
  router = inject(Router);
  private aiCoPilotService = inject(AiCoPilotService);
  private destroyRef = inject(DestroyRef);

  private resultSplits: ResultSplit[] = [];
  private parentNames: Record<number, string> = {};
  private documentsSubject = new BehaviorSubject<ResultSplit[]>([]);
  private searchSubject = new BehaviorSubject<string>('');
  private datesSubject = new BehaviorSubject<Date[] | undefined>(undefined);
  private selectedDocumentSubject = new BehaviorSubject<string | undefined>(undefined);
  private selectedCompanySubject = new BehaviorSubject<string | undefined>(undefined);
  private filteredDocumentsSnapshot: ResultSplit[] = [];

  Documents: ResultSplit[] = [];
  FilteredDocuments$ = combineLatest([
    this.documentsSubject,
    this.searchSubject,
    this.datesSubject,
    this.selectedDocumentSubject,
    this.selectedCompanySubject,
  ]).pipe(
    map(([documents, searchvalue, dates, selectedDocument, selectedCompany]) =>
      documents.filter((g) => {
        const normalizedSearch = searchvalue.toLowerCase();
        const matchSearch =
          !searchvalue ||
          g.name.toLowerCase().includes(normalizedSearch) ||
          g.id.toString().toLowerCase().includes(normalizedSearch) ||
          g.confidence.toString().toLowerCase().includes(normalizedSearch) ||
          g.recipientName.toLowerCase().includes(normalizedSearch) ||
          g.state.toLowerCase().includes(normalizedSearch);
        const matchDocument = !selectedDocument || g.category === selectedDocument;
        const matchCompany = !selectedCompany || g.company === selectedCompany;
        const matchDate =
          !dates ||
          dates.length !== 2 ||
          (this.normalizeDate(g.data) >= this.normalizeDate(dates[0]) &&
            this.normalizeDate(g.data) <= this.normalizeDate(dates[1]));
        return matchCompany && matchDate && matchDocument && matchSearch;
      })
    )
  );

  items : MenuItem[] = [];
  dates: Date[] | undefined;
  searchvalue = '';
  Companies: string[] = [];
  selectedCompany: string | undefined;
  DocumentType: string[] = [];
  selectedDocument: string | undefined;
  columns = [
    { field: 'name', header: 'Nome Documento Originale' },
    { field: 'id', header: 'Id' },
    { field: 'confidence', header: 'Confidenza' },
    { field: 'recipientName', header: 'Destinatario' },
    { field: 'state', header: 'Stato' },
    { field: 'data', header: 'Data analisi', type: 'date' },
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
        this.rebuildDocuments();
      });

    this.aiCoPilotService.currentParentNames$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((names) => {
        this.parentNames = { ...names };
        this.rebuildDocuments();
      });

    this.aiCoPilotService.companies$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((companies) => {
        this.Companies = companies.map((company) => company.name).filter(Boolean);
      });

    this.FilteredDocuments$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rows) => {
        this.filteredDocumentsSnapshot = rows;
      });
  }

  onSearchChange(value: string) {
    this.searchvalue = value;
    this.searchSubject.next(value);
  }

  onDateChange(dates: Date[]) {
    this.dates = dates;
    this.datesSubject.next(dates);
  }

  onDocumentChange(document: string | number) {
    this.selectedDocument = document !== undefined && document !== null ? String(document) : undefined;
    this.selectedDocumentSubject.next(this.selectedDocument);
  }

  onCompanyChange(company: string | number) {
    this.selectedCompany = company !== undefined && company !== null ? String(company) : undefined;
    this.selectedCompanySubject.next(this.selectedCompany);
  }

  private rebuildDocuments(): void {
    this.Documents = this.resultSplits.map((split) => this.toStoricoRow(split));
    this.DocumentType = [...new Set(this.Documents.map((d) => d.category).filter(Boolean))];
    this.documentsSubject.next(this.Documents);
  }

  private normalizeDate(value: Date): number {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  private toStoricoRow(split: ResultSplit): ResultSplit {
    const originalDocumentName = this.parentNames[split.parentId] || split.name;

    return {
      company: split.company,
      category: split.category,
      name: originalDocumentName,
      parentId: split.parentId,
      id: split.id,
      confidence: split.confidence,
      recipientName: split.recipientName,
      state: split.state,
      data: split.data,
      recipientId: split.recipientId,
      recipientEmail: split.recipientEmail,
      recipientCode: split.recipientCode,
      time_Analysis: split.time_Analysis,
      page_end: split.page_end,
      page_start: split.page_start,
      department: split.department,
      month_year: split.month_year,
    };
  }

  onTableMenuAction(event: { row: ResultSplit; item: MenuItem }): void {
    const action = event.item.label?.toLowerCase();

    if (action === 'modifica') {
      this.navigateToResult(event.row);
    }
  }

  navigateToResult(targetRow?: ResultSplit){
    const row = targetRow ?? this.filteredDocumentsSnapshot[0];
    const result = this.resultSplits.find((split) => split.id === row?.id);
      if (result) {
        const pages = Math.max(1, result.page_end - result.page_start + 1);
        this.router.navigate(['/anteprima-documento'], {
          state: {
            result: result,
            pages,
          }
        });
      }
  }


}
