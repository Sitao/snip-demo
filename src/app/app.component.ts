import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SnipApiService, type SnipLink } from './snip-api.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private readonly api = inject(SnipApiService);

  readonly urlInput = signal('');
  readonly createdLink = signal<SnipLink | null>(null);
  readonly links = signal<SnipLink[]>([]);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly submitting = signal(false);

  constructor() {
    void this.loadLinks();
  }

  async submit(): Promise<void> {
    const url = this.urlInput().trim();
    this.error.set('');
    this.createdLink.set(null);

    if (!this.isHttpUrl(url)) {
      this.error.set('Enter a valid http(s) URL.');
      return;
    }

    this.submitting.set(true);
    try {
      const created = await this.api.createLink(url);
      this.createdLink.set(created);
      this.urlInput.set('');
      await this.loadLinks();
    } catch (err: unknown) {
      this.error.set(this.errorMessage(err));
    } finally {
      this.submitting.set(false);
    }
  }

  async loadLinks(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const items = await this.api.listLinks();
      this.links.set(items);
    } catch (err: unknown) {
      this.error.set(this.errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  trackByCode(_: number, link: SnipLink): string {
    return link.code;
  }

  private isHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiError = error.error?.error;
      if (typeof apiError === 'string' && apiError.length > 0) {
        return apiError;
      }
      if (error.status === 0) {
        return `Cannot reach backend at ${this.api.baseUrl}.`;
      }
      return `Request failed (${error.status}).`;
    }
    return 'Unexpected error. Please try again.';
  }
}
