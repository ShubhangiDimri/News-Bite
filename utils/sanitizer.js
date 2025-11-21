const fs = require('fs');
const path = require('path');

// Load bad words from config
const badWordsConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../services/moderation/badwords.json'), 'utf8')
);

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskWord(word) {
  if (!word) return word;
  if (word.length <= 2) return '*'.repeat(word.length);
  if (word.length === 3) return `${word[0]}*${word[2]}`;
  // For longer words, keep first and last chars
  return `${word[0]}${('*').repeat(word.length - 2)}${word[word.length - 1]}`;
}

/**
 * Sanitize text by masking bad words/phrases
 * @param {string} text Input text
 * @returns {Object} Result containing sanitized text and metadata
 */
function sanitizeText(text) {
  if (typeof text !== 'string') {
    return {
      text: '',
      originalText: text,
      wasCensored: false,
      censoredTerms: [],
      status: 'visible'
    };
  }

  let sanitized = text;
  const censoredTerms = new Set();
  
  // First check phrases (to avoid partial word matches)
  for (const phrase of badWordsConfig.phrases) {
    const phraseRegex = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi');
    if (phraseRegex.test(text)) {
      censoredTerms.add(phrase);
      sanitized = sanitized.replace(phraseRegex, (match) => 
        match.split(' ').map(word => maskWord(word)).join(' ')
      );
    }
  }

  // Then check individual words
  for (const word of badWordsConfig.words) {
    const wordRegex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
    if (wordRegex.test(sanitized)) {  // Use sanitized to avoid double-masking
      censoredTerms.add(word);
      sanitized = sanitized.replace(wordRegex, (match) => maskWord(match));
    }
  }

  const uniqueCensoredTerms = Array.from(censoredTerms);
  
  return {
    text: sanitized,
    originalText: text,
    wasCensored: uniqueCensoredTerms.length > 0,
    censoredTerms: uniqueCensoredTerms,
    status: uniqueCensoredTerms.length >= 3 ? 'review' : 'visible'
  };
}

module.exports = {
  sanitizeText
};