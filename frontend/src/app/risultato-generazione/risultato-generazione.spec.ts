import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RisultatoGenerazione } from './risultato-generazione';

describe('RisultatoGenerazione', () => {
  let component: RisultatoGenerazione;
  let fixture: ComponentFixture<RisultatoGenerazione>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RisultatoGenerazione]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RisultatoGenerazione);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
