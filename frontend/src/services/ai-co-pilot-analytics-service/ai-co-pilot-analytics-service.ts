import { Injectable, inject } from '@angular/core';
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
  private apiUrl = 'http://localhost:3000/ai_copilot_data_analyst';
  private readonly metricsSubject = new BehaviorSubject<AnalyticsMetric[]>([]);

  private httpClient = inject(HttpClient);

  getAnalysis(periodo: AnalyticsPeriod): Observable<AnalyticsMetric[]> {
    let params: any = {};

    if (periodo.startDate) {
      params.start_date = this.toStartOfDayIso(periodo.startDate);
    }
    if (periodo.endDate) {
      params.end_date = this.toEndOfDayIso(periodo.endDate);
    }

    this.httpClient
      .get<AiCoPilotAnalyticsResponse>(this.apiUrl, { params })
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
      { label: 'PERCENTUALE CONFIDENZA MEDIA', value: (data.average_confidence ?? 0) * 100 + '%' },
      { label: 'PERCENTUALE HUMAN-IN-THE-LOOP', value: (data.average_human_intervention ?? 0) + '%' },
      { label: 'ACCURATEZZA MAPPING', value: (data.mapping_accuracy ?? 0) + '%' },
      { label: 'TEMPI MEDI ANALISI', value: (data.average_time_analyses ?? 0) + 's' },
    ];
  }

  private toStartOfDayIso(date: Date): string {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized.toISOString();
  }

  private toEndOfDayIso(date: Date): string {
    const normalized = new Date(date);
    normalized.setHours(23, 59, 59, 999);
    return normalized.toISOString();
  }
}
