import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { vi } from 'vitest';

import { Estrattore } from './estrattore';
import { AiCoPilotService } from '../../services/ai-co-pilot-service/ai-co-pilot-service';

describe('Estrattore', () => {
	let component: Estrattore;
	let fixture: ComponentFixture<Estrattore>;

	const aiCoPilotServiceMock = {
		companies$: of([]),
		fetchCompanies: () => {},
		uploadFiles: () => {},
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [Estrattore],
			providers: [
				provideRouter([]),
				MessageService,
				{ provide: AiCoPilotService, useValue: aiCoPilotServiceMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(Estrattore);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should fetch companies on init', () => {
		const fetchSpy = vi.spyOn(aiCoPilotServiceMock, 'fetchCompanies');

		component.ngOnInit();

		expect(fetchSpy).toHaveBeenCalled();
		fetchSpy.mockRestore();
	});

	it('should update form selections via handlers', () => {
		component.onCategoryChange('Cedolini');
		component.onDepartmentChange('HR');
		component.onCompetenceMonthYearChange('01/2026');
		component.onCompanyChange({ id: 1, name: 'ACME' });

		expect(component.selectedCategory).toBe('Cedolini');
		expect(component.selectedDepartment).toBe('');
		expect(component.selectedCompetenceMonthYear).toBe('01/2026');
		expect(component.selectedCompany).toEqual({ id: 1, name: 'ACME' });
	});

	it('should update selected files and compute canUpload', () => {
		expect(component.canUpload).toBe(false);

		const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
		component.onFilesSelected([file]);

		expect(component.selectedFiles).toEqual([file]);
		expect(component.canUpload).toBe(true);
	});

	it('should show warning for invalid files', () => {
		const messageService = fixture.debugElement.injector.get(MessageService);
		const addSpy = vi.spyOn(messageService, 'add');

		component.onFileValidationError({ invalidFiles: ['a.exe', 'b.sh'] } as any);

		expect(addSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				severity: 'warn',
				detail: expect.stringContaining('a.exe, b.sh'),
			})
		);
	});

	it('should not upload when canUpload is false', () => {
		const uploadSpy = vi.spyOn(aiCoPilotServiceMock, 'uploadFiles');

		component.selectedFiles = [];
		component.upload();

		expect(uploadSpy).not.toHaveBeenCalled();
		uploadSpy.mockRestore();
	});

	it('should upload files and navigate when form is ready', () => {
		const uploadSpy = vi.spyOn(aiCoPilotServiceMock, 'uploadFiles');
		const navigateSpy = vi.spyOn((component as any).router, 'navigate');
		const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });

		component.selectedFiles = [file];
		component.selectedCompany = { id: 1, name: 'ACME' };
		component.selectedDepartment = 'HR';
		component.selectedCategory = 'Cedolini';
		component.selectedCompetenceMonthYear = '01/2026';

		component.upload();

		expect(uploadSpy).toHaveBeenCalledWith([file], 'ACME', 'HR', 'Cedolini', '01/2026');
		expect(navigateSpy).toHaveBeenCalledWith(['/riconoscimento-documenti'], {
			state: { preserveSession: true },
		});
		uploadSpy.mockRestore();
		navigateSpy.mockRestore();
	});
});
