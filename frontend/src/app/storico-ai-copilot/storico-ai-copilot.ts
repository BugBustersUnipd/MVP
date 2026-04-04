import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router  } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { Tables } from '../components/tables/tables';
import { Filters } from '../components/filters/filters';
import { MenuItem} from 'primeng/api';
import { ResultSplit, State } from '../shared/models/result-split.model';
import { AiCoPilotService } from '../../services/ai-co-pilot-service/ai-co-pilot-service';



@Component({
  selector: 'app-storico-ai-copilot',
  imports: [FormsModule, Tables, Filters, AsyncPipe],
  templateUrl: './storico-ai-copilot.html',
  styleUrl: './storico-ai-copilot.css',
})
export class StoricoAiCopilot {
  router = inject(Router);
  private aiCoPilotService = inject(AiCoPilotService);
  private destroyRef = inject(DestroyRef);

  private resultSplits: ResultSplit[] = [];
  private parentNames: Record<number, string> = {};
  private parentPageCounts: Record<number, number> = {};
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
      documents.filter((g: any) => {
        const normalizedSearch = searchvalue.toLowerCase();
        const confidenceForSearch = this.formatConfidenceForSearch(g.confidence);
        const matchSearch =
          !searchvalue ||
          (g.name ?? '').toLowerCase().includes(normalizedSearch) ||
          g.id!.toString().toLowerCase().includes(normalizedSearch) ||
          confidenceForSearch.includes(normalizedSearch) ||
          (g.recipient?.recipientName ?? '').toLowerCase().includes(normalizedSearch) ||
          (g.state ?? '').toLowerCase().includes(normalizedSearch);
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
    { field: 'id', header: 'Id Documento Splittato', type: 'splitid' },
    { field: 'name', header: 'Nome Documento Originale' },
    { field: 'confidence', header: 'Confidenza' },
    { field: 'recipient', header: 'Destinatario' },
    { field: 'state', header: 'Stato' },
    { field: 'data', header: 'Data analisi', type: 'date' },
  ];

  /**
   * Inizializza menu, dati storico e subscription ai flussi del service.
   */
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
                    },
                    {
                        label: 'Riprova',
                        icon: 'pi pi-refresh'
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

    this.aiCoPilotService.currentParentPageCounts$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pageCounts) => {
        this.parentPageCounts = { ...pageCounts };
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

  /**
   * Aggiorna la ricerca testuale globale.
   * @param value Testo digitato dall'utente.
   */
  onSearchChange(value: string) {
    this.searchvalue = value;
    this.searchSubject.next(value);
  }

  /**
   * Aggiorna il filtro per intervallo date.
   * @param dates Date selezionate nel filtro.
   */
  onDateChange(dates: Date[]) {
    this.dates = dates;
    this.datesSubject.next(dates);
  }

  /**
   * Aggiorna il filtro per tipologia documento.
   * @param document Documento/categoria selezionata.
   */
  onDocumentChange(document: string | number) {
    this.selectedDocument = document !== undefined && document !== null ? String(document) : undefined;
    this.selectedDocumentSubject.next(this.selectedDocument);
  }

  /**
   * Aggiorna il filtro azienda.
   * @param company Azienda selezionata.
   */
  onCompanyChange(company: string | number) {
    this.selectedCompany = company !== undefined && company !== null ? String(company) : undefined;
    this.selectedCompanySubject.next(this.selectedCompany);
  }

  /**
   * Ricostruisce la lista documenti e aggiorna le opzioni filtro documento.
   */
  private rebuildDocuments(): void {
    this.Documents = this.resultSplits.map((split) => this.toStoricoRow(split));
    this.DocumentType = [...new Set(this.Documents.map((d) => d.category).filter(Boolean))];
    this.documentsSubject.next(this.Documents);
  }

  /**
   * Normalizza una data al solo giorno per confronti su range.
   * @param value Data da normalizzare.
   * @returns Timestamp del giorno normalizzato.
   */
  private normalizeDate(value: Date): number {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  /**
   * Mappa uno split nel formato riga usato dalla tabella storico.
   * @param split Documento split sorgente.
   * @returns Riga pronta per visualizzazione e filtri.
   */
  private formatConfidenceForSearch(value: unknown): string {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) {
      return '';
    }

    const truncated = Math.trunc(num * 10) / 10;
    return truncated.toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).toLowerCase();
  }

  private toStoricoRow(split: ResultSplit): any {
    const originalDocumentName = this.parentNames[split.parentId];

    return {
      company: split.company,
      category: split.category,
      name: originalDocumentName,
      parentId: split.parentId,
      id: split.id,
      confidence: split.confidence,
      fieldConfidences: split.fieldConfidences,
      recipient: split.recipient,
      state: split.state,
      data: split.data,
      data_interna: split.data_interna,
      time_Analysis: split.time_Analysis,
      page_end: split.page_end,
      page_start: split.page_start,
      department: split.department,
      reason: split.reason,
      month_year: split.month_year,
    };
  }

  /**
   * Gestisce le azioni menu tabella (modifica, elimina, riprova).
   * @param event Riga selezionata e azione scelta.
   */
  onTableMenuAction(event: { row: ResultSplit; item: MenuItem }): void {
    const action = event.item.label?.toLowerCase();

    if (action === 'modifica') {
      this.navigateToResult(event.row);
    } else if (action === 'elimina') {
      this.aiCoPilotService.deleteUploadedDocument(event.row.parentId);
    } else if (action === 'riprova' && event.row.state === State.Failed) {
      this.aiCoPilotService.retryExtractedDocumentProcessing(event.row.id!);
    }
  }

  /**
   * Rimuove una riga dalla lista locale e aggiorna lo stream documenti.
   * @param row Riga rimossa.
   */
  onRowRemoved(row: ResultSplit): void {
    this.Documents = this.Documents.filter((doc) => doc.id !== row.id);
    this.documentsSubject.next(this.Documents);
  }

  /**
   * Apre la preview documento per la riga selezionata (o la prima filtrata).
   * @param targetRow Riga target opzionale.
   */
  navigateToResult(targetRow?: ResultSplit){
    const row = targetRow ?? this.filteredDocumentsSnapshot[0];
    const result = this.resultSplits.find((split) => split.id === row?.id);
      if (result) {
        const pages = this.parentPageCounts[result.parentId] ?? Math.max(1, result.page_end - result.page_start + 1);
        this.router.navigate(['/anteprima-documento'], {
          state: {
            result: result,
            pages,
          }
        });
      }
  }


}