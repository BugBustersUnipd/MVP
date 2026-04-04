import { Injectable } from '@angular/core';
import { ResultAiAssistant } from '../models/result-ai-assistant.model';
import { Tone, Style, Company } from '../models/result-ai-assistant.model';
@Injectable({
  providedIn: 'root'
})
export class ResultAiAssistantSerializer {
  /**
   * Serializza un risultato AI Assistant nel payload richiesto da POST /posts.
   * @param result Risultato da persistere come post.
   * @returns Oggetto request con naming backend.
   */
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

  /**
   * Estrae l'id del post creato dalla risposta backend.
   * @param payload Risposta grezza del backend.
   * @returns Id numerico del post (fallback 0).
   */
  deserializeCreatePostResponseId(payload: any): number {
    const source = this.isRecord(payload) ? payload : {};
    return this.asNumber(source['id'], 0);
  }

  /**
   * Serializza i parametri di generazione nel payload per POST /generated_data.
   * @param prompt Prompt utente.
   * @param tone Tono selezionato.
   * @param style Stile selezionato.
   * @param company Azienda selezionata.
   * @returns Payload compatibile con il backend.
   */
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

  /**
   * Estrae l'id di generazione dalla risposta iniziale backend.
   * @param payload Risposta grezza del backend.
   * @returns Id generazione valido oppure 0.
   */
  deserializeGenerationStartResponse(payload: any): number {
    const source = this.isRecord(payload) ? payload : {};
    const id = this.asNumber(source['id'], 0);
    if (id > 0) {
      return id;
    }

    return this.asNumber(source['generated_datum_id'], 0);
  }

  /**
   * Serializza i dati per la creazione di un tono.
   * @param name Nome tono.
   * @param code Descrizione/codice tono.
   * @param companyId Id azienda proprietaria.
   * @returns Payload tone per il backend.
   */
  serializeNewToneRequest(name: string, code: string, companyId: number): { tone: { name: string; description: string; company_id: number } } {
    return {
      tone: {
        name,
        description: code,
        company_id: companyId
      }
    };
  }

  /**
   * Serializza i dati per la creazione di uno stile.
   * @param name Nome stile.
   * @param code Descrizione/codice stile.
   * @param companyId Id azienda proprietaria.
   * @returns Payload style per il backend.
   */
  serializeNewStyleRequest(name: string, code: string, companyId: number): { style: { name: string; description: string; company_id: number } } {
    return {
      style: {
        name,
        description: code,
        company_id: companyId
      }
    };
  }

  /**
   * Deserializza la collezione toni dalla risposta backend.
   * @param payload Risposta grezza con lista toni.
   * @returns Lista normalizzata di toni.
   */
  deserializeTonesResponse(payload: any): Tone[] {
    return this.deserializeNamedCollection(payload, 'tones');
  }

  /**
   * Deserializza la collezione stili dalla risposta backend.
   * @param payload Risposta grezza con lista stili.
   * @returns Lista normalizzata di stili.
   */
  deserializeStylesResponse(payload: any): Style[] {
    return this.deserializeNamedCollection(payload, 'styles');
  }

  /**
   * Deserializza un singolo tono.
   * @param payload Oggetto grezzo tono.
   * @returns Tono normalizzato.
   */
  deserializeToneItem(payload: any): Tone {
    return this.deserializeNamedItem(payload);
  }

  /**
   * Deserializza un singolo stile.
   * @param payload Oggetto grezzo stile.
   * @returns Stile normalizzato.
   */
  deserializeStyleItem(payload: any): Style {
    return this.deserializeNamedItem(payload);
  }

  /**
   * Deserializza la lista aziende dalla risposta backend.
   * @param payload Risposta grezza con companies.
   * @returns Lista normalizzata di aziende.
   */
  deserializeCompaniesResponse(payload: any): Company[] {
    if (!this.isRecord(payload)) {
      return [];
    }

    const companies = payload['companies'];
    if (!Array.isArray(companies)) {
      return [];
    }

    return companies.map((item) => this.deserializeCompanyItem(item));
  }

  /**
   * Deserializza una singola azienda.
   * @param payload Oggetto grezzo azienda.
   * @returns Azienda normalizzata.
   */
  deserializeCompanyItem(payload: any): Company {
    const source = this.isRecord(payload) ? payload : {};
    return {
      id: this.asNumber(source['id'], 0),
      name: this.asString(source['name'])
    };
  }

  /**
   * Deserializza la lista post storici AI Assistant.
   * @param payload Risposta grezza con posts.
   * @returns Lista normalizzata di risultati.
   */
  deserializePostsResponse(payload: any): ResultAiAssistant[] {
    if (this.isRecord(payload)) {
      const posts = payload['posts'];
      if (Array.isArray(posts)) {
        return posts.map((item) => this.deserializePostItem(item));
      }
    }

    return [];
  }

  /**
   * Deserializza un singolo post nel model ResultAiAssistant.
   * @param payload Oggetto grezzo post.
   * @returns Risultato AI Assistant pronto per la UI.
   */
  deserializePostItem(payload: any): ResultAiAssistant {
    const source = this.isRecord(payload) ? payload : {};

    const tone = this.deserializeToneItem({
      id: source['toneId'],
      name: source['toneName'],
      isActive: source['is_tone_active']
    });

    const style = this.deserializeStyleItem({
      id: source['styleId'],
      name: source['styleName'],
      isActive: source['is_style_active']
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

  // Questi metodi aiutano a garantire che i dati siano del tipo corretto e forniscono valori di fallback in caso contrario. Possono essere estesi o modificati in base alle esigenze specifiche.
  
  /**
   * Type guard per verificare che un valore sia un record semplice.
   * @param value Valore da verificare.
   * @returns True se il valore e un oggetto non array.
   */
  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Converte un valore in stringa con fallback.
   * @param value Valore di input.
   * @param fallback Fallback in caso di tipo non valido.
   * @returns Stringa normalizzata.
   */
  private asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
  }

  /**
   * Converte un valore in numero finito con fallback.
   * @param value Valore di input.
   * @param fallback Fallback in caso di tipo non valido.
   * @returns Numero normalizzato.
   */
  private asNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  /**
   * Converte un valore in booleano supportando stringhe e numeri.
   * @param value Valore di input.
   * @param defaultValue Valore di default se non convertibile.
   * @returns Boolean normalizzato.
   */
  private asBoolean(value: unknown, defaultValue: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    if (typeof value === 'number') return value !== 0;
    return defaultValue;
  }
  
  /**
   * Converte un valore in Date valida con fallback epoch.
   * @param value Valore data in ingresso.
   * @returns Data normalizzata.
   */
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

  /**
   * Converte un valore in numero nullable.
   * @param value Valore di input.
   * @returns Numero valido oppure null.
   */
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

  /**
   * Converte un valore in stringa nullable.
   * @param value Valore di input.
   * @returns Stringa oppure null.
   */
  private asNullableString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  /**
   * Deserializza una collezione named (tones/styles) in array tipizzato.
   * @param payload Risposta grezza backend.
   * @param key Chiave della collezione da leggere.
   * @returns Collezione normalizzata.
   */
  private deserializeNamedCollection(payload: any, key: 'tones' | 'styles'): Array<Tone | Style> {
    if (!this.isRecord(payload)) {
      return [];
    }

    const items = payload[key];
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item) => this.deserializeNamedItem(item));
  }

  /**
   * Deserializza un elemento tone/style condividendo la stessa logica.
   * @param payload Oggetto grezzo item.
   * @returns Oggetto normalizzato con id, name, isActive.
   */
  private deserializeNamedItem(payload: any): Tone | Style {
    const source = this.isRecord(payload) ? payload : {};
    return {
      id: this.asNumber(source['id'], 0),
      name: this.asString(source['name']),
      isActive: this.asBoolean(source['isActive'], true)
    };
  }
}