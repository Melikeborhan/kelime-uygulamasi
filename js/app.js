import { analyzeImages, fileToBase64 } from './gemini.js';
import { initFlashcards, setFlashcardWords, resetFlashcards } from './flashcards.js';
import { initQuiz, setQuizWords, resetQuiz } from './quiz.js';
import { initMatch, setMatchWords, resetMatch } from './match.js';
import { initList, setListWords, renderList } from './list.js';
import {
  addDeck,
  deleteDeck,
  formatDeckDate,
  getActiveDeckId,
  loadDecks,
  migrateLegacyWords,
  openDeck,
} from './decks.js';

const STORAGE_KEY = 'kelime_detoks_gemini_key';
const MAX_IMAGES = 5;

let currentImages = [];
let words = [];
let currentMode = 'flashcards';
let activeDeckId = '';

const $ = (id) => document.getElementById(id);

function init() {
  loadApiKey();
  loadSavedWords();
  bindUpload();
  bindApiKey();
  bindAnalyze();
  bindDecks();
  bindModeTabs();
  initFlashcards(speak);
  initQuiz();
  initMatch();
  initList(speak);
}

function loadApiKey() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) $('apiKeyInput').value = saved;
  updateAnalyzeBtn();
}

function loadSavedWords() {
  const decks = migrateLegacyWords();
  const active = decks.find((deck) => deck.id === getActiveDeckId()) || decks[0];
  renderDecks();
  if (active) {
    applyDeck(active, { persist: false });
  }
}

function bindApiKey() {
  $('saveKeyBtn').addEventListener('click', () => {
    const key = $('apiKeyInput').value.trim();
    if (!key) {
      showError('Lütfen geçerli bir API anahtarı girin.');
      return;
    }
    localStorage.setItem(STORAGE_KEY, key);
    flashMessage('API anahtarı kaydedildi.');
    updateAnalyzeBtn();
  });

  $('toggleKeyBtn').addEventListener('click', () => {
    const input = $('apiKeyInput');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  $('apiKeyInput').addEventListener('input', updateAnalyzeBtn);
}

function bindUpload() {
  const dropZone = $('dropZone');
  const fileInput = $('fileInput');

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    addImages(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', (e) => {
    addImages(e.target.files);
    fileInput.value = '';
  });

  $('removeImageBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    clearImage();
  });
}

async function addImages(fileList) {
  const imageFiles = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
  if (!imageFiles.length) return;

  const availableSlots = MAX_IMAGES - currentImages.length;
  const selectedFiles = imageFiles.slice(0, Math.max(availableSlots, 0));

  if (!selectedFiles.length) {
    showError(`En fazla ${MAX_IMAGES} görsel yükleyebilirsiniz.`);
    return;
  }

  const newImages = await Promise.all(
    selectedFiles.map(async (file) => ({
      file,
      mimeType: file.type || 'image/jpeg',
      base64Data: await fileToBase64(file),
      previewUrl: URL.createObjectURL(file),
    }))
  );

  currentImages = [...currentImages, ...newImages];
  renderImagePreview();
  hideError();

  if (imageFiles.length > selectedFiles.length) {
    showError(`En fazla ${MAX_IMAGES} görsel alınır; fazla görseller eklenmedi.`);
  }

  updateAnalyzeBtn();
}

function clearImage() {
  currentImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  currentImages = [];
  $('fileInput').value = '';
  $('previewGrid').innerHTML = '';
  $('dropPlaceholder').classList.remove('hidden');
  $('imagePreview').classList.add('hidden');
  updateAnalyzeBtn();
}

function renderImagePreview() {
  const grid = $('previewGrid');
  grid.innerHTML = '';

  currentImages.forEach((image, index) => {
    const img = document.createElement('img');
    img.src = image.previewUrl;
    img.alt = `Önizleme ${index + 1}`;
    grid.appendChild(img);
  });

  $('dropPlaceholder').classList.toggle('hidden', currentImages.length > 0);
  $('imagePreview').classList.toggle('hidden', currentImages.length === 0);
}

function updateAnalyzeBtn() {
  const hasKey = $('apiKeyInput').value.trim().length > 0;
  const hasImage = currentImages.length > 0;
  $('analyzeBtn').disabled = !(hasKey && hasImage);
}

function bindAnalyze() {
  $('analyzeBtn').addEventListener('click', async () => {
    const apiKey = $('apiKeyInput').value.trim();
    if (!apiKey || !currentImages.length) return;

    hideError();
    setLoading(true);

    try {
      const result = await analyzeImages(apiKey, currentImages);
      if (!result.length) {
        throw new Error('Görsellerde İngilizce kelime bulunamadı. Farklı görseller deneyin.');
      }
      applyDeck(addDeck(result));
      localStorage.setItem(STORAGE_KEY, apiKey);
      flashMessage(`${result.length} kelime kaydedildi. Önceki setleriniz listede duruyor.`);
    } catch (err) {
      showError(err.message || 'Analiz sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  });
}

function applyDeck(deck, { persist = true } = {}) {
  if (!deck?.words?.length) return;
  words = deck.words;
  activeDeckId = deck.id;
  if (persist) {
    openDeck(deck.id);
  }
  showLearningPlatform(deck);
  renderDecks();
}

function showLearningPlatform(deck) {
  $('learningSection').classList.remove('hidden');
  $('wordCountBadge').classList.remove('hidden');
  $('wordCountBadge').textContent = `${words.length} kelime`;
  $('activeDeckTitle').textContent = deck
    ? `${deck.title} · ${formatDeckDate(deck.createdAt)}`
    : '';

  setFlashcardWords(words);
  setQuizWords(words);
  setMatchWords(words);
  setListWords(words);
  switchMode(currentMode);
}

function hideLearningPlatform() {
  words = [];
  activeDeckId = '';
  $('learningSection').classList.add('hidden');
  $('wordCountBadge').classList.add('hidden');
  $('activeDeckTitle').textContent = '';
}

function bindDecks() {
  $('decksList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-deck-action]');
    if (!button) return;

    const { deckAction, deckId } = button.dataset;
    if (deckAction === 'open') {
      const deck = openDeck(deckId);
      if (deck) {
        applyDeck(deck, { persist: false });
        $('learningSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    if (deckAction === 'delete') {
      if (!window.confirm('Bu kelime setini silmek istiyor musunuz?')) return;
      const next = deleteDeck(deckId);
      if (next) applyDeck(next, { persist: false });
      else hideLearningPlatform();
      renderDecks();
      flashMessage('Kelime seti silindi.');
    }
  });
}

function renderDecks() {
  const decks = loadDecks();
  const section = $('decksSection');
  const list = $('decksList');
  $('decksCount').textContent = decks.length ? `${decks.length} set` : '';

  if (!decks.length) {
    section.classList.add('hidden');
    list.innerHTML = '';
    return;
  }

  section.classList.remove('hidden');
  list.replaceChildren(
    ...decks.map((deck) => {
      const card = document.createElement('article');
      card.className = `deck-card${deck.id === activeDeckId ? ' active' : ''}`;

      const body = document.createElement('button');
      body.type = 'button';
      body.className = 'deck-card-main';
      body.dataset.deckAction = 'open';
      body.dataset.deckId = deck.id;

      const title = document.createElement('p');
      title.className = 'deck-card-title';
      title.textContent = deck.title;

      const meta = document.createElement('p');
      meta.className = 'deck-card-meta';
      meta.textContent = `${deck.words.length} kelime · ${formatDeckDate(deck.createdAt)}`;

      body.append(title, meta);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'deck-card-delete';
      remove.dataset.deckAction = 'delete';
      remove.dataset.deckId = deck.id;
      remove.title = 'Seti sil';
      remove.setAttribute('aria-label', 'Seti sil');
      remove.textContent = 'Sil';

      card.append(body, remove);
      return card;
    })
  );
}

function bindModeTabs() {
  document.querySelectorAll('.mode-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      switchMode(tab.dataset.mode);
    });
  });
}

function switchMode(mode) {
  currentMode = mode;

  document.querySelectorAll('.mode-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.mode === mode);
  });

  document.querySelectorAll('.mode-panel').forEach((p) => p.classList.add('hidden'));

  const panels = {
    flashcards: 'flashcardsMode',
    quiz: 'quizMode',
    match: 'matchMode',
    list: 'listMode',
  };

  $(panels[mode])?.classList.remove('hidden');

  if (mode === 'flashcards') resetFlashcards();
  if (mode === 'quiz') resetQuiz();
  if (mode === 'match') resetMatch();
  if (mode === 'list') renderList(speak);
}

function setLoading(on) {
  $('loadingState').classList.toggle('hidden', !on);
  $('analyzeBtn').disabled = on || !($('apiKeyInput').value.trim() && currentImages.length);
}

function showError(msg) {
  const el = $('errorState');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  $('errorState').classList.add('hidden');
}

function flashMessage(msg) {
  const toast = document.createElement('div');
  toast.className =
    'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-mint/20 border border-mint/40 text-mint text-sm font-medium backdrop-blur-sm animate-fade-in';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

let speaking = false;

function speak(word) {
  if (!('speechSynthesis' in window)) {
    showError('Tarayıcınız sesli telaffuzu desteklemiyor.');
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;

  const btn = $('speakBtn');
  utterance.onstart = () => btn?.classList.add('speaking');
  utterance.onend = () => btn?.classList.remove('speaking');
  utterance.onerror = () => btn?.classList.remove('speaking');

  window.speechSynthesis.speak(utterance);
}

document.addEventListener('DOMContentLoaded', init);
