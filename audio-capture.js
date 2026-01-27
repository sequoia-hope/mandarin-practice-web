// Audio capture and resampling module for Whisper ASR
// Handles microphone recording and conversion to 16kHz Float32Array

/**
 * AudioRecorder class for capturing microphone audio
 */
export class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
    }

    /**
     * Start recording from the microphone
     * @returns {Promise<void>}
     */
    async start() {
        this.audioChunks = [];

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

        // Use audio/webm if available, fall back to audio/ogg
        const mimeType = MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : 'audio/ogg';

        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.start();
    }

    /**
     * Stop recording and return the audio blob
     * @returns {Promise<Blob>}
     */
    async stop() {
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                // Stop all tracks to release microphone
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }

                const blob = new Blob(this.audioChunks, {
                    type: this.mediaRecorder.mimeType
                });
                resolve(blob);
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * Check if currently recording
     * @returns {boolean}
     */
    isRecording() {
        return this.mediaRecorder && this.mediaRecorder.state === 'recording';
    }
}

/**
 * Resample audio to 16kHz mono Float32Array for Whisper
 * @param {Blob} audioBlob - Audio blob from MediaRecorder
 * @returns {Promise<Float32Array>} - Resampled audio data
 */
export async function resampleTo16kHz(audioBlob) {
    // Create audio context for decoding
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    try {
        // Decode the audio blob
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Target sample rate for Whisper
        const targetSampleRate = 16000;

        // If already at 16kHz, just extract the data
        if (audioBuffer.sampleRate === targetSampleRate) {
            return audioBuffer.getChannelData(0);
        }

        // Use OfflineAudioContext to resample
        const numSamples = Math.ceil(audioBuffer.duration * targetSampleRate);
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

        return resampledBuffer.getChannelData(0);
    } finally {
        await audioContext.close();
    }
}
