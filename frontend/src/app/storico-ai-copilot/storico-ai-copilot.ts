import { Component,inject } from '@angular/core';
import { Router  } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Tables } from '../components/tables/tables';
import { Filters } from '../components/filters/filters';
import { MenuItem} from 'primeng/api';
import { Button } from '../components/button/button';
import { ResultSplit } from '../shared/models/result-split.model';
import {State} from '../shared/models/result-split.model'; 

@Component({
  selector: 'app-storico-ai-copilot',
  imports: [FormsModule, Tables, Filters, Button],
  templateUrl: './storico-ai-copilot.html',
  styleUrl: './storico-ai-copilot.css',
})
export class StoricoAiCopilot {
  pages: number = 22; //todo questa info si prende dal docuumento originale, viene restituita dal backend in quache modo
  router = inject(Router);
  Documents: any[] = [];
  FilteredDocuments: any[] = [];
  items : MenuItem[] = [];
  dates: Date[] | undefined;
  IDs: number[] = [1.1, 1.2, 1.3, 1.4];
  searchvalue = '';
  Companies: string[] = ['AlbertoSrl', 'ProvaSrl'];
  selectedCompany: number | undefined;
  DocumentType: string[] = ['Cedolino', 'TFR', 'Boh'];
  selectedDocument: number | undefined;
  columns = [
    { field: 'DocumentName', header: 'Nome Documento Originale' },
    { field: 'Id', header: 'Id' },
    { field: 'Confidence', header: 'Confidenza' },
    { field: 'Recepient', header: 'Destinatario' },
    { field: 'State', header: 'Stato' },
    { field: 'Data', header: 'Data analisi', type: 'date' },
  ];
  ngOnInit() {
        this.items = [
            {
                items: [
                    {
                        label: 'Modifica',
                        icon: 'pi pi-pencil',
                    },
                    {   
                        label: 'Elimina',
                        icon: 'pi pi-trash'
                    }
                ]
            }
        ];
    this.Documents = [
      {
        Company: 'AlbertoSrl',
        TypeofDocument: 'Cedolino',
        DocumentName: 'Lorem ipsum dolor sit amet',
        Id: this.IDs[0],
        Confidence: '15%',
        Recepient: ' Alberto Autiero',
        State: State.Pronto,
        Data: new Date('2024, 9, 11'),
      },
      {
        Company: 'ProvaSrl',
        TypeofDocument: 'TFR',
        DocumentName: 'Lorem ipsum dolor sit amet',
        Id: this.IDs[1],
        Confidence: '25%',
        Recepient: 'Alberto Pignat',
        State: State.Pronto,
        Data: new Date('2024, 8, 11'),
      },
      {
        Company: 'AlbertoSrl',
        TypeofDocument: 'Boh',
        DocumentName: 'Lorem ipsum dolor sit amet',
        Id: this.IDs[2],
        Confidence: '45%',
        Recepient: 'Leonardo Salviato',
        State: State.Pronto,
        Data: new Date('2024, 7, 11'),
      },
      {
        Company: 'ProvaSrl',
        TypeofDocument: 'TFR',
        DocumentName: 'Lorem ipsum dolor sit amet',
        Id: this.IDs[3],
        Confidence: '55%',
        Recepient: 'Marco Favero',
        State: State.Pronto,
        Data: new Date('2026, 4, 11'),
      },
      {
        Company: 'AlbertoSrl',
        TypeofDocument: 'Cedolino',
        DocumentName: 'Lorem ipsum dolor sit amet',
        Id: this.IDs[2],
        Confidence: '75%',
        Recepient: 'Luca Slongo',
        State: State.Pronto,
        Data: new Date('2023, 9, 11'),
      },
      {
        Company: 'ProvaSrl',
        TypeofDocument: 'TFR',
        DocumentName: 'Lorem ipsum dolor sit amet',
        Id: this.IDs[3],
        Confidence: '85%',
        Recepient: 'Luca Slongo',
        State: State.Pronto,
        Data: new Date('2022, 1, 11'),
      },
      {
        Company: 'AlbertoSrl',
        TypeofDocument: 'Cedolino',
        DocumentName: 'Lorem ipsum dolor sit amet',
        Id: this.IDs[1],
        Confidence: '95%',
        Recepient: 'Luca Slongo',
        State: State.Pronto,
        Data: new Date('2021, 7, 11'),
      },
      {
        Company: 'ProvaSrl',
        TypeofDocument: 'Cedolino',
        DocumentName: 'Lorem ipsum dolor sit amet',
        Id: this.IDs[0],
        Confidence: '99%',
        Recepient: 'Luca Slongo',
        State: State.Pronto,
        Data: new Date('2020, 5, 11'),
      },
    ];
    this.FilteredDocuments = this.Documents;
  }
  onSearchChange(value: string) {
    this.searchvalue = value;
    this.applyFilters();
  }
  onDateChange(dates: Date[]) {
    this.dates = dates;
    this.applyFilters();
  }
  onDocumentChange(document: number | undefined) {
    this.selectedDocument = document;
    this.applyFilters();
  }
  onCompanyChange(company: number | undefined) {
    this.selectedCompany = company;
    this.applyFilters();
  }
  applyFilters() {
    this.FilteredDocuments = this.Documents.filter((g) => {
      const matchSearch =
        !this.searchvalue ||
        g.DocumentName.toLowerCase().includes(this.searchvalue.toLowerCase()) ||
        g.Id.toString().toLowerCase().includes(this.searchvalue.toLowerCase()) ||
        g.Confidence.toLowerCase().includes(this.searchvalue.toLowerCase()) ||
        g.ListaDestinazione.toLowerCase().includes(this.searchvalue.toLowerCase()) ||
        g.State.toLowerCase().includes(this.searchvalue.toLowerCase());
      const matchDocument = !this.selectedDocument || g.TypeofDocument === this.selectedDocument;
      const matchCompany = !this.selectedCompany || g.Company === this.selectedCompany;
      const matchDate =
        !this.dates ||
        this.dates.length !== 2 ||
        (new Date(g.Data) >= this.dates[0] && new Date(g.Data) <= this.dates[1]);
      return matchCompany && matchDate && matchDocument && matchSearch;
    });
  }

  // al momento questa funzione mi serve solo per predisporre il passaggio del risultato alla pagina anteprima-documento
  navigateToResult(){
    // creo un resultAiCopilot che contiene delle info
    
    const result : ResultSplit ={
      id: 1.1,
      name: 'Nome documento splittato',
      state: State.Programmato,
      
      confidence: 95,
      recipientId: 122,
      recipientName: 'Luca Slongo',
      recipientEmail: 'luca.slongo@gmail.com',
      recipientCode: 'LS122',
      time_Analysis: 12,
      page_end: 10,
      page_start: 1,
      company: 'AlbertoSrl',
      department: 'HR',
      month_year: 'Settembre 2024',
      category: 'Cedolino',
      data: new Date('2024, 9, 11'),
      parentId: 111
    }
      if (result) {
        this.router.navigate(['/anteprima-documento'], {
          state: {
            result: result,
            pages: this.pages //todo passare le pagine del documento originale, rispetto il ResultSplit cliccato nello storico
          }
        });
      }
  }


}
