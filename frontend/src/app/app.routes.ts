import { Routes } from '@angular/router';
import { Generatore } from './generatore/generatore';
import { RisultatoGenerazione } from './risultato-generazione/risultato-generazione';
import { StoricoAiAssistant } from './storico-ai-assistant/storico-ai-assistant';
import { StoricoAiCopilot } from './storico-ai-copilot/storico-ai-copilot';
import { AnalyticsDashboard } from './analytics-dashboard/analytics-dashboard';
import { Estrattore } from './estrattore/estrattore';
import { AnteprimaDocumento } from './anteprima-documento/anteprima-documento';
import { RiconoscimentoDocumenti } from './riconoscimento-documenti/riconoscimento-documenti';
export const routes: Routes = [
  { path: 'generatore', component: Generatore },
  { path: 'estrattore', component: Estrattore },
  { path: 'risultato-generazione', component: RisultatoGenerazione },
  { path: 'storico-ai-assistant', component: StoricoAiAssistant },
  { path: 'storico-ai-copilot', component: StoricoAiCopilot},
  { path: 'analytics-dashboard', component: AnalyticsDashboard},
  { path: 'anteprima-documento', component: AnteprimaDocumento },
  { path: 'riconoscimento-documenti', component: RiconoscimentoDocumenti },
];
