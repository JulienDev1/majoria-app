import React from 'react';

interface FormattedMarkdownProps {
  content: string;
  className?: string;
}

export const FormattedMarkdown: React.FC<FormattedMarkdownProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split lines to handle blocks (headings, lists, code blocks, paragraphs)
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';

  const parseInlineFormatting = (text: string): React.ReactNode => {
    if (!text) return null;

    // Pattern to match bold (**text** or __text__), italic (*text* or _text_), inline code (`code`), links ([text](url))
    const tokens: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // 1. Code inline: `code`
      const codeMatch = remaining.match(/`([^`]+)`/);
      // 2. Bold: **text** or __text__
      const boldMatch = remaining.match(/(\*\*|__)(.*?)\1/);
      // 3. Italic: *text* or _text_
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.*?)(?<!_)_(?!_)/);
      // 4. Link: [label](url)
      const linkMatch = remaining.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);

      // Find first occurrence
      let firstIndex = remaining.length;
      let matchType: 'code' | 'bold' | 'italic' | 'link' | null = null;
      let matchedString = '';
      let extracted1 = '';
      let extracted2 = '';

      if (codeMatch && codeMatch.index !== undefined && codeMatch.index < firstIndex) {
        firstIndex = codeMatch.index;
        matchType = 'code';
        matchedString = codeMatch[0];
        extracted1 = codeMatch[1];
      }
      if (boldMatch && boldMatch.index !== undefined && boldMatch.index < firstIndex) {
        firstIndex = boldMatch.index;
        matchType = 'bold';
        matchedString = boldMatch[0];
        extracted1 = boldMatch[2];
      }
      if (linkMatch && linkMatch.index !== undefined && linkMatch.index < firstIndex) {
        firstIndex = linkMatch.index;
        matchType = 'link';
        matchedString = linkMatch[0];
        extracted1 = linkMatch[1];
        extracted2 = linkMatch[2];
      }
      if (italicMatch && italicMatch.index !== undefined && italicMatch.index < firstIndex) {
        firstIndex = italicMatch.index;
        matchType = 'italic';
        matchedString = italicMatch[0];
        extracted1 = italicMatch[1] || italicMatch[2];
      }

      if (matchType === null || firstIndex >= remaining.length) {
        tokens.push(remaining);
        break;
      }

      // Push text before match
      if (firstIndex > 0) {
        tokens.push(remaining.substring(0, firstIndex));
      }

      // Render matched element
      if (matchType === 'code') {
        tokens.push(
          <code
            key={`code-${keyIdx++}`}
            className="px-1.5 py-0.5 rounded bg-[var(--fb-surface-secondary)] text-[var(--fb-blue)] border border-[var(--fb-border)] font-mono text-[0.9em]"
          >
            {extracted1}
          </code>
        );
      } else if (matchType === 'bold') {
        tokens.push(
          <strong key={`bold-${keyIdx++}`} className="font-bold text-[var(--text-color)]">
            {parseInlineFormatting(extracted1)}
          </strong>
        );
      } else if (matchType === 'italic') {
        tokens.push(
          <em key={`italic-${keyIdx++}`} className="italic text-[var(--text-muted)]">
            {parseInlineFormatting(extracted1)}
          </em>
        );
      } else if (matchType === 'link') {
        tokens.push(
          <a
            key={`link-${keyIdx++}`}
            href={extracted2}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--fb-blue)] hover:underline underline-offset-2 transition-colors break-all"
          >
            {extracted1}
          </a>
        );
      }

      remaining = remaining.substring(firstIndex + matchedString.length);
    }

    return tokens;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        elements.push(
          <div key={`code-block-${i}`} className="my-2.5 rounded-xl overflow-hidden bg-[var(--fb-surface-secondary)] border border-[var(--fb-border)] shadow-xs">
            {codeBlockLang && (
              <div className="px-3 py-1 bg-[var(--fb-surface-tertiary)] text-[10px] uppercase font-mono text-[var(--text-muted)] border-b border-[var(--fb-border-light)]">
                {codeBlockLang}
              </div>
            )}
            <pre className="p-3 text-xs font-mono text-[var(--text-color)] overflow-x-auto whitespace-pre">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockContent = [];
        codeBlockLang = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().replace(/^```/, '').trim();
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-sm font-bold text-[var(--text-color)] mt-3 mb-1">
          {parseInlineFormatting(line.substring(4))}
        </h4>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-[var(--text-color)] mt-3.5 mb-1.5">
          {parseInlineFormatting(line.substring(3))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg font-extrabold text-[var(--text-color)] mt-4 mb-2">
          {parseInlineFormatting(line.substring(2))}
        </h2>
      );
      continue;
    }

    // Bullet list (- or * )
    if (/^(\s*)[-*•]\s+(.*)$/.test(line)) {
      const match = line.match(/^(\s*)[-*•]\s+(.*)$/);
      if (match) {
        const indent = match[1].length > 0 ? 'ml-4' : 'ml-1';
        elements.push(
          <div key={`bullet-${i}`} className={`flex items-start gap-2 ${indent} my-0.5`}>
            <span className="text-[var(--fb-blue)] mt-1 shrink-0 text-xs">•</span>
            <span className="flex-1 leading-relaxed text-[var(--text-color)]">{parseInlineFormatting(match[2])}</span>
          </div>
        );
        continue;
      }
    }

    // Numbered list
    if (/^\s*\d+\.\s+(.*)$/.test(line)) {
      const match = line.match(/^\s*(\d+)\.\s+(.*)$/);
      if (match) {
        elements.push(
          <div key={`numbered-${i}`} className="flex items-start gap-2 ml-1 my-0.5">
            <span className="text-[var(--fb-blue)] font-mono text-xs mt-0.5 shrink-0">{match[1]}.</span>
            <span className="flex-1 leading-relaxed text-[var(--text-color)]">{parseInlineFormatting(match[2])}</span>
          </div>
        );
        continue;
      }
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={`quote-${i}`} className="border-l-2 border-[var(--fb-blue)] pl-3 my-1.5 italic text-[var(--text-muted)]">
          {parseInlineFormatting(line.substring(2))}
        </blockquote>
      );
      continue;
    }

    // Standard paragraph line
    elements.push(
      <p key={`p-${i}`} className="leading-relaxed my-0.5 text-[var(--text-color)]">
        {parseInlineFormatting(line)}
      </p>
    );
  }

  return <div className={`space-y-0.5 text-xs sm:text-sm text-[var(--text-color)] ${className}`}>{elements}</div>;
};
