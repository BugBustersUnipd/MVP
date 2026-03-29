import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AnalyticsDashboard } from './analytics-dashboard';
import { AiAssistantAnalyticsService } from '../../services/ai-assistant-analytics-service/ai-assistant-analytics-service';
import { AiCoPilotAnalyticsService } from '../../services/ai-co-pilot-analytics-service/ai-co-pilot-analytics-service';

describe('AnalyticsDashboard', () => {
  let component: AnalyticsDashboard;
  let fixture: ComponentFixture<AnalyticsDashboard>;

  const assistantMetrics$ = of([{ label: 'A', value: 1 }]);
  const copilotMetrics$ = of([{ label: 'C', value: 2 }]);
  const toneChart$ = of({ labels: ['Tone'], values: [3] });
  const styleChart$ = of({ labels: ['Style'], values: [4] });

  const assistantServiceMock = {
    getAnalysis: vi.fn(() => assistantMetrics$),
    getToneUsageChart: vi.fn(() => toneChart$),
    getStyleUsageChart: vi.fn(() => styleChart$),
  };

  const copilotServiceMock = {
    getAnalysis: vi.fn(() => copilotMetrics$),
  };

  beforeEach(async () => {
    assistantServiceMock.getAnalysis.mockClear();
    assistantServiceMock.getToneUsageChart.mockClear();
    assistantServiceMock.getStyleUsageChart.mockClear();
    copilotServiceMock.getAnalysis.mockClear();

    await TestBed.configureTestingModule({
      imports: [AnalyticsDashboard],
      providers: [
        { provide: AiAssistantAnalyticsService, useValue: assistantServiceMock },
        { provide: AiCoPilotAnalyticsService, useValue: copilotServiceMock },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalyticsDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should wire tone/style chart streams in constructor', () => {
    let toneValue: any = null;
    component.aiAssistantToneChart$.subscribe((value) => {
      toneValue = value;
    });

    expect(toneValue).toEqual({ labels: ['Tone'], values: [3] });
    expect(assistantServiceMock.getToneUsageChart).toHaveBeenCalled();
    expect(assistantServiceMock.getStyleUsageChart).toHaveBeenCalled();
  });

  it('should request both analytics on init with always period', () => {
    component.ngOnInit();

    expect(assistantServiceMock.getAnalysis).toHaveBeenCalledWith({ periodoKey: 'sempre' });
    expect(copilotServiceMock.getAnalysis).toHaveBeenCalledWith({ periodoKey: 'sempre' });
  });

  it('should use always period when assistant range is missing or incomplete', () => {
    component.onAiAssistantRangeChange(undefined);
    expect(assistantServiceMock.getAnalysis).toHaveBeenLastCalledWith({ periodoKey: 'sempre' });

    component.onAiAssistantRangeChange([new Date('2026-01-01')]);
    expect(assistantServiceMock.getAnalysis).toHaveBeenLastCalledWith({ periodoKey: 'sempre' });
  });

  it('should use explicit dates when assistant range has start and end', () => {
    const start = new Date('2026-01-01');
    const end = new Date('2026-01-31');

    component.onAiAssistantRangeChange([start, end]);

    expect(assistantServiceMock.getAnalysis).toHaveBeenLastCalledWith({
      startDate: start,
      endDate: end,
    });
  });

  it('should use always period when copilot range is missing or incomplete', () => {
    component.onAiCoPilotRangeChange(undefined);
    expect(copilotServiceMock.getAnalysis).toHaveBeenLastCalledWith({ periodoKey: 'sempre' });

    component.onAiCoPilotRangeChange([new Date('2026-01-01')]);
    expect(copilotServiceMock.getAnalysis).toHaveBeenLastCalledWith({ periodoKey: 'sempre' });
  });

  it('should use explicit dates when copilot range has start and end', () => {
    const start = new Date('2026-02-01');
    const end = new Date('2026-02-28');

    component.onAiCoPilotRangeChange([start, end]);

    expect(copilotServiceMock.getAnalysis).toHaveBeenLastCalledWith({
      startDate: start,
      endDate: end,
    });
  });
});
