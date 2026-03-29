import { Component, Input, OnChanges } from '@angular/core';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'bb-pdf-preview',
  imports: [],
  templateUrl: './pdf-preview.html',
  styleUrl: './pdf-preview.css',
})
export class PdfPreview implements OnChanges{
  @Input() pdfUrl: string = '';

  safeUrl: SafeResourceUrl | null = null;
  constructor(private sanitizer: DomSanitizer) {}
  ngOnChanges(){
    if(this.pdfUrl){
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl);
    }
  }
}
