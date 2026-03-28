import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImmagineTitolo } from './immagine-titolo';

describe('ImmagineTitolo', () => {
  let component: ImmagineTitolo;
  let fixture: ComponentFixture<ImmagineTitolo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImmagineTitolo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImmagineTitolo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
