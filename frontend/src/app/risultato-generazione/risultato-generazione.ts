import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageTitle } from '../components/image-title/image-title';
import { FormsModule } from '@angular/forms';
import { Button } from '../components/button/button';
import { Editor } from '../components/editor/editor';
import { Prompt } from '../components/prompt/prompt';
import { Valutazione } from '../components/valutazione/valutazione';
import { SelectComponent } from '../components/menutendina/menutendina';
import { Dialog } from '../components/dialog/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ResultAiAssistant } from '../shared/models/result-ai-assistant.model';
import { AiAssistantService } from '../../services/ai-assistant-service/ai-assistant-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-risultato-generazione',
  imports: [ImageTitle, FormsModule, Button, Prompt, Editor, Valutazione, SelectComponent, CommonModule, Dialog],
  templateUrl: './risultato-generazione.html',
  styleUrl: './risultato-generazione.css',
})
export class RisultatoGenerazione {
  private aiService = inject(AiAssistantService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  isEditable: boolean = false;
  isImageTitleLoading: boolean = false;
  isContentLoading: boolean = false;

  // Riferimento unico al result: non viene modificato finche' non si salva.
  result = signal<ResultAiAssistant | null>((history.state?.result as ResultAiAssistant | null) ?? null);
  
  // Partial permette di non specificare tutti i campi, ma solo quelli
  pendingModifications: Partial<ResultAiAssistant> = {};
  pendingImagePath = signal<string | null>(null);
  // Se c'è un'immagine in pending (in modifica), mostra quella, altrimenti quella del risultato
  imagePathForView = computed(() => this.pendingImagePath() ?? this.result()?.imagePath ?? '');

  constructor() {
    if (this.result()) {
      // il result preso dallo stato di navigazione (da generatore) viene settato anche nel service, per avere coerenza tra i due
      this.aiService.setCurrentResult(this.result());
    }

    // attiva durante la permanenza nella pagina: riceve l'ultimo valore presente nel subject del service e mantiene sincronizzazione e aggiornamenti successivi (es websocket)
    // utile anche da storico-ai-assistant viene fatto il set e qui si riceve il valore aggiornato
    this.aiService.currentResult$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => {
        // quando arriva il risultato aggiornato viene impostato e i loading non vengono più mostrati
        this.result.set(updated);
        this.updateImageTitleLoading(updated);
        this.updateContentLoading(updated);

        window.history.replaceState({ ...(history.state ?? {}), result: updated }, '');//questo serve per mantenere l'oggetto result in memoria anche se l'utente aggiorna la pagina
      });

    // come sopra, ma per gli errori
    this.aiService.currentGenerationError$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((errorMessage) => {
        if (!errorMessage) return;
        if(!(errorMessage.toLowerCase().includes('1 e 5'))){
          this.router.navigate(['/generatore']);
        }
        window.alert(errorMessage);
        this.aiService.clearGenerationError();
      });

    this.updateImageTitleLoading(this.result());
    this.updateContentLoading(this.result());
  }

  /**
   * Aggiorna il loader dedicato a titolo/immagine in base al risultato corrente.
   * @param result Risultato attuale della generazione.
   */
  private updateImageTitleLoading(result: ResultAiAssistant | null): void {
    if (!result || result.id!== null) {
      this.isImageTitleLoading = false;
      return;
    }
    const hasTitle = typeof result.title === 'string' && result.title.trim().length > 0;
    const hasImage = typeof result.imagePath === 'string' && result.imagePath.trim().length > 0;
    this.isImageTitleLoading = !hasTitle || !hasImage;
  }

  /**
   * Aggiorna il loader del contenuto testuale in base al risultato corrente.
   * @param result Risultato attuale della generazione.
   */
  private updateContentLoading(result: ResultAiAssistant | null): void {
    if (!result || result.id!== null) {
      this.isContentLoading = false;
      return;
    }
    const hasContent = typeof result.content === 'string' && result.content.trim().length > 0;
    this.isContentLoading = !hasContent;
  }

  /**
   * Avvia la rigenerazione del contenuto corrente.
   * @param id Id ricevuto dal componente chiamante.
   */
  onRigenera(id: number|null): void {
    this.aiService.regenerateCurrent();
  }

  /**
   * Salva il risultato corrente come post.
   */
  onSalva(): void {
    const current = this.result();
    if (!current) return;
    this.aiService.createCurrentPost();
  }

  /**
   * Elimina la generazione corrente e torna al generatore.
   */
  deleteGeneration(): void {
    this.aiService.deletePost(this.result()?.id ?? 0);
    this.router.navigate(['/generatore']);
  }

  discardGeneration(): void {
    this.aiService.setEvaluation(this.result()?.generatedDatumId ?? null, 1);
    this.router.navigate(['/generatore']);
  }

  get hasPendingModifications(): boolean {
    return Object.keys(this.pendingModifications).length > 0;
  }

  /**
   * Normalizza un valore stringa gestendo null/undefined.
   * @param value Valore di input.
   * @returns Stringa normalizzata.
   */
  private normalizeValue(value: string | null | undefined): string {
    return value ?? '';
  }

  /**
   * Registra una modifica locale ai campi editabili (titolo o contenuto).
   * @param field Campo modificato.
   * @param value Nuovo valore inserito.
   */
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

  /**
   * Restituisce il titolo da mostrare in editor (pending o corrente).
   * @returns Titolo visualizzato in UI.
   */
  getTitleValue(): string {
    const value = this.pendingModifications.title;
    if (typeof value === 'string') return value;
    return this.result()?.title ?? '';
  }

  /**
   * Restituisce il contenuto da mostrare in editor (pending o corrente).
   * @returns Contenuto visualizzato in UI.
   */
  getContentValue(): string {
    const value = this.pendingModifications.content;
    if (typeof value === 'string') return value;
    return this.result()?.content ?? '';
  }

  /**
   * Restituisce l'URL immagine pronto per la preview.
   * @returns Path assoluto/base64 dell'immagine da mostrare.
   */
  getImagePathValue(): string {
    const path = this.imagePathForView();
    if (path && !path.startsWith('data:') && !path.startsWith('http')) {
      return `http://localhost:3000${path}`;
    }
    return path;
  }

  /**
   * Applica e salva le modifiche locali sul risultato corrente.
   */
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

  /**
   * Annulla la modalita editing scartando modifiche pendenti.
   */
  cancelEditing(): void {
    this.pendingModifications = {};
    this.pendingImagePath.set(null);
    this.isEditable = false;
  }

  /**
   * Carica una nuova immagine, la converte in base64 e la mette in pending.
   * @param file File selezionato dall'utente.
   */
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

  /**
   * Abilita l'editing azzerando lo stato pending precedente.
   */
  enableEditing(): void{
    this.pendingModifications = {};
    this.pendingImagePath.set(null);
    this.isEditable = true;
  }

  /**
   * Invia la valutazione utente del risultato corrente.
   * @param rating Valore rating selezionato.
   */
  onRatingChange(rating: number): void {
    const current = this.result();
    if (!current) return;
    this.aiService.setEvaluation(current.generatedDatumId, rating);
  }

  /**
   * Riusa i parametri della generazione corrente per una nuova richiesta.
   */
  reuseGeneration(): void {
    const current = this.result();
    this.aiService.reuse(current?.tone ?? { id: 0, name: '', isActive: false }, current?.style ?? { id: 0, name: '', isActive: false }, current?.company ?? { id: 0, name:''}, current?.prompt ?? '');
  }

  /**
   * Duplica la generazione corrente aprendo il generatore con stato precompilato.
   */
  duplicateGeneration(): void {
    const current = this.result();
    this.router.navigate(['/generatore'], {
      state: {
      tone: current?.tone ?? { id: 0, name: '', isActive: false },
      style: current?.style ?? { id: 0, name: '', isActive: false },
      company: current?.company ?? { id: 0, name: '' },
      prompt: current?.prompt ?? ''
      }
    });
    // this.aiService.duplicate(this.result?.tone ?? { id: 0, name: '' }, this.result?.style ?? { id: 0, name: '' }, this.result?.company ?? { id: 0, name: '' }, this.result?.prompt ?? '');
  }

}
