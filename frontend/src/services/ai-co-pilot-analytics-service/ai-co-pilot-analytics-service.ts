import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AnalyticsAbstractService, AnalyticsMetric, AnalyticsPeriod } from '../analytics-abstract-service'

export interface AiCoPilotAnalyticsResponse {
  confidenzaMedia: number; // percentuale 0-100
  humanInTheLoopPercentuale: number; // percentuale 0-100
  accuratezzaMapping: number; // percentuale 0-100
  tempiMediAnalisiSecondi: number;
}

@Injectable({
  providedIn: 'root',
})
export class AiCoPilotAnalyticsService extends AnalyticsAbstractService {
  private apiUrl = '/api/analytics/ai-copilot'; // TODO: configurare endpoint vero
  private readonly metricsSubject = new BehaviorSubject<AnalyticsMetric[]>([]);
  private readonly confidenzaSubject = new BehaviorSubject<number>(0);
  private readonly humanInTheLoopSubject = new BehaviorSubject<number>(0);
  private readonly accuratezzaSubject = new BehaviorSubject<number>(0);
  private readonly tempiMediSubject = new BehaviorSubject<number>(0);

  constructor(private httpClient: HttpClient) {
    super();
  }

  getAnalysis(periodo: AnalyticsPeriod): Observable<AnalyticsMetric[]> {
    this.httpClient
      .post<AiCoPilotAnalyticsResponse>(`${this.apiUrl}/metrics`, periodo)
      .pipe(
        map((response) => this.transformToMetrics(response)),
        catchError(() => of([] as AnalyticsMetric[])),
      )
      .subscribe((metrics) => this.metricsSubject.next(metrics));

    return this.metricsSubject.asObservable();
  }

  getConfidenzaMedia(periodo: AnalyticsPeriod): Observable<number> {
    this.httpClient
      .post<{ confidenzaMedia: number }>(`${this.apiUrl}/confidenza`, periodo)
      .pipe(
        map((response) => response.confidenzaMedia ?? 0),
        catchError(() => of(0)),
      )
      .subscribe((value) => this.confidenzaSubject.next(value));

    return this.confidenzaSubject.asObservable();
  }

  getHumanInTheLoopPercentuale(periodo: AnalyticsPeriod): Observable<number> {
    this.httpClient
      .post<{ percentage: number }>(`${this.apiUrl}/human-in-the-loop`, periodo)
      .pipe(
        map((response) => response.percentage ?? 0),
        catchError(() => of(0)),
      )
      .subscribe((value) => this.humanInTheLoopSubject.next(value));

    return this.humanInTheLoopSubject.asObservable();
  }

  getAccuratezzaMapping(periodo: AnalyticsPeriod): Observable<number> {
    this.httpClient
      .post<{ accuratezza: number }>(`${this.apiUrl}/accuratezza-mapping`, periodo)
      .pipe(
        map((response) => response.accuratezza ?? 0),
        catchError(() => of(0)),
      )
      .subscribe((value) => this.accuratezzaSubject.next(value));

    return this.accuratezzaSubject.asObservable();
  }

  getTempiMediAnalisi(periodo: AnalyticsPeriod): Observable<number> {
    this.httpClient
      .post<{ tempi: number }>(`${this.apiUrl}/tempi-medi`, periodo)
      .pipe(
        map((response) => response.tempi ?? 0),
        catchError(() => of(0)),
      )
      .subscribe((value) => this.tempiMediSubject.next(value));

    return this.tempiMediSubject.asObservable();
  }

  private transformToMetrics(response: AiCoPilotAnalyticsResponse): AnalyticsMetric[] {
    return [
      { label: 'PERCENTUALE CONFIDENZA MEDIA', value: response.confidenzaMedia + '%' },
      { label: 'PERCENTUALE HUMAN-IN-THE-LOOP', value: response.humanInTheLoopPercentuale + '%' },
      { label: 'ACCURATEZZA MAPPING', value: response.accuratezzaMapping + '%' },
      { label: 'TEMPI MEDI ANALISI', value: response.tempiMediAnalisiSecondi + 's' },
    ];
  }
}
