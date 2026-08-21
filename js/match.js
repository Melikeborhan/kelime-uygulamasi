let words = [];
let tiles = [];
let selected = null;
let matchedCount = 0;
let timerInterval = null;
let seconds = 0;

const els = {
  grid: () => document.getElementById('matchGrid'),
  count: () => document.getElementById('matchCount'),
  total: () => document.getElementById('matchTotal'),
  timer: () => document.getElementById('matchTimer'),
  complete: () => document.getElementById('matchComplete'),
  completeMsg: () => document.getElementById('matchCompleteMsg'),
  restart: () => document.getElementById('matchRestartBtn'),
};

export function initMatch() {
  els.restart()?.addEventListener('click', () => startGame());
}

export function setMatchWords(data) {
  words = data;
  startGame();
}

function startGame() {
  stopTimer();
  seconds = 0;
  matchedCount = 0;
  selected = null;
  els.complete()?.classList.add('hidden');
  els.count().textContent = '0';
  els.total().textContent = String(words.length);
  els.timer().textContent = '0:00';

  tiles = [];
  words.forEach((w) => {
    tiles.push({ id: w.id, type: 'en', text: w.word, pairId: w.id });
    tiles.push({ id: `${w.id}-tr`, type: 'tr', text: w.meaning, pairId: w.id });
  });

  tiles = shuffle(tiles);
  renderGrid();
  startTimer();
}

function renderGrid() {
  const grid = els.grid();
  grid.innerHTML = '';

  tiles.forEach((tile, idx) => {
    if (tile.matched) return;
    const el = document.createElement('div');
    el.className = `match-tile ${tile.type}`;
    el.textContent = tile.text;
    el.dataset.idx = idx;
    el.addEventListener('click', () => onTileClick(idx));
    grid.appendChild(el);
  });
}

function onTileClick(idx) {
  const tile = tiles[idx];
  if (!tile || tile.matched) return;

  const grid = els.grid();
  const el = grid.querySelector(`[data-idx="${idx}"]`);
  if (!el) return;

  if (selected === null) {
    selected = idx;
    el.classList.add('selected');
    return;
  }

  if (selected === idx) {
    el.classList.remove('selected');
    selected = null;
    return;
  }

  const first = tiles[selected];
  const firstEl = grid.querySelector(`[data-idx="${selected}"]`);

  if (first.type === tile.type) {
    firstEl?.classList.remove('selected');
    selected = idx;
    el.classList.add('selected');
    return;
  }

  if (first.pairId === tile.pairId) {
    tile.matched = true;
    first.matched = true;
    matchedCount++;
    els.count().textContent = String(matchedCount);

    el.classList.add('matched');
    firstEl?.classList.remove('selected');
    firstEl?.classList.add('matched');

    setTimeout(() => {
      firstEl?.remove();
      el.remove();
      if (matchedCount === words.length) onComplete();
    }, 500);

    selected = null;
  } else {
    el.classList.add('wrong-flash');
    firstEl?.classList.add('wrong-flash');
    setTimeout(() => {
      el.classList.remove('wrong-flash', 'selected');
      firstEl?.classList.remove('wrong-flash', 'selected');
    }, 400);
    selected = null;
  }
}

function onComplete() {
  stopTimer();
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  els.completeMsg().textContent = `${words.length} kelimeyi ${mins}:${String(secs).padStart(2, '0')} sürede eşleştirdin!`;
  els.complete()?.classList.remove('hidden');
}

function startTimer() {
  timerInterval = setInterval(() => {
    seconds++;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    els.timer().textContent = `${m}:${String(s).padStart(2, '0')}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function resetMatch() {
  if (words.length) startGame();
}
