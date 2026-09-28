const DECKS_KEY = 'kelime_detoks_decks';
const ACTIVE_DECK_KEY = 'kelime_detoks_active_deck';
const LEGACY_WORDS_KEY = 'kelime_detoks_words';
const MAX_DECKS = 30;

export function loadDecks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DECKS_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((deck) => deck && Array.isArray(deck.words) && deck.words.length);
  } catch {
    return [];
  }
}

export function getActiveDeckId() {
  return localStorage.getItem(ACTIVE_DECK_KEY) || '';
}

export function migrateLegacyWords() {
  const decks = loadDecks();
  if (decks.length) return decks;

  try {
    const saved = JSON.parse(localStorage.getItem(LEGACY_WORDS_KEY) || '[]');
    if (!Array.isArray(saved) || !saved.length) return [];
    const deck = createDeck(saved);
    saveDecks([deck]);
    localStorage.setItem(ACTIVE_DECK_KEY, deck.id);
    return [deck];
  } catch {
    return [];
  }
}

export function addDeck(words) {
  const deck = createDeck(words);
  const decks = [deck, ...loadDecks()].slice(0, MAX_DECKS);
  saveDecks(decks);
  localStorage.setItem(ACTIVE_DECK_KEY, deck.id);
  localStorage.setItem(LEGACY_WORDS_KEY, JSON.stringify(words));
  return deck;
}

export function openDeck(id) {
  const deck = loadDecks().find((item) => item.id === id);
  if (!deck) return null;
  localStorage.setItem(ACTIVE_DECK_KEY, deck.id);
  localStorage.setItem(LEGACY_WORDS_KEY, JSON.stringify(deck.words));
  return deck;
}

export function deleteDeck(id) {
  const remaining = loadDecks().filter((deck) => deck.id !== id);
  saveDecks(remaining);

  if (getActiveDeckId() === id) {
    if (remaining[0]) {
      localStorage.setItem(ACTIVE_DECK_KEY, remaining[0].id);
      localStorage.setItem(LEGACY_WORDS_KEY, JSON.stringify(remaining[0].words));
      return remaining[0];
    }
    localStorage.removeItem(ACTIVE_DECK_KEY);
    localStorage.removeItem(LEGACY_WORDS_KEY);
    return null;
  }

  return remaining.find((deck) => deck.id === getActiveDeckId()) || remaining[0] || null;
}

export function formatDeckDate(iso) {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function createDeck(words) {
  const preview = words
    .slice(0, 3)
    .map((word) => word.word)
    .filter(Boolean)
    .join(', ');

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    title: preview || `${words.length} kelime`,
    words,
  };
}

function saveDecks(decks) {
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
}
