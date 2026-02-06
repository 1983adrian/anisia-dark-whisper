import { useState, useEffect, useRef } from 'react';

interface UseTypewriterOptions {
  speed?: number; // ms per character
  enabled?: boolean;
}

export function useTypewriter(
  fullText: string,
  options: UseTypewriterOptions = {}
) {
  const { speed = 60, enabled = true } = options;
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const indexRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFullTextRef = useRef('');

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(fullText);
      setIsTyping(false);
      return;
    }

    // If new text is longer than what we've typed, continue from where we left
    if (fullText.startsWith(lastFullTextRef.current)) {
      // Continue typing from current position
      if (indexRef.current < fullText.length) {
        setIsTyping(true);
      }
    } else {
      // Text changed completely, reset
      indexRef.current = 0;
      setDisplayedText('');
      setIsTyping(true);
    }
    
    lastFullTextRef.current = fullText;

    const typeNextChar = () => {
      if (indexRef.current < fullText.length) {
        indexRef.current++;
        setDisplayedText(fullText.slice(0, indexRef.current));
        timeoutRef.current = setTimeout(typeNextChar, speed);
      } else {
        setIsTyping(false);
      }
    };

    if (indexRef.current < fullText.length) {
      timeoutRef.current = setTimeout(typeNextChar, speed);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fullText, speed, enabled]);

  // Reset when unmounting
  useEffect(() => {
    return () => {
      indexRef.current = 0;
      lastFullTextRef.current = '';
    };
  }, []);

  return { displayedText, isTyping };
}
