import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AnalyticsAbstractService, AnalyticsMetric, AnalyticsPeriod } from '../analytics-abstract-service'

export interface AiCoPilotAnalyticsResponse {
  status: string;
  data: {
    average_confidence: number;
    average_human_intervention: number;
    mapping_accuracy: number;
    average_time_analyses: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AiCoPilotAnalyticsService extends AnalyticsAbstractService {
  private apiUrl = '/api/analytics/ai-copilot'; // TODO: configurare endpoint vero
  private readonly metricsSubject = new BehaviorSubject<AnalyticsMetric[]>([]);

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

  private transformToMetrics(response: AiCoPilotAnalyticsResponse): AnalyticsMetric[] {
    const data = response.data;

    return [
      { label: 'PERCENTUALE CONFIDENZA MEDIA', value: (data.average_confidence ?? 0) + '%' },
      { label: 'PERCENTUALE HUMAN-IN-THE-LOOP', value: (data.average_human_intervention ?? 0) + '%' },
      { label: 'ACCURATEZZA MAPPING', value: (data.mapping_accuracy ?? 0) + '%' },
      { label: 'TEMPI MEDI ANALISI', value: (data.average_time_analyses ?? 0) + 's' },
    ];
  }
}
