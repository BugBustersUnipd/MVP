import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { Tables } from '../tables/tables';
import { MenuItem } from 'primeng/api';
import { DocumentState, ResultAiCopilot } from '../../shared/models/result-ai-copilot.model';
import { TagModule } from 'primeng/tag';
import { ResultSplit } from '../../shared/models/result-split.model';


@Component({
  selector: 'bb-nested-tables',
  imports: [AccordionModule, Tables, TagModule],
  templateUrl: './nested-tables.html',
  styleUrl: './nested-tables.css',
})
export class NestedTables {
@Input() columns: any[] = [];
@Input() items: MenuItem[] = [];
@Input() class: string = '';
@Input() documents: ResultAiCopilot[] = [];
@Output() menuAction = new EventEmitter<{ row: ResultSplit; item: MenuItem }>();

onTableMenuAction(event: { row: ResultSplit; item: MenuItem }): void {
  this.menuAction.emit(event);
}

getSeverity(state: DocumentState): string {
  switch (state) {
    case DocumentState.Completato:
      return 'class-success';
    case DocumentState.InElaborazione:
      return 'class-elaboration';
    case DocumentState.InCoda:
      return 'class-pending';
    default:
      return 'class-default';
  }
}
}
