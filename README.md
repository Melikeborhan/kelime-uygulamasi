# Kelime Detoks — AI Öğrenme Platformu

Görseldeki İngilizce kelime listesini **Gemini API (Multimodal)** ile otomatik çıkarıp interaktif öğrenme modlarına dönüştüren modern web uygulaması.

## Özellikler

- Gemini API Key girişi (localStorage'da saklanır)
- Sürükle-bırak çoklu görsel yükleme (en fazla 5 görsel)
- `gemini-3.7-flash` ile structured JSON çıktı (otomatik yedek modeller: `gemini-3.6-flash`, `gemini-3.5-flash`)
- **Kelime Kartları** — 3D flip card + TTS
- **Quiz / Test** — 4 şıklı, anlık geri bildirim, skor tablosu
- **Eşleştirme Oyunu** — İngilizce ↔ Türkçe eşleştirme
- **Liste Görünümü** — Arama ve filtreleme

## Kurulum & Çalıştırma

1. [Google AI Studio](https://aistudio.google.com/apikey) üzerinden Gemini API anahtarı alın.
2. Projeyi bir yerel sunucu ile açın (ES modülleri için gerekli):

```bash
cd kelime-detoks-platform
python -m http.server 8080
```

3. Tarayıcıda `http://localhost:8080` adresine gidin.
4. API anahtarınızı girin, kelime listesi görselini/görsellerini yükleyin ve **Kelime Setini Analiz Et & Oluştur** butonuna tıklayın.

> **Not:** `index.html` dosyasını doğrudan çift tıklayarak açmak ES module kısıtlaması nedeniyle çalışmayabilir. Basit bir HTTP sunucusu kullanın.
