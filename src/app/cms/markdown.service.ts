import { Injectable } from '@angular/core';
import { marked } from 'marked';

@Injectable({ providedIn: 'root' })
export class MarkdownService {
  render(source: string): string {
    return marked.parse(source, { async: false, gfm: true }) as string;
  }
}
