import { Component, EventEmitter, input, Input, Output } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { Tables } from '../tables/tables';
import { MenuItem } from 'primeng/api';
import { DocumentState, ResultAiCopilot } from '../../shared/models/result-ai-copilot.model';
import { TagModule } from 'primeng/tag';
import { ResultSplit } from '../../shared/models/result-split.model';
import { Button } from '../button/button';


@Component({
  selector: 'bb-nested-tables',
  imports: [AccordionModule, Tables, TagModule, Button],
  templateUrl: './nested-tables.html',
  styleUrl: './nested-tables.css',
})
export class NestedTables {
@Input() columns: any[] = [];
@Input() items: MenuItem[] = [];
@Input() ButtonLabel: string = '';
@Input() class: string = '';
@Input() documents: ResultAiCopilot[] = [];
@Output() menuAction = new EventEmitter<{ row: ResultSplit; item: MenuItem }>();
@Output() retryAction = new EventEmitter<number>();
@Output() rowRemoved = new EventEmitter<ResultSplit>();

onTableMenuAction(event: { row: ResultSplit; item: MenuItem }): void {
  this.menuAction.emit(event);
}

onRetryButtonClick(parentId: number): void {
  this.retryAction.emit(parentId);
}

onRowRemoved(row: ResultSplit): void {
  this.rowRemoved.emit(row);
}

getSeverity(state: DocumentState): string {
  switch (state) {
    case DocumentState.Completato:
      return 'class-success';
    case DocumentState.InElaborazione:
      return 'class-elaboration';
    case DocumentState.InCoda:
      return 'class-pending';
    case DocumentState.Failed:
      return 'class-failed';
    default:
      return 'class-default';
  }
}
}
