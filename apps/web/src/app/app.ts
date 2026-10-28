import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HashToasterComponent } from './core/components/hash-toaster/hash-toaster.component';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { StatusBarComponent } from './core/components/status-bar/status-bar.component';

/** Root component hosting the router, navbar, status bar and hash toaster. */
@Component({
  imports: [RouterOutlet, NavbarComponent, StatusBarComponent, HashToasterComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html'
})
export class App {}
