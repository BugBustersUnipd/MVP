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
import { Tone, Style } from '../shared/models/result-ai-assistant.model';
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

  ButtonLabel: string ='Aggiungi';
  Generazioni: ResultAiAssistant[] = [];
  private generazioniFiltrateSubject = new BehaviorSubject<ResultAiAssistant[]>([]);
  GenerazioniFiltrate$ = this.generazioniFiltrateSubject.asObservable();
  items: MenuItem[] = [];
  dates: Date[] | undefined;
  tonoOptions: Tone[] = [];
  stileOptions: Style[] = [];
  selectedTono: number | string | undefined; 
  selectedStile: number | string | undefined;
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

  ngOnInit () {
    this.aiService.fetchTonesByCompany(1);
    this.aiService.fetchStylesByCompany(1);

    this.aiService.tones$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tones) => {
        this.tonoOptions = (tones ?? []).map(t => ({ id: t.id, name: t.name }));
      });

    this.aiService.styles$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((styles) => {
        this.stileOptions = (styles ?? []).map(s => ({ id: s.id, name: s.name }));
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

  NavigateToGeneratore(){
    this.router.navigate(['/generatore']);
  }

  openGenerationResult(result: ResultAiAssistant): void {
    this.aiService.setCurrentResult(result);
    this.router.navigate(['/risultato-generazione'], {
      state: { result }
    });
  }

  onSearchChange(value:string){
    this.searchvalue = value;
    this.applyFilters();
  }

  onDateChange(dates: Date[]) {
    this.dates = dates;
    this.applyFilters();
  }

  onTonoChange(tono: number | string) {
    this.selectedTono = tono;
    this.applyFilters();
  }

  onStileChange(stile: number | string) {
    this.selectedStile = stile;
    this.applyFilters();
  }

  applyFilters() {
    const filtrate = this.Generazioni.filter(g => {
      const matchSearch =
        !this.searchvalue ||
        g.prompt.toLowerCase().includes(this.searchvalue.toLowerCase()) ||
        g.tone.name.toLowerCase().includes(this.searchvalue.toLowerCase()) ||
        g.style.name.toLowerCase().includes(this.searchvalue.toLowerCase()) ||
        g.content.toLowerCase().includes(this.searchvalue.toLowerCase());

      const selectedToneName = typeof this.selectedTono === 'number'
        ? this.tonoOptions.find((t) => t.id === this.selectedTono)?.name
        : this.selectedTono;
      const selectedStyleName = typeof this.selectedStile === 'number'
        ? this.stileOptions.find((s) => s.id === this.selectedStile)?.name
        : this.selectedStile;

      const matchTono = !selectedToneName || selectedToneName === g.tone.name;
      const matchStile = !selectedStyleName || selectedStyleName === g.style.name;

      const matchDate = this.isInSelectedDateRange(g.data);

      return matchTono && matchStile && matchDate && matchSearch;
    });

    this.generazioniFiltrateSubject.next(filtrate);
  }

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

  private toDate(value: Date | string | undefined): Date | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  private startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  private endOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }
}