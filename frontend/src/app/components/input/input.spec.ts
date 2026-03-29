import { ComponentFixture, TestBed } from "@angular/core/testing";

import { InputComponent } from "./input";

describe("InputComponent", () => {
	let component: InputComponent;
	let fixture: ComponentFixture<InputComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [InputComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(InputComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});

	it("should emit valueChange when value changes", () => {
		let emittedValue = "";
		component.valueChange.subscribe((value) => {
			if (typeof value === "string") {
				emittedValue = value;
			}
		});

		component.onValueChange("nuovo valore");

		expect(emittedValue).toBe("nuovo valore");
	});

	it("should emit valueChange from template input event", () => {
		let emitted: string | number | undefined;
		component.valueChange.subscribe((value) => {
			emitted = value;
		});
		fixture.detectChanges();

		const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
		input.value = 'dal template';
		input.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		expect(component.value).toBe('dal template');
		expect(emitted).toBe('dal template');
	});

});
