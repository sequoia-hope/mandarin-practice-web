// localStorage-based progress tracking for Mandarin Practice App

const STORAGE_KEY = 'mandarin-practice-progress';
const PROFILE_KEY = 'mandarin-practice-profile';

// ============================================
// User Profile
// ============================================

/**
 * Available Chinese names for users to choose from
 * These are common names that work well with ASR
 */
export const CHINESE_NAMES = [
    { chinese: '小明', pinyin: 'Xiǎo Míng', english: 'Little Bright' },
    { chinese: '小红', pinyin: 'Xiǎo Hóng', english: 'Little Red' },
    { chinese: '小华', pinyin: 'Xiǎo Huá', english: 'Little China' },
    { chinese: '小龙', pinyin: 'Xiǎo Lóng', english: 'Little Dragon' },
    { chinese: '小美', pinyin: 'Xiǎo Měi', english: 'Little Beautiful' },
    { chinese: '大卫', pinyin: 'Dà Wèi', english: 'David' },
    { chinese: '安娜', pinyin: 'Ān Nà', english: 'Anna' },
    { chinese: '杰克', pinyin: 'Jié Kè', english: 'Jack' },
    { chinese: '丽丽', pinyin: 'Lì Lì', english: 'Lily' },
    { chinese: '明明', pinyin: 'Míng Míng', english: 'Bright' },
    { chinese: '天天', pinyin: 'Tiān Tiān', english: 'Every Day' },
    { chinese: '乐乐', pinyin: 'Lè Lè', english: 'Happy' },
];

/**
 * Available avatar emojis
 */
export const AVATAR_EMOJIS = [
    '😊', '😎', '🤓', '🧑‍🎓', '👨‍💼', '👩‍💼',
    '🐼', '🐉', '🦊', '🐱', '🐶', '🦁',
    '🌸', '🌺', '🎋', '🏮', '🎎', '🧧',
    '⭐', '🌙', '☀️', '🌈', '🎯', '🏆',
];

/**
 * Get default user profile
 */
function getDefaultProfile() {
    return {
        avatar: null,
        chineseName: null,
        setupComplete: false,
        createdAt: null
    };
}

/**
 * Load user profile from localStorage
 * @returns {Object} User profile
 */
export function loadProfile() {
    try {
        const stored = localStorage.getItem(PROFILE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
    return getDefaultProfile();
}

/**
 * Save user profile to localStorage
 * @param {Object} profile - Profile data to save
 */
export function saveProfile(profile) {
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
        console.error('Error saving profile:', error);
    }
}

/**
 * Check if user has completed profile setup
 * @returns {boolean}
 */
export function isProfileSetup() {
    const profile = loadProfile();
    return profile.setupComplete && profile.avatar && profile.chineseName;
}

/**
 * Complete profile setup
 * @param {string} avatar - Emoji avatar
 * @param {string} chineseName - Chinese name
 */
export function setupProfile(avatar, chineseName) {
    const profile = {
        avatar,
        chineseName,
        setupComplete: true,
        createdAt: new Date().toISOString()
    };
    saveProfile(profile);
    return profile;
}

/**
 * Get the user's Chinese name object
 * @returns {Object|null} Name object with chinese, pinyin, english
 */
export function getUserName() {
    const profile = loadProfile();
    if (!profile.chineseName) return null;
    return CHINESE_NAMES.find(n => n.chinese === profile.chineseName) || {
        chinese: profile.chineseName,
        pinyin: '',
        english: ''
    };
}

// ============================================
// Progress Tracking
// ============================================

/**
 * Default progress structure
 */
function getDefaultProgress() {
    return {
        version: 1,
        createdAt: new Date().toISOString(),
        lastPracticeDate: null,
        streakDays: 0,
        totalPracticeTime: 0, // seconds
        lessons: {}
    };
}

/**
 * Load progress from localStorage
 * @returns {Object} Progress data
 */
export function loadProgress() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            // Migrate if needed (for future version updates)
            return migrateProgress(data);
        }
    } catch (error) {
        console.error('Error loading progress:', error);
    }
    return getDefaultProgress();
}

/**
 * Save progress to localStorage
 * @param {Object} progress - Progress data to save
 */
export function saveProgress(progress) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

/**
 * Migrate progress data if schema changes
 * @param {Object} data - Stored progress data
 * @returns {Object} Migrated progress data
 */
function migrateProgress(data) {
    // Future migrations can be added here
    if (!data.version) {
        data.version = 1;
    }
    if (!data.lessons) {
        data.lessons = {};
    }
    return data;
}

/**
 * Get or create lesson progress
 * @param {Object} progress - Full progress object
 * @param {number} lessonId - Lesson ID
 * @returns {Object} Lesson progress
 */
export function getLessonProgress(progress, lessonId) {
    if (!progress.lessons[lessonId]) {
        progress.lessons[lessonId] = {
            completedPhrases: [],  // Array of phrase indices that were passed
            bestScores: {},        // { phraseIndex: bestScore }
            attempts: 0,
            matchCompleted: false, // For matching lessons
            bestMatchTime: null,   // Best time in seconds for matching
            lastAccessed: null
        };
    }
    return progress.lessons[lessonId];
}

/**
 * Record a speaking attempt
 * @param {number} lessonId - Lesson ID
 * @param {number} phraseIndex - Phrase index
 * @param {number} score - Score (0-100)
 * @param {boolean} passed - Whether the attempt passed
 */
export function recordSpeakingAttempt(lessonId, phraseIndex, score, passed) {
    const progress = loadProgress();
    const lessonProgress = getLessonProgress(progress, lessonId);

    // Update attempts
    lessonProgress.attempts++;
    lessonProgress.lastAccessed = new Date().toISOString();

    // Update best score
    const currentBest = lessonProgress.bestScores[phraseIndex] || 0;
    if (score > currentBest) {
        lessonProgress.bestScores[phraseIndex] = score;
    }

    // Track completed phrases
    if (passed && !lessonProgress.completedPhrases.includes(phraseIndex)) {
        lessonProgress.completedPhrases.push(phraseIndex);
    }

    // Update streak
    updateStreak(progress);

    saveProgress(progress);
    return progress;
}

/**
 * Record a matching lesson completion
 * @param {number} lessonId - Lesson ID
 * @param {number} timeSeconds - Time taken in seconds
 */
export function recordMatchingCompletion(lessonId, timeSeconds) {
    const progress = loadProgress();
    const lessonProgress = getLessonProgress(progress, lessonId);

    lessonProgress.matchCompleted = true;
    lessonProgress.attempts++;
    lessonProgress.lastAccessed = new Date().toISOString();

    // Track best time
    if (lessonProgress.bestMatchTime === null || timeSeconds < lessonProgress.bestMatchTime) {
        lessonProgress.bestMatchTime = timeSeconds;
    }

    // Update streak
    updateStreak(progress);

    saveProgress(progress);
    return progress;
}

/**
 * Update the practice streak
 * @param {Object} progress - Progress object
 */
function updateStreak(progress) {
    const today = new Date().toISOString().split('T')[0];
    const lastPractice = progress.lastPracticeDate;

    if (lastPractice === today) {
        // Already practiced today, no change
        return;
    }

    if (lastPractice) {
        const lastDate = new Date(lastPractice);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            // Consecutive day - increase streak
            progress.streakDays++;
        } else if (diffDays > 1) {
            // Streak broken - reset to 1
            progress.streakDays = 1;
        }
    } else {
        // First practice
        progress.streakDays = 1;
    }

    progress.lastPracticeDate = today;
}

/**
 * Get overall stats
 * @returns {Object} Stats object
 */
export function getStats() {
    const progress = loadProgress();

    let totalCompleted = 0;
    let totalAttempts = 0;
    let lessonsStarted = 0;
    let lessonsCompleted = 0;

    for (const lessonId in progress.lessons) {
        const lesson = progress.lessons[lessonId];
        lessonsStarted++;
        totalAttempts += lesson.attempts;
        totalCompleted += lesson.completedPhrases.length;

        // A lesson is "completed" if all phrases passed or matching completed
        if (lesson.matchCompleted || lesson.completedPhrases.length > 0) {
            // We'd need phrase count to determine full completion
            // For now, count as completed if any progress
        }
    }

    return {
        streakDays: progress.streakDays,
        lastPracticeDate: progress.lastPracticeDate,
        totalAttempts,
        totalCompleted,
        lessonsStarted
    };
}

/**
 * Clear all progress (for testing/reset)
 */
export function clearProgress() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export progress as JSON (for backup)
 * @returns {string} JSON string
 */
export function exportProgress() {
    return localStorage.getItem(STORAGE_KEY) || JSON.stringify(getDefaultProgress());
}

/**
 * Import progress from JSON (for restore)
 * @param {string} jsonString - JSON string to import
 */
export function importProgress(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        saveProgress(migrateProgress(data));
        return true;
    } catch (error) {
        console.error('Error importing progress:', error);
        return false;
    }
}
