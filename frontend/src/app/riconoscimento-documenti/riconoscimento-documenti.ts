import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NestedTables } from '../components/nested-tables/nested-tables';
import { Filters } from '../components/filters/filters';
import { AsyncPipe } from '@angular/common';
import { map, of } from 'rxjs';

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
  items: MenuItem[] = [];

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

  onDateChange(dates: Date[]) {
    this.dates = dates;
    console.log('Date range changed:', this.dates);
    this.applyFilters();
  }
  onSearchChange(searchValue: string) {
    this.searchvalue = searchValue;
    console.log('Search value changed:', searchValue);
    this.applyFilters();
  }
  onConfidenceChange(confidence: string | number) {
    this.selectedconfidence = confidence;
    console.log('Selected confidence option changed:', this.selectedconfidence);
    this.applyFilters();
  }
  onCategoryChange(category: string | number) {
    this.selectedCategory = category;
    console.log('Selected category option changed:', this.selectedCategory);
    this.applyFilters();
  }
  onStateChange(state: string | number) {
    this.selectedState = state;
    console.log('Selected state option changed:', this.selectedState);
    this.applyFilters();
  }
  onCompanyChange(company: string | number) {
    this.selectedCompany = company;
    console.log('Selected company option changed:', this.selectedCompany);
    this.applyFilters();
  }
  onDepartmentChange(department: string | number) {
    this.selectedDepartment = department;
    console.log('Selected department option changed:', this.selectedDepartment);
    this.applyFilters();
  }

  applyFilters() {
    this.DocumentiSplittatiFiltrati = this.DocumentiSplittati.filter((doc) => {
      const matchesSearch = this.searchvalue ? doc.name.toLowerCase().includes(this.searchvalue.toLowerCase()) : true;
      const matchesDate = this.dates ? (doc.data >= this.dates[0] && doc.data <= this.dates[1]) : true;
      const matchesConfidence = this.selectedconfidence ? doc.confidence === this.selectedconfidence : true;
      const matchesCategory = this.selectedCategory ? doc.category === this.selectedCategory : true;
      const matchesState = this.selectedState ? doc.state === this.selectedState : true;
      const matchesCompany = this.selectedCompany ? doc.company === this.selectedCompany : true;
      const matchesDepartment = this.selectedDepartment ? doc.department === this.selectedDepartment : true;
      return matchesSearch && matchesDate && matchesConfidence && matchesCategory && matchesState && matchesCompany && matchesDepartment;
    });
    this.nestedDocuments = this.buildNestedDocuments(this.DocumentiSplittatiFiltrati);
  }

  private mapSplitStateToDocumentState(state: State): DocumentState {
    switch (state) {
      case State.Inviato:
        return DocumentState.Completato;
      case State.DaValidare:
        return DocumentState.InElaborazione;
      case State.Programmato:
        return DocumentState.InCoda;
      case State.Pronto:
      default:
        return DocumentState.Completato;
    }
  }

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

      return {
        id: parentId,
        name: `${first.name}`,
        ResultSplit: children,
        pages: maxPage - minPage + 1,
        state: this.mapSplitStateToDocumentState(first.state),
      };
    });
  }

  ngOnInit() {
    this.aiCoPilotService.fetchHistoryResults();
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
  { field: 'recipientName', header: 'Destinatario' },
  { field: 'state', header: 'Stato' },
  { field: 'department', header: 'Reparto' },
  { field: 'company', header: 'Azienda' },
  { field: 'category', header: 'Categoria' },
  { field: 'data', header: 'Data Documento', type: 'date' },
];

}
