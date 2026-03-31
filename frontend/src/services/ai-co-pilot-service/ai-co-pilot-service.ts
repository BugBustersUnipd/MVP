import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ResultAiCopilotSerializer } from '../../app/shared/serializers/result-ai-copilot.serializer';
import { ResultSplit, State} from '../../app/shared/models/result-split.model';
import { BehaviorSubject, map, Observable, switchMap, tap, forkJoin } from 'rxjs';
import { Company } from '../../app/shared/models/result-ai-assistant.model';
import { DocumentState, ResultAiCopilot } from '../../app/shared/models/result-ai-copilot.model';

const API_BASE = 'http://localhost:3000'; // Cambia con l'URL del tuo backend in produzione
const WS_URL = 'ws://localhost:3000/cable'; // wss:// in produzione

export interface TemplateOption {
  id: number;
  name: string;
  content: string;
}

export interface CreateSendingPayload {
  extracted_document_id: number;
  recipient_id: number;
  sent_at: string;
  subject?: string;
  body?: string;
  template_id?: number;
}


@Injectable({
  providedIn: 'root',
})
export class AiCoPilotService {
  private http = inject(HttpClient);
  private serializer = inject(ResultAiCopilotSerializer);
  private tempParentId = -1;
  private scheduledDocuments = new Map<number, Date>();

  /*Servono per fare in modo che quando carico un documento, questo appaia subito in lista con uno stato "In coda" anche prima che il backend mi risponda con l'id reale del documento caricato. 
  Uso id negativi temporanei per identificare questi documenti "pending" in attesa della risposta del backend, e poi li sostituisco con gli id reali appena arrivano. 
  In questo modo la UI può mostrare immediatamente i documenti caricati senza dover aspettare la risposta del backend, 
  migliorando l'esperienza utente soprattutto con file di grandi dimensioni che richiedono più tempo per essere processati.*/
  private currentBatchTempIds = new Set<number>();  
  private currentBatchParentIdsSubject = new BehaviorSubject<Set<number>>(new Set());
  currentBatchParentIds$ = this.currentBatchParentIdsSubject.asObservable();
  
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


  private templatesSubject = new BehaviorSubject<TemplateOption[]>([]);
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
    this.currentBatchTempIds.clear(); //cleara gli id assegnati temporaneamente.
    this.currentBatchParentIdsSubject.next(new Set(this.currentBatchTempIds)); //notifica tutti i subscriber che la batch è cambiata (ora vuota)
    for (const file of files) { 
      const temporaryParentId = this.addPendingParent(file); // crea un parent temporaneo con id negativo
      this.currentBatchTempIds.add(temporaryParentId); // tiene traccia degli id temporanei assegnati in questa batch
      this.processDocument(file, company, department, category, competence_period, temporaryParentId); // chiamata a procesDocument
    }
    this.currentBatchParentIdsSubject.next(new Set(this.currentBatchTempIds)); // notifica tutti i subscriber con gli id temporanei appena creati, la UI fa vedere i documenti IN CODA intanto.
  }

  private processDocument(file: File, company: string, department: string, category: string, competence_period: string, temporaryParentId: number) : ResultAiCopilot {
      const reactiveResult  = this.serializer.creaStatoIniziale(file, company, department, category, competence_period); // Crea un ResultAiCopilot iniziale
      reactiveResult.ResultSplit.forEach(split => this.upsertInHistory(split)); // Aggiungo subito alla history per far comparire i documenti splittati subito in lista
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const endpoint = isPdf ? `${API_BASE}/documents/split` : `${API_BASE}/documents/process_file`; // Se è PDF uso endpoint split, altrimenti direttamente process_file che accetta anche altri tipi di file e faccio il processing senza passare dallo split. In questo modo supporto anche file di testo, excel, ecc. senza doverli splittare in pagine.
      const fileParam = isPdf ? 'pdf' : 'file';

      const formData = new FormData(); 
      formData.append(fileParam, file); // Il backend si aspetta il file con chiave 'pdf' se è un PDF, altrimenti 'file' per altri tipi di documento.
      formData.append('category', category);
      formData.append('company', company);
      formData.append('department', department);
      formData.append('competence_period', competence_period); // e passo tutti gli altri metadati
      
      this.http.post<any>(endpoint, formData).subscribe({
        next: (response) => {
          const uploadedDocumentId = Number(response?.uploaded_document_id) || 0; // uploadedDocumentId è Id del doc padre
          reactiveResult.id = uploadedDocumentId;

          // Se si passa un file duplicato ovvero già analizzato, il backend ritorna job_id vuoto, verrà dunque restituito lo stesso documento già analizzato. Senza far ripartire analisi.
          if (!response.job_id) {
            reactiveResult.state = DocumentState.Completato;
            this.replacePendingParentId(temporaryParentId, uploadedDocumentId, DocumentState.Completato);
            if (uploadedDocumentId > 0) {
              this.refreshExtractedDocumentsForUpload(uploadedDocumentId);
              this.updateSessionParentState(uploadedDocumentId, DocumentState.Completato);
            }
            return;
          }

          reactiveResult.state = DocumentState.InElaborazione; // Stato In Elaborazione del padre poichè il job_id è presente poichè il doc non è duplicato.
          this.replacePendingParentId(temporaryParentId, uploadedDocumentId, DocumentState.InElaborazione); // Sostituisco l'id temporaneo del parent con quello reale arrivato dal backend in risposta, e imposto stato in elaborazione
          // Faccio la subscribe al cancale websocket passandogli il job_id.
          this.subscribeToJobUpdates(
            response.job_id,
            (payload, socket) => {
              const evt = payload.event;

              if (evt === 'document_processed') {  //se viene tornato document processed, recupero l'id del documento estratto e recupero il documento ed aggiorno la history.
                const extractedDocumentId = Number(payload.extracted_document_id) || 0;
                if (extractedDocumentId > 0) {
                  this.fetchExtractedDocumentAndUpsert(extractedDocumentId);
                }
              }
              if (evt === 'split_completed') { // se lo split è completato, aggiorno lo stato del documento padre
                if (payload.status === 'error') { // se lo split da errore
                  reactiveResult.state = DocumentState.Failed;
                  if (uploadedDocumentId > 0) {
                    this.refreshExtractedDocumentsForUpload(uploadedDocumentId);
                    this.updateSessionParentState(uploadedDocumentId, DocumentState.Failed);
                  }
                  socket.close();
                  return;
                }
                if (uploadedDocumentId > 0) {
                  this.refreshExtractedDocumentsForUpload(uploadedDocumentId); // faccio la get per recuparare i documenti estratti, li deserializzo e li inserisco nella history, gli split dunque vengono mostrati subito anche se il processing non è finito
                  this.updateSessionParentState(uploadedDocumentId, DocumentState.InElaborazione); // aggiorna lo stato del documento padre nella lista dei documenti caricati nella sessione
                }
              }
              if (evt === 'processing_completed') { // processing_completed arriva una volta a fine job; status decide se successo o errore.
                const completedWithError = payload.status === 'error';
                reactiveResult.state = completedWithError ? DocumentState.Failed : DocumentState.Completato;
                if (uploadedDocumentId > 0) {
                  this.refreshExtractedDocumentsForUpload(uploadedDocumentId);// faccio la get per recuparare i documenti estratti, li deserializzo e li inserisco nella history.
                  this.updateSessionParentState(uploadedDocumentId, completedWithError ? DocumentState.Failed : DocumentState.Completato); // aggiorna lo stato del documento padre nella lista dei documenti caricati nella sessione
                }
                socket.close();
              }
              if (evt === 'processing_failed') { // fallback legacy: backend attuale usa processing_completed con status=error
                console.error('Elaborazione fallita per il documento:', payload.error);
                reactiveResult.state = DocumentState.Failed;
                if (uploadedDocumentId > 0) {
                  this.refreshExtractedDocumentsForUpload(uploadedDocumentId);// faccio la get per recuparare i documenti estratti, li deserializzo e li inserisco nella history.
                  this.updateSessionParentState(uploadedDocumentId, DocumentState.Failed); // aggiorna lo stato del documento padre nella lista dei documenti caricati nella sessione
                }
                socket.close();
              }
            },
            () => {
              // Immediate sync avoids UI lag if split artifacts are already persisted.
              if (uploadedDocumentId > 0) {
                this.refreshExtractedDocumentsForUpload(uploadedDocumentId);
              }
            }
          );
        },
        error: (error) => {
          this.removeSessionParent(temporaryParentId);
          throw new Error('Errore durante l\'upload del documento: ' + error.message);
        }
      });
      return reactiveResult;
  }

  private addPendingParent(file: File): number { // crea parent temporaneo con id negativo e stato "In coda", lo aggiunge alla lista dei parent della sessione e ritorna l'id temporaneo assegnato.
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

  private replacePendingParentId(temporaryParentId: number, realParentId: number, state: DocumentState): void { // Sostituisco l'id temporaneo del parent con quello reale arrivato dal backend in risposta, e imposto uno stato al documentoi padre.
    const updated = this.sessionParentsSubject.value.map((parent) =>
      parent.id === temporaryParentId ? { ...parent, id: realParentId, state } : parent
    );
    this.sessionParentsSubject.next(updated);

    if (this.currentBatchTempIds.has(temporaryParentId)) {
      this.currentBatchTempIds.delete(temporaryParentId);
      const current = this.currentBatchParentIdsSubject.value;
      current.delete(temporaryParentId);
      current.add(realParentId);
      this.currentBatchParentIdsSubject.next(new Set(current));
    }

    const names = this.parentNamesSubject.value;
    const pendingName = names[temporaryParentId];
    if (pendingName) {
      const nextNames = { ...names };
      delete nextNames[temporaryParentId];
      nextNames[realParentId] = pendingName;
      this.parentNamesSubject.next(nextNames);
    }
  }

  private updateSessionParentState(parentId: number, state: DocumentState): void { // aggiorna lo stato del documento padre nella lista dei documenti caricati nella sessione. (Poichè a backend lo stato del padre non è presente)
    const updated = this.sessionParentsSubject.value.map((parent) =>
      parent.id === parentId ? { ...parent, state } : parent
    );
    this.sessionParentsSubject.next(updated);
  }

  private removeSessionParent(parentId: number): void {  // viene chiamato quando c'è un errore nell'upload del documento, il documento padre qua ha ancora un id temporaneo negativo, dunque rimuove il parent con id temporaneo dalla lista dei parent della sessione e pulisce eventuali dati associati a quell'id temporaneo (nome, id)
    const updated = this.sessionParentsSubject.value.filter((parent) => parent.id !== parentId);
    this.sessionParentsSubject.next(updated);

    const names = this.parentNamesSubject.value;
    if (names[parentId]) {
      const nextNames = { ...names };
      delete nextNames[parentId];
      this.parentNamesSubject.next(nextNames);
    }
  }

  private setParentName(parentId: number, name: string): void { // setta il nome al documento padre
    if (!parentId || !name) return;
    const current = this.parentNamesSubject.value;
    if (current[parentId] === name) return;
    this.parentNamesSubject.next({ ...current, [parentId]: name });
  }

  private setParentPageCount(parentId: number, pageCount: unknown): void { // setta il numero di pagine del documento padre quando riceve il dato dal backend, prima di riceverlo il numero di pagine è 0
    const numeric = Number(pageCount); 
    if (!parentId || !Number.isFinite(numeric) || numeric < 1) return;
    const normalized = Math.floor(numeric);
    const current = this.parentPageCountsSubject.value;
    if (current[parentId] === normalized) return;
    this.parentPageCountsSubject.next({ ...current, [parentId]: normalized });
  }
  private resolveScheduledState(split: ResultSplit): ResultSplit { //Se lo stato di un documento è "Inviato" e ha un id, allora controlla se tale documento è presente nella mappa dei documenti programmati. Se la data programmata è nel futuro, imposta lo stato su "Programmato". Se la data programmata è nel passato, rimuove il documento dalla mappa e lascia lo stato su "Inviato".
    if (split.state !== State.Inviato || !split.id) return split;
    const scheduledAt = this.scheduledDocuments.get(split.id);
    if (!scheduledAt) return split;
    if (scheduledAt > new Date()) return { ...split, state: State.Programmato };
    this.scheduledDocuments.delete(split.id);
    return split;
  }

  private upsertInHistory(split: ResultSplit): void {
    const resolved = this.resolveScheduledState(split);
    const current = this.resultsHistorySubject.value ?? []; // Prendo lo stato attuale della history, se è null uso un array vuoto
    const idx = current.findIndex((r) => r.id === resolved.id);
    if (idx === -1) { // Se non esiste un documento con lo stesso id, lo aggiungo in coda alla history
      this.resultsHistorySubject.next([...current, resolved]); // Creo un nuovo array con tutti gli elementi attuali più il nuovo documento, e lo emetto come nuovo stato della history
    } else { // Se esiste già un documento con lo stesso id, lo sostituisco con il nuovo documento aggiornato
      const copy = [...current];
      copy[idx] = resolved;
      this.resultsHistorySubject.next(copy); // Emitto il nuovo array aggiornato come nuovo stato della history
    }
    this.refreshDynamicFilterOptions(); // Refresho i filtri dinamici, nel nostro caso Categorie e Reparti che si basano su valori presenti nei documenti della history.
  }

  private refreshDynamicFilterOptions(): void {
    this.fetchCategories();
    this.fetchDepartment();
  }

  private removeUploadedDocumentFromLocalState(uploadedDocumentId: number): void {
    const currentHistory = this.resultsHistorySubject.value ?? [];
    this.resultsHistorySubject.next(currentHistory.filter((row) => row.parentId !== uploadedDocumentId));

    const currentSessionParents = this.sessionParentsSubject.value;
    this.sessionParentsSubject.next(currentSessionParents.filter((parent) => parent.id !== uploadedDocumentId));

    const currentNames = this.parentNamesSubject.value;
    if (uploadedDocumentId in currentNames) {
      const nextNames = { ...currentNames };
      delete nextNames[uploadedDocumentId];
      this.parentNamesSubject.next(nextNames);
    }

    const currentPageCounts = this.parentPageCountsSubject.value;
    if (uploadedDocumentId in currentPageCounts) {
      const nextPageCounts = { ...currentPageCounts };
      delete nextPageCounts[uploadedDocumentId];
      this.parentPageCountsSubject.next(nextPageCounts);
    }

    this.refreshDynamicFilterOptions();
  }

  private fetchExtractedDocumentAndUpsert(extractedDocumentId: number): void { // Il metodo usa l'id passato del documento estratto, recupera il documento dal backend e lo deserializza, poi lo upserta nella history dei risultati.
    this.http.get<any>(`${API_BASE}/documents/extracted/${extractedDocumentId}`).subscribe({
      next: ({ extracted_document }) => {
        const split = this.serializer.deserializeExtractedDocument(extracted_document);
        this.upsertInHistory(split);
      },
      error: (err) => console.error(`Errore nel recupero realtime del documento estratto ${extractedDocumentId}:`, err),
    });
  }

  private refreshExtractedDocumentsForUpload(uploadedDocumentId: number): void { // il metodo usa l'id passato, sempre del documento padre, e recupera la risposta al backend che contiene i dati che gli servono per aggiornare i valori mostrati del padre, che prima erano derivanti dal file caricato e ora vengono presi dal backend. Infine refresha la history.
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

    /** GET /documents/extracted/:id */
  public fetchExtractedDocument(id: number): void {
    this.refreshScheduledDocuments$().subscribe(() => {
      this.http.get<any>(`${API_BASE}/documents/extracted/${id}`).subscribe({
        next: ({ extracted_document }) => {
          const split = this.resolveScheduledState(this.serializer.deserializeExtractedDocument(extracted_document));
          this.resultSubject.next(split);
        },
        error: (err) => console.error('Errore nel recupero del documento estratto:', err),
      });
    });
  }

  private refreshScheduledDocuments$(): Observable<void> {
    return this.http.get<any>(`${API_BASE}/sendings`).pipe(
      map((res) => {
        const now = new Date();
        this.scheduledDocuments = new Map(
          (res.sendings as any[])
            .filter((s) => new Date(s.sent_at) > now)
            .map((s) => [s.extracted_document_id as number, new Date(s.sent_at)])
        );
      })
    );
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

  /** DELETE /documents/uploads/:id */
  public deleteUploadedDocument(uploadedDocumentId: number): void {
    if (!uploadedDocumentId) {
      return;
    }

    this.http.delete<any>(`${API_BASE}/documents/uploads/${uploadedDocumentId}`).subscribe({
      next: () => this.removeUploadedDocumentFromLocalState(uploadedDocumentId),
      error: (err) => console.error('Errore durante eliminazione documento:', err),
    });
  }


  /** POST /templates */
  public newTemplate(name: string, content: string): void {
    this.http.post<any>(`${API_BASE}/templates`, { subject: name, body: content }).subscribe({
      next: ({ template }) =>
        this.templatesSubject.next([
          ...this.templatesSubject.value,
          { id: template.id, name: template.subject, content: template.body },
        ]),
      error: (err) => console.error('Errore nella creazione del template:', err),
    });
  }
  /** GET /templates */
  public fetchTemplates(): void {
    this.http.get<any>(`${API_BASE}/templates`).subscribe({
      next: ({ templates }) => {
        const baseTemplates = (templates ?? []) as { id: number; subject: string }[];

        if (baseTemplates.length === 0) {
          this.templatesSubject.next([]);
          return;
        }

        forkJoin(
          baseTemplates.map((template) =>
            this.http.get<any>(`${API_BASE}/templates/${template.id}`).pipe(
              map(({ template: fullTemplate }) => ({
                id: fullTemplate.id,
                name: fullTemplate.subject,
                content: fullTemplate.body,
              }))
            )
          )
        ).subscribe({
          next: (fullTemplates) => this.templatesSubject.next(fullTemplates),
          error: (err) => console.error('Errore nel recupero dei dettagli template:', err),
        });
      },
      error: (err) => console.error('Errore nel recupero dei template:', err),
    });
  }

  /** POST /sendings */
  public createSending$(payload: CreateSendingPayload): Observable<any> {
    return this.http.post<any>(`${API_BASE}/sendings`, payload).pipe(
      tap(() => {
        const sentAt = new Date(payload.sent_at);
        if (sentAt > new Date()) {
          this.scheduledDocuments.set(payload.extracted_document_id, sentAt);
        }
      })
    );
  }

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
    // Add a cache buster to avoid serving a stale PDF after range reassignment.
    window.open(`${API_BASE}/documents/extracted/${id}/pdf?t=${Date.now()}`, '_blank');
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
        tap((response) => {
          const jobId = String(response?.job_id ?? '').trim();
          if (jobId) {
            this.subscribeToReassignRangeUpdates(jobId, id);
          }
        }),
        // Initial refresh to align UI with immediate queued/in_progress transition.
        switchMap(() => this.http.get<any>(`${API_BASE}/documents/extracted/${id}`)),
        map(({ extracted_document }) => this.serializer.deserializeExtractedDocument(extracted_document)),
        tap((updated) => {
          this.resultSubject.next(updated);
          this.upsertInHistory(updated);
        })
      );
  }

  private subscribeToJobUpdates(
    jobId: string,
    onMessage: (payload: any, socket: WebSocket) => void,
    onConfirmSubscription?: () => void,
    onError?: (error: Event) => void
  ): void {
    const socket = new WebSocket(WS_URL, ['actioncable-v1-json', 'actioncable-unsupported']);
    const identifier = JSON.stringify({ channel: 'DocumentProcessingChannel', job_id: jobId });

    socket.onopen = () => {
      socket.send(JSON.stringify({ command: 'subscribe', identifier }));
    };

    socket.onmessage = (event) => {
      const cable = JSON.parse(event.data);

      if (cable.type === 'welcome' || cable.type === 'ping') {
        return;
      }

      if (cable.type === 'confirm_subscription') {
        onConfirmSubscription?.();
        return;
      }

      if (cable.type === 'reject_subscription') {
        console.error('Sottoscrizione ActionCable rifiutata per job:', jobId);
        socket.close();
        return;
      }

      const payload = cable.message;
      if (!payload) {
        return;
      }

      onMessage(payload, socket);
    };

    socket.onerror = (error) => {
      console.error('Errore WebSocket per job:', jobId, error);
      onError?.(error);
      socket.close();
    };
  }

  private subscribeToReassignRangeUpdates(jobId: string, extractedDocumentId: number): void {
    this.subscribeToJobUpdates(
      jobId,
      (payload, socket) => {
        const payloadExtractedId = Number(payload.extracted_document_id) || extractedDocumentId;
        if (payloadExtractedId !== extractedDocumentId) {
          return;
        }

        if (payload.event === 'document_processed') {
          this.fetchExtractedDocumentAndUpsert(extractedDocumentId);
        }

        if (payload.event === 'processing_completed' || payload.event === 'processing_failed') {
          this.fetchExtractedDocumentAndUpsert(extractedDocumentId);
          socket.close();
        }
      }
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
    this.refreshScheduledDocuments$().pipe(
      switchMap(() => this.http.get<any>(`${API_BASE}/documents/uploads`)),
      switchMap((uploadsResponse) => {
        const requests: Observable<any>[] = uploadsResponse.uploaded_documents.map((ud: any) => {
          if (ud?.id && ud?.original_filename) {
            this.setParentName(ud.id, ud.original_filename);
            this.setParentPageCount(ud.id, ud.page_count);
          }
          return this.http.get<any>(`${API_BASE}/documents/uploads/${ud.id}/extracted`);
        });

        return forkJoin(requests);
      })
    ).subscribe({
      next: (responses) => {
        responses.forEach(response => {
          response.extracted_documents
            .map((raw: any) => this.serializer.deserializeExtractedDocument(raw))
            .forEach((s: ResultSplit) => this.upsertInHistory(s));
        });
      },
      error: (err) => console.error('Errore generale:', err),
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


    public updateResult(result: ResultSplit): void {
    this.resultSubject.next(result);
    this.upsertInHistory(result);
  }

}