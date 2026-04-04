import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { Tables } from '../components/tables/tables';
import { Filters } from "../components/filters/filters";
import { MenuItem, MessageService } from 'primeng/api';
import { Button } from '../components/button/button';
import { Router } from '@angular/router';
import { AiAssistantService } from '../../services/ai-assistant-service/ai-assistant-service';
import { ResultAiAssistant } from '../shared/models/result-ai-assistant.model';
import { Tone, Style, Company } from '../shared/models/result-ai-assistant.model';
@Component({
  selector: 'app-storico-ai-assistant',
  imports: [CommonModule, FormsModule, Tables, Filters, Button],
  providers: [MessageService],
  templateUrl: './storico-ai-assistant.html',
  styleUrl: './storico-ai-assistant.css',
})
export class StoricoAiAssistant {
  private router = inject(Router);
  private aiService = inject(AiAssistantService);
  private destroyRef = inject(DestroyRef);


  Generazioni: ResultAiAssistant[] = [];
  private generazioniFiltrateSubject = new BehaviorSubject<ResultAiAssistant[]>([]);
  GenerazioniFiltrate$ = this.generazioniFiltrateSubject.asObservable();
  items: MenuItem[] = [];
  dates: Date[] | undefined;
  tonoOptions: Tone[] = [];
  stileOptions: Style[] = [];
  companiesOptions: Company[] = [];
  selectedTono: number | string | undefined; 
  selectedStile: number | string | undefined;
  selectedCompany: number | string | undefined;
  searchvalue: string ='';
  columns = [
    { field: 'title', header: 'Titolo' },
    { field: 'prompt', header: 'Prompt' },
    { field: 'tone', header: 'Tono' },
    { field: 'style', header: 'Stile' },
    { field: 'data', header: 'Data', type: 'date' },
    { field: 'content', header: 'Risultato parziale' },
    { field: 'evaluation', header: 'Valutazione', type: 'rating' }
  ];

  /**
   * Inizializza opzioni filtri, menu azioni e sincronizzazione con lo storico dal service.
   */
  ngOnInit () {

    // Prima fetchCompanies, poi fetchAllTones e fetchAllStyles solo dopo che companies$ ha emesso
    this.aiService.fetchCompanies();
    this.aiService.companies$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((companies) => {
        this.companiesOptions = (companies ?? []).map(c => ({ id: c.id, name: c.name }));
        // Solo dopo aver ricevuto le companies, fetch di tones e styles
        this.aiService.fetchAllTones();
        this.aiService.fetchAllStyles();
      });

    this.aiService.allTones$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tones) => {
        this.tonoOptions = (tones ?? []).map(t => ({ id: t.id, name: t.name, isActive: t.isActive }));
      });

    this.aiService.allStyles$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((styles) => {
        this.stileOptions = (styles ?? []).map(s => ({ id: s.id, name: s.name, isActive: s.isActive }));
      });

    this.aiService.companies$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((companies) => {
        this.companiesOptions = (companies ?? []).map(c => ({ id: c.id, name: c.name }));
      });

    this.items = [
      {
        items: [
          { label: 'Duplica', icon: 'pi pi-pencil' },
          { label: 'Riutilizza', icon: 'pi pi-clone' },
          { label: 'Elimina', icon: 'pi pi-trash' }
        ]
      }
    ];

    this.aiService.fetchResultsHistory();
    this.aiService.currentResultsHistory$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((results) => {
        this.Generazioni = results ?? [];
        this.applyFilters();
      });
  }

  /**
   * Naviga alla pagina generatore.
   */
  NavigateToGeneratore(){
    this.router.navigate(['/generatore']);
  }

  /**
   * Apre il dettaglio di una generazione selezionata.
   * @param result Risultato da visualizzare.
   */
  openGenerationResult(result: ResultAiAssistant): void {
    this.aiService.setCurrentResult(result);
    this.router.navigate(['/risultato-generazione']);
  }

  /**
   * Gestisce le azioni contestuali dello storico (elimina, riutilizza, duplica).
   * @param event Riga selezionata e voce menu scelta.
   */
  onMenuAction(event: { row: ResultAiAssistant; item: MenuItem }): void {
    const row = event?.row;
    const action = event?.item?.label?.toLowerCase();
    if (!row || !action) return;

    if (action === 'elimina') {
      const id = Number(row.id) || 0;
      if (id > 0) {
        this.aiService.deletePost(id);
      }
      return;
    }

    if (action === 'riutilizza') {
      this.aiService.reuse(row.tone, row.style, row.company, row.prompt);
      this.router.navigate(['/risultato-generazione']);
      return;
    }

    if (action === 'duplica') {
      this.router.navigate(['/generatore'], {
        state: {
          tone: row.tone,
          style: row.style,
          company: row.company,
          prompt: row.prompt
        }
      });
    }
  }

  /**
   * Aggiorna la ricerca testuale e riapplica i filtri.
   * @param value Testo di ricerca.
   */
  onSearchChange(value:string){
    this.searchvalue = value;
    this.applyFilters();
  }

  /**
   * Aggiorna il filtro per intervallo date.
   * @param dates Date selezionate.
   */
  onDateChange(dates: Date[]) {
    this.dates = dates;
    this.applyFilters();
  }

  /**
   * Aggiorna il filtro tono.
   * @param tono Tono selezionato.
   */
  onTonoChange(tono: number | string) {
    this.selectedTono = tono;
    this.applyFilters();
  }

  /**
   * Aggiorna il filtro stile.
   * @param stile Stile selezionato.
   */
  onStileChange(stile: number | string) {
    this.selectedStile = stile;
    this.applyFilters();
  }

  /**
   * Applica filtri correnti (ricerca, data, tono, stile, azienda) e pubblica le righe filtrate.
   */
  applyFilters() {
    const rawSearch = (this.searchvalue ?? '').trim().toLowerCase();
    const normalizedSearch = this.normalizeForSearch(rawSearch);
    const hasSearch = rawSearch.length > 0;

    const filtrate = this.Generazioni.filter(g => {
      const titleForSearch = this.normalizeForSearch(g.title);
      const contentForSearch = this.normalizeForSearch(g.content);
      const promptForSearch = this.normalizeForSearch(g.prompt);

      const matchSearch = !hasSearch
        ? true
        : (normalizedSearch.length > 0 && (
            titleForSearch.includes(normalizedSearch) ||
            promptForSearch.includes(normalizedSearch) ||
            g.tone.name.toLowerCase().includes(normalizedSearch) ||
            g.style.name.toLowerCase().includes(normalizedSearch) ||
            contentForSearch.includes(normalizedSearch)
          ));

      const selectedToneName = typeof this.selectedTono === 'number'
        ? this.tonoOptions.find((t) => t.id === this.selectedTono)?.name
        : this.selectedTono;
      const selectedStyleName = typeof this.selectedStile === 'number'
        ? this.stileOptions.find((s) => s.id === this.selectedStile)?.name
        : this.selectedStile;
      const selectedCompanyName = typeof this.selectedCompany === 'number'
        ? this.companiesOptions.find((c) => c.id === this.selectedCompany)?.name
        : this.selectedCompany;

      const matchTono = !selectedToneName || selectedToneName === g.tone.name;
      const matchStile = !selectedStyleName || selectedStyleName === g.style.name;
      const matchCompany = !selectedCompanyName || selectedCompanyName === g.company.name;

      const matchDate = this.isInSelectedDateRange(g.data);

      return matchTono && matchStile && matchCompany && matchDate && matchSearch;
    });

    this.generazioniFiltrateSubject.next(filtrate);
  }

  /**
   * Normalizza testo per confronti di ricerca (rimuove HTML e compatta spazi), non modifica i dati originali mostrati nell'editor.
   * @param value Testo da normalizzare.
   * @returns Testo normalizzato in lowercase.
   */
  private normalizeForSearch(value: string | null | undefined): string {
    const input = (value ?? '').toString();
    return input
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * Verifica se una data ricade nell'intervallo selezionato.
   * @param value Data del record.
   * @returns True se la data e nel range attivo.
   */
  private isInSelectedDateRange(value: Date | string | undefined): boolean {
    if (!this.dates || this.dates.length === 0) return true;

    const itemDate = this.toDate(value);
    if (!itemDate) return false;

    const start = this.startOfDay(this.dates[0]);
    const end = this.dates.length > 1 && this.dates[1]
      ? this.endOfDay(this.dates[1])
      : this.endOfDay(this.dates[0]);

    return itemDate >= start && itemDate <= end;
  }

  /**
   * Converte un valore date/string in oggetto Date valido.
   * @param value Valore data da convertire.
   * @returns Date valida o null.
   */
  private toDate(value: Date | string | undefined): Date | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Restituisce l'inizio giornata della data specificata.
   * @param d Data di riferimento.
   * @returns Data normalizzata alle 00:00:00.000.
   */
  private startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  /**
   * Restituisce la fine giornata della data specificata.
   * @param d Data di riferimento.
   * @returns Data normalizzata alle 23:59:59.999.
   */
  private endOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  /**
   * Aggiorna il filtro azienda.
   * @param company Azienda selezionata.
   */
  onCompanyChange(company: number | string) {
    this.selectedCompany = company;
    this.applyFilters();
  }
}