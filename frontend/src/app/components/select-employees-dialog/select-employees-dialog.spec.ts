import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Button } from '../button/button';
import { SelectEmployeesDialog } from './select-employees-dialog';

describe('SelectEmployeesDialog', () => {
	let component: SelectEmployeesDialog;
	let fixture: ComponentFixture<SelectEmployeesDialog>;
	let dialogRefMock: { close: ReturnType<typeof vi.fn> };

	beforeEach(async () => {
		dialogRefMock = { close: vi.fn() };

		await TestBed.configureTestingModule({
			imports: [SelectEmployeesDialog],
			providers: [
				{ provide: DynamicDialogRef, useValue: dialogRefMock },
				{
					provide: DynamicDialogConfig,
					useValue: {
						data: {
							extractedEmployeeName: 'Mario Rossi',
							employees$: of([]),
						},
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(SelectEmployeesDialog);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should initialize extracted name and employees stream from config', () => {
		expect(component.extractedEmployeeName).toBe('Mario Rossi');
		expect(component.employees$).toBeTruthy();
	});

	it('should close dialog without payload', () => {
		component.closeDialog();

		expect(dialogRefMock.close).toHaveBeenCalledWith();
	});

	it('should not save when no employee is selected', () => {
		component.selectedEmployee = null;

		component.saveDialog();

		expect(dialogRefMock.close).not.toHaveBeenCalled();
	});

	it('should save selected employee payload', () => {
		component.selectedEmployee = {
			id: 7,
			name: 'Luigi Bianchi',
			recipient: {
				recipientId: 7,
				recipientName: 'Luigi Bianchi',
				rawRecipientName: 'Luigi Bianchi',
				recipientEmail: 'luigi@example.com',
				recipientCode: 'EMP-7',
			},
		};

		component.saveDialog();

		expect(dialogRefMock.close).toHaveBeenCalledWith({
			recipientId: 7,
			recipientName: 'Luigi Bianchi',
			rawRecipientName: 'Luigi Bianchi',
			recipientEmail: 'luigi@example.com',
			recipientCode: 'EMP-7',
		});
	});

	it('should show fallback extracted employee name in template', () => {
		component.extractedEmployeeName = '';
		fixture.detectChanges();

		expect(fixture.nativeElement.textContent).toContain('Dipendente non disponibile');
	});

	it('should call close and save when action outputs are emitted by template buttons', () => {
		const closeSpy = vi.spyOn(component, 'closeDialog');
		const saveSpy = vi.spyOn(component, 'saveDialog');
		component.selectedEmployee = {
			id: 12,
			name: 'Elena Neri',
			recipient: {
				recipientId: 12,
				recipientName: 'Elena Neri',
				rawRecipientName: 'Elena Neri',
				recipientEmail: '',
				recipientCode: '',
			},
		};
		fixture.detectChanges();

		const buttons = fixture.debugElement.queryAll(By.directive(Button));
		buttons[0].componentInstance.action.emit();
		buttons[1].componentInstance.action.emit();

		expect(closeSpy).toHaveBeenCalledOnce();
		expect(saveSpy).toHaveBeenCalledOnce();
	});
});