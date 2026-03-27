import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Generatore } from './generatore';

describe('Generatore', () => {
  let component: Generatore;
  let fixture: ComponentFixture<Generatore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Generatore]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Generatore);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
