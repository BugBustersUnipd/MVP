import { Component, Input } from '@angular/core';

@Component({
  selector: 'bb-pdf-preview',
  imports: [],
  templateUrl: './pdf-preview.html',
  styleUrl: './pdf-preview.css',
})
export class PdfPreview {
  @Input() pdfUrl: string = '';
}
