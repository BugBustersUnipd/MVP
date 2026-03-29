import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Button } from '../button/button';
import { Menutendina } from '../menutendina/menutendina';
import { Prompt } from '../prompt/prompt';
import { SendDocumentDialog } from './send-document-dialog';

describe('SendDocumentDialog', () => {
  let component: SendDocumentDialog;
  let fixture: ComponentFixture<SendDocumentDialog>;
  let dialogRefMock: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dialogRefMock = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [SendDocumentDialog],
      providers: [
        { provide: DynamicDialogRef, useValue: dialogRefMock },
        { provide: DynamicDialogConfig, useValue: { data: { templates$: of([{ name: 'T1', content: 'Body' }]) } } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SendDocumentDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load templates stream on init', () => {
    component.ngOnInit();

    expect(component.templates$).toBeTruthy();
  });

  it('should expose selected template content through messaggio getter', () => {
    component.selectedTemplate = { name: 'T1', content: 'Contenuto template' };

    expect(component.messaggio).toBe('Contenuto template');

    component.messaggio = 'Messaggio custom';
    expect(component.messaggio).toBe('Messaggio custom');
  });

  it('should open add dialog with provided type', () => {
    component.openAddDialog('template');

    expect(component.addDialogType).toBe('template');
    expect(component.addDialogVisible).toBe(true);
  });

  it('should close dialog without payload', () => {
    component.closeDialog();

    expect(dialogRefMock.close).toHaveBeenCalledWith();
  });

  it('should close dialog with send payload on confirm', () => {
    const file = new File(['x'], 'allegato.pdf', { type: 'application/pdf' });
    (component as any).attachFileComponent = { files: [file] };
    component.selectedTemplate = { name: 'Template A', content: 'Body A' };
    component.selectedTime = { name: 'Adesso', value: 'now' };
    component.messaggio = 'Invio documento';

    component.confirmDialog();

    expect(dialogRefMock.close).toHaveBeenCalledWith({
      messaggio: 'Invio documento',
      orarioInvio: { name: 'Adesso', value: 'now' },
      fileAttachments: [file],
      template: 'Template A',
    });
  });

  it('should handle promptChange emitted from prompt component in template', () => {
    fixture.detectChanges();

    const promptDe = fixture.debugElement.query(By.directive(Prompt));
    promptDe.componentInstance.promptChange.emit('Messaggio da template');
    fixture.detectChanges();

    expect(component.messaggio).toBe('Messaggio da template');
  });

  it('should open add dialog when first menutendina emits addNew', () => {
    fixture.detectChanges();

    const menuDes = fixture.debugElement.queryAll(By.directive(Menutendina));
    menuDes[0].componentInstance.addNew.emit();

    expect(component.addDialogVisible).toBe(true);
    expect(component.addDialogType).toBe('template');
  });

  it('should call close and confirm when action outputs are emitted by buttons', () => {
    const closeSpy = vi.spyOn(component, 'closeDialog');
    const confirmSpy = vi.spyOn(component, 'confirmDialog');
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.directive(Button));
    buttons[0].componentInstance.action.emit();
    buttons[1].componentInstance.action.emit();

    expect(closeSpy).toHaveBeenCalledOnce();
    expect(confirmSpy).toHaveBeenCalledOnce();
  });
});
