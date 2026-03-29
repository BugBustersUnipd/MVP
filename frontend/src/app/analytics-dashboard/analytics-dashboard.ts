import { Component, OnInit } from '@angular/core';
import { AnalyticsCharts } from '../components/analytics-charts/analytics-charts';
import { AccordionModule } from 'primeng/accordion'
import { CardModule } from 'primeng/card'

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

import { DateRangePicker } from '../components/date-range-picker/date-range-picker';
import { AnalyticsMetric, AnalyticsPeriod } from '../../services/analytics-abstract-service';
import { AiAssistantAnalyticsService, AnalyticsChartData } from '../../services/ai-assistant-analytics-service/ai-assistant-analytics-service';
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
  aiAssistantToneChart$: Observable<AnalyticsChartData>;
  aiAssistantStyleChart$: Observable<AnalyticsChartData>;

  constructor(
    private aiAssistantAnalyticsService: AiAssistantAnalyticsService,
    private aiCoPilotAnalyticsService: AiCoPilotAnalyticsService
  ) {
    this.aiAssistantMetrics$ = new Observable();
    this.aiCoPilotMetrics$ = new Observable();
    this.aiAssistantToneChart$ = this.aiAssistantAnalyticsService.getToneUsageChart();
    this.aiAssistantStyleChart$ = this.aiAssistantAnalyticsService.getStyleUsageChart();
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
    this.aiAssistantMetrics$ = this.aiAssistantAnalyticsService.getAnalysis(periodo);
  }

  onAiCoPilotRangeChange(dates: Date[] | undefined) {
    const periodo = this.buildPeriod(dates);
    this.aiCoPilotMetrics$ = this.aiCoPilotAnalyticsService.getAnalysis(periodo);
  }
}