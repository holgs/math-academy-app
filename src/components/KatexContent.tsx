'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    renderMathInElement?: (element: HTMLElement, options?: any) => void;
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

interface KatexContentProps {
  content: string;
  className?: string;
  isHtml?: boolean;
  inline?: boolean;
}

export default function KatexContent({ content, className = '', isHtml = false, inline = false }: KatexContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof window === 'undefined') return;

    if (!window.renderMathInElement) return;

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
  }, [content]);

  const html = isHtml
    ? content
    : inline
      ? `${escapeHtml(content)}`
      : `<p>${escapeHtml(content).replace(/\n/g, '<br />')}</p>`;

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
