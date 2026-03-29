import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Tables } from './tables';

describe('Tables', () => {
  let component: Tables;
  let fixture: ComponentFixture<Tables>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tables]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tables);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit title click row payload', () => {
    const emitSpy = vi.spyOn(component.titleClick, 'emit');
    const row = { id: 10, title: 'Documento' };

    component.onTitleClick(row);

    expect(emitSpy).toHaveBeenCalledWith(row);
  });
});
