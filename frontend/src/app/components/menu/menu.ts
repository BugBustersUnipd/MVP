import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { MenuItem, MessageService } from 'primeng/api';

@Component({
  selector: 'bb-menu',
  imports: [MenuModule],
  providers: [MessageService],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  private messageService = inject(MessageService);
  private router = inject(Router);
  items: MenuItem[] | undefined;
  ngOnInit() {
    this.items = [
      {
        label: 'AI ASSISTANT GENERATIVO',
        items: [
          {
            label: 'Generatore',
            icon: 'bb-custom-icon bb-icon-generatore',
            routerLink: '/generatore'
          },
          {
             label: 'Storico',
            icon: 'bb-custom-icon bb-icon-storico',
            routerLink: '/storico-ai-assistant'
          }
        ]
      },
      {
        label: 'AI CO-PILOT PER CDL',
        items: [
          {
            label: 'Estrattore',
            icon: 'bb-custom-icon bb-icon-ai-copilot',
            routerLink: '/estrattore'
          },
          {
             label: 'Storico',
            icon: 'bb-custom-icon bb-icon-storico',
            command: () => {
              const fromRiconoscimento = this.router.url === '/riconoscimento-documenti';
              this.router.navigate(['/storico-ai-copilot'], { replaceUrl: fromRiconoscimento });
            }
          }
        ]
      },
      {
        label: 'ANALYTICS',
        items: [
          {
            label: 'Dashboard',
            icon: 'bb-custom-icon bb-icon-analytics',
            routerLink: '/analytics-dashboard'
          }
        ]
      }
    ];
  }
}
