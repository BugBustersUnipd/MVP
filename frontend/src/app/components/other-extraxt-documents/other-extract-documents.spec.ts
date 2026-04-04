import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { OtherExtractDocuments } from './other-extract-documents';

describe('OtherExtractDocuments', () => {
	let component: OtherExtractDocuments;
	let fixture: ComponentFixture<OtherExtractDocuments>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [OtherExtractDocuments],
		}).compileComponents();

		fixture = TestBed.createComponent(OtherExtractDocuments);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should emit row removal index', () => {
		const emitSpy = vi.spyOn(component.rowRemoved, 'emit');

		component.requestRowRemoval(2);

		expect(emitSpy).toHaveBeenCalledWith(2);
	});

	it('should format confidence with one decimal place', () => {
		expect(component.formatConfidence(82)).toBe('82.0');
		expect(component.formatConfidence(82.37)).toBe('82.3');
		expect(component.formatConfidence(null)).toBe('');
	});
});
