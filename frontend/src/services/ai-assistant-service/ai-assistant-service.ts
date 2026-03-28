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
  private router = inject(Router);
  private http = inject(HttpClient);
  private resultSubject : BehaviorSubject<ResultAiAssistant | null> = new BehaviorSubject<ResultAiAssistant | null>(null);
  currentResult$ = this.resultSubject.asObservable();

  ResultsHistorySubject: BehaviorSubject<ResultAiAssistant[] | null> = new BehaviorSubject<ResultAiAssistant[] | null>(null);
  currentResultsHistory$ = this.ResultsHistorySubject.asObservable();

  constructor() {
    this.currentResult$.subscribe((updated) => {
      if (updated && updated.id > 0) {
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
        id: -1, // id temporaneo, sarà aggiornato una volta ricevuto il risultato dal backend
        title: '',
        content: '',
        imagePath: null,
        tone: tone,
        style: style,
        company: company,
        data: new Date(),
        prompt: prompt,
        evaluation: -1,
        isPost: false
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

  setEvaluation(id: number, evaluation: number) : void { //numero di GeneratedDatum
    const current = this.resultSubject.value;
    if (!current) return;

    const updated: ResultAiAssistant = {
      ...current,
      evaluation: evaluation
    };
    this.resultSubject.next(updated);

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
  //todo passare solo le cose modificate (basta mettere parametri opzionali)
  createPost(result: ResultAiAssistant): void {

    //chiamata al backend per creare un nuovo post con i dati di result

    //se va a buon fine aggiunge il risultato alla lista dei currentResultsHistory (simulando l'aggiunta del nuovo post alla cronologia delle generazioni) e reindirizza alla pagina dello storico
    const postResult: ResultAiAssistant = {
      ...result,
      isPost: true,
      id: 234
    };

    this.resultSubject.next(postResult);
    this.ResultsHistorySubject.next([...(this.ResultsHistorySubject.value || []), postResult]);
    console.log('Creazione post richiesta con i seguenti dati:', postResult);
  }

  // todo implementare chiamata al backend
  requireGeneration(prompt: string, tone: Tone, style: Style, company: Company, id?: number): number {
    console.log('Rigenerazione richiesta');
    //la chiamata al backend OVVIAMENTE viene fatta passando solo il number id, non anche name
    const pendingResult: ResultAiAssistant = {
        id: -1, // id temporaneo, sarà aggiornato una volta ricevuto il risultato dal backend
        title: '',
        content: '',
        imagePath: null,
        tone: tone,
        style: style,
        company: company,
        data: new Date(),
        prompt: prompt,
        evaluation: -1,
        isPost: false
    };

    this.resultSubject.next(pendingResult);

    //chiamata al backend
    return 0;
  }
  // todo implementare
  getGeneration(jobid: number) : void {}


  fetchResultsHistory(): void {
    if ((this.ResultsHistorySubject.value ?? []).length > 0) {
      return;
    }

    // chiamata al backend per ottenere la lista delle generazioni passate
    // per ora mocko i dati
    const mockData: ResultAiAssistant[] = [];
      // {
    //     id: 1,
    //     title: 'Generazione 1',
    //     // provo a vedere se il truncate va, metto un content luuuuuuuuuuuuuuuuuuuuuuungo
    //     content: 'Contenuto della generazione 1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    //     imagePath: null,
    //     tone: { id: 1, name: 'Simpatico' },
    //     style: { id: 3, name: 'Articolato' },
    //     company: { id: 2, name: 'AlbertoSrl' },
    //     data: new Date('2024-09-11'),
    //     prompt: 'Prompt della generazione 1',
    //     evaluation: 4,
    //     isPost: true
    //   },
    //   {
    //     id: 2,
    //     title: 'Generazione 2',
    //     content: 'Contenuto della generazione 2',
    //     imagePath: null,
    //     tone: { id: 2, name: 'Formale' },
    //     style: { id: 2, name: 'Essenziale' },
    //     company: { id: 3, name: 'PiruzSrl' },
    //     data: new Date('2024-09-12'),
    //     prompt: 'Prompt della generazione 2',
    //     evaluation: 5,
    //     isPost: true
    //   }
    // ];
      //mockdata vuoto
    this.ResultsHistorySubject.next(mockData);
  }


}
