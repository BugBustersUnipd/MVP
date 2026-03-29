import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageModule } from 'primeng/image';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';

@Component({
  selector: 'bb-image-title',
  imports: [ImageModule, FormsModule, InputTextModule, FileUploadModule],
  templateUrl: './image-title.html',
  styleUrls: [
    './image-title.css'
  ]
})
export class ImageTitle {
@Input() hidden: boolean = false;
@Input() imageUrl: string = '';
@Input() caption: string = '';
@Input() altText: string = '';
@Input() editable: boolean = false;
@Input() imageTitle: string = '';
title: string = '';
@Output() imageTitleChange = new EventEmitter<string>();
@Output() imageChange = new EventEmitter<File>();

ngOnChanges(changes: SimpleChanges): void {
  if (changes['imageTitle']) {
    this.title = this.imageTitle ?? '';
  }
}

onImageChange(event: any): void {
  const file: File = event.files[0];
  this.imageChange.emit(file);
}

onTitleChange(value: string): void {
  this.title = value ?? '';
  this.imageTitleChange.emit(this.title);
}
}
