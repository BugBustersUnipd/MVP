import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
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
  isImageTitleLoading: boolean = false;
  isContentLoading: boolean = false;

  // Riferimento unico al result: non viene modificato finche' non si salva.
  result = signal<ResultAiAssistant | null>((history.state?.result as ResultAiAssistant | null) ?? null);
  pendingModifications: Partial<ResultAiAssistant> = {};
  pendingImagePath = signal<string | null>(null);
  imagePathForView = computed(() => this.pendingImagePath() ?? (this.result()?.imagePath || '/PlaceHolder-GufoBagnato.jpg'));

  constructor() {
    if (this.result()) {
      console.log('Generazione completata, navigazione al risultato con:', this.result());

      this.aiService.setCurrentResult(this.result());
      console.log('Generazione completata, navigazione al risultato con:', this.result());

    }

    this.aiService.currentResult$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => {
        this.result.set(updated);
        this.updateImageTitleLoading(updated);
        this.updateContentLoading(updated);
        window.history.replaceState({ ...(history.state ?? {}), result: updated }, '');//questo serve per mantenere l'oggetto result in memoria anche se l'utente aggiorna la pagina
        console.log('Generazione completata, navigazione al risultato con:', this.result());

      });

    this.aiService.currentGenerationError$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((errorMessage) => {
        if (!errorMessage) return;
        this.router.navigate(['/generatore']); //ritorna al generatore in caso di errore
        window.alert(errorMessage);
        this.aiService.clearGenerationError();
      });

    this.updateImageTitleLoading(this.result());
    this.updateContentLoading(this.result());
  }

  private updateImageTitleLoading(result: ResultAiAssistant | null): void {
    console.log('Aggiornamento loading image/title per result:', result);
    if (!result || result.id!== null) {
      this.isImageTitleLoading = false;
      return;
    }

    const hasTitle = typeof result.title === 'string' && result.title.trim().length > 0;
    const hasImage = typeof result.imagePath === 'string' && result.imagePath.trim().length > 0;
    this.isImageTitleLoading = !hasTitle || !hasImage;
  }

  private updateContentLoading(result: ResultAiAssistant | null): void {
    if (!result || result.id!== null) {
      this.isContentLoading = false;
      return;
    }

    const hasContent = typeof result.content === 'string' && result.content.trim().length > 0;
    this.isContentLoading = !hasContent;
  }

  onRigenera(id: number|null): void {
    this.aiService.regenerate(id);
    // this.aiService.requireGeneration(this.result?.prompt ?? '', this.result?.tone ?? { id: 0, name: '' }, this.result?.style ?? { id: 0, name: '' }, this.result?.company ?? { id: 0, name: '' }, id);
  }

  onSalva(): void {
    const current = this.result();
    if (!current) return;

    this.aiService.createPost(current);
    // this.router.navigate(['/storico-ai-assistant']);
  }

  deleteGeneration(): void {
    this.aiService.removeGeneration(this.result()?.id ?? 0);
    this.router.navigate(['/generatore']);
  }

  get hasPendingModifications(): boolean {
    return Object.keys(this.pendingModifications).length > 0;
  }

  private normalizeValue(value: string | null | undefined): string {
    return value ?? '';
  }

  onFieldModified(field: 'title' | 'content', value: string): void {
    const current = this.result();
    if (!current) return;

    const original = this.normalizeValue(current[field]);
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
    return this.result()?.title ?? '';
  }

  getContentValue(): string {
    const value = this.pendingModifications.content;
    if (typeof value === 'string') return value;
    return this.result()?.content ?? '';
  }

  getImagePathValue(): string {
    return this.imagePathForView();
  }

  saveChanges(): void {
    const current = this.result();
    if (!current) return;

    if (!this.hasPendingModifications) {
      this.isEditable = false;
      return;
    }

    const merged: ResultAiAssistant = {
      ...current,
      ...this.pendingModifications,
    };
    this.result.set(merged);
    this.aiService.setCurrentResult(merged);
    this.pendingModifications = {};
    this.pendingImagePath.set(null);
    this.isEditable = false;
  }

  cancelEditing(): void {
    this.pendingModifications = {};
    this.pendingImagePath.set(null);
    this.isEditable = false;
  }

  changeImage(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const newPathBase64 = reader.result as string;
      const current = this.result();
      if (!current) return;

      if (newPathBase64 === (current.imagePath ?? '')) {
        const { imagePath: _, ...rest } = this.pendingModifications;
        this.pendingModifications = rest;
        this.pendingImagePath.set(null);
        return;
      }

      this.pendingModifications = {
        ...this.pendingModifications,
        imagePath: newPathBase64,
      };
      this.pendingImagePath.set(newPathBase64);
    };
    reader.readAsDataURL(file);
  }

  enableEditing(): void{
    this.pendingModifications = {};
    this.pendingImagePath.set(null);
    this.isEditable = true;
    this.readonly = false;
  }

  onRatingChange(rating: number): void {
    const current = this.result();
    if (!current) return;

    this.result.set({
      ...current,
      evaluation: rating,
    });
    this.aiService.setEvaluation(current.generatedDatumId, rating);
  }

  reuseGeneration(): void {
    const current = this.result();
    this.aiService.reuse(current?.tone ?? { id: 0, name: '' }, current?.style ?? { id: 0, name: '' }, current?.company ?? { id: 0, name: '' }, current?.prompt ?? '');
  }

  duplicateGeneration(): void {
    const current = this.result();
    this.router.navigate(['/generatore'], {
      state: {
      tone: current?.tone ?? { id: 0, name: '' },
      style: current?.style ?? { id: 0, name: '' },
      company: current?.company ?? { id: 0, name: '' },
      prompt: current?.prompt ?? ''
      }
    });
    // this.aiService.duplicate(this.result?.tone ?? { id: 0, name: '' }, this.result?.style ?? { id: 0, name: '' }, this.result?.company ?? { id: 0, name: '' }, this.result?.prompt ?? '');
  }

}
