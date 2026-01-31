// Main application logic for Mandarin ASR Practice App

import { initWhisperModel, transcribeAudio, isWhisperReady } from './whisper-asr.js';
import { AudioRecorder, resampleTo16kHz } from './audio-capture.js';
import {
    loadProgress,
    getLessonProgress,
    recordSpeakingAttempt,
    recordMatchingCompletion,
    getStats
} from './storage.js';

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
    const progress = loadProgress();

    container.innerHTML = CURRICULUM.map((lesson, index) => {
        const lessonType = lesson.type || 'speaking';
        const lessonProgress = getLessonProgress(progress, lesson.id);

        // Calculate progress display
        let progressDisplay = '';
        let progressClass = '';

        if (lessonType === 'matching') {
            if (lessonProgress.matchCompleted) {
                progressDisplay = '✓';
                progressClass = 'completed';
            } else {
                progressDisplay = `${lesson.phrases.length} match 🔗`;
            }
        } else if (lessonType === 'cloze') {
            const completed = lessonProgress.completedPhrases.length;
            const total = lesson.sentences ? lesson.sentences.length : 0;
            if (completed === total && total > 0) {
                progressDisplay = '✓';
                progressClass = 'completed';
            } else if (completed > 0) {
                progressDisplay = `${completed}/${total} 📝`;
                progressClass = 'in-progress';
            } else {
                progressDisplay = `${total} fill 📝`;
            }
        } else {
            const completed = lessonProgress.completedPhrases.length;
            const total = lesson.phrases.length;
            if (completed === total && total > 0) {
                progressDisplay = '✓';
                progressClass = 'completed';
            } else if (completed > 0) {
                progressDisplay = `${completed}/${total} 🎤`;
                progressClass = 'in-progress';
            } else {
                progressDisplay = `${total} speak 🎤`;
            }
        }

        return `
        <div class="lesson-card" onclick="startLesson(${index})">
            <div class="lesson-number ${progressClass}">${progressClass === 'completed' ? '✓' : index + 1}</div>
            <div class="lesson-info">
                <div class="lesson-title">${lesson.icon} ${lesson.title}</div>
                <div class="lesson-chinese">${lesson.titleChinese}</div>
                <div class="lesson-pinyin">${lesson.titlePinyin || ''}</div>
            </div>
            <div class="lesson-count ${progressClass}">
                ${progressDisplay}
            </div>
        </div>
    `;
    }).join('');

    // Render stats section
    renderStats();
}

function renderStats() {
    const stats = getStats();
    const statsContainer = document.getElementById('statsContainer');

    if (!statsContainer) return;

    if (stats.totalAttempts === 0) {
        statsContainer.innerHTML = `
            <div class="stats-empty">
                Start practicing to track your progress!
            </div>
        `;
        return;
    }

    const streakEmoji = stats.streakDays >= 7 ? '🔥' : stats.streakDays >= 3 ? '⭐' : '📅';

    statsContainer.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-value">${stats.streakDays}</span>
                <span class="stat-label">${streakEmoji} Day Streak</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.totalCompleted}</span>
                <span class="stat-label">Phrases Mastered</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.totalAttempts}</span>
                <span class="stat-label">Total Attempts</span>
            </div>
        </div>
    `;
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
        await audioRecorder.start({
            // Auto-stop when silence is detected after speech
            onSilenceDetected: () => {
                if (isRecording) {
                    console.log('Auto-stopping due to silence');
                    stopRecording();
                }
            },
            silenceThreshold: 15,  // Volume threshold (0-255)
            silenceDuration: 1500  // 1.5 seconds of silence
        });
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
    console.log('stopWhisperRecording called');

    if (!audioRecorder) {
        console.log('No audioRecorder');
        isRecording = false;
        updateRecordButton();
        return;
    }

    if (!audioRecorder.isRecording()) {
        console.log('audioRecorder not recording');
        isRecording = false;
        updateRecordButton();
        return;
    }

    isRecording = false;
    updateRecordButton();
    showLoading('Transcribing...');

    try {
        // Stop recording and get audio blob
        console.log('Stopping audio recorder...');
        const audioBlob = await audioRecorder.stop();
        console.log('Audio blob size:', audioBlob.size);

        if (audioBlob.size === 0) {
            console.log('Empty audio blob');
            hideLoading();
            handleTranscription('');
            return;
        }

        // Resample to 16kHz for Whisper
        console.log('Resampling audio...');
        const audioFloat32 = await resampleTo16kHz(audioBlob);
        console.log('Audio resampled, length:', audioFloat32.length);

        // Run transcription with expected phrase as prompt
        const expectedPhrase = currentLesson?.phrases[currentPhraseIndex]?.characters;
        console.log('Running transcription with expected phrase:', expectedPhrase);
        const result = await transcribeAudio(audioFloat32, expectedPhrase);
        console.log('Transcription result:', result);

        hideLoading();

        // Defensive check before handling transcription
        if (!currentLesson) {
            console.error('No current lesson!');
            return;
        }

        handleTranscription(result.text);
        console.log('handleTranscription completed');
    } catch (error) {
        console.error('Whisper transcription error:', error);
        hideLoading();

        // Only call handleTranscription if we have a current lesson
        if (currentLesson) {
            handleTranscription('');
        }
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
    console.log('handleTranscription called with:', transcript);

    try {
        if (!currentLesson || !currentLesson.phrases || !currentLesson.phrases[currentPhraseIndex]) {
            console.error('Invalid lesson state:', { currentLesson, currentPhraseIndex });
            return;
        }

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

        // Save progress to localStorage
        recordSpeakingAttempt(currentLesson.id, currentPhraseIndex, result.score, result.passed);

        resultFeedback.textContent = result.feedback;
        resultScore.textContent = `${result.score}%`;
        resultTranscription.textContent = transcript || '(nothing detected)';
        resultExpected.innerHTML = `${phrase.characters}<br><span style="font-size: 14px; color: var(--text-secondary);">${phrase.pinyin}</span>`;

        if (result.missedCharacters.length > 0) {
            resultMissing.textContent = `Missing: ${result.missedCharacters.join(' ')}`;
        } else {
            resultMissing.textContent = '';
        }

        resultCard.classList.add('visible');
        console.log('Result card shown');
    } catch (error) {
        console.error('Error in handleTranscription:', error);
    }
}

// ============================================
// Audio Playback (Pre-generated Chinese TTS)
// ============================================

let currentAudio = null;

function speakPhrase() {
    const button = document.getElementById('listenButton');

    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    // Get the audio file path: audio/lesson{id}_phrase{index}.mp3
    const lessonId = currentLesson.id;
    const audioPath = `audio/lesson${lessonId}_phrase${currentPhraseIndex}.mp3`;

    console.log('Playing audio:', audioPath);

    currentAudio = new Audio(audioPath);

    button.disabled = true;
    button.innerHTML = '🔊 Playing...';

    currentAudio.onended = () => {
        button.disabled = false;
        button.innerHTML = '🔊 Listen';
    };

    currentAudio.onerror = (e) => {
        console.error('Audio playback error:', e);
        button.disabled = false;
        button.innerHTML = '🔊 Listen';
        // Fallback to browser TTS if audio file fails
        speakPhraseFallback();
    };

    currentAudio.play().catch(err => {
        console.error('Audio play error:', err);
        button.disabled = false;
        button.innerHTML = '🔊 Listen';
    });
}

// Fallback to browser TTS if pre-generated audio fails
function speakPhraseFallback() {
    const phrase = currentLesson.phrases[currentPhraseIndex];

    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(phrase.characters);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8;

        const voices = speechSynthesis.getVoices();
        const chineseVoice = voices.find(v => v.lang.startsWith('zh'));
        if (chineseVoice) {
            utterance.voice = chineseVoice;
        }

        speechSynthesis.speak(utterance);
    }
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

    // Hide all lesson type views first
    document.getElementById('speakingView').classList.add('hidden');
    document.getElementById('matchingView').classList.add('hidden');
    document.getElementById('clozeView').classList.add('hidden');

    // Check lesson type and show appropriate view
    const lessonType = currentLesson.type || 'speaking';
    if (lessonType === 'matching') {
        document.getElementById('matchingView').classList.remove('hidden');
        initMatchingLesson();
    } else if (lessonType === 'cloze') {
        document.getElementById('clozeView').classList.remove('hidden');
        initClozeLesson();
    } else {
        document.getElementById('speakingView').classList.remove('hidden');
        updateLessonUI();
    }
}

function showMenu() {
    document.getElementById('menuView').classList.remove('hidden');
    document.getElementById('lessonView').classList.remove('active');
    document.getElementById('resultCard').classList.remove('visible');

    // Reset all views
    document.getElementById('speakingView').classList.remove('hidden');
    document.getElementById('matchingView').classList.add('hidden');
    document.getElementById('clozeView').classList.add('hidden');

    // Stop any ongoing recording
    if (isRecording) {
        stopRecording();
    }

    // Reset matching state
    matchedPairs = new Set();
    selectedCharacter = null;
    selectedPinyin = null;

    // Reset cloze state
    clozeSentenceIndex = 0;
    clozeFilledBlanks = [];
    clozeCorrectCount = 0;

    // Refresh lesson list to show updated progress
    renderLessonList();
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

    // Update lesson title with pinyin
    const titlePinyin = currentLesson.titlePinyin ? ` <span class="title-pinyin">(${currentLesson.titlePinyin})</span>` : '';
    document.getElementById('lessonTitle').innerHTML =
        `${currentLesson.icon} ${currentLesson.titleChinese}${titlePinyin}`;

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
// Matching Lesson Logic
// ============================================

let matchingPairs = [];
let selectedCharacter = null;
let selectedPinyin = null;
let matchedPairs = new Set();
let matchingStartTime = null;

function initMatchingLesson() {
    // Reset state
    matchingPairs = [...currentLesson.phrases];
    selectedCharacter = null;
    selectedPinyin = null;
    matchedPairs = new Set();
    matchingStartTime = Date.now();

    // Update lesson title with pinyin
    const titlePinyin = currentLesson.titlePinyin ? ` <span class="title-pinyin">(${currentLesson.titlePinyin})</span>` : '';
    document.getElementById('lessonTitle').innerHTML =
        `${currentLesson.icon} ${currentLesson.titleChinese}${titlePinyin}`;

    renderMatchingCards();
    updateMatchingProgress();
}

function renderMatchingCards() {
    const container = document.getElementById('matchingContainer');

    // Shuffle the characters and pinyin separately for the game
    const characters = matchingPairs.map((p, i) => ({ index: i, value: p.characters, pinyin: p.pinyin, english: p.english }));
    const pinyins = matchingPairs.map((p, i) => ({ index: i, value: p.pinyin }));

    // Shuffle arrays
    shuffleArray(characters);
    shuffleArray(pinyins);

    container.innerHTML = `
        <div class="matching-instruction">
            Tap a character, then tap its pinyin to match
        </div>
        <div class="matching-columns">
            <div class="matching-column" id="characterColumn">
                <div class="column-header">Characters 汉字</div>
                ${characters.map(c => `
                    <div class="match-card character-card ${matchedPairs.has(c.index) ? 'matched' : ''}"
                         data-index="${c.index}"
                         data-pinyin="${c.pinyin}"
                         onclick="selectCharacter(${c.index}, '${escapeHtml(c.pinyin)}')">
                        <span class="card-main">${c.value}</span>
                        <span class="card-hint">${c.english}</span>
                    </div>
                `).join('')}
            </div>
            <div class="matching-column" id="pinyinColumn">
                <div class="column-header">Pinyin 拼音</div>
                ${pinyins.map(p => `
                    <div class="match-card pinyin-card ${matchedPairs.has(p.index) ? 'matched' : ''}"
                         data-index="${p.index}"
                         onclick="selectPinyin(${p.index}, '${escapeHtml(p.value)}')">
                        <span class="card-main">${p.value}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function selectCharacter(index, pinyin) {
    if (matchedPairs.has(index)) return;

    // Clear previous selection
    document.querySelectorAll('.character-card').forEach(card => card.classList.remove('selected'));

    // Select this card
    const card = document.querySelector(`.character-card[data-index="${index}"]`);
    card.classList.add('selected');

    selectedCharacter = { index, pinyin };

    // Check for match if pinyin is also selected
    checkMatch();
}

function selectPinyin(index, value) {
    if (matchedPairs.has(index)) return;

    // Clear previous selection
    document.querySelectorAll('.pinyin-card').forEach(card => card.classList.remove('selected'));

    // Select this card
    const card = document.querySelector(`.pinyin-card[data-index="${index}"]`);
    card.classList.add('selected');

    selectedPinyin = { index, value };

    // Check for match if character is also selected
    checkMatch();
}

function checkMatch() {
    if (!selectedCharacter || !selectedPinyin) return;

    const charCard = document.querySelector(`.character-card[data-index="${selectedCharacter.index}"]`);
    const pinyinCard = document.querySelector(`.pinyin-card[data-index="${selectedPinyin.index}"]`);

    if (selectedCharacter.index === selectedPinyin.index) {
        // Correct match!
        matchedPairs.add(selectedCharacter.index);
        charCard.classList.remove('selected');
        charCard.classList.add('matched', 'correct-flash');
        pinyinCard.classList.remove('selected');
        pinyinCard.classList.add('matched', 'correct-flash');

        // Remove flash after animation
        setTimeout(() => {
            charCard.classList.remove('correct-flash');
            pinyinCard.classList.remove('correct-flash');
        }, 500);

        updateMatchingProgress();

        // Check if lesson complete
        if (matchedPairs.size === matchingPairs.length) {
            setTimeout(() => {
                showMatchingComplete();
            }, 600);
        }
    } else {
        // Wrong match - flash red and reset
        charCard.classList.add('wrong-flash');
        pinyinCard.classList.add('wrong-flash');

        setTimeout(() => {
            charCard.classList.remove('selected', 'wrong-flash');
            pinyinCard.classList.remove('selected', 'wrong-flash');
        }, 500);
    }

    // Reset selection
    selectedCharacter = null;
    selectedPinyin = null;
}

function updateMatchingProgress() {
    const total = matchingPairs.length;
    const completed = matchedPairs.size;
    const percent = (completed / total) * 100;

    document.getElementById('matchingProgressFill').style.width = `${percent}%`;
    document.getElementById('matchingProgressText').textContent = `${completed}/${total} matched`;
}

function showMatchingComplete() {
    const container = document.getElementById('matchingContainer');

    // Calculate time taken
    const timeSeconds = Math.round((Date.now() - matchingStartTime) / 1000);
    const minutes = Math.floor(timeSeconds / 60);
    const seconds = timeSeconds % 60;
    const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    // Save progress
    const progress = recordMatchingCompletion(currentLesson.id, timeSeconds);
    const lessonProgress = getLessonProgress(progress, currentLesson.id);
    const bestTime = lessonProgress.bestMatchTime;
    const bestMinutes = Math.floor(bestTime / 60);
    const bestSeconds = bestTime % 60;
    const bestTimeDisplay = bestMinutes > 0 ? `${bestMinutes}m ${bestSeconds}s` : `${bestSeconds}s`;

    const isNewBest = timeSeconds <= bestTime;

    container.innerHTML = `
        <div class="matching-complete">
            <div class="complete-icon">${isNewBest ? '🏆' : '🎉'}</div>
            <h3>${isNewBest ? 'New Best Time!' : 'Great job!'}</h3>
            <p>You matched all ${matchingPairs.length} pairs in <strong>${timeDisplay}</strong></p>
            <p class="best-time">Best time: ${bestTimeDisplay}</p>
            <button class="primary-button" onclick="restartMatching()">Practice Again</button>
            <button class="secondary-button" onclick="showMenu()">Back to Lessons</button>
        </div>
    `;
}

function restartMatching() {
    initMatchingLesson();
}

// ============================================
// Cloze (Fill-in-the-blank) Lesson Logic
// ============================================

let clozeSentenceIndex = 0;
let clozeFilledBlanks = [];  // Array of filled answers for current sentence
let clozeCorrectCount = 0;
let clozeStartTime = null;

function initClozeLesson() {
    // Reset state
    clozeSentenceIndex = 0;
    clozeFilledBlanks = [];
    clozeCorrectCount = 0;
    clozeStartTime = Date.now();

    // Update lesson title with pinyin
    const titlePinyin = currentLesson.titlePinyin ? ` <span class="title-pinyin">(${currentLesson.titlePinyin})</span>` : '';
    document.getElementById('lessonTitle').innerHTML =
        `${currentLesson.icon} ${currentLesson.titleChinese}${titlePinyin}`;

    // Render vocabulary review
    renderVocabReview();

    // Render first sentence
    renderClozeSentence();
    updateClozeProgress();
}

function renderVocabReview() {
    const container = document.getElementById('vocabReview');
    const vocab = currentLesson.vocabulary || [];

    if (vocab.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = `
        <h4>Words to Practice</h4>
        <div class="vocab-grid">
            ${vocab.map(v => `
                <div class="vocab-item">
                    <div class="vocab-item-word">${v.word}</div>
                    <div class="vocab-item-pinyin">${v.pinyin}</div>
                    <div class="vocab-item-english">${v.english}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderClozeSentence() {
    const container = document.getElementById('clozeContainer');
    const sentence = currentLesson.sentences[clozeSentenceIndex];

    // Reset filled blanks for this sentence
    clozeFilledBlanks = new Array(sentence.answers.length).fill(null);

    // Parse template to create display with blanks
    const sentenceHtml = createSentenceWithBlanks(sentence.template, sentence.answers);

    // Create word choices (answers + distractors, shuffled)
    const allChoices = [...sentence.answers, ...sentence.distractors];
    // Get pinyin for choices from vocabulary
    const vocab = currentLesson.vocabulary || [];
    const choicesWithPinyin = allChoices.map(word => {
        const vocabItem = vocab.find(v => v.word === word);
        return {
            word,
            pinyin: vocabItem ? vocabItem.pinyin : ''
        };
    });
    shuffleArray(choicesWithPinyin);

    container.innerHTML = `
        <div class="cloze-card">
            <div class="cloze-listen">
                <button class="listen-button" onclick="speakClozeSentence()">
                    🔊 Listen
                </button>
            </div>
            <div id="clozeSentence" class="cloze-sentence">
                ${sentenceHtml}
            </div>
            <div class="cloze-pinyin">${sentence.pinyin}</div>
            <div class="cloze-english">${sentence.english}</div>
        </div>

        <div class="word-choices" id="wordChoices">
            ${choicesWithPinyin.map((c, i) => `
                <button class="word-choice" data-word="${c.word}" data-index="${i}" onclick="selectClozeWord('${c.word}', ${i})">
                    ${c.word}
                    ${c.pinyin ? `<span class="word-choice-pinyin">${c.pinyin}</span>` : ''}
                </button>
            `).join('')}
        </div>

        <div id="clozeFeedback" class="cloze-feedback"></div>

        <div class="cloze-next" id="clozeNextContainer" style="display: none;">
            <button class="primary-button" onclick="nextClozeSentence()">
                Next Sentence →
            </button>
        </div>
    `;
}

function createSentenceWithBlanks(template, answers) {
    // Replace {0}, {1}, etc. with blank spans
    let result = template;
    for (let i = answers.length - 1; i >= 0; i--) {
        const placeholder = `{${i}}`;
        const blankHtml = `<span class="cloze-blank" data-blank-index="${i}" id="clozeBlank${i}"></span>`;
        result = result.replace(placeholder, blankHtml);
    }
    return result;
}

function selectClozeWord(word, buttonIndex) {
    const sentence = currentLesson.sentences[clozeSentenceIndex];
    const button = document.querySelector(`.word-choice[data-index="${buttonIndex}"]`);

    // Check if already used
    if (button.classList.contains('used')) return;

    // Find the first unfilled blank
    const nextBlankIndex = clozeFilledBlanks.findIndex(b => b === null);
    if (nextBlankIndex === -1) return; // All blanks filled

    // Fill the blank
    clozeFilledBlanks[nextBlankIndex] = word;
    const blankEl = document.getElementById(`clozeBlank${nextBlankIndex}`);
    blankEl.textContent = word;
    blankEl.classList.add('filled');

    // Mark button as used
    button.classList.add('used');

    // Check if all blanks are filled
    if (!clozeFilledBlanks.includes(null)) {
        checkClozeAnswer();
    }
}

function checkClozeAnswer() {
    const sentence = currentLesson.sentences[clozeSentenceIndex];
    const feedback = document.getElementById('clozeFeedback');
    const nextContainer = document.getElementById('clozeNextContainer');

    // Check each blank
    let allCorrect = true;
    for (let i = 0; i < sentence.answers.length; i++) {
        const blankEl = document.getElementById(`clozeBlank${i}`);
        if (clozeFilledBlanks[i] === sentence.answers[i]) {
            blankEl.classList.add('correct');
        } else {
            blankEl.classList.add('incorrect');
            allCorrect = false;
        }
    }

    // Show feedback
    if (allCorrect) {
        clozeCorrectCount++;
        feedback.textContent = '✓ Correct!';
        feedback.className = 'cloze-feedback visible correct';

        // Record progress
        recordSpeakingAttempt(currentLesson.id, clozeSentenceIndex, 100, true);
    } else {
        feedback.innerHTML = `✗ Not quite. The answer was: <strong>${sentence.answers.join(', ')}</strong>`;
        feedback.className = 'cloze-feedback visible incorrect';

        // Record attempt
        recordSpeakingAttempt(currentLesson.id, clozeSentenceIndex, 0, false);
    }

    // Disable all word choice buttons
    document.querySelectorAll('.word-choice').forEach(btn => {
        btn.classList.add('disabled');
    });

    // Show next button
    nextContainer.style.display = 'flex';
    updateClozeProgress();
}

function nextClozeSentence() {
    clozeSentenceIndex++;

    if (clozeSentenceIndex >= currentLesson.sentences.length) {
        showClozeComplete();
    } else {
        renderClozeSentence();
        updateClozeProgress();
    }
}

function updateClozeProgress() {
    const total = currentLesson.sentences.length;
    const completed = clozeSentenceIndex;
    const percent = (completed / total) * 100;

    document.getElementById('clozeProgressFill').style.width = `${percent}%`;
    document.getElementById('clozeProgressText').textContent = `${completed}/${total} completed`;
}

function showClozeComplete() {
    const container = document.getElementById('clozeContainer');
    const total = currentLesson.sentences.length;
    const score = Math.round((clozeCorrectCount / total) * 100);

    // Calculate time
    const timeSeconds = Math.round((Date.now() - clozeStartTime) / 1000);
    const minutes = Math.floor(timeSeconds / 60);
    const seconds = timeSeconds % 60;
    const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    // Hide vocab review
    document.getElementById('vocabReview').style.display = 'none';

    container.innerHTML = `
        <div class="matching-complete">
            <div class="complete-icon">${score >= 80 ? '🏆' : score >= 50 ? '🎉' : '📚'}</div>
            <h3>${score >= 80 ? 'Excellent!' : score >= 50 ? 'Good job!' : 'Keep practicing!'}</h3>
            <p>You got <strong>${clozeCorrectCount}/${total}</strong> sentences correct</p>
            <p>Score: <strong>${score}%</strong></p>
            <p class="best-time">Time: ${timeDisplay}</p>
            <button class="primary-button" onclick="restartCloze()">Practice Again</button>
            <button class="secondary-button" onclick="showMenu()">Back to Lessons</button>
        </div>
    `;

    // Update progress bar to 100%
    document.getElementById('clozeProgressFill').style.width = '100%';
    document.getElementById('clozeProgressText').textContent = `${total}/${total} completed`;
}

function restartCloze() {
    initClozeLesson();
}

function speakClozeSentence() {
    const sentence = currentLesson.sentences[clozeSentenceIndex];

    // Build full sentence from template and answers
    let fullSentence = sentence.template;
    for (let i = 0; i < sentence.answers.length; i++) {
        fullSentence = fullSentence.replace(`{${i}}`, sentence.answers[i]);
    }

    // Use browser TTS
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(fullSentence);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8;

        const voices = speechSynthesis.getVoices();
        const chineseVoice = voices.find(v => v.lang.startsWith('zh'));
        if (chineseVoice) {
            utterance.voice = chineseVoice;
        }

        speechSynthesis.speak(utterance);
    }
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
window.selectCharacter = selectCharacter;
window.selectPinyin = selectPinyin;
window.restartMatching = restartMatching;
window.selectClozeWord = selectClozeWord;
window.nextClozeSentence = nextClozeSentence;
window.restartCloze = restartCloze;
window.speakClozeSentence = speakClozeSentence;
