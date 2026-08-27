/**
 * Speech Recognition and Transcription Cleaner
 * Cleans formatting, spacing, and punctuation while strictly preserving all user words.
 */

/**
 * Removes immediate consecutive duplicate words caused by audio stuttering
 * only when identical and adjacent (e.g. "je je" -> "je"), but preserves natural phrases.
 */
export function removeRepeatedWordsAndPhrases(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.trim();

  // Remove immediate single-word duplicates (case-insensitive) like "le le" -> "le"
  // But leave multi-word repeated expressions intact (e.g. "très très bien", "non non")
  cleaned = cleaned.replace(/\b([a-zA-ZÀ-ÿ]{3,})\s+\1\b/gi, '$1');

  return cleaned;
}

/**
 * Merges two speech transcript segments smoothly without dropping words
 */
export function mergeSpeechSegments(prevText: string, newText: string): string {
  const p = (prevText || '').trim();
  const n = (newText || '').trim();

  if (!p) return n;
  if (!n) return p;
  if (p === n) return p;

  // If newText already includes prevText, use newText
  if (n.toLowerCase().startsWith(p.toLowerCase())) {
    return n;
  }

  // If prevText already contains newText, return prevText
  if (p.toLowerCase().includes(n.toLowerCase())) {
    return p;
  }

  const pWords = p.split(/\s+/);
  const nWords = n.split(/\s+/);

  // Check overlap from largest possible match down to 1 word
  const maxOverlap = Math.min(pWords.length, nWords.length, 5);
  let overlapLen = 0;

  for (let len = maxOverlap; len >= 1; len--) {
    const pSlice = pWords.slice(pWords.length - len).map(w => w.toLowerCase().replace(/[^\wÀ-ÿ]/g, '')).join(' ');
    const nSlice = nWords.slice(0, len).map(w => w.toLowerCase().replace(/[^\wÀ-ÿ]/g, '')).join(' ');

    if (pSlice && nSlice && pSlice === nSlice) {
      overlapLen = len;
      break;
    }
  }

  if (overlapLen > 0) {
    const remainingNew = nWords.slice(overlapLen).join(' ');
    return remainingNew ? `${p} ${remainingNew}` : p;
  }

  return `${p} ${n}`.trim();
}

/**
 * Full cleanup of transcribed user speech: fixes spacing and capitalization
 * while ensuring ZERO words are lost or truncated.
 */
export function cleanSpokenTranscript(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let cleaned = rawText.trim();

  // Normalize multiple whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Fix punctuation spacing: remove space before punctuation, ensure space after
  cleaned = cleaned
    .replace(/\s+([,.:;?!])/g, '$1')
    .replace(/([,.:;?!])(?=[^\s\d])/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

