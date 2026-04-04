import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ResultAiCopilotSerializer } from '../../app/shared/serializers/result-ai-copilot.serializer';
import { RecipientInfo, ResultSplit, State} from '../../app/shared/models/result-split.model';
import { BehaviorSubject, map, Observable, switchMap, tap, forkJoin } from 'rxjs';
import { Company } from '../../app/shared/models/result-ai-assistant.model';
import { CreateSendingPayload, DocumentState, ResultAiCopilot, TemplateOption } from '../../app/shared/models/result-ai-copilot.model';



// Costanti di configurazione API
const API_BASE = 'http://localhost:3000'; // URL base del backend API (in produzione sostituire con URL reale)
const WS_URL = 'ws://localhost:3000/cable'; // URL WebSocket per ActionCable (in produzione usare wss://)

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

  private employeesSubject = new BehaviorSubject<RecipientInfo[]>([]);
  // Observable pubblico per sottoscrizione alle liste dipendenti/destinatari
  employees$ = this.employeesSubject.asObservable();

  private companiesSubject = new BehaviorSubject<Company[]>([]);
  // Observable pubblico delle aziende disponibili nell'applicazione
  companies$ = this.companiesSubject.asObservable();

  private departmentSubject = new BehaviorSubject<string[]>([]);
  // Observable pubblico per filtri reparto dinamici estratti dai documenti correnti
  department$ = this.departmentSubject.asObservable();

  private stateSubject = new BehaviorSubject<string[]>([]);
  // Observable pubblico per opzioni filtro stato documento
  state$ = this.stateSubject.asObservable();
  
  private confidenceSubject = new BehaviorSubject<string[]>([]);
  // Observable pubblico per soglie di confidence usate nei filtri
  confidence$ = this.confidenceSubject.asObservable();
  // Mantiene i documenti estratti "fratelli" (stesso documento padre)
  private otherExtractedDocumentsSubject = new BehaviorSubject<ResultSplit[]>([]);
  otherExtractedDocuments$ = this.otherExtractedDocumentsSubject.asObservable();

  /**
   * Avvia l'upload di una batch di file creando parent temporanei e processamento asincrono.
   * @param files File da caricare.
   * @param company Azienda selezionata.
   * @param department Reparto selezionato.
   * @param category Categoria selezionata.
   * @param competence_period Periodo di competenza.
   */
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

  /**
   * Processa un singolo file inviandolo al backend e gestendo la risposta realtime.
   * @param temporaryParentId Id temporaneo assegnato al parent.
   * @returns Stato reattivo iniziale del documento padre.
   */
  private processDocument(file: File, company: string, department: string, category: string, competence_period: string, temporaryParentId: number) : ResultAiCopilot {
    const reactiveResult  = this.createInitialState(file); // Crea un ResultAiCopilot iniziale
    reactiveResult.ResultSplit.forEach(split => this.upsertInHistory(split)); // Aggiungo subito alla history per far comparire i documenti splittati subito in lista
    const { endpoint, formData } = this.buildUploadRequest(file, company, department, category, competence_period);

    this.http.post<any>(endpoint, formData).subscribe({
      next: (response) => this.handleProcessDocumentResponse(response, reactiveResult, temporaryParentId),
      error: (error) => {
        this.removeSessionParent(temporaryParentId);
        throw new Error('Errore durante l\'upload del documento: ' + error.message);
      }
    });

    return reactiveResult;
  }

  /**
   * Costruisce endpoint e FormData per upload PDF o file generico.
   * @returns Endpoint e payload FormData pronti per la chiamata HTTP.
   */
  private buildUploadRequest(file: File, company: string, department: string, category: string, competence_period: string): { endpoint: string; formData: FormData } {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const endpoint = isPdf ? `${API_BASE}/documents/split` : `${API_BASE}/documents/process_file`; // Se è PDF uso endpoint split, altrimenti direttamente process_file che accetta anche altri tipi di file e faccio il processing senza passare dallo split. In questo modo supporto anche file di testo, excel, ecc. senza doverli splittare in pagine.
    const fileParam = isPdf ? 'pdf' : 'file';

    const formData = new FormData();
    formData.append(fileParam, file); // Il backend si aspetta il file con chiave 'pdf' se è un PDF, altrimenti 'file' per altri tipi di documento.
    formData.append('category', category);
    formData.append('company', company);
    formData.append('department', department);
    formData.append('competence_period', competence_period); // e passo tutti gli altri metadati

    return { endpoint, formData };
  }

  /**
   * Gestisce la risposta iniziale del processamento e apre la sottoscrizione ai job updates.
   * @param response Risposta backend all'upload.
   * @param reactiveResult Stato locale del parent.
   * @param temporaryParentId Id temporaneo da sostituire.
   */
  private handleProcessDocumentResponse(response: any, reactiveResult: ResultAiCopilot, temporaryParentId: number): void {
    const uploadedDocumentId = Number(response?.uploaded_document_id) || 0; // uploadedDocumentId è Id del doc padre
    reactiveResult.id = uploadedDocumentId;

    // Se si passa un file duplicato ovvero già analizzato, il backend ritorna job_id vuoto, verrà dunque restituito lo stesso documento già analizzato. Senza far ripartire analisi.
    if (!response.job_id) {
      this.syncUploadedDocumentState(uploadedDocumentId, DocumentState.Completato, reactiveResult);
      this.replacePendingParentId(temporaryParentId, uploadedDocumentId, DocumentState.Completato);
      return;
    }

    reactiveResult.state = DocumentState.InElaborazione; // Stato In Elaborazione del padre poichè il job_id è presente poichè il doc non è duplicato.
    this.replacePendingParentId(temporaryParentId, uploadedDocumentId, DocumentState.InElaborazione); // Sostituisco l'id temporaneo del parent con quello reale arrivato dal backend in risposta, e imposto stato in elaborazione
    this.subscribeToJobUpdates(
      response.job_id,
      (payload, socket) => this.handleProcessDocumentJobUpdate(payload, socket, uploadedDocumentId, reactiveResult),
      () => {
        // Immediate sync avoids UI lag if split artifacts are already persisted.
        if (uploadedDocumentId > 0) {
          this.refreshExtractedDocumentsForUpload(uploadedDocumentId);
        }
      }
    );
  }

  /**
   * Gestisce gli eventi realtime del job di processamento.
   * @param payload Messaggio ricevuto via WebSocket.
   * @param socket Socket attiva del job.
   * @param uploadedDocumentId Id reale del documento padre.
   * @param reactiveResult Stato locale del parent.
   */
  private handleProcessDocumentJobUpdate(payload: any, socket: WebSocket, uploadedDocumentId: number, reactiveResult: ResultAiCopilot): void {
    const evt = payload.event;

    if (evt === 'document_processed') {  //se viene tornato document processed, recupero l'id del documento estratto e recupero il documento ed aggiorno la history.
      const extractedDocumentId = Number(payload.extracted_document_id) || 0;
      if (extractedDocumentId > 0) {
        this.fetchExtractedDocumentAndUpsert(extractedDocumentId);
      }
    }

    if (evt === 'split_completed') { // se lo split è completato, aggiorno lo stato del documento padre
      if (payload.status === 'error') { // se lo split da errore
        this.syncUploadedDocumentState(uploadedDocumentId, DocumentState.Failed, reactiveResult);
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
      this.syncUploadedDocumentState(uploadedDocumentId, completedWithError ? DocumentState.Failed : DocumentState.Completato, reactiveResult);
      socket.close();
    }

    if (evt === 'processing_failed') { // fallback legacy: backend attuale usa processing_completed con status=error
      console.error('Elaborazione fallita per il documento:', payload.error);
      this.syncUploadedDocumentState(uploadedDocumentId, DocumentState.Failed, reactiveResult);
      socket.close();
    }
  }

  /**
   * Sincronizza lo stato del documento padre sia in memoria locale sia nella lista sessione.
   * @param uploadedDocumentId Id del documento padre.
   * @param state Nuovo stato del documento.
   * @param reactiveResult Riferimento opzionale allo stato locale reattivo.
   */
  private syncUploadedDocumentState(uploadedDocumentId: number, state: DocumentState, reactiveResult?: ResultAiCopilot): void {
    if (reactiveResult) {
      reactiveResult.state = state;
    }

    if (uploadedDocumentId > 0) {
      this.refreshExtractedDocumentsForUpload(uploadedDocumentId);
      this.updateSessionParentState(uploadedDocumentId, state);
    }
  }

  /**
   * Crea un parent temporaneo in stato InCoda per feedback UI immediato.
   * @param file File caricato dall'utente.
   * @returns Id temporaneo negativo assegnato al parent.
   */
  private addPendingParent(file: File): number { // crea parent temporaneo con id negativo e stato "In coda", lo aggiunge alla lista dei parent della sessione e ritorna l'id temporaneo assegnato.
    const id = this.tempParentId--;
    const parent: ResultAiCopilot = { ...this.createInitialState(file), id };
    this.sessionParentsSubject.next([...this.sessionParentsSubject.value, parent]);
    this.setParentName(id, file.name);
    return id;
  }

  /**
   * Crea lo stato iniziale locale di un documento appena caricato.
   * @param file File selezionato in upload.
   * @param id Id del documento da assegnare allo stato iniziale.
   * @returns Documento padre inizializzato in coda.
   */
  private createInitialState(file: File, id = 0): ResultAiCopilot {
    return {
      id,
      name: file.name,
      pages: 0,
      state: DocumentState.InCoda,
      ResultSplit: [],
    } as ResultAiCopilot;
  }

  /**
   * Sostituisce l'id temporaneo del parent con quello reale e arrivato dal backend in risposta, e imposto uno stato al documentoi padre.
   * @param temporaryParentId Id temporaneo da rimpiazzare.
   * @param realParentId Id reale ricevuto dal backend.
   * @param state Stato da applicare al parent.
   */
  private replacePendingParentId(temporaryParentId: number, realParentId: number, state: DocumentState): void { 
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

  /**
   *Aggiorna lo stato del documento padre nella lista dei documenti caricati nella sessione. (Poichè a backend lo stato del padre non è presente)
   * @param parentId Id del documento padre.
   * @param state Stato da impostare.
   */
  private updateSessionParentState(parentId: number, state: DocumentState): void { 
    const updated = this.sessionParentsSubject.value.map((parent) =>
      parent.id === parentId ? { ...parent, state } : parent
    );
    this.sessionParentsSubject.next(updated);
  }

  /**
   * Viene chiamato quando c'è un errore nell'upload del documento, il documento padre qua ha ancora un id temporaneo negativo, dunque rimuove il parent con id temporaneo dalla lista dei parent della sessione e pulisce eventuali dati associati a quell'id temporaneo (nome, id)
   * @param parentId Id del documento padre.
   */
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

  /**
   * Salva o aggiorna il nome associato a un documento padre.
   * @param parentId Id del documento padre.
   * @param name Nome da associare.
   */
  private setParentName(parentId: number, name: string): void { 
    if (!parentId || !name) return;
    const current = this.parentNamesSubject.value;
    if (current[parentId] === name) return;
    this.parentNamesSubject.next({ ...current, [parentId]: name });
  }

  /**
   * Salva o aggiorna il numero di pagine associato a un documento padre quando riceve il dato dal backend, prima di riceverlo il numero di pagine è 0.
   * @param parentId Id del documento padre.
   * @param pageCount Numero di pagine ricevuto dal backend.
   */
  private setParentPageCount(parentId: number, pageCount: unknown): void { 
    const numeric = Number(pageCount); 
    if (!parentId || !Number.isFinite(numeric) || numeric < 1) return;
    const normalized = Math.floor(numeric);
    const current = this.parentPageCountsSubject.value;
    if (current[parentId] === normalized) return;
    this.parentPageCountsSubject.next({ ...current, [parentId]: normalized });
  }

  /**
   * Se lo stato di un documento è "Inviato" e ha un id, allora controlla se tale documento è presente nella mappa dei documenti programmati. Se la data programmata è nel futuro, imposta lo stato su "Programmato". Se la data programmata è nel passato, rimuove il documento dalla mappa e lascia lo stato su "Inviato".
   * @param split Documento estratto da normalizzare.
   * @returns Documento con stato eventualmente aggiornato.
   */
  private resolveScheduledState(split: ResultSplit): ResultSplit { 
    if (split.state !== State.Inviato || !split.id) return split;
    const scheduledAt = this.scheduledDocuments.get(split.id);
    if (!scheduledAt) return split;
    if (scheduledAt > new Date()) return { ...split, state: State.Programmato };
    this.scheduledDocuments.delete(split.id);
    return split;
  }

  /**
   * Aggiunge documenti alla history dei risultati, se il documento ha un id presente lo aggiorna, altrimenti lo aggiunge.y locale.
   * @param split Documento estratto da sincronizzare.
   */
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

  /**
   * Aggiorna le opzioni dei filtri dinamici derivate dalla history corrente.
   */
  private refreshDynamicFilterOptions(): void { 
    this.fetchCategories();
    this.fetchDepartment();
  }

  /**
   * Serve per rimuovere un documento caricato, dalla view senza far refresh completo della pagina.
   * @param uploadedDocumentId Id del documento padre da rimuovere.
   */
  private removeUploadedDocumentFromLocalState(uploadedDocumentId: number): void { // Serve per rimuovere un documento caricato, dalla view senza far refresh completo della pagina.
    const currentHistory = this.resultsHistorySubject.value ?? [];
    this.resultsHistorySubject.next(currentHistory.filter((row) => row.parentId !== uploadedDocumentId)); // rimuove dalla history i documenti che hanno come parentId l'id passato.

    const currentSessionParents = this.sessionParentsSubject.value;
    this.sessionParentsSubject.next(currentSessionParents.filter((parent) => parent.id !== uploadedDocumentId)); // rimuove il doc padre dalla lista dei parent della sessione

    const currentNames = this.parentNamesSubject.value; // rimuove il nome associato a quell'id del documento padre
    if (uploadedDocumentId in currentNames) {
      const nextNames = { ...currentNames };
      delete nextNames[uploadedDocumentId];
      this.parentNamesSubject.next(nextNames);
    }

    const currentPageCounts = this.parentPageCountsSubject.value; // rimuove il numero di pagine associato a quell'id del documento padre
    if (uploadedDocumentId in currentPageCounts) {
      const nextPageCounts = { ...currentPageCounts };
      delete nextPageCounts[uploadedDocumentId];
      this.parentPageCountsSubject.next(nextPageCounts);
    }

    this.refreshDynamicFilterOptions(); // refresh dei filtri dinamici
  }

  /**
   * Il metodo usa l'id passato del documento estratto, recupera il documento dal backend e lo deserializza, poi lo upserta nella history dei risultati.
   * @param extractedDocumentId Id del documento estratto.
   */
  private fetchExtractedDocumentAndUpsert(extractedDocumentId: number): void {
    this.http.get<any>(`${API_BASE}/documents/extracted/${extractedDocumentId}`).subscribe({
      next: ({ extracted_document }) => {
        const split = this.serializer.deserializeExtractedDocument(extracted_document);
        this.upsertInHistory(split);
      },
      error: (err) => console.error(`Errore nel recupero realtime del documento estratto ${extractedDocumentId}:`, err),
    });
  }

  /**
   * Il metodo usa l'id passato, sempre del documento padre, e recupera la risposta al backend che contiene i dati che gli servono per aggiornare i valori mostrati del padre, che prima erano derivanti dal file caricato e ora vengono presi dal backend. Infine refresha la history.
   * @param uploadedDocumentId Id del documento padre.
   */
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

    /** GET /documents/extracted/:id */
  public fetchExtractedDocument(id: number): void {  // il metodo usa l'id del documento estratto, si subscriba prima a refreshScheduledDocuments per aggiornare la mappa dei documenti programmati e poi recupera il documento dal backend, controlla se il suo stato è ancora programmato o no e lo emette come risultato corrente da mostrare nella view dei dettagli del documento.
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


  /**
   * Recupera i sendings dal database e aggiorna la mappa dei documenti programmati, con solo i documenti che hanno data di invio futura, lavora con resolveScheuledState per aggiornare lo stato dei documenti estratti che risultano programmati.
   * @returns Observable completato quando la mappa schedulazioni e sincronizzata.
   */
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
  public getDocumentsByParent(parentId: number, currentResultId?: number): void { // il metodo usa l'id del documento padre, recupera i documenti fratelli (con stesso padre), li deserializza e li emette come lista dei documenti estratti associati al documento padre, da mostrare nella view dei dettagli del documento, dove vengono mostrati i documenti fratelli ovvero con stesso documento padre.
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
  public retryDocumentProcessing(uploadedDocumentId: number): void { // rianalizza un documento già caricato, viene utilizzato quando un documento è in stato di errore.
    this.http.post<any>(`${API_BASE}/documents/uploads/${uploadedDocumentId}/retry`, {}).subscribe({
      next: (response) => {
        console.log('Riprocessamento avviato:', response);
        const jobId = response?.job_id;
        
        if (!jobId) {
          // Se non c'è job_id, significa che il documento è già elaborato
          this.fetchHistoryResults();
          return;
        }

        // Aggiorna lo stato del documento padre a InElaborazione
        this.updateSessionParentState(uploadedDocumentId, DocumentState.InElaborazione);
        
        // Sottoscritti ai WebSocket updates per il retry
        this.subscribeToJobUpdates(
          jobId,
          (payload, socket) => {
            const evt = payload.event;

            if (evt === 'document_processed') {
              const extractedDocumentId = Number(payload.extracted_document_id) || 0;
              if (extractedDocumentId > 0) {
                this.fetchExtractedDocumentAndUpsert(extractedDocumentId);
              }
            }

            if (evt === 'split_completed') {
              if (payload.status === 'error') {
                this.updateSessionParentState(uploadedDocumentId, DocumentState.Failed);
                this.refreshExtractedDocumentsForUpload(uploadedDocumentId);
                socket.close();
                return;
              }
              this.refreshExtractedDocumentsForUpload(uploadedDocumentId);
              this.updateSessionParentState(uploadedDocumentId, DocumentState.InElaborazione);
            }

            if (evt === 'processing_completed') {
              const completedWithError = payload.status === 'error';
              this.updateSessionParentState(uploadedDocumentId, completedWithError ? DocumentState.Failed : DocumentState.Completato);
              this.refreshExtractedDocumentsForUpload(uploadedDocumentId);
              socket.close();
            }

            if (evt === 'processing_failed') {
              console.error('Elaborazione fallita per il documento:', payload.error);
              this.updateSessionParentState(uploadedDocumentId, DocumentState.Failed);
              this.refreshExtractedDocumentsForUpload(uploadedDocumentId);
              socket.close();
            }
          },
          () => {
            this.refreshExtractedDocumentsForUpload(uploadedDocumentId);
          }
        );
      },
      error: (err) => console.error('Errore nel riavvio del processamento:', err),
    });
  }


  /** POST /documents/extracted/:id/retry */
  public retryExtractedDocumentProcessing(extractedDocumentId: number): void { //il metodo viene utilizzato per rianalizzare un documento già splittato, ma che risulta in stato di errore.
    this.http.post<any>(`${API_BASE}/documents/extracted/${extractedDocumentId}/retry`, {}).subscribe({
      next: (response) => {
        console.log('Rianalisi documento come estratto avviata:', response);
        const jobId = response?.job_id;
        
        if (!jobId) {
          // Se non c'è job_id, significa che il documento è già elaborato
          this.fetchHistoryResults();
          return;
        }

        // Sottoscritti ai WebSocket updates per il retry del documento estratto
        this.subscribeToJobUpdates(
          jobId,
          (payload, socket) => {
            if (payload.event === 'document_processed') {
              this.fetchExtractedDocumentAndUpsert(extractedDocumentId);
            }

            if (payload.event === 'processing_completed' || payload.event === 'processing_failed') {
              this.fetchExtractedDocumentAndUpsert(extractedDocumentId);
              socket.close();
            }
          }
        );
      },
      error: (err) => console.error('Errore nel riavvio della rianalisi:', err),
    });
  }


  /** DELETE /documents/uploads/:id */
  public deleteUploadedDocument(uploadedDocumentId: number): void { // il metodo elimina un documento padre, e dunque elimina anche tutti i suoi documenti figli estratti. Chiama la delete, si sottoscrive e appena riceve la conferma dell'eliminazione, rimuove il documento padre e i suoi figli dalla view senza dover fare un refresh completo della pagina.
    if (!uploadedDocumentId) {
      return;
    }

    this.http.delete<any>(`${API_BASE}/documents/uploads/${uploadedDocumentId}`).subscribe({
      next: () => this.removeUploadedDocumentFromLocalState(uploadedDocumentId),
      error: (err) => console.error('Errore durante eliminazione documento:', err),
    });
  }



  /** POST /templates */
  public newTemplate(name: string, content: string): void { // il metodo crea un nuovo template, chiamando l'endpoint di creazione template del backend, e appena riceve la conferma 
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
  public fetchTemplates(): void { // Il metodo recupera i template, prima recupera id e subject di tutti i template, poi per ognuno fa la chiamata per recuperare i detagli completi (id,subject,body) e li salva nello stato templatesSubject.
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
  public createSending$(payload: CreateSendingPayload): Observable<any> { // fa la post inviando dati del recipient, oggetto,corpo,template scelto e data di invio, poi quando si riceve la conferma, se la data di invio è nel futuro, aggiunge il documento alla mappa dei documenti programmati.
    return this.http.post<any>(`${API_BASE}/sendings`, payload).pipe(
      tap((res) => {
        const sentAt = new Date(res.sent_at);
        if (sentAt > new Date()) {
          this.scheduledDocuments.set(res.extracted_document_id, sentAt);
        }
      })
    );
  }

  public fetchCategories(): void {// il metodo estrae tutte le categorie presenti nei documenti della history, crea una lista di categorie uniche e la emette nello stato categorySubject, che viene usato per mostrare le opzioni di filtro per categoria nella view.
    const unique = [...new Set((this.resultsHistorySubject.value ?? []).map((r) => r.category).filter(Boolean))];
    this.categorySubject.next(unique);
  }
  public fetchDepartment(): void {// il metodo estrae tutti i reparti presenti nei documenti della history, crea una lista di reparti unici e la emette nello stato departmentSubject, che viene usato per mostrare le opzioni di filtro per reparto nella view.
    const unique = [...new Set((this.resultsHistorySubject.value ?? []).map((r) => r.department).filter(Boolean))];
    this.departmentSubject.next(unique);
  }
  public fetchState(): void {
    this.stateSubject.next(Object.values(State));
  }
  public fetchConfidence(): void {
    this.confidenceSubject.next(['0-20', '21-40', '41-60', '61-80', '81-100']);
  }
  /** GET /lookups/companies */
  /**
   * Recupera le aziende dal backend e aggiorna lo stato locale.
   */
  public fetchCompanies(): void {
    this.http.get<any>(`${API_BASE}/lookups/companies`).subscribe({
      next: (response) => {
        this.companiesSubject.next(response.companies);
        console.log('Aziende recuperate:', response.companies);
        },
      error: (err) => console.error('Errore nel recupero delle aziende:', err),
    });
  }

  
  /**
   * Apre il file originale del documento padre in una nuova scheda.
   * @param id Id del documento padre.
   */
  public getOriginalPdfById(id: number): void {
    window.open(`${API_BASE}/documents/uploads/${id}/file`, '_blank');
  }

  /**
   * Apre il PDF del documento estratto in una nuova scheda con cache buster.
   * @param id Id del documento estratto.
   */
  public getPdfById(id: number): void {
    if (this.isExtractedFromPdf(id)) {
       window.open(`${API_BASE}/documents/extracted/${id}/pdf?t=${Date.now()}`, '_blank');
      return;
    }

    const split = (this.resultsHistorySubject.value ?? []).find((row) => row.id === id);
    const parentId = split?.parentId;
    if (!parentId) {
      return;
    }

    window.open(`${API_BASE}/documents/uploads/${parentId}/file?t=${Date.now()}`, '_blank');
  }

  private isExtractedFromPdf(extractedDocumentId: number): boolean {
    const split = (this.resultsHistorySubject.value ?? []).find((row) => row.id === extractedDocumentId);
    const parentId = split?.parentId;
    if (!parentId) {
      return false;
    }

    const parentName = this.parentNamesSubject.value[parentId] ?? '';
    if (!parentName) {
      return false;
    }

    return parentName.toLowerCase().endsWith('.pdf');
  }

  /** PATCH /documents/extracted/:id/reassign_range (async) */
  public modifyDocumentRange$(id: number, page_start: number, page_end: number): Observable<ResultSplit> { // il metodo viene utilizzato per modificare l'intervallo di pagine da analizzare di un documento già splittato e analizzato, ma che si vuole rianalizzare con un intervallo di pagine diverso.
    return this.http
      .patch<any>(`${API_BASE}/documents/extracted/${id}/reassign_range`, { page_start, page_end })
      .pipe(
        tap((response) => {
          const jobId = String(response?.job_id ?? '').trim();
          if (jobId) {
            // Subscribe to WebSocket updates for range reassignment
            this.subscribeToJobUpdates(
              jobId,
              (payload, socket) => {
                const payloadExtractedId = Number(payload.extracted_document_id) || id;
                if (payloadExtractedId !== id) {
                  return;
                }

                if (payload.event === 'document_processed') {
                  this.fetchExtractedDocumentAndUpsert(id);
                }

                if (payload.event === 'processing_completed' || payload.event === 'processing_failed') {
                  this.fetchExtractedDocumentAndUpsert(id);
                  socket.close();
                }
              }
            );
          }
        }),
        // appena riceve la riposta della patch fa la get per recuperare il documento aggiornato,lo deserializza e lo upserta in history
        switchMap(() => this.http.get<any>(`${API_BASE}/documents/extracted/${id}`)),
        map(({ extracted_document }) => this.serializer.deserializeExtractedDocument(extracted_document)),
        tap((updated) => {
          this.resultSubject.next(updated);
          this.upsertInHistory(updated);
        })
      );
  }

  /**
   * Il metodo serve per fare il subscribe ai WebSocket updates di ActionCable, si passa il jobId, una callback da chiamare ad ogni messaggio ricevuto, una callback opzionale da chiamare alla conferma della sottoscrizione e una callback opzionale da chiamare in caso di errore del socket. ActionCable.
   * @param jobId Id del job backend.
   * @param onMessage Callback invocata per ogni messaggio applicativo.
   * @param onConfirmSubscription Callback opzionale alla conferma sottoscrizione.
   * @param onError Callback opzionale in caso di errore socket.
   */
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
  public fetchEmployeesByCompany(company: string): void { // Data una specifica azienda, si recuperano gli utenti associati a quell'azienda e si emettono nel Subject (employeesSubject).
    if (!company) {
      this.employeesSubject.next([]);
      return;
    }
    this.http.get<any>(`${API_BASE}/lookups/users`, { params: { company } }).subscribe({
      next: ({ users }) =>
        this.employeesSubject.next(
          users.map((u: any) => ({
            recipientId: u.id,
            recipientName: u.name,
            rawRecipientName: u.name,
            recipientEmail: u.email,
            recipientCode: u.employee_code,
          }))
        ),
      error: (err) => console.error('Errore nel recupero degli utenti:', err),
    });
  }


  /**
   * Il metodo serve per sincronizzare lo stato del documento mostrato nei dettagli con eventuali modifiche. (Usato in anteprima documento)
   * @param result Documento estratto aggiornato.
   */
    public updateResult(result: ResultSplit): void { 
    this.resultSubject.next(result);
    this.upsertInHistory(result);
  }

}
