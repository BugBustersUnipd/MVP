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
  /**
   * Recupera le metriche analytics per il periodo richiesto.
   * @param periodo Intervallo temporale da applicare alla query analytics.
   * @returns Stream di metriche pronte per la visualizzazione.
   */
  abstract getAnalysis(periodo: AnalyticsPeriod): Observable<AnalyticsMetric[]>;
}
