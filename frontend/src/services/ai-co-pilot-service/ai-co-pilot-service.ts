import { inject, Injectable } from '@angular/core';

import { ResultAiCopilotSerializer } from '../../app/shared/serializers/result-ai-copilot.serializer';
import { ResultSplit } from '../../app/shared/models/result-split.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AiCoPilotService {
  private serializer = inject(ResultAiCopilotSerializer);
  private resultSubject : BehaviorSubject<ResultSplit | null> = new BehaviorSubject<ResultSplit | null>(null);
  currentResult$ = this.resultSubject.asObservable();

  private templatesSubject = new BehaviorSubject<{ name: string; content: string }[]>([]);
  templates$ = this.templatesSubject.asObservable();

  private categorySubject = new BehaviorSubject<string[]>([]);
  category$ = this.categorySubject.asObservable();

  private employeesSubject = new BehaviorSubject<{ id: number; name: string; email?: string; employeeCode?: string }[]>([]);
  employees$ = this.employeesSubject.asObservable();
// aggiunto MA VEDIAMO SE VA BENE; SERVE PER ALTRI DOCUMENTI ESTRATTI
  private otherExtractedDocumentsSubject = new BehaviorSubject<{ id: number; destinatario: string; confidenza: number }[]>([]);
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
  private processDocument(file: File, company: string, department: string, category: string, competence_period: string) : void {
      //qui dentro chiama addCategory
      //poi faccio anche addDepartment 
  }

  public getDocumentsByParent(parentId: number, currentResultId?: number) : void {
    //todo implementare con chiamata al backend
    //serializer
    //BISOGNA USARE I WEBSOCKET ANCHE QUI EHH, PRECHÈ LO USIAMO PER PRENDERE DOCUMENTI PER PADRE MA È POSSIBILE CHE NON SIANO STATI PROCESSATI
    if (!parentId) {
      this.otherExtractedDocumentsSubject.next([]);
      return;
    }

    // Mock: simula ResultSplit dal backend
    const mockResultSplits: ResultSplit[] = [
      {
        name: 'Result 1',
        state: 'Pronto' as any,
        confidence: 96,
        recipientId: parentId * 10 + 1,
        recipientName: 'Anna Blu',
        recipientEmail: 'anna.blu@azienda.it',
        recipientCode: 'EMP010',
        time_Analysis: 1200,
        page_end: 5,
        page_start: 1,
        company: 'AziendaA',
        department: 'HR',
        month_year: '202603',
        category: 'Buste paga',
        data: new Date(),
        parentId: parentId,
        id: parentId * 10 + 1,
      } as ResultSplit,
      {
        name: 'Result 2',
        state: 'Pronto' as any,
        confidence: 91,
        recipientId: parentId * 10 + 2,
        recipientName: 'Paolo Neri',
        recipientEmail: 'paolo.neri@azienda.it',
        recipientCode: 'EMP011',
        time_Analysis: 1100,
        page_end: 4,
        page_start: 1,
        company: 'AziendaA',
        department: 'Finance',
        month_year: '202603',
        category: 'Cedolini',
        data: new Date(),
        parentId: parentId,
        id: parentId * 10 + 2,
      } as ResultSplit,
      {
        name: 'Result 3',
        state: 'Pronto' as any,
        confidence: 87,
        recipientId: parentId * 10 + 3,
        recipientName: 'Lucia Verdi',
        recipientEmail: 'lucia.verdi@azienda.it',
        recipientCode: 'EMP012',
        time_Analysis: 1000,
        page_end: 3,
        page_start: 1,
        company: 'AziendaA',
        department: 'Operations',
        month_year: '202603',
        category: 'Stipendi',
        data: new Date(),
        parentId: parentId,
        id: parentId * 10 + 3,
      } as ResultSplit,
    ];

    // Escludere il result corrente dalla lista
    const filtered = mockResultSplits.filter(r => r.recipientId !== currentResultId);

    // Mappare a OtherExtractDocumentRow
    const displayRows = filtered.map(r => ({
      id: r.recipientId,
      destinatario: r.recipientName,
      confidenza: r.confidence,
    }));

    this.otherExtractedDocumentsSubject.next(displayRows);
  }


  public newTemplate(name: string, content: string): void{
    //post al backend
    const mockStyle = { name, content };
    //aggiungi all'array stylesSubject il nuovo stile (in un caso reale, dopo aver ricevuto conferma dal backend)
    this.templatesSubject.next([...this.templatesSubject.value, mockStyle]);

  }

  public fetchTemplates() : void {
    const mockData = [
      { name: 'Template 1', content: 'Descrizione del template 1' },
      { name: 'Template 2', content: 'Descrizione del template 2' },
      { name: 'Template 3', content: 'Descrizione del template 3' },
      { name: 'Template 4', content: 'Descrizione del template 4' },
      { name: 'Template 5', content: 'Descrizione del template 5' },
      { name: 'Template 6', content: 'Descrizione del template 6' },
    ];
    this.templatesSubject.next(mockData);
     
  }
  public addCategory() : void {
    //todo implementare con chiamata al backend

    //qui voglio un fucking push su categorySubject, in modo che la view riceva la notifica e si aggiorni!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  }

  public fetchCompanies() : void {
    //todo implementare con chiamata al backend
  }

  public addDepartment(idCompany: string) : void {
    //todo implementare con chiamata al backend
  }
  getOriginalPdfById(id: number) : void {
    // window.open('/Candidatura RTB.pdf', '_blank');
  }
  getPdfById(id: number) : void {
    // window.open('/Candidatura RTB.pdf', '_blank');
  }

  modifyDocumentRange(id: number, page_start: number, page_end: number) : void {
    //todo implementare con chiamata al backend
  }

  fetchHistoryResults(){
    //qui obv si usa anche il serializer!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  }

  fetchEmployeesByCompany(idCompany: string) : void {
    //todo implementare con chiamata al backend
    const mockEmployees = [
      { id: 1, name: 'Mario Rossi', email: 'mario.rossi@azienda.it', employeeCode: 'EMP001' },
      { id: 2, name: 'Giulia Bianchi', email: 'giulia.bianchi@azienda.it', employeeCode: 'EMP002' },
      { id: 3, name: 'Luca Verdi', email: 'luca.verdi@azienda.it', employeeCode: 'EMP003' },
      { id: 4, name: 'Sara Neri', email: 'sara.neri@azienda.it', employeeCode: 'EMP004' },
    ];

    if (!idCompany) {
      this.employeesSubject.next([]);
      return;
    }

    this.employeesSubject.next(mockEmployees);
  }

  //todo modifica data di un result
  //todo modifica categoria di un result
  // todo modifica azienda di un result
  // todo modifica dipartimento di un result

  updateResult(result: ResultSplit): void {
    this.resultSubject.next(result);
  }

}
