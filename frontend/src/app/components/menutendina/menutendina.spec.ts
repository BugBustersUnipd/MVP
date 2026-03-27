import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Menutendina } from './menutendina';

describe('Menutendina', () => {
  let component: Menutendina;
  let fixture: ComponentFixture<Menutendina>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Menutendina]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Menutendina);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
