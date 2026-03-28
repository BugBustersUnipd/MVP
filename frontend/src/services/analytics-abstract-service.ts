import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface AnalyticsMetric {
  label: string;
  value: number | string;
}

export interface AnalyticsPeriod {
  startDate?: Date;
  endDate?: Date;
  periodoKey?: string; // 'sempre', 'questoMese', 'ultimeSettimane', etc
}

@Injectable({
  providedIn: 'root',
})
export abstract class AnalyticsAbstractService {
  abstract getAnalysis(periodo: AnalyticsPeriod): Observable<AnalyticsMetric[]>;
}
