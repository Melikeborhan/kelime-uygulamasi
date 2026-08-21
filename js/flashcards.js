let currentIndex = 0;
let words = [];

const els = {
  flashcard: () => document.getElementById('flashcard'),
  cardWord: () => document.getElementById('cardWord'),
  cardMeaning: () => document.getElementById('cardMeaning'),
  cardMnemonic: () => document.getElementById('cardMnemonic'),
  cardExample: () => document.getElementById('cardExample'),
  cardExampleTr: () => document.getElementById('cardExampleTr'),
  counter: () => document.getElementById('flashcardCounter'),
  prevBtn: () => document.getElementById('prevCardBtn'),
  nextBtn: () => document.getElementById('nextCardBtn'),
  speakBtn: () => document.getElementById('speakBtn'),
};

export function initFlashcards(onSpeak) {
  const card = els.flashcard();
  card?.addEventListener('click', (e) => {
    if (e.target.closest('#speakBtn')) return;
    card.classList.toggle('flipped');
  });

  els.prevBtn()?.addEventListener('click', (e) => {
    e.stopPropagation();
    navigate(-1);
  });

  els.nextBtn()?.addEventListener('click', (e) => {
    e.stopPropagation();
    navigate(1);
  });

  els.speakBtn()?.addEventListener('click', (e) => {
    e.stopPropagation();
    const w = words[currentIndex];
    if (w) onSpeak(w.word);
  });

  document.addEventListener('keydown', (e) => {
    if (!words.length) return;
    const active = document.querySelector('[data-mode="flashcards"]')?.classList.contains('active');
    if (!active) return;
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      els.flashcard()?.classList.toggle('flipped');
    }
  });
}

export function setFlashcardWords(data) {
  words = data;
  currentIndex = 0;
  render();
}

function navigate(dir) {
  currentIndex = Math.max(0, Math.min(words.length - 1, currentIndex + dir));
  els.flashcard()?.classList.remove('flipped');
  render();
}

function render() {
  if (!words.length) return;
  const w = words[currentIndex];

  els.cardWord().textContent = w.word;
  els.cardMeaning().textContent = w.meaning;
  els.cardMnemonic().textContent = w.mnemonic;
  els.cardExample().textContent = w.exampleSentence;
  els.cardExampleTr().textContent = w.exampleSentenceTr;
  els.counter().textContent = `${currentIndex + 1} / ${words.length}`;
  els.prevBtn().disabled = currentIndex === 0;
  els.nextBtn().disabled = currentIndex === words.length - 1;
}

export function resetFlashcards() {
  currentIndex = 0;
  els.flashcard()?.classList.remove('flipped');
  render();
}
