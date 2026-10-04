import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { marked } from 'marked';

interface FormattedOutputProps {
  content?: string | null;
  className?: string;
}

export default function FormattedOutput({ content, className = '' }: FormattedOutputProps) {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    let text = String(content);

    // Normalize Windows line endings
    text = text.replace(/\r\n/g, '\n');

    const mathPlaceholders: { id: string; displayMode: boolean; html: string }[] = [];

    const stashMath = (math: string, displayMode: boolean) => {
      const id = `KATEX_${displayMode ? 'BLOCK' : 'INLINE'}_${mathPlaceholders.length}_TOKEN`;
      try {
        const mathHtml = katex.renderToString(math.trim(), {
          displayMode,
          throwOnError: false,
        });
        mathPlaceholders.push({ id, displayMode, html: mathHtml });
      } catch {
        mathPlaceholders.push({
          id,
          displayMode,
          html: `<span class="text-rose-400 font-mono text-xs">${math}</span>`,
        });
      }
      return id;
    };

    // 1. Stash Block Math: $$ ... $$ or \[ ... \]
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => stashMath(math, true));
    text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, math) => stashMath(math, true));

    // 2. Stash Inline Math: \( ... \) or $ ... $
    text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, math) => stashMath(math, false));
    text = text.replace(/\$([^\$\n]+?)\$/g, (_, math) => stashMath(math, false));

    // 3. Stash bare LaTeX math commands if not enclosed in dollars, e.g. \frac{a}{b}, \sqrt{...}
    text = text.replace(
      /(\\(?:frac|sqrt|sum|int|prod|alpha|beta|gamma|pi|theta|infty|times|cdot|pm|approx|neq|le|ge)(?:\{[^{}]*\}|\[[^\[\]]*\]|[a-zA-Z0-9])+)/g,
      (match) => stashMath(match, false)
    );

    // 4. Normalize escaped newlines in regular markdown text (outside stashed math)
    text = text.replace(/\\n/g, '\n');

    // 5. Parse Markdown with marked
    let html = marked.parse(text, { gfm: true, breaks: true }) as string;

    // 6. Restore math placeholders
    mathPlaceholders.forEach(({ id, displayMode, html: mathHtml }) => {
      if (displayMode) {
        html = html.replace(
          id,
          `<div class="math-block my-2 overflow-x-auto py-1 text-center">${mathHtml}</div>`
        );
      } else {
        html = html.replace(
          id,
          `<span class="math-inline px-0.5 inline-block align-middle">${mathHtml}</span>`
        );
      }
    });

    return html;
  }, [content]);

  if (!content) {
    return <span className="text-muted-foreground italic text-xs">No output available.</span>;
  }

  return (
    <div
      className={`formatted-output text-foreground text-xs md:text-sm leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
