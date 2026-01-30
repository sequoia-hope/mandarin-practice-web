// Whisper ASR module using Transformers.js
// Provides speech recognition via Whisper WASM as an alternative to Web Speech API

let pipeline = null;
let transcriber = null;
let modelLoaded = false;
let loadingPromise = null;

/**
 * Check if the Whisper model is loaded and ready
 */
export function isWhisperReady() {
    return modelLoaded;
}

/**
 * Initialize the Whisper model
 * @param {function} onProgress - Callback for download progress updates
 * @returns {Promise<void>}
 */
export async function initWhisperModel(onProgress = null) {
    // Return existing promise if already loading
    if (loadingPromise) {
        return loadingPromise;
    }

    // Already loaded
    if (modelLoaded) {
        return;
    }

    loadingPromise = (async () => {
        try {
            // Dynamically import Transformers.js from CDN
            const { pipeline: pipelineFn } = await import(
                'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2'
            );
            pipeline = pipelineFn;

            // Create the automatic speech recognition pipeline
            // Using whisper-tiny with int8 quantization for smaller size (~41MB)
            transcriber = await pipeline(
                'automatic-speech-recognition',
                'onnx-community/whisper-tiny',
                {
                    dtype: {
                        encoder_model: 'q8',
                        decoder_model_merged: 'q8',
                    },
                    device: 'wasm',
                    progress_callback: onProgress ? (progress) => {
                        if (progress.status === 'progress' && progress.total) {
                            const percent = Math.round((progress.loaded / progress.total) * 100);
                            onProgress({
                                status: 'downloading',
                                file: progress.file || 'model',
                                percent
                            });
                        } else if (progress.status === 'done') {
                            onProgress({
                                status: 'done',
                                file: progress.file || 'model'
                            });
                        }
                    } : undefined
                }
            );

            modelLoaded = true;
            console.log('Whisper model loaded successfully');
        } catch (error) {
            loadingPromise = null;
            throw error;
        }
    })();

    return loadingPromise;
}

/**
 * Transcribe audio using Whisper
 * @param {Float32Array} audioFloat32 - Audio data as Float32Array at 16kHz sample rate
 * @param {string} expectedPhrase - Optional expected phrase to guide transcription
 * @returns {Promise<{text: string}>} - Transcription result
 */
export async function transcribeAudio(audioFloat32, expectedPhrase = null) {
    if (!modelLoaded || !transcriber) {
        throw new Error('Whisper model not loaded. Call initWhisperModel() first.');
    }

    try {
        const options = {
            language: 'chinese',
            task: 'transcribe',
            chunk_length_s: 30,
            stride_length_s: 5,
        };

        // Add prompt to guide transcription if expected phrase is provided
        if (expectedPhrase) {
            options.prompt = expectedPhrase;
        }

        const result = await transcriber(audioFloat32, options);

        return {
            text: result.text ? result.text.trim() : ''
        };
    } catch (error) {
        console.error('Transcription error:', error);
        throw error;
    }
}
