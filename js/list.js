let words = [];
let filter = '';

const els = {
  tbody: () => document.getElementById('listTableBody'),
  cards: () => document.getElementById('listCards'),
  search: () => document.getElementById('listSearch'),
};

export function initList(onSpeak) {
  els.search()?.addEventListener('input', (e) => {
    filter = e.target.value.toLowerCase().trim();
    render(onSpeak);
  });
}

export function setListWords(data) {
  words = data;
  filter = '';
  if (els.search()) els.search().value = '';
  render(null);
}

export function renderList(onSpeak) {
  render(onSpeak);
}

function render(onSpeak) {
  const filtered = words.filter(
    (w) =>
      !filter ||
      w.word.toLowerCase().includes(filter) ||
      w.meaning.toLowerCase().includes(filter) ||
      w.mnemonic.toLowerCase().includes(filter)
  );

  const tbody = els.tbody();
  tbody.innerHTML = '';

  filtered.forEach((w) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-slate-500">${w.id}</td>
      <td class="word-cell">${escapeHtml(w.word)}</td>
      <td>${escapeHtml(w.meaning)}</td>
      <td class="text-slate-400 text-sm max-w-xs">${escapeHtml(w.mnemonic)}</td>
      <td class="text-slate-400 text-sm max-w-xs">
        <em>${escapeHtml(w.exampleSentence)}</em>
        <br><span class="text-slate-500 text-xs">${escapeHtml(w.exampleSentenceTr)}</span>
      </td>
      <td>
        <button type="button" class="list-speak-btn" data-word="${escapeAttr(w.word)}" title="Telaffuz">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>
      </td>`;
    tbody.appendChild(tr);
  });

  if (onSpeak) {
    tbody.querySelectorAll('.list-speak-btn').forEach((btn) => {
      btn.addEventListener('click', () => onSpeak(btn.dataset.word));
    });
  }

  const cardsEl = els.cards();
  cardsEl.innerHTML = '';
  filtered.forEach((w) => {
    const card = document.createElement('div');
    card.className = 'list-card-item';
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <h3>${escapeHtml(w.word)}</h3>
        <button type="button" class="list-speak-btn mobile-speak" data-word="${escapeAttr(w.word)}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>
      </div>
      <p class="text-mint mt-1">${escapeHtml(w.meaning)}</p>
      <p class="mt-2 text-xs text-coral">${escapeHtml(w.mnemonic)}</p>
      <p class="mt-2 italic">${escapeHtml(w.exampleSentence)}</p>`;
    cardsEl.appendChild(card);
  });

  if (onSpeak) {
    cardsEl.querySelectorAll('.mobile-speak').forEach((btn) => {
      btn.addEventListener('click', () => onSpeak(btn.dataset.word));
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;');
}
