// Scoring service for Mandarin ASR Practice App

/**
 * Normalize Chinese text for comparison
 * Removes punctuation, spaces, and converts to consistent format
 */
function normalizeText(text) {
    // Remove common punctuation and whitespace
    const punctuation = /[\s。，？！、；：""''（）【】\.\,\?\!\;\:\"\'\(\)\[\]]/g;
    return text.replace(punctuation, '').toLowerCase();
}

/**
 * Calculate Longest Common Subsequence length
 * Used for checking character order
 */
function lcsLength(s1, s2) {
    const m = s1.length;
    const n = s2.length;
    
    if (m === 0 || n === 0) return 0;
    
    // Create DP table
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    
    return dp[m][n];
}

/**
 * Score the transcription against the expected phrase
 * 
 * @param {string} transcription - What the ASR heard
 * @param {string} expected - The target phrase
 * @returns {Object} Scoring result with score, pass/fail, and details
 */
function scoreTranscription(transcription, expected) {
    // Normalize both strings
    const normalizedTranscription = normalizeText(transcription);
    const normalizedExpected = normalizeText(expected);
    
    // Get character sets
    const transcribedChars = new Set(normalizedTranscription);
    const expectedChars = new Set(normalizedExpected);
    
    // Calculate matches
    const matchedChars = new Set([...transcribedChars].filter(c => expectedChars.has(c)));
    const missedChars = new Set([...expectedChars].filter(c => !transcribedChars.has(c)));
    const extraChars = new Set([...transcribedChars].filter(c => !expectedChars.has(c)));
    
    // Check if all expected characters are present
    const allExpectedPresent = missedChars.size === 0;
    
    // Check character order using LCS
    const lcs = lcsLength(normalizedTranscription, normalizedExpected);
    const orderScore = expectedChars.size === 0 ? 0 : lcs / normalizedExpected.length;
    
    // Calculate final score
    // - 60% weight on having all characters
    // - 40% weight on correct order
    const presenceScore = expectedChars.size === 0 ? 0 : matchedChars.size / expectedChars.size;
    const rawScore = (presenceScore * 0.6 + orderScore * 0.4) * 100;
    const score = Math.round(rawScore);
    
    // Pass only if 100% - all words matched
    const passed = allExpectedPresent && score === 100;
    
    // Generate feedback message
    let feedback;
    if (passed) {
        feedback = "完美! Perfect!";
    } else if (score >= 80) {
        feedback = "很好! Almost there!";
    } else if (score >= 50) {
        feedback = "加油! Keep practicing!";
    } else {
        feedback = "再试一次 Try again!";
    }
    
    return {
        score,
        passed,
        feedback,
        matchedCharacters: [...matchedChars],
        missedCharacters: [...missedChars],
        extraCharacters: [...extraChars]
    };
}
