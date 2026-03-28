import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ResultAiCopilotSerializer } from '../../app/shared/serializers/result-ai-copilot.serializer';
import { ResultSplit, State} from '../../app/shared/models/result-split.model';
import { BehaviorSubject } from 'rxjs';
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
  
  private resultSubject : BehaviorSubject<ResultSplit | null> = new BehaviorSubject<ResultSplit | null>(null);
  currentResult$ = this.resultSubject.asObservable();

  private resultsHistorySubject: BehaviorSubject<ResultSplit[] | null> = new BehaviorSubject<ResultSplit[] | null>(null);
  currentResultsHistory$ = this.resultsHistorySubject.asObservable();


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
      this.processDocument(file, company, department, category, competence_period);
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
  private processDocument(file: File, company: string, department: string, category: string, competence_period: string) : ResultAiCopilot {
      const reactiveResult  = this.serializer.creaStatoIniziale(file, company, department, category, competence_period);
      const formData = new FormData(); 
      formData.append('pdf', file);
      formData.append('category', category);
      formData.append('company', company);
      formData.append('department', department);
      formData.append('competence_period', competence_period);
      
      this.http.post<any>('URL_API/documents/split', formData).subscribe({
        next: (response) => {
          reactiveResult.state = DocumentState.InElaborazione; // Stato iniziale
          const socket = new WebSocket(WS_URL);
          const identifier = JSON.stringify({ channel: 'DocumentProcessingChannel', job_id: response.job_id });
          socket.onopen = () => {
            socket.send(JSON.stringify({ command: 'subscribe', identifier }));
          };
          socket.onmessage = (event) => {
            const cable = JSON.parse(event.data);
            if(!cable.message) return; // Ignora messaggi di sistema

            const { event: evt, extracted_document } = cable.message;
            if (evt === 'document_processed' && extracted_document) {
              const nuovoEstratto = this.serializer.deserializeExtractedDocument(extracted_document);
              reactiveResult.ResultSplit = [...reactiveResult.ResultSplit, nuovoEstratto];
            }
            if (evt === 'processing_completed') {
              reactiveResult.state = DocumentState.Completato;
              socket.close();
            }
            if (evt === 'processing_failed') {
              console.error('Elaborazione fallita per il documento:', cable.message.error);
              socket.close();
            }
          };
          socket.onerror = (error) => {
            console.error('Errore nella connessione WebSocket:', error);
            socket.close();
          };
        },
        error: (error) => {
          throw new Error('Errore durante l\'upload del documento: ' + error.message);
        }
      });
      return reactiveResult;
      //qui dentro chiama addCategory
      //poi faccio anche addDepartment 
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
        const splits: ResultSplit[] = response.extracted_documents
          .map((raw: any) => this.serializer.deserializeExtractedDocument(raw))
          .filter((s: ResultSplit) => s.id !== currentResultId);
        this.otherExtractedDocumentsSubject.next(splits);
      },
      error: (err) => console.error('Errore nel recupero dei documenti fratelli:', err),
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
    this.ConfidenceSubject.next(['0-20%', '20-40%', '40-60%', '60-80%', '80-100%']);
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
    this.http
      .patch<any>(`${API_BASE}/documents/extracted/${id}/reassign_range`, { page_start, page_end })
      .subscribe({
        next: () => this.fetchExtractedDocument(id),
        error: (err) => console.error('Errore nella modifica del range:', err),
      });
  }
    /** PATCH /documents/extracted/:id/metadata */
  public updateDocumentMetadata(id: number, metadataUpdates: Record<string, unknown>): void {
    this.http
      .patch<any>(`${API_BASE}/documents/extracted/${id}/metadata`, { metadata_updates: metadataUpdates })
      .subscribe({
        next: ({ extracted_document }) => {
          const updated = this.serializer.deserializeExtractedDocument(extracted_document);
          this.resultSubject.next(updated);
          this.upsertInHistory(updated);
        },
        error: (err) => console.error('Errore nell\'aggiornamento dei metadati:', err),
      });
  }

    /** GET /documents/uploads → carica la history iniziale via HTTP */
  public fetchHistoryResults(): void {
    if ((this.resultsHistorySubject.value ?? []).length > 0) return;
 
    this.http.get<any>(`${API_BASE}/documents/uploads`).subscribe({
      next: ({ uploaded_documents }) => {
        for (const ud of uploaded_documents) {
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
