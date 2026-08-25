/**
 * Speech Recognition and Transcription Cleaner
 * Fixes stuttering, duplicated words, overlapping speech segments, and formatting issues.
 */

/**
 * Removes consecutive duplicate words and n-grams (1 to 4 words repetition)
 * e.g. "Bonjour bonjour" -> "Bonjour"
 * e.g. "est-ce que est-ce que" -> "est-ce que"
 * e.g. "peux tu peux tu me dire" -> "peux tu me dire"
 */
export function removeRepeatedWordsAndPhrases(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.trim();

  // 1. Remove immediate consecutive identical words (case-insensitive)
  // e.g. "je je", "peux peux", "note note"
  cleaned = cleaned.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');

  // 2. Remove 2-word repeated phrases
  // e.g. "est ce est ce", "peux tu peux tu", "dans le dans le"
  cleaned = cleaned.replace(/\b(\w+\s+\w+)(?:\s+\1\b)+/gi, '$1');

  // 3. Remove 3-word repeated phrases
  // e.g. "est-ce que est-ce que", "dans le menu dans le menu"
  cleaned = cleaned.replace(/\b(\w+\s+\w+\s+\w+)(?:\s+\1\b)+/gi, '$1');

  // 4. Remove 4-word repeated phrases
  cleaned = cleaned.replace(/\b(\w+\s+\w+\s+\w+\s+\w+)(?:\s+\1\b)+/gi, '$1');

  return cleaned;
}

/**
 * Merges two speech transcript segments by finding and eliminating overlapping boundary words
 * e.g. "je veux aller" + "veux aller à Paris" -> "je veux aller à Paris"
 */
export function mergeSpeechSegments(prevText: string, newText: string): string {
  const p = (prevText || '').trim();
  const n = (newText || '').trim();

  if (!p) return n;
  if (!n) return p;
  if (p === n) return p;

  const pWords = p.split(/\s+/);
  const nWords = n.split(/\s+/);

  // Check overlap from largest possible match down to 1 word
  const maxOverlap = Math.min(pWords.length, nWords.length, 6);
  let overlapLen = 0;

  for (let len = maxOverlap; len >= 1; len--) {
    const pSlice = pWords.slice(pWords.length - len).map(w => w.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '')).join(' ');
    const nSlice = nWords.slice(0, len).map(w => w.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '')).join(' ');

    if (pSlice && nSlice && pSlice === nSlice) {
      overlapLen = len;
      break;
    }
  }

  let merged = '';
  if (overlapLen > 0) {
    const remainingNew = nWords.slice(overlapLen).join(' ');
    merged = remainingNew ? `${p} ${remainingNew}` : p;
  } else {
    // If no direct overlap, check if newText is already a substring of prevText or vice-versa
    if (p.toLowerCase().endsWith(n.toLowerCase())) {
      merged = p;
    } else if (n.toLowerCase().startsWith(p.toLowerCase())) {
      merged = n;
    } else {
      merged = `${p} ${n}`;
    }
  }

  return removeRepeatedWordsAndPhrases(merged);
}

/**
 * Full cleanup of transcribed user speech into coherent, beautifully formatted sentences
 */
export function cleanSpokenTranscript(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let cleaned = rawText.trim();

  // Normalize multiple spaces and line breaks
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // Remove repeated words and n-grams
  cleaned = removeRepeatedWordsAndPhrases(cleaned);

  // Fix French punctuation spacing
  cleaned = cleaned
    .replace(/\s+([,.:;?!])/g, '$1') // remove space before comma/dot/colon
    .replace(/([,.:;?!])(?=[^\s\d])/g, '$1 ') // ensure space after punctuation
    .replace(/\s+/g, ' ')
    .trim();

  // Fix common French speech recognition artifacts
  cleaned = cleaned
    .replace(/\b(euh|euh\.\.\.|hum|ben)\b/gi, '') // remove filler sounds
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Capitalize the first letter of sentences
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}
