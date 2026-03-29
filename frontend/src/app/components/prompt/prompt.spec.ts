import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Prompt } from './prompt';

describe('Prompt', () => {
  let component: Prompt;
  let fixture: ComponentFixture<Prompt>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Prompt]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Prompt);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render prompt textarea in template', () => {
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea');

    expect(textarea).toBeTruthy();
  });

  it('should emit promptChange on textarea input', () => {
    const emitSpy = vi.spyOn(component.promptChange, 'emit');
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Nuovo prompt';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.prompt).toBe('Nuovo prompt');
    expect(emitSpy).toHaveBeenCalledWith('Nuovo prompt');
  });
});
