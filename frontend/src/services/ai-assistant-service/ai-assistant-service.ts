import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ResultAiAssistant } from '../../app/shared/models/result-ai-assistant.model';
import { Tone, Style, Company } from '../../app/shared/models/result-ai-assistant.model';
import { ResultAiAssistantSerializer } from '../../app/shared/serializers/result-ai-assistant.serializer';
import { BehaviorSubject } from 'rxjs';
import { AnalyticsAbstractService } from '../analytics-abstract-service';
const API_BASE = 'http://localhost:3000'; // Cambia con l'URL del tuo backend in produzione
const WS_URL = 'ws://localhost:3000/cable'; // wss:// in produzione

@Injectable({
  providedIn: 'root',
})
export class AiAssistantService {
  private serializer = inject(ResultAiAssistantSerializer);
  private http = inject(HttpClient);
  private resultSubject : BehaviorSubject<ResultAiAssistant | null> = new BehaviorSubject<ResultAiAssistant | null>(null);
  currentResult$ = this.resultSubject.asObservable();
  private generationErrorSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  currentGenerationError$ = this.generationErrorSubject.asObservable();

  ResultsHistorySubject: BehaviorSubject<ResultAiAssistant[] | null> = new BehaviorSubject<ResultAiAssistant[] | null>(null);
  currentResultsHistory$ = this.ResultsHistorySubject.asObservable();

  constructor() {
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

  private notifyGenerationError(message: string): void {
    this.generationErrorSubject.next(message);
  }

  private extractRealtimeFailureMessage(payload: any): string {
    const generic = 'Generazione fallita per un errore interno.';

    const rawError = payload?.error;
    const message = typeof rawError === 'string' && rawError.trim().length > 0
      ? rawError
      : generic;

    const lowered = message.toLowerCase();

    // Token scaduto (AWS / security token expired): stesso flusso dell'altro errore.
    if (lowered.includes('token') && lowered.includes('expired')) {
      return message;
    }

    // Guardrails: esempio "Contenuto bloccato dai guardrails".
    if (lowered.includes('guardrail') || lowered.includes('bloccato dai guardrails')) {
      return message;
    }

    return message;
  }

  clearGenerationError(): void {
    this.generationErrorSubject.next(null);
  }

  setCurrentResult(result: ResultAiAssistant | null): void {
    this.resultSubject.next(result ? { ...result } : null);
  }


  private tonesSubject = new BehaviorSubject<Tone[]>([]);
  tones$ = this.tonesSubject.asObservable();

  private stylesSubject = new BehaviorSubject<Style[]>([]);
  styles$ = this.stylesSubject.asObservable();

  private companiesSubject = new BehaviorSubject<Company[]>([]);
  companies$ = this.companiesSubject.asObservable();


  fetchTonesByCompany(company: number) : void {

    this.http.get<any>(`${API_BASE}/tones`, { params: { company_id: company} }).subscribe({
      next: (response) => {
        const tonesArray = Array.isArray(response) ? response : response.tones || [];
        const tones: Tone[] = tonesArray.map((item: any) => ({ id: item.id, name: item.name }));
        this.tonesSubject.next(tones);
        console.log('Toni recuperati:', tones);
      },
      error: (err) => console.error('Errore nel recupero dei toni:', err),
    });
  }
  
  fetchStylesByCompany(company: number) : void {
    this.http.get<any>(`${API_BASE}/styles`, { params: { company_id: company} }).subscribe({
        next: (response) => {
        const stylesArray = Array.isArray(response) ? response : response.styles || [];
        const styles: Style[] = stylesArray.map((item: any) => ({ id: item.id, name: item.name }));
        this.stylesSubject.next(styles);
        console.log('Stili recuperati:', styles);
      },
      error: (err) => console.error('Errore nel recupero dei toni:', err),
    });

  }

  fetchCompanies(): void {
    this.http.get<any>(`${API_BASE}/lookups/companies`).subscribe({
      next: (response) => {
        this.companiesSubject.next(response.companies);
        console.log('Aziende recuperate:', response.companies);
        },
      error: (err) => console.error('Errore nel recupero delle aziende:', err),
    });
  }
  newTone(name: string, code: string, companyId: number) : void {
    this.http.post<any>(`${API_BASE}/tones`, {
      tone: {
        name: name,
        description: code,
        company_id: companyId
      }
    }).subscribe({
      next: (response) => {
        const mockTone = { id: response.id, name };
        this.tonesSubject.next([...this.tonesSubject.value, mockTone]);
        console.log('Tono creato:', mockTone);
      },
      error: (err) => console.error('Errore nella creazione del tono:', err),
    });
  }

  newStyle(name: string, code: string, companyId: number) : void {
    this.http.post<any>(`${API_BASE}/styles`, {
      style: {
        name: name,
        description: code,
        company_id: companyId
      }
    }).subscribe({
      next: (response) => {
        console.log('Risposta alla creazione dello stile:', response);
        const mockStyle = { id: response.id, name };
        this.stylesSubject.next([...this.stylesSubject.value, mockStyle]);
        console.log('Stile creato:', mockStyle);
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
  // todo implementare
  reuse(tone: Tone, style: Style, company: Company, prompt: string) : void {
    console.log('Riutilizzo richiesta con i seguenti parametri:', { tone, style, company, prompt });
    const pendingResult: ResultAiAssistant = {
        id: null, // id temporaneo, sarà aggiornato una volta ricevuto il risultato dal backend
        title: '',
        content: '',
        imagePath: null,
        tone: tone,
        style: style,
        company: company,
        data: new Date(),
        prompt: prompt,
        evaluation: -1,
        generatedDatumId: null //per ora non so quale sia sto id del generated datum
    };

    this.resultSubject.next(pendingResult);
    //chiamata backend
    //la view deve portare alla pagina di risultato-generazione dopo aver riceveuto il risultato della generazione con i parametri specificati
  }
  // forse è da TOGLIERE COMPLETAMENTE
  duplicate(tone: Tone, style: Style, company: Company, prompt: string) : void {
    console.log('Duplicazione richiesta con i seguenti parametri:', { tone, style, company, prompt });
    //porta alla pagina di generazione

    // il reindirizzamento va gestito nella view, un esempio di come dovrebbe venire è:
    
  }
  // todo implementare
  removeGeneration(id: number) : void {
    console.log(`Scarto generazione con id ${id} richiesto`);
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
  // todo implementare
  modifyImageLocal(result: ResultAiAssistant, nuovoPathBase64: string): void {//obv manca la chiamata al backend, se va a buon fine aggiorna resultSubject
    const updated: ResultAiAssistant = {
      ...result,
      imagePath: nuovoPathBase64, // usa il nome proprietà corretto del tuo model
    };
    console.log('Ehi sto modificando l\'immagine wohoo');
    this.resultSubject.next(updated);

  }
  // todo implementare
  modifyContentLocal(result: ResultAiAssistant, newContent: string) : void {
    // chiamata al backend (post)
    //se va a buon fine result si modifica result
    const newResult = { 
        ...result, 
        content: newContent 
    };
    this.resultSubject.next(newResult);
  }
  // todo implementare
  modifyTitleLocal(result: ResultAiAssistant, newTitle: string) : void {
    // chiamata al backend (post)
    //se va a buon fine result si modifica result
    const newResult = { 
        ...result, 
        title: newTitle 
    };
    this.resultSubject.next(newResult);
  }
  createPost(result: ResultAiAssistant): void {
    // Costruisce il payload per POST /posts con i dati del result
    // Il backend accetta: title, body_text, img_path, date_time, generated_datum_id
    const payload = {
      generated_datum_id: result.id,
      title: result.title,
      body_text: result.content,
      img_path: result.imagePath,
      date_time: result.data
    };

    console.log('[createPost] Invio POST /posts con payload:', payload);

    this.http.post<any>(`${API_BASE}/posts`, payload).subscribe({
      next: (response) => {
        console.log('[createPost] Risposta POST /posts:', response);

        const postResult: ResultAiAssistant = {
          ...result,
          id: response?.id ?? result.id // Aggiorna l'id con quello del post se disponibile, altrimenti mantiene l'id del generated datum
        };

        this.resultSubject.next(postResult);
        this.ResultsHistorySubject.next([...(this.ResultsHistorySubject.value || []), postResult]);
        console.log('[createPost] Post creato con successo, id:', response?.id);
      },
      error: (err) => {
        console.error('[createPost] Errore nella POST /posts:', err);
        const errorMessage = this.extractErrorMessage(err);
        this.notifyGenerationError(errorMessage);
      }
    });
  }

  // todo implementare chiamata al backend
  requireGeneration(prompt: string, tone: Tone, style: Style, company: Company): void {
    console.log('Rigenerazione richiesta');
    this.clearGenerationError();
    console.log('[requireGeneration] input:', {
      promptLength: prompt?.length ?? 0,
      toneId: tone?.id,
      styleId: style?.id,
      companyId: company?.id,
    });

    const pendingResult: ResultAiAssistant = {
        id: null, // id temporaneo, sarà aggiornato una volta ricevuto il risultato dal backend
        title: '',
        content: '',
        imagePath: null,
        tone: tone,
        style: style,
        company: company,
        data: new Date(),
        prompt: prompt,
        evaluation: -1,
        generatedDatumId: null //per ora non so quale sia sto id del generated datum
    };

    this.resultSubject.next(pendingResult);
    console.log('[requireGeneration] pending result pubblicato con id temporaneo:', pendingResult.id);

    console.log('[requireGeneration] POST /generated_data payload:', {
      generation_datum: {
        prompt,
        company_id: company.id,
        style_id: style.id,
        tone_id: tone.id
      }
    });
    this.http.post<any>(`${API_BASE}/generated_data`, {
      generation_datum: {
        prompt,
        company_id: company.id,
        style_id: style.id,
        tone_id: tone.id
      }
    }).subscribe({
      next: (response) => {
        console.log('[requireGeneration] risposta POST /generated_data:', response);
        const generatedId = Number(response?.id) || 0;
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

  private subscribeToGenerationChannel(generationId: number): void {
    console.log('[ws] apertura websocket verso:', WS_URL, 'per generationId:', generationId);
    const socket = new WebSocket(WS_URL, ['actioncable-v1-json', 'actioncable-unsupported']);
    const identifier = JSON.stringify({ channel: 'GenerationChannel' });
    console.log('[ws] identifier subscribe:', identifier);

    socket.onopen = () => {
      socket.send(JSON.stringify({ command: 'subscribe', identifier }));
      console.log('Subscription inviata a GenerationChannel per id:', generationId);
    };

    socket.onmessage = (event) => {
      console.log('[ws] raw message:', event.data);
      const cable = JSON.parse(event.data);

      if (cable.type === 'welcome' || cable.type === 'ping' || cable.type === 'confirm_subscription') {
        console.log('[ws] messaggio di sistema ignorato:', cable.type);
        return;
      }

      if (!cable.message) {
        console.log('[ws] messaggio senza payload applicativo, ignorato:', cable);
        return;
      }

      const payload = cable.message;
      const payloadId = Number(payload.id) || 0;
      console.log('[ws] payload applicativo:', payload, 'payloadId:', payloadId, 'generationId atteso:', generationId);

      // Il canale e condiviso: aggiorniamo solo la generazione appena creata via POST.
      if (payloadId !== generationId) {
        console.log('[ws] payload ignorato per id diverso');
        return;
      }

      if (payload.status === 'completed') {
        console.log('[ws] completed ricevuto per id corretto');
        const current = this.resultSubject.value;
        if (!current) {
          console.log('[ws] nessun current result disponibile, skip update');
          return;
        }

        const normalizedImagePath = typeof payload.image_url === 'string'
          ? (payload.image_url.startsWith('http') ? payload.image_url : `${API_BASE}${payload.image_url}`)
          : current.imagePath;

        const updated: ResultAiAssistant = {
          ...current,
          id: payloadId,
          title: typeof payload.title === 'string' ? payload.title : current.title,
          content: typeof payload.text === 'string' ? payload.text : current.content,
          imagePath: normalizedImagePath
        };

        this.resultSubject.next(updated);
        console.log('[ws] resultSubject aggiornato con title/content da completed');
        socket.close();
        console.log('[ws] unsubscribe websocket dopo completed');
      } else if (payload.status === 'failed') {
        const errorMessage = this.extractRealtimeFailureMessage(payload);

        console.error('[ws] failed ricevuto:', payload);
        this.notifyGenerationError(errorMessage);
        socket.close();
        console.log('[ws] unsubscribe websocket dopo failed');
      } else {
        console.log('[ws] status ricevuto ma non gestito in update finale:', payload.status);
      }
    };

    socket.onclose = (event) => {
      console.log('[ws] connessione chiusa:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
    };

    socket.onerror = (error) => {
      console.error('Errore nella connessione WebSocket:', error);
      this.notifyGenerationError('Errore di connessione realtime. Controlla la rete e riprova.');
    };
  }

  // todo implementare
  getGeneration(jobid: number) : void {}


  fetchResultsHistory(): void {
    if ((this.ResultsHistorySubject.value ?? []).length > 0) {
      return;
    }

    this.http.get<any>(`${API_BASE}/posts`).subscribe({
      next: (response) => {
        const postsArray = Array.isArray(response) ? response : response?.posts || [];
        console.log('[fetchResultsHistory] risposta /posts:', response);
        const history: ResultAiAssistant[] = postsArray.map((item: any) => {
          const toneId = Number(item?.toneId ?? item?.tone_id) || 0;
          const styleId = Number(item?.styleId ?? item?.style_id) || 0;

          const rawDate = item?.dateTime ?? item?.date_time;
          const parsedDate = rawDate ? new Date(rawDate) : new Date(0);
          const data = Number.isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate;

          return {
            id: Number(item?.id) || 0,
            title: item?.title ?? '',
            content: item?.PostText ?? item?.postText ?? item?.body_text ?? item?.content ?? '',
            imagePath: item?.imgPath ?? item?.img_path ?? item?.imagePath ?? null,
            tone: {
              id: toneId,
              name: item?.toneName ?? (toneId > 0 ? `Tono #${toneId}` : '')
            },
            style: {
              id: styleId,
              name: item?.styleName ?? (styleId > 0 ? `Stile #${styleId}` : '')
            },
            company: {
              id: Number(item?.companyId ?? item?.company_id) || 0,
              name: item?.companyName ?? ''
            },
            data,
            prompt: item?.prompt ?? '',
            evaluation: Number(item?.rating) || 0,
            generatedDatumId: Number(item?.generatedDatumId ?? item?.generated_datum_id) || null
          };
        });

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
