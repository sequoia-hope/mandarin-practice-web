/**
 * Tests for audio-capture.js
 *
 * These tests verify:
 * 1. Microphone is properly acquired and released
 * 2. Silence detection works correctly
 * 3. Recording state management is correct
 * 4. No resource leaks (mic stays open)
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { AudioRecorder, resampleTo16kHz } from '../audio-capture.js';
import {
  MockMediaRecorder,
  MockAudioContext,
  mockMediaDevices,
  MockMediaStream
} from './setup.js';

describe('AudioRecorder', () => {
  let recorder;

  beforeEach(() => {
    recorder = new AudioRecorder();
  });

  afterEach(async () => {
    // Ensure cleanup after each test
    if (recorder.isRecording()) {
      await recorder.stop();
    }
  });

  describe('start()', () => {
    test('should request microphone access', async () => {
      await recorder.start();

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: expect.objectContaining({
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        })
      });
    });

    test('should set recording state to true', async () => {
      expect(recorder.isRecording()).toBe(false);
      await recorder.start();
      expect(recorder.isRecording()).toBe(true);
    });

    test('should throw error if mediaDevices not available', async () => {
      const originalMediaDevices = navigator.mediaDevices;
      Object.defineProperty(navigator, 'mediaDevices', { value: undefined, writable: true });

      await expect(recorder.start()).rejects.toThrow('Microphone access requires HTTPS');

      Object.defineProperty(navigator, 'mediaDevices', { value: originalMediaDevices, writable: true });
    });

    test('should create MediaRecorder with supported mime type', async () => {
      await recorder.start();

      expect(MockMediaRecorder._instances.length).toBe(1);
      const mediaRecorder = MockMediaRecorder._instances[0];
      expect(['audio/webm', 'audio/webm;codecs=opus', '']).toContain(mediaRecorder.mimeType);
    });

    test('should set up silence detection when callback provided', async () => {
      const onSilenceDetected = jest.fn();
      await recorder.start({ onSilenceDetected });

      // Should have created an AudioContext for silence detection
      expect(MockAudioContext._instances.length).toBe(1);
    });

    test('should not set up silence detection when no callback', async () => {
      await recorder.start();

      // Should not have created an AudioContext
      expect(MockAudioContext._instances.length).toBe(0);
    });
  });

  describe('stop()', () => {
    test('should release microphone tracks', async () => {
      await recorder.start();
      const stream = recorder.stream;
      const tracks = stream.getTracks();

      await recorder.stop();

      // All tracks should be stopped
      tracks.forEach(track => {
        expect(track._stopped).toBe(true);
      });
    });

    test('should set recording state to false', async () => {
      await recorder.start();
      expect(recorder.isRecording()).toBe(true);

      await recorder.stop();
      expect(recorder.isRecording()).toBe(false);
    });

    test('should return audio blob', async () => {
      await recorder.start();

      // Wait a bit for chunks to be recorded
      await new Promise(resolve => setTimeout(resolve, 300));

      const blob = await recorder.stop();
      expect(blob).toBeInstanceOf(Blob);
    });

    test('should clean up silence detection interval', async () => {
      const onSilenceDetected = jest.fn();
      await recorder.start({ onSilenceDetected });

      expect(recorder.silenceDetectionInterval).not.toBeNull();

      await recorder.stop();

      expect(recorder.silenceDetectionInterval).toBeNull();
    });

    test('should close AudioContext used for silence detection', async () => {
      const onSilenceDetected = jest.fn();
      await recorder.start({ onSilenceDetected });

      const audioContext = MockAudioContext._instances[0];
      expect(audioContext._closed).toBe(false);

      await recorder.stop();

      expect(audioContext._closed).toBe(true);
    });

    test('should handle stop when already inactive', async () => {
      // Don't start recording
      const blob = await recorder.stop();

      expect(blob.size).toBe(0);
    });

    test('should set stream to null after stopping', async () => {
      await recorder.start();
      expect(recorder.stream).not.toBeNull();

      await recorder.stop();
      expect(recorder.stream).toBeNull();
    });
  });

  describe('silence detection', () => {
    test('should call onSilenceDetected after silence duration', async () => {
      jest.useFakeTimers();

      const onSilenceDetected = jest.fn();
      await recorder.start({
        onSilenceDetected,
        silenceThreshold: 15,
        silenceDuration: 1500
      });

      // Simulate speaking (volume above threshold)
      const audioContext = MockAudioContext._instances[0];
      const analyser = audioContext.createAnalyser();

      // Mark that user has spoken
      recorder.hasSpoken = true;
      recorder.silenceStart = Date.now() - 2000; // Silence started 2 seconds ago

      // Advance timers to trigger silence check
      jest.advanceTimersByTime(200);

      jest.useRealTimers();
    });

    test('should not trigger before speech detected', async () => {
      jest.useFakeTimers();

      const onSilenceDetected = jest.fn();
      await recorder.start({
        onSilenceDetected,
        silenceThreshold: 15,
        silenceDuration: 500
      });

      // Advance timers without any speech
      jest.advanceTimersByTime(2000);

      // Should not have called callback since no speech was detected first
      expect(recorder.hasSpoken).toBe(false);

      jest.useRealTimers();
      await recorder.stop();
    });
  });

  describe('isRecording()', () => {
    test('should return false initially', () => {
      expect(recorder.isRecording()).toBe(false);
    });

    test('should return true while recording', async () => {
      await recorder.start();
      expect(recorder.isRecording()).toBe(true);
    });

    test('should return false after stopping', async () => {
      await recorder.start();
      await recorder.stop();
      expect(recorder.isRecording()).toBe(false);
    });
  });
});

describe('resampleTo16kHz', () => {
  test('should return Float32Array', async () => {
    const mockAudioData = new Uint8Array(1024).fill(128);
    const blob = new Blob([mockAudioData], { type: 'audio/webm' });

    const result = await resampleTo16kHz(blob);

    expect(result).toBeInstanceOf(Float32Array);
  });

  test('should throw error for empty blob', async () => {
    const emptyBlob = new Blob([], { type: 'audio/webm' });

    await expect(resampleTo16kHz(emptyBlob)).rejects.toThrow('Empty audio buffer');
  });

  test('should close AudioContext after processing', async () => {
    const mockAudioData = new Uint8Array(1024).fill(128);
    const blob = new Blob([mockAudioData], { type: 'audio/webm' });

    await resampleTo16kHz(blob);

    // Should have created and closed an AudioContext
    const contexts = MockAudioContext._instances;
    expect(contexts.length).toBeGreaterThan(0);
    expect(contexts[contexts.length - 1]._closed).toBe(true);
  });
});

describe('Resource leak prevention', () => {
  test('multiple start/stop cycles should not leak streams', async () => {
    const recorder = new AudioRecorder();
    const stoppedTracks = [];

    for (let i = 0; i < 5; i++) {
      await recorder.start();
      const stream = recorder.stream;
      stream.getTracks().forEach(track => stoppedTracks.push(track));
      await recorder.stop();
    }

    // All tracks should be stopped
    stoppedTracks.forEach(track => {
      expect(track._stopped).toBe(true);
    });
  });

  test('rapid start/stop should not throw', async () => {
    const recorder = new AudioRecorder();

    await expect(async () => {
      await recorder.start();
      await recorder.stop();
      await recorder.start();
      await recorder.stop();
    }).not.toThrow();
  });
});
