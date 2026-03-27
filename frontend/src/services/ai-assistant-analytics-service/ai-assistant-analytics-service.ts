import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AnalyticsAbstractService, AnalyticsMetric, AnalyticsPeriod } from '../analytics-abstract-service'

export interface AiAssistantAnalyticsResponse {
  promptsGenerati: number;
  ratingMedioPrompt: number;
  rigenerazioniMedie: number;
  toniPiuUsati: { tono: string; count: number }[];
  stiliPiuUsati: { stile: string; count: number }[];
}

@Injectable({
  providedIn: 'root',
})
export class AiAssistantAnalyticsService extends AnalyticsAbstractService {
  private apiUrl = '/api/analytics/ai-assistant'; // TODO: configurare endpoint vero
  private readonly metricsSubject = new BehaviorSubject<AnalyticsMetric[]>([]);
  private readonly toniSubject = new BehaviorSubject<{ tono: string; count: number }[]>([]);
  private readonly stiliSubject = new BehaviorSubject<{ stile: string; count: number }[]>([]);

  constructor(private httpClient: HttpClient) {
    super();
  }

  getAnalysis(periodo: AnalyticsPeriod): Observable<AnalyticsMetric[]> {
    this.httpClient
      .post<AiAssistantAnalyticsResponse>(`${this.apiUrl}/metrics`, periodo)
      .pipe(
        map((response) => this.transformToMetrics(response)),
        catchError(() => of([] as AnalyticsMetric[])),
      )
      .subscribe((metrics) => this.metricsSubject.next(metrics));

    return this.metricsSubject.asObservable();
  }

  getToniPiuUsati(periodo: AnalyticsPeriod): Observable<{ tono: string; count: number }[]> {
    this.httpClient
      .post<{ data: { tono: string; count: number }[] }>(`${this.apiUrl}/toni`, periodo)
      .pipe(
        map((response) => response.data ?? []),
        catchError(() => of([] as { tono: string; count: number }[])),
      )
      .subscribe((toni) => this.toniSubject.next(toni));

    return this.toniSubject.asObservable();
  }

  getStiliPiuUsati(periodo: AnalyticsPeriod): Observable<{ stile: string; count: number }[]> {
    this.httpClient
      .post<{ data: { stile: string; count: number }[] }>(`${this.apiUrl}/stili`, periodo)
      .pipe(
        map((response) => response.data ?? []),
        catchError(() => of([] as { stile: string; count: number }[])),
      )
      .subscribe((stili) => this.stiliSubject.next(stili));

    return this.stiliSubject.asObservable();
  }

  private transformToMetrics(response: AiAssistantAnalyticsResponse): AnalyticsMetric[] {
    return [
      { label: 'N. PROMPT GENERATI', value: response.promptsGenerati },
      { label: 'RATING MEDIO PROMPT', value: response.ratingMedioPrompt },
      { label: 'N. RIGENERAZIONI MEDIE PER PROMPT', value: response.rigenerazioniMedie },
    ];
  }
}
