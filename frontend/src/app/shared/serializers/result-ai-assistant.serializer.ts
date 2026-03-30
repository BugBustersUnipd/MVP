import { Injectable } from '@angular/core';
import { ResultAiAssistant } from '../models/result-ai-assistant.model';
import { ResultSerializer } from './result.serializer';
import { Tone, Style, Company } from '../models/result-ai-assistant.model';
@Injectable({
  providedIn: 'root'
})
export class ResultAiAssistantSerializer extends ResultSerializer<ResultAiAssistant> {
  serializeCreatePostRequest(result: ResultAiAssistant): {
    generated_datum_id: number | null;
    title: string;
    body_text: string;
    img_path: string | null;
    date_time: Date;
  } {
    return {
      generated_datum_id: result.generatedDatumId,
      title: result.title,
      body_text: result.content,
      img_path: result.imagePath,
      date_time: result.data
    };
  }

  deserializeCreatePostResponseId(payload: unknown): number {
    const source = this.isRecord(payload) ? payload : {};
    return this.asNumber(source['id'], 0);
  }

  serializeRequireGenerationRequest(prompt: string, tone: Tone, style: Style, company: Company): {
    generation_datum: { prompt: string; company_id: number; style_id: number; tone_id: number }
  } {
    return {
      generation_datum: {
        prompt,
        company_id: company.id,
        style_id: style.id,
        tone_id: tone.id
      }
    };
  }

  deserializeGenerationStartResponse(payload: unknown): number {
    const source = this.isRecord(payload) ? payload : {};
    const id = this.asNumber(source['id'], 0);
    if (id > 0) {
      return id;
    }

    return this.asNumber(source['generated_datum_id'], 0);
  }

  serializeNewToneRequest(name: string, code: string, companyId: number): { tone: { name: string; description: string; company_id: number } } {
    return {
      tone: {
        name,
        description: code,
        company_id: companyId
      }
    };
  }

  serializeNewStyleRequest(name: string, code: string, companyId: number): { style: { name: string; description: string; company_id: number } } {
    return {
      style: {
        name,
        description: code,
        company_id: companyId
      }
    };
  }

  deserializeTonesResponse(payload: unknown): Tone[] {
    return this.deserializeNamedCollection(payload, 'tones');
  }

  deserializeStylesResponse(payload: unknown): Style[] {
    return this.deserializeNamedCollection(payload, 'styles');
  }

  deserializeToneItem(payload: unknown): Tone {
    return this.deserializeNamedItem(payload);
  }

  deserializeStyleItem(payload: unknown): Style {
    return this.deserializeNamedItem(payload);
  }

  deserializeCompaniesResponse(payload: unknown): Company[] {
    if (!this.isRecord(payload)) {
      return [];
    }

    const companies = payload['companies'];
    if (!Array.isArray(companies)) {
      return [];
    }

    return companies.map((item) => this.deserializeCompanyItem(item));
  }

  deserializeCompanyItem(payload: unknown): Company {
    const source = this.isRecord(payload) ? payload : {};
    return {
      id: this.asNumber(source['id'], 0),
      name: this.asString(source['name'])
    };
  }

  deserializePostsResponse(payload: unknown): ResultAiAssistant[] {
    if (this.isRecord(payload)) {
      const posts = payload['posts'];
      if (Array.isArray(posts)) {
        return posts.map((item) => this.deserializePostItem(item));
      }
    }

    return [];
  }

  deserializePostItem(payload: unknown): ResultAiAssistant {
    const source = this.isRecord(payload) ? payload : {};

    const tone = this.deserializeToneItem({
      id: source['toneId'],
      name: source['toneName']
    });

    const style = this.deserializeStyleItem({
      id: source['styleId'],
      name: source['styleName']
    });

    const company = this.deserializeCompanyItem({
      id: source['companyId'],
      name: source['companyName']
    });

    return {
      id: this.asNumber(source['id'], 0),
      title: this.asString(source['title']),
      content: this.asString(source['PostText']),
      imagePath: this.asNullableString(source['imgPath']),
      tone,
      style,
      company,
      data: this.asDate(source['dateTime']),
      prompt: this.asString(source['prompt']),
      evaluation: this.asNullableNumber(source['rating']) ?? -1,
      generatedDatumId: this.asNumber(source['generatedDatumId'], 0)
    };
  }

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

  private asNullableNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private asNullableString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private deserializeNamedCollection(payload: unknown, key: 'tones' | 'styles'): Array<Tone | Style> {
    if (!this.isRecord(payload)) {
      return [];
    }

    const items = payload[key];
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item) => this.deserializeNamedItem(item));
  }

  private deserializeNamedItem(payload: unknown): Tone | Style {
    const source = this.isRecord(payload) ? payload : {};
    return {
      id: this.asNumber(source['id'], 0),
      name: this.asString(source['name'])
    };
  }
}