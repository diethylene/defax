import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiStatusComponent } from '@web/core/components/api-status/api-status.component';

/** Application shell. */
@Component({
  selector: 'app-root',
  imports: [ApiStatusComponent, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {}
