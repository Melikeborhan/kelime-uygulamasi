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

// Lite / 2.5 önce: daha az yoğun, düşünme maliyeti düşük. 3.7/3.8 yedek.
const MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
];

const MAX_RETRIES = 1;

export async function analyzeImages(apiKey, images) {
  const imageParts = images.map((image) => ({
    inline_data: {
      mime_type: image.mimeType,
      data: image.base64Data,
    },
  }));

  let lastError = null;

  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const body = {
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            ...imageParts,
          ],
        },
      ],
      generationConfig: buildGenerationConfig(model),
    };

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await sleep(1000 * 2 ** (attempt - 1));
      }

      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(body),
        });
      } catch {
        lastError = new Error(
          'Gemini API’ye ulaşılamadı. İnternet bağlantınızı kontrol edin veya bir dakika sonra tekrar deneyin.'
        );
        break;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err?.error?.message || `API hatası: ${response.status}`;
        lastError = Object.assign(new Error(msg), { status: response.status, model });

        if (isFatalAuthOrQuota(msg, response.status)) {
          throw friendlyGeminiError(lastError);
        }
        if (shouldRetrySameModel(msg, response.status) && attempt < MAX_RETRIES) {
          continue;
        }
        if (shouldTryNextModel(msg, response.status)) {
          break;
        }
        throw friendlyGeminiError(lastError);
      }

      const data = await response.json();
      const finishReason = data?.candidates?.[0]?.finishReason;
      const text = data?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;

      if (!text) {
        lastError = Object.assign(
          new Error(
            finishReason === 'MAX_TOKENS'
              ? 'Yanıt token limiti doldu. Daha az kelimeli / daha net bir görsel deneyin.'
              : 'Gemini yanıt vermedi. Görseli kontrol edip tekrar deneyin.'
          ),
          { status: response.status, model }
        );
        if (shouldTryNextModel(lastError.message, response.status)) break;
        throw friendlyGeminiError(lastError);
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
  }

  throw lastError ? friendlyGeminiError(lastError) : new Error('Uygun Gemini modeli bulunamadı.');
}

function buildGenerationConfig(model) {
  const config = {
    response_mime_type: 'application/json',
    response_schema: WORD_SCHEMA,
  };

  if (model.startsWith('gemini-2.5')) {
    config.temperature = 0.4;
    config.thinkingConfig = { thinkingBudget: 0 };
  } else if (model.startsWith('gemini-3')) {
    // Gemini 3.7+ "minimal" desteklemez; LOW gecikmeyi düşürür.
    config.thinkingConfig = { thinkingLevel: 'low' };
  } else {
    config.temperature = 0.4;
  }

  return config;
}

function isFatalAuthOrQuota(message, status) {
  const lowerMsg = message.toLowerCase();
  if ([400, 401, 403].includes(status) && isAuthError(lowerMsg)) return true;
  if (status === 429 && (lowerMsg.includes('quota') || lowerMsg.includes('billing') || lowerMsg.includes('limit'))) {
    return true;
  }
  return lowerMsg.includes('api key was reported as leaked');
}

function isAuthError(lowerMsg) {
  return (
    lowerMsg.includes('api key') ||
    lowerMsg.includes('api_key') ||
    lowerMsg.includes('invalid authentication') ||
    lowerMsg.includes('oauth') ||
    lowerMsg.includes('permission denied') ||
    lowerMsg.includes('leaked')
  );
}

function shouldRetrySameModel(message, status) {
  const lowerMsg = message.toLowerCase();
  if ([408, 502, 503, 504].includes(status)) return true;
  return ['overloaded', 'high demand', 'unavailable', 'try again later', 'timeout'].some((p) =>
    lowerMsg.includes(p)
  );
}

function shouldTryNextModel(message, status) {
  const lowerMsg = message.toLowerCase();
  if (isFatalAuthOrQuota(message, status)) return false;
  if ([404, 500, 502, 503, 504].includes(status)) return true;
  return [
    'not found',
    'not supported',
    'no longer available',
    'high demand',
    'overloaded',
    'temporarily unavailable',
    'try again later',
  ].some((pattern) => lowerMsg.includes(pattern));
}

function friendlyGeminiError(error) {
  const message = error.message || '';
  const lower = message.toLowerCase();
  const status = error.status;
  const modelNote = error.model ? ` (model: ${error.model})` : '';

  if (lower.includes('leaked')) {
    return new Error(
      'Bu API anahtarı sızdırılmış olarak işaretlenmiş ve Google tarafından kapatılmış. Google AI Studio’dan yeni bir anahtar oluşturun.'
    );
  }
  if (
    lower.includes('invalid authentication credentials') ||
    lower.includes('expected oauth 2 access token') ||
    lower.includes('api key not valid') ||
    lower.includes('api_key_invalid')
  ) {
    return new Error(
      'Gemini API anahtarı geçersiz. gemini.google.com hesabı / Gemini Pro aboneliği bu uygulamaya bağlanmaz. Anahtarı https://aistudio.google.com/apikey adresinden alın ve AIza ile başladığından emin olun.'
    );
  }
  if (status === 429 || lower.includes('quota') || lower.includes('resource exhausted') || lower.includes('resource_exhausted')) {
    return new Error(
      'Gemini API kotanız doldu (ücretsiz günlük/dakikalık limit). Gemini Pro sohbet aboneliği bu kotayı artırmaz. Google AI Studio → Usage bölümünden kotayı kontrol edin; gerekirse yeni anahtar alın veya faturalamayı açın.'
    );
  }
  if (
    status === 503 ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('temporarily unavailable')
  ) {
    return new Error(
      `Gemini şu anda yoğun veya geçici olarak yanıt veremiyor${modelNote}. Birkaç dakika bekleyip tekrar deneyin. Sürekli olursa AI Studio’da faturalı / daha yüksek kotalı bir anahtar kullanın.`
    );
  }
  if (status === 404 || lower.includes('not found')) {
    return new Error(
      `Kullanılan Gemini modeli bu API anahtarıyla erişilemiyor${modelNote}. AI Studio’da anahtarın Gemini API için oluşturulduğundan emin olun.`
    );
  }

  return new Error(`${message}${modelNote}`);
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
