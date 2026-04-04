import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NestedTables } from '../components/nested-tables/nested-tables';
import { Filters } from '../components/filters/filters';
import { AsyncPipe } from '@angular/common';
import { map } from 'rxjs';
import { Router } from '@angular/router';

//servizi
import { AiCoPilotService } from '../../services/ai-co-pilot-service/ai-co-pilot-service';
import { ResultAiCopilot, DocumentState } from '../shared/models/result-ai-copilot.model';
import { ResultSplit, State } from '../shared/models/result-split.model';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-riconoscimento-documenti',
  imports: [NestedTables, Filters, AsyncPipe],
  templateUrl: './riconoscimento-documenti.html',
  styleUrl: './riconoscimento-documenti.css',
})
export class RiconoscimentoDocumenti {
  private aiCoPilotService = inject(AiCoPilotService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  NestedButtonLabel = 'Riprova Analisi';
  items: MenuItem[] = [];
  sessionParents: ResultAiCopilot[] = [];
  currentBatchParentIds = new Set<number>();
  parentNames: Record<number, string> = {};
  parentPageCounts: Record<number, number> = {};

  DocumentiSplittati: ResultSplit[] = [];
  DocumentiSplittatiFiltrati: ResultSplit[] = [];
  nestedDocuments: ResultAiCopilot[] = [];

  searchvalue: string = '';
  dates: Date[] | undefined;

  confidence$ = this.aiCoPilotService.confidence$;
  selectedconfidence: any = history.state?.confidence ?? null;
  
  categories$ = this.aiCoPilotService.category$;
  selectedCategory: any = history.state?.category ?? null;

  companies$ = this.aiCoPilotService.companies$;
  companyNames$ = this.companies$.pipe(map((companies) => companies.map((company) => company.name)));
  selectedCompany: any = history.state?.company ?? null;

  departments$ = this.aiCoPilotService.department$;
  selectedDepartment: any = history.state?.department ?? null;
  
  state$ = this.aiCoPilotService.state$;
  selectedState: any = history.state?.state ?? null;

  /**
   * Aggiorna il filtro per intervallo date.
   * @param dates Date selezionate nel date-range picker.
   */
  onDateChange(dates: Date[]) {
    this.dates = dates;
    console.log('Date range changed:', this.dates);
    this.applyFilters();
  }

  /**
   * Aggiorna la ricerca testuale globale.
   * @param searchValue Testo inserito nella barra di ricerca.
   */
  onSearchChange(searchValue: string) {
    this.searchvalue = searchValue;
    console.log('Search value changed:', searchValue);
    this.applyFilters();
  }

  /**
   * Aggiorna il filtro confidence.
   * @param confidence Intervallo o valore confidence selezionato.
   */
  onConfidenceChange(confidence: string | number) {
    this.selectedconfidence = confidence;
    console.log('Selected confidence option changed:', this.selectedconfidence);
    this.applyFilters();
  }

  /**
   * Aggiorna il filtro categoria.
   * @param category Categoria selezionata.
   */
  onCategoryChange(category: string | number) {
    this.selectedCategory = category;
    console.log('Selected category option changed:', this.selectedCategory);
    this.applyFilters();
  }

  /**
   * Aggiorna il filtro stato documento.
   * @param state Stato selezionato.
   */
  onStateChange(state: string | number) {
    this.selectedState = state;
    console.log('Selected state option changed:', this.selectedState);
    this.applyFilters();
  }

  /**
   * Aggiorna il filtro azienda.
   * @param company Azienda selezionata.
   */
  onCompanyChange(company: string | number) {
    this.selectedCompany = company;
    console.log('Selected company option changed:', this.selectedCompany);
    this.applyFilters();
  }

  /**
   * Aggiorna il filtro reparto.
   * @param department Reparto selezionato.
   */
  onDepartmentChange(department: string | number) {
    this.selectedDepartment = department;
    console.log('Selected department option changed:', this.selectedDepartment);
    this.applyFilters();
  }

  /**
   * Gestisce le azioni del menu tabella (modifica/elimina).
   * @param event Riga selezionata e voce menu scelta.
   */
  onTableMenuAction(event: { row: ResultSplit; item: MenuItem }): void { 
    const action = event.item.label?.toLowerCase();
    if (action === 'modifica') {
      this.navigateToResult(event.row);
    } else if (action === 'elimina') {
      this.aiCoPilotService.deleteUploadedDocument(event.row.parentId);
    }
  }

  /**
   * Richiede il retry dell'analisi per un documento padre.
   * @param parentId Id del documento padre.
   */
  onRetryAnalysis(parentId: number): void {
    this.aiCoPilotService.retryDocumentProcessing(parentId);
  }

  /**
   * Rimuove localmente una riga e riapplica i filtri correnti.
   * @param row Riga rimossa dalla tabella.
   */
  onRowRemoved(row: ResultSplit): void {
    this.DocumentiSplittati = this.DocumentiSplittati.filter((doc) => doc.id !== row.id);
    this.applyFilters();
  }

  /**
   * Apre la pagina dettaglio per il documento selezionato.
   * @param targetRow Riga target da visualizzare.
   */
  navigateToResult(targetRow: ResultSplit): void {
    if (!targetRow) {
      return;
    }

    const pages = this.parentPageCounts[targetRow.parentId] ?? Math.max(1, targetRow.page_end - targetRow.page_start + 1);
    this.router.navigate(['/anteprima-documento'], {
      replaceUrl: true,
      state: {
        result: targetRow,
        pages,
      },
    });
  }

  /**
   * Applica tutti i filtri attivi e ricostruisce la vista nested dei documenti.
   */
  applyFilters() {
    const hasActiveFilters = Boolean(
      this.searchvalue ||
      this.selectedconfidence ||
      this.selectedCategory ||
      this.selectedState ||
      this.selectedCompany ||
      this.selectedDepartment ||
      (this.dates && this.dates[0] && this.dates[1])
    );

    const sessionDocuments = this.currentBatchParentIds.size > 0
      ? this.DocumentiSplittati.filter((doc) => this.currentBatchParentIds.has(doc.parentId))
      : this.DocumentiSplittati;

    this.DocumentiSplittatiFiltrati = sessionDocuments.filter((doc) => {
      const matchesSearch = this.matchesGlobalSearch(doc, this.searchvalue);
      const matchesDate = this.dates ? (doc.data >= this.dates[0] && doc.data <= this.dates[1]) : true;
      const matchesConfidence = this.matchesConfidenceRange(doc.confidence, this.selectedconfidence);
      const matchesCategory = this.selectedCategory ? doc.category === this.selectedCategory : true;
      const matchesState = this.selectedState ? doc.state === this.selectedState : true;
      const matchesCompany = this.selectedCompany ? doc.company === this.selectedCompany : true;
      const matchesDepartment = this.selectedDepartment ? doc.department === this.selectedDepartment : true;
      return matchesSearch && matchesDate && matchesConfidence && matchesCategory && matchesState && matchesCompany && matchesDepartment;
    });

    const fromHistory = this.buildNestedDocuments(this.DocumentiSplittatiFiltrati);
    const byParentId = new Map<number, ResultAiCopilot>();

    for (const parent of fromHistory) {
      byParentId.set(parent.id!, parent);
    }

    const batchParents = this.currentBatchParentIds.size > 0
      ? this.sessionParents.filter((p) => this.currentBatchParentIds.has(p.id!))
      : this.sessionParents;

    for (const parent of batchParents) {
      const existing = byParentId.get(parent.id!);
      if (!existing) {
        byParentId.set(parent.id!, { ...parent });
        continue;
      }

      byParentId.set(parent.id!, {
        ...existing,
        name: parent.name || existing.name,
        state: parent.state || existing.state,
      });
    }

    this.nestedDocuments = Array.from(byParentId.values()).filter((parent) => {
      if (parent.ResultSplit.length > 0) {
        return true;
      }
      return !hasActiveFilters;
    });
  }

  /**
   * Verifica se una riga soddisfa la ricerca globale testuale.
   * @param doc Documento da valutare.
   * @param rawSearch Testo di ricerca inserito.
   * @returns True se la riga matcha la ricerca.
   */
  private matchesGlobalSearch(doc: ResultSplit, rawSearch: string): boolean {
    const search = rawSearch?.trim().toLowerCase();
    if (!search) {
      return true;
    }

    const parentNameFromHistory = this.parentNames[doc.parentId] ?? '';
    const parentNameFromSession = this.sessionParents.find((parent) => parent.id === doc.parentId)?.name ?? '';

    const searchableFields = [
      doc.id,
      doc.parentId,
      parentNameFromHistory,
      parentNameFromSession,
      doc.category,
      doc.company,
      doc.department,
      doc.recipient.recipientName,
      doc.recipient.recipientCode,
      doc.recipient.recipientEmail,
      doc.state,
      doc.confidence,
      doc.month_year,
      doc.page_start,
      doc.page_end,
      doc.data,
    ];

    return searchableFields.some((value) => String(value ?? '').toLowerCase().includes(search));
  }

  /**
   * Verifica la confidence rispetto all'intervallo selezionato.
   * @param confidence Valore confidence del documento.
   * @param selectedRange Intervallo o valore selezionato nel filtro.
   * @returns True se il valore e incluso nel range richiesto.
   */
  private matchesConfidenceRange(confidence: number, selectedRange: string | number | null | undefined): boolean {
    if (selectedRange === null || selectedRange === undefined || selectedRange === '') {
      return true;
    }

    if (typeof selectedRange === 'number') {
      return confidence === selectedRange;
    }

    const match = selectedRange.match(/(\d+)\s*-\s*(\d+)/);
    if (!match) {
      return true;
    }

    const min = Number(match[1]);
    const max = Number(match[2]);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return true;
    }

    return confidence >= min && confidence <= max;
  }

  /**
   * Converte lo stato dello split nello stato usato dal documento padre.
   * @param state Stato dello split.
   * @returns Stato documento equivalente per la vista nested.
   */
  private mapSplitStateToDocumentState(state: State): DocumentState {
    switch (state) {
      case State.Inviato:
        return DocumentState.Completato;
      case State.InElaborazione:
        return DocumentState.InElaborazione;
      case State.DaValidare:
        return DocumentState.InElaborazione;
      case State.Programmato:
        return DocumentState.Completato;
      case State.Pronto:
      default:
        return DocumentState.Completato;
    }
  }

  /**
   * Raggruppa gli split per parentId e costruisce la struttura nested.
   * @param rows Righe filtrate da aggregare.
   * @returns Lista di documenti padre con figli associati.
   */
  private buildNestedDocuments(rows: ResultSplit[]): ResultAiCopilot[] {
    const groups = new Map<number, ResultSplit[]>();

    for (const row of rows) {
      const bucket = groups.get(row.parentId) ?? [];
      bucket.push(row);
      groups.set(row.parentId, bucket);
    }

    return Array.from(groups.entries()).map(([parentId, children]) => {
      const first = children[0];
      const minPage = Math.min(...children.map((child) => child.page_start));
      const maxPage = Math.max(...children.map((child) => child.page_end));
      const parentName = this.parentNames[parentId];
      const parentPages = this.parentPageCounts[parentId] ?? (maxPage - minPage + 1);

      return {
        id: parentId,
        name: `${parentName}`,
        ResultSplit: children,
        pages: parentPages,
        state: this.mapSplitStateToDocumentState(first.state),
      };
    });
  }

  /**
   * Inizializza i filtri, le subscription ai subject del service e il menu tabella.
   */
  ngOnInit() {
    this.aiCoPilotService.fetchCategories();
    this.aiCoPilotService.fetchCompanies();
    this.aiCoPilotService.fetchDepartment();
    this.aiCoPilotService.fetchConfidence();
    this.aiCoPilotService.fetchState();
    this.aiCoPilotService.currentResultsHistory$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((results) => {
        this.DocumentiSplittati = [...(results ?? [])];
        this.applyFilters();
      });

    this.aiCoPilotService.currentSessionParents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((parents) => {
        this.sessionParents = [...parents];
        this.applyFilters();
      });

    this.aiCoPilotService.currentBatchParentIds$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ids: Set<number>) => {
        this.currentBatchParentIds = ids;
        this.applyFilters();
      });

    this.aiCoPilotService.currentParentNames$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((names) => {
        this.parentNames = { ...names };
        this.applyFilters();
      });

    this.aiCoPilotService.currentParentPageCounts$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pageCounts) => {
        this.parentPageCounts = { ...pageCounts };
        this.applyFilters();
      });
    
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


  }
columns = [
  { field: 'id', header: 'ID' },
  { field: 'confidence', header: 'Confidenza' },
  { field: 'recipient', header: 'Destinatario' },
  { field: 'state', header: 'Stato' },
  { field: 'department', header: 'Reparto' },
  { field: 'company', header: 'Azienda' },
  { field: 'category', header: 'Categoria' },
  { field: 'data', header: 'Data Documento', type: 'date' },
];

}
