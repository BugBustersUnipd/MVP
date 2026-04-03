import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, of } from 'rxjs';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { AddDialog } from '../components/add-dialog/add-dialog';
import { Button } from '../components/button/button';
import { SelectComponent } from '../components/menutendina/menutendina';
import { Prompt } from '../components/prompt/prompt';
import { Generatore } from './generatore';
import { AiAssistantService } from '../../services/ai-assistant-service/ai-assistant-service';

describe('Generatore', () => {
  let component: Generatore;
  let fixture: ComponentFixture<Generatore>;

  const currentResult$ = new BehaviorSubject<any>(null);
  const aiServiceMock = {
    tones$: of([{ id: 1, name: 'Formale' }]),
    styles$: of([{ id: 2, name: 'Sintetico' }]),
    companies$: of([{ id: 3, name: 'ACME' }]),
    currentResult$,
    requireGeneration: vi.fn(),
    fetchCompanies: vi.fn(),
    newTone: vi.fn(),
    newStyle: vi.fn(),
    removeTone: vi.fn(),
    removeStyle: vi.fn(),
    fetchTonesByCompany: vi.fn(),
    fetchStylesByCompany: vi.fn(),
  };

  const routerMock = {
    navigate: vi.fn(),
  };

  beforeEach(async () => {
    currentResult$.next(null);
    aiServiceMock.requireGeneration.mockClear();
    aiServiceMock.fetchCompanies.mockClear();
    aiServiceMock.newTone.mockClear();
    aiServiceMock.newStyle.mockClear();
    aiServiceMock.removeTone.mockClear();
    aiServiceMock.removeStyle.mockClear();
    aiServiceMock.fetchTonesByCompany.mockClear();
    aiServiceMock.fetchStylesByCompany.mockClear();
    routerMock.navigate.mockClear();

    await TestBed.configureTestingModule({
      imports: [Generatore],
      providers: [
        { provide: AiAssistantService, useValue: aiServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Generatore);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load companies on init', () => {
    expect(aiServiceMock.fetchCompanies).toHaveBeenCalled();
  });

  it('should compute canGenerate based on tone/style/prompt length', () => {
    component.prompt = 'breve';
    component.selectedTone = { id: 1 };
    component.selectedStyle = { id: 2 };
    expect(component.canGenerate).toBe(false);

    component.prompt = 'x'.repeat(50);
    expect(component.canGenerate).toBe(true);
  });

  it('should not generate when canGenerate is false', () => {
    component.prompt = 'short';
    component.generate();
    expect(aiServiceMock.requireGeneration).not.toHaveBeenCalled();
  });

  it('should call requireGeneration and navigate on currentResult emission', () => {
    component.prompt = 'x'.repeat(60);
    component.selectedTone = { id: 1, name: 'Formale' };
    component.selectedStyle = { id: 2, name: 'Sintetico' };
    component.selectedCompany = { id: 3, name: 'ACME' };

    component.generate();
    expect(aiServiceMock.requireGeneration).toHaveBeenCalled();

    currentResult$.next({ id: 99, title: 'Result' });

    expect(routerMock.navigate).toHaveBeenCalledWith(['/risultato-generazione'], {
      state: { result: { id: 99, title: 'Result' } },
    });
  });

  it('should open add dialog and save tone/style', () => {
    component.selectedCompany = { id: 3, name: 'ACME' };
    component.openAddDialog('tone');
    expect(component.addDialogVisible).toBe(true);
    expect(component.addDialogType).toBe('tone');

    component.handleAddDialogSave({ type: 'tone', name: 'Nuovo tono', description: 'Desc' });
    expect(aiServiceMock.newTone).toHaveBeenCalledWith('Nuovo tono', 'Desc', 3);

    component.handleAddDialogSave({ type: 'style', name: 'Nuovo stile', description: 'Desc2' });
    expect(aiServiceMock.newStyle).toHaveBeenCalledWith('Nuovo stile', 'Desc2', 3);
  });

  it('should remove tone or style based on type', () => {
    component.removeOption(1, 'tone');
    expect(aiServiceMock.removeTone).toHaveBeenCalledWith(1);

    component.removeOption(2, 'style');
    expect(aiServiceMock.removeStyle).toHaveBeenCalledWith(2);
  });

  it('should ignore removeOption for unsupported type branch', () => {
    component.removeOption(3, 'company');

    expect(aiServiceMock.removeTone).not.toHaveBeenCalledWith(3);
    expect(aiServiceMock.removeStyle).not.toHaveBeenCalledWith(3);
  });

  it('should reset selected tone/style when company changes', () => {
    component.selectedTone = { id: 1 };
    component.selectedStyle = { id: 2 };

    component.onCompanyChange({ id: 5, name: 'Nuova' });

    expect(component.selectedTone).toBeNull();
    expect(component.selectedStyle).toBeNull();
    expect(aiServiceMock.fetchTonesByCompany).toHaveBeenCalledWith(5, true);
    expect(aiServiceMock.fetchStylesByCompany).toHaveBeenCalledWith(5, true);
  });

  it('should handle null company change and reset selections', () => {
    component.selectedTone = { id: 1 };
    component.selectedStyle = { id: 2 };

    component.onCompanyChange(null);

    expect(component.selectedCompany).toBeNull();
    expect(component.selectedTone).toBeNull();
    expect(component.selectedStyle).toBeNull();
    expect(aiServiceMock.fetchTonesByCompany).toHaveBeenCalledWith(undefined, true);
    expect(aiServiceMock.fetchStylesByCompany).toHaveBeenCalledWith(undefined, true);
  });

  it('should handle template events from button, prompt and company menu', () => {
    const generateSpy = vi.spyOn(component, 'generate');
    const companySpy = vi.spyOn(component, 'onCompanyChange');
    component.selectedCompany = null;
    fixture.detectChanges();

    const buttonDe = fixture.debugElement.query(By.directive(Button));
    buttonDe.componentInstance.action.emit();

    const promptDe = fixture.debugElement.query(By.directive(Prompt));
    promptDe.componentInstance.promptChange.emit('Prompt da template');

    const menuDes = fixture.debugElement.queryAll(By.directive(SelectComponent));
    const selectedCompany = { id: 9, name: 'TemplateCo' };
    menuDes[0].componentInstance.selectedChange.emit(selectedCompany);

    expect(generateSpy).toHaveBeenCalledOnce();
    expect(component.prompt).toBe('Prompt da template');
    expect(component.selectedCompany).toEqual(selectedCompany);
    expect(companySpy).toHaveBeenCalledWith(selectedCompany);
  });

  it('should handle tone/style remove and add template events from menus', () => {
    component.selectedCompany = { id: 3, name: 'ACME' };
    fixture.detectChanges();

    const openSpy = vi.spyOn(component, 'openAddDialog');
    const removeSpy = vi.spyOn(component, 'removeOption');
    const menuDes = fixture.debugElement.queryAll(By.directive(SelectComponent));

    menuDes[1].componentInstance.remove.emit(11);
    menuDes[1].componentInstance.addNew.emit();
    menuDes[2].componentInstance.remove.emit(22);
    menuDes[2].componentInstance.addNew.emit();

    expect(removeSpy).toHaveBeenCalledWith(11, 'tone');
    expect(removeSpy).toHaveBeenCalledWith(22, 'style');
    expect(openSpy).toHaveBeenCalledWith('tone');
    expect(openSpy).toHaveBeenCalledWith('style');
  });

  it('should forward add-dialog saveRequested event from template', () => {
    const saveSpy = vi.spyOn(component, 'handleAddDialogSave');
    component.addDialogVisible = true;
    component.selectedCompany = { id: 3, name: 'ACME' };
    fixture.detectChanges();

    const addDialog = fixture.debugElement.query(By.directive(AddDialog));
    addDialog.componentInstance.saveRequested.emit({
      type: 'tone',
      name: 'Nuovo tono',
      description: 'Desc',
    });

    expect(saveSpy).toHaveBeenCalledWith({
      type: 'tone',
      name: 'Nuovo tono',
      description: 'Desc',
    });
  });
});
