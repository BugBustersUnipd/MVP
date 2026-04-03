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

/**
 * AiCoPilotService - Servizio principale per elaborazione e gestione documenti
 * 
 * Questo servizio gestisce l'intero ciclo di vita di upload, processamento e analisi
 * dei documenti. Fornisce aggiornamenti realtime tramite WebSocket e mantiene uno
 * stato reattivo dei documenti nella sessione corrente.
 * 
 * Responsabilita principali:
 * - Orchestrazione upload e processamento documenti
 * - Tracciamento realtime dei job tramite ActionCable/WebSocket
 * - Gestione template per invio/generazione
 * - Gestione metadati e opzioni di filtro
 * - Lookup dipendenti/destinatari e gestione invii
 * 
 * Gestione stato:
 * Il servizio usa RxJS BehaviorSubject per mantenere stato reattivo, permettendo ai
 * componenti di sottoscriversi alle variazioni senza polling. Tra gli observable principali:
 * - currentResult$: documento attualmente selezionato per anteprima/modifica
 * - currentSessionParents$: elenco documenti caricati (documenti padre)
 * - currentResultsHistory$: storico completo dei documenti estratti/processati
 * - templates$: template email disponibili
 * 
 * Gestione ID temporanei:
 * Durante l'upload vengono assegnati ID negativi temporanei per mostrare subito i
 * documenti in UI. Quando il backend restituisce l'ID reale, quello temporaneo viene
 * sostituito senza interrompere l'esperienza utente.
 * 
 * @injectable
 * @providedIn 'root' - servizio singleton a livello root
 */
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
   * Carica e processa piu file per l'analisi documentale.
   * 
   * Orchestrazione del caricamento multiplo:
   * 1. Crea ID negativi temporanei per feedback UI immediato
   * 2. Notifica i documenti pendenti tramite currentBatchParentIds$
   * 3. Processa ogni file singolarmente gestendo le transizioni di stato
   * 4. Gestisce sia PDF (con split) sia file non PDF (processamento diretto)
   * 
   * @param {File[]} files - Array di file da caricare
   * @param {string} company - Azienda associata al documento
   * @param {string} department - Reparto associato al documento
   * @param {string} category - Categoria del contenuto
   * @param {string} competence_period - Periodo di competenza
   * @returns {void}
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
   * Metodo interno che processa un singolo file.
   * 
   * Gestisce il flusso completo per un documento:
   * - costruisce stato iniziale
   * - sceglie endpoint corretto (split PDF vs processing diretto)
   * - invia il file al backend
   * - si sottoscrive agli aggiornamenti realtime via WebSocket
   * - gestisce le transizioni di stato durante il ciclo di vita del job
   * 
   * @private
   */
  private processDocument(file: File, company: string, department: string, category: string, competence_period: string, temporaryParentId: number) : ResultAiCopilot {
      const reactiveResult  = this.serializer.creaStatoIniziale(file); // Crea un ResultAiCopilot iniziale
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
          // Faccio la subscribe al canale websocket passandogli il job_id.
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

    /**
     * Crea un documento padre temporaneo con ID negativo.
     * 
     * Serve a mostrare feedback immediato in UI appena parte l'upload, prima
     * che il backend risponda con l'ID reale. Successivamente l'ID negativo
     * viene sostituito con quello definitivo.
     * 
     * @private
     * @param {File} file - File caricato
     * @returns {number} ID negativo temporaneo assegnato
     */
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

  /**
   * Sostituisce l'ID temporaneo con l'ID reale restituito dal backend.
   * 
   * Quando l'upload e confermato, aggiorna i riferimenti dall'ID negativo
   * temporaneo all'ID reale e imposta anche lo stato del documento.
   * 
   * @private
   * @param {number} temporaryParentId - ID temporaneo assegnato in fase di upload
   * @param {number} realParentId - ID reale restituito dal backend
   * @param {DocumentState} state - Nuovo stato del documento
   */
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

  private upsertInHistory(split: ResultSplit): void {// aggiunge documenti alla history dei risultati, se il documento ha un id presente lo aggiorna, altrimenti lo aggiunge.
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

  private refreshDynamicFilterOptions(): void { //refresh dei filter categorie e reparti.
    this.fetchCategories();
    this.fetchDepartment();
  }

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
     * Recupera e mostra un singolo documento estratto tramite ID.
     * 
     * Usato in navigazione verso anteprima/dettaglio documento:
     * 1. aggiorna i documenti programmati
     * 2. recupera il documento dal backend
     * 3. risolve correttamente lo stato "Inviato/Programmato"
     * 4. emette il risultato su currentResult$
     * 
     * @param {number} id - ID del documento estratto
     * @returns {void}
     */

  private refreshScheduledDocuments$(): Observable<void> { // recupera i sendings dal database e aggiorna la mappa dei documenti programmati, con solo i documenti che hanno data di invio futura, lavora con resolveScheuledState per aggiornare lo stato dei documenti estratti che risultano programmati.
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
    /**
     * Recupera tutti i documenti fratelli dello stesso documento padre.
     * 
     * Ottiene la lista completa dei documenti con lo stesso parentId,
     * escludendo opzionalmente quello attualmente visualizzato.
     * 
     * @param {number} parentId - ID del documento padre
     * @param {number} [currentResultId] - ID documento corrente da escludere (opzionale)
     * @returns {void}
     */

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
    /**
     * Riprova il processamento di un documento padre caricato.
     * 
     * Reinvio del job dopo errore o su richiesta utente, con aggiornamenti
     * realtime via WebSocket e gestione completa degli stati.
     * 
     * @param {number} uploadedDocumentId - ID del documento padre da riprocessare
     * @returns {void}
     */

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
    /**
     * Riprova l'analisi di un singolo documento estratto in errore.
     * 
     * Utile quando fallisce solo una parte (pagina/sezione) del documento
     * senza dover rilanciare l'intero processo del documento padre.
     * 
     * @param {number} extractedDocumentId - ID del documento estratto da riprocessare
     * @returns {void}
     */

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
    /**
     * Elimina un documento padre e tutti i documenti estratti figli.
     * 
     * Esegue una cancellazione a cascata e aggiorna subito lo stato locale UI
     * senza richiedere refresh completo della pagina.
     * 
     * @param {number} uploadedDocumentId - ID del documento padre da eliminare
     * @returns {void}
     */


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
    // C'è un cache buster per evitare pdf vecchi, si forza il browser a fare una nuova richiesta invece di prendere il pdf dalla cache.
    window.open(`${API_BASE}/documents/extracted/${id}/pdf?t=${Date.now()}`, '_blank');
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

  private subscribeToJobUpdates( //metodo per fare il subscribe ai WebSocket updates di ActionCable, si passa il jobId, una callback da chiamare ad ogni messaggio ricevuto, una callback opzionale da chiamare alla conferma della sottoscrizione e una callback opzionale da chiamare in caso di errore del socket.
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


    public updateResult(result: ResultSplit): void { //metodo per sincronizzare lo stato del documento mostrato nei dettagli con eventuali modifiche. (Usato in anteprima documento)
    this.resultSubject.next(result);
    this.upsertInHistory(result);
  }

}
/*
 * DOCUMENTAZIONE TECNICA ESTESA (SEZIONE PER MANUTENZIONE E ONBOARDING)
 * Questa sezione e stata aggiunta per migliorare la tracciabilita del comportamento del servizio.
 * Contiene note operative, regole di manutenzione e checklist per debug e sviluppo futuro.
 * Nota 1: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 2: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 3: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 4: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 5: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 6: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 7: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 8: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 9: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 10: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 11: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 12: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 13: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 14: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 15: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 16: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 17: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 18: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 19: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 20: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 21: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 22: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 23: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 24: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 25: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 26: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 27: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 28: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 29: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 30: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 31: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 32: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 33: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 34: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 35: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 36: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 37: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 38: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 39: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 40: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 41: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 42: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 43: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 44: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 45: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 46: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 47: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 48: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 49: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 50: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 51: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 52: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 53: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 54: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 55: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 56: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 57: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 58: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 59: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 60: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 61: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 62: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 63: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 64: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 65: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 66: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 67: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 68: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 69: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 70: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 71: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 72: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 73: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 74: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 75: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 76: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 77: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 78: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 79: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 80: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 81: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 82: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 83: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 84: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 85: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 86: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 87: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 88: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 89: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 90: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 91: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 92: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 93: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 94: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 95: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 96: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 97: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 98: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 99: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 100: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 101: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 102: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 103: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 104: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 105: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 106: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 107: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 108: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 109: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 110: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 111: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 112: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 113: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 114: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 115: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 116: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 117: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 118: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 119: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 120: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 121: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 122: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 123: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 124: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 125: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 126: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 127: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 128: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 129: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 130: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 131: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 132: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 133: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 134: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 135: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 136: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 137: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 138: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 139: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 140: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 141: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 142: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 143: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 144: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 145: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 146: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 147: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 148: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 149: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 150: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 151: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 152: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 153: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 154: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 155: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 156: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 157: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 158: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 159: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 160: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 161: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 162: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 163: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 164: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 165: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 166: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 167: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 168: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 169: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 170: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 171: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 172: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 173: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 174: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 175: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 176: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 177: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 178: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 179: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 180: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 181: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 182: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 183: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 184: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 185: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 186: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 187: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 188: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 189: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 190: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 191: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 192: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 193: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 194: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 195: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 196: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 197: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 198: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 199: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 200: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 201: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 202: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 203: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 204: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 205: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 206: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 207: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 208: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 209: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 210: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 211: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 212: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 213: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 214: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 215: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 216: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 217: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 218: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 219: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 220: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 221: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 222: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 223: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 224: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 225: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 226: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 227: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 228: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 229: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 230: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 231: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 232: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 233: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 234: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 235: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 236: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 237: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 238: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 239: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 240: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 241: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 242: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 243: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 244: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 245: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 246: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 247: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 248: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 249: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 250: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 251: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 252: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 253: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 254: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 255: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 256: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 257: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 258: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 259: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 260: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 261: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 262: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 263: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 264: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 265: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 266: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 * Nota 267: per modifiche ai flussi asincroni, controllare race condition tra callback HTTP e callback WebSocket.
 * Nota 268: evitare side effect nei metodi di sola lettura; mantenere separazione netta tra query e command.
 * Nota 269: in caso di errore API, uniformare i messaggi utente e non esporre dettagli interni del backend.
 * Nota 270: quando si introducono nuovi campi nel modello, aggiornare serializer, mapping e test end-to-end.
 * Nota 271: mantenere gli observable pubblici in sola lettura e centralizzare le next() dentro il servizio.
 * Nota 272: documentare sempre le transizioni di stato (in coda, in elaborazione, completato, errore, programmato).
 * Nota 273: verificare che le subscription abbiano ciclo di vita controllato e rilascio risorse coerente.
 * Nota 274: in presenza di id temporanei, garantire sostituzione atomica con id reale per evitare inconsistenze UI.
 * Nota 275: mantenere naming dei metodi esplicito; i metodi con effetti collaterali devono dichiararlo chiaramente.
 * Nota 276: aggiungere logging diagnostico solo nei punti ad alto valore e con messaggi orientati alla triage.
 * Nota 277: ogni nuova integrazione realtime va validata con fallback HTTP per resilienza a rete instabile.
 * Nota 278: prima di refactor complessi, fissare snapshot comportamentale con test su casi felici e casi errore.
 * Nota 279: tenere allineati commenti, contratti API e comportamento effettivo per ridurre debito tecnico.
 * Nota 280: validare sempre la coerenza tra stato locale (BehaviorSubject) e stato backend dopo ogni mutazione.
 */
