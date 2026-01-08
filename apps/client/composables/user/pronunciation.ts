/**
 * Browser TTS (Web Speech API)
 *
 * Uses `speechSynthesis` to read English text aloud, instead of fetching audio
 * from external services.
 */

export interface SpeakEnglishOptions {
  rate?: number;
  lang?: string;
  cancelPrevious?: boolean;
  onEnd?: () => void;
  /**
   * Prefer a female-sounding voice when available.
   * Note: Web Speech API does not expose gender, so this is heuristic.
   */
  preferFemale?: boolean;
  /**
   * Pitch adjustment. Higher values often sound more feminine.
   * Range is typically 0..2, default varies by browser.
   */
  pitch?: number;
}

export function usePronunciation() {
  // Cache a voice choice to keep the sound consistent.
  let cachedVoice: SpeechSynthesisVoice | null = null;

  function isTtsSupported(): boolean {
    return (
      typeof globalThis.speechSynthesis !== "undefined" &&
      typeof globalThis.SpeechSynthesisUtterance !== "undefined"
    );
  }

  function normalizeLang(lang: string): string {
    return (lang || "").toLowerCase();
  }

  function pickVoice(lang: string, preferFemale: boolean): SpeechSynthesisVoice | null {
    if (!isTtsSupported()) return null;

    const voices = globalThis.speechSynthesis.getVoices?.() ?? [];
    if (!voices.length) return null;

    const target = normalizeLang(lang);
    const englishVoices = voices.filter((v) => normalizeLang(v.lang).startsWith(target));
    const candidates = englishVoices.length
      ? englishVoices
      : voices.filter((v) => normalizeLang(v.lang).startsWith("en"));

    if (!candidates.length) return voices[0] ?? null;

    if (!preferFemale) return candidates[0] ?? null;

    // Heuristic: look for common female voice names across platforms.
    const femaleHints = [
      "female",
      "woman",
      "zira", // Windows
      "susan",
      "samantha", // macOS
      "victoria",
      "karen",
      "moira",
      "tessa",
      "veena",
      "amy",
      "emma",
      "joanna",
      "ivy",
      "olivia",
      "serena",
      "kate",
      "hazel",
    ];

    const found = candidates.find((v) => {
      const name = (v.name || "").toLowerCase();
      return femaleHints.some((h) => name.includes(h));
    });

    return found ?? candidates[0] ?? null;
  }

  function primeVoices() {
    if (!isTtsSupported()) return;
    // `getVoices()` may be empty on first call in some browsers.
    // Priming + listening makes subsequent speaks more likely to have voices.
    try {
      globalThis.speechSynthesis.getVoices?.();
      globalThis.speechSynthesis.onvoiceschanged = () => {
        cachedVoice = null;
      };
    } catch {
      // ignore
    }
  }

  function stopSpeaking() {
    if (!isTtsSupported()) return;
    globalThis.speechSynthesis.cancel();
  }

  function speakEnglish(
    english: string | undefined,
    options?: SpeakEnglishOptions,
  ): SpeechSynthesisUtterance | null {
    const text = (english ?? "").trim();
    if (!text) return null;
    if (!isTtsSupported()) return null;

    primeVoices();

    const {
      rate = 1,
      lang = "en-US",
      cancelPrevious = true,
      onEnd,
      preferFemale = true,
      pitch = 1.15,
    } = options ?? {};

    const utterance = new globalThis.SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    if (onEnd) utterance.onend = () => onEnd();

    if (!cachedVoice) {
      cachedVoice = pickVoice(lang, preferFemale);
    }
    if (cachedVoice) utterance.voice = cachedVoice;

    // Cancel any previous queued speech to make UX snappy.
    if (cancelPrevious) globalThis.speechSynthesis.cancel();
    globalThis.speechSynthesis.speak(utterance);
    return utterance;
  }

  return {
    isTtsSupported,
    speakEnglish,
    stopSpeaking,
  };
}
