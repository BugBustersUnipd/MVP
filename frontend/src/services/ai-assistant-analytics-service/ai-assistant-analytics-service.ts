import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AnalyticsAbstractService, AnalyticsMetric, AnalyticsPeriod } from '../analytics-abstract-service'

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
  private apiUrl = '/ai_generator_data_analyst';
  private readonly metricsSubject = new BehaviorSubject<AnalyticsMetric[]>([]);

  constructor(private httpClient: HttpClient) {
    super();
  }

  getAnalysis(periodo: AnalyticsPeriod): Observable<AnalyticsMetric[]> {
    let params: any = {};

    if (periodo.startDate) {
      params.start_date = periodo.startDate;
    }
    if (periodo.endDate) {
      params.end_date = periodo.endDate;
    }

    this.httpClient
      .get<AiAssistantAnalyticsResponse>(this.apiUrl, { params })
      .pipe(
        map((response) => this.transformToMetrics(response)),
        catchError(() => of([] as AnalyticsMetric[])),
      )
      .subscribe((metrics) => this.metricsSubject.next(metrics));

    return this.metricsSubject.asObservable();
  }

  private transformToMetrics(response: AiAssistantAnalyticsResponse): AnalyticsMetric[] {
    const data = response.data;

    return [
      { label: 'N. PROMPT GENERATI', value: data.prompt_amount ?? 0 },
      { label: 'RATING MEDIO PROMPT', value: data.average_rate_prompt ?? 0 },
      { label: 'N. RIGENERAZIONI MEDIE PER PROMPT', value: data.average_regeneration_amount ?? 0 },
    ];
  }
}
