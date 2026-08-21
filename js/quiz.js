let words = [];
let currentIndex = 0;
let correct = 0;
let wrong = 0;
let answered = false;

const els = {
  progress: () => document.getElementById('quizProgress'),
  question: () => document.getElementById('quizQuestion'),
  options: () => document.getElementById('quizOptions'),
  hint: () => document.getElementById('quizHint'),
  hintBtn: () => document.getElementById('quizHintBtn'),
  nextBtn: () => document.getElementById('quizNextBtn'),
  correctEl: () => document.getElementById('quizCorrect'),
  wrongEl: () => document.getElementById('quizWrong'),
  scoreEl: () => document.getElementById('quizScore'),
};

export function initQuiz() {
  els.hintBtn()?.addEventListener('click', () => {
    const w = words[currentIndex];
    if (!w) return;
    els.hint().textContent = w.quiz.hint;
    els.hint().classList.remove('hidden');
  });

  els.nextBtn()?.addEventListener('click', handleNext);
}

function handleNext() {
  if (els.nextBtn()?.textContent === 'Baştan Başla') {
    resetQuiz();
    return;
  }
  if (currentIndex < words.length - 1) {
    currentIndex++;
    answered = false;
    render();
  } else {
    showSummary();
  }
}

export function setQuizWords(data) {
  words = data;
  resetQuiz();
}

export function resetQuiz() {
  currentIndex = 0;
  correct = 0;
  wrong = 0;
  answered = false;
  updateScoreboard();
  render();
}

function updateScoreboard() {
  const total = correct + wrong;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  els.correctEl().textContent = correct;
  els.wrongEl().textContent = wrong;
  els.scoreEl().textContent = `${pct}%`;
}

function render() {
  if (!words.length) return;
  const w = words[currentIndex];
  answered = false;

  els.progress().textContent = `Soru ${currentIndex + 1} / ${words.length}`;
  els.question().textContent = w.quiz.question;
  els.hint().classList.add('hidden');
  els.nextBtn().classList.add('hidden');

  const container = els.options();
  container.innerHTML = '';

  const shuffled = shuffle([...w.quiz.options]);
  shuffled.forEach((opt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quiz-option';
    btn.textContent = opt;
    btn.addEventListener('click', () => selectOption(btn, opt, w.quiz.answer));
    container.appendChild(btn);
  });
}

function selectOption(btn, selected, answer) {
  if (answered) return;
  answered = true;

  const allBtns = els.options().querySelectorAll('.quiz-option');
  allBtns.forEach((b) => (b.disabled = true));

  if (selected === answer) {
    btn.classList.add('correct');
    correct++;
  } else {
    btn.classList.add('wrong');
    wrong++;
    allBtns.forEach((b) => {
      if (b.textContent === answer) b.classList.add('correct');
    });
    els.hint().textContent = words[currentIndex].quiz.hint;
    els.hint().classList.remove('hidden');
  }

  updateScoreboard();
  els.nextBtn().classList.remove('hidden');
  els.nextBtn().textContent =
    currentIndex < words.length - 1 ? 'Sonraki Soru' : 'Sonuçları Gör';
}

function showSummary() {
  const pct = Math.round((correct / words.length) * 100);
  els.question().innerHTML = `<span class="text-accent-light font-display text-2xl">Quiz Tamamlandı!</span>`;
  els.options().innerHTML = `
    <div class="col-span-2 p-6 rounded-xl bg-white/5 border border-white/10 text-center">
      <p class="text-4xl font-display font-bold text-white mb-2">${pct}%</p>
      <p class="text-slate-400">${correct} doğru, ${wrong} yanlış — ${words.length} soru</p>
    </div>`;
  els.hint().classList.add('hidden');
  els.nextBtn().textContent = 'Baştan Başla';
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
