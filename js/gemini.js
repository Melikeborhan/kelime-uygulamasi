const WORD_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      id: { type: 'INTEGER' },
      word: { type: 'STRING' },
      meaning: { type: 'STRING' },
      mnemonic: { type: 'STRING' },
      exampleSentence: { type: 'STRING' },
      exampleSentenceTr: { type: 'STRING' },
      quiz: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          options: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
          answer: { type: 'STRING' },
          hint: { type: 'STRING' },
        },
        required: ['question', 'options', 'answer', 'hint'],
      },
    },
    required: [
      'id',
      'word',
      'meaning',
      'mnemonic',
      'exampleSentence',
      'exampleSentenceTr',
      'quiz',
    ],
  },
};

const SYSTEM_PROMPT = `You are an expert English vocabulary tutor for Turkish speakers.
Extract ALL English vocabulary words visible in the uploaded image(s) (screenshots, book pages, tables, handwritten lists, etc.).

For EACH word found, create a complete learning entry with:
- word: the English word (lowercase unless proper noun)
- meaning: Turkish translation(s)
- mnemonic: a creative Turkish memory trick connecting sound/meaning (use "→" separator)
- exampleSentence: natural English example sentence using the word
- exampleSentenceTr: Turkish translation of the example
- quiz: a fill-in-the-blank multiple choice question with exactly 4 options (include the correct answer), plus a Turkish hint

Rules:
- Extract every word you can identify from all uploaded images
- If the images have no English words, return an empty array []
- Assign sequential id starting from 1
- Quiz wrong options should be plausible but clearly wrong
- Keep mnemonics memorable and fun for Turkish learners`;

const MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];
const FALLBACK_MODEL_ERRORS = [
  'not found',
  'not supported',
  'no longer available',
  'high demand',
  'overloaded',
  'temporarily unavailable',
  'try again later',
];

export async function analyzeImages(apiKey, images) {
  const imageParts = images.map((image) => ({
    inline_data: {
      mime_type: image.mimeType,
      data: image.base64Data,
    },
  }));

  const body = {
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          ...imageParts,
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      response_mime_type: 'application/json',
      response_schema: WORD_SCHEMA,
    },
  };

  let lastError = null;

  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || `API hatası: ${response.status}`;
      if (shouldTryNextModel(msg, response.status)) {
        lastError = new Error(msg);
        continue;
      }
      throw new Error(msg);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Gemini yanıt vermedi. Görseli kontrol edip tekrar deneyin.');
    }

    let words;
    try {
      words = JSON.parse(text);
    } catch {
      throw new Error('JSON ayrıştırma hatası. Lütfen tekrar deneyin.');
    }

    if (!Array.isArray(words)) {
      throw new Error('Beklenmeyen yanıt formatı.');
    }

    return normalizeWords(words);
  }

  throw lastError ? friendlyGeminiError(lastError) : new Error('Uygun Gemini modeli bulunamadı.');
}

function shouldTryNextModel(message, status) {
  const lowerMsg = message.toLowerCase();
  if (FALLBACK_MODEL_ERRORS.some((pattern) => lowerMsg.includes(pattern))) return true;
  return [500, 502, 503, 504].includes(status);
}

function friendlyGeminiError(error) {
  const message = error.message.toLowerCase();
  if (
    message.includes('high demand') ||
    message.includes('overloaded') ||
    message.includes('temporarily unavailable') ||
    message.includes('try again later')
  ) {
    return new Error(
      'Gemini modelleri şu anda yoğun. Uygulama yedek modelleri de denedi; lütfen birkaç dakika sonra tekrar deneyin.'
    );
  }

  return error;
}

function normalizeWords(words) {
  return words
    .filter((w) => w && w.word)
    .map((w, i) => ({
      id: w.id ?? i + 1,
      word: String(w.word).trim(),
      meaning: String(w.meaning || '').trim(),
      mnemonic: String(w.mnemonic || '').trim(),
      exampleSentence: String(w.exampleSentence || '').trim(),
      exampleSentenceTr: String(w.exampleSentenceTr || '').trim(),
      quiz: {
        question: String(w.quiz?.question || `Choose the correct word for: ${w.word}`).trim(),
        options: Array.isArray(w.quiz?.options) ? w.quiz.options.map(String) : [w.word, '—', '—', '—'],
        answer: String(w.quiz?.answer || w.word).trim(),
        hint: String(w.quiz?.hint || w.mnemonic || '').trim(),
      },
    }));
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });
}
