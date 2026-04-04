import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AnalyticsAbstractService, AnalyticsMetric, AnalyticsPeriod } from '../analytics-abstract-service'

export interface AnalyticsChartData {
  labels: string[];
  values: number[];
}

export interface AiAssistantAnalyticsResponse {
  status: string;
  data: {
    prompt_amount: number;
    average_rate_prompt: number;
    average_regeneration_amount: number;
    tone_usage: Record<string, number>;
    style_usage: Record<string, number>;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AiAssistantAnalyticsService extends AnalyticsAbstractService {
  private apiUrl = 'http://localhost:3000/ai_generator_data_analyst';
  private readonly metricsSubject = new BehaviorSubject<AnalyticsMetric[]>([]);
  private readonly toneUsageChartSubject = new BehaviorSubject<AnalyticsChartData>({ labels: [], values: [] });
  private readonly styleUsageChartSubject = new BehaviorSubject<AnalyticsChartData>({ labels: [], values: [] });

  constructor(private httpClient: HttpClient) {
    super();
  }

  /**
   * Recupera le metriche analytics per il periodo richiesto e aggiorna gli stream locali.
   * @param periodo Intervallo temporale per il filtro delle metriche.
   * @returns Observable con la lista aggiornata di metriche.
   */
  getAnalysis(periodo: AnalyticsPeriod): Observable<AnalyticsMetric[]> {
    let params: any = {};

    if (periodo.startDate) {
      params.start_date = this.toStartOfDayIso(periodo.startDate);
    }
    if (periodo.endDate) {
      params.end_date = this.toEndOfDayIso(periodo.endDate);
    }

    this.httpClient
      .get<AiAssistantAnalyticsResponse>(this.apiUrl, { params })
      .pipe(
        map((response) => {
          this.toneUsageChartSubject.next(this.transformUsageToChart(response.data.tone_usage));
          this.styleUsageChartSubject.next(this.transformUsageToChart(response.data.style_usage));
          return this.transformToMetrics(response);
        }),
        catchError(() => {
          this.toneUsageChartSubject.next({ labels: [], values: [] });
          this.styleUsageChartSubject.next({ labels: [], values: [] });
          return of([] as AnalyticsMetric[]);
        }),
      )
      .subscribe((metrics) => this.metricsSubject.next(metrics));

    return this.metricsSubject.asObservable();
  }

  /**
   * Espone i dati del grafico di utilizzo dei toni.
   * @returns Observable con etichette e valori del grafico toni.
   */
  getToneUsageChart(): Observable<AnalyticsChartData> {
    return this.toneUsageChartSubject.asObservable();
  }

  /**
   * Espone i dati del grafico di utilizzo degli stili.
   * @returns Observable con etichette e valori del grafico stili.
   */
  getStyleUsageChart(): Observable<AnalyticsChartData> {
    return this.styleUsageChartSubject.asObservable();
  }

  /**
   * Converte la risposta backend nella lista di metriche da mostrare in UI.
   * @param response Payload analytics del backend.
   * @returns Collezione normalizzata di metriche.
   */
  private transformToMetrics(response: AiAssistantAnalyticsResponse): AnalyticsMetric[] {
    const data = response.data;

    return [
      { label: 'N. PROMPT GENERATI', value: data.prompt_amount ?? 0 },
      { label: 'RATING MEDIO PROMPT', value: data.average_rate_prompt ?? 0 },
      { label: 'N. RIGENERAZIONI MEDIE PER PROMPT', value: data.average_regeneration_amount ?? 0 },
    ];
  }

  /**
   * Converte una mappa key-value in struttura adatta ai grafici.
   * @param usage Mappa con voce e quantita.
   * @returns Dati chart con labels e values ordinati per inserimento.
   */
  private transformUsageToChart(usage: Record<string, number>): AnalyticsChartData {
    const entries = Object.entries(usage ?? {});

    return {
      labels: entries.map(([key]) => key),
      values: entries.map(([, value]) => value ?? 0),
    };
  }

  /**
   * Normalizza una data all'inizio del giorno in formato ISO.
   * @param date Data di input.
   * @returns Timestamp ISO alle 00:00:00.000.
   */
  private toStartOfDayIso(date: Date): string {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized.toISOString();
  }

  /**
   * Normalizza una data alla fine del giorno in formato ISO.
   * @param date Data di input.
   * @returns Timestamp ISO alle 23:59:59.999.
   */
  private toEndOfDayIso(date: Date): string {
    const normalized = new Date(date);
    normalized.setHours(23, 59, 59, 999);
    return normalized.toISOString();
  }
}
