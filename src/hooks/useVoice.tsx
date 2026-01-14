import { useState, useCallback, useRef, useEffect } from 'react';

export function useVoice() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [romanianVoice, setRomanianVoice] = useState<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check if speech synthesis is available
  const isAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Find the best Romanian voice
  const findRomanianVoice = useCallback(() => {
    if (!isAvailable) return null;
    
    const voices = window.speechSynthesis.getVoices();
    
    // Priority order for Romanian voices
    const romanianVoice = voices.find(v => 
      v.lang === 'ro-RO' || 
      v.lang === 'ro' ||
      v.lang.startsWith('ro-')
    );
    
    if (romanianVoice) {
      console.log('Found Romanian voice:', romanianVoice.name);
      return romanianVoice;
    }
    
    // Fallback: try to find a Google voice that might support Romanian
    const googleVoice = voices.find(v => 
      v.name.toLowerCase().includes('google') && 
      (v.lang.includes('ro') || v.name.toLowerCase().includes('roman'))
    );
    
    if (googleVoice) {
      console.log('Found Google voice for Romanian:', googleVoice.name);
      return googleVoice;
    }
    
    // Last fallback - any available voice (will speak with accent)
    console.log('No Romanian voice found, using default');
    return voices[0] || null;
  }, [isAvailable]);

  // Speak text in Romanian
  const speak = useCallback((text: string) => {
    if (!isAvailable || !voiceEnabled) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean the text (remove markdown, code blocks, HTML, game code etc.)
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'bloc de cod')
      .replace(/<game>[\s\S]*?<\/game>/g, 'un joc interactiv')
      .replace(/`[^`]+`/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.1; // Slightly higher for feminine voice
    utterance.volume = 1;
    utterance.lang = 'ro-RO'; // Set Romanian language

    // Use Romanian voice if available
    const voice = romanianVoice || findRomanianVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = (e) => {
      console.error('Speech error:', e);
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isAvailable, voiceEnabled, romanianVoice, findRomanianVoice]);

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
      const voices = window.speechSynthesis.getVoices();
      const roVoice = findRomanianVoice();
      setRomanianVoice(roVoice);
      console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isAvailable, findRomanianVoice]);

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
    isAvailable,
    hasRomanianVoice: !!romanianVoice
  };
}
