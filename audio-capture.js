// Audio capture and resampling module for Whisper ASR
// Handles microphone recording and conversion to 16kHz Float32Array

/**
 * AudioRecorder class for capturing microphone audio
 * Supports automatic end-of-speech detection via silence detection
 */
export class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.audioContext = null;
        this.analyser = null;
        this.silenceDetectionInterval = null;
        this.onSilenceDetected = null;
        this.silenceStart = null;
        this.hasSpoken = false;
    }

    /**
     * Start recording from the microphone
     * @param {Object} options - Recording options
     * @param {function} options.onSilenceDetected - Callback when silence is detected after speech
     * @param {number} options.silenceThreshold - Volume threshold for silence (0-255, default 15)
     * @param {number} options.silenceDuration - Ms of silence before triggering callback (default 1500)
     * @returns {Promise<void>}
     */
    async start(options = {}) {
        this.audioChunks = [];
        this.onSilenceDetected = options.onSilenceDetected || null;
        this.silenceStart = null;
        this.hasSpoken = false;

        const silenceThreshold = options.silenceThreshold || 15;
        const silenceDuration = options.silenceDuration || 1500;

        // Check if mediaDevices is available (requires HTTPS on iOS for non-localhost)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error(
                'Microphone access requires HTTPS on iOS. ' +
                'Use Web Speech API mode instead (remove ?asr=whisper from URL).'
            );
        }

        // Request microphone access
        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 16000, // Request 16kHz (browser may ignore)
                echoCancellation: true,
                noiseSuppression: true,
            }
        });

        // Set up silence detection using Web Audio API
        if (this.onSilenceDetected) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(this.stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);

            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            this.silenceDetectionInterval = setInterval(() => {
                this.analyser.getByteFrequencyData(dataArray);

                // Calculate average volume
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;

                if (average > silenceThreshold) {
                    // User is speaking
                    this.hasSpoken = true;
                    this.silenceStart = null;
                } else if (this.hasSpoken) {
                    // Silence detected after speech
                    if (!this.silenceStart) {
                        this.silenceStart = Date.now();
                    } else if (Date.now() - this.silenceStart > silenceDuration) {
                        // Silence duration exceeded, trigger callback
                        console.log('Silence detected, auto-stopping');
                        if (this.onSilenceDetected) {
                            this.onSilenceDetected();
                        }
                    }
                }
            }, 100);
        }

        // Find a supported mime type
        const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            ''  // Default (let browser choose)
        ];

        let mimeType = '';
        for (const type of mimeTypes) {
            if (type === '' || MediaRecorder.isTypeSupported(type)) {
                mimeType = type;
                break;
            }
        }

        console.log('Using MediaRecorder mimeType:', mimeType || '(default)');

        const mediaOptions = mimeType ? { mimeType } : {};
        this.mediaRecorder = new MediaRecorder(this.stream, mediaOptions);

        this.mediaRecorder.ondataavailable = (event) => {
            console.log('Audio chunk received, size:', event.data.size);
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        // Request data every 250ms to ensure we get chunks even for short recordings
        this.mediaRecorder.start(250);
        console.log('MediaRecorder started with silence detection:', !!this.onSilenceDetected);
    }

    /**
     * Stop recording and return the audio blob
     * @returns {Promise<Blob>}
     */
    async stop() {
        // Clean up silence detection
        if (this.silenceDetectionInterval) {
            clearInterval(this.silenceDetectionInterval);
            this.silenceDetectionInterval = null;
        }
        if (this.audioContext) {
            try {
                await this.audioContext.close();
            } catch (e) {
                // Ignore errors closing context
            }
            this.audioContext = null;
        }
        this.onSilenceDetected = null;

        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                // Stop all tracks to release microphone
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }
                resolve(new Blob([], { type: 'audio/webm' }));
                return;
            }

            this.mediaRecorder.onstop = () => {
                console.log('MediaRecorder stopped, chunks:', this.audioChunks.length);

                // Stop all tracks to release microphone
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }

                const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
                const blob = new Blob(this.audioChunks, { type: mimeType });
                console.log('Created blob, size:', blob.size, 'type:', blob.type);
                resolve(blob);
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                reject(event.error);
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * Force stop recording and release all resources immediately
     * Use this for cleanup on page navigation/visibility change
     */
    forceStop() {
        // Clear silence detection
        if (this.silenceDetectionInterval) {
            clearInterval(this.silenceDetectionInterval);
            this.silenceDetectionInterval = null;
        }
        this.onSilenceDetected = null;

        // Close AudioContext
        if (this.audioContext) {
            try {
                this.audioContext.close();
            } catch (e) {
                // Ignore errors
            }
            this.audioContext = null;
        }

        // Stop MediaRecorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            try {
                this.mediaRecorder.stop();
            } catch (e) {
                // Ignore errors
            }
        }
        this.mediaRecorder = null;

        // Stop all tracks to release microphone
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    // Ignore errors
                }
            });
            this.stream = null;
        }

        this.audioChunks = [];
    }

    /**
     * Check if currently recording
     * @returns {boolean}
     */
    isRecording() {
        return !!(this.mediaRecorder && this.mediaRecorder.state === 'recording');
    }
}

/**
 * Resample audio to 16kHz mono Float32Array for Whisper
 * @param {Blob} audioBlob - Audio blob from MediaRecorder
 * @returns {Promise<Float32Array>} - Resampled audio data
 */
export async function resampleTo16kHz(audioBlob) {
    console.log('resampleTo16kHz called, blob size:', audioBlob.size, 'type:', audioBlob.type);

    // Create audio context for decoding
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    try {
        // Decode the audio blob
        const arrayBuffer = await audioBlob.arrayBuffer();
        console.log('ArrayBuffer size:', arrayBuffer.byteLength);

        if (arrayBuffer.byteLength === 0) {
            throw new Error('Empty audio buffer');
        }

        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log('Decoded audio - duration:', audioBuffer.duration, 'sampleRate:', audioBuffer.sampleRate);

        // Target sample rate for Whisper
        const targetSampleRate = 16000;

        // If already at 16kHz, just extract the data
        if (audioBuffer.sampleRate === targetSampleRate) {
            const channelData = audioBuffer.getChannelData(0);
            console.log('Already at 16kHz, returning', channelData.length, 'samples');
            return channelData;
        }

        // Use OfflineAudioContext to resample
        const numSamples = Math.ceil(audioBuffer.duration * targetSampleRate);
        console.log('Resampling to', numSamples, 'samples at 16kHz');

        const offlineContext = new OfflineAudioContext(
            1, // mono
            numSamples,
            targetSampleRate
        );

        // Create a buffer source and connect to offline context
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start(0);

        // Render the resampled audio
        const resampledBuffer = await offlineContext.startRendering();
        const result = resampledBuffer.getChannelData(0);
        console.log('Resampled to', result.length, 'samples');

        return result;
    } catch (error) {
        console.error('Resample error:', error);
        throw error;
    } finally {
        await audioContext.close();
    }
}
