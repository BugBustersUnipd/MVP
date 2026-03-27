import { Result } from '../models/result.model';
export abstract class ResultSerializer<T extends Result> { // c'è T extends Result perché voglio che tutte le classi che estendono ResultSerializer abbiano un tipo che estende Result (così c'è almeno Result di base con id)
  abstract serialize(payload: unknown[]): T;
  abstract deserialize(result: T): unknown[];
}
