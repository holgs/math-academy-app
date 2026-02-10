'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    renderMathInElement?: (element: HTMLElement, options?: any) => void;
    katex?: unknown;
    __katexAutoRenderLoading?: Promise<void>;
  }
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeEscapedLineBreaks(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n\\n/g, '\n\n')
    .replace(/\\n(?=[A-Z0-9\-*•\s])/g, '\n');
}

function normalizeMathDelimiters(text: string) {
  return text
    // HTML entities that may appear after sanitization/import
    .replace(/&#36;/g, '$')
    .replace(/&dollar;/g, '$')
    .replace(/\\\$/g, '$')
    .replace(/\\\[/g, '\\[')
    .replace(/\\\]/g, '\\]')
    .replace(/\\\(/g, '\\(')
    .replace(/\\\)/g, '\\)')
    // Escaped KaTeX delimiters -> real delimiters
    .replace(/\\\$\$([\s\S]*?)\\\$\$/g, (_, inner: string) => `$$${inner}$$`)
    .replace(/\\\$([\s\S]*?)\\\$/g, (_, inner: string) => `$${inner}$`);
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed loading ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed loading ${src}`));
    document.head.appendChild(script);
  });
}

function ensureKatexAssets() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.renderMathInElement) return Promise.resolve();
  if (window.__katexAutoRenderLoading) return window.__katexAutoRenderLoading;

  const cssHref = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
  if (!document.querySelector(`link[href="${cssHref}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    document.head.appendChild(link);
  }

  window.__katexAutoRenderLoading = (async () => {
    await loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js');
  })()
    .finally(() => {
      window.__katexAutoRenderLoading = undefined;
    });

  return window.__katexAutoRenderLoading;
}

interface KatexContentProps {
  content: string;
  className?: string;
  isHtml?: boolean;
  inline?: boolean;
}

export default function KatexContent({ content, className = '', isHtml = false, inline = false }: KatexContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const normalizedContent = normalizeMathDelimiters(normalizeEscapedLineBreaks(content || ''));

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof window === 'undefined') return;

    let canceled = false;
    let attempts = 0;
    const maxAttempts = 120;
    const delayMs = 250;
    let timer: number | undefined;

    const tryRender = () => {
      if (canceled || !node.isConnected) return;
      if (!window.renderMathInElement) {
        attempts += 1;
        if (attempts < maxAttempts) {
          timer = window.setTimeout(tryRender, delayMs);
        }
        return;
      }

      window.renderMathInElement(node, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
        strict: 'ignore',
      });
    };

    const onWindowLoad = () => tryRender();
    window.addEventListener('load', onWindowLoad);
    window.addEventListener('pageshow', onWindowLoad);
    ensureKatexAssets().finally(() => {
      tryRender();
    });

    return () => {
      canceled = true;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('load', onWindowLoad);
      window.removeEventListener('pageshow', onWindowLoad);
    };
  }, [normalizedContent]);

  const html = isHtml
    ? normalizedContent.replace(/\n/g, '<br />')
    : inline
      ? `${escapeHtml(normalizedContent)}`
      : `<p>${escapeHtml(normalizedContent).replace(/\n/g, '<br />')}</p>`;

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
