// Test setup with browser API mocks
import { jest, beforeEach } from '@jest/globals';

// Mock MediaStream
class MockMediaStreamTrack {
  constructor() {
    this.enabled = true;
    this.readyState = 'live';
    this.kind = 'audio';
    this._stopped = false;
  }
  stop() {
    this._stopped = true;
    this.readyState = 'ended';
  }
  clone() {
    return new MockMediaStreamTrack();
  }
}

class MockMediaStream {
  constructor() {
    this._tracks = [new MockMediaStreamTrack()];
  }
  getTracks() {
    return this._tracks;
  }
  getAudioTracks() {
    return this._tracks;
  }
  addTrack(track) {
    this._tracks.push(track);
  }
}

// Mock MediaRecorder
class MockMediaRecorder {
  static _instances = [];
  static isTypeSupported(type) {
    return ['audio/webm', 'audio/webm;codecs=opus', ''].includes(type);
  }

  constructor(stream, options = {}) {
    this.stream = stream;
    this.mimeType = options.mimeType || 'audio/webm';
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
    this.onerror = null;
    this._chunks = [];
    MockMediaRecorder._instances.push(this);
  }

  start(timeslice) {
    this.state = 'recording';
    this._timeslice = timeslice;

    // Simulate data chunks being generated
    if (timeslice && this.ondataavailable) {
      this._chunkInterval = setInterval(() => {
        if (this.state === 'recording' && this.ondataavailable) {
          // Generate mock audio data
          const mockData = new Uint8Array(1024).fill(128);
          const blob = new Blob([mockData], { type: this.mimeType });
          this._chunks.push(blob);
          this.ondataavailable({ data: blob });
        }
      }, timeslice);
    }
  }

  stop() {
    if (this._chunkInterval) {
      clearInterval(this._chunkInterval);
      this._chunkInterval = null;
    }
    this.state = 'inactive';

    // Call onstop asynchronously
    setTimeout(() => {
      if (this.onstop) {
        this.onstop();
      }
    }, 0);
  }

  // Helper for tests to simulate errors
  _simulateError(error) {
    if (this.onerror) {
      this.onerror({ error });
    }
  }
}

// Mock AudioContext
class MockAnalyserNode {
  constructor() {
    this.fftSize = 2048;
    this.frequencyBinCount = 1024;
    this._volumeLevel = 0;
  }

  connect() {}
  disconnect() {}

  getByteFrequencyData(array) {
    // Fill with mock volume level
    for (let i = 0; i < array.length; i++) {
      array[i] = this._volumeLevel;
    }
  }

  // Helper for tests to set volume level
  _setVolumeLevel(level) {
    this._volumeLevel = level;
  }
}

class MockMediaStreamSource {
  connect() {}
  disconnect() {}
}

class MockAudioBuffer {
  constructor(options = {}) {
    this.numberOfChannels = options.numberOfChannels || 1;
    this.length = options.length || 16000;
    this.sampleRate = options.sampleRate || 16000;
    this.duration = this.length / this.sampleRate;
    this._channelData = new Float32Array(this.length);

    // Generate some mock audio data (sine wave)
    for (let i = 0; i < this.length; i++) {
      this._channelData[i] = Math.sin(i / 10) * 0.5;
    }
  }

  getChannelData(channel) {
    return this._channelData;
  }
}

class MockAudioBufferSourceNode {
  constructor() {
    this.buffer = null;
  }
  connect() {}
  start() {}
}

class MockAudioContext {
  static _instances = [];

  constructor() {
    this.state = 'running';
    this.sampleRate = 44100;
    this._closed = false;
    MockAudioContext._instances.push(this);
  }

  createAnalyser() {
    return new MockAnalyserNode();
  }

  createMediaStreamSource() {
    return new MockMediaStreamSource();
  }

  createBufferSource() {
    return new MockAudioBufferSourceNode();
  }

  async decodeAudioData(arrayBuffer) {
    // Return a mock audio buffer
    return new MockAudioBuffer({ length: arrayBuffer.byteLength / 2 });
  }

  async close() {
    this._closed = true;
    this.state = 'closed';
  }
}

class MockOfflineAudioContext {
  constructor(channels, length, sampleRate) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
  }

  createBufferSource() {
    return new MockAudioBufferSourceNode();
  }

  get destination() {
    return {};
  }

  async startRendering() {
    return new MockAudioBuffer({
      numberOfChannels: this.numberOfChannels,
      length: this.length,
      sampleRate: this.sampleRate
    });
  }
}

// Mock SpeechRecognition
class MockSpeechRecognition {
  static _instances = [];

  constructor() {
    this.lang = '';
    this.continuous = false;
    this.interimResults = false;
    this.maxAlternatives = 1;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this._isListening = false;
    MockSpeechRecognition._instances.push(this);
  }

  start() {
    if (this._isListening) {
      throw new Error('Already listening');
    }
    this._isListening = true;
  }

  stop() {
    this._isListening = false;
    setTimeout(() => {
      if (this.onend) this.onend();
    }, 0);
  }

  abort() {
    this._isListening = false;
  }

  // Test helpers
  _simulateResult(transcript) {
    if (this.onresult) {
      this.onresult({
        results: [[{ transcript, confidence: 0.9 }]]
      });
    }
  }

  _simulateError(error) {
    if (this.onerror) {
      this.onerror({ error });
    }
  }
}

// Mock navigator.mediaDevices
const mockMediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue(new MockMediaStream())
};

// Set up global mocks
global.MediaRecorder = MockMediaRecorder;
global.MediaStream = MockMediaStream;
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;
global.OfflineAudioContext = MockOfflineAudioContext;
global.SpeechRecognition = MockSpeechRecognition;
global.webkitSpeechRecognition = MockSpeechRecognition;

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true
});

// Mock Blob.arrayBuffer for jsdom (not available by default)
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = async function() {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

// Export mocks for test access
export {
  MockMediaRecorder,
  MockMediaStream,
  MockMediaStreamTrack,
  MockAudioContext,
  MockOfflineAudioContext,
  MockAnalyserNode,
  MockAudioBuffer,
  MockSpeechRecognition,
  mockMediaDevices
};

// Reset mocks between tests
beforeEach(() => {
  MockMediaRecorder._instances = [];
  MockAudioContext._instances = [];
  MockSpeechRecognition._instances = [];
  mockMediaDevices.getUserMedia.mockClear();
  mockMediaDevices.getUserMedia.mockResolvedValue(new MockMediaStream());
});
