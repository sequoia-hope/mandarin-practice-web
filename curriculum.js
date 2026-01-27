// Curriculum data for Mandarin ASR Practice App

const CURRICULUM = [
    // Lesson 1: Introductions
    {
        id: 1,
        title: "Introductions",
        titleChinese: "自我介绍",
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
        title: "Walk in the Forest",
        titleChinese: "森林漫步",
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
        title: "Restaurant",
        titleChinese: "餐厅点餐",
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
        title: "Directions",
        titleChinese: "问路",
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
        title: "Shopping",
        titleChinese: "购物",
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
        title: "Taking a Taxi",
        titleChinese: "打车",
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
        title: "Hotel",
        titleChinese: "酒店入住",
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
        title: "Making Friends",
        titleChinese: "交朋友",
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
        title: "Doctor Visit",
        titleChinese: "看医生",
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
        title: "Business Basics",
        titleChinese: "商务基础",
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
];
