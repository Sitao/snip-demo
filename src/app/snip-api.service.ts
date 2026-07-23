import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

function resolveBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000';
  }

  const { hostname, origin } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }

  return origin;
}

export type SnipLink = {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
};

@Injectable({ providedIn: 'root' })
export class SnipApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = resolveBaseUrl();

  createLink(url: string): Promise<SnipLink> {
    return firstValueFrom(
      this.http.post<SnipLink>(`${this.baseUrl}/api/links`, { url }),
    );
  }

  listLinks(): Promise<SnipLink[]> {
    return firstValueFrom(this.http.get<SnipLink[]>(`${this.baseUrl}/api/links`));
  }
}
