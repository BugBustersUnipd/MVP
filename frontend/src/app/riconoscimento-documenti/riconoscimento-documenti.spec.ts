import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RiconoscimentoDocumenti } from './riconoscimento-documenti';

describe('RiconoscimentoDocumenti', () => {
  let component: RiconoscimentoDocumenti;
  let fixture: ComponentFixture<RiconoscimentoDocumenti>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiconoscimentoDocumenti]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RiconoscimentoDocumenti);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
