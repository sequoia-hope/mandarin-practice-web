// Main application logic for Mandarin ASR Practice App

import { initWhisperModel, transcribeAudio, isWhisperReady } from './whisper-asr.js';
import { AudioRecorder, resampleTo16kHz } from './audio-capture.js';
import {
    loadProgress,
    saveProgress,
    getLessonProgress,
    recordSpeakingAttempt,
    recordMatchingCompletion,
    getStats,
    loadProfile,
    saveProfile,
    isProfileSetup,
    setupProfile,
    getUserName,
    CHINESE_NAMES,
    AVATAR_EMOJIS
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

// Daily curriculum state
let currentDay = null;
let currentActivityIndex = 0;
let selectedAvatar = null;
let selectedName = null;

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
    initApp();
});

function initApp() {
    // Check if profile is set up
    if (!isProfileSetup()) {
        showProfileSetup();
    } else {
        showProfileHeader();
    }

    // Render the daily lessons UI
    renderDailyLessons();

    // Initialize speech recognition
    initWhisper();
    updateASRSwitcher();

    // Render stats
    renderStats();

    // Set up cleanup handlers for mic release
    setupCleanupHandlers();
}

/**
 * Set up event handlers to clean up recording resources
 * This prevents the microphone from staying open when:
 * - User navigates away from the page
 * - User switches tabs (page becomes hidden)
 * - User closes the browser/tab
 */
function setupCleanupHandlers() {
    // Clean up when page becomes hidden (tab switch, minimize, etc.)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isRecording) {
            console.log('Page hidden while recording, cleaning up...');
            cleanupRecording();
        }
    });

    // Clean up before page unload
    window.addEventListener('beforeunload', () => {
        if (isRecording) {
            console.log('Page unloading while recording, cleaning up...');
            cleanupRecording();
        }
    });

    // Also clean up on pagehide (more reliable on mobile)
    window.addEventListener('pagehide', () => {
        if (isRecording) {
            console.log('Page hiding while recording, cleaning up...');
            cleanupRecording();
        }
    });
}

/**
 * Force cleanup of all recording resources
 */
function cleanupRecording() {
    // Stop Web Speech API recognition
    if (recognition) {
        try {
            recognition.abort();
        } catch (e) {
            // Ignore errors
        }
    }

    // Stop Whisper audio recorder
    if (audioRecorder) {
        audioRecorder.forceStop();
    }

    isRecording = false;
    updateRecordButton();
}

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

// ============================================
// Profile Setup
// ============================================

function showProfileSetup() {
    const modal = document.getElementById('profileSetupModal');
    const avatarGrid = document.getElementById('avatarGrid');
    const nameGrid = document.getElementById('nameGrid');

    // Render avatar options
    avatarGrid.innerHTML = AVATAR_EMOJIS.map(emoji => `
        <button class="avatar-option" data-avatar="${emoji}" onclick="selectAvatar('${emoji}')">
            ${emoji}
        </button>
    `).join('');

    // Render name options
    nameGrid.innerHTML = CHINESE_NAMES.map(name => `
        <button class="name-option" data-name="${name.chinese}" onclick="selectName('${name.chinese}')">
            <div class="name-chinese">${name.chinese}</div>
            <div class="name-pinyin">${name.pinyin}</div>
            <div class="name-english">${name.english}</div>
        </button>
    `).join('');

    // Load existing selections if editing
    const profile = loadProfile();
    if (profile.avatar) {
        selectedAvatar = profile.avatar;
        document.querySelector(`.avatar-option[data-avatar="${profile.avatar}"]`)?.classList.add('selected');
    }
    if (profile.chineseName) {
        selectedName = profile.chineseName;
        document.querySelector(`.name-option[data-name="${profile.chineseName}"]`)?.classList.add('selected');
    }

    updateSetupButton();
    modal.classList.remove('hidden');
    document.getElementById('defaultHeader').style.display = 'block';
    document.getElementById('profileHeader').style.display = 'none';
}

function selectAvatar(emoji) {
    selectedAvatar = emoji;
    document.querySelectorAll('.avatar-option').forEach(btn => btn.classList.remove('selected'));
    document.querySelector(`.avatar-option[data-avatar="${emoji}"]`).classList.add('selected');
    updateSetupButton();
}

function selectName(chinese) {
    selectedName = chinese;
    document.querySelectorAll('.name-option').forEach(btn => btn.classList.remove('selected'));
    document.querySelector(`.name-option[data-name="${chinese}"]`).classList.add('selected');
    updateSetupButton();
}

function updateSetupButton() {
    const btn = document.getElementById('setupCompleteBtn');
    btn.disabled = !selectedAvatar || !selectedName;
}

function completeProfileSetup() {
    if (!selectedAvatar || !selectedName) return;

    setupProfile(selectedAvatar, selectedName);
    document.getElementById('profileSetupModal').classList.add('hidden');
    showProfileHeader();
    renderDailyLessons();
}

function showProfileHeader() {
    const profile = loadProfile();
    if (!profile.setupComplete) return;

    const userName = getUserName();
    document.getElementById('profileAvatar').textContent = profile.avatar;
    document.getElementById('profileName').textContent = userName?.chinese || profile.chineseName;
    document.getElementById('profileNamePinyin').textContent = userName?.pinyin || '';

    document.getElementById('defaultHeader').style.display = 'none';
    document.getElementById('profileHeader').style.display = 'flex';
}

// ============================================
// Daily Lessons UI
// ============================================

function renderDailyLessons() {
    const container = document.getElementById('dailyLessonList');
    const progress = loadProgress();

    if (!window.DAILY_CURRICULUM) {
        // Fallback to legacy lesson list if daily curriculum not loaded
        renderLessonList();
        return;
    }

    // Find user's current day based on progress
    const currentDayIndex = findCurrentDay(progress);

    // Render today's card
    renderTodayCard(currentDayIndex);

    // Render all days
    container.innerHTML = window.DAILY_CURRICULUM.map((day, index) => {
        const dayProgress = getDayProgress(progress, day);
        const isLocked = index > currentDayIndex;
        const isCompleted = dayProgress.completed;
        const isExpanded = index === currentDayIndex;

        return `
            <div class="day-card ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''} ${isExpanded ? 'expanded' : ''}"
                 data-day="${day.day}">
                <div class="day-header" onclick="toggleDayCard(${index}, ${isLocked})">
                    <div class="day-icon">${day.icon}</div>
                    <div class="day-info">
                        <div class="day-number">Day ${day.day}</div>
                        <div class="day-title">${day.title}</div>
                        <div class="day-title-chinese">${day.titleChinese} · ${day.titlePinyin}</div>
                    </div>
                    <div class="day-progress">
                        ${isLocked ? '<div class="day-progress-icon">🔒</div>' :
                          isCompleted ? '<div class="day-progress-icon">✅</div>' :
                          `<div class="day-progress-text">${dayProgress.completedActivities}/${day.activities.length}</div>`}
                    </div>
                </div>
                <div class="day-activities">
                    ${day.activities.map((activity, actIndex) => {
                        const activityCompleted = isActivityCompleted(progress, day.day, actIndex);
                        const activityLocked = !isCompleted && actIndex > dayProgress.completedActivities;
                        const typeIcon = getActivityTypeIcon(activity.type);
                        const typeClass = `type-icon-${activity.type}`;

                        return `
                            <div class="activity-item ${activityCompleted ? 'completed' : ''} ${activityLocked ? 'locked' : ''}"
                                 onclick="startDailyActivity(${index}, ${actIndex}, ${activityLocked})">
                                <div class="activity-icon ${typeClass}">${typeIcon}</div>
                                <div class="activity-info">
                                    <div class="activity-title">${activity.title}</div>
                                    <div class="activity-desc">${activity.description}</div>
                                </div>
                                <div class="activity-status">
                                    ${activityCompleted ? '✓' : activityLocked ? '🔒' : '→'}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function renderTodayCard(currentDayIndex) {
    const todayCard = document.getElementById('todayCard');
    if (!window.DAILY_CURRICULUM || currentDayIndex >= window.DAILY_CURRICULUM.length) {
        todayCard.style.display = 'none';
        return;
    }

    const day = window.DAILY_CURRICULUM[currentDayIndex];
    document.getElementById('todayTitle').textContent = `Day ${day.day}: ${day.title}`;
    document.getElementById('todaySubtitle').textContent = `${day.icon} ${day.description}`;
    todayCard.style.display = 'block';
}

function findCurrentDay(progress) {
    if (!window.DAILY_CURRICULUM) return 0;

    for (let i = 0; i < window.DAILY_CURRICULUM.length; i++) {
        const dayProgress = getDayProgress(progress, window.DAILY_CURRICULUM[i]);
        if (!dayProgress.completed) {
            return i;
        }
    }
    return window.DAILY_CURRICULUM.length - 1;
}

function getDayProgress(progress, day) {
    let completedActivities = 0;

    for (let i = 0; i < day.activities.length; i++) {
        if (isActivityCompleted(progress, day.day, i)) {
            completedActivities++;
        }
    }

    return {
        completedActivities,
        completed: completedActivities === day.activities.length
    };
}

function isActivityCompleted(progress, dayNumber, activityIndex) {
    const key = `day${dayNumber}_activity${activityIndex}`;
    return progress.lessons[key]?.completed || false;
}

function markActivityCompleted(dayNumber, activityIndex) {
    const progress = loadProgress();
    const key = `day${dayNumber}_activity${activityIndex}`;

    if (!progress.lessons[key]) {
        progress.lessons[key] = { completed: false, attempts: 0 };
    }
    progress.lessons[key].completed = true;
    progress.lessons[key].completedAt = new Date().toISOString();

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    if (progress.lastPracticeDate !== today) {
        if (progress.lastPracticeDate) {
            const lastDate = new Date(progress.lastPracticeDate);
            const todayDate = new Date(today);
            const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                progress.streakDays++;
            } else if (diffDays > 1) {
                progress.streakDays = 1;
            }
        } else {
            progress.streakDays = 1;
        }
        progress.lastPracticeDate = today;
    }

    saveProgress(progress);
}

function getActivityTypeIcon(type) {
    const icons = {
        intro: '📖',
        matching: '🔗',
        tones: '🎵',
        listening: '👂',
        cloze: '📝',
        speaking: '🎤',
        ordering: '🔀'
    };
    return icons[type] || '📖';
}

function toggleDayCard(dayIndex, isLocked) {
    if (isLocked) return;

    const cards = document.querySelectorAll('.day-card');
    const card = cards[dayIndex];

    if (card.classList.contains('expanded')) {
        card.classList.remove('expanded');
    } else {
        // Collapse all others
        cards.forEach(c => c.classList.remove('expanded'));
        card.classList.add('expanded');
    }
}

function startTodaysPractice() {
    const progress = loadProgress();
    const currentDayIndex = findCurrentDay(progress);
    const day = window.DAILY_CURRICULUM[currentDayIndex];

    // Find first incomplete activity
    for (let i = 0; i < day.activities.length; i++) {
        if (!isActivityCompleted(progress, day.day, i)) {
            startDailyActivity(currentDayIndex, i, false);
            return;
        }
    }

    // All complete, start first activity again
    startDailyActivity(currentDayIndex, 0, false);
}

function startDailyActivity(dayIndex, activityIndex, isLocked) {
    if (isLocked) return;

    const day = window.DAILY_CURRICULUM[dayIndex];
    const activity = day.activities[activityIndex];

    currentDay = day;
    currentActivityIndex = activityIndex;

    // Create a lesson object compatible with existing lesson types
    const lesson = {
        id: `day${day.day}_activity${activityIndex}`,
        type: activity.type,
        title: activity.title,
        titleChinese: day.titleChinese,
        titlePinyin: day.titlePinyin,
        icon: day.icon,
        ...activity
    };

    // Apply name templating
    lesson.phrases = templatePhrases(activity.phrases || []);
    lesson.sentences = templateSentences(activity.sentences || []);
    lesson.questions = activity.questions || [];
    lesson.words = activity.words || [];
    lesson.vocabulary = day.vocabulary || activity.vocabulary || [];

    // Start the lesson using existing infrastructure
    currentLesson = lesson;
    currentPhraseIndex = 0;
    completedPhrases = new Set();

    document.getElementById('menuView').classList.add('hidden');
    document.getElementById('lessonView').classList.add('active');

    // Hide all lesson type views first
    document.getElementById('speakingView').classList.add('hidden');
    document.getElementById('matchingView').classList.add('hidden');
    document.getElementById('clozeView').classList.add('hidden');
    document.getElementById('listeningView').classList.add('hidden');
    document.getElementById('tonesView').classList.add('hidden');
    document.getElementById('orderingView').classList.add('hidden');
    document.getElementById('introView').classList.add('hidden');

    // Show the appropriate view
    if (activity.type === 'intro') {
        document.getElementById('introView').classList.remove('hidden');
        initIntroLesson();
    } else if (activity.type === 'matching') {
        document.getElementById('matchingView').classList.remove('hidden');
        initMatchingLesson();
    } else if (activity.type === 'cloze') {
        document.getElementById('clozeView').classList.remove('hidden');
        initClozeLesson();
    } else if (activity.type === 'listening') {
        document.getElementById('listeningView').classList.remove('hidden');
        initListeningLesson();
    } else if (activity.type === 'tones') {
        document.getElementById('tonesView').classList.remove('hidden');
        initTonesLesson();
    } else if (activity.type === 'ordering') {
        document.getElementById('orderingView').classList.remove('hidden');
        initOrderingLesson();
    } else {
        document.getElementById('speakingView').classList.remove('hidden');
        updateLessonUI();
    }
}

// ============================================
// Name Templating
// ============================================

function templatePhrases(phrases) {
    const userName = getUserName();
    if (!userName) return phrases;

    return phrases.map(phrase => ({
        ...phrase,
        characters: templateString(phrase.characters, userName),
        pinyin: templateString(phrase.pinyin, userName, 'pinyin'),
        english: templateString(phrase.english, userName, 'english')
    }));
}

function templateSentences(sentences) {
    const userName = getUserName();
    if (!userName) return sentences;

    return sentences.map(sentence => ({
        ...sentence,
        template: templateString(sentence.template, userName),
        pinyin: templateString(sentence.pinyin, userName, 'pinyin'),
        english: templateString(sentence.english, userName, 'english')
    }));
}

function templateString(str, userName, type = 'chinese') {
    if (!str || !userName) return str;

    return str
        .replace(/\{\{NAME\}\}/g, userName.chinese)
        .replace(/\{\{NAME_PINYIN\}\}/g, userName.pinyin)
        .replace(/\{\{NAME_ENGLISH\}\}/g, userName.english || userName.chinese);
}

// ============================================
// Legacy Lesson List (for backwards compatibility)
// ============================================

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
        } else if (lessonType === 'listening') {
            const completed = lessonProgress.completedPhrases.length;
            const total = lesson.questions ? lesson.questions.length : 0;
            if (completed === total && total > 0) {
                progressDisplay = '✓';
                progressClass = 'completed';
            } else if (completed > 0) {
                progressDisplay = `${completed}/${total} 👂`;
                progressClass = 'in-progress';
            } else {
                progressDisplay = `${total} listen 👂`;
            }
        } else if (lessonType === 'tones') {
            const completed = lessonProgress.completedPhrases.length;
            const total = lesson.words ? lesson.words.length : 0;
            if (completed === total && total > 0) {
                progressDisplay = '✓';
                progressClass = 'completed';
            } else if (completed > 0) {
                progressDisplay = `${completed}/${total} 🎵`;
                progressClass = 'in-progress';
            } else {
                progressDisplay = `${total} tones 🎵`;
            }
        } else if (lessonType === 'ordering') {
            const completed = lessonProgress.completedPhrases.length;
            const total = lesson.sentences ? lesson.sentences.length : 0;
            if (completed === total && total > 0) {
                progressDisplay = '✓';
                progressClass = 'completed';
            } else if (completed > 0) {
                progressDisplay = `${completed}/${total} 🔀`;
                progressClass = 'in-progress';
            } else {
                progressDisplay = `${total} order 🔀`;
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

        // Safety check: reject very large audio blobs to prevent memory issues
        const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB max
        if (audioBlob.size > MAX_AUDIO_SIZE) {
            console.warn('Audio blob too large, skipping transcription');
            hideLoading();
            handleTranscription('');
            return;
        }

        // Resample to 16kHz for Whisper with timeout protection
        console.log('Resampling audio...');
        let audioFloat32;
        try {
            audioFloat32 = await Promise.race([
                resampleTo16kHz(audioBlob),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Resample timeout')), 30000)
                )
            ]);
        } catch (resampleError) {
            console.error('Resample error:', resampleError);
            hideLoading();
            handleTranscription('');
            return;
        }
        console.log('Audio resampled, length:', audioFloat32.length);

        // Safety check: limit audio length to ~30 seconds at 16kHz
        const MAX_SAMPLES = 16000 * 30;
        if (audioFloat32.length > MAX_SAMPLES) {
            console.warn('Audio too long, truncating to 30 seconds');
            audioFloat32 = audioFloat32.slice(0, MAX_SAMPLES);
        }

        // Run transcription with expected phrase as prompt
        const expectedPhrase = currentLesson?.phrases[currentPhraseIndex]?.characters;
        console.log('Running transcription with expected phrase:', expectedPhrase);

        // Add timeout protection for transcription
        let result;
        try {
            result = await Promise.race([
                transcribeAudio(audioFloat32, expectedPhrase),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Transcription timeout')), 60000)
                )
            ]);
        } catch (transcribeError) {
            console.error('Transcription error:', transcribeError);
            hideLoading();
            if (currentLesson) {
                handleTranscription('');
            }
            return;
        }
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

            // Check if all phrases completed for daily activity
            if (currentDay && completedPhrases.size === currentLesson.phrases.length) {
                markActivityCompleted(currentDay.day, currentActivityIndex);
            }
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
    document.getElementById('listeningView').classList.add('hidden');
    document.getElementById('tonesView').classList.add('hidden');
    document.getElementById('orderingView').classList.add('hidden');

    // Check lesson type and show appropriate view
    const lessonType = currentLesson.type || 'speaking';
    if (lessonType === 'matching') {
        document.getElementById('matchingView').classList.remove('hidden');
        initMatchingLesson();
    } else if (lessonType === 'cloze') {
        document.getElementById('clozeView').classList.remove('hidden');
        initClozeLesson();
    } else if (lessonType === 'listening') {
        document.getElementById('listeningView').classList.remove('hidden');
        initListeningLesson();
    } else if (lessonType === 'tones') {
        document.getElementById('tonesView').classList.remove('hidden');
        initTonesLesson();
    } else if (lessonType === 'ordering') {
        document.getElementById('orderingView').classList.remove('hidden');
        initOrderingLesson();
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
    document.getElementById('listeningView').classList.add('hidden');
    document.getElementById('tonesView').classList.add('hidden');
    document.getElementById('orderingView').classList.add('hidden');
    document.getElementById('introView').classList.add('hidden');

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

    // Reset listening state
    listeningQuestionIndex = 0;
    listeningCorrectCount = 0;

    // Reset tones state
    tonesWordIndex = 0;
    tonesCorrectCount = 0;

    // Reset ordering state
    orderingSentenceIndex = 0;
    orderingCorrectCount = 0;
    orderingSelectedWords = [];

    // Reset intro state
    introWordIndex = 0;

    // Reset daily activity state
    currentDay = null;
    currentActivityIndex = 0;

    // Refresh daily lessons UI to show updated progress
    renderDailyLessons();
    renderStats();
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

    // Mark daily activity as completed if this is a daily lesson
    if (currentDay) {
        markActivityCompleted(currentDay.day, currentActivityIndex);
    }

    container.innerHTML = `
        <div class="matching-complete">
            <div class="complete-icon">${isNewBest ? '🏆' : '🎉'}</div>
            <h3>${isNewBest ? 'New Best Time!' : 'Great job!'}</h3>
            <p>You matched all ${matchingPairs.length} pairs in <strong>${timeDisplay}</strong></p>
            <p class="best-time">Best time: ${bestTimeDisplay}</p>
            <div class="complete-actions">
                ${getNextActivityButton()}
                <button class="primary-button" onclick="restartMatching()">Practice Again</button>
                <button class="secondary-button" onclick="showMenu()">Back to Lessons</button>
            </div>
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

    // Mark daily activity as completed if this is a daily lesson
    if (currentDay && score >= 50) {
        markActivityCompleted(currentDay.day, currentActivityIndex);
    }

    // Hide vocab review
    document.getElementById('vocabReview').style.display = 'none';

    container.innerHTML = `
        <div class="matching-complete">
            <div class="complete-icon">${score >= 80 ? '🏆' : score >= 50 ? '🎉' : '📚'}</div>
            <h3>${score >= 80 ? 'Excellent!' : score >= 50 ? 'Good job!' : 'Keep practicing!'}</h3>
            <p>You got <strong>${clozeCorrectCount}/${total}</strong> sentences correct</p>
            <p>Score: <strong>${score}%</strong></p>
            <p class="best-time">Time: ${timeDisplay}</p>
            <div class="complete-actions">
                ${getNextActivityButton()}
                <button class="primary-button" onclick="restartCloze()">Practice Again</button>
                <button class="secondary-button" onclick="showMenu()">Back to Lessons</button>
            </div>
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
// Listening Quiz Lesson Logic
// ============================================

let listeningQuestionIndex = 0;
let listeningCorrectCount = 0;
let listeningStartTime = null;

function initListeningLesson() {
    // Reset state
    listeningQuestionIndex = 0;
    listeningCorrectCount = 0;
    listeningStartTime = Date.now();

    // Update lesson title with pinyin
    const titlePinyin = currentLesson.titlePinyin ? ` <span class="title-pinyin">(${currentLesson.titlePinyin})</span>` : '';
    document.getElementById('lessonTitle').innerHTML =
        `${currentLesson.icon} ${currentLesson.titleChinese}${titlePinyin}`;

    renderListeningQuestion();
    updateListeningProgress();
}

function renderListeningQuestion() {
    const container = document.getElementById('listeningContainer');
    const question = currentLesson.questions[listeningQuestionIndex];

    // Create choices from the question's choices array, shuffled
    const choices = question.choices.map(text => {
        return {
            text,
            pinyin: '' // Pinyin shown after answering
        };
    });
    shuffleArray(choices);

    container.innerHTML = `
        <div class="listening-card">
            <div class="listening-instruction">
                Listen and select what you heard
            </div>
            <button class="listen-big-button" onclick="speakListeningAudio()">
                🔊 Play Audio
            </button>
        </div>

        <div class="listening-choices" id="listeningChoices">
            ${choices.map((c, i) => `
                <button class="listening-choice" data-text="${escapeHtml(c.text)}" data-index="${i}"
                        onclick="selectListeningChoice('${escapeHtml(c.text)}', ${i})">
                    <span class="choice-text">${c.text}</span>
                    ${c.pinyin ? `<span class="choice-pinyin">${c.pinyin}</span>` : ''}
                </button>
            `).join('')}
        </div>

        <div id="listeningFeedback" class="listening-feedback"></div>

        <div class="listening-next" id="listeningNextContainer" style="display: none;">
            <button class="primary-button" onclick="nextListeningQuestion()">
                Next Question →
            </button>
        </div>
    `;

    // Auto-play audio after a short delay
    setTimeout(() => speakListeningAudio(), 500);
}

function speakListeningAudio() {
    const question = currentLesson.questions[listeningQuestionIndex];

    // Speak the audio phrase
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(question.audio);
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

function selectListeningChoice(text, buttonIndex) {
    const question = currentLesson.questions[listeningQuestionIndex];
    const feedback = document.getElementById('listeningFeedback');
    const nextContainer = document.getElementById('listeningNextContainer');
    const buttons = document.querySelectorAll('.listening-choice');

    // Disable all buttons
    buttons.forEach(btn => btn.classList.add('disabled'));

    // Check answer
    const isCorrect = text === question.correct;
    const selectedButton = document.querySelector(`.listening-choice[data-index="${buttonIndex}"]`);

    if (isCorrect) {
        listeningCorrectCount++;
        selectedButton.classList.add('correct');
        feedback.innerHTML = `✓ Correct! <span class="feedback-pinyin">${question.pinyin}</span>`;
        feedback.className = 'listening-feedback visible correct';

        // Record progress
        recordSpeakingAttempt(currentLesson.id, listeningQuestionIndex, 100, true);
    } else {
        selectedButton.classList.add('incorrect');
        // Highlight correct answer
        buttons.forEach(btn => {
            if (btn.dataset.text === question.correct) {
                btn.classList.add('correct');
            }
        });
        feedback.innerHTML = `✗ The answer was: <strong>${question.correct}</strong> <span class="feedback-pinyin">${question.pinyin}</span>`;
        feedback.className = 'listening-feedback visible incorrect';

        // Record attempt
        recordSpeakingAttempt(currentLesson.id, listeningQuestionIndex, 0, false);
    }

    // Show next button
    nextContainer.style.display = 'flex';
    updateListeningProgress();
}

function nextListeningQuestion() {
    listeningQuestionIndex++;

    if (listeningQuestionIndex >= currentLesson.questions.length) {
        showListeningComplete();
    } else {
        renderListeningQuestion();
        updateListeningProgress();
    }
}

function updateListeningProgress() {
    const total = currentLesson.questions.length;
    const completed = listeningQuestionIndex;
    const percent = (completed / total) * 100;

    document.getElementById('listeningProgressFill').style.width = `${percent}%`;
    document.getElementById('listeningProgressText').textContent = `${completed}/${total} completed`;
}

function showListeningComplete() {
    const container = document.getElementById('listeningContainer');
    const total = currentLesson.questions.length;
    const score = Math.round((listeningCorrectCount / total) * 100);

    // Calculate time
    const timeSeconds = Math.round((Date.now() - listeningStartTime) / 1000);
    const minutes = Math.floor(timeSeconds / 60);
    const seconds = timeSeconds % 60;
    const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    // Mark daily activity as completed if this is a daily lesson
    if (currentDay && score >= 50) {
        markActivityCompleted(currentDay.day, currentActivityIndex);
    }

    container.innerHTML = `
        <div class="matching-complete">
            <div class="complete-icon">${score >= 80 ? '🏆' : score >= 50 ? '🎉' : '📚'}</div>
            <h3>${score >= 80 ? 'Excellent!' : score >= 50 ? 'Good job!' : 'Keep practicing!'}</h3>
            <p>You got <strong>${listeningCorrectCount}/${total}</strong> questions correct</p>
            <p>Score: <strong>${score}%</strong></p>
            <p class="best-time">Time: ${timeDisplay}</p>
            <div class="complete-actions">
                ${getNextActivityButton()}
                <button class="primary-button" onclick="restartListening()">Practice Again</button>
                <button class="secondary-button" onclick="showMenu()">Back to Lessons</button>
            </div>
        </div>
    `;

    // Update progress bar to 100%
    document.getElementById('listeningProgressFill').style.width = '100%';
    document.getElementById('listeningProgressText').textContent = `${total}/${total} completed`;
}

function restartListening() {
    initListeningLesson();
}

// ============================================
// Tone Drill Lesson Logic
// ============================================

let tonesWordIndex = 0;
let tonesCorrectCount = 0;
let tonesStartTime = null;

const TONE_NAMES = {
    1: 'First tone (flat)',
    2: 'Second tone (rising)',
    3: 'Third tone (dip)',
    4: 'Fourth tone (falling)',
    5: 'Neutral tone'
};

function initTonesLesson() {
    // Reset state
    tonesWordIndex = 0;
    tonesCorrectCount = 0;
    tonesStartTime = Date.now();

    // Update lesson title with pinyin
    const titlePinyin = currentLesson.titlePinyin ? ` <span class="title-pinyin">(${currentLesson.titlePinyin})</span>` : '';
    document.getElementById('lessonTitle').innerHTML =
        `${currentLesson.icon} ${currentLesson.titleChinese}${titlePinyin}`;

    renderToneWord();
    updateTonesProgress();
}

function renderToneWord() {
    const container = document.getElementById('tonesContainer');
    const word = currentLesson.words[tonesWordIndex];

    // Create tone choices (1-4, or include 5 for neutral)
    const toneChoices = currentLesson.includeNeutral ? [1, 2, 3, 4, 5] : [1, 2, 3, 4];

    container.innerHTML = `
        <div class="tone-card">
            <button class="tone-listen-button" onclick="speakToneWord()">
                🔊 Listen
            </button>
            <div class="tone-character">${word.character}</div>
            <div class="tone-hint">${word.english}</div>
        </div>

        <div class="tone-instruction">
            What tone is this?
        </div>

        <div class="tone-choices" id="toneChoices">
            ${toneChoices.map(tone => `
                <button class="tone-choice" data-tone="${tone}" onclick="selectTone(${tone})">
                    <span class="tone-number">${tone === 5 ? '·' : tone}</span>
                    <span class="tone-name">${TONE_NAMES[tone]}</span>
                </button>
            `).join('')}
        </div>

        <div id="tonesFeedback" class="tones-feedback"></div>

        <div class="tones-next" id="tonesNextContainer" style="display: none;">
            <button class="primary-button" onclick="nextToneWord()">
                Next Word →
            </button>
        </div>
    `;

    // Auto-play audio after a short delay
    setTimeout(() => speakToneWord(), 500);
}

function speakToneWord() {
    const word = currentLesson.words[tonesWordIndex];

    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(word.character);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.7; // Slower for tone recognition

        const voices = speechSynthesis.getVoices();
        const chineseVoice = voices.find(v => v.lang.startsWith('zh'));
        if (chineseVoice) {
            utterance.voice = chineseVoice;
        }

        speechSynthesis.speak(utterance);
    }
}

function selectTone(selectedTone) {
    const word = currentLesson.words[tonesWordIndex];
    const feedback = document.getElementById('tonesFeedback');
    const nextContainer = document.getElementById('tonesNextContainer');
    const buttons = document.querySelectorAll('.tone-choice');

    // Disable all buttons
    buttons.forEach(btn => btn.classList.add('disabled'));

    // Check answer
    const isCorrect = selectedTone === word.tone;
    const selectedButton = document.querySelector(`.tone-choice[data-tone="${selectedTone}"]`);

    if (isCorrect) {
        tonesCorrectCount++;
        selectedButton.classList.add('correct');
        feedback.innerHTML = `✓ Correct! <strong>${word.pinyin}</strong>`;
        feedback.className = 'tones-feedback visible correct';

        // Record progress
        recordSpeakingAttempt(currentLesson.id, tonesWordIndex, 100, true);
    } else {
        selectedButton.classList.add('incorrect');
        // Highlight correct answer
        buttons.forEach(btn => {
            if (parseInt(btn.dataset.tone) === word.tone) {
                btn.classList.add('correct');
            }
        });
        feedback.innerHTML = `✗ It was tone ${word.tone}: <strong>${word.pinyin}</strong>`;
        feedback.className = 'tones-feedback visible incorrect';

        // Record attempt
        recordSpeakingAttempt(currentLesson.id, tonesWordIndex, 0, false);
    }

    // Show next button
    nextContainer.style.display = 'flex';
    updateTonesProgress();
}

function nextToneWord() {
    tonesWordIndex++;

    if (tonesWordIndex >= currentLesson.words.length) {
        showTonesComplete();
    } else {
        renderToneWord();
        updateTonesProgress();
    }
}

function updateTonesProgress() {
    const total = currentLesson.words.length;
    const completed = tonesWordIndex;
    const percent = (completed / total) * 100;

    document.getElementById('tonesProgressFill').style.width = `${percent}%`;
    document.getElementById('tonesProgressText').textContent = `${completed}/${total} completed`;
}

function showTonesComplete() {
    const container = document.getElementById('tonesContainer');
    const total = currentLesson.words.length;
    const score = Math.round((tonesCorrectCount / total) * 100);

    // Calculate time
    const timeSeconds = Math.round((Date.now() - tonesStartTime) / 1000);
    const minutes = Math.floor(timeSeconds / 60);
    const seconds = timeSeconds % 60;
    const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    // Mark daily activity as completed if this is a daily lesson
    if (currentDay && score >= 50) {
        markActivityCompleted(currentDay.day, currentActivityIndex);
    }

    container.innerHTML = `
        <div class="matching-complete">
            <div class="complete-icon">${score >= 80 ? '🏆' : score >= 50 ? '🎉' : '📚'}</div>
            <h3>${score >= 80 ? 'Excellent!' : score >= 50 ? 'Good job!' : 'Keep practicing!'}</h3>
            <p>You got <strong>${tonesCorrectCount}/${total}</strong> tones correct</p>
            <p>Score: <strong>${score}%</strong></p>
            <p class="best-time">Time: ${timeDisplay}</p>
            <div class="complete-actions">
                ${getNextActivityButton()}
                <button class="primary-button" onclick="restartTones()">Practice Again</button>
                <button class="secondary-button" onclick="showMenu()">Back to Lessons</button>
            </div>
        </div>
    `;

    // Update progress bar to 100%
    document.getElementById('tonesProgressFill').style.width = '100%';
    document.getElementById('tonesProgressText').textContent = `${total}/${total} completed`;
}

function restartTones() {
    initTonesLesson();
}

// ============================================
// Sentence Ordering Lesson Logic
// ============================================

let orderingSentenceIndex = 0;
let orderingCorrectCount = 0;
let orderingStartTime = null;
let orderingSelectedWords = [];

function initOrderingLesson() {
    // Reset state
    orderingSentenceIndex = 0;
    orderingCorrectCount = 0;
    orderingStartTime = Date.now();
    orderingSelectedWords = [];

    // Update lesson title with pinyin
    const titlePinyin = currentLesson.titlePinyin ? ` <span class="title-pinyin">(${currentLesson.titlePinyin})</span>` : '';
    document.getElementById('lessonTitle').innerHTML =
        `${currentLesson.icon} ${currentLesson.titleChinese}${titlePinyin}`;

    renderOrderingSentence();
    updateOrderingProgress();
}

function renderOrderingSentence() {
    const container = document.getElementById('orderingContainer');
    const sentence = currentLesson.sentences[orderingSentenceIndex];

    // Reset selected words
    orderingSelectedWords = [];

    // Shuffle the words
    const shuffledWords = [...sentence.words];
    shuffleArray(shuffledWords);

    container.innerHTML = `
        <div class="ordering-card">
            <div class="ordering-english">${sentence.english}</div>
            <div class="ordering-hint">${sentence.pinyin}</div>
        </div>

        <div class="ordering-instruction">
            Tap words in order to form the sentence
        </div>

        <div class="ordering-slots" id="orderingSlots">
            <div class="ordering-placeholder">Tap words below to build sentence</div>
        </div>

        <div class="ordering-words" id="orderingWords">
            ${shuffledWords.map((word, i) => `
                <button class="ordering-word" data-word="${escapeHtml(word)}" data-original-index="${i}"
                        onclick="selectOrderingWord('${escapeHtml(word)}', this)">
                    ${word}
                </button>
            `).join('')}
        </div>

        <div id="orderingFeedback" class="ordering-feedback"></div>

        <div class="ordering-actions">
            <button class="secondary-button" onclick="clearOrdering()">Clear</button>
            <button class="primary-button" onclick="checkOrdering()">Check Answer</button>
        </div>

        <div class="ordering-next" id="orderingNextContainer" style="display: none;">
            <button class="primary-button" onclick="nextOrderingSentence()">
                Next Sentence →
            </button>
        </div>
    `;
}

function selectOrderingWord(word, buttonEl) {
    // Check if already used
    if (buttonEl.classList.contains('used')) return;

    // Add to selected words
    orderingSelectedWords.push(word);
    buttonEl.classList.add('used');

    // Update slots display
    updateOrderingSlots();
}

function removeOrderingWord(index) {
    const removedWord = orderingSelectedWords[index];
    orderingSelectedWords.splice(index, 1);

    // Find and re-enable the button
    const buttons = document.querySelectorAll('.ordering-word');
    for (const btn of buttons) {
        if (btn.dataset.word === removedWord && btn.classList.contains('used')) {
            btn.classList.remove('used');
            break;
        }
    }

    updateOrderingSlots();
}

function updateOrderingSlots() {
    const slotsContainer = document.getElementById('orderingSlots');

    if (orderingSelectedWords.length === 0) {
        slotsContainer.innerHTML = '<div class="ordering-placeholder">Tap words below to build sentence</div>';
    } else {
        slotsContainer.innerHTML = orderingSelectedWords.map((word, i) => `
            <span class="ordering-slot" onclick="removeOrderingWord(${i})">${word}</span>
        `).join('');
    }
}

function clearOrdering() {
    orderingSelectedWords = [];

    // Re-enable all word buttons
    document.querySelectorAll('.ordering-word').forEach(btn => {
        btn.classList.remove('used');
    });

    updateOrderingSlots();

    // Clear feedback
    document.getElementById('orderingFeedback').className = 'ordering-feedback';
}

function checkOrdering() {
    const sentence = currentLesson.sentences[orderingSentenceIndex];
    const feedback = document.getElementById('orderingFeedback');
    const nextContainer = document.getElementById('orderingNextContainer');

    // Check if answer matches
    const userAnswer = orderingSelectedWords.join('');
    const correctAnswer = sentence.words.join('');
    const isCorrect = userAnswer === correctAnswer;

    // Disable word buttons
    document.querySelectorAll('.ordering-word').forEach(btn => {
        btn.classList.add('disabled');
    });

    // Disable slot clicking
    document.querySelectorAll('.ordering-slot').forEach(slot => {
        slot.style.pointerEvents = 'none';
    });

    if (isCorrect) {
        orderingCorrectCount++;
        document.getElementById('orderingSlots').classList.add('correct');
        feedback.textContent = '✓ Correct!';
        feedback.className = 'ordering-feedback visible correct';

        // Record progress
        recordSpeakingAttempt(currentLesson.id, orderingSentenceIndex, 100, true);
    } else {
        document.getElementById('orderingSlots').classList.add('incorrect');
        feedback.innerHTML = `✗ The correct order was: <strong>${sentence.words.join('')}</strong>`;
        feedback.className = 'ordering-feedback visible incorrect';

        // Record attempt
        recordSpeakingAttempt(currentLesson.id, orderingSentenceIndex, 0, false);
    }

    // Hide action buttons, show next
    document.querySelector('.ordering-actions').style.display = 'none';
    nextContainer.style.display = 'flex';
    updateOrderingProgress();
}

function nextOrderingSentence() {
    orderingSentenceIndex++;

    if (orderingSentenceIndex >= currentLesson.sentences.length) {
        showOrderingComplete();
    } else {
        renderOrderingSentence();
        updateOrderingProgress();
    }
}

function updateOrderingProgress() {
    const total = currentLesson.sentences.length;
    const completed = orderingSentenceIndex;
    const percent = (completed / total) * 100;

    document.getElementById('orderingProgressFill').style.width = `${percent}%`;
    document.getElementById('orderingProgressText').textContent = `${completed}/${total} completed`;
}

function showOrderingComplete() {
    const container = document.getElementById('orderingContainer');
    const total = currentLesson.sentences.length;
    const score = Math.round((orderingCorrectCount / total) * 100);

    // Calculate time
    const timeSeconds = Math.round((Date.now() - orderingStartTime) / 1000);
    const minutes = Math.floor(timeSeconds / 60);
    const seconds = timeSeconds % 60;
    const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    // Mark daily activity as completed if this is a daily lesson
    if (currentDay && score >= 50) {
        markActivityCompleted(currentDay.day, currentActivityIndex);
    }

    container.innerHTML = `
        <div class="matching-complete">
            <div class="complete-icon">${score >= 80 ? '🏆' : score >= 50 ? '🎉' : '📚'}</div>
            <h3>${score >= 80 ? 'Excellent!' : score >= 50 ? 'Good job!' : 'Keep practicing!'}</h3>
            <p>You got <strong>${orderingCorrectCount}/${total}</strong> sentences correct</p>
            <p>Score: <strong>${score}%</strong></p>
            <p class="best-time">Time: ${timeDisplay}</p>
            <div class="complete-actions">
                ${getNextActivityButton()}
                <button class="primary-button" onclick="restartOrdering()">Practice Again</button>
                <button class="secondary-button" onclick="showMenu()">Back to Lessons</button>
            </div>
        </div>
    `;

    // Update progress bar to 100%
    document.getElementById('orderingProgressFill').style.width = '100%';
    document.getElementById('orderingProgressText').textContent = `${total}/${total} completed`;
}

function restartOrdering() {
    initOrderingLesson();
}

// ============================================
// Word Introduction Lesson Logic
// ============================================

let introWordIndex = 0;

function initIntroLesson() {
    // Reset state
    introWordIndex = 0;

    // Update lesson title with pinyin
    const titlePinyin = currentLesson.titlePinyin ? ` <span class="title-pinyin">(${currentLesson.titlePinyin})</span>` : '';
    document.getElementById('lessonTitle').innerHTML =
        `${currentLesson.icon} ${currentLesson.titleChinese}${titlePinyin}`;

    renderIntroWord();
    updateIntroProgress();
}

function renderIntroWord() {
    const container = document.getElementById('introContainer');
    const vocab = currentLesson.vocabulary || currentLesson.words || [];
    const word = vocab[introWordIndex];

    if (!word) {
        showIntroComplete();
        return;
    }

    // Build sentence HTML with highlighted word
    let sentenceHtml = '';
    let sentencePinyin = '';
    let sentenceEnglish = '';

    if (word.sentence) {
        // Highlight the word in the sentence
        sentenceHtml = word.sentence.replace(
            word.word,
            `<span class="highlight">${word.word}</span>`
        );
        sentencePinyin = word.sentencePinyin || '';
        sentenceEnglish = word.sentenceEnglish || '';
    }

    container.innerHTML = `
        <div class="intro-card">
            <div class="intro-word">${word.word}</div>
            <div class="intro-pinyin">${word.pinyin}</div>
            <div class="intro-english">${word.english}</div>
            <button class="intro-listen-btn" onclick="speakIntroWord()">
                🔊 Listen to Word
            </button>

            ${word.sentence ? `
                <div class="intro-sentence-card">
                    <div class="intro-sentence-label">Example Sentence</div>
                    <div class="intro-sentence-chinese">${sentenceHtml}</div>
                    <div class="intro-sentence-pinyin">${sentencePinyin}</div>
                    <div class="intro-sentence-english">${sentenceEnglish}</div>
                    <button class="intro-listen-sentence" onclick="speakIntroSentence()">
                        🔊 Listen to Sentence
                    </button>
                </div>
            ` : ''}
        </div>

        <div class="intro-nav">
            <button class="intro-next-btn" onclick="nextIntroWord()">
                ${introWordIndex < vocab.length - 1 ? 'Next Word →' : 'Complete ✓'}
            </button>
        </div>
    `;

    // Auto-play the word
    setTimeout(() => speakIntroWord(), 300);
}

function speakIntroWord() {
    const vocab = currentLesson.vocabulary || currentLesson.words || [];
    const word = vocab[introWordIndex];

    if ('speechSynthesis' in window && word) {
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(word.word);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.7;

        const voices = speechSynthesis.getVoices();
        const chineseVoice = voices.find(v => v.lang.startsWith('zh'));
        if (chineseVoice) {
            utterance.voice = chineseVoice;
        }

        speechSynthesis.speak(utterance);
    }
}

function speakIntroSentence() {
    const vocab = currentLesson.vocabulary || currentLesson.words || [];
    const word = vocab[introWordIndex];

    if ('speechSynthesis' in window && word && word.sentence) {
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(word.sentence);
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

function nextIntroWord() {
    const vocab = currentLesson.vocabulary || currentLesson.words || [];
    introWordIndex++;

    if (introWordIndex >= vocab.length) {
        showIntroComplete();
    } else {
        renderIntroWord();
        updateIntroProgress();
    }
}

function updateIntroProgress() {
    const vocab = currentLesson.vocabulary || currentLesson.words || [];
    const total = vocab.length;
    const completed = introWordIndex;
    const percent = (completed / total) * 100;

    document.getElementById('introProgressFill').style.width = `${percent}%`;
    document.getElementById('introProgressText').textContent = `${completed}/${total} words`;
}

function showIntroComplete() {
    const container = document.getElementById('introContainer');
    const vocab = currentLesson.vocabulary || currentLesson.words || [];

    // Mark daily activity as completed
    if (currentDay) {
        markActivityCompleted(currentDay.day, currentActivityIndex);
    }

    const nextActivity = getNextActivity();

    container.innerHTML = `
        <div class="matching-complete">
            <div class="complete-icon">📚</div>
            <h3>Words Learned!</h3>
            <p>You've reviewed <strong>${vocab.length}</strong> new words</p>
            <p>Now practice using them in the next activities!</p>
            <div class="complete-actions">
                ${nextActivity ? `
                    <button class="next-activity-btn" onclick="goToNextActivity()">
                        Continue: ${nextActivity.title} →
                    </button>
                ` : ''}
                <button class="primary-button" onclick="restartIntro()">Review Again</button>
                <button class="secondary-button" onclick="showMenu()">Back to Lessons</button>
            </div>
        </div>
    `;

    // Update progress to 100%
    document.getElementById('introProgressFill').style.width = '100%';
    document.getElementById('introProgressText').textContent = `${vocab.length}/${vocab.length} words`;
}

function restartIntro() {
    initIntroLesson();
}

// ============================================
// Next Activity Navigation
// ============================================

function getNextActivity() {
    if (!currentDay) return null;

    const nextIndex = currentActivityIndex + 1;
    if (nextIndex < currentDay.activities.length) {
        return {
            dayIndex: window.DAILY_CURRICULUM.indexOf(currentDay),
            activityIndex: nextIndex,
            title: currentDay.activities[nextIndex].title,
            type: currentDay.activities[nextIndex].type
        };
    }

    // Check if there's a next day
    const currentDayIndex = window.DAILY_CURRICULUM.indexOf(currentDay);
    if (currentDayIndex < window.DAILY_CURRICULUM.length - 1) {
        const nextDay = window.DAILY_CURRICULUM[currentDayIndex + 1];
        return {
            dayIndex: currentDayIndex + 1,
            activityIndex: 0,
            title: `Day ${nextDay.day}: ${nextDay.activities[0].title}`,
            type: nextDay.activities[0].type,
            isNextDay: true
        };
    }

    return null;
}

function goToNextActivity() {
    const next = getNextActivity();
    if (next) {
        startDailyActivity(next.dayIndex, next.activityIndex, false);
    } else {
        showMenu();
    }
}

function getNextActivityButton() {
    const next = getNextActivity();
    if (!next) return '';

    return `
        <button class="next-activity-btn" onclick="goToNextActivity()">
            ${next.isNextDay ? 'Start ' : 'Continue: '}${next.title} →
        </button>
    `;
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
window.selectListeningChoice = selectListeningChoice;
window.nextListeningQuestion = nextListeningQuestion;
window.restartListening = restartListening;
window.speakListeningAudio = speakListeningAudio;
window.selectTone = selectTone;
window.nextToneWord = nextToneWord;
window.restartTones = restartTones;
window.speakToneWord = speakToneWord;
window.selectOrderingWord = selectOrderingWord;
window.removeOrderingWord = removeOrderingWord;
window.clearOrdering = clearOrdering;
window.checkOrdering = checkOrdering;
window.nextOrderingSentence = nextOrderingSentence;
window.restartOrdering = restartOrdering;

// Profile and Daily Lessons exports
window.selectAvatar = selectAvatar;
window.selectName = selectName;
window.completeProfileSetup = completeProfileSetup;
window.showProfileSetup = showProfileSetup;
window.toggleDayCard = toggleDayCard;
window.startDailyActivity = startDailyActivity;
window.startTodaysPractice = startTodaysPractice;

// Intro lesson exports
window.speakIntroWord = speakIntroWord;
window.speakIntroSentence = speakIntroSentence;
window.nextIntroWord = nextIntroWord;
window.restartIntro = restartIntro;
window.goToNextActivity = goToNextActivity;
