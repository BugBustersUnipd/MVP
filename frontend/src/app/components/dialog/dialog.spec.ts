import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { vi } from 'vitest';

import { Dialog } from './dialog';

describe('Dialog', () => {
  let component: Dialog;
  let fixture: ComponentFixture<Dialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Dialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should configure and trigger confirm flow', () => {
    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    const messageService = fixture.debugElement.injector.get(MessageService);
    const confirmSpy = vi.spyOn(confirmationService, 'confirm');
    const messageSpy = vi.spyOn(messageService, 'add');
    const emitSpy = vi.spyOn(component.confirmed, 'emit');

    component.message = 'Eliminare elemento?';
    component.header = 'Conferma';
    component.icon = 'pi pi-trash';
    component.acceptLabel = 'Si';
    component.rejectLabel = 'No';
    component.successMessage = 'Completato';
    component.cancelMessage = 'Annullato custom';

    component.onConfirm({ target: document.createElement('button') } as unknown as Event);

    expect(confirmSpy).toHaveBeenCalledOnce();
    const config = confirmSpy.mock.calls[0][0] as any;

    expect(config.message).toBe('Eliminare elemento?');
    expect(config.header).toBe('Conferma');
    expect(config.icon).toBe('pi pi-trash');
    expect(config.acceptButtonProps.label).toBe('Si');
    expect(config.rejectButtonProps.label).toBe('No');

    config.accept();
    expect(emitSpy).toHaveBeenCalledOnce();
    expect(messageSpy).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Confermato',
      detail: 'Completato',
    });

    config.reject();
    expect(messageSpy).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Annullato',
      detail: 'Annullato custom',
    });
  });
});
