import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalyticsCharts } from './analytics-charts';

describe('AnalyticsCharts', () => {
  let component: AnalyticsCharts;
  let fixture: ComponentFixture<AnalyticsCharts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsCharts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalyticsCharts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
