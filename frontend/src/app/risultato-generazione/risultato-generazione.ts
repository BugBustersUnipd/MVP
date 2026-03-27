// cose che mancano ancora:
// prefisporre il click sulla valutazione
// cliccando su Annulla modifiche deve ritornare come prima il resultLocale (qui c'è da modificare un po!)
// gestione degli errori, aiAssistantService potrebbe rimbalzare un errore del backend, che dobbiamo visualizzare

import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageTitle } from '../components/image-title/image-title';
import { FormsModule } from '@angular/forms';
import { Button } from '../components/button/button';
import { Editor } from '../components/editor/editor';
import { Prompt } from '../components/prompt/prompt';
import { Valutazione } from '../components/valutazione/valutazione';
import { Menutendina } from '../components/menutendina/menutendina';
import { Dialog } from '../components/dialog/dialog';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

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
  isEditable: boolean = false;
  readonly: boolean = true;

  // Variabili per tenere traccia delle modifiche in sospeso, per evitare di fare chiamata backend senza reali modifiche
  private pendingImagePath: string | null = null;
  private pendingTitle: string | null = null;
  private pendingContent: string | null = null;

  // Inizializza il risultato con i dati result passati dalla la pagina precedente
  private initialResult = (history.state?.result as ResultAiAssistant | null) ?? null;

  //questo è il ponte di collegamento con il currentResult$ di AiAssistantService, toSignal meglio di subscribe
  private serviceResult = toSignal(
    this.aiService.currentResult$.pipe(map(r => (r ? { ...r } : null))),
    { initialValue: this.initialResult }
  );

  //signal scrivibile, copia del service: serve per permettere set in changeImage, usando quindi l'observable ed evitando datectChanges
  localResult = signal<ResultAiAssistant | null>(this.initialResult);

  //cosa particolare che permette di sincronizzare il localResult con serviceResult
  constructor() { 
    if (this.initialResult) {
      this.aiService.setCurrentResult(this.initialResult);
    }

    effect(() => {
      const r = this.serviceResult();
      if (r) {
        this.localResult.set({ ...r });
      }
    });
  }

  onRigenera(id: number): void {
    this.aiService.requireGeneration(this.localResult()?.prompt ?? '', this.localResult()?.tone ?? { id: 0, name: '' }, this.localResult()?.style ?? { id: 0, name: '' },this.localResult()?.company ?? { id: 0, name: '' }, id);
  }
  onSalva(): void {
    const current = this.localResult();
    if (!current) return;

    this.aiService.createPost(current);
    // this.router.navigate(['/storico-ai-assistant']);
  }
  deleteGeneration(): void {
    this.aiService.removeGeneration(this.localResult()?.id ?? 0);
    this.router.navigate(['/generatore']);
  }

  //fa le chiamate al servizio (e quindi al backend) solo se ci sono stata modifiche effettive
  saveChanges(): void {
    let current = this.localResult();
    if (!current) return;

    if (this.pendingImagePath !== null) {
      this.aiService.modifyImageLocal(current, this.pendingImagePath);
      current = { ...current, imagePath: this.pendingImagePath };
      this.pendingImagePath =null;
    }

    if (this.pendingTitle !== null) {
      this.aiService.modifyTitleLocal(current, this.pendingTitle);
      current = { ...current, title: this.pendingTitle };
      this.pendingTitle =null;
    }
    if (this.pendingContent !== null) {
      this.aiService.modifyContentLocal(current, this.pendingContent);
      current = { ...current, content: this.pendingContent };
      this.pendingContent =null;
    }

    this.localResult.set(current);
  }

  // questo fa due cose: aggiorna l'anteprima locale (motivo per cui il signal serviva scrivibile) e setta pendingImagePath, predisponendo un salvataggio vero
  changeImage(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const nuovoPathBase64 = reader.result as string;
      const current = this.localResult();
      if (!current) return;

      this.pendingImagePath = nuovoPathBase64;

      this.localResult.set({
        ...current,
        imagePath: nuovoPathBase64,
      });
    };
    reader.readAsDataURL(file);
  }
  enableEditing(): void{
    this.isEditable = true;
    this.readonly = false;
  }

  onRatingChange(rating: number): void {
    const current = this.localResult();
    if (!current) return;

    this.localResult.set({
      ...current,
      evaluation: rating
    });
    this.aiService.setEvaluation(current.id, rating);
  }

  reuseGeneration(): void {
    this.aiService.reuse(this.localResult()?.tone ?? { id: 0, name: '' }, this.localResult()?.style ?? { id: 0, name: '' }, this.localResult()?.company ?? { id: 0, name: '' }, this.localResult()?.prompt ?? '');
  }

  duplicateGeneration(): void {
    this.router.navigate(['/generatore'], {
      state: {
      tone: this.localResult()?.tone ?? { id: 0, name: '' },
      style: this.localResult()?.style ?? { id: 0, name: '' },
      company: this.localResult()?.company ?? { id: 0, name: '' },
      prompt: this.localResult()?.prompt ?? ''
      }
    });
    // this.aiService.duplicate(this.localResult()?.tone ?? { id: 0, name: '' }, this.localResult()?.style ?? { id: 0, name: '' }, this.localResult()?.company ?? { id: 0, name: '' }, this.localResult()?.prompt ?? '');
  }

}
