import { ComponentFixture, TestBed } from '@angular/core/testing';

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
});
