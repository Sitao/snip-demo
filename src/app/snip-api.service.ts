import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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
  private readonly baseUrl = 'http://localhost:3000';

  createLink(url: string): Promise<SnipLink> {
    return firstValueFrom(
      this.http.post<SnipLink>(`${this.baseUrl}/api/links`, { url }),
    );
  }

  listLinks(): Promise<SnipLink[]> {
    return firstValueFrom(this.http.get<SnipLink[]>(`${this.baseUrl}/api/links`));
  }
}
