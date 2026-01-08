import { usePronunciation } from "~/composables/user/pronunciation";

let currentText = "";

// 便于测试
// 这里保留 updateSource/play 这一层 API，但底层改用浏览器 TTS。
export function updateSource(text: string) {
  currentText = (text ?? "").trim();
}

export function usePlayWordSound() {
  let lastWord = "";
  let isPlaying = false;

  const { speakEnglish, stopSpeaking } = usePronunciation();

  function handlePlayWordSound(word: string) {
    if (isPlaying && lastWord === word) {
      // skip
      return;
    }
    lastWord = word;

    stopSpeaking();
    isPlaying = true;
    const utterance = speakEnglish(word, {
      lang: "en-US",
      onEnd: () => {
        isPlaying = false;
      },
    });
    if (!utterance) {
      isPlaying = false;
      return;
    }
  }

  return {
    handlePlayWordSound,
  };
}

export interface PlayOptions {
  times?: number;
  rate?: number;
  interval?: number;
}

const DefaultPlayOptions = {
  times: 1,
  rate: 1,
  interval: 500,
};

export function play(playOptions?: PlayOptions) {
  const { times, rate, interval } = Object.assign({}, DefaultPlayOptions, playOptions);

  const { speakEnglish, stopSpeaking, isTtsSupported } = usePronunciation();

  let timeoutId: NodeJS.Timeout | undefined;
  let cancelled = false;
  let completed = 0;

  function speakOnce() {
    if (cancelled) return;
    if (!currentText) return;

    let didEnd = false;
    const utterance = speakEnglish(currentText, {
      rate,
      lang: "en-US",
      onEnd: () => {
        if (cancelled || didEnd) return;
        didEnd = true;
        completed++;
        if (completed >= times) return;
        timeoutId = setTimeout(() => speakOnce(), interval);
      },
    });

    if (!utterance) return;

    // If TTS exists but `onend` isn't reliable in the environment, fall back.
    if (isTtsSupported()) {
      const ms = Math.min(8000, Math.max(800, currentText.length * 120));
      timeoutId = setTimeout(() => {
        if (cancelled || didEnd) return;
        didEnd = true;
        completed++;
        if (completed >= times) return;
        timeoutId = setTimeout(() => speakOnce(), interval);
      }, ms + interval);
    }
  }

  // start
  speakOnce();

  return () => {
    cancelled = true;
    stopSpeaking();
    timeoutId && clearTimeout(timeoutId);
  };
}
