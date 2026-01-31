// Daily Curriculum - Progressive lesson plans combining multiple activity types
// Each "day" is a themed unit with vocabulary, listening, tones, and speaking practice

/**
 * Daily curriculum structure:
 * Each day has a theme and contains multiple activities that build on each other:
 * 1. vocabulary - Introduce new words (matching game)
 * 2. tones - Practice tones for key words
 * 3. listening - Listen and identify phrases
 * 4. cloze - Fill in blanks to reinforce vocabulary
 * 5. speaking - Speak full phrases
 */

const DAILY_CURRICULUM = [
    // ============================================
    // Day 1: Hello & Greetings
    // ============================================
    {
        day: 1,
        title: "Hello & Greetings",
        titleChinese: "你好",
        titlePinyin: "nǐ hǎo",
        icon: "👋",
        theme: "greetings",
        description: "Learn basic greetings and introductions",

        // Core vocabulary for this day
        vocabulary: [
            { word: "你好", pinyin: "nǐ hǎo", english: "hello", tone: 3 },
            { word: "你", pinyin: "nǐ", english: "you", tone: 3 },
            { word: "好", pinyin: "hǎo", english: "good", tone: 3 },
            { word: "我", pinyin: "wǒ", english: "I/me", tone: 3 },
            { word: "谢谢", pinyin: "xièxiè", english: "thank you", tone: 4 },
            { word: "再见", pinyin: "zàijiàn", english: "goodbye", tone: 4 },
        ],

        activities: [
            {
                type: "matching",
                title: "Learn the Words",
                description: "Match characters to pinyin",
                phrases: [
                    { characters: "你好", pinyin: "nǐ hǎo", english: "hello" },
                    { characters: "你", pinyin: "nǐ", english: "you" },
                    { characters: "好", pinyin: "hǎo", english: "good" },
                    { characters: "我", pinyin: "wǒ", english: "I/me" },
                    { characters: "谢谢", pinyin: "xièxiè", english: "thank you" },
                    { characters: "再见", pinyin: "zàijiàn", english: "goodbye" },
                ]
            },
            {
                type: "tones",
                title: "Tone Practice",
                description: "Identify the tones",
                words: [
                    { character: "你", pinyin: "nǐ", english: "you", tone: 3 },
                    { character: "好", pinyin: "hǎo", english: "good", tone: 3 },
                    { character: "我", pinyin: "wǒ", english: "I/me", tone: 3 },
                    { character: "谢", pinyin: "xiè", english: "thank", tone: 4 },
                    { character: "见", pinyin: "jiàn", english: "see", tone: 4 },
                ]
            },
            {
                type: "listening",
                title: "Listen & Choose",
                description: "Listen and pick what you heard",
                questions: [
                    { audio: "你好", pinyin: "nǐ hǎo", correct: "你好", choices: ["你好", "你们", "我好", "他好"] },
                    { audio: "谢谢", pinyin: "xièxiè", correct: "谢谢", choices: ["谢谢", "对不起", "再见", "你好"] },
                    { audio: "再见", pinyin: "zàijiàn", correct: "再见", choices: ["再见", "你好", "谢谢", "早上"] },
                ]
            },
            {
                type: "speaking",
                title: "Speak",
                description: "Practice speaking",
                phrases: [
                    { characters: "你好", pinyin: "nǐ hǎo", english: "Hello" },
                    { characters: "谢谢", pinyin: "xièxiè", english: "Thank you" },
                    { characters: "再见", pinyin: "zàijiàn", english: "Goodbye" },
                ]
            }
        ]
    },

    // ============================================
    // Day 2: Introductions
    // ============================================
    {
        day: 2,
        title: "What's Your Name?",
        titleChinese: "你叫什么",
        titlePinyin: "nǐ jiào shénme",
        icon: "🙋",
        theme: "introductions",
        description: "Learn to introduce yourself and ask names",

        vocabulary: [
            { word: "叫", pinyin: "jiào", english: "to be called", tone: 4 },
            { word: "什么", pinyin: "shénme", english: "what", tone: 2 },
            { word: "名字", pinyin: "míngzì", english: "name", tone: 2 },
            { word: "是", pinyin: "shì", english: "to be", tone: 4 },
            { word: "很", pinyin: "hěn", english: "very", tone: 3 },
            { word: "高兴", pinyin: "gāoxìng", english: "happy", tone: 1 },
        ],

        activities: [
            {
                type: "matching",
                title: "Learn the Words",
                description: "Match characters to pinyin",
                phrases: [
                    { characters: "叫", pinyin: "jiào", english: "to be called" },
                    { characters: "什么", pinyin: "shénme", english: "what" },
                    { characters: "名字", pinyin: "míngzì", english: "name" },
                    { characters: "是", pinyin: "shì", english: "to be" },
                    { characters: "很", pinyin: "hěn", english: "very" },
                    { characters: "高兴", pinyin: "gāoxìng", english: "happy" },
                ]
            },
            {
                type: "tones",
                title: "Tone Practice",
                description: "Identify the tones",
                words: [
                    { character: "叫", pinyin: "jiào", english: "to be called", tone: 4 },
                    { character: "什", pinyin: "shén", english: "what", tone: 2 },
                    { character: "是", pinyin: "shì", english: "to be", tone: 4 },
                    { character: "很", pinyin: "hěn", english: "very", tone: 3 },
                    { character: "高", pinyin: "gāo", english: "high/tall", tone: 1 },
                ]
            },
            {
                type: "cloze",
                title: "Fill in the Blank",
                description: "Complete the sentences",
                sentences: [
                    {
                        template: "我{0}{{NAME}}",
                        answers: ["叫"],
                        distractors: ["是", "很"],
                        pinyin: "wǒ jiào {{NAME}}",
                        english: "My name is {{NAME}}"
                    },
                    {
                        template: "你叫{0}名字",
                        answers: ["什么"],
                        distractors: ["很", "是"],
                        pinyin: "nǐ jiào shénme míngzì",
                        english: "What is your name?"
                    },
                ]
            },
            {
                type: "speaking",
                title: "Speak",
                description: "Practice speaking",
                // Note: {{NAME}} will be replaced with user's chosen Chinese name
                phrases: [
                    { characters: "我叫{{NAME}}", pinyin: "wǒ jiào {{NAME_PINYIN}}", english: "My name is {{NAME_ENGLISH}}" },
                    { characters: "你叫什么名字", pinyin: "nǐ jiào shénme míngzì", english: "What is your name?" },
                    { characters: "很高兴认识你", pinyin: "hěn gāoxìng rènshí nǐ", english: "Nice to meet you" },
                ]
            }
        ]
    },

    // ============================================
    // Day 3: Numbers 1-10
    // ============================================
    {
        day: 3,
        title: "Numbers 1-10",
        titleChinese: "数字",
        titlePinyin: "shùzì",
        icon: "🔢",
        theme: "numbers",
        description: "Learn to count from 1 to 10",

        vocabulary: [
            { word: "一", pinyin: "yī", english: "one", tone: 1 },
            { word: "二", pinyin: "èr", english: "two", tone: 4 },
            { word: "三", pinyin: "sān", english: "three", tone: 1 },
            { word: "四", pinyin: "sì", english: "four", tone: 4 },
            { word: "五", pinyin: "wǔ", english: "five", tone: 3 },
            { word: "六", pinyin: "liù", english: "six", tone: 4 },
            { word: "七", pinyin: "qī", english: "seven", tone: 1 },
            { word: "八", pinyin: "bā", english: "eight", tone: 1 },
            { word: "九", pinyin: "jiǔ", english: "nine", tone: 3 },
            { word: "十", pinyin: "shí", english: "ten", tone: 2 },
        ],

        activities: [
            {
                type: "matching",
                title: "Learn the Numbers",
                description: "Match numbers to pinyin",
                phrases: [
                    { characters: "一", pinyin: "yī", english: "one" },
                    { characters: "二", pinyin: "èr", english: "two" },
                    { characters: "三", pinyin: "sān", english: "three" },
                    { characters: "四", pinyin: "sì", english: "four" },
                    { characters: "五", pinyin: "wǔ", english: "five" },
                    { characters: "六", pinyin: "liù", english: "six" },
                    { characters: "七", pinyin: "qī", english: "seven" },
                    { characters: "八", pinyin: "bā", english: "eight" },
                    { characters: "九", pinyin: "jiǔ", english: "nine" },
                    { characters: "十", pinyin: "shí", english: "ten" },
                ]
            },
            {
                type: "tones",
                title: "Tone Practice",
                description: "Numbers have different tones!",
                words: [
                    { character: "一", pinyin: "yī", english: "one", tone: 1 },
                    { character: "二", pinyin: "èr", english: "two", tone: 4 },
                    { character: "三", pinyin: "sān", english: "three", tone: 1 },
                    { character: "四", pinyin: "sì", english: "four", tone: 4 },
                    { character: "五", pinyin: "wǔ", english: "five", tone: 3 },
                    { character: "十", pinyin: "shí", english: "ten", tone: 2 },
                ]
            },
            {
                type: "listening",
                title: "Listen & Choose",
                description: "Listen for the number",
                questions: [
                    { audio: "三", pinyin: "sān", correct: "三", choices: ["一", "三", "四", "七"] },
                    { audio: "八", pinyin: "bā", correct: "八", choices: ["八", "二", "六", "九"] },
                    { audio: "五", pinyin: "wǔ", correct: "五", choices: ["四", "五", "九", "十"] },
                    { audio: "十", pinyin: "shí", correct: "十", choices: ["二", "四", "七", "十"] },
                ]
            },
            {
                type: "speaking",
                title: "Speak",
                description: "Say the numbers",
                phrases: [
                    { characters: "一二三", pinyin: "yī èr sān", english: "One two three" },
                    { characters: "四五六", pinyin: "sì wǔ liù", english: "Four five six" },
                    { characters: "七八九十", pinyin: "qī bā jiǔ shí", english: "Seven eight nine ten" },
                ]
            }
        ]
    },

    // ============================================
    // Day 4: Family Members
    // ============================================
    {
        day: 4,
        title: "My Family",
        titleChinese: "我的家人",
        titlePinyin: "wǒ de jiārén",
        icon: "👨‍👩‍👧",
        theme: "family",
        description: "Learn words for family members",

        vocabulary: [
            { word: "家", pinyin: "jiā", english: "home/family", tone: 1 },
            { word: "爸爸", pinyin: "bàba", english: "father", tone: 4 },
            { word: "妈妈", pinyin: "māma", english: "mother", tone: 1 },
            { word: "哥哥", pinyin: "gēge", english: "older brother", tone: 1 },
            { word: "姐姐", pinyin: "jiějie", english: "older sister", tone: 3 },
            { word: "弟弟", pinyin: "dìdi", english: "younger brother", tone: 4 },
            { word: "妹妹", pinyin: "mèimei", english: "younger sister", tone: 4 },
        ],

        activities: [
            {
                type: "matching",
                title: "Learn Family Words",
                description: "Match family members to pinyin",
                phrases: [
                    { characters: "家", pinyin: "jiā", english: "home/family" },
                    { characters: "爸爸", pinyin: "bàba", english: "father" },
                    { characters: "妈妈", pinyin: "māma", english: "mother" },
                    { characters: "哥哥", pinyin: "gēge", english: "older brother" },
                    { characters: "姐姐", pinyin: "jiějie", english: "older sister" },
                    { characters: "弟弟", pinyin: "dìdi", english: "younger brother" },
                    { characters: "妹妹", pinyin: "mèimei", english: "younger sister" },
                ]
            },
            {
                type: "tones",
                title: "Tone Practice",
                description: "Family word tones",
                words: [
                    { character: "家", pinyin: "jiā", english: "home", tone: 1 },
                    { character: "爸", pinyin: "bà", english: "dad", tone: 4 },
                    { character: "妈", pinyin: "mā", english: "mom", tone: 1 },
                    { character: "哥", pinyin: "gē", english: "brother", tone: 1 },
                    { character: "姐", pinyin: "jiě", english: "sister", tone: 3 },
                ]
            },
            {
                type: "listening",
                title: "Listen & Choose",
                description: "Who did you hear?",
                questions: [
                    { audio: "妈妈", pinyin: "māma", correct: "妈妈", choices: ["妈妈", "爸爸", "哥哥", "姐姐"] },
                    { audio: "哥哥", pinyin: "gēge", correct: "哥哥", choices: ["弟弟", "哥哥", "姐姐", "妹妹"] },
                    { audio: "妹妹", pinyin: "mèimei", correct: "妹妹", choices: ["妈妈", "姐姐", "妹妹", "弟弟"] },
                ]
            },
            {
                type: "speaking",
                title: "Speak",
                description: "Talk about family",
                phrases: [
                    { characters: "这是我爸爸", pinyin: "zhè shì wǒ bàba", english: "This is my father" },
                    { characters: "这是我妈妈", pinyin: "zhè shì wǒ māma", english: "This is my mother" },
                    { characters: "我有一个哥哥", pinyin: "wǒ yǒu yī gè gēge", english: "I have an older brother" },
                ]
            }
        ]
    },

    // ============================================
    // Day 5: Food & Drink
    // ============================================
    {
        day: 5,
        title: "Food & Drink",
        titleChinese: "吃喝",
        titlePinyin: "chī hē",
        icon: "🍜",
        theme: "food",
        description: "Learn words for food and drink",

        vocabulary: [
            { word: "吃", pinyin: "chī", english: "to eat", tone: 1 },
            { word: "喝", pinyin: "hē", english: "to drink", tone: 1 },
            { word: "水", pinyin: "shuǐ", english: "water", tone: 3 },
            { word: "茶", pinyin: "chá", english: "tea", tone: 2 },
            { word: "饭", pinyin: "fàn", english: "rice/meal", tone: 4 },
            { word: "菜", pinyin: "cài", english: "vegetables/dish", tone: 4 },
            { word: "好吃", pinyin: "hǎochī", english: "delicious", tone: 3 },
        ],

        activities: [
            {
                type: "matching",
                title: "Learn Food Words",
                description: "Match food to pinyin",
                phrases: [
                    { characters: "吃", pinyin: "chī", english: "to eat" },
                    { characters: "喝", pinyin: "hē", english: "to drink" },
                    { characters: "水", pinyin: "shuǐ", english: "water" },
                    { characters: "茶", pinyin: "chá", english: "tea" },
                    { characters: "饭", pinyin: "fàn", english: "rice/meal" },
                    { characters: "菜", pinyin: "cài", english: "dish" },
                    { characters: "好吃", pinyin: "hǎochī", english: "delicious" },
                ]
            },
            {
                type: "tones",
                title: "Tone Practice",
                description: "Food word tones",
                words: [
                    { character: "吃", pinyin: "chī", english: "eat", tone: 1 },
                    { character: "喝", pinyin: "hē", english: "drink", tone: 1 },
                    { character: "水", pinyin: "shuǐ", english: "water", tone: 3 },
                    { character: "茶", pinyin: "chá", english: "tea", tone: 2 },
                    { character: "饭", pinyin: "fàn", english: "rice", tone: 4 },
                ]
            },
            {
                type: "cloze",
                title: "Fill in the Blank",
                description: "Complete the sentences",
                sentences: [
                    {
                        template: "我要{0}水",
                        answers: ["喝"],
                        distractors: ["吃", "是"],
                        pinyin: "wǒ yào hē shuǐ",
                        english: "I want to drink water"
                    },
                    {
                        template: "这个菜很{0}",
                        answers: ["好吃"],
                        distractors: ["喝", "吃"],
                        pinyin: "zhège cài hěn hǎochī",
                        english: "This dish is delicious"
                    },
                ]
            },
            {
                type: "speaking",
                title: "Speak",
                description: "Talk about food",
                phrases: [
                    { characters: "我要喝水", pinyin: "wǒ yào hē shuǐ", english: "I want to drink water" },
                    { characters: "我要吃饭", pinyin: "wǒ yào chī fàn", english: "I want to eat" },
                    { characters: "很好吃", pinyin: "hěn hǎochī", english: "Very delicious" },
                ]
            }
        ]
    },

    // ============================================
    // Day 6: Where & Here/There
    // ============================================
    {
        day: 6,
        title: "Where Is It?",
        titleChinese: "在哪里",
        titlePinyin: "zài nǎlǐ",
        icon: "📍",
        theme: "location",
        description: "Learn to ask where things are",

        vocabulary: [
            { word: "在", pinyin: "zài", english: "at/in", tone: 4 },
            { word: "哪里", pinyin: "nǎlǐ", english: "where", tone: 3 },
            { word: "这里", pinyin: "zhèlǐ", english: "here", tone: 4 },
            { word: "那里", pinyin: "nàlǐ", english: "there", tone: 4 },
            { word: "去", pinyin: "qù", english: "to go", tone: 4 },
            { word: "来", pinyin: "lái", english: "to come", tone: 2 },
        ],

        activities: [
            {
                type: "matching",
                title: "Learn Location Words",
                description: "Match words to pinyin",
                phrases: [
                    { characters: "在", pinyin: "zài", english: "at/in" },
                    { characters: "哪里", pinyin: "nǎlǐ", english: "where" },
                    { characters: "这里", pinyin: "zhèlǐ", english: "here" },
                    { characters: "那里", pinyin: "nàlǐ", english: "there" },
                    { characters: "去", pinyin: "qù", english: "to go" },
                    { characters: "来", pinyin: "lái", english: "to come" },
                ]
            },
            {
                type: "tones",
                title: "Tone Practice",
                description: "Location word tones",
                words: [
                    { character: "在", pinyin: "zài", english: "at", tone: 4 },
                    { character: "哪", pinyin: "nǎ", english: "which/where", tone: 3 },
                    { character: "这", pinyin: "zhè", english: "this", tone: 4 },
                    { character: "那", pinyin: "nà", english: "that", tone: 4 },
                    { character: "去", pinyin: "qù", english: "go", tone: 4 },
                    { character: "来", pinyin: "lái", english: "come", tone: 2 },
                ]
            },
            {
                type: "listening",
                title: "Listen & Choose",
                description: "Listen for the location",
                questions: [
                    { audio: "这里", pinyin: "zhèlǐ", correct: "这里", choices: ["这里", "那里", "哪里", "在"] },
                    { audio: "你去哪里", pinyin: "nǐ qù nǎlǐ", correct: "你去哪里", choices: ["你去哪里", "你在哪里", "你来哪里", "他去哪里"] },
                ]
            },
            {
                type: "speaking",
                title: "Speak",
                description: "Ask about locations",
                phrases: [
                    { characters: "你在哪里", pinyin: "nǐ zài nǎlǐ", english: "Where are you?" },
                    { characters: "我在这里", pinyin: "wǒ zài zhèlǐ", english: "I am here" },
                    { characters: "你去哪里", pinyin: "nǐ qù nǎlǐ", english: "Where are you going?" },
                ]
            }
        ]
    },

    // ============================================
    // Day 7: Review Day 1-6
    // ============================================
    {
        day: 7,
        title: "Week 1 Review",
        titleChinese: "复习",
        titlePinyin: "fùxí",
        icon: "📚",
        theme: "review",
        description: "Review everything from days 1-6",

        vocabulary: [], // Review uses vocab from previous days

        activities: [
            {
                type: "listening",
                title: "Listening Review",
                description: "Review all phrases",
                questions: [
                    { audio: "你好", pinyin: "nǐ hǎo", correct: "你好", choices: ["你好", "再见", "谢谢", "你好吗"] },
                    { audio: "我叫什么", pinyin: "wǒ jiào shénme", correct: "我叫什么", choices: ["你叫什么", "我叫什么", "他叫什么", "什么名字"] },
                    { audio: "三四五", pinyin: "sān sì wǔ", correct: "三四五", choices: ["一二三", "三四五", "六七八", "四五六"] },
                    { audio: "爸爸妈妈", pinyin: "bàba māma", correct: "爸爸妈妈", choices: ["爸爸妈妈", "哥哥姐姐", "弟弟妹妹", "爷爷奶奶"] },
                    { audio: "我要喝水", pinyin: "wǒ yào hē shuǐ", correct: "我要喝水", choices: ["我要喝水", "我要吃饭", "我要喝茶", "你要喝水"] },
                ]
            },
            {
                type: "matching",
                title: "Vocabulary Review",
                description: "Match all the words you learned",
                phrases: [
                    { characters: "你好", pinyin: "nǐ hǎo", english: "hello" },
                    { characters: "谢谢", pinyin: "xièxiè", english: "thank you" },
                    { characters: "名字", pinyin: "míngzì", english: "name" },
                    { characters: "五", pinyin: "wǔ", english: "five" },
                    { characters: "妈妈", pinyin: "māma", english: "mother" },
                    { characters: "水", pinyin: "shuǐ", english: "water" },
                    { characters: "哪里", pinyin: "nǎlǐ", english: "where" },
                    { characters: "好吃", pinyin: "hǎochī", english: "delicious" },
                ]
            },
            {
                type: "speaking",
                title: "Speaking Review",
                description: "Practice key phrases",
                phrases: [
                    { characters: "你好，我叫{{NAME}}", pinyin: "nǐ hǎo, wǒ jiào {{NAME_PINYIN}}", english: "Hello, my name is {{NAME_ENGLISH}}" },
                    { characters: "很高兴认识你", pinyin: "hěn gāoxìng rènshí nǐ", english: "Nice to meet you" },
                    { characters: "谢谢，再见", pinyin: "xièxiè, zàijiàn", english: "Thank you, goodbye" },
                ]
            }
        ]
    },
];

// Make available globally
window.DAILY_CURRICULUM = DAILY_CURRICULUM;
