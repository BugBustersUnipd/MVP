/* appunti utili:
* - BehaviorSubject è un tipo particolare di observable (libreria rxjs) che mantiene sempre l'ultimo valore emesso: un subject normale non ha memoria, i subscriber ricevono solo i valori futuri. Si usa per implementare una logica simile a uno "store"
  - tonesSubject e tones$ sono combinati per mantenere una separazione corretta dei ruoli: tones$ è read-only ed è pubblico e quindi i componenti possono solamente leggere il valore mentre tonesSubject è privato e il service lo usa per aggiornare il valore (e mandare la notifica contempoaneamente)
  - in generale il service mantiene memoria dei dati utili alle view, in questo modo non vengono fatte chiamate ridondanti al backend e si ha un punto centralizzato di gestione dello stato (ad esempio se più view devono conoscere i toni, questi vengono fetchati una volta sola e poi mantenuti in memoria dal service, tutte le view che si iscrivono a tones$ ricevono l'ultimo valore senza dover rifare la get al backend)
*/
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ResultAiAssistant } from '../../app/shared/models/result-ai-assistant.model';
import { Tone, Style, Company } from '../../app/shared/models/result-ai-assistant.model';
import { ResultAiAssistantSerializer } from '../../app/shared/serializers/result-ai-assistant.serializer';
import { BehaviorSubject } from 'rxjs';
const API_BASE = 'http://localhost:3000'; // Cambia con l'URL del tuo backend in produzione
const WS_URL = 'ws://localhost:3000/cable'; // wss:// in produzione

@Injectable({
  providedIn: 'root',
})
export class AiAssistantService {
  private serializer = inject(ResultAiAssistantSerializer);
  private http = inject(HttpClient);
  

  private tonesSubject = new BehaviorSubject<Tone[]>([]);
  tones$ = this.tonesSubject.asObservable();

  private allTonesSubject = new BehaviorSubject<Tone[]>([]);
  allTones$ = this.allTonesSubject.asObservable();

  private stylesSubject = new BehaviorSubject<Style[]>([]);
  styles$ = this.stylesSubject.asObservable();

  private allStylesSubject = new BehaviorSubject<Style[]>([]);
  allStyles$ = this.allStylesSubject.asObservable();

  private companiesSubject = new BehaviorSubject<Company[]>([]);
  companies$ = this.companiesSubject.asObservable();

  private resultSubject : BehaviorSubject<ResultAiAssistant | null> = new BehaviorSubject<ResultAiAssistant | null>(null);
  currentResult$ = this.resultSubject.asObservable();

  private generationErrorSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  currentGenerationError$ = this.generationErrorSubject.asObservable();

  private ResultsHistorySubject: BehaviorSubject<ResultAiAssistant[] | null> = new BehaviorSubject<ResultAiAssistant[] | null>(null);
  currentResultsHistory$ = this.ResultsHistorySubject.asObservable();

  constructor() {
    // modifica il currentResult che subisce modifiche anche in resultsHistorySubject, in questo modo lo storico resta sempre aggiornato
    this.currentResult$.subscribe((updated) => {
      if (updated && updated.id != null) {
        const history = this.ResultsHistorySubject.value ?? [];
        const existingIndex = history.findIndex(item => item.id === updated.id);
        
        if (existingIndex >= 0) {
          const nextHistory = [...history];
          nextHistory[existingIndex] = { ...updated };
          this.ResultsHistorySubject.next(nextHistory);
        }
      }
    });
  }

    /**
   * Estrae e normalizza i messaggi di errore dalle risposte HTTP del backend.
   * 
   * Processa gli errori ricevuti dalle chiamate HTTP, controllando molteplici possibili
   * formato di risposta dal backend per estrarre il messaggio di errore più significativo.
   * 
   * L'ordine di priorità per l'estrazione è:
   * 1. Array di errori in `error.error.errors`
   * 2. Stringa di errore singolo in `error.error.error`
   * 3. Messaggio in `error.error.message`
   * 4. Messaggio diretto in `error.message`
   * 5. Messaggio generico di fallback
   * 
   * @param {any} error - L'oggetto errore ricevuto dalla risposta HTTP
   * @returns {string} Messaggio di errore normalizzato da mostrare all'utente.
   *                   Ritorna un messaggio generico se l'errore non contiene informazioni valide.
   * 
   * @example
   * ```typescript
   * const errorMsg = this.extractErrorMessage({ 
   *   error: { 
   *     errors: ['Campo obbligatorio mancante', 'Formato non valido'] 
   *   } 
   * });
   * console.log(errorMsg); // 'Campo obbligatorio mancante, Formato non valido'
   * ```
   * 
   * @private
   */
  private extractErrorMessage(error: any): string {
    const generic = 'Errore durante la generazione. Riprova tra poco.';

    if (!error) return generic;

    const backendErrors = error?.error?.errors;
    if (Array.isArray(backendErrors) && backendErrors.length > 0) {
      return backendErrors.join(', ');
    }

    const backendError = error?.error?.error;
    if (typeof backendError === 'string' && backendError.trim().length > 0) {
      return backendError;
    }

    const backendMessage = error?.error?.message;
    if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
      return backendMessage;
    }

    const directMessage = error?.message;
    if (typeof directMessage === 'string' && directMessage.trim().length > 0) {
      return directMessage;
    }

    return generic;
  }

  /**
   * Estrae e normalizza i messaggi di errore dai messaggi WebSocket in tempo reale.
   * 
   * Processa gli errori ricevuti dal backend tramite WebSocket, come:
   * - Token scaduto
   * - Contenuto bloccato da guardrails
   * - Prompt non valido (es. spam di lettere)
   * 
   * @param {any} payload - Il payload del messaggio WebSocket ricevuto dal backend
   * @returns {string} Messaggio di errore normalizzato da mostrare all'utente.
   *                   Se il payload non contiene un errore valido, ritorna un messaggio generico.
   * 
   * @example
   * ```typescript
   * const errorMsg = this.extractRealtimeFailureMessage({ error: 'Token expired' });
   * console.log(errorMsg); // 'Token expired'
   * ```
   * 
   * @private
   */
  private extractRealtimeFailureMessage(payload: any): string {
    const generic = 'Generazione fallita per un errore interno.';

    const rawError = payload?.error;
    const message = typeof rawError === 'string' && rawError.trim().length > 0 ? rawError : generic;

    return message;
  }


  // todo anche eliminabile per mettere solo generationErrorSubject.next direttamente
  private notifyGenerationError(message: string): void {
    this.generationErrorSubject.next(message);
  }


  // pulisce l'errore di generazione attuale, in questo modo non riappare ogni volta (dato che i BehaviorSubject mandano la notifica a tutti i subscribers,anche se si iscrivono dopo)
  clearGenerationError(): void {
    this.generationErrorSubject.next(null);
  }

  // usata per impostare il result corrente dalla view, per esempio quando si apre un risultato dallo storico
  setCurrentResult(result: ResultAiAssistant | null): void {
    this.resultSubject.next(result ? { ...result } : null);
  }


  fetchAllTones(): void {
    const companies = this.companiesSubject.value ?? [];
    if (!companies.length) return;
    let allTones: Tone[] = [];
    let completed = 0;
    companies.forEach((company, idx) => {
      this.http.get<any>(`${API_BASE}/tones`, { params: { company_id: company.id } }).subscribe({
        next: (response) => {
          const tones = this.serializer.deserializeTonesResponse(response);
          allTones = allTones.concat(tones);
          completed++;
          if (completed === companies.length) {
            this.allTonesSubject.next(allTones);
          }
        },
        error: (err) => {
          console.error('Errore nel recupero dei toni per company', company.id, err);
          completed++;
          if (completed === companies.length) {
            this.allTonesSubject.next(allTones);
          }
        }
      });
    });
  }

  fetchAllStyles(): void {
    const companies = this.companiesSubject.value ?? [];
    if (!companies.length) return;
    let allStyles: Style[] = [];
    let completed = 0;
    companies.forEach((company, idx) => {
      this.http.get<any>(`${API_BASE}/styles`, { params: { company_id: company.id } }).subscribe({
        next: (response) => {
          const styles = this.serializer.deserializeStylesResponse(response);
          allStyles = allStyles.concat(styles);
          completed++;
          if (completed === companies.length) {
            this.allStylesSubject.next(allStyles);
          }
        },
        error: (err) => {
          console.error('Errore nel recupero degli stili per company', company.id, err);
          completed++;
          if (completed === companies.length) {
            this.allStylesSubject.next(allStyles);
          }
        }
      });
    });
  }

  fetchTonesByCompany(company: number, is_active?: boolean) : void {
    const params: any = { company_id: company };
    if (is_active !== undefined) {
      params.is_active = is_active;
    }
    this.http.get<any>(`${API_BASE}/tones`, { params }).subscribe({
      next: (response) => {
        const tones = this.serializer.deserializeTonesResponse(response);
        this.tonesSubject.next(tones);
        console.log('Toni recuperati:', tones);
      },
      error: (err) => console.error('Errore nel recupero dei toni:', err),
    });
  }
  
  fetchStylesByCompany(company: number, is_active?: boolean) : void {
    const params: any = { company_id: company };
    if (is_active !== undefined) {
      params.is_active = is_active;
    }
    this.http.get<any>(`${API_BASE}/styles`, { params }).subscribe({
        next: (response) => {
        const styles = this.serializer.deserializeStylesResponse(response);
        this.stylesSubject.next(styles);
        console.log('Stili recuperati:', styles);
      },
      error: (err) => console.error('Errore nel recupero dei toni:', err),
    });

  }
    /**
     * NOTA qui il serializer è stato usato per mantenere coerenza architetturale, tuttavia prima bastava una riga:
     * this.companiesSubject.next(response.companies);
     * tuttavia questo è migliore anche per una questione di robustezza e coerenza futura: unico punto centralizzato dove cambiare la deserializzazione degli elementi se il backend cambia->ai-assistant-serializer
     */
  fetchCompanies(): void {
    this.http.get<any>(`${API_BASE}/lookups/companies`).subscribe({
      next: (response) => {
        const companies = this.serializer.deserializeCompaniesResponse(response);
        this.companiesSubject.next(companies);
        console.log('Aziende recuperate:', companies);
        },
      error: (err) => console.error('Errore nel recupero delle aziende:', err),
    });
  }


  newTone(name: string, code: string, companyId: number) : void {
    const payload = this.serializer.serializeNewToneRequest(name, code, companyId);
    this.http.post<any>(`${API_BASE}/tones`, payload).subscribe({
      next: (response) => {
        const createdTone = this.serializer.deserializeToneItem(response);
        this.tonesSubject.next([...(this.tonesSubject.value ?? []), createdTone]);
        this.allTonesSubject.next([...(this.allTonesSubject.value ?? []), createdTone]);
        console.log('Tono creato:', createdTone);
      },
      error: (err) => console.error('Errore nella creazione del tono:', err),
    });
  }

  newStyle(name: string, code: string, companyId: number) : void {
    const payload = this.serializer.serializeNewStyleRequest(name, code, companyId);
    this.http.post<any>(`${API_BASE}/styles`, payload).subscribe({
      next: (response) => {
        console.log('Risposta alla creazione dello stile:', response);
        const createdStyle = this.serializer.deserializeStyleItem(response);
        this.stylesSubject.next([...(this.stylesSubject.value ?? []), createdStyle]);
        this.allStylesSubject.next([...(this.allStylesSubject.value ?? []), createdStyle]);
        console.log('Stile creato:', createdStyle);
      },
      error: (err) => console.error('Errore nella creazione dello stile:', err),
    });
  }

  removeTone(id: number) : void {
    this.http.delete<any>(`${API_BASE}/tones/${id}`, {}).subscribe({
      next: (response) => {
        console.log('Tono rimosso con successo:', response);
        this.tonesSubject.next(this.tonesSubject.value.filter(t => t.id !== id));
      },
      error: (err) => console.error('Errore nella rimozione del tono:', err),
    });
  }
  removeStyle(id: number) : void {
    this.http.delete<any>(`${API_BASE}/styles/${id}`, {}).subscribe({
      next: (response) => {
        console.log('Stile rimosso con successo:', response);
        this.stylesSubject.next(this.stylesSubject.value.filter(s => s.id !== id));
      },
      error: (err) => console.error('Errore nella rimozione dello stile:', err),
    });
  }

  // todo forse da togliere
  reuse(tone: Tone, style: Style, company: Company, prompt: string) : void {
    console.log('Riutilizzo richiesta con i seguenti parametri:', { tone, style, company, prompt });
    this.requireGeneration(prompt, tone, style, company);
  }


  deletePost(id: number): void {
    this.http.delete<any>(`${API_BASE}/posts/${id}`).subscribe({
      next: (response) => {
        console.log('[deletePost] Post rimosso con successo:', response);
        const nextHistory = (this.ResultsHistorySubject.value ?? []).filter((item) => item.id !== id);
        this.ResultsHistorySubject.next(nextHistory);

        if (this.resultSubject.value?.id === id) {
          this.resultSubject.next(null);
        }
      },
      error: (err) => {
        console.error('[deletePost] Errore nella DELETE /posts/:id:', err);
        const errorMessage = this.extractErrorMessage(err);
        this.notifyGenerationError(errorMessage);
      }
    });
  }

  setEvaluation(id: number|null, evaluation: number) : void { //numero di GeneratedDatum
    const current = this.resultSubject.value;
    if (!current) return;

    const updated: ResultAiAssistant = {
      ...current,
      evaluation: evaluation
    };
    this.resultSubject.next(updated);

    this.http.patch<any>(`${API_BASE}/generated_data/${id}/rating`, {
      rating: evaluation
    }).subscribe({
      next: (response) => {
        console.log('[setEvaluation] Risposta PATCH /generated_data/:id/rating:', response);
      },
      error: (err) => {
        console.error('[setEvaluation] Errore nella PATCH /generated_data/:id/rating:', err);
        const errorMessage = this.extractErrorMessage(err);
        this.notifyGenerationError(errorMessage);
      }
    });

    console.log(`Valutazione per generazione ${id} impostata a ${evaluation}`);
  }
  
  createPost(result: ResultAiAssistant): void {
    const payload = this.serializer.serializeCreatePostRequest(result);

    console.log('[createPost] Invio POST /posts con payload:', payload);

    this.http.post<any>(`${API_BASE}/posts`, payload).subscribe({
      next: (response) => {
        console.log('[createPost] Risposta POST /posts:', response);
        const createdPostId = this.serializer.deserializeCreatePostResponseId(response);

        const postResult: ResultAiAssistant = {
          ...result,
          id: createdPostId > 0 ? createdPostId : result.id // Aggiorna l'id con quello del post se disponibile, altrimenti mantiene l'id del generated datum
        };

        this.resultSubject.next(postResult);
        this.ResultsHistorySubject.next([...(this.ResultsHistorySubject.value || []), postResult]);
        console.log('[createPost] Post creato con successo, id:', createdPostId);
      },
      error: (err) => {
        console.error('[createPost] Errore nella POST /posts:', err);
        const errorMessage = this.extractErrorMessage(err);
        this.notifyGenerationError(errorMessage);
      }
    });
  }

  regenerate(id: number|null): void {
    const generationId = Number(id) || 0;
    if (generationId <= 0) {
      this.notifyGenerationError('Id generazione non valido per la rigenerazione.');
      return;
    }

    this.clearGenerationError();
    console.log('[regenerate] POST /generated_data/:id/regenerate per id:', generationId);

    const current = this.resultSubject.value;
    if (current) {
      this.resultSubject.next({
        ...current,
        id: null,
        title: '',
        content: '',
        imagePath: null,
        generatedDatumId: null,
        evaluation: -1
      });
    }

    this.http.post<any>(`${API_BASE}/generated_data/${generationId}/regenerate`, {}).subscribe({
      next: (response) => {
        console.log('[regenerate] risposta POST /generated_data/:id/regenerate:', response);
        const regeneratedId = this.serializer.deserializeGenerationStartResponse(response);

        if (regeneratedId <= 0) {
          console.error('[regenerate] Risposta senza id valido:', response);
          return;
        }

        const latest = this.resultSubject.value;
        if (latest) {
          this.resultSubject.next({
            ...latest,
            generatedDatumId: regeneratedId
          });
        }

        this.subscribeToGenerationChannel(regeneratedId);
      },
      error: (err) => {
        console.error('[regenerate] Errore nella POST /generated_data/:id/regenerate:', err);
        const message = this.extractErrorMessage(err);
        this.notifyGenerationError(message);
      }
    });
  }
  requireGeneration(prompt: string, tone: Tone, style: Style, company: Company): void {
    console.log('Rigenerazione richiesta');
    this.clearGenerationError();
    console.log('[requireGeneration] input:', {
      promptLength: prompt?.length ?? 0,
      toneId: tone?.id,
      styleId: style?.id,
      companyId: company?.id,
    });

    const pendingResult = this.buildPendingResult(prompt, tone, style, company);

    this.resultSubject.next(pendingResult);
    console.log('[requireGeneration] pending result pubblicato con id temporaneo:', pendingResult.id);

    const payload = this.serializer.serializeRequireGenerationRequest(prompt, tone, style, company);
    console.log('[requireGeneration] POST /generated_data payload:', payload);
    this.http.post<any>(`${API_BASE}/generated_data`, payload).subscribe({
      next: (response) => {
        console.log('[requireGeneration] risposta POST /generated_data:', response);
        const generatedId = this.serializer.deserializeGenerationStartResponse(response);
        if (generatedId <= 0) {
          console.error('Risposta create_generated_data senza id valido:', response);
          return;
        }

        const createdResult: ResultAiAssistant = {
          ...pendingResult,
          generatedDatumId: generatedId
        };

        this.resultSubject.next(createdResult);
        console.log('[requireGeneration] result aggiornato con id backend:', generatedId);
        this.subscribeToGenerationChannel(generatedId);
      },
      error: (err) => {
        console.error('Errore nella POST /generated_data:', err);
        const message = this.extractErrorMessage(err);
        this.notifyGenerationError(message);
      }
    });
  }

  private buildPendingResult(prompt: string, tone: Tone, style: Style, company: Company): ResultAiAssistant {
    return {
      id: null, // id temporaneo, sarà aggiornato una volta ricevuto il risultato dal backend
      title: '',
      content: '',
      imagePath: null,
      tone,
      style,
      company,
      data: new Date(),
      prompt,
      evaluation: -1,
      generatedDatumId: null
    };
  }

  private subscribeToGenerationChannel(generationId: number): void {
    const socket = new WebSocket(WS_URL, ['actioncable-v1-json', 'actioncable-unsupported']);
    const identifier = JSON.stringify({ channel: 'GenerationChannel' });

    socket.onopen = () => {
      socket.send(JSON.stringify({ command: 'subscribe', identifier }));
    };

    socket.onmessage = (event) => {
      const cable = JSON.parse(event.data);

      if (cable.type === 'welcome' || cable.type === 'ping' || cable.type === 'confirm_subscription') {
        return;
      }

      if (!cable.message) {
        return;
      }

      const payload = cable.message;
      const payloadId = Number(payload.id) || 0;

      if (payloadId !== generationId) {
        return;
      }

      if (payload.status === 'completed') {
        const current = this.resultSubject.value;
        if (!current) {
          return;
        }

        const normalizedImagePath = typeof payload.image_url === 'string'
          ? (payload.image_url.startsWith('http') ? payload.image_url : `${API_BASE}${payload.image_url}`)
          : current.imagePath;

        const updated: ResultAiAssistant = {
          ...current,
          generatedDatumId: generationId,
          title: typeof payload.title === 'string' ? payload.title : current.title,
          content: typeof payload.text === 'string' ? payload.text : current.content,
          imagePath: normalizedImagePath
        };

        this.resultSubject.next(updated);
        socket.close();
      } else if (payload.status === 'failed') {
        const errorMessage = this.extractRealtimeFailureMessage(payload);
        this.notifyGenerationError(errorMessage);
        socket.close();
      }
    };

    socket.onerror = (error) => {
      this.notifyGenerationError('Errore di connessione realtime. Controlla la rete e riprova.');
    };
  }

  fetchResultsHistory(): void {
    // se lo storico è già stato fetchato in precedenza, non rifà la get al backend
    if ((this.ResultsHistorySubject.value ?? []).length > 0) {
      return;
    }

    // lo storico è vuoto, lo fetcha dal backend
    this.http.get<any>(`${API_BASE}/posts`).subscribe({
      next: (response) => {
        console.log('[fetchResultsHistory] risposta /posts:', response);
        const history = this.serializer.deserializePostsResponse(response);

        this.ResultsHistorySubject.next(history);
        console.log('[fetchResultsHistory] Storico recuperato:', history);
      },
      error: (err) => {
        console.error('[fetchResultsHistory] Errore nel recupero dello storico:', err);
        this.ResultsHistorySubject.next([]);
      }
    });
  }


}
