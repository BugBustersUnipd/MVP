import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnteprimaDocumento } from './anteprima-documento';

describe('AnteprimaDocumento', () => {
  let component: AnteprimaDocumento;
  let fixture: ComponentFixture<AnteprimaDocumento>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnteprimaDocumento]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnteprimaDocumento);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
