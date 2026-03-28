import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import {Menu} from './components/menu/menu';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, Menu],
  providers: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App{
  protected readonly title = signal('ProvaPrimeNg');
  
  
  
}
