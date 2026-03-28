// cose che mancano ancora:
// prefisporre il click sulla valutazione
// cliccando su Annulla modifiche deve ritornare come prima il resultLocale (qui c'è da modificare un po!)
// gestione degli errori, aiAssistantService potrebbe rimbalzare un errore del backend, che dobbiamo visualizzare

import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageTitle } from '../components/image-title/image-title';
import { FormsModule } from '@angular/forms';
import { Button } from '../components/button/button';
import { Editor } from '../components/editor/editor';
import { Prompt } from '../components/prompt/prompt';
import { Valutazione } from '../components/valutazione/valutazione';
import { Menutendina } from '../components/menutendina/menutendina';
import { Dialog } from '../components/dialog/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ResultAiAssistant } from '../shared/models/result-ai-assistant.model';
import { AiAssistantService } from '../../services/ai-assistant-service/ai-assistant-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-risultato-generazione',
  imports: [ImageTitle, FormsModule, Button, Prompt, Editor, Valutazione, Menutendina, CommonModule, Dialog],
  templateUrl: './risultato-generazione.html',
  styleUrl: './risultato-generazione.css',
})
export class RisultatoGenerazione {
  private aiService = inject(AiAssistantService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  isEditable: boolean = false;
  readonly: boolean = true;

  // Riferimento unico al result: non viene modificato finche' non si salva.
  result = (history.state?.result as ResultAiAssistant | null) ?? null;
  pendingModifications: Partial<ResultAiAssistant> = {};

  constructor() {
    if (this.result) {
      this.aiService.setCurrentResult(this.result);
    }

    this.aiService.currentResult$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => {
        this.result = updated;
      });
  }

  onRigenera(id: number): void {
    // this.aiService.requireGeneration(this.result?.prompt ?? '', this.result?.tone ?? { id: 0, name: '' }, this.result?.style ?? { id: 0, name: '' }, this.result?.company ?? { id: 0, name: '' }, id);
  }

  onSalva(): void {
    if (!this.result) return;

    this.aiService.createPost(this.result);
    // this.router.navigate(['/storico-ai-assistant']);
  }

  deleteGeneration(): void {
    this.aiService.removeGeneration(this.result?.id ?? 0);
    this.router.navigate(['/generatore']);
  }

  get hasPendingModifications(): boolean {
    return Object.keys(this.pendingModifications).length > 0;
  }

  private normalizeValue(value: string | null | undefined): string {
    return value ?? '';
  }

  onFieldModified(field: 'title' | 'content', value: string): void {
    if (!this.result) return;

    const original = this.normalizeValue(this.result[field]);
    const incoming = this.normalizeValue(value);

    if (incoming === original) {
      const { [field]: _, ...rest } = this.pendingModifications;
      this.pendingModifications = rest;
      return;
    }

    this.pendingModifications = {
      ...this.pendingModifications,
      [field]: value,
    };
  }

  getTitleValue(): string {
    const value = this.pendingModifications.title;
    if (typeof value === 'string') return value;
    return this.result?.title ?? '';
  }

  getContentValue(): string {
    const value = this.pendingModifications.content;
    if (typeof value === 'string') return value;
    return this.result?.content ?? '';
  }

  getImagePathValue(): string {
    const value = this.pendingModifications.imagePath;
    if (typeof value === 'string') return value;
    return this.result?.imagePath || '/PlaceHolder-GufoBagnato.jpg';
  }

  saveChanges(): void {
    if (!this.result) return;

    if (!this.hasPendingModifications) {
      this.isEditable = false;
      return;
    }

    Object.assign(this.result, this.pendingModifications);
    this.aiService.setCurrentResult(this.result);
    this.pendingModifications = {};
    this.isEditable = false;
  }

  cancelEditing(): void {
    this.pendingModifications = {};
    this.isEditable = false;
  }

  changeImage(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const newPathBase64 = reader.result as string;
      if (!this.result) return;

      if (newPathBase64 === (this.result.imagePath ?? '')) {
        const { imagePath: _, ...rest } = this.pendingModifications;
        this.pendingModifications = rest;
        return;
      }

      this.pendingModifications = {
        ...this.pendingModifications,
        imagePath: newPathBase64,
      };
    };
    reader.readAsDataURL(file);
  }

  enableEditing(): void{
    this.pendingModifications = {};
    this.isEditable = true;
    this.readonly = false;
  }

  onRatingChange(rating: number): void {
    if (!this.result) return;

    this.result.evaluation = rating;
    this.aiService.setEvaluation(this.result.id, rating);
  }

  reuseGeneration(): void {
    this.aiService.reuse(this.result?.tone ?? { id: 0, name: '' }, this.result?.style ?? { id: 0, name: '' }, this.result?.company ?? { id: 0, name: '' }, this.result?.prompt ?? '');
  }

  duplicateGeneration(): void {
    this.router.navigate(['/generatore'], {
      state: {
      tone: this.result?.tone ?? { id: 0, name: '' },
      style: this.result?.style ?? { id: 0, name: '' },
      company: this.result?.company ?? { id: 0, name: '' },
      prompt: this.result?.prompt ?? ''
      }
    });
    // this.aiService.duplicate(this.result?.tone ?? { id: 0, name: '' }, this.result?.style ?? { id: 0, name: '' }, this.result?.company ?? { id: 0, name: '' }, this.result?.prompt ?? '');
  }

}
