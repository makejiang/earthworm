import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePronunciation } from "../pronunciation";

describe("pronunciation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns false when TTS is unavailable", () => {
    const originalSpeechSynthesis = (globalThis as any).speechSynthesis;
    const originalUtterance = (globalThis as any).SpeechSynthesisUtterance;
    (globalThis as any).speechSynthesis = undefined;
    (globalThis as any).SpeechSynthesisUtterance = undefined;

    const { isTtsSupported, speakEnglish } = usePronunciation();
    expect(isTtsSupported()).toBe(false);
    expect(speakEnglish("word")).toBeNull();

    (globalThis as any).speechSynthesis = originalSpeechSynthesis;
    (globalThis as any).SpeechSynthesisUtterance = originalUtterance;
  });

  it("speaks english when TTS is available", () => {
    const originalSpeechSynthesis = (globalThis as any).speechSynthesis;
    const originalUtterance = (globalThis as any).SpeechSynthesisUtterance;

    class MockUtterance {
      text: string;
      lang = "";
      rate = 1;
      pitch = 1;
      voice: any = null;
      onend: null | (() => void) = null;
      constructor(text: string) {
        this.text = text;
      }
    }

    const speak = vi.fn();
    const cancel = vi.fn();

    const getVoices = vi.fn(() => {
      return [
        { name: "Microsoft David - English (United States)", lang: "en-US" },
        { name: "Microsoft Zira - English (United States)", lang: "en-US" },
      ] as any;
    });

    (globalThis as any).SpeechSynthesisUtterance = MockUtterance;
    (globalThis as any).speechSynthesis = { speak, cancel, getVoices };

    const { isTtsSupported, speakEnglish } = usePronunciation();
    expect(isTtsSupported()).toBe(true);

    const utterance = speakEnglish("hello", { rate: 1.2 });
    expect(utterance).not.toBeNull();
    expect((utterance as any).text).toBe("hello");
    expect((utterance as any).lang).toBe("en-US");
    expect((utterance as any).rate).toBe(1.2);
    expect((utterance as any).pitch).toBe(1.15);
    expect(((utterance as any).voice?.name ?? "").toLowerCase()).toContain("zira");
    expect(speak).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);

    (globalThis as any).speechSynthesis = originalSpeechSynthesis;
    (globalThis as any).SpeechSynthesisUtterance = originalUtterance;
  });
});
