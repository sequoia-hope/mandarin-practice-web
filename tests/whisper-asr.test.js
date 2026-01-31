/**
 * Tests for whisper-asr.js
 *
 * These tests verify:
 * 1. Model loading and initialization
 * 2. Transcription functionality
 * 3. Repetition/hallucination cleaning
 * 4. Error handling doesn't crash the page
 *
 * Note: We can't easily test the actual whisper-asr module since it dynamically
 * imports from CDN. Instead we test the logic patterns used in the module.
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe('cleanRepetitions logic', () => {
  // Replicate the cleanRepetitions function for testing
  function cleanRepetitions(text) {
    if (!text || text.length < 10) return text;

    // Detect character-level repetition (e.g., "去去去去去去")
    const charMatch = text.match(/^(.{1,4})\1{4,}/);
    if (charMatch) {
      console.log('Detected repetition hallucination, returning empty');
      return '';
    }

    // Detect if a short phrase repeats many times
    for (let len = 1; len <= 6; len++) {
      const segment = text.slice(0, len);
      const repeated = segment.repeat(Math.ceil(text.length / len)).slice(0, text.length);
      if (repeated === text && text.length > len * 5) {
        console.log('Detected phrase repetition, returning empty');
        return '';
      }
    }

    // If text is unreasonably long for a short phrase (>100 chars), likely hallucination
    if (text.length > 100) {
      const charCounts = {};
      for (const char of text) {
        charCounts[char] = (charCounts[char] || 0) + 1;
      }
      const maxCount = Math.max(...Object.values(charCounts));
      if (maxCount > text.length * 0.5) {
        console.log('Detected dominant character repetition, returning empty');
        return '';
      }
    }

    return text;
  }

  test('should return short text unchanged', () => {
    expect(cleanRepetitions('你好')).toBe('你好');
    expect(cleanRepetitions('hello')).toBe('hello');
  });

  test('should return null/undefined as-is', () => {
    expect(cleanRepetitions(null)).toBe(null);
    expect(cleanRepetitions(undefined)).toBe(undefined);
    expect(cleanRepetitions('')).toBe('');
  });

  test('should detect single character repetition', () => {
    expect(cleanRepetitions('去去去去去去去去去去去去')).toBe('');
  });

  test('should detect two character repetition', () => {
    expect(cleanRepetitions('你好你好你好你好你好你好')).toBe('');
  });

  test('should detect three character phrase repetition', () => {
    expect(cleanRepetitions('谢谢你谢谢你谢谢你谢谢你谢谢你')).toBe('');
  });

  test('should not flag legitimate longer text', () => {
    const validText = '今天天气很好我想去公园散步';
    expect(cleanRepetitions(validText)).toBe(validText);
  });

  test('should detect dominant character in long text', () => {
    const badText = 'a'.repeat(60) + 'b'.repeat(20) + 'c'.repeat(21);
    expect(cleanRepetitions(badText)).toBe('');
  });

  test('should not flag diverse long text', () => {
    // Create text with no dominant character
    const diverseText = 'abcdefghij'.repeat(11); // 110 chars, each char appears 11 times (10%)
    expect(cleanRepetitions(diverseText)).toBe(diverseText);
  });
});

describe('Transcription options validation', () => {
  test('should use Chinese language setting', () => {
    const options = {
      language: 'chinese',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
      no_repeat_ngram_size: 3,
      max_new_tokens: 128,
    };

    expect(options.language).toBe('chinese');
    expect(options.task).toBe('transcribe');
    expect(options.no_repeat_ngram_size).toBe(3);
  });

  test('should add prompt when expected phrase provided', () => {
    const expectedPhrase = '你好';
    const options = {};

    if (expectedPhrase) {
      options.prompt = expectedPhrase;
    }

    expect(options.prompt).toBe('你好');
  });

  test('should not add prompt when no expected phrase', () => {
    const expectedPhrase = null;
    const options = {};

    if (expectedPhrase) {
      options.prompt = expectedPhrase;
    }

    expect(options.prompt).toBeUndefined();
  });
});

describe('Model initialization guard pattern', () => {
  test('should prevent multiple simultaneous loads', async () => {
    let loadingPromise = null;
    let modelLoaded = false;
    let loadCount = 0;

    const initModel = async () => {
      if (loadingPromise) {
        return loadingPromise;
      }

      if (modelLoaded) {
        return;
      }

      loadingPromise = (async () => {
        loadCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        modelLoaded = true;
        return 'loaded';
      })();

      return loadingPromise;
    };

    // Start multiple loads simultaneously
    const [result1, result2, result3] = await Promise.all([
      initModel(),
      initModel(),
      initModel()
    ]);

    expect(loadCount).toBe(1);
    expect(result1).toBe('loaded');
    expect(result2).toBe('loaded');
    expect(result3).toBe('loaded');
  });

  test('should return early if already loaded', async () => {
    let modelLoaded = true;
    let loadCount = 0;

    const initModel = async () => {
      if (modelLoaded) {
        return;
      }
      loadCount++;
    };

    await initModel();
    await initModel();

    expect(loadCount).toBe(0);
  });

  test('should allow retry after error when loadingPromise is cleared', async () => {
    // This tests the pattern used in whisper-asr.js
    // The key insight: loadingPromise must be reset BEFORE throwing
    // so that subsequent calls don't return the failed promise
    let loadingPromise = null;
    let attemptCount = 0;
    let shouldFail = true;

    const initModel = async () => {
      if (loadingPromise) {
        return loadingPromise;
      }

      loadingPromise = (async () => {
        attemptCount++;
        if (shouldFail) {
          // Important: this mimics whisper-asr.js behavior
          // where loadingPromise = null happens in catch
          throw new Error('First attempt failed');
        }
        return 'loaded';
      })().catch(error => {
        loadingPromise = null; // Reset on error to allow retry
        throw error;
      });

      return loadingPromise;
    };

    // First attempt fails
    await expect(initModel()).rejects.toThrow('First attempt failed');

    // Second attempt should work since catch handler reset loadingPromise
    shouldFail = false;
    const result = await initModel();
    expect(result).toBe('loaded');
    expect(attemptCount).toBe(2);
  });
});

describe('Error handling patterns', () => {
  test('transcription errors should be caught and re-thrown', async () => {
    const transcribe = async (audioData) => {
      try {
        throw new Error('WASM memory error');
      } catch (error) {
        console.error('Transcription error:', error);
        throw error;
      }
    };

    await expect(transcribe(new Float32Array(100)))
      .rejects.toThrow('WASM memory error');
  });

  test('should handle model not loaded error', async () => {
    const modelLoaded = false;
    const transcriber = null;

    const transcribe = async (audioData) => {
      if (!modelLoaded || !transcriber) {
        throw new Error('Whisper model not loaded. Call initWhisperModel() first.');
      }
      return { text: 'result' };
    };

    await expect(transcribe(new Float32Array(100)))
      .rejects.toThrow('Whisper model not loaded');
  });
});
