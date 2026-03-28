import { Component, OnInit } from '@angular/core';
import { AnalyticsCharts } from '../components/analytics-charts/analytics-charts';
import { AccordionModule } from 'primeng/accordion'
import { CardModule } from 'primeng/card'

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

import { DateRangePicker } from '../components/date-range-picker/date-range-picker';
import { AnalyticsMetric, AnalyticsPeriod } from '../../services/analytics-abstract-service';
import { AiAssistantAnalyticsService } from '../../services/ai-assistant-analytics-service/ai-assistant-analytics-service';
import { AiCoPilotAnalyticsService } from '../../services/ai-co-pilot-analytics-service/ai-co-pilot-analytics-service';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [AnalyticsCharts, AccordionModule, CardModule, FormsModule, DateRangePicker, CommonModule],
  templateUrl: './analytics-dashboard.html',
  styleUrls: ['./analytics-dashboard.css'],
})
export class AnalyticsDashboard implements OnInit {
  
  periodoOptions = [
    { name: 'Sempre' },
    { name: 'Questo mese' },
    { name: 'Ultime 2 settimane' },
    { name: 'Ultimi 3 mesi' },
    { name: 'Ultimo anno' },
  ];

  // Observable per i dati analytics
  aiAssistantMetrics$: Observable<AnalyticsMetric[]>;
  aiCoPilotMetrics$: Observable<AnalyticsMetric[]>;
  
  // Dati fallback hardcoded
  AiAssistantData = [
    { label: 'N. PROMPT GENERATI', value: 145 },
    { label: 'RATING MEDIO PROMPT', value: 1.7 },
    { label: 'N. RIGENERAZIONI MEDIE PER PROMPT', value: 0.4 }
  ];
  AiCoPilotData = [
    { label: 'PERCENTUALE CONFIDENZA MEDIA', value: 71+"%" },
    { label: 'PERCENTUALE HUMAN-IN-THE-LOOP', value: 2+"%" },
    { label: 'ACCURATEZZA MAPPING', value: 56+"%" },
    { label: 'TEMPI MEDI ANALISI', value: 7+"s" }
  ]

  constructor(
    private aiAssistantAnalyticsService: AiAssistantAnalyticsService,
    private aiCoPilotAnalyticsService: AiCoPilotAnalyticsService
  ) {
    this.aiAssistantMetrics$ = new Observable();
    this.aiCoPilotMetrics$ = new Observable();
  }

  ngOnInit(): void {
    // Carica i dati iniziali per 'sempre'
    const initialPeriodo: AnalyticsPeriod = { periodoKey: 'sempre' };

    this.aiAssistantMetrics$ = this.aiAssistantAnalyticsService.getAnalysis(initialPeriodo);
    this.aiCoPilotMetrics$ = this.aiCoPilotAnalyticsService.getAnalysis(initialPeriodo);
  }

  private buildPeriod(dates: Date[] | undefined): AnalyticsPeriod {
    if (!dates || dates.length < 2) {
      return { periodoKey: 'sempre' };
    }

    return {
      startDate: dates[0],
      endDate: dates[1],
    };
  }

  onAiAssistantRangeChange(dates: Date[] | undefined) {
    const periodo = this.buildPeriod(dates);
    // Trigger refresh: lo stream resta stabile e la view si aggiorna via async pipe.
    this.aiAssistantAnalyticsService.getAnalysis(periodo);
  }

  onAiCoPilotRangeChange(dates: Date[] | undefined) {
    const periodo = this.buildPeriod(dates);
    // Trigger refresh: lo stream resta stabile e la view si aggiorna via async pipe.
    this.aiCoPilotAnalyticsService.getAnalysis(periodo);
  }
}