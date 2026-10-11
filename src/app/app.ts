import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './core/components/navbar/navbar';
import { StatusBar } from './core/components/status-bar/status-bar';

@Component({
  imports: [RouterOutlet, Navbar, StatusBar],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html'
})
export class App {}
