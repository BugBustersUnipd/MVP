import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthYearComponent } from './month-year';

describe('MonthYearComponent', () => {
	let component: MonthYearComponent;
	let fixture: ComponentFixture<MonthYearComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MonthYearComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(MonthYearComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	afterEach(() => {
		fixture?.destroy();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should emit formatted year-month when selectedMonthYear is set', () => {
		let emittedValue = '';
		component.monthYearChange.subscribe((value) => {
			emittedValue = value;
		});

		component.selectedMonthYear = new Date(2026, 2, 1);
		component.onMonthYearChange();

		expect(emittedValue).toBe('2026-03');
	});

	it('should emit empty string when selectedMonthYear is null', () => {
		let emittedValue = 'init';
		component.monthYearChange.subscribe((value) => {
			emittedValue = value;
		});

		component.selectedMonthYear = null;
		component.onMonthYearChange();

		expect(emittedValue).toBe('');
	});
});
