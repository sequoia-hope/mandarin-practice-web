// Curriculum data for Mandarin ASR Practice App

// Lesson types:
// - "speaking" (default): Practice speaking phrases with ASR feedback
// - "matching": Match characters to their pinyin
// - "cloze": Fill-in-the-blank with audio and word choices

const CURRICULUM = [
    // Lesson 1: Introductions
    {
        id: 1,
        type: "speaking",
        title: "Introductions",
        titleChinese: "自我介绍",
        titlePinyin: "zìwǒ jièshào",
        icon: "👋",
        description: "Learn to introduce yourself",
        phrases: [
            { characters: "你好", pinyin: "nǐ hǎo", english: "Hello" },
            { characters: "我叫林灵", pinyin: "wǒ jiào Lín Líng", english: "My name is Lin Ling" },
            { characters: "很高兴认识你", pinyin: "hěn gāoxìng rènshí nǐ", english: "Nice to meet you" },
            { characters: "你叫什么名字", pinyin: "nǐ jiào shénme míngzì", english: "What is your name?" },
            { characters: "我是美国人", pinyin: "wǒ shì měiguó rén", english: "I am American" },
            { characters: "我在学中文", pinyin: "wǒ zài xué zhōngwén", english: "I am learning Chinese" },
        ]
    },

    // Lesson 2: Walk in the Forest
    {
        id: 2,
        type: "speaking",
        title: "Walk in the Forest",
        titleChinese: "森林漫步",
        titlePinyin: "sēnlín mànbù",
        icon: "🌲",
        description: "Nature vocabulary and peaceful expressions",
        phrases: [
            { characters: "这棵树很高", pinyin: "zhè kē shù hěn gāo", english: "This tree is very tall" },
            { characters: "森林很安静", pinyin: "sēnlín hěn ānjìng", english: "The forest is very quiet" },
            { characters: "我听到鸟叫", pinyin: "wǒ tīng dào niǎo jiào", english: "I hear birds singing" },
            { characters: "空气很新鲜", pinyin: "kōngqì hěn xīnxiān", english: "The air is very fresh" },
            { characters: "这条小路很美", pinyin: "zhè tiáo xiǎo lù hěn měi", english: "This path is beautiful" },
            { characters: "我喜欢大自然", pinyin: "wǒ xǐhuān dà zìrán", english: "I love nature" },
            { characters: "红杉树很壮观", pinyin: "hóngshān shù hěn zhuàngguān", english: "The redwood trees are magnificent" },
        ]
    },

    // Lesson 3: Restaurant Ordering
    {
        id: 3,
        type: "speaking",
        title: "Restaurant",
        titleChinese: "餐厅点餐",
        titlePinyin: "cāntīng diǎncān",
        icon: "🍜",
        description: "Order food like a local",
        phrases: [
            { characters: "请给我菜单", pinyin: "qǐng gěi wǒ càidān", english: "Please give me the menu" },
            { characters: "我要点菜", pinyin: "wǒ yào diǎn cài", english: "I want to order" },
            { characters: "这个多少钱", pinyin: "zhège duōshǎo qián", english: "How much is this?" },
            { characters: "不要太辣", pinyin: "bù yào tài là", english: "Not too spicy" },
            { characters: "买单", pinyin: "mǎi dān", english: "Check please" },
            { characters: "很好吃", pinyin: "hěn hǎo chī", english: "Very delicious" },
        ]
    },

    // Lesson 4: Asking Directions
    {
        id: 4,
        type: "speaking",
        title: "Directions",
        titleChinese: "问路",
        titlePinyin: "wèn lù",
        icon: "🗺️",
        description: "Find your way around",
        phrases: [
            { characters: "请问怎么走", pinyin: "qǐngwèn zěnme zǒu", english: "Excuse me, how do I get there?" },
            { characters: "在哪里", pinyin: "zài nǎlǐ", english: "Where is it?" },
            { characters: "往左转", pinyin: "wǎng zuǒ zhuǎn", english: "Turn left" },
            { characters: "往右转", pinyin: "wǎng yòu zhuǎn", english: "Turn right" },
            { characters: "一直走", pinyin: "yīzhí zǒu", english: "Go straight" },
            { characters: "离这里远吗", pinyin: "lí zhèlǐ yuǎn ma", english: "Is it far from here?" },
        ]
    },

    // Lesson 5: Shopping
    {
        id: 5,
        type: "speaking",
        title: "Shopping",
        titleChinese: "购物",
        titlePinyin: "gòuwù",
        icon: "🛍️",
        description: "Navigate markets and stores",
        phrases: [
            { characters: "我想买这个", pinyin: "wǒ xiǎng mǎi zhège", english: "I want to buy this" },
            { characters: "可以便宜一点吗", pinyin: "kěyǐ piányi yīdiǎn ma", english: "Can you make it cheaper?" },
            { characters: "太贵了", pinyin: "tài guì le", english: "Too expensive" },
            { characters: "有别的颜色吗", pinyin: "yǒu bié de yánsè ma", english: "Do you have other colors?" },
            { characters: "我只是看看", pinyin: "wǒ zhǐshì kàn kàn", english: "I'm just looking" },
            { characters: "可以试试吗", pinyin: "kěyǐ shì shì ma", english: "Can I try it?" },
        ]
    },

    // Lesson 6: Taking a Taxi
    {
        id: 6,
        type: "speaking",
        title: "Taking a Taxi",
        titleChinese: "打车",
        titlePinyin: "dǎ chē",
        icon: "🚕",
        description: "Get where you need to go",
        phrases: [
            { characters: "我要去这个地方", pinyin: "wǒ yào qù zhège dìfāng", english: "I want to go to this place" },
            { characters: "请打表", pinyin: "qǐng dǎ biǎo", english: "Please use the meter" },
            { characters: "在这里停", pinyin: "zài zhèlǐ tíng", english: "Stop here" },
            { characters: "还要多久", pinyin: "hái yào duō jiǔ", english: "How much longer?" },
            { characters: "可以开快一点吗", pinyin: "kěyǐ kāi kuài yīdiǎn ma", english: "Can you go faster?" },
            { characters: "我赶时间", pinyin: "wǒ gǎn shíjiān", english: "I'm in a hurry" },
        ]
    },

    // Lesson 7: Hotel Check-in
    {
        id: 7,
        type: "speaking",
        title: "Hotel",
        titleChinese: "酒店入住",
        titlePinyin: "jiǔdiàn rùzhù",
        icon: "🏨",
        description: "Check in and get settled",
        phrases: [
            { characters: "我有预订", pinyin: "wǒ yǒu yùdìng", english: "I have a reservation" },
            { characters: "房间有网络吗", pinyin: "fángjiān yǒu wǎngluò ma", english: "Does the room have WiFi?" },
            { characters: "早餐几点", pinyin: "zǎocān jǐ diǎn", english: "What time is breakfast?" },
            { characters: "可以换房间吗", pinyin: "kěyǐ huàn fángjiān ma", english: "Can I change rooms?" },
            { characters: "我要退房", pinyin: "wǒ yào tuì fáng", english: "I want to check out" },
            { characters: "请帮我叫出租车", pinyin: "qǐng bāng wǒ jiào chūzū chē", english: "Please call a taxi for me" },
        ]
    },

    // Lesson 8: Making Friends
    {
        id: 8,
        type: "speaking",
        title: "Making Friends",
        titleChinese: "交朋友",
        titlePinyin: "jiāo péngyǒu",
        icon: "🤝",
        description: "Connect with new people",
        phrases: [
            { characters: "你喜欢什么", pinyin: "nǐ xǐhuān shénme", english: "What do you like?" },
            { characters: "我们一起去吧", pinyin: "wǒmen yīqǐ qù ba", english: "Let's go together" },
            { characters: "你有微信吗", pinyin: "nǐ yǒu wēixìn ma", english: "Do you have WeChat?" },
            { characters: "下次再见", pinyin: "xià cì zàijiàn", english: "See you next time" },
            { characters: "保持联系", pinyin: "bǎochí liánxì", english: "Keep in touch" },
            { characters: "你真有意思", pinyin: "nǐ zhēn yǒu yìsi", english: "You're really interesting" },
        ]
    },

    // Lesson 9: At the Doctor
    {
        id: 9,
        type: "speaking",
        title: "Doctor Visit",
        titleChinese: "看医生",
        titlePinyin: "kàn yīshēng",
        icon: "🏥",
        description: "Describe symptoms and get help",
        phrases: [
            { characters: "我不舒服", pinyin: "wǒ bù shūfú", english: "I don't feel well" },
            { characters: "我头疼", pinyin: "wǒ tóu téng", english: "I have a headache" },
            { characters: "我肚子疼", pinyin: "wǒ dùzi téng", english: "I have a stomachache" },
            { characters: "我需要看医生", pinyin: "wǒ xūyào kàn yīshēng", english: "I need to see a doctor" },
            { characters: "药房在哪里", pinyin: "yàofáng zài nǎlǐ", english: "Where is the pharmacy?" },
            { characters: "这个药怎么吃", pinyin: "zhège yào zěnme chī", english: "How do I take this medicine?" },
        ]
    },

    // Lesson 10: Business Basics
    {
        id: 10,
        type: "speaking",
        title: "Business Basics",
        titleChinese: "商务基础",
        titlePinyin: "shāngwù jīchǔ",
        icon: "💼",
        description: "Professional phrases for work",
        phrases: [
            { characters: "我来看工厂", pinyin: "wǒ lái kàn gōngchǎng", english: "I'm here to see the factory" },
            { characters: "这是我的名片", pinyin: "zhè shì wǒ de míngpiàn", english: "This is my business card" },
            { characters: "我们可以谈谈吗", pinyin: "wǒmen kěyǐ tán tán ma", english: "Can we talk?" },
            { characters: "请发给我报价", pinyin: "qǐng fā gěi wǒ bàojià", english: "Please send me a quote" },
            { characters: "交货期是多久", pinyin: "jiāo huò qī shì duō jiǔ", english: "What's the delivery time?" },
            { characters: "合作愉快", pinyin: "hézuò yúkuài", english: "Pleasure doing business" },
        ]
    },

    // ============================================
    // Pinyin Matching Lessons (HSK 2.0)
    // ============================================

    // Lesson 11: HSK1 Basic Words - Matching
    {
        id: 11,
        type: "matching",
        title: "HSK1 Basic Words",
        titleChinese: "基础词汇",
        titlePinyin: "jīchǔ cíhuì",
        icon: "🔤",
        description: "Match characters to pinyin (HSK1)",
        hskLevel: 1,
        phrases: [
            { characters: "我", pinyin: "wǒ", english: "I, me" },
            { characters: "你", pinyin: "nǐ", english: "you" },
            { characters: "他", pinyin: "tā", english: "he, him" },
            { characters: "她", pinyin: "tā", english: "she, her" },
            { characters: "好", pinyin: "hǎo", english: "good" },
            { characters: "大", pinyin: "dà", english: "big" },
            { characters: "小", pinyin: "xiǎo", english: "small" },
            { characters: "人", pinyin: "rén", english: "person" },
            { characters: "中", pinyin: "zhōng", english: "middle, center" },
            { characters: "国", pinyin: "guó", english: "country" },
        ]
    },

    // Lesson 12: HSK1 Numbers & Time - Matching
    {
        id: 12,
        type: "matching",
        title: "HSK1 Numbers & Time",
        titleChinese: "数字与时间",
        titlePinyin: "shùzì yǔ shíjiān",
        icon: "🔢",
        description: "Match numbers and time words (HSK1)",
        hskLevel: 1,
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
            { characters: "今天", pinyin: "jīntiān", english: "today" },
            { characters: "明天", pinyin: "míngtiān", english: "tomorrow" },
        ]
    },

    // Lesson 13: HSK2 Common Verbs - Matching
    {
        id: 13,
        type: "matching",
        title: "HSK2 Common Verbs",
        titleChinese: "常用动词",
        titlePinyin: "chángyòng dòngcí",
        icon: "🏃",
        description: "Match action words to pinyin (HSK2)",
        hskLevel: 2,
        phrases: [
            { characters: "吃", pinyin: "chī", english: "to eat" },
            { characters: "喝", pinyin: "hē", english: "to drink" },
            { characters: "看", pinyin: "kàn", english: "to look, watch" },
            { characters: "听", pinyin: "tīng", english: "to listen" },
            { characters: "说", pinyin: "shuō", english: "to speak" },
            { characters: "读", pinyin: "dú", english: "to read" },
            { characters: "写", pinyin: "xiě", english: "to write" },
            { characters: "走", pinyin: "zǒu", english: "to walk" },
            { characters: "跑", pinyin: "pǎo", english: "to run" },
            { characters: "买", pinyin: "mǎi", english: "to buy" },
            { characters: "卖", pinyin: "mài", english: "to sell" },
            { characters: "给", pinyin: "gěi", english: "to give" },
        ]
    },

    // Lesson 14: HSK2 Daily Objects - Matching
    {
        id: 14,
        type: "matching",
        title: "HSK2 Daily Objects",
        titleChinese: "日常物品",
        titlePinyin: "rìcháng wùpǐn",
        icon: "📦",
        description: "Match everyday items to pinyin (HSK2)",
        hskLevel: 2,
        phrases: [
            { characters: "书", pinyin: "shū", english: "book" },
            { characters: "笔", pinyin: "bǐ", english: "pen" },
            { characters: "水", pinyin: "shuǐ", english: "water" },
            { characters: "茶", pinyin: "chá", english: "tea" },
            { characters: "饭", pinyin: "fàn", english: "rice, meal" },
            { characters: "菜", pinyin: "cài", english: "vegetable, dish" },
            { characters: "车", pinyin: "chē", english: "car, vehicle" },
            { characters: "门", pinyin: "mén", english: "door" },
            { characters: "桌子", pinyin: "zhuōzi", english: "table" },
            { characters: "椅子", pinyin: "yǐzi", english: "chair" },
            { characters: "手机", pinyin: "shǒujī", english: "mobile phone" },
            { characters: "电脑", pinyin: "diànnǎo", english: "computer" },
        ]
    },

    // Lesson 15: HSK3 Adjectives - Matching
    {
        id: 15,
        type: "matching",
        title: "HSK3 Adjectives",
        titleChinese: "形容词",
        titlePinyin: "xíngróngcí",
        icon: "🎨",
        description: "Match descriptive words to pinyin (HSK3)",
        hskLevel: 3,
        phrases: [
            { characters: "快", pinyin: "kuài", english: "fast" },
            { characters: "慢", pinyin: "màn", english: "slow" },
            { characters: "新", pinyin: "xīn", english: "new" },
            { characters: "旧", pinyin: "jiù", english: "old (things)" },
            { characters: "热", pinyin: "rè", english: "hot" },
            { characters: "冷", pinyin: "lěng", english: "cold" },
            { characters: "难", pinyin: "nán", english: "difficult" },
            { characters: "容易", pinyin: "róngyì", english: "easy" },
            { characters: "漂亮", pinyin: "piàoliang", english: "beautiful" },
            { characters: "干净", pinyin: "gānjìng", english: "clean" },
            { characters: "舒服", pinyin: "shūfu", english: "comfortable" },
            { characters: "方便", pinyin: "fāngbiàn", english: "convenient" },
        ]
    },

    // Lesson 16: HSK3 Places - Matching
    {
        id: 16,
        type: "matching",
        title: "HSK3 Places",
        titleChinese: "地点词汇",
        titlePinyin: "dìdiǎn cíhuì",
        icon: "🏛️",
        description: "Match location words to pinyin (HSK3)",
        hskLevel: 3,
        phrases: [
            { characters: "学校", pinyin: "xuéxiào", english: "school" },
            { characters: "医院", pinyin: "yīyuàn", english: "hospital" },
            { characters: "银行", pinyin: "yínháng", english: "bank" },
            { characters: "超市", pinyin: "chāoshì", english: "supermarket" },
            { characters: "机场", pinyin: "jīchǎng", english: "airport" },
            { characters: "火车站", pinyin: "huǒchēzhàn", english: "train station" },
            { characters: "图书馆", pinyin: "túshūguǎn", english: "library" },
            { characters: "饭店", pinyin: "fàndiàn", english: "restaurant, hotel" },
            { characters: "公司", pinyin: "gōngsī", english: "company" },
            { characters: "公园", pinyin: "gōngyuán", english: "park" },
        ]
    },

    // ============================================
    // Fill-in-the-Blank Lessons (Cloze)
    // ============================================

    // Lesson 17: HSK1 Basic Verbs in Context
    {
        id: 17,
        type: "cloze",
        title: "HSK1 Verbs in Sentences",
        titleChinese: "动词填空",
        titlePinyin: "dòngcí tiánkòng",
        icon: "📝",
        description: "Fill in missing verbs (HSK1)",
        hskLevel: 1,
        // Vocabulary being practiced
        vocabulary: [
            { word: "吃", pinyin: "chī", english: "to eat" },
            { word: "喝", pinyin: "hē", english: "to drink" },
            { word: "看", pinyin: "kàn", english: "to look/watch" },
            { word: "听", pinyin: "tīng", english: "to listen" },
            { word: "说", pinyin: "shuō", english: "to speak" },
            { word: "买", pinyin: "mǎi", english: "to buy" },
        ],
        sentences: [
            // Single blank sentences (Phase 1)
            {
                template: "我想{0}饭。",
                pinyin: "wǒ xiǎng chī fàn.",
                english: "I want to eat.",
                answers: ["吃"],
                distractors: ["喝", "看", "说"]
            },
            {
                template: "她{0}茶。",
                pinyin: "tā hē chá.",
                english: "She drinks tea.",
                answers: ["喝"],
                distractors: ["吃", "买", "看"]
            },
            {
                template: "我们{0}电视。",
                pinyin: "wǒmen kàn diànshì.",
                english: "We watch TV.",
                answers: ["看"],
                distractors: ["听", "说", "吃"]
            },
            {
                template: "他{0}音乐。",
                pinyin: "tā tīng yīnyuè.",
                english: "He listens to music.",
                answers: ["听"],
                distractors: ["看", "说", "喝"]
            },
            {
                template: "你{0}中文吗？",
                pinyin: "nǐ shuō zhōngwén ma?",
                english: "Do you speak Chinese?",
                answers: ["说"],
                distractors: ["听", "看", "吃"]
            },
            {
                template: "我要{0}书。",
                pinyin: "wǒ yào mǎi shū.",
                english: "I want to buy a book.",
                answers: ["买"],
                distractors: ["看", "吃", "说"]
            },
            // Multi-blank sentences (Phase 2)
            {
                template: "我{0}咖啡，他{1}茶。",
                pinyin: "wǒ hē kāfēi, tā hē chá.",
                english: "I drink coffee, he drinks tea.",
                answers: ["喝", "喝"],
                distractors: ["吃", "看"]
            },
            {
                template: "她{0}书，我{1}电视。",
                pinyin: "tā kàn shū, wǒ kàn diànshì.",
                english: "She reads a book, I watch TV.",
                answers: ["看", "看"],
                distractors: ["听", "说"]
            },
        ]
    },

    // Lesson 18: HSK1 Pronouns & Questions
    {
        id: 18,
        type: "cloze",
        title: "HSK1 Pronouns Practice",
        titleChinese: "代词练习",
        titlePinyin: "dàicí liànxí",
        icon: "👥",
        description: "Fill in pronouns and question words (HSK1)",
        hskLevel: 1,
        vocabulary: [
            { word: "我", pinyin: "wǒ", english: "I/me" },
            { word: "你", pinyin: "nǐ", english: "you" },
            { word: "他", pinyin: "tā", english: "he/him" },
            { word: "她", pinyin: "tā", english: "she/her" },
            { word: "什么", pinyin: "shénme", english: "what" },
            { word: "哪里", pinyin: "nǎlǐ", english: "where" },
        ],
        sentences: [
            {
                template: "{0}叫什么名字？",
                pinyin: "nǐ jiào shénme míngzì?",
                english: "What is your name?",
                answers: ["你"],
                distractors: ["我", "他", "她"]
            },
            {
                template: "{0}是学生。",
                pinyin: "wǒ shì xuéshēng.",
                english: "I am a student.",
                answers: ["我"],
                distractors: ["你", "他", "她"]
            },
            {
                template: "{0}很漂亮。",
                pinyin: "tā hěn piàoliang.",
                english: "She is very beautiful.",
                answers: ["她"],
                distractors: ["他", "我", "你"]
            },
            {
                template: "这是{0}？",
                pinyin: "zhè shì shénme?",
                english: "What is this?",
                answers: ["什么"],
                distractors: ["哪里", "你", "他"]
            },
            {
                template: "你去{0}？",
                pinyin: "nǐ qù nǎlǐ?",
                english: "Where are you going?",
                answers: ["哪里"],
                distractors: ["什么", "他", "她"]
            },
            {
                template: "{0}在做{1}？",
                pinyin: "tā zài zuò shénme?",
                english: "What is he doing?",
                answers: ["他", "什么"],
                distractors: ["她", "哪里"]
            },
        ]
    },

    // Lesson 19: HSK2 Daily Activities
    {
        id: 19,
        type: "cloze",
        title: "HSK2 Daily Activities",
        titleChinese: "日常活动",
        titlePinyin: "rìcháng huódòng",
        icon: "🌅",
        description: "Fill in daily activity words (HSK2)",
        hskLevel: 2,
        vocabulary: [
            { word: "起床", pinyin: "qǐchuáng", english: "to get up" },
            { word: "睡觉", pinyin: "shuìjiào", english: "to sleep" },
            { word: "工作", pinyin: "gōngzuò", english: "to work" },
            { word: "学习", pinyin: "xuéxí", english: "to study" },
            { word: "休息", pinyin: "xiūxi", english: "to rest" },
            { word: "运动", pinyin: "yùndòng", english: "to exercise" },
        ],
        sentences: [
            {
                template: "我早上六点{0}。",
                pinyin: "wǒ zǎoshang liù diǎn qǐchuáng.",
                english: "I get up at 6 in the morning.",
                answers: ["起床"],
                distractors: ["睡觉", "工作", "运动"]
            },
            {
                template: "我晚上十一点{0}。",
                pinyin: "wǒ wǎnshang shíyī diǎn shuìjiào.",
                english: "I go to sleep at 11 at night.",
                answers: ["睡觉"],
                distractors: ["起床", "休息", "学习"]
            },
            {
                template: "他每天{0}八个小时。",
                pinyin: "tā měitiān gōngzuò bā gè xiǎoshí.",
                english: "He works eight hours every day.",
                answers: ["工作"],
                distractors: ["学习", "休息", "运动"]
            },
            {
                template: "我在图书馆{0}。",
                pinyin: "wǒ zài túshūguǎn xuéxí.",
                english: "I study at the library.",
                answers: ["学习"],
                distractors: ["工作", "休息", "睡觉"]
            },
            {
                template: "周末我喜欢{0}。",
                pinyin: "zhōumò wǒ xǐhuān xiūxi.",
                english: "I like to rest on weekends.",
                answers: ["休息"],
                distractors: ["工作", "学习", "起床"]
            },
            {
                template: "早上{0}，晚上{1}。",
                pinyin: "zǎoshang qǐchuáng, wǎnshang shuìjiào.",
                english: "Get up in the morning, sleep at night.",
                answers: ["起床", "睡觉"],
                distractors: ["工作", "运动"]
            },
            {
                template: "我每天{0}和{1}。",
                pinyin: "wǒ měitiān gōngzuò hé xuéxí.",
                english: "I work and study every day.",
                answers: ["工作", "学习"],
                distractors: ["休息", "睡觉"]
            },
        ]
    },

    // Lesson 20: HSK2 Locations & Directions
    {
        id: 20,
        type: "cloze",
        title: "HSK2 Going Places",
        titleChinese: "去哪里",
        titlePinyin: "qù nǎlǐ",
        icon: "🗺️",
        description: "Fill in location words (HSK2)",
        hskLevel: 2,
        vocabulary: [
            { word: "学校", pinyin: "xuéxiào", english: "school" },
            { word: "医院", pinyin: "yīyuàn", english: "hospital" },
            { word: "超市", pinyin: "chāoshì", english: "supermarket" },
            { word: "银行", pinyin: "yínháng", english: "bank" },
            { word: "机场", pinyin: "jīchǎng", english: "airport" },
            { word: "饭店", pinyin: "fàndiàn", english: "restaurant" },
        ],
        sentences: [
            {
                template: "孩子们去{0}上课。",
                pinyin: "háizimen qù xuéxiào shàngkè.",
                english: "The children go to school for class.",
                answers: ["学校"],
                distractors: ["医院", "超市", "银行"]
            },
            {
                template: "他生病了，去{0}。",
                pinyin: "tā shēngbìng le, qù yīyuàn.",
                english: "He is sick, going to the hospital.",
                answers: ["医院"],
                distractors: ["学校", "超市", "饭店"]
            },
            {
                template: "我去{0}买东西。",
                pinyin: "wǒ qù chāoshì mǎi dōngxi.",
                english: "I go to the supermarket to buy things.",
                answers: ["超市"],
                distractors: ["银行", "学校", "机场"]
            },
            {
                template: "我去{0}取钱。",
                pinyin: "wǒ qù yínháng qǔ qián.",
                english: "I go to the bank to withdraw money.",
                answers: ["银行"],
                distractors: ["超市", "医院", "饭店"]
            },
            {
                template: "飞机在{0}。",
                pinyin: "fēijī zài jīchǎng.",
                english: "The airplane is at the airport.",
                answers: ["机场"],
                distractors: ["学校", "超市", "银行"]
            },
            {
                template: "我们去{0}吃饭。",
                pinyin: "wǒmen qù fàndiàn chīfàn.",
                english: "We go to the restaurant to eat.",
                answers: ["饭店"],
                distractors: ["超市", "医院", "学校"]
            },
            {
                template: "早上去{0}，下午去{1}。",
                pinyin: "zǎoshang qù xuéxiào, xiàwǔ qù chāoshì.",
                english: "Go to school in the morning, go to supermarket in the afternoon.",
                answers: ["学校", "超市"],
                distractors: ["医院", "银行"]
            },
        ]
    },
];
