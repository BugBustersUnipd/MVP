import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ResultAiCopilotSerializer } from '../../app/shared/serializers/result-ai-copilot.serializer';
import { ResultSplit, State} from '../../app/shared/models/result-split.model';
import { BehaviorSubject, map, Observable, switchMap, tap } from 'rxjs';
import { Company } from '../../app/shared/models/result-ai-assistant.model';
import { RisultatoGenerazione } from '../../app/risultato-generazione/risultato-generazione';
import { DocumentState, ResultAiCopilot } from '../../app/shared/models/result-ai-copilot.model';

const API_BASE = 'http://localhost:3000'; // Cambia con l'URL del tuo backend in produzione
const WS_URL = 'ws://localhost:3000/cable'; // wss:// in produzione


@Injectable({
  providedIn: 'root',
})
export class AiCoPilotService {
  private http = inject(HttpClient);
  private serializer = inject(ResultAiCopilotSerializer);
  private tempParentId = -1;
  
  private resultSubject : BehaviorSubject<ResultSplit | null> = new BehaviorSubject<ResultSplit | null>(null);
  currentResult$ = this.resultSubject.asObservable();

  private resultsHistorySubject: BehaviorSubject<ResultSplit[] | null> = new BehaviorSubject<ResultSplit[] | null>(null);
  currentResultsHistory$ = this.resultsHistorySubject.asObservable();

  private sessionParentsSubject: BehaviorSubject<ResultAiCopilot[]> = new BehaviorSubject<ResultAiCopilot[]>([]);
  currentSessionParents$ = this.sessionParentsSubject.asObservable();

  private parentNamesSubject: BehaviorSubject<Record<number, string>> = new BehaviorSubject<Record<number, string>>({});
  currentParentNames$ = this.parentNamesSubject.asObservable();

  private parentPageCountsSubject: BehaviorSubject<Record<number, number>> = new BehaviorSubject<Record<number, number>>({});
  currentParentPageCounts$ = this.parentPageCountsSubject.asObservable();


  private templatesSubject = new BehaviorSubject<{ name: string; content: string }[]>([]);
  templates$ = this.templatesSubject.asObservable();

  private categorySubject = new BehaviorSubject<string[]>([]);
  category$ = this.categorySubject.asObservable();

  private employeesSubject = new BehaviorSubject<{ id: number; name: string; email?: string; employeeCode?: string }[]>([]);
  employees$ = this.employeesSubject.asObservable();

  private companiesSubject = new BehaviorSubject<Company[]>([]);
  companies$ = this.companiesSubject.asObservable();

  private departmentSubject = new BehaviorSubject<string[]>([]);
  department$ = this.departmentSubject.asObservable();

  private StateSubject = new BehaviorSubject<string[]>([]);
  state$ = this.StateSubject.asObservable();
  
  private ConfidenceSubject = new BehaviorSubject<string[]>([]);
  confidence$ = this.ConfidenceSubject.asObservable();
// aggiunto MA VEDIAMO SE VA BENE; SERVE PER ALTRI DOCUMENTI ESTRATTI
  private otherExtractedDocumentsSubject = new BehaviorSubject<ResultSplit[]>([]);
  otherExtractedDocuments$ = this.otherExtractedDocumentsSubject.asObservable();


  public uploadFiles(files: File[], company: string, department: string, category: string, competence_period: string): void {
    for (const file of files) {
      const temporaryParentId = this.addPendingParent(file);
      this.processDocument(file, company, department, category, competence_period, temporaryParentId);
    }
  }

  // ESEMPIO DI COME DOVRÀ ESSERE IMPLEMENTATO IL METODO PROCESSDOCUMENT
  /* processDocument(file: File, company: string, department: string, category: string, competence_period: string): ResultAiSplit {
    // 1. CREAZIONE ISTANTANEA: Uso il Serializer per creare l'oggetto iniziale.
    // Immagino tu abbia un metodo nel Serializer per lo stato iniziale (es. uploading)
    const risultatoReattivo = this.serializer.creaStatoIniziale(file);

    const formData = new FormData();
    formData.append('pdf', file);

    // 2. Faccio l'upload
    this.http.post<any>('URL_API/documents/split', formData).subscribe({
      next: (rispostaPost) => {
        // Aggiorno l'oggetto in memoria
        risultatoReattivo.jobId = rispostaPost.job_id;
        risultatoReattivo.status = 'processing'; 

        // 3. Apro il WebSocket
        this.webSocketService.connetti(rispostaPost.job_id).subscribe({
          next: (messaggioWs) => {
            
            if (messaggioWs.event === 'document_processed') {
              // IL CUORE DELLA LOGICA:
              // 1. Passo i dati grezzi del mini-PDF al Serializer
              const nuovoMiniPdf = this.serializer.deserializeMiniPdf(messaggioWs.extracted_document_data);
              
              // 2. Lo aggiungo all'array dentro il mio risultato principale
              risultatoReattivo.miniPdfsEstratti.push(nuovoMiniPdf);
            }
            
            if (messaggioWs.event === 'processing_completed') {
              risultatoReattivo.status = 'completed';
            }
          }
        });
      },
      error: (errore) => {
        risultatoReattivo.status = 'error';
      }
    });

    // 4. RESTITUISCO L'OGGETTO SUBITO (mentre le chiamate HTTP stanno ancora viaggiando!)
    return risultatoReattivo;
  } */

  // questo è il webSocket service che NON faremo
  /*     import { Injectable } from '@angular/core';
  import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
  import { Observable, filter, map } from 'rxjs';

  @Injectable({
    providedIn: 'root'
  })
  export class WebSocketService {
    
    // Sostituisci con l'URL del tuo backend (ws:// per locale, wss:// per produzione)
    private wsUrl = 'ws://TUO_BACKEND_URL/cable'; 
    private socket$: WebSocketSubject<any> | null = null;

    connetti(jobId: string): Observable<any> {
      // 1. Apro la connessione WebSocket vera e propria
      if (!this.socket$ || this.socket$.closed) {
        this.socket$ = webSocket(this.wsUrl);
      }

      // 2. Costruisco il "biglietto da visita" esatto che vuole ActionCable
      const identifier = JSON.stringify({
        channel: 'DocumentProcessingChannel',
        job_id: jobId
      });

      // 3. Mando il comando di iscrizione al backend
      this.socket$.next({
        command: 'subscribe',
        identifier: identifier
      });

      // 4. Restituisco i messaggi al componente, filtrando solo quelli che ci interessano
      return this.socket$.asObservable().pipe(
        // ActionCable manda anche messaggi di "ping" per tenere viva la linea, li ignoriamo
        filter(msg => msg.type !== 'ping' && msg.type !== 'welcome' && msg.type !== 'confirm_subscription'),
        // Estraiamo il vero e proprio payload del messaggio
        map(msg => msg.message) 
      );
    }
  } */
  private processDocument(file: File, company: string, department: string, category: string, competence_period: string, temporaryParentId: number) : ResultAiCopilot {
      const reactiveResult  = this.serializer.creaStatoIniziale(file, company, department, category, competence_period);
      reactiveResult.ResultSplit.forEach(split => this.upsertInHistory(split)); // Aggiungo subito alla history per far comparire il nuovo documento in lista
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const endpoint = isPdf ? `${API_BASE}/documents/split` : `${API_BASE}/documents/process_file`;
      const fileParam = isPdf ? 'pdf' : 'file';

      const formData = new FormData(); 
      formData.append(fileParam, file);
      formData.append('category', category);
      formData.append('company', company);
      formData.append('department', department);
      formData.append('competence_period', competence_period);
      
      this.http.post<any>(endpoint, formData).subscribe({
        next: (response) => {
          const uploadedDocumentId = Number(response?.uploaded_document_id) || 0;
          reactiveResult.id = uploadedDocumentId;
          reactiveResult.state = DocumentState.InElaborazione; // Stato iniziale
          this.replacePendingParentId(temporaryParentId, uploadedDocumentId, DocumentState.InElaborazione);
          // Use ActionCable subprotocols for better compatibility with Rails cable server.
          const socket = new WebSocket(WS_URL, ['actioncable-v1-json', 'actioncable-unsupported']);
          const identifier = JSON.stringify({ channel: 'DocumentProcessingChannel', job_id: response.job_id });
          socket.onopen = () => {
            socket.send(JSON.stringify({ command: 'subscribe', identifier }));
          };
          socket.onmessage = (event) => {
            const cable = JSON.parse(event.data);

            if (cable.type === 'welcome' || cable.type === 'ping') {
              return;
            }

            if (cable.type === 'confirm_subscription') {
              // Immediate sync avoids UI lag if split artifacts are already persisted.
              if (uploadedDocumentId > 0) {
                this.refreshExtractedDocumentsForUpload(uploadedDocumentId);
              }
              return;
            }

            if (cable.type === 'reject_subscription') {
              console.error('Sottoscrizione ActionCable rifiutata per job:', response.job_id);
              socket.close();
              return;
            }

            if(!cable.message) return; // Ignora messaggi di sistema

            const payload = cable.message;
            const evt = payload.event;

            if (evt === 'document_processed') {
              const extractedDocumentId = Number(payload.extracted_document_id) || 0;
              if (extractedDocumentId > 0) {
                this.fetchExtractedDocumentAndUpsert(extractedDocumentId);
              }
            }
            if (evt === 'split_completed') {
              if (uploadedDocumentId > 0) {
                // Show extracted rows as soon as split artifacts are created.
                this.refreshExtractedDocumentsForUpload(uploadedDocumentId);
                this.updateParentStateInHistory(uploadedDocumentId, State.DaValidare);
                this.updateSessionParentState(uploadedDocumentId, DocumentState.InElaborazione);
              }
            }
            if (evt === 'processing_completed') {
              reactiveResult.state = DocumentState.Completato;
              if (uploadedDocumentId > 0) {
                this.refreshExtractedDocumentsForUpload(uploadedDocumentId);
                this.updateParentStateInHistory(uploadedDocumentId, State.Pronto);
                this.updateSessionParentState(uploadedDocumentId, DocumentState.Completato);
              }
              socket.close();
            }
            if (evt === 'processing_failed') {
              console.error('Elaborazione fallita per il documento:', cable.message.error);
              reactiveResult.state = DocumentState.Failed;
              if (uploadedDocumentId > 0) {
                this.updateParentStateInHistory(uploadedDocumentId, State.DaValidare);
                this.updateSessionParentState(uploadedDocumentId, DocumentState.Failed);
              }
              socket.close();
            }
          };
          socket.onerror = (error) => {
            console.error('Errore nella connessione WebSocket:', error);
            socket.close();
          };
        },
        error: (error) => {
          this.removeSessionParent(temporaryParentId);
          throw new Error('Errore durante l\'upload del documento: ' + error.message);
        }
      });
      return reactiveResult;
      //qui dentro chiama addCategory
      //poi faccio anche addDepartment 
  }

  private addPendingParent(file: File): number {
    const id = this.tempParentId--;
    const parent: ResultAiCopilot = {
      id,
      name: file.name,
      pages: 0,
      state: DocumentState.InCoda,
      ResultSplit: [],
    };
    this.sessionParentsSubject.next([...this.sessionParentsSubject.value, parent]);
    this.setParentName(id, file.name);
    return id;
  }

  private replacePendingParentId(temporaryParentId: number, realParentId: number, state: DocumentState): void {
    const updated = this.sessionParentsSubject.value.map((parent) =>
      parent.id === temporaryParentId ? { ...parent, id: realParentId, state } : parent
    );
    this.sessionParentsSubject.next(updated);

    const names = this.parentNamesSubject.value;
    const pendingName = names[temporaryParentId];
    if (pendingName) {
      const nextNames = { ...names };
      delete nextNames[temporaryParentId];
      nextNames[realParentId] = pendingName;
      this.parentNamesSubject.next(nextNames);
    }
  }

  private updateSessionParentState(parentId: number, state: DocumentState): void {
    const updated = this.sessionParentsSubject.value.map((parent) =>
      parent.id === parentId ? { ...parent, state } : parent
    );
    this.sessionParentsSubject.next(updated);
  }

  private removeSessionParent(parentId: number): void {
    const updated = this.sessionParentsSubject.value.filter((parent) => parent.id !== parentId);
    this.sessionParentsSubject.next(updated);

    const names = this.parentNamesSubject.value;
    if (names[parentId]) {
      const nextNames = { ...names };
      delete nextNames[parentId];
      this.parentNamesSubject.next(nextNames);
    }
  }

  private setParentName(parentId: number, name: string): void {
    if (!parentId || !name) return;
    const current = this.parentNamesSubject.value;
    if (current[parentId] === name) return;
    this.parentNamesSubject.next({ ...current, [parentId]: name });
  }

  private setParentPageCount(parentId: number, pageCount: unknown): void {
    const numeric = Number(pageCount);
    if (!parentId || !Number.isFinite(numeric) || numeric < 1) return;
    const normalized = Math.floor(numeric);
    const current = this.parentPageCountsSubject.value;
    if (current[parentId] === normalized) return;
    this.parentPageCountsSubject.next({ ...current, [parentId]: normalized });
  }
  private upsertInHistory(split: ResultSplit): void {
    const current = this.resultsHistorySubject.value ?? [];
    const idx = current.findIndex((r) => r.id === split.id);
    if (idx === -1) {
      this.resultsHistorySubject.next([...current, split]);
    } else {
      const copy = [...current];
      copy[idx] = split;
      this.resultsHistorySubject.next(copy);
    }
    this.refreshDynamicFilterOptions();
  }

  private refreshDynamicFilterOptions(): void {
    this.fetchCategories();
    this.fetchDepartment();
  }

  private fetchExtractedDocumentAndUpsert(extractedDocumentId: number): void {
    this.http.get<any>(`${API_BASE}/documents/extracted/${extractedDocumentId}`).subscribe({
      next: ({ extracted_document }) => {
        const split = this.serializer.deserializeExtractedDocument(extracted_document);
        this.upsertInHistory(split);
      },
      error: (err) => console.error(`Errore nel recupero realtime del documento estratto ${extractedDocumentId}:`, err),
    });
  }

  private refreshExtractedDocumentsForUpload(uploadedDocumentId: number): void {
    this.http.get<any>(`${API_BASE}/documents/uploads/${uploadedDocumentId}/extracted`).subscribe({
      next: (response) => {
        const parentName = response?.uploaded_document?.original_filename;
        const parentPageCount = response?.uploaded_document?.page_count;
        if (parentName) {
          this.setParentName(uploadedDocumentId, parentName);
        }
        this.setParentPageCount(uploadedDocumentId, parentPageCount);
        (response.extracted_documents ?? [])
          .map((raw: any) => this.serializer.deserializeExtractedDocument(raw))
          .forEach((split: ResultSplit) => this.upsertInHistory(split));
      },
      error: (err) => console.error(`Errore nel refresh realtime degli estratti per upload ${uploadedDocumentId}:`, err),
    });
  }

  private updateParentStateInHistory(parentId: number, state: State): void {
    const current = this.resultsHistorySubject.value ?? [];
    if (current.length === 0) return;

    const updated = current.map((row) =>
      row.parentId === parentId ? { ...row, state } : row
    );
    this.resultsHistorySubject.next(updated);
  }

    /** GET /documents/extracted/:id */
  public fetchExtractedDocument(id: number): void {
    this.http.get<any>(`${API_BASE}/documents/extracted/${id}`).subscribe({
      next: ({ extracted_document }) =>
        this.resultSubject.next(this.serializer.deserializeExtractedDocument(extracted_document)),
      error: (err) => console.error('Errore nel recupero del documento estratto:', err),
    });
  }
   /** GET /documents/uploads/:parentId/extracted */
  public getDocumentsByParent(parentId: number, currentResultId?: number): void {
    if (!parentId) {
      this.otherExtractedDocumentsSubject.next([]);
      return;
    }
    this.http.get<any>(`${API_BASE}/documents/uploads/${parentId}/extracted`).subscribe({
      next: (response) => {
        this.setParentPageCount(parentId, response?.uploaded_document?.page_count);
        const splits: ResultSplit[] = response.extracted_documents
          .map((raw: any) => this.serializer.deserializeExtractedDocument(raw))
          .filter((s: ResultSplit) => s.id !== currentResultId);
        this.otherExtractedDocumentsSubject.next(splits);
      },
      error: (err) => console.error('Errore nel recupero dei documenti fratelli:', err),
    });
  }

  /** POST /documents/uploads/:id/retry */
  public retryDocumentProcessing(uploadedDocumentId: number): void {
    this.http.post<any>(`${API_BASE}/documents/uploads/${uploadedDocumentId}/retry`, {}).subscribe({
      next: (response) => {
        console.log('Riprocessamento avviato:', response);
        // Opzionalmente, aggiorna lo stato del documento
        this.fetchHistoryResults();
      },
      error: (err) => console.error('Errore nel riavvio del processamento:', err),
    });
  }

  /** POST /documents/extracted/:id/retry */
  public retryExtractedDocumentProcessing(extractedDocumentId: number): void {
    this.http.post<any>(`${API_BASE}/documents/extracted/${extractedDocumentId}/retry`, {}).subscribe({
      next: (response) => {
        console.log('Rianalisi documento come estratto avviata:', response);
        this.fetchHistoryResults();
      },
      error: (err) => console.error('Errore nel riavvio della rianalisi:', err),
    });
  }


  /** POST /templates */
  public newTemplate(name: string, content: string): void {
    this.http.post<any>(`${API_BASE}/templates`, { name, content }).subscribe({
      next: ({ template }) =>
        this.templatesSubject.next([
          ...this.templatesSubject.value,
          { name: template.name, content: template.content },
        ]),
      error: (err) => console.error('Errore nella creazione del template:', err),
    });
  }
  /** GET /templates */
  public fetchTemplates(): void {
    this.http.get<any>(`${API_BASE}/templates`).subscribe({
      next: ({ templates }) =>
        this.templatesSubject.next(templates.map((t: any) => ({ name: t.name, content: t.content }))),
      error: (err) => console.error('Errore nel recupero dei template:', err),
    });
  }
 
  /*public addCategory() : void {
    //todo implementare con chiamata al backend

    //qui voglio un fucking push su categorySubject, in modo che la view riceva la notifica e si aggiorni!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  }
  public addDepartment(idCompany: string) : void {
    //todo implementare con chiamata al backend
  }*/

  
  public fetchCategories(): void {
    const unique = [...new Set((this.resultsHistorySubject.value ?? []).map((r) => r.category).filter(Boolean))];
    this.categorySubject.next(unique);
  }
  public fetchDepartment(): void {
    const unique = [...new Set((this.resultsHistorySubject.value ?? []).map((r) => r.department).filter(Boolean))];
    this.departmentSubject.next(unique);
  }
  public fetchState(): void {
    this.StateSubject.next(Object.values(State));
  }
  public fetchConfidence(): void {
    this.ConfidenceSubject.next(['0-20', '21-40', '41-60', '61-80', '81-100']);
  }
  /** GET /lookups/companies */
  public fetchCompanies(): void {
    this.http.get<any>(`${API_BASE}/lookups/companies`).subscribe({
      next: (response) => {
        this.companiesSubject.next(response.companies);
        console.log('Aziende recuperate:', response.companies);
        },
      error: (err) => console.error('Errore nel recupero delle aziende:', err),
    });
  }

  
  public getOriginalPdfById(id: number): void {
    window.open(`${API_BASE}/documents/uploads/${id}/file`, '_blank');
  }
  public getPdfById(id: number): void {
    window.open(`${API_BASE}/documents/extracted/${id}/pdf`, '_blank');
  }

  /** PATCH /documents/extracted/:id/reassign_range */
  public modifyDocumentRange(id: number, page_start: number, page_end: number): void {
    this.modifyDocumentRange$(id, page_start, page_end).subscribe({
      error: (err) => console.error('Errore nella modifica del range:', err),
    });
  }

  /** PATCH /documents/extracted/:id/reassign_range (async) */
  public modifyDocumentRange$(id: number, page_start: number, page_end: number): Observable<ResultSplit> {
    return this.http
      .patch<any>(`${API_BASE}/documents/extracted/${id}/reassign_range`, { page_start, page_end })
      .pipe(
        switchMap(() => this.http.get<any>(`${API_BASE}/documents/extracted/${id}`)),
        map(({ extracted_document }) => this.serializer.deserializeExtractedDocument(extracted_document)),
        tap((updated) => {
          this.resultSubject.next(updated);
          this.upsertInHistory(updated);
        })
      );
  }

  /** PATCH /documents/extracted/:id/metadata */
  public updateDocumentMetadata(id: number, metadataUpdates: Record<string, unknown>): void {
    this.updateDocumentMetadata$(id, metadataUpdates).subscribe({
      error: (err) => console.error('Errore nell\'aggiornamento dei metadati:', err),
    });
  }

  /** PATCH /documents/extracted/:id/metadata (async) */
  public updateDocumentMetadata$(id: number, metadataUpdates: Record<string, unknown>): Observable<ResultSplit> {
    return this.http
      .patch<any>(`${API_BASE}/documents/extracted/${id}/metadata`, { metadata_updates: metadataUpdates })
      .pipe(
        map(({ extracted_document }) => this.serializer.deserializeExtractedDocument(extracted_document)),
        tap((updated) => {
          this.resultSubject.next(updated);
          this.upsertInHistory(updated);
        })
      );
  }

    /** GET /documents/uploads → carica la history iniziale via HTTP */
  public fetchHistoryResults(): void {
    if ((this.resultsHistorySubject.value ?? []).length > 0) return;
 
    this.http.get<any>(`${API_BASE}/documents/uploads`).subscribe({
      next: ({ uploaded_documents }) => {
        for (const ud of uploaded_documents) {
          if (ud?.id && ud?.original_filename) {
            this.setParentName(ud.id, ud.original_filename);
          }
          this.setParentPageCount(ud?.id, ud?.page_count);
          this.http.get<any>(`${API_BASE}/documents/uploads/${ud.id}/extracted`).subscribe({
            next: (response) =>
              response.extracted_documents
                .map((raw: any) => this.serializer.deserializeExtractedDocument(raw))
                .forEach((s: ResultSplit) => this.upsertInHistory(s)),
            error: (err) => console.error(`Errore estratti per ${ud.id}:`, err),
          });
        }
      },
      error: (err) => console.error('Errore nel recupero della history:', err),
    });
  }

  /** GET /lookups/users?company=<n> */
  public fetchEmployeesByCompany(company: string): void {
    if (!company) {
      this.employeesSubject.next([]);
      return;
    }
    this.http.get<any>(`${API_BASE}/lookups/users`, { params: { company } }).subscribe({
      next: ({ users }) =>
        this.employeesSubject.next(
          users.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            employeeCode: u.employee_code,
          }))
        ),
      error: (err) => console.error('Errore nel recupero degli utenti:', err),
    });
  }

  //todo modifica data di un result
  //todo modifica categoria di un result
  // todo modifica azienda di un result
  // todo modifica dipartimento di un result

    public updateResult(result: ResultSplit): void {
    this.resultSubject.next(result);
  }

}
