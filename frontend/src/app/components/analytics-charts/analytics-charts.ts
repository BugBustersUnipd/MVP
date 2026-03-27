import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, Input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-analytics-charts',
  standalone: true,
  imports: [ChartModule],
  templateUrl: './analytics-charts.html',
  styleUrl: './analytics-charts.css',
})
export class AnalyticsCharts implements OnInit {
  @Input() labels: string[] = [];
  @Input() datasetLabel: string = 'Dataset';
  @Input() dataValues: number[] = [];
  @Input() chartType: any = 'bar';

  data: any;
  options: any;

  platformId = inject(PLATFORM_ID);
  cd = inject(ChangeDetectorRef);

  ngOnInit() {
    this.initChart();
  }

  initChart() {
    if (isPlatformBrowser(this.platformId)) {
      const documentStyle = getComputedStyle(document.documentElement);

      const textColor = documentStyle.getPropertyValue('--p-text-color');

      this.data = {
        labels: this.labels,
        datasets: [
          {
            label: this.datasetLabel,
            backgroundColor: '#a4a4a4',
            borderColor: '#000000',
            borderWidth: 1,
            data: this.dataValues,

            // 👇 controllano la dimensione delle barre
            barThickness: 20, // larghezza fissa
            maxBarThickness: 60, // larghezza massima
            categoryPercentage: 0.8, // spazio occupato nella categoria
            barPercentage: 0.9, // spazio occupato nella barra
          },
        ],
      };

      this.options = {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: textColor,
            },
          },
        },
      };

      this.cd.markForCheck();
    }
  }
}
