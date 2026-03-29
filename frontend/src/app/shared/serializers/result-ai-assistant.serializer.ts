import { Injectable } from '@angular/core';
import { ResultAiAssistant } from '../models/result-ai-assistant.model';
import { ResultSerializer } from './result.serializer';
import { Tone, Style } from '../models/result-ai-assistant.model';
@Injectable({
  providedIn: 'root'
})
export class ResultAiAssistantSerializer extends ResultSerializer<ResultAiAssistant> {
  serialize(payload: unknown[]): ResultAiAssistant {
    const source = this.normalizePayload(payload); // Normalizza il payload per supportare sia array posizionali che oggetti chiave-valore

    return {
      id: this.asNumber(source['id'], 0),
      title: this.asString(source['title']),
      content: this.asString(source['content']),
      imagePath: this.asString(source['imagePath']), //da ricordare che il backend potrebbe non restituire un imagePath (immagine precedentemente tolta dall'utente e salvato così), deve essere messo null
      tone: { id: this.asNumber(source['toneID']), name: this.asString(source['toneName']) } as Tone,
      style: { id: this.asNumber(source['styleID']), name: this.asString(source['styleName']) } as Style,
      company: { id: this.asNumber(source['companyID']), name: this.asString(source['companyName']) },
      data: this.asDate(source['data']),
      prompt: this.asString(source['prompt']),
      evaluation: this.asNumber(source['evaluation'], 0),
      isPost: typeof source['isPost'] === 'boolean' ? source['isPost'] : true, // default a true se non specificato, da modificare in base alla logica di business
      generatedDatumId: this.asNumber(source['generatedDatumId'], 0) // Se il campo è opzionale, potrebbe essere null o undefined, gestito come null
    };
  }

  deserialize(result: ResultAiAssistant): unknown[] {
    return [
      {
        id: result.id,
        title: result.title,
        content: result.content,
        imagePath: result.imagePath,
        tone: result.tone,
        style: result.style,
        data: result.data.toISOString(),
        prompt: result.prompt,
        evaluation: result.evaluation
      }
    ];
  }

// La logica di normalizzazione è un esempio e potrebbe essere adattata in base alla struttura effettiva del payload che riceverai dal backend. L'obiettivo è rendere il serializer flessibile per supportare sia formati legacy che nuovi formati basati su oggetti.
  private normalizePayload(payload: unknown[]): Record<string, unknown> {
    if (payload.length === 1 && this.isRecord(payload[0])) {
      return payload[0];
    }

    // Fallback for legacy positional arrays while backend contract is not final.
    const keys = ['id', 'title', 'content', 'imagePath', 'tone', 'style', 'data', 'prompt', 'evaluation'];
    const normalized: Record<string, unknown> = {};

    keys.forEach((key, index) => {
      normalized[key] = payload[index];
    });

    return normalized;
  }
  // Questi metodi aiutano a garantire che i dati siano del tipo corretto e forniscono valori di fallback in caso contrario. Possono essere estesi o modificati in base alle esigenze specifiche.
  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
  }

  private asNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  private asDate(value: unknown): Date {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date(0);
  }
}



//Quando definisci il backend reale, devi cambiare solo:
// la logica in normalizePayload
// la forma di output in deserialize