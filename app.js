// Main application logic for Mandarin ASR Practice App

import { initWhisperModel, transcribeAudio, isWhisperReady } from './whisper-asr.js';
import { AudioRecorder, resampleTo16kHz } from './audio-capture.js';

// ============================================
// State
// ============================================

let currentLesson = null;
let currentPhraseIndex = 0;
let completedPhrases = new Set();
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let whisperWorker = null;
let isModelLoaded = false;

// ASR mode state
let asrMode = 'webspeech'; // 'webspeech' or 'whisper'
let audioRecorder = null;  // AudioRecorder instance for Whisper mode

/**
 * Get ASR mode from URL parameter
 * @returns {'webspeech' | 'whisper'}
 */
function getASRMode() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('asr');
    if (mode === 'whisper') {
        return 'whisper';
    }
    return 'webspeech';
}

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    renderLessonList();
    initWhisper();
    updateASRSwitcher();
});

function updateASRSwitcher() {
    const mode = getASRMode();
    const linkWebSpeech = document.getElementById('linkWebSpeech');
    const linkWhisper = document.getElementById('linkWhisper');

    if (mode === 'whisper') {
        linkWhisper.classList.add('active');
        linkWebSpeech.classList.remove('active');
    } else {
        linkWebSpeech.classList.add('active');
        linkWhisper.classList.remove('active');
    }
}

function renderLessonList() {
    const container = document.getElementById('lessonList');
    container.innerHTML = CURRICULUM.map((lesson, index) => `
        <div class="lesson-card" onclick="startLesson(${index})">
            <div class="lesson-number">${index + 1}</div>
            <div class="lesson-info">
                <div class="lesson-title">${lesson.icon} ${lesson.title}</div>
                <div class="lesson-chinese">${lesson.titleChinese}</div>
            </div>
            <div class="lesson-count">
                <span>${lesson.phrases.length}</span>
                phrases
            </div>
        </div>
    `).join('');
}

// ============================================
// Whisper WASM Integration
// ============================================

async function initWhisper() {
    const statusEl = document.getElementById('modelStatus');

    // Determine ASR mode from URL parameter
    asrMode = getASRMode();
    console.log('ASR mode:', asrMode);

    try {
        if (asrMode === 'whisper') {
            // Use Whisper WASM
            statusEl.className = 'model-status loading';
            statusEl.textContent = '⏳ Downloading Whisper model (~41MB)...';

            await initWhisperModel((progress) => {
                if (progress.status === 'downloading') {
                    statusEl.textContent = `⏳ Downloading ${progress.file}: ${progress.percent}%`;
                } else if (progress.status === 'done') {
                    statusEl.textContent = `✓ Downloaded ${progress.file}`;
                }
            });

            statusEl.className = 'model-status ready';
            statusEl.textContent = '✓ Whisper ready (local model)';
            isModelLoaded = true;
            audioRecorder = new AudioRecorder();
            updateRecordButton();

        } else {
            // Use Web Speech API (default)
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            console.log('SpeechRecognition available:', !!SpeechRecognition);
            console.log('window.SpeechRecognition:', typeof window.SpeechRecognition);
            console.log('window.webkitSpeechRecognition:', typeof window.webkitSpeechRecognition);

            if (SpeechRecognition) {
                statusEl.className = 'model-status ready';
                statusEl.textContent = '✓ Speech recognition ready (Web Speech API)';
                isModelLoaded = true;
                updateRecordButton();
            } else {
                // Check if it's an iOS secure context issue
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';

                let message = '⚠ Speech recognition not supported.';
                if (isIOS && !isSecure) {
                    message = '⚠ iOS requires HTTPS for speech recognition. Access via localhost or use HTTPS.';
                } else {
                    message = '⚠ Speech recognition not supported in this browser.';
                }

                statusEl.className = 'model-status error';
                statusEl.textContent = message;
            }
        }
    } catch (error) {
        console.error('Speech init error:', error);
        statusEl.className = 'model-status error';
        statusEl.textContent = `Error: ${error.message}`;
    }
}

// ============================================
// Speech Recognition (Web Speech API)
// ============================================

let recognition = null;
let webSpeechGotResult = false;

function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.error('Speech recognition not supported');
        return null;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';  // Mandarin Chinese
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
        webSpeechGotResult = true;
        const transcript = event.results[0][0].transcript;
        console.log('Recognized:', transcript);
        handleTranscription(transcript);
    };

    recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        webSpeechGotResult = true; // Prevent double-handling in onend
        stopWebSpeechRecording();

        if (event.error === 'no-speech') {
            handleTranscription('');
        } else if (event.error !== 'aborted') {
            alert(`Recognition error: ${event.error}`);
        }
    };

    recognition.onend = () => {
        console.log('Recognition ended, gotResult:', webSpeechGotResult);
        const wasRecording = isRecording;
        stopWebSpeechRecording();

        // If we were recording but never got a result, show empty result
        if (wasRecording && !webSpeechGotResult) {
            handleTranscription('');
        }
    };

    return recognition;
}

// ============================================
// Recording Control
// ============================================

async function toggleRecording() {
    if (!isModelLoaded) return;

    try {
        if (isRecording) {
            await stopRecording();
        } else {
            await startRecording();
        }
    } catch (error) {
        console.error('Toggle recording error:', error);
    }
}

async function startRecording() {
    // Hide previous result
    document.getElementById('resultCard').classList.remove('visible');

    if (asrMode === 'whisper') {
        await startWhisperRecording();
    } else {
        await startWebSpeechRecording();
    }
}

async function startWebSpeechRecording() {
    // Setup recognition if not already done
    if (!recognition) {
        setupSpeechRecognition();
    }

    if (!recognition) {
        alert('Speech recognition not available');
        return;
    }

    try {
        webSpeechGotResult = false; // Reset flag
        recognition.start();
        isRecording = true;
        updateRecordButton();
    } catch (error) {
        console.error('Start recording error:', error);
        alert(`Error: ${error.message}`);
    }
}

async function startWhisperRecording() {
    try {
        await audioRecorder.start();
        isRecording = true;
        updateRecordButton();
    } catch (error) {
        console.error('Start Whisper recording error:', error);
        alert(`Microphone error: ${error.message}`);
    }
}

async function stopRecording() {
    if (asrMode === 'whisper') {
        await stopWhisperRecording();
    } else {
        stopWebSpeechRecording();
    }
}

function stopWebSpeechRecording() {
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {
            // Ignore errors when stopping
        }
    }

    isRecording = false;
    updateRecordButton();
}

async function stopWhisperRecording() {
    if (!audioRecorder || !audioRecorder.isRecording()) {
        isRecording = false;
        updateRecordButton();
        return;
    }

    isRecording = false;
    updateRecordButton();
    showLoading('Transcribing...');

    try {
        // Stop recording and get audio blob
        const audioBlob = await audioRecorder.stop();

        // Resample to 16kHz for Whisper
        const audioFloat32 = await resampleTo16kHz(audioBlob);

        // Run transcription
        const result = await transcribeAudio(audioFloat32);

        hideLoading();
        handleTranscription(result.text);
    } catch (error) {
        console.error('Whisper transcription error:', error);
        hideLoading();
        handleTranscription('');
    }
}

function updateRecordButton() {
    const button = document.getElementById('recordButton');
    const hint = document.getElementById('recordHint');
    
    if (!isModelLoaded) {
        button.disabled = true;
        button.innerHTML = '⏳';
        hint.textContent = 'Loading model...';
        return;
    }
    
    button.disabled = false;
    
    if (isRecording) {
        button.classList.add('recording');
        button.innerHTML = '⏹';
        hint.textContent = 'Tap to stop';
    } else {
        button.classList.remove('recording');
        button.innerHTML = '🎤';
        hint.textContent = 'Tap to speak';
    }
}

// ============================================
// Transcription Handling
// ============================================

function handleTranscription(transcript) {
    const phrase = currentLesson.phrases[currentPhraseIndex];
    const result = scoreTranscription(transcript, phrase.characters);
    
    // Update UI with result
    const resultCard = document.getElementById('resultCard');
    const resultStatus = document.getElementById('resultStatus');
    const resultIcon = document.getElementById('resultIcon');
    const resultFeedback = document.getElementById('resultFeedback');
    const resultScore = document.getElementById('resultScore');
    const resultTranscription = document.getElementById('resultTranscription');
    const resultExpected = document.getElementById('resultExpected');
    const resultMissing = document.getElementById('resultMissing');
    
    // Set pass/fail styling
    if (result.passed) {
        resultStatus.className = 'result-status pass';
        resultIcon.textContent = '✓';
        resultScore.className = 'result-score pass';
        completedPhrases.add(currentPhraseIndex);
        updateProgress();
    } else {
        resultStatus.className = 'result-status fail';
        resultIcon.textContent = '✗';
        resultScore.className = 'result-score fail';
    }
    
    resultFeedback.textContent = result.feedback;
    resultScore.textContent = `${result.score}%`;
    resultTranscription.textContent = transcript || '(nothing detected)';
    resultExpected.textContent = phrase.characters;
    
    if (result.missedCharacters.length > 0) {
        resultMissing.textContent = `Missing: ${result.missedCharacters.join(' ')}`;
    } else {
        resultMissing.textContent = '';
    }
    
    resultCard.classList.add('visible');
}

// ============================================
// Text-to-Speech
// ============================================

function speakPhrase() {
    const phrase = currentLesson.phrases[currentPhraseIndex];
    
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(phrase.characters);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8;  // Slightly slower for learners
        
        // Try to find a Chinese voice
        const voices = speechSynthesis.getVoices();
        const chineseVoice = voices.find(v => v.lang.startsWith('zh'));
        if (chineseVoice) {
            utterance.voice = chineseVoice;
        }
        
        const button = document.getElementById('listenButton');
        button.disabled = true;
        button.innerHTML = '🔊 Playing...';
        
        utterance.onend = () => {
            button.disabled = false;
            button.innerHTML = '🔊 Listen';
        };
        
        utterance.onerror = () => {
            button.disabled = false;
            button.innerHTML = '🔊 Listen';
        };
        
        speechSynthesis.speak(utterance);
    } else {
        alert('Text-to-speech not supported in this browser');
    }
}

// Preload voices (needed for some browsers)
if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

// ============================================
// Navigation
// ============================================

function startLesson(index) {
    currentLesson = CURRICULUM[index];
    currentPhraseIndex = 0;
    completedPhrases = new Set();
    
    document.getElementById('menuView').classList.add('hidden');
    document.getElementById('lessonView').classList.add('active');
    
    updateLessonUI();
}

function showMenu() {
    document.getElementById('menuView').classList.remove('hidden');
    document.getElementById('lessonView').classList.remove('active');
    document.getElementById('resultCard').classList.remove('visible');
    
    // Stop any ongoing recording
    if (isRecording) {
        stopRecording();
    }
}

function nextPhrase() {
    if (currentPhraseIndex < currentLesson.phrases.length - 1) {
        currentPhraseIndex++;
        updateLessonUI();
    }
}

function prevPhrase() {
    if (currentPhraseIndex > 0) {
        currentPhraseIndex--;
        updateLessonUI();
    }
}

function updateLessonUI() {
    const phrase = currentLesson.phrases[currentPhraseIndex];
    
    // Update lesson title
    document.getElementById('lessonTitle').textContent = 
        `${currentLesson.icon} ${currentLesson.titleChinese}`;
    
    // Update phrase card
    document.getElementById('phraseCharacters').textContent = phrase.characters;
    document.getElementById('phrasePinyin').textContent = phrase.pinyin;
    document.getElementById('phraseEnglish').textContent = phrase.english;
    
    // Hide result card
    document.getElementById('resultCard').classList.remove('visible');
    
    // Update navigation buttons
    document.getElementById('prevButton').disabled = currentPhraseIndex === 0;
    document.getElementById('nextButton').disabled = 
        currentPhraseIndex === currentLesson.phrases.length - 1;
    
    // Update progress
    updateProgress();
}

function updateProgress() {
    const total = currentLesson.phrases.length;
    const completed = completedPhrases.size;
    const percent = (completed / total) * 100;
    
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressCompleted').textContent = 
        `${completed}/${total} completed`;
    document.getElementById('progressCurrent').textContent = 
        `Phrase ${currentPhraseIndex + 1} of ${total}`;
}

// ============================================
// Loading Overlay
// ============================================

function showLoading(text = 'Processing...') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').classList.add('visible');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('visible');
}

// ============================================
// Global Exports (for onclick handlers in HTML)
// ============================================

window.startLesson = startLesson;
window.showMenu = showMenu;
window.speakPhrase = speakPhrase;
window.toggleRecording = toggleRecording;
window.prevPhrase = prevPhrase;
window.nextPhrase = nextPhrase;
