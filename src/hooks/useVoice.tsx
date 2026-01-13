import { useState, useCallback, useRef, useEffect } from 'react';

export function useVoice() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check if speech synthesis is available
  const isAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Speak text
  const speak = useCallback((text: string) => {
    if (!isAvailable || !voiceEnabled) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean the text (remove markdown, code blocks, etc.)
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'code block')
      .replace(/`[^`]+`/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to use a female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => 
      v.name.toLowerCase().includes('female') || 
      v.name.toLowerCase().includes('samantha') ||
      v.name.toLowerCase().includes('victoria') ||
      v.name.toLowerCase().includes('zira') ||
      v.name.toLowerCase().includes('google') && v.name.toLowerCase().includes('female')
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isAvailable, voiceEnabled]);

  // Pause speech
  const pause = useCallback(() => {
    if (!isAvailable) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isAvailable]);

  // Resume speech
  const resume = useCallback(() => {
    if (!isAvailable) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isAvailable]);

  // Stop speech
  const stop = useCallback(() => {
    if (!isAvailable) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, [isAvailable]);

  // Toggle voice
  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => {
      if (prev) {
        // If disabling, stop any ongoing speech
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
        setIsPaused(false);
      }
      return !prev;
    });
  }, []);

  // Load voices when available
  useEffect(() => {
    if (!isAvailable) return;

    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isAvailable]);

  return {
    voiceEnabled,
    setVoiceEnabled,
    toggleVoice,
    isSpeaking,
    isPaused,
    speak,
    pause,
    resume,
    stop,
    isAvailable
  };
}
