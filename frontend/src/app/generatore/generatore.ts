import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Menutendina } from '../components/menutendina/menutendina';
import { Button } from '../components/button/button';
import { Prompt } from '../components/prompt/prompt';
import { AddDialog, AddDialogSaveData, AddDialogType } from '../components/add-dialog/add-dialog';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { filter, take } from 'rxjs';

//servizi
import { AiAssistantService } from '../../services/ai-assistant-service/ai-assistant-service';



@Component({
  selector: 'app-generatore',
  imports: [FormsModule, Prompt, Menutendina, ButtonModule, Button, AsyncPipe, AddDialog],
  templateUrl: './generatore.html',
  styleUrl: './generatore.css',
})
export class Generatore {
  private router = inject(Router);
  private aiService = inject(AiAssistantService);
  prompt: string = history.state?.prompt ?? '';
  
  // in questo modo sono sempre aggiornati, anche quando vengono aggiunti nuovi toni o stili da frontend -> la vista si aggiorna automaticamente grazie a Angular
  tones$ = this.aiService.tones$;
  styles$ = this.aiService.styles$;
  companies$ = this.aiService.companies$;

  selectedTone: any = history.state?.tone ?? null;
  selectedStyle: any = history.state?.style ?? null;
  selectedCompany: any = history.state?.company ?? null;
  addDialogVisible: boolean = false;
  addDialogType: AddDialogType = 'tone';

  get canGenerate(): boolean {
    return !!this.selectedTone && !!this.selectedStyle && this.prompt.trim().length >= 50;
  }

 
  generate() {
    if (!this.canGenerate) {
      return;
    }

    this.aiService.requireGeneration(this.prompt, this.selectedTone, this.selectedStyle, this.selectedCompany); // Invia la richiesta di generazione al servizio
    this.aiService.currentResult$
      .pipe(
        filter((result): result is NonNullable<typeof result> => !!result),
        take(1)
      )
      .subscribe(result => {
      this.router.navigate(['/risultato-generazione'], {
        state: {
          result: result
        }
      });
    });
  }
  ngOnInit() {
    this.aiService.fetchCompanies(); //todo
  }

  openAddDialog(type: AddDialogType): void {
    this.addDialogType = type;
    this.addDialogVisible = true;
  }

  handleAddDialogSave(data: AddDialogSaveData): void {

    if (data.type === 'tone') {
      this.aiService.newTone(data.name, data.description, this.selectedCompany?.id);
      return;
    }

    if (data.type === 'style') {
      this.aiService.newStyle(data.name, data.description, this.selectedCompany?.id);
    }

   
  }

  removeOption(id: number, type: AddDialogType): void {
    if (type === 'tone') {
      this.aiService.removeTone(id);
      return;
    }else if (type === 'style') {
      this.aiService.removeStyle(id);
    }else{
      //todo remove company
    }
  }

  onCompanyChange($event: { id: number; name: string } | null): void {
    this.selectedCompany = $event;
    this.aiService.fetchTonesByCompany(this.selectedCompany?.id);
    this.aiService.fetchStylesByCompany(this.selectedCompany?.id);

    this.selectedTone = null;
    this.selectedStyle = null;
  }
}
