import { Injectable } from '@angular/core';
import { ResultAiCopilot } from '../models/result-ai-copilot.model';
import { ResultSerializer } from './result.serializer';
@Injectable({
  providedIn: 'root'
})
export class ResultAiCopilotSerializer extends ResultSerializer<ResultAiCopilot> {
  serialize(payload: unknown[]): ResultAiCopilot {
    throw new Error('ResultAiCopilotSerializer.serialize not implemented yet');
  }

  deserialize(result: ResultAiCopilot): unknown[] {
    throw new Error('ResultAiCopilotSerializer.deserialize not implemented yet');
  }
}
