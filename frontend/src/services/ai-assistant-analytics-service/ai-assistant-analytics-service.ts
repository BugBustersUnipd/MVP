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
  private apiUrl = '/ai_generator_data_analyst';
  private readonly metricsSubject = new BehaviorSubject<AnalyticsMetric[]>([]);
  private readonly toneUsageChartSubject = new BehaviorSubject<AnalyticsChartData>({ labels: [], values: [] });
  private readonly styleUsageChartSubject = new BehaviorSubject<AnalyticsChartData>({ labels: [], values: [] });

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

  getToneUsageChart(): Observable<AnalyticsChartData> {
    return this.toneUsageChartSubject.asObservable();
  }

  getStyleUsageChart(): Observable<AnalyticsChartData> {
    return this.styleUsageChartSubject.asObservable();
  }

  private transformToMetrics(response: AiAssistantAnalyticsResponse): AnalyticsMetric[] {
    const data = response.data;

    return [
      { label: 'N. PROMPT GENERATI', value: data.prompt_amount ?? 0 },
      { label: 'RATING MEDIO PROMPT', value: data.average_rate_prompt ?? 0 },
      { label: 'N. RIGENERAZIONI MEDIE PER PROMPT', value: data.average_regeneration_amount ?? 0 },
    ];
  }

  private transformUsageToChart(usage: Record<string, number>): AnalyticsChartData {
    const entries = Object.entries(usage ?? {});

    return {
      labels: entries.map(([key]) => key),
      values: entries.map(([, value]) => value ?? 0),
    };
  }
}
