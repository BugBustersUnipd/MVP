import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DateRangePicker } from './date-range-picker';

describe('DateRangePicker', () => {
  let component: DateRangePicker;
  let fixture: ComponentFixture<DateRangePicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateRangePicker]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DateRangePicker);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
