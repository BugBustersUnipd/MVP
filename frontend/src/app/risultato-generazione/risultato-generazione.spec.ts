import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { Button } from '../components/button/button';
import { Dialog } from '../components/dialog/dialog';
import { Editor } from '../components/editor/editor';
import { ImageTitle } from '../components/image-title/image-title';
import { Valutazione } from '../components/valutazione/valutazione';
import { RisultatoGenerazione } from './risultato-generazione';
import { AiAssistantService } from '../../services/ai-assistant-service/ai-assistant-service';
import { ResultAiAssistant } from '../shared/models/result-ai-assistant.model';

describe('RisultatoGenerazione', () => {
  let component: RisultatoGenerazione;
  let fixture: ComponentFixture<RisultatoGenerazione>;
  let currentResult$: BehaviorSubject<ResultAiAssistant | null>;

  const baseResult: ResultAiAssistant = {
    id: 10,
    title: 'Titolo iniziale',
    content: 'Contenuto iniziale',
    imagePath: null,
    tone: { id: 1, name: 'Formale', isActive: true },
    style: { id: 2, name: 'Sintetico', isActive: true },
    company: { id: 3, name: 'ACME' },
    data: new Date('2025-01-01'),
    prompt: 'Prompt iniziale',
    evaluation: 2,
    generatedDatumId: null,
  };

  const aiServiceMock = {
    currentResult$: new BehaviorSubject<ResultAiAssistant | null>(null),
    currentGenerationError$: new BehaviorSubject<string | null>(null),
    setCurrentResult: vi.fn(),
    createCurrentPost: vi.fn(),
    deletePost: vi.fn(),
    setEvaluation: vi.fn(),
    reuse: vi.fn(),
    regenerateCurrent: vi.fn(),
    clearGenerationError: vi.fn(),
  };

  const routerMock = {
    navigate: vi.fn(),
  };

  beforeEach(async () => {
    currentResult$ = new BehaviorSubject<ResultAiAssistant | null>({ ...baseResult });
    aiServiceMock.currentResult$ = currentResult$;
    aiServiceMock.currentGenerationError$ = new BehaviorSubject<string | null>(null);
    aiServiceMock.setCurrentResult.mockClear();
    aiServiceMock.createCurrentPost.mockClear();
    aiServiceMock.deletePost.mockClear();
    aiServiceMock.setEvaluation.mockClear();
    aiServiceMock.reuse.mockClear();
    aiServiceMock.regenerateCurrent.mockClear();
    aiServiceMock.clearGenerationError.mockClear();
    routerMock.navigate.mockClear();

    history.replaceState({ result: { ...baseResult } }, '');

    await TestBed.configureTestingModule({
      imports: [RisultatoGenerazione],
      providers: [
        { provide: AiAssistantService, useValue: aiServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(RisultatoGenerazione);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call createPost on save', () => {
    component.onSalva();
    expect(aiServiceMock.createCurrentPost).toHaveBeenCalledTimes(1);
  });

  it('should not call createCurrentPost when result is null', () => {
    component.result.set(null);

    component.onSalva();

    expect(aiServiceMock.createCurrentPost).not.toHaveBeenCalled();
  });

  it('should remove generation and navigate on delete', () => {
    component.deleteGeneration();
    expect(aiServiceMock.deletePost).toHaveBeenCalledWith(10);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/generatore']);
  });

  it('should track pending modifications for title and content', () => {
    component.onFieldModified('title', 'Nuovo titolo');
    component.onFieldModified('content', 'Nuovo contenuto');

    expect(component.hasPendingModifications).toBe(true);
    expect(component.getTitleValue()).toBe('Nuovo titolo');
    expect(component.getContentValue()).toBe('Nuovo contenuto');

    component.onFieldModified('title', 'Titolo iniziale');
    expect(component.getTitleValue()).toBe('Titolo iniziale');
  });

  it('should save merged modifications and reset edit mode', () => {
    component.enableEditing();
    component.onFieldModified('title', 'Titolo salvato');
    component.onFieldModified('content', 'Contenuto salvato');

    component.saveChanges();

    expect(aiServiceMock.setCurrentResult).toHaveBeenCalled();
    const merged = component.result();
    expect(merged?.title).toBe('Titolo salvato');
    expect(merged?.content).toBe('Contenuto salvato');
    expect(component.hasPendingModifications).toBe(false);
    expect(component.isEditable).toBe(false);
  });

  it('should only close edit mode when saveChanges has no pending modifications', () => {
    aiServiceMock.setCurrentResult.mockClear();
    component.enableEditing();

    component.saveChanges();

    expect(aiServiceMock.setCurrentResult).not.toHaveBeenCalled();
    expect(component.isEditable).toBe(false);
  });

  it('should cancel editing and clear pending modifications', () => {
    component.enableEditing();
    component.onFieldModified('title', 'bozza');

    component.cancelEditing();

    expect(component.hasPendingModifications).toBe(false);
    expect(component.isEditable).toBe(false);
  });

  it('should update evaluation and call setEvaluation', () => {
    component.onRatingChange(4);
    expect(component.result()?.evaluation).toBe(4);
    expect(aiServiceMock.setEvaluation).toHaveBeenCalledWith(null, 4);
  });

  it('should ignore rating update when result is null', () => {
    component.result.set(null);

    component.onRatingChange(5);

    expect(aiServiceMock.setEvaluation).not.toHaveBeenCalled();
  });

  it('should call reuse with current result data', () => {
    component.reuseGeneration();
    expect(aiServiceMock.reuse).toHaveBeenCalledWith(
      baseResult.tone,
      baseResult.style,
      baseResult.company,
      baseResult.prompt,
    );
  });

  it('should navigate to generatore when duplicating', () => {
    component.duplicateGeneration();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/generatore'], {
      state: {
        tone: baseResult.tone,
        style: baseResult.style,
        company: baseResult.company,
        prompt: baseResult.prompt,
      },
    });
  });

  it('should react to external currentResult$ updates', () => {
    const updated = { ...baseResult, id: 11, title: 'Da stream' };
    currentResult$.next(updated);
    fixture.detectChanges();

    expect(component.result()?.id).toBe(11);
    expect(component.result()?.title).toBe('Da stream');
  });

  it('should use image fallback and pending image override', () => {
    component.result.set({ ...baseResult, imagePath: null });
    expect(component.getImagePathValue()).toBe('http://localhost:3000/PlaceHolder-GufoBagnato.jpg');

    component.pendingImagePath.set('data:image/png;base64,abc');
    expect(component.getImagePathValue()).toBe('data:image/png;base64,abc');
  });

  it('should remove pending title when incoming value equals original', () => {
    component.pendingModifications = { title: 'Bozza' };

    component.onFieldModified('title', 'Titolo iniziale');

    expect(component.pendingModifications.title).toBeUndefined();
  });

  it('should ignore field modification when result is null', () => {
    component.result.set(null);

    component.onFieldModified('title', 'Nuovo');

    expect(component.hasPendingModifications).toBe(false);
  });

  it('should use fallback values for reuse and duplicate when result is null', () => {
    component.result.set(null);

    component.reuseGeneration();
    expect(aiServiceMock.reuse).toHaveBeenCalledWith(
      { id: 0, name: '', isActive: false },
      { id: 0, name: '', isActive: false },
      { id: 0, name: '' },
      '',
    );

    component.duplicateGeneration();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/generatore'], {
      state: {
        tone: { id: 0, name: '', isActive: false },
        style: { id: 0, name: '', isActive: false },
        company: { id: 0, name: '' },
        prompt: '',
      },
    });
  });

  it('should render editing and non-editing branches', () => {
    component.result.set({ ...baseResult, id: null, generatedDatumId: 999 });
    component.isEditable = false;

    expect(component.result()?.id).toBeNull();
    expect(component.result()?.generatedDatumId).toBe(999);
    expect(component.isEditable).toBe(false);

    component.isEditable = true;
    expect(component.isEditable).toBe(true);
  });

  it('should handle child output bindings in template', () => {
    const fieldSpy = vi.spyOn(component, 'onFieldModified');
    const ratingSpy = vi.spyOn(component, 'onRatingChange');
    const imageSpy = vi.spyOn(component, 'changeImage');
    component.result.set(baseResult);
    fixture.detectChanges();

    const imageTitle = fixture.debugElement.query(By.directive(ImageTitle));
    imageTitle.componentInstance.imageTitleChange.emit('Titolo dal template');
    imageTitle.componentInstance.imageChange.emit(new File(['x'], 'img.png', { type: 'image/png' }));

    const editor = fixture.debugElement.query(By.directive(Editor));
    editor.componentInstance.textChange.emit('Contenuto dal template');

    const rating = fixture.debugElement.query(By.directive(Valutazione));
    rating.componentInstance.ratingChange.emit(5);

    expect(fieldSpy).toHaveBeenCalledWith('title', 'Titolo dal template');
    expect(fieldSpy).toHaveBeenCalledWith('content', 'Contenuto dal template');
    expect(imageSpy).toHaveBeenCalled();
    expect(ratingSpy).toHaveBeenCalledWith(5);
  });

  it('should handle action buttons and dialog confirmation from template', () => {
    const editSpy = vi.spyOn(component, 'enableEditing');
    const rigeneraSpy = vi.spyOn(component, 'onRigenera');
    const salvaSpy = vi.spyOn(component, 'onSalva');
    const deleteSpy = vi.spyOn(component, 'deleteGeneration');
    component.result.set({ ...baseResult, id: null, generatedDatumId: 777 });
    component.isEditable = false;
    fixture.detectChanges();

    const dialog = fixture.debugElement.query(By.directive(Dialog));
    dialog.componentInstance.confirmed.emit();

    const buttons = fixture.debugElement.queryAll(By.directive(Button));
    const rigeneraButton = buttons.find((b) => b.componentInstance.label === 'Rigenera');
    const salvaButton = buttons.find((b) => b.componentInstance.label === 'Salva');
    const modificaButton = buttons.find((b) => b.componentInstance.label === 'Modifica');

    rigeneraButton?.componentInstance.action.emit();
    salvaButton?.componentInstance.action.emit();
    modificaButton?.componentInstance.action.emit();

    expect(rigeneraSpy).toHaveBeenCalledWith(777);
    expect(salvaSpy).toHaveBeenCalledOnce();
    expect(editSpy).toHaveBeenCalledOnce();
    expect(deleteSpy).toHaveBeenCalledOnce();
  });

  it('should handle reuse and duplicate actions in post branch from template', () => {
    const reuseSpy = vi.spyOn(component, 'reuseGeneration');
    const dupSpy = vi.spyOn(component, 'duplicateGeneration');
    component.result.set({ ...baseResult, id: 123, generatedDatumId: 999 });
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.directive(Button));
    const reuseButton = buttons.find((b) => b.componentInstance.label === 'Riutilizza');
    const duplicateButton = buttons.find((b) => b.componentInstance.label === 'Duplica');

    reuseButton?.componentInstance.action.emit();
    duplicateButton?.componentInstance.action.emit();

    expect(reuseSpy).toHaveBeenCalledOnce();
    expect(dupSpy).toHaveBeenCalledOnce();
  });
});
