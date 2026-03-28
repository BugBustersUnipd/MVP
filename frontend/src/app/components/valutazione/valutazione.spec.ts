import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Valutazione } from './valutazione';

describe('Valutazione', () => {
  let component: Valutazione;
  let fixture: ComponentFixture<Valutazione>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Valutazione]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Valutazione);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
