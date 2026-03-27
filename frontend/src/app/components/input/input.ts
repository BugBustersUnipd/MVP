import { Component, Input, Output, EventEmitter } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { InputTextModule } from "primeng/inputtext";

@Component({
  selector: "app-input",
  imports: [FormsModule, InputTextModule],
  templateUrl: "./input.html",
  styleUrl: "./input.css",
})
export class InputComponent {
  @Input() editable: boolean = false;
  @Input() label: string = "";
  @Input() value: string | number | undefined= "";
  @Input() placeholder: string = "";
  @Input() type: string = "text";
  @Input() min: number = 1;
  @Input() max: number = 1;
  @Input() id: string = "inputField";
  @Input() disabled: boolean = false;
  @Input() class: string = "";
  @Output() valueChange = new EventEmitter<string | number |undefined>();

  onValueChange(value: string | number | undefined): void {
    this.valueChange.emit(value);
  }
}