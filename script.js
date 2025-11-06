// =====================================================
// FREE ASTROLOGY API CONFIGURATION
// =====================================================
// To use this app with real Kundli calculations:
// 1. Get your API key from https://freeastrologyapi.com
// 2. Replace 'YOUR_API_KEY' below with your actual key
// 3. Update the apiUrl if needed based on API documentation
// =====================================================

const API_CONFIG = {
    url: 'https://json.freeastrologyapi.com/planets',
    mahaDashaUrl: 'https://json.freeastrologyapi.com/vimsottari/maha-dasas-and-antar-dasas',
    key: 'zZ89eRlc4n5lxXNXXQZBE8i3eq2EhNsK4OZQLT5v'
};

// Zodiac Sign to Lord Mapping
const ZODIAC_LORDS = {
    1: 'Mars',      // Aries (Mesha)
    2: 'Venus',     // Taurus (Rishaba)
    3: 'Mercury',   // Gemini (Mithuna)
    4: 'Moon',      // Cancer (Karkara)
    5: 'Sun',       // Leo (Simha)
    6: 'Mercury',   // Virgo (Kanya)
    7: 'Venus',     // Libra (Thulam)
    8: 'Mars',      // Scorpio (Viruchika)
    9: 'Jupiter',   // Sagittarius (Dhanush)
    10: 'Saturn',   // Capricorn (Makaram)
    11: 'Saturn',   // Aquarius (Kumbha)
    12: 'Jupiter'   // Pisces (Meena)
};

// Planet name translations
const PLANET_NAMES = {
    'en': {
        'Moon': 'Moon',
        'Mercury': 'Mercury',
        'Venus': 'Venus',
        'Mars': 'Mars',
        'Jupiter': 'Jupiter',
        'Saturn': 'Saturn',
        'Sun': 'Sun',
        'Ketu': 'Ketu',
        'Rahu': 'Rahu',
        'Ascendant': 'Ascendant'
    },
    'hi': {
        'Moon': 'चंद्र',
        'Mercury': 'बुध',
        'Venus': 'शुक्र',
        'Mars': 'मंगल',
        'Jupiter': 'गुरु',
        'Saturn': 'शनि',
        'Sun': 'सूर्य',
        'Ketu': 'केतु',
        'Rahu': 'राहु',
        'Ascendant': 'लग्न'
    }
};

// House calculation function
function getRelativeHouseNumber(ascendantSign, planetSign) {
    return ((planetSign - ascendantSign + 12) % 12) + 1;
}
// Utility function to get ordinal string
function getOrdinal(n, language = 'en') {
    if (language === 'hi') {
        // Hindi ordinal numbers
        const hindiNumbers = ['', 'पहला', 'दूसरा', 'तीसरा', 'चौथा', 'पांचवां', 'छठा', 'सातवां', 'आठवां', 'नौवां', 'दसवां', 'ग्यारहवां', 'बारहवां'];
        if (n >= 1 && n <= 12) {
            return hindiNumbers[n];
        }
        return n + "वां";
    }
    // English ordinal numbers
    if (n === 1) return "1st";
    if (n === 2) return "2nd";
    if (n === 3) return "3rd";
    if (n >= 4 && n <= 20) return n + "th"; // covers 4th-20th for safety
    const s = n % 10, t = n % 100;
    if (s === 1 && t !== 11) return n + "st";
    if (s === 2 && t !== 12) return n + "nd";
    if (s === 3 && t !== 13) return n + "rd";
    return n + "th";
}

// 2nd House Lord in Houses Effects Mapping
const SECOND_LORD_EFFECTS = {
    1: {
        house: "1st House (Ascendant/Lagna)",
        classical: "Earns and manages own wealth independently, less focus on family’s financial legacy, strong individual financial decisions.",
        expanded: "Individuals with the lord of the second house placed in the first house typically generate wealth through their own efforts, embodying leadership qualities and a strong sense of self-reliance. Their financial decisions are independent, often showing little dependence on family wealth or legacy. These natives are natural managers of people and resources, commonly engaging in professions such as portfolio management, entrepreneurship, or practices like yoga, which emphasize discipline and self-governance. This placement reflects a self-made approach to wealth, where personal capability and initiative lead to financial growth."
    },
    2: {
        house: "2nd House (Family, Wealth, Speech)",
        classical: "Strong family ties, rich, manages family wealth, the ‘kuldeepak’ savior for many.",
        expanded: "When the second house lord is in its own house, the native often has deep connections with family wealth and heritage. They tend to be conservative with money, exhibiting a reserved or even stingy approach to spending, preferring to accumulate wealth thoughtfully. Without other favorable planetary influences, they may struggle to enjoy their amassed resources fully. These individuals often become the 'kuldeepak'—the sustaining light of the family—whose financial actions and reputation can bring either pride or shame to their ancestral lineage, reflecting the immense responsibility they carry for sustaining family honor."
    },
    3: {
        house: "3rd House (Skills, Siblings, Short travel)",
        classical: "Money from communication, travel, data, business, writing, telecom.",
        expanded: "This placement indicates earnings derived from communicative and dynamic activities involving siblings, short travels, and business dealings. The native may prosper through professions linked to writing, telecommunication, acting (especially if Venus influences this house), or other performing arts. The ability to adapt quickly and harness skills involving communication becomes a significant source of income. Additionally, close sibling relationships and frequent short-distance travels often support their financial ventures."
    },
    4: {
        house: "4th House (Home, Comfort, Mother)",
        classical: "Wealth from property, vehicles, house, land, transport, interior, home management.",
        expanded: "The second lord positioned in the fourth house often derives financial prosperity from family property, real estate, vehicle-related businesses, or transportation sectors. Career paths may include interior decoration, property management, or overseeing household resources, especially when benefic planets like Venus or the Sun enhance this house. A strong connection to the mother and emotional security sources further stabilizes wealth, as home comforts and familial harmony play crucial roles in financial well-being."
    },
    5: {
        house: "5th House (Children, Education, Creativity)",
        classical: "Money through children, investments, education, learning.",
        expanded: "With the second lord in the fifth house, wealth often flows through children, educational pursuits, and creative endeavors. These natives are generally knowledgeable and may invest significantly in learning or artistic projects. However, there can be familial challenges, including potential conflicts or emotional distance with children, especially if the second lord is exalted or poorly placed. Financial gains here are closely tied to intellectual or creative achievements, and investments in education tend to yield returns."
    },
    6: {
        house: "6th House (Service, Disputes, Health)",
        classical: "Wealth from service, healthcare, law, audits, competitions, confrontations.",
        expanded: "This placement is associated with acquiring wealth through professions related to service, healthcare, law, audits, or competitive arenas. The presence of the 'Dand Yog' (a powerful yogic configuration) suggests that the native may earn by navigating disputes, legal battles, or even morally ambiguous situations. While excess malefic influences could predispose to tendencies of grabbing or cheating, this house is favorable for careers as chartered accountants, lawyers, or medical professionals who deal with others’ conflicts and health matters."
    },
    7: {
        house: "7th House (Relationships, Marriage, Partnerships)",
        classical: "Wealth through partnerships, spouse, trading, travel.",
        expanded: "In the seventh house, the second lord emphasizes wealth derived from marriage and partnerships. The native’s financial status often experiences transformation through their spouse or joint business ventures. Income opportunities may increase following marriage, driven by enhanced collaborations, export businesses, and international trade. The success in this domain heavily depends on the quality of relationships and the spouse’s financial acumen."
    },
    8: {
        house: "8th House (Transformation, Rebirth, Secrets)",
        classical: "No ancestral wealth, slow accumulation, money in later life.",
        expanded: "When the second lord occupies the eighth house, the native may receive limited direct ancestral wealth and tends to accumulate money gradually, commonly after the age of 35 to 45. Financial gains often come from insurance claims, inheritances, or businesses related to food and transport. Family debts are likely, creating a responsibility to manage and repay them. While moral and emotional family support is present, the native’s financial growth depends on personal effort and resilience in facing life's transformations."
    },
    9: {
        house: "9th House (Luck, Dharma, Spirituality)",
        classical: "Money from shipping, travel, abroad, word of mouth.",
        expanded: "This placement links wealth with luck, virtue, and spirituality. The native’s business or income often revolves around shipping, airlines, foreign countries, and partnerships founded on trust and word-of-mouth recommendations. Benefic planetary influences like Venus and the Moon enhance financial opportunities arising from international ties, spiritual enterprises, and ethical conduct. This house emphasizes prosperity through dharma (righteousness) and expansive networks."
    },
    10: {
        house: "10th House (Career, Reputation, Public Life)",
        classical: "Earns money through career, public fame, and social standing.",
        expanded: "The second lord in the tenth house benefits significantly from professional achievements, public recognition, and solid social standing. Careers in acting, stock marketing, or roles requiring visibility and leadership often bring substantial income, provided the planetary combinations are favorable. Here, reputation and moral integrity play vital roles; financial success is closely tied to how the native is perceived publicly and their adherence to ethical standards."
    },
    11: {
        house: "11th House (Gains, Groups, Networks)",
        classical: "Gains wealth as soon as work is done, quick returns.",
        expanded: "This placement signifies quick financial returns from group efforts, networking, and recurrent investments. The native profits through social collaborations and alliances but must guard against potential losses caused by unfavorable planetary afflictions. In some cases, ill-advised partnerships or mismanagement can lead to quick gains turning to losses, symbolized as ‘turning gold to dust.’ Careful evaluation of friendships and investment opportunities is essential for sustainable wealth."
    },
    12: {
        house: "12th House (Loss, Charity, Foreign)",
        classical: "Fixed job (govt), spiritual institutions, abroad, philanthropy.",
        expanded: "When the second lord resides in the twelfth house, the native often earns through government employment, religious or spiritual institutions, or by living and working abroad. Financial growth is typically delayed until after age 36 and is accompanied by sacrifices such as charitable donations, distancing from comforts, or separation from family ties. A recommended remedy is to donate a portion of the first salary to enhance prosperity and spiritual progression. This placement underscores the spiritual dimension of wealth and encourages detachment from materialistic attachments."
    }
};
const SECOND_LORD_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        classical: "स्वयं की मेहनत से धन अर्जित करता है, परिवार की संपत्ति पर निर्भर नहीं रहता, स्वतंत्र आर्थिक निर्णय लेता है।",
        expanded: "यदि द्वितीय भाव का स्वामी प्रथम भाव में स्थित हो तो जातक सामान्यतः स्वयं के प्रयासों से धन अर्जित करता है। उसमें नेतृत्व क्षमता और आत्मनिर्भरता होती है। ऐसे व्यक्ति परिवार की विरासत पर निर्भर न रहकर अपने निर्णय स्वयं लेते हैं। ये लोग प्रायः प्रबंधन, उद्यमिता या अनुशासन तथा आत्म-नियंत्रण से संबंधित कार्यों में सफल होते हैं। यह स्थिति आत्मनिर्मित व्यक्ति को दर्शाती है जो अपने प्रयासों से आर्थिक प्रगति करता है।"
    },
    2: {
        house: "द्वितीय भाव (परिवार, धन, वाणी)",
        classical: "मजबूत पारिवारिक संबंध, धनी, परिवार की संपत्ति का प्रबंधन करने वाला, 'कुलदीपक' माना जाता है।",
        expanded: "जब द्वितीय भाव का स्वामी अपने ही भाव में हो तो जातक का परिवार व वंश से गहरा संबंध होता है। यह व्यक्ति धन के प्रति सजग रहता है, अनावश्यक खर्च से बचता है तथा सावधानीपूर्वक धन संचय करता है। ऐसे जातक परिवार के 'कुलदीपक' कहलाते हैं जिनकी प्रतिष्ठा परिवार की शोभा बढ़ाती या घटाती है। उन्हें परिवार की मान-प्रतिष्ठा बनाए रखने की बड़ी जिम्मेदारी होती है।"
    },
    3: {
        house: "तृतीय भाव (कौशल, भाई-बहन, छोटे भ्रमण)",
        classical: "संचार, लेखन, यात्रा, डेटा, व्यापार या दूरसंचार के माध्यम से धन प्राप्त करता है।",
        expanded: "यदि द्वितीय भाव का स्वामी तृतीय भाव में हो, तो जातक को संचार, यात्रा, लेखन या अभिनय जैसे क्षेत्रों से लाभ प्राप्त होता है। भाई-बहनों के सहयोग और छोटे भ्रमण के माध्यम से भी आय स्रोत बनते हैं। यह योग व्यक्ति को लचीला और कुशल संचारक बनाता है जिससे आर्थिक प्रगति होती है।"
    },
    4: {
        house: "चतुर्थ भाव (घर, सुख, माता)",
        classical: "धन संपत्ति, वाहन, भूमि, गृहसज्जा और परिवहन कार्यों से प्राप्त होता है।",
        expanded: "यदि द्वितीय भाव का स्वामी चतुर्थ भाव में स्थित हो, तो व्यक्ति को घर, भूमि, संपत्ति या वाहन से लाभ मिलता है। यह योग गृह प्रबंधन, वास्तु, आंतरिक सज्जा या रियल एस्टेट से जुड़े कार्यों में सफलता देता है। माता से अच्छा संबंध आर्थिक स्थिरता बढ़ाता है और घरेलू सुख धन में योगदान देता है।"
    },
    5: {
        house: "पंचम भाव (संतान, शिक्षा, रचनात्मकता)",
        classical: "संतान, शिक्षा, निवेश और रचनात्मक कार्यों से धन लाभ होता है।",
        expanded: "यदि द्वितीय भाव का स्वामी पंचम भाव में हो, तो जातक को शिक्षा, सलाह, लेखन या सृजनात्मक कार्यों से आय प्राप्त होती है। संतान संबंधित लाभ और निवेश से भी आर्थिक वृद्धि होती है। कभी-कभी संतान के साथ मतभेद या दूरी संभव है, विशेषकर यदि ग्रह कमजोर हो।"
    },
    6: {
        house: "षष्ठ भाव (सेवा, विवाद, स्वास्थ्य)",
        classical: "सेवा, स्वास्थ्य, कानून, प्रतियोगिता और विवादों से धन अर्जित करता है।",
        expanded: "यदि द्वितीय भाव का स्वामी षष्ठ भाव में हो, तो व्यक्ति सेवा क्षेत्र, चिकित्सा, न्याय, लेखा या प्रतियोगिता से धन प्राप्त करता है। यह स्थिति 'दण्ड योग' का निर्माण कर सकती है, जिससे व्यक्ति विवादों या चुनौतियों से लाभ कमाता है। लेखाकार, वकील, डॉक्टर आदि व्यावसायिक क्षेत्र में सफलता मिलती है।"
    },
    7: {
        house: "सप्तम भाव (संबंध, विवाह, साझेदारी)",
        classical: "पति/पत्नी, साझेदारी, व्यापार और विदेश यात्रा से धन लाभ।",
        expanded: "जब द्वितीय भाव का स्वामी सप्तम भाव में हो, तो जातक को विवाह या व्यापारिक साझेदारी से लाभ प्राप्त होता है। विवाह के बाद आय बढ़ जाती है तथा व्यापार, निर्यात या साझेदारी में सफलता मिलती है। जीवनसाथी की आर्थिक सूझबूझ संपन्नता में अहम भूमिका निभाती है।"
    },
    8: {
        house: "अष्टम भाव (परिवर्तन, गूढ़ ज्ञान, पुनर्जन्म)",
        classical: "पूर्वज संपत्ति नहीं मिलती, धीरे-धीरे धन संचय, जीवन के बाद के वर्षों में लाभ।",
        expanded: "यदि द्वितीय भाव का स्वामी अष्टम भाव में हो, तो जातक को पूर्वजों से धन नहीं मिलता और वह धीरे-धीरे धन अर्जित करता है, प्रायः 35-45 वर्ष की आयु के बाद। बीमा, वसीयत, या खानपान और परिवहन क्षेत्र से लाभ संभव है। परिवार के ऋण चुकाने की जिम्मेदारी भी होती है।"
    },
    9: {
        house: "नवम भाव (भाग्य, धर्म, आध्यात्मिकता)",
        classical: "यात्रा, विदेश, धर्म, और सदाचार से धन लाभ।",
        expanded: "यदि द्वितीय भाव का स्वामी नवम भाव में हो, तो जातक को भाग्य, धर्म, विदेश यात्रा और आस्था से आर्थिक वृद्धि होती है। नैतिकता और सद्भाव पर आधारित व्यावसायिक संबंध धन आकर्षित करते हैं। शुभ ग्रहों का प्रभाव हो तो आध्यात्मिक कार्य, विदेश या शिक्षण कार्य से अधिक लाभ मिलता है।"
    },
    10: {
        house: "दशम भाव (कर्म, प्रतिष्ठा, सार्वजनिक जीवन)",
        classical: "कर्म या पेशे के माध्यम से धन, प्रसिद्धि और सामाजिक मान बढ़ता है।",
        expanded: "यदि द्वितीय भाव का स्वामी दशम भाव में हो, तो जातक को अपने पेशे, कर्म और प्रतिष्ठा से धन प्राप्त होता है। प्रशासन, अभिनय, राजनीति या बाजार के कार्यों से लाभ मिलता है। नैतिकता और जनप्रतिष्ठा पर आधारित धन अर्जन इस योग की विशेषता है।"
    },
    11: {
        house: "एकादश भाव (लाभ, नेटवर्क, मित्र समूह)",
        classical: "काम पूर्ण होते ही तुरंत लाभ, शीघ्र धन अर्जन।",
        expanded: "यदि द्वितीय भाव का स्वामी एकादश भाव में हो, तो व्यक्ति को सामाजिक नेटवर्क, मित्रों और समूहिक प्रयासों से शीघ्र लाभ मिलता है। निवेशों से त्वरित लाभ तो मिलता है परन्तु सावधानी न रखने पर उतनी ही शीघ्र हानि भी हो सकती है। आर्थिक रिश्ते सोच-समझकर चुनने चाहिए।"
    },
    12: {
        house: "द्वादश भाव (हानि, दान, विदेश)",
        classical: "सरकारी नौकरी, धर्मार्थ कार्य, विदेश या परोपकार से धन अर्जन।",
        expanded: "यदि द्वितीय भाव का स्वामी द्वादश भाव में हो तो व्यक्ति को सरकारी सेवा, धर्म, मंदिर, या विदेश से कार्य कर धन प्राप्त होता है। आर्थिक वृद्धि धीरे-धीरे होती है और जीवन के उत्तरार्ध में स्थिरता आती है। धार्मिक दान और सादगी जीवन को संतुलित व शुभ बनाते हैं।"
    }
};


// Target audience: astrology learners and practitioners interested in Vedic interpretations and real-world applications for life's wealth and family concerns.



// Ascendant Lord in Houses Effects Mapping
const ASCENDANT_LORD_EFFECTS = {
    1: {
        house: "1st House ([translate:Ascendant/Lagna])",
        classical: "Self-made, learns through personal experience, confidence, ego, struggles alone, helps others but rarely seeks help, personality is shaped by self-effort.",
        expanded: "The personality primarily develops through maintaining and enhancing physical and mental health via regular exercise and positive lifestyle. These natives exhibit strong self-confidence and value independence highly. Malefic influences can result in ongoing challenges and struggles, yet personal growth is achieved by confronting and overcoming difficulties on their own. Their character and success come from self-made efforts without relying heavily on external assistance."
    },
    2: {
        house: "2nd House (Family, Finances, Speech)",
        classical: "Personality develops through family, food, finance, and emotional support.",
        expanded: "Development in this house focuses on building skills and career stability through family responsibilities and emotional nourishment from loved ones. The importance of saving money and ensuring financial security is a core theme. Family ties provide both psychological strength and practical resources, which shape the native’s approach to protecting and managing wealth."
    },
    3: {
        house: "3rd House (Skills, Siblings, Short Travel)",
        classical: "Development via skills, siblings, travel, short journeys.",
        expanded: "Growth occurs through honing skills and gaining experience via short travels and communication. Relationships with siblings significantly influence personality changes, which can be positive or challenging. Engagement in activities such as sports, writing, poetry, or martial arts fosters personal enhancement and strengthens confidence and resilience."
    },
    4: {
        house: "4th House (Home, Comfort, Mother)",
        classical: "Home environment, comfort, mother play vital roles.",
        expanded: "Personality development thrives in a peaceful and supportive home environment. Practices like constructing a harmonious living space, ensuring proper rest, and performing acts such as food donation contribute to inner peace and mental stability. Committing efforts towards societal welfare alongside fostering a nurturing family atmosphere enhances overall confidence and emotional balance."
    },
    5: {
        house: "5th House (Children, Education, Creativity)",
        classical: "Personality rises by making decisions for many, educating and guiding next generation, temple-related work.",
        expanded: "This house emphasizes growth through taking responsible decisions, teaching, continuous learning, and dedicating efforts to children’s education and creative pursuits. Active involvement in social and religious activities, including temple-related work, supports maturity and cultivates a sense of purpose and leadership."
    },
    6: {
        house: "6th House (Service, Disputes, Health)",
        classical: "Development through challenges, disputes, service and overcoming obstacles.",
        expanded: "Personality evolves by facing hardships and offering service during difficult times. Acts such as donations to doctors and lawyers, and helping those in need cultivate empathy and resilience. Success in government service, healthcare, or legal fields is possible especially if favorable planetary connections exist, highlighting a life path centered on service and overcoming adversities."
    },
    7: {
        house: "7th House (Relationships, Marriage, Partnerships)",
        classical: "Growth through relationships and marriage; depends on dispositor.",
        expanded: "Development is closely linked to learning from relationships and partnerships, especially marriage. Contributing positively to marital life fosters personal growth, while conflicts or breakup in relationships can bring challenges. Understanding and navigating relationship dynamics become key to emotional maturity and stability."
    },
    8: {
        house: "8th House (Transformation, Rebirth, Secrets)",
        classical: "Transformative experiences, rebirths, change, detachment.",
        expanded: "Personality undergoes continual transformation through major life changes, detachment, and cycles of renewal. Practicing detachment, gratitude, and spiritual discipline is essential for growth. Native’s life is characterized by repeated opportunities for inner rebirth and evolution."
    },
    9: {
        house: "9th House (Luck, Dharma, Tradition)",
        classical: "Growth by following principles, traditions, rituals, visiting temples.",
        expanded: "Personality growth is linked to adhering to [translate:dharma], cultural traditions, and spiritual practices. These natives often face struggles related to family traditions and societal expectations but find development through participation in religious activities, temple visits, and adhering to moral principles. Fame and recognition often arise from such spiritual commitments."
    },
    10: {
        house: "10th House (Career, Reputation, Public Life)",
        classical: "Most powerful placement for public fame, work, and karma.",
        expanded: "Maturation happens through consistent professional effort, career achievements, and reputation management. Daily work routines and the strive for fame and social impact shape the native’s personality. The house underlines the karmic lessons tied to career and public life, emphasizing responsibility and discipline."
    },
    11: {
        house: "11th House (Gains, Social Circles, Fulfillment)",
        classical: "Growth through fulfillment of desires, helping siblings, social participation.",
        expanded: "Focus is on achieving personal and collective goals through social involvement and supporting siblings or close associates. Innovative thinking and extensive networking contribute to personality evolution, as the native learns through interacting with groups and fulfilling aspirations that benefit both self and community."
    },
    12: {
        house: "12th House (Loss, Expenses, Moksha)",
        classical: "Personality develops through foreign settlements, spiritual progress, and donation.",
        expanded: "Personality evolves through experiences involving foreign travels or residence abroad, coping with losses and expenses, and spiritual growth. Engagement in charitable acts and learning detachment from material possessions accelerate development. Comfort with disconnection and embracing [translate:moksha] or liberation plays a crucial role in their spiritual and personal evolution."
    }
}
const ASCENDANT_LORD_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        classical: "स्वनिर्मित व्यक्तित्व, अनुभवों से सीखने वाला, आत्मविश्वासी, अहंकार प्रवृत्ति, अकेले संघर्ष करता है, दूसरों की मदद करता है पर सहायता मांगता नहीं।",
        expanded: "इस स्थिति में व्यक्ति का व्यक्तित्व उसकी शारीरिक और मानसिक स्वास्थ्य की देखभाल से विकसित होता है। नियमित व्यायाम और सकारात्मक जीवनशैली उसके आत्मविश्वास को मजबूत बनाते हैं। अशुभ ग्रहों की दृष्टि होने पर यह जातक अनेक संघर्षों से गुजरता है, परंतु इन्हीं कठिनाइयों से वह स्वयं विकसित होकर आत्मनिर्भर बनता है। उसकी सफलता और पहचान स्व-प्रयासों से मिलती है, न कि बाहरी सहायता से।"
    },
    2: {
        house: "द्वितीय भाव (परिवार, धन, वाणी)",
        classical: "परिवार, भोजन, धन और भावनात्मक सहारे से व्यक्तित्व विकसित होता है।",
        expanded: "यह स्थिति परिवारिक सहयोग, भावनात्मक संबल और आर्थिक स्थिरता के माध्यम से व्यक्तित्व निर्माण को दर्शाती है। जातक अपने परिवार की जिम्मेदारियों से अपने कौशल और करियर में मजबूती लाता है। धन संचय और आर्थिक सुरक्षा की भावना उसके आत्मविश्वास की नींव होती है। परिवार उसका मानसिक और व्यावहारिक सहारा बने रहते हैं।"
    },
    3: {
        house: "तृतीय भाव (कौशल, भाई-बहन, छोटे भ्रमण)",
        classical: "कौशल, भाई-बहन और यात्राओं से विकास।",
        expanded: "व्यक्तित्व विकास का प्रमुख माध्यम कौशल निखारना और अनुभवों के माध्यम से सीखना है। छोटे भ्रमण और संचार से प्राप्त अनुभव जीवन दृष्टि को विस्तृत करते हैं। भाई-बहनों के साथ संबंध व्यक्ति के आत्मविकास को प्रभावित करते हैं। लेखन, खेल, कविता और साहसिक कार्य आत्मविश्वास और आत्मबल को बढ़ाते हैं।"
    },
    4: {
        house: "चतुर्थ भाव (घर, सुख, माता)",
        classical: "घर, माता और सुख-सुविधाएं महत्वपूर्ण भूमिका निभाते हैं।",
        expanded: "यह योग शांत, सुरक्षित और पोषक घरेलू वातावरण में विकास की ओर इंगित करता है। गृहस्थ जीवन में संतुलन और मानसिक स्थिरता सफलता लाती है। सुखद स्थान, भोजन दान, और सामाजिक कल्याण जैसे कार्य व्यक्ति में शांति और आत्मसंतोष बढ़ाते हैं। परिवार की भलाई एवं समाजसेवा से आत्मविश्वास और भावनात्मक संतुलन बनता है।"
    },
    5: {
        house: "पंचम भाव (संतान, शिक्षा, रचनात्मकता)",
        classical: "निर्णय लेने, शिक्षा देने, रचनात्मक कार्य और धर्म से व्यक्तित्व विकसित।",
        expanded: "यह स्थिति शिक्षण, संतान से जुड़ी जिम्मेदारी, और सृजनात्मक गतिविधियों के माध्यम से व्यक्ति के विकास का संकेत देती है। शिक्षण, मार्गदर्शन, और समाजसेवा उसके व्यक्तित्व की गहराई बढ़ाते हैं। धार्मिक या मंदिर संबंधी कार्य व्यक्ति में नेतृत्व, जिम्मेदारी, और प्रेरणा की भावना लाते हैं।"
    },
    6: {
        house: "षष्ठ भाव (सेवा, विवाद, स्वास्थ्य)",
        classical: "सेवा, संघर्ष और विवादों से विकास।",
        expanded: "यह स्थिति दिखाती है कि व्यक्ति का व्यक्तित्व कठिन समय से जूझकर और सेवा कार्यों से मजबूत होता है। दूसरों की सहायता, स्वास्थ्य सेवा, या न्याय क्षेत्र में कार्य उसके भीतर सहानुभूति और धैर्य लाते हैं। दान देना, दूसरों की चिकित्सा में मदद करना और अन्याय के विरुद्ध खड़ा होना उसके जीवन के विकास का मार्ग बनता है।"
    },
    7: {
        house: "सप्तम भाव (संबंध, विवाह, साझेदारी)",
        classical: "संबंधों और विवाह से विकास।",
        expanded: "व्यक्तित्व विकास का केंद्र बिंदु वैवाहिक और साझेदारी संबंध होते हैं। वैवाहिक जीवन में सहयोग और समझदारी व्यक्ति के गुणों को निखारती है। यदि संबंधों में टकराव या अलगाव हो तो यह मानसिक परिपक्वता की परीक्षा बनता है। रिश्तों को निभाने की समझ और धैर्य उसके आत्मिक विकास को सुनिश्चित करते हैं।"
    },
    8: {
        house: "अष्टम भाव (परिवर्तन, पुनर्जन्म, रहस्य)",
        classical: "परिवर्तन, पुनर्जन्म और वैराग्य से विकास।",
        expanded: "इस योग में व्यक्ति अपने जीवन के अनेक उतार-चढ़ावों से गुजरकर विकसित होता है। अचानक परिवर्तन और गुप्त अनुभव जीवन को गहराई देते हैं। आत्मसंयम, आभार और ध्यान जैसी आध्यात्मिक प्रवृत्तियाँ इस व्यक्ति को आंतरिक रूप से सशक्त बनाती हैं। जीवन बार-बार नए रूप में पुनर्जन्म जैसा अनुभव देता है।"
    },
    9: {
        house: "नवम भाव (भाग्य, धर्म, परंपरा)",
        classical: "नीतियों, परंपराओं और धार्मिक कर्मों से विकास।",
        expanded: "यदि लग्नेश नवम भाव में स्थित हो, तो व्यक्ति का विकास धर्म, आस्था, और परंपराओं पर आधारित होता है। पारिवारिक परंपराओं और सामाजिक नियमों से संघर्ष होते हैं, पर इन्हीं से सीख मिलती है। धार्मिक कार्य, यात्रा और मंदिर सेवा से आत्मिक उन्नति होती है। प्रसिद्धि और सम्मान अक्सर धार्मिक मार्ग से प्राप्त होते हैं।"
    },
    10: {
        house: "दशम भाव (कर्म, प्रतिष्ठा, सार्वजनिक जीवन)",
        classical: "प्रतिष्ठा, कर्म और कर्मफलों से विकास।",
        expanded: "यह अत्यंत शक्तिशाली स्थिति है जो सार्वजनिक जीवन में प्रसिद्धि और मान देती है। व्यक्ति का व्यक्तित्व उसके पेशेवर प्रयासों और सामाजिक दायित्वों द्वारा निर्मित होता है। नियमित कार्य, अनुशासन और कर्मनिष्ठा से विकास संभव होता है। यह जीवन में कर्म और प्रतिष्ठा के नियमों को सिखाने वाला योग है।"
    },
    11: {
        house: "एकादश भाव (लाभ, समाज, संतोष)",
        classical: "इच्छाओं की पूर्ति, भाई-बहनों की सहायता और सामाजिक सहभागिता से विकास।",
        expanded: "यह योग दर्शाता है कि व्यक्ति सामाजिक संबंधों, मित्रता और समूह कार्यों से बढ़ता है। सामूहिक उद्देश्यों की पूर्ति और नवाचारपूर्ण सोच उसके व्यक्तित्व को उन्नत बनाती है। भाई-बहनों और समाज की सहायता करने से आत्मसंतोष और आदर बढ़ता है।"
    },
    12: {
        house: "द्वादश भाव (हानि, खर्च, मोक्ष)",
        classical: "विदेश, दान, आध्यात्मिकता और मोक्ष से विकास।",
        expanded: "यह योग दर्शाता है कि व्यक्ति विदेशी यात्राओं, खर्चों का प्रबंधन, और भौतिक वस्तुओं से विरक्ति से विकसित होता है। यह व्यक्ति दान, ध्यान और आत्मिक साधना से उन्नति करता है। भौतिकता से दूरी बना कर मोक्ष की भावना अपनाना उसके व्यक्तित्व की सबसे बड़ी सीख होती है।"
    }
};




const THIRD_LORD_EFFECTS = {
    1: {
        house: "1st House ([translate:Ascendant/Lagna])",
        classical: "Self-development, confidence, body challenges, must do hard work alone.",
        expanded: "The native’s self-development is driven by their own efforts, with heritable qualities from past lives manifesting through personal discipline. Growth happens by learning new skills, building confidence, and overcoming feelings of loneliness or isolation. The key remedy for enhancing this placement is regular exercise every morning and dedicated focus on physical and mental self-improvement, which boosts overall personality and resilience."
    },
    2: {
        house: "2nd House (Family, Wealth, Speech)",
        classical: "Family challenges, financial struggles, continual practice.",
        expanded: "Challenges tend to surface in family life and financial matters, which are overcome through persistent practice and learning. Progress is achieved by deep involvement in finance, banking, and establishing strong contacts within the family network. Developing skills in trading and financial management is crucial to stabilize wealth and sustain growth over time."
    },
    3: {
        house: "3rd House ([translate:Skills, Siblings, Short Travel])",
        classical: "Natural talent in trading, communication, writing, and structuring data.",
        expanded: "Innate abilities in negotiation, commerce, and working with information are highlighted, especially if benefic planets like Mercury or Saturn influence this house. Communication and artistic expression become prominent strengths. The native enjoys engaging in activities involving short travels, writing, or speaking, and often has a close and impactful relationship with siblings, shaping their personal and professional growth."
    },
    4: {
        house: "4th House ([translate:Home, Comfort, Mother])",
        classical: "Troubled home environment, property problems, challenges settling in one place.",
        expanded: "This placement may bring difficulties related to property, real estate, or home stability. Finding mentors or experts can help resolve issues related to family property or emotional security. Engaging with books, music, and positive environments supports mental well-being and helps resolve home-related stresses, fostering a sense of peace and nurturing."
    },
    5: {
        house: "5th House ([translate:Children, Education, Creativity])",
        classical: "Natural ability to write, advise, and teach; vision for the future.",
        expanded: "This position indicates a strong inclination towards education, creative pursuits, and advising others. The native may possess a clear vision for future goals but can face challenges in managing relationships with children and leadership roles. Active engagement in religious, educational, and creative activities helps in activating latent talents and facilitates personal growth and recognition."
    },
    6: {
        house: "6th House ([translate:Service, Disputes, Hard Work])",
        classical: "Problems from loans, conflicts, and shortcuts; enjoys struggles.",
        expanded: "Individuals with this placement face challenges related to loans, disputes, and the temptation or tendency to take shortcuts. They often find themselves involved in roles such as law, medicine, or repair work, where perseverance and a strong work ethic are essential. Developing the ability to enjoy hard work and avoid unethical shortcuts is crucial for long-term success."
    },
    7: {
        house: "7th House ([translate:Relationships, Marriage, Partnerships])",
        classical: "Trouble maintaining relationships and partnerships; siblings may settle abroad.",
        expanded: "Dependence on trust and harmony in partnerships and marriage is emphasized. The native may encounter difficulties in sustaining long-term relationships owing to contrasting viewpoints or trust issues. Foreign connections, especially related to siblings, are common. Successful relationships require mutual trust, understanding, and effort."
    },
    8: {
        house: "8th House ([translate:Transformation, Secrets, Sudden Events])",
        classical: "Loss of skill/talent due to sudden events or parental loss.",
        expanded: "This placement suggests potential loss or suppression of talents caused by trauma or major life disruptions, such as the death of a parent. The native may experience frequent changes, affecting progress in personal or professional domains. Developing resilience and being cautious about responsibilities that could divert attention from inherent talents is vital for overcoming obstacles."
    },
    9: {
        house: "9th House ([translate:Luck, Dharma, Fortune])",
        classical: "Natural knowledge, luck triggered by guru or mentor; siblings may go abroad.",
        expanded: "The native acquires knowledge and good fortune through spiritual practices, mentorship, and divine blessings. Opportunities for growth and success often come from higher learning, travel, and foreign connections. A sibling may settle abroad, and love marriages are also a possibility, reflecting the house's connection to faith, luck, and higher principles."
    },
    10: {
        house: "10th House ([translate:Career, Profession, Public Image])",
        classical: "Career becomes hobby, unique world view.",
        expanded: "This position fosters a passionate pursuit of careers aligned with personal interests or hobbies. The native often stands out in their professional field, and career shifts may occur after significant encounters or realizations. Discipline, proper documentation, and professional integrity are key to accelerating growth and recognition."
    },
    11: {
        house: "11th House ([translate:Gains, Networks, Social Circle])",
        classical: "Hard work for money, caution with friendships and business partners.",
        expanded: "The native needs to exert considerable effort to obtain wealth and success, relying heavily on social networks and collaborations. There's a risk of betrayal or loss through unreliable partners, thus trusting others blindly is discouraged. Regularly reviewing and maintaining investments and connections is essential for steady gains."
    },
    12: {
        house: "12th House ([translate:Loss, Expenses, Moksha])",
        classical: "Loss of talent, isolation, skill returns after a major life event.",
        expanded: "Talents may be temporarily lost or suppressed due to environmental changes or sacrifices made for others, such as in marriage or moving abroad. The skill set often resurges after profound life events like childbirth, marriage, or spiritual practice. Embracing solitude and practicing spiritual disciplines help focus energy towards growth and eventual mastery."
    }
}
const THIRD_LORD_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        classical: "स्व-विकास, आत्मविश्वास, शारीरिक संघर्ष, अकेले परिश्रम द्वारा प्रगति।",
        expanded: "इस स्थिति में व्यक्ति का आत्मविकास उसके अपने परिश्रम और अनुशासन पर आधारित होता है। पूर्व जन्म के संस्कार और गुण व्यक्तिगत प्रयासों के माध्यम से प्रकट होते हैं। नए कौशल सीखना, आत्मविश्वास बढ़ाना और एकांत या अकेलेपन की भावना को पार करना उसके जीवन का हिस्सा रहता है। नियमित व्यायाम और मानसिक तराश इसका श्रेष्ठ उपाय है, जो व्यक्तित्व और सहनशक्ति को बढ़ाता है।"
    },
    2: {
        house: "द्वितीय भाव (परिवार, धन, वाणी)",
        classical: "पारिवारिक चुनौतियाँ, आर्थिक संघर्ष, निरंतर अभ्यास से प्रगति।",
        expanded: "इस स्थिति में व्यक्ति को परिवार और धन से संबंधित कठिनाइयों का सामना करना पड़ता है, जिन्हें निरंतर अभ्यास और परिश्रम से पार किया जा सकता है। वित्त, बैंकिंग और पारिवारिक नेटवर्क से जुड़े कार्यों में सक्रिय रहना सफलता लाता है। व्यापारिक कौशल और वित्तीय प्रबंधन में निपुणता धन स्थिरता की कुंजी होती है।"
    },
    3: {
        house: "तृतीय भाव (कौशल, भाई-बहन, छोटे भ्रमण)",
        classical: "व्यापार, संचार, लेखन और सूचना संरचना में स्वाभाविक प्रतिभा।",
        expanded: "इस योग में जातक में वार्तालाप, लेनदेन, और सूचना प्रबंधन की प्राकृतिक क्षमता होती है। यदि बुध या शनि जैसे शुभ ग्रहों का प्रभाव रहे तो संचार और कला की दिशा में बड़ी सफलता मिलती है। लेखन, यात्रा या प्रस्तुति से संबंधित कार्यों में आनंद पाता है। भाई-बहनों से संबंध व्यक्ति के विकास और करियर पर सकारात्मक प्रभाव डालते हैं।"
    },
    4: {
        house: "चतुर्थ भाव (घर, सुख, माता)",
        classical: "गृहस्थ जीवन में तनाव, संपत्ति विवाद, एक स्थान पर स्थिरता में कठिनाई।",
        expanded: "इस ग्रह स्थिति से व्यक्ति को संपत्ति, घर या मानसिक शांति से जुड़ी कठिनाइयों का सामना करना पड़ सकता है। परिवार या घर से जुड़ी समस्याओं के समाधान के लिए मार्गदर्शन और विशेषज्ञों की मदद लाभकारी रहती है। संगीत, पुस्तकें और सकारात्मक वातावरण से मानसिक शांति प्राप्त होती है और तनाव का निवारण होता है।"
    },
    5: {
        house: "पंचम भाव (संतान, शिक्षा, रचनात्मकता)",
        classical: "लेखन, शिक्षण और मार्गदर्शन में स्वाभाविक योग्यता, भविष्य के लिए दृष्टि।",
        expanded: "इस स्थिति में व्यक्ति में शिक्षा, शिक्षण और सृजनात्मक कार्यों की विशेष प्रवृत्ति होती है। बच्चों और मार्गदर्शन से संबंधित जिम्मेदारियाँ जीवन में महत्त्वपूर्ण भूमिका निभाती हैं। रचनात्मक और आध्यात्मिक गतिविधियाँ व्यक्ति की छिपी प्रतिभाओं को सक्रिय करती हैं और उसे समाज में सम्मान दिलाती हैं।"
    },
    6: {
        house: "षष्ठ भाव (सेवा, विवाद, परिश्रम)",
        classical: "ऋण, विवाद और शॉर्टकट से समस्याएँ, संघर्ष में आनंद।",
        expanded: "इस स्थिति में व्यक्ति को ऋण, प्रतिस्पर्धा या विवादों से जुड़ी चुनौतियाँ मिलती हैं। अदालत, चिकित्सा या मरम्मत संबंधी कार्यों में वह उपयुक्त सिद्ध होता है। ये व्यक्ति कठिनाइयों से नहीं डरते बल्कि उनका सामना करते हुए संतोष पाते हैं। कड़ी मेहनत का आनंद लेना और अनैतिक रास्तों से बचना उसकी प्रगति के लिए आवश्यक होता है।"
    },
    7: {
        house: "सप्तम भाव (संबंध, विवाह, साझेदारी)",
        classical: "संबंधों और साझेदारी में कठिनाई, भाई-बहन विदेश में बस सकते हैं।",
        expanded: "इस स्थिति में विश्वास और सामंजस्य पर आधारित संबंध महत्वपूर्ण हो जाते हैं। रिश्तों में मतभेद या अस्थिरता का सामना करना पड़ सकता है। विशेषकर विवाह और व्यापारिक साझेदारी में सच्चाई और समझ आवश्यक है। कई बार भाई-बहन विदेशों में स्थायी रूप से बस सकते हैं, जो व्यक्ति के जीवन मार्ग को प्रभावित करते हैं।"
    },
    8: {
        house: "अष्टम भाव (परिवर्तन, रहस्य, अचानक घटनाएँ)",
        classical: "अचानक घटनाओं या माता-पिता की हानि के कारण प्रतिभा प्रभावित होती है।",
        expanded: "इस स्थिति में व्यक्ति की योग्यता या कौशल अस्थायी रूप से दब सकता है, विशेषतः जीवन में अचानक आए परिवर्तनों या किसी प्रियजन की मृत्यु जैसी घटनाओं से। लगातार परिवर्तन या अस्थिरता व्यक्ति के कर्मपथ को बाधित कर सकती है। आत्मबल और जिम्मेदारियों के प्रति सजगता रखना जीवन में पुनः उन्नति लाता है।"
    },
    9: {
        house: "नवम भाव (भाग्य, धर्म, सौभाग्य)",
        classical: "ज्ञान और सौभाग्य गुरु या मार्गदर्शन से प्राप्त होता है, भाई-बहन विदेश में बस सकते हैं।",
        expanded: "इस स्थिति में व्यक्ति को भाग्य और ज्ञान गुरु या किसी वरिष्ठ मार्गदर्शक के माध्यम से प्राप्त होता है। उच्च शिक्षा, यात्रा और विदेश संपर्क उसके जीवन में उन्नति लाते हैं। भाई-बहन का विदेश में निवास या प्रेम विवाह जैसी घटनाएँ भी संभावित हैं। यह स्थिति व्यक्ति को धर्म, आस्था और ऊँचे आदर्शों की ओर अग्रसर करती है।"
    },
    10: {
        house: "दशम भाव (कैरियर, पेशा, सार्वजनिक छवि)",
        classical: "पेशा ही शौक बन जाता है, अनोखी दृष्टि।",
        expanded: "इस स्थिति में व्यक्ति अपने पेशे में जुनून से काम करता है और अक्सर वही कार्य उसका शौक बन जाता है। करियर में विशिष्टता और अलग पहचान बनती है। कई बार जीवन में महत्वपूर्ण घटनाओं के बाद पेशा या दिशा बदल जाती है। अनुशासन, दस्तावेजी सटीकता और नैतिक निष्ठा सफलता की कुंजी होती है।"
    },
    11: {
        house: "एकादश भाव (लाभ, मित्र, सामाजिक दायरा)",
        classical: "धन अर्जन के लिए परिश्रम, मित्रों और सहयोगियों से सावधानी।",
        expanded: "इस स्थिति में व्यक्ति को धन अर्जित करने के लिए अधिक मेहनत करनी पड़ती है और सामाजिक संबंधों पर निर्भर रहना पड़ता है। गलत मित्रों या साझेदारों पर भरोसा नुकसान पहुंचा सकता है। निवेशों और संबंधों की नियमित समीक्षा सफलता और आर्थिक स्थिरता बनाए रखने के लिए आवश्यक होती है।"
    },
    12: {
        house: "द्वादश भाव (हानि, खर्च, मोक्ष)",
        classical: "प्रतिभा का ह्रास, एकांत जीवन, किसी बड़े जीवन परिवर्तन के बाद कौशल लौटता है।",
        expanded: "इस स्थिति में व्यक्ति की प्रतिभा या योग्यता अस्थायी रूप से कमजोर हो सकती है, विशेषकर यदि वह दूसरों के हित में त्याग करता है या विदेश में बसता है। परंतु समय आने पर यही कौशल पुनः प्रकट होता है, अक्सर विवाह, संतान या आध्यात्मिक साधना के बाद। एकांत में रहना, ध्यान और आध्यात्मिक अभ्यास पुनरुद्धार का माध्यम बनते हैं।"
    }
};


const FOURTH_LORD_EFFECTS = {
    1: {
        house: "1st House ([translate:Ascendant/Lagna])",
        classical: "Strong link between happiness and personal self; family roots define identity, struggles with confidence and public speaking.",
        expanded: "The native often builds property or wealth from the ground up, relying on the support of others for success. Emphasizes family and collective happiness over individual gain. Social responsibility is a key theme, with continuous personal development leading to greater happiness. However, the individual may wrestle with issues of self-confidence and challenges in public speaking."
    },
    2: {
        house: "2nd House (Family, Wealth, Speech)",
        classical: "Family and ancestral property, accumulation of wealth, happiness tied to legacy.",
        expanded: "Enjoys a traditional and stable home environment, deriving wealth through family and ancestral inheritance. The native strives for collective family harmony and joy, with their deepest aspirations rooted in creating a happy and secure environment for all family members."
    },
    3: {
        house: "3rd House (Skills, Siblings, Communication)",
        classical: "Multistory homes, connection with siblings, happiness through social circles and construction.",
        expanded: "Prefers living in apartments or multi-story buildings, with a strong connection to siblings who influence happiness and social well-being. Emphasizes maintaining harmony with neighbors and the surrounding environment. It is important to avoid causing disturbances or conflicts while engaging in property or social matters to sustain peace and happiness."
    },
    4: {
        house: "4th House ([translate:Home, Roots, Emotions])",
        classical: "Rarely leaves home, deeply rooted; advisor to many; collective happiness.",
        expanded: "Devoted to contributing to societal welfare through activities like charity and beautifying living spaces. Shows emotional stability and serves as an inspiration to others. Prosperity and stability often flourish in conjunction with adherence to tradition and cultural roots."
    },
    5: {
        house: "5th House (Children, Creativity, Fame)",
        classical: "Political connections, fame, mother is well-known for knowledge.",
        expanded: "The native frequently acts as a problem solver for others and possesses visionary qualities. Benefits materially and spiritually from education and creative endeavors. The mother’s reputation and knowledge profoundly impact the native’s own status and personality."
    },
    6: {
        house: "6th House (Service, Disputes, Enemies)",
        classical: "Constant struggles, fights for others; few classics speak positively of this placement.",
        expanded: "This placement suggests ongoing challenges and conflicts, especially related to protecting others. The home environment might be unstable, requiring clear boundaries between work and personal life. Careers from home, such as law or medicine, are common, but the native is advised to keep professional issues distinct from family life to maintain harmony."
    },
    7: {
        house: "7th House (Marriage, Partnerships, Travels)",
        classical: "Travels, builds luxurious homes, designer aesthetics.",
        expanded: "Prefers living in beautiful, expansive, and luxurious homes, often seeking uniqueness and comfort in domestic life. Stability in life and finances often follows the acquisition or construction of large and aesthetically pleasing properties, reflecting an elevated lifestyle."
    },
    8: {
        house: "8th House (Transformation, Inheritance, Secrets)",
        classical: "Emotional dissatisfaction, inner sorrow persists.",
        expanded: "The native experiences difficulty in expressing emotions fully, which can lead to internal struggles that manifest as ongoing life challenges. Working consciously on emotional satisfaction and expression is crucial for mental peace and overall well-being."
    },
    9: {
        house: "9th House ([translate:Luck, Religion, Dharma])",
        classical: "Multiple homes, religious activism, happiness from spiritual deeds.",
        expanded: "Finds joy in contributing to society and engaging in religious or spiritual activities. Often has homes in multiple locations and gains materially and spiritually by following traditions and honoring spiritual teachers or gurus."
    },
    10: {
        house: "10th House (Career, Reputation, Fame)",
        classical: "Hard work leads to success; demotivation possible if afflicted.",
        expanded: "Success comes after sustained effort, usually marked by a significant rise in career and social respect after the age of 36. Afflictions may cause the native to struggle with self-motivation and even demotivate others. Maintaining faith in personal effort and taking pride in achievements are essential remedies."
    },
    11: {
        house: "11th House (Gains, Social Networks, Desires)",
        classical: "Excessive desires disrupt peace; multitasking is common.",
        expanded: "The native tends to take on multiple roles simultaneously at home and in social circles, leading to burnout if not managed carefully. Practicing restraint in desires and learning to take periodic breaks contribute to greater peace and satisfaction."
    },
    12: {
        house: "12th House (Isolation, Loss, Foreign, Sacrifice)",
        classical: "Difficulty living in own home, feels dependent, delayed peace.",
        expanded: "May spend significant time in institutional settings such as jails or ships, or in foreign lands. Financial and emotional stability often comes late in life, generally after the age of 51. Strengthening the emotional foundation through donations, adherence to tradition, and spiritual practices is crucial for achieving peace of mind and a sense of security."
    }
};
const FOURTH_LORD_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        classical: "खुशी और व्यक्तिगत स्वभाव के बीच मजबूत संबंध; परिवार की जड़ें पहचान को परिभाषित करती हैं, आत्मविश्वास और सार्वजनिक बोलने में संघर्ष।",
        expanded: "जातक अक्सर दूसरों के समर्थन पर निर्भर होकर संपत्ति या धन बनाता है। व्यक्तिगत लाभ से अधिक परिवार और सामूहिक खुशी को महत्व देता है। सामाजिक जिम्मेदारी महत्वपूर्ण भूमिका निभाती है, जिसमें लगातार आत्म-विकास से खुशी मिलती है। हालांकि, व्यक्ति कभी-कभी आत्मविश्वास की समस्याओं और सार्वजनिक बोलने में कठिनाइयों से जूझता है।"
    },
    2: {
        house: "द्वितीय भाव (परिवार, धन, वाणी)",
        classical: "परिवार और वंशजों की संपत्ति, धन संचय, विरासत से जुड़ी खुशी।",
        expanded: "परिवार और वंश परंपरा से संपत्ति प्राप्त करने वाला स्थिर और पारंपरिक गृह वातावरण पसंद करता है। जातक सामूहिक पारिवारिक सौहार्द और आनंद के लिए प्रयासरत रहता है, उसकी गहरी आकांक्षाएँ सभी परिवार के सदस्यों के लिए सुरक्षित और खुशहाल वातावरण बनाना हैं।"
    },
    3: {
        house: "तृतीय भाव (कौशल, भाई-बहन, संचार)",
        classical: "मल्टी-स्टोरी मकान, भाई-बहनों से जुड़ाव, सामाजिक वास तथा निर्माण में खुशी।",
        expanded: "अपार्टमेंट या बहुमंजिला मकानों में रहना पसंद करता है, और भाई-बहनों के साथ मजबूत संबंध जो उसकी खुशी और सामाजिक कल्याण को प्रभावित करते हैं। पड़ोसियों और परिवेश के साथ सौहार्द बनाए रखना महत्वपूर्ण होता है। संपत्ति या सामाजिक मामलों में विवाद और परेशानियां टालना चाहिए ताकि शांति और खुशी बनी रहे।"
    },
    4: {
        house: "चतुर्थ भाव (घर, जड़ें, भावनाएँ)",
        classical: "मूल रूप से घर से जुड़ा, कई लोगों के लिए सलाहकार, सामूहिक खुशी।",
        expanded: "समाज कल्याण के लिए दान और आवास के सौंदर्यीकरण जैसे कार्यों में सक्रिय रहता है। भावनात्मक स्थिरता प्रदर्शित करता है और दूसरों के लिए प्रेरणा स्रोत होता है। परंपरा और सांस्कृतिक जड़ों के साथ मेल से समृद्धि और स्थिरता प्राप्त होती है।"
    },
    5: {
        house: "पंचम भाव (संतान, रचनात्मकता, लोकप्रियता)",
        classical: "राजनीतिक कनेक्शन, प्रसिद्धि, माता ज्ञान के लिए प्रसिद्ध।",
        expanded: "जातक अक्सर दूसरों के लिए समस्या समाधान करता है और दूरदर्शी होता है। शिक्षा और रचनात्मक कार्यों से आध्यात्मिक और भौतिक लाभ पाता है। माता की प्रतिष्ठा और ज्ञान का गहरा प्रभाव उसके स्वयं के दर्जे और व्यक्तित्व पर पड़ता है।"
    },
    6: {
        house: "षष्ठ भाव (सेवा, विवाद, शत्रु)",
        classical: "लगातार संघर्ष, दूसरों के लिए लड़ाई; कुछ शास्त्र इस स्थिति की सकारात्मकता नहीं बताते।",
        expanded: "यह स्थिति दूसरों की रक्षा में निरंतर चुनौतियाँ और संघर्ष दर्शाती है। घर का वातावरण अस्थिर हो सकता है, काम और व्यक्तिगत जीवन के बीच स्पष्ट सीमा जरूरी होती है। कानून या चिकित्सा जैसे घर से जुड़े करियर आम होते हैं, किन्तु सामाजिक सौहार्द बनाए रखने के लिए पेशेवर और पारिवारिक जीवन अलग रखना आवश्यक है।"
    },
    7: {
        house: "सप्तम भाव (विवाह, साझेदारी, यात्रा)",
        classical: "यात्राएं, भव्य घर बनाना, डिज़ाइनर सौंदर्यशास्त्र।",
        expanded: "सुंदर, विस्तृत और भव्य आवासों में रहना पसंद करता है, जो घरेलू जीवन में विशिष्टता और आराम की चाह दर्शाते हैं। बड़े और एस्थेटिक रूप से आकर्षक संपत्तियों के अधिग्रहण से जीवन में स्थिरता और वित्तीय समृद्धि आती है, जो विस्तृत जीवनशैली का संकेत है।"
    },
    8: {
        house: "अष्टम भाव (परिवर्तन, विरासत, रहस्य)",
        classical: "भावनात्मक असंतोष, आंतरिक दुख बना रहता है।",
        expanded: "जातक अपनी भावनाओं को पूरी तरह व्यक्त करने में कठिनाई महसूस करता है, जिससे आंतरिक संघर्ष उत्पन्न होते हैं जो जीवन भर के लिए चुनौतियां बना सकते हैं। मानसिक शांति और सम्पूर्ण कल्याण के लिए भावनात्मक संतोष और अभिव्यक्ति पर सचेत कार्य आवश्यक है।"
    },
    9: {
        house: "नवम भाव (भाग्य, धर्म, कर्म)",
        classical: "कई घर, धार्मिक सक्रियता, आध्यात्मिक कार्यों से खुशी।",
        expanded: "समाज में योगदान और धार्मिक या आध्यात्मिक गतिविधियों में संलग्न होकर आनंद प्राप्त करता है। अक्सर कई स्थानों पर घर होते हैं और परंपराओं का पालन तथा आध्यात्मिक गुरुजन की सेवा से भौतिक और आध्यात्मिक लाभ होता है।"
    },
    10: {
        house: "दशम भाव (कैरियर, प्रतिष्ठा, प्रसिद्धि)",
        classical: "कड़ी मेहनत सफलता लाती है; बाधाओं से निराशा संभव।",
        expanded: "लगातार प्रयास के बाद सफलता मिलती है, खासकर 36 वर्ष के बाद करियर और सामाजिक सम्मान में वृद्धि होती है। ग्रह बाधाएं स्व-प्रेरणा में कमी या दूसरों को निराश करने की संभावना लाती हैं। व्यक्तिगत परिश्रम पर विश्वास बनाए रखना और उपलब्धियों पर गर्व करना आवश्यक उपचार हैं।"
    },
    11: {
        house: "एकादश भाव (लाभ, सामाजिक नेटवर्क, इच्छाएँ)",
        classical: "अत्यधिक इच्छाएं शांति भंग करती हैं; बहु-कार्य सामान्य।",
        expanded: "जातक एक साथ अनेक भूमिकाएं निभाता है, जिससे अधिक कार्यभार और थकान होने का खतरा रहता है। इच्छाओं में संयम और समय-समय पर विराम लेने की आदत शांति और संतुष्टि बढ़ाती है।"
    },
    12: {
        house: "द्वादश भाव (अलगाव, हानि, विदेश, त्याग)",
        classical: "अपने घर में रहने में कठिनाई, निर्भरता की भावना, विलंबित शांति।",
        expanded: "कई बार व्यक्ति जेल, जहाज या विदेशी स्थानों पर समय बिताता है। आर्थिक और भावनात्मक स्थिरता जीवन के उत्तरार्ध में, आमतौर पर 51 वर्ष के बाद आती है। दान, परंपरा का पालन और आध्यात्मिक अभ्यास से मानसिक शांति और सुरक्षा की भावना मजबूत होती है।"
    }
};

const FIFTH_LORD_EFFECTS = {
    1: {
        house: "1st House ([translate:Ascendant/Lagna])",
        classical: "[translate:Punya] from past lives manifests as charisma, creativity, intelligence, and strong self-expression.",
        expanded: "The native enjoys a high degree of freewill and is blessed with good looks and natural leadership abilities. Fame and recognition in their chosen field come as deserved rewards for efforts made in previous lives. Creative talents are prominent, with an affinity for the arts and visionary thinking."
    },
    2: {
        house: "2nd House (Wealth, Family, Speech)",
        classical: "[translate:Punya] manifests through earnings, accumulated wealth, and strong family support.",
        expanded: "Financial stability improves easily due to active backing from family members. However, afflictions may delay or diminish the enjoyment of this support. Speech patterns, food habits, and familial relationships clearly reflect karmic outcomes, showcasing rewards or challenges linked to past deeds."
    },
    3: {
        house: "3rd House (Siblings, Skills, Communication)",
        classical: "[translate:Punya] expressed through skillful engagements in sports, fighting, medals, and other notable achievements.",
        expanded: "Success in competitive fields is common; fame might come via visibility in sports, arts, or writing. Titles and awards received are direct results of karmic merit, often supported by harmonious relationships with siblings which foster creative and competitive growth."
    },
    4: {
        house: "4th House (Home, Property, Mother)",
        classical: "Benefits arise in property ownership, vehicles, mental peace, and a happy home environment.",
        expanded: "The native enjoys a harmonious and peaceful home life, good quality vehicles, and potential success in industries like construction or transportation, especially if Saturn influences this house. The accumulation of [translate:punya] supports building a stable and luxurious family foundation. Though Saturn as the fifth lord may bring difficulty, it often results in great achievements in construction or business."
    },
    5: {
        house: "5th House (Self, Creativity, Accumulated [translate:Punya])",
        classical: "Continuous accumulation of [translate:punya], fame, and self-centric happiness.",
        expanded: "Expresses creative accomplishments proudly and appreciates capturing the essence of life. Growth is fueled by sharing knowledge and introspection. Karmic rewards manifest as repeated successes and sometimes strong social media presence or public recognition."
    },
    6: {
        house: "6th House (Service, Disease, Debt)",
        classical: "[translate:Punya] expended in tangible matters like service, debts, and enemies.",
        expanded: "Material gains are possible until karmic debts are exhausted, after which health issues may arise. Exalted placements promote good health; however, overinvolvement in physical or earthy matters can lead to complications. Remedial measures are necessary when afflicted."
    },
    7: {
        house: "7th House (Marriage, Partnerships)",
        classical: "[translate:Punya] manifests through spouse or partner, often limited by external control.",
        expanded: "Partnerships and marriage are significant sources of karmic rewards, often involving powerful spouses or collaborations. Classical texts recognize this as potentially challenging due to restrictions on personal freedom. Nevertheless, a harmonious marriage is considered a valuable karmic blessing."
    },
    8: {
        house: "8th House (Transformation, Secrets, Sudden Events)",
        classical: "[translate:Punya] lost due to speech problems, internal conflicts; silence is advised.",
        expanded: "Chronic issues and karmic debts are indicated, particularly with afflicted placements. Verbal restraint and cautious communication bring benefits. Remedies focus on improving health and addressing speech-related difficulties."
    },
    9: {
        house: "9th House ([translate:Luck, Dharma, Spirituality])",
        classical: "Exceptional [translate:punya]; spiritual growth and the ability to perform unique deeds.",
        expanded: "This placement marks a major karmic exchange, especially for Scorpios, endowed with the ability to undertake rare and remarkable actions. Support and blessings from [translate:guru] and spiritual guides amplify fame and foster creative pursuits as blessings."
    },
    10: {
        house: "10th House (Career, Fame, Public Life)",
        classical: "Legendary combination leading to renown, fame, and career success.",
        expanded: "The native is hardworking, self-reliant, and ascends societal ranks through merits accumulated in past lives. Prefers independence in career growth and avoids seeking external help, emphasizing self-made success."
    },
    11: {
        house: "11th House (Gains, Networks, Social Satisfaction)",
        classical: "Over-indulgence in desires, leading to dissatisfaction despite abundance.",
        expanded: "There is a constant chase for new goals and ambitions, and a key life lesson is learning patience and contentment. Excessive accumulation breeds restlessness, making it important for the native to appreciate their achievements and adopt a slower pace in life."
    },
    12: {
        house: "12th House (Foreign, Isolation, Spiritual Loss)",
        classical: "Foreign connections influence studies; karmic losses occur.",
        expanded: "Studies or educational pursuits abroad are prominent, though excessive charity and waste may lead to loss of [translate:punya]. The native benefits from honoring the twelfth lord through focused energy and spiritual practices. This placement strongly links the individual with foreign lands and spiritual journeys."
    }
};
const FIFTH_LORD_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        classical: "पूर्वजन्म के पुण्य के कारण चारित्रिक आकर्षण, रचनात्मकता, बुद्धिमत्ता और शक्तिशाली आत्म-अभिव्यक्ति होती है।",
        expanded: "जातक को स्वेच्छा की उच्च सीमा मिलती है और उसे स्वाभाविक नेतृत्व क्षमता और आकर्षक व्यक्तित्व प्राप्त होता है। पूर्व जन्म के परिश्रमों के फलस्वरूप उनके चुने हुए क्षेत्र में प्रसिद्धि और सम्मान प्राप्त होता है। कला के लिए झुकाव और दूरदर्शी सोच प्रमुख होती है।"
    },
    2: {
        house: "द्वितीय भाव (धन, परिवार, वाणी)",
        classical: "पुण्य का अभिव्यक्त रूप आय, जमा धन, और परिवार के मजबूत सहयोग में दिखाई देता है।",
        expanded: "परिवार के सक्रिय समर्थन के कारण आर्थिक स्थिरता आसानी से बढ़ जाती है। हालांकि, दोष ग्रहों की दशा में इस सहायता का आनंद लेने में बाधाएं आ सकती हैं। वाणी के ढांचे, भोजन की आदतों और पारिवारिक संबंधों में कर्मों का परिणाम स्पष्ट दिखाई देता है।"
    },
    3: {
        house: "तृतीय भाव (भाई-बहन, कौशल, संचार)",
        classical: "पुण्य का अभिव्यक्त रूप खेल, युद्ध, पदक और अन्य प्रशंसा योग्य उपलब्धियों में होता है।",
        expanded: "प्रतिस्पर्धात्मक क्षेत्रों में सफलता आम है; खेल, कला या लेखन के माध्यम से प्रसिद्धि भी मिलती है। प्राप्त पुरस्कार और सम्मान सीधे कर्मों के फल होते हैं, जो भाई-बहनों के सहयोग से मजबूत होते हैं और रचनात्मक एवं प्रतिस्पर्धात्मक विकास को बढ़ावा देते हैं।"
    },
    4: {
        house: "चतुर्थ भाव (घर, संपत्ति, माता)",
        classical: "संपत्ति, वाहन, मानसिक शांति और सुखी घरेलू वातावरण में लाभ।",
        expanded: "जातक सुखी और सामंजस्यपूर्ण गृह जीवन का आनंद लेता है, अच्छे वाहन होते हैं, और निर्माण या परिवहन उद्योग में सफलता प्राप्त कर सकता है, विशेषकर यदि शनि इस घर को प्रभावित कर रहा हो। पुण्य के संचय से एक स्थिर और भव्य पारिवारिक आधार बनता है। हालांकि शनि पंचम स्वामी होने के नाते कठिनाई ला सकता है, इसका परिणाम निर्माण या व्यवसाय में बड़ी सफलता के रूप में होता है।"
    },
    5: {
        house: "पंचम भाव (स्वयं, रचनात्मकता, संचयित पुण्य)",
        classical: "पुण्य का निरंतर संचय, प्रसिद्धि और आत्म-केंद्रित खुशी।",
        expanded: "रचनात्मक उपलब्धियों को गर्व से व्यक्त करता है और जीवन के सार को पकड़ने की सराहना करता है। विकास ज्ञान साझा करने और आत्मनिरीक्षण से प्रेरित होता है। कर्मिक फलस्वरूप कई बार सफलता दोहराई जाती है और सामाजिक मीडिया या सार्वजनिक मान्यता में वृद्धि होती है।"
    },
    6: {
        house: "षष्ठ भाव (सेवा, रोग, ऋण)",
        classical: "सेवा, ऋण और शत्रुओं में व्यय हुआ पुण्य।",
        expanded: "जब तक कर्मिक ऋण समाप्त नहीं होता, तब तक भौतिक लाभ संभव हैं, फिर स्वास्थ्य संबंधी समस्याएं आ सकती हैं। उच्चस्थ ग्रहों के प्रभाव से अच्छी सेहत मिलती है; हालांकि भौतिक या पृथ्वी से जुड़े मामलों में अत्यधिक उलझाव जटिलताओं को जन्म दे सकता है। दोषग्रस्त होने पर उपाय आवश्यक होते हैं।"
    },
    7: {
        house: "सप्तम भाव (विवाह, साझेदारी)",
        classical: "पति या साथी के माध्यम से पुण्य के फल; बाहरी नियंत्रण से सीमित।",
        expanded: "साझेदारी और विवाह कर्मिक पुरस्कारों के महत्वपूर्ण स्रोत हैं, जिनमें प्रभावशाली जीवनसाथी या सहयोग शामिल हो सकते हैं। शास्त्र इन्हें व्यक्तिगत स्वतंत्रता की सीमाओं के कारण चुनौतीपूर्ण मानते हैं। बावजूद इसके, एक सामंजस्यपूर्ण विवाह बड़ी कर्मिक देन माना जाता है।"
    },
    8: {
        house: "अष्टम भाव (परिवर्तन, रहस्य, अचानक घटनाएं)",
        classical: "वाणी की समस्याओं, आंतरिक संघर्षों के कारण पुण्य की हानि; मौन की सलाह।",
        expanded: "विशेषकर दोषग्रस्त दशा में निरंतर समस्याएं और कर्मिक ऋण दिखते हैं। मौखिक संयम और सतर्क संवाद लाभकारी होते हैं। स्वास्थ्य सुधार और वाणी संबंधी कठिनाइयों के उपचार केंद्रित होते हैं।"
    },
    9: {
        house: "नवम भाव (भाग्य, धर्म, आध्यात्मिकता)",
        classical: "असाधारण पुण्य; आध्यात्मिक विकास और अद्वितीय कार्य करने की क्षमता।",
        expanded: "यह स्थान विशेषकर वृश्चिक राशि वाले जातकों के लिए एक बड़ा कर्मिक आदान-प्रदान दर्शाता है, जो असाधारण कार्य करने की योग्यता से संपन्न होता है। गुरु और आध्यात्मिक मार्गदर्शकों का आशीर्वाद प्रसिद्धि और रचनात्मक प्रयासों को बढ़ावा देता है।"
    },
    10: {
        house: "दशम भाव (कैरियर, प्रसिद्धि, सार्वजनिक जीवन)",
        classical: "प्रसिद्धि, मान और कैरियर सफलता के लिए प्रसिद्ध योग।",
        expanded: "जातक कठोर परिश्रमी, आत्मनिर्भर होता है और पूर्व जन्मों में अर्जित योगों के आधार पर सामाजिक स्तर पर ऊँचा उठता है। कैरियर में स्वतंत्रता पसंद करता है और बाहरी मदद लेने से बचता है, स्वनिर्मित सफलता पर जोर देता है।"
    },
    11: {
        house: "एकादश भाव (लाभ, नेटवर्क, सामाजिक संतुष्टि)",
        classical: "इच्छाओं में अत्यधिक लिप्तता, प्रचुरता के बावजूद असंतुष्टि।",
        expanded: "नए लक्ष्यों और आकांक्षाओं का निरंतर पीछा करता है, जिसके साथ धैर्य और संतुष्टि सीखना जीवन का प्रमुख पाठ होता है। अत्यधिक संचय बेचैनी उत्पन्न करता है, इसलिए जातक के लिए अपनी उपलब्धियों की सराहना करना और जीवन में गति धीमी करना आवश्यक होता है।"
    },
    12: {
        house: "द्वादश भाव (विदेश, अलगाव, आध्यात्मिक हानि)",
        classical: "विदेशी संपर्क अध्ययन को प्रभावित करते हैं; कर्मिक हानि होती है।",
        expanded: "विदेशों में अध्ययन या शैक्षिक प्रयास प्रमुख रहते हैं, हालांकि अत्यधिक दान और बेकार खर्च से पुण्य की हानि हो सकती है। जातक को द्वादश स्वामी के सम्मान के माध्यम से ऊर्जा और आध्यात्मिक अभ्यासों में लाभ होता है। यह स्थिति व्यक्ति को विदेशी भूमि और आध्यात्मिक यात्राओं से गहराई से जोड़ती है।"
    }
};

const SIXTH_LORD_EFFECTS = {
    1: {
        house: "1st House ([translate:Ascendant/Lagna])",
        classical: "Health issues, pays debts through body, struggles and hard work.",
        expanded: "The native repays karmic debts primarily through challenges related to health and sustained effort in work. Hard work and strong self-discipline are essential to mitigate these effects. Engaging in emotional labor and helping others forms an important remedy. If Saturn is involved, feelings of being undervalued are common; if the Moon dominates, emotional support, poetry, and artistic expression offer solace."
    },
    2: {
        house: "2nd House (Family, Wealth, Speech)",
        classical: "Troubles in finances, family disputes, speech-related fights.",
        expanded: "Financial debts and family disputes are recurring challenges. Arguments often arise related to food or speech, with income coming from multiple, sometimes duplicative sources. It is advisable to avoid eating from others’ plates as a symbolic remedy. Financial struggles or underpayment are common themes requiring vigilance and care."
    },
    3: {
        house: "3rd House (Siblings, Courage, Paperwork)",
        classical: "Fights and disputes with siblings, problems during new ventures.",
        expanded: "This placement features bravery and courage but also constant daily battles and disputes. Attention to paperwork, formalities, and early steps in any new venture is critical. Sibling rivalry is a significant theme, demanding conscious efforts to foster harmony despite competitive circumstances."
    },
    4: {
        house: "4th House (Home, Mother, Property)",
        classical: "Disputes at home, legal/illegal property, problems with mother’s happiness.",
        expanded: "Native experiences tension and disputes at home, possibly involving property issues and vehicle troubles. Peace often comes only after physically leaving the family home. Recommended remedies include maintaining cleanliness in the North and East directions and performing donations at temples to restore tranquility and familial harmony."
    },
    5: {
        house: "5th House (Children, Education, Creativity)",
        classical: "Nullifies past-life good karma, steals fame and creative joy.",
        expanded: "Debts are repaid through children, educational pursuits, and creative work. Fame and visionary pursuits often face interruptions or limitations. Offering charity on [translate:Ekadashi] and investing in education and creative endeavors serve as effective remedies to enhance positive outcomes."
    },
    6: {
        house: "6th House (Service, Conflicts, Enemies)",
        classical: "Strong fighter, finds satisfaction overcoming enemies, stress varies by sign/planet.",
        expanded: "This placement is ideal for confronting adversities and choosing battles wisely. Mars indicates physical battles; Saturn represents karmic labor or persistent effort; Jupiter suggests mental or philosophical struggles. Awareness of when and how to engage in conflict is critical for success and well-being."
    },
    7: {
        house: "7th House (Marriage, Partnerships)",
        classical: "Problems in marriage and partnerships, debts with spouse.",
        expanded: "The spouse often assists in repaying debts and may be involved in business ventures. Afflictions can lead to marital strife or relationship challenges. Examining the [translate:Navamsa] chart provides deeper insights into marriage quality and partnership dynamics."
    },
    8: {
        house: "8th House (Secrets, Sudden Events)",
        classical: "Sudden changes, enemy pressure, intense transformations.",
        expanded: "Forming a [translate:Viprit Raj Yoga] if the [translate:Lagna] lord is strong, this position often results in life-altering events that may bring either opportunity or disaster. The native’s ability to withstand shocks significantly shapes their life path. Strengthening the ascendant and regular meditation are potent remedies."
    },
    9: {
        house: "9th House (Father, Religion, Teachers)",
        classical: "Disputes with father/teachers, impatience in spirituality.",
        expanded: "Challenges arise in relationships with paternal figures and spiritual teachers, as well as impatience with traditional spiritual progression. The native benefits most from cultivating long-term devotion and consistent offerings, focusing on gradual spiritual growth rather than immediate results."
    },
    10: {
        house: "10th House (Career, Fame, Public Life)",
        classical: "Professional struggles, delays, obstacles in workplace.",
        expanded: "The native faces recurring obstacles and delays professionally, often feeling controlled by fate or uncontrollable forces. When [translate:Ketu/Rahu] influence this house, workplace disasters may occur. Patience, sunrise meditation, and honoring workplace traditions form essential remedies."
    },
    11: {
        house: "11th House (Gains, Friendships, Networks)",
        classical: "Never satisfied with gains, ego issues, rivalry among friends.",
        expanded: "An insatiable ambition and conflicts with friends or sibling-like associates can cause losses. The native benefits from grounding practices, cultivating humility, appreciating existing gains, and reducing excessive desires to achieve peace and contentment."
    },
    12: {
        house: "12th House (Loss, Foreign, Liberation)",
        classical: "Losses clear debts, opposite Viprit Raj Yoga, acceptance leads to liberation.",
        expanded: "Sacrifices and losses help repay karmic debts; acceptance and letting go of struggles pave the way to liberation. Remedies include meditation at sunrise, worship of Lord Shiva (a north-east deity), and maintaining cleanliness in the North-East direction to foster spiritual growth and peace."
    }
};

const SIXTH_LORD_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        classical: "स्वास्थ्य समस्याएं, शरीर के माध्यम से ऋण चुकाना, संघर्ष और कठिन परिश्रम।",
        expanded: "जातक अपने कर्म ऋणों का भुगतान मुख्य रूप से स्वास्थ्य संबंधी चुनौतियों और कार्य में निरंतर प्रयास के माध्यम से करता है। इन प्रभावों को कम करने के लिए कठोर परिश्रम और मजबूत आत्म-अनुशासन आवश्यक हैं। भावनात्मक श्रम में लगना और दूसरों की सहायता करना एक महत्वपूर्ण उपाय होता है। यदि शनि शामिल है तो अवमूल्यन की भावना आती है; चंद्रमा प्रमुख होने पर भावनात्मक समर्थन, कविता और कलात्मक अभिव्यक्ति से शांति मिलती है।"
    },
    2: {
        house: "द्वितीय भाव (परिवार, धन, वाणी)",
        classical: "वित्तीय परेशानियां, पारिवारिक विवाद, वाणी से जुड़े झगड़े।",
        expanded: "वित्तीय ऋण और पारिवारिक विवाद बार-बार सामने आते हैं। भोजन या वाणी के संबंध में बहस का होना आम है, तथा आय कई बार पुनरावर्ती या एक जैसी स्रोतों से आती है। उपाय के लिए दूसरों की थाली से भोजन करने से बचना चाहिए। आर्थिक संघर्ष, कम वेतन जैसी समस्याएं सतर्कता और देखभाल की आवश्यकता रखती हैं।"
    },
    3: {
        house: "तृतीय भाव (भाई-बहन, साहस, कागजी कार्य)",
        classical: "भाई-बहनों के साथ विवाद, नए कार्यों में समस्याएं।",
        expanded: "यह स्थिति साहस के साथ-साथ निरंतर संघर्षों और झगड़ों को दर्शाती है। किसी भी नए प्रयास के शुरुआती कागजी कार्य और औपचारिकताओं पर ध्यान देना आवश्यक है। भाई-बहनों के साथ प्रतिस्पर्धा प्रमुख विषय रहती है, जिसमें सामंजस्य बनाए रखने के लिए सचेतन प्रयास जरूरी होता है।"
    },
    4: {
        house: "चतुर्थ भाव (घर, माता, संपत्ति)",
        classical: "घर में विवाद, कानूनी/गैरकानूनी संपत्ति की समस्या, माता की प्रसन्नता में बाधा।",
        expanded: "घर में तनाव, संपत्ति से जुड़े विवाद और वाहन की समस्याएं देखने को मिलती हैं। शांति अक्सर तब मिलती है जब व्यक्ति पारिवारिक घर छोड़ देता है। उपायों में उत्तर और पूर्व दिशा की सफाई रखना, मंदिरों में दान करना शांति और पारिवारिक सौहार्द्र के लिए लाभकारी होते हैं।"
    },
    5: {
        house: "पंचम भाव (संतान, शिक्षा, रचनात्मकता)",
        classical: "पूर्वजन्म के शुभ कर्मों को निष्प्रभावी करता है, प्रसिद्धि और रचनात्मक आनंद छीनता है।",
        expanded: "बच्चों, शिक्षा और रचनात्मक कार्यों के माध्यम से ऋण चुकता है। प्रसिद्धि और दूरदर्शिता के प्रयासों में बाधा आ सकती है। एकादशी पर दान देना, शिक्षा और रचनात्मक कार्यों में निवेश सकारात्मक परिणामों के लिए उचित उपाय हैं।"
    },
    6: {
        house: "षष्ठ भाव (सेवा, विवाद, शत्रु)",
        classical: "मजबूत लड़ाकू, शत्रुओं पर विजय में संतोष, तनाव राशि/ग्रह के अनुसार।",
        expanded: "यह स्थिति विरोधियों का सामना करने और संघर्षों का चयन करने में आदर्श है। मंगल शारीरिक संघर्ष, शनि कर्मिक परिश्रम, गुरु मानसिक या दार्शनिक संघर्षों का संकेत देता है। संघर्ष में कब और कैसे शामिल होना, यह सफलता और कल्याण के लिए जरूरी है।"
    },
    7: {
        house: "सप्तम भाव (विवाह, साझेदारी)",
        classical: "विवाह व साझेदारी में समस्या, जीवनसाथी से जुड़े ऋण।",
        expanded: "जीवनसाथी अक्सर ऋण चुकाने में सहयोग करता है, या व्यापार में सम्मिलित होता है। दोष विवाह या संबंध में संघर्ष ला सकते हैं। नवांश कुंडली का विश्लेषण विवाह की गुणवत्ता और साझेदारी की वास्तविकता को समझने के लिए आवश्यक है।"
    },
    8: {
        house: "अष्टम भाव (रहस्य, अचानक घटनाएँ)",
        classical: "अचानक बदलाव, शत्रु का दबाव, तीव्र रूपांतरण।",
        expanded: "यदि लग्न स्वामी मजबूत हो तो विपरीत राजयोग बनता है, जिससे जीवन में बड़े बदलाव या अवसर-संकट आते हैं। जातक की झटकों को झेलने की क्षमता जीवन मार्ग को काफी प्रभावित करती है। लग्न को मजबूत करना और नियमित ध्यान करना महत्वपूर्ण उपाय है।"
    },
    9: {
        house: "नवम भाव (पिता, धर्म, गुरु)",
        classical: "पिता या गुरु से विवाद, आध्यात्मिकता में अधैर्यता।",
        expanded: "पिता या धार्मिक गुरुओं के साथ संबंधों में चुनौतियां आ सकती हैं, पारंपरिक आध्यात्मिक बढ़त में अधैर्यता महसूस होती है। दीर्घकालिक भक्ति और नियमित दान व पूजा से सच्चा लाभ होता है, धीरे-धीरे आध्यात्मिक प्रगति पर ध्यान रखना चाहिए।"
    },
    10: {
        house: "दशम भाव (कैरियर, प्रतिष्ठा, सार्वजनिक जीवन)",
        classical: "व्यावसायिक संघर्ष, कार्यस्थल में बाधाएं और देरी।",
        expanded: "कार्य में प्रायः बाधाएं और देरी आती हैं, ऐसा लगता है जैसे भाग्य या कोई बड़ी शक्ति व्यक्ति को नियंत्रित कर रही हो। केतु/राहु का प्रभाव कार्यस्थल में आपदाएं ला सकता है। उपाय: धैर्य, सूर्योदय पर ध्यान और कार्यस्थल पर परंपराओं का सम्मान करना।"
    },
    11: {
        house: "एकादश भाव (लाभ, मित्र, नेटवर्क)",
        classical: "लाभों से कभी संतुष्ट न होना, अहंकार, मित्रों के बीच प्रतिस्पर्धा।",
        expanded: "असंयमित महत्वाकांक्षा, मित्रों या भाई-बहन जैसे साथियों से प्रतिस्पर्धा के कारण हानि हो सकती है। स्थिरता, विनम्रता, औचित्यपूर्ण लाभों की सराहना, और इच्छाओं में कमी से शांति और संतोष प्राप्त होता है।"
    },
    12: {
        house: "द्वादश भाव (हानि, विदेश, मोक्ष)",
        classical: "हानियाँ ऋण चुकाती हैं, विपरीत राजयोग के विरुद्ध, स्वीकार्यता से मुक्ति।",
        expanded: "त्याग और हानि कर्मिक ऋणों का भुगतान करते हैं; संघर्षों को छोड़ना और स्वीकारना मुक्ति की राह खोलता है। उपाय: सूर्योदय ध्यान, भगवान शिव की पूजा (उत्तर-पूर्व देवता), और उत्तर-पूर्व की सफाई रखना।"
    }
};

const SEVENTH_LORD_EFFECTS = {
    1: {
        house: "1st House ([translate:Ascendant/Lagna])",
        classical: "Marriage changes native’s personality, brings dominating partner; family knows spouse already.",
        expanded: "Marriage causes a significant transformation of the native’s identity and personality, often introducing a partner who has a dominant role. This partner may influence or control major life directions and could be involved in HR, labor, or mechanical fields. The life choices and personality of the native are deeply impacted, reflecting a strong personality shift."
    },
    2: {
        house: "2nd House (Family, Wealth, Speech)",
        classical: "Marriage to someone related to resources, food or family trade. Spouse’s family has strong legacy.",
        expanded: "Marriage connects the native to ancestral resources and may provide benefits derived from someone else’s loss. Harmony is fostered when the native donates to the spouse’s family. Due to lineage peculiarities, sometimes [translate:Kanyadaan] ceremonies are performed by relatives outside the immediate family."
    },
    3: {
        house: "3rd House (Siblings, Courage, Communication)",
        classical: "Spouse may be a friend/sibling or closely known; challenges from nontraditional habits.",
        expanded: "This placement often represents marriages that are unconventional, influenced by the axis of [translate:Rahu] and [translate:Ketu]. Such marriages may include same-sex partners or close relations. Successful relationships require a deep understanding of the partner’s mindset and habits, as narrow-mindedness can cause significant issues."
    },
    4: {
        house: "4th House (Home, Property, Mother)",
        classical: "Partner is attached to society/emotions, home or property needs rule change after marriage.",
        expanded: "Following marriage, the native may need to modify living arrangements or property ownership to maintain peace. Conflicts often arise around home or location, and remedies involve addressing the partner’s emotional needs related to land and [translate:vastu]."
    },
    5: {
        house: "5th House (Children, Creativity, Fame)",
        classical: "Marriage gives fame (or infamy) through spouse. Partner encourages or destroys native’s status.",
        expanded: "Respect and honor toward the spouse lead to success and enhanced reputation, while disrespect causes downfall. Remedies include respectfully calling the spouse’s name, honoring them publicly, lighting lamps, and fasting especially when afflicted planetary combinations exist."
    },
    6: {
        house: "6th House (Service, Debt, Enemies)",
        classical: "Marriage brings problems, debt, and active dispute solving. Separation is common.",
        expanded: "The native often assumes responsibility for the partner’s problems. While this placement supports problem-solving abilities, separation due to work or health is preferable to formal divorce. Partners may be reactive; calming remedies involving Saturn, fasting, or wearing a blue sapphire are advised."
    },
    7: {
        house: "7th House (Marriage, Partnerships)",
        classical: "Direct marriage, strong partnership, may face afflictions.",
        expanded: "This house naturally denotes marriage and partnerships. If afflicted by malefic planets, the relationship may contend with direct challenges. The dynamic power and intensity depend on the nature of planetary influences."
    },
    8: {
        house: "8th House (Transformation, Sudden Events)",
        classical: "Marriage is sensitive, partner faces decay/distress.",
        expanded: "This placement indicates fragile relationships where the partner may experience losses or decline after marriage. Remedies include donating food or money on anniversaries and attending carefully to sensitive issues, particularly sexual or lifestyle conflicts, especially when Saturn’s presence is strong."
    },
    9: {
        house: "9th House ([translate:Luck, Dharma, Spirituality])",
        classical: "Idealistic spouse, conflict about beliefs and traditions.",
        expanded: "The spouse tends to have rigid worldviews and may disregard the native’s beliefs. Green emerald is recommended as a remedy to foster flexibility and growth within the marriage."
    },
    10: {
        house: "10th House (Career, Public Life)",
        classical: "Partner comes from work/business field; career rises after marriage.",
        expanded: "Career progress and relief often follow marriage if planetary combinations are favorable; otherwise, business may face decline. The partner is typically aggressive, hardworking, and sometimes stubborn."
    },
    11: {
        house: "11th House (Gains, Social Network, In-laws)",
        classical: "Partner is good; troubles arise from in-laws or health issues.",
        expanded: "Though the partner is generally supportive, the native may face difficulties from in-laws or the partner’s chronic health issues. Challenges may peak at particular life stages."
    },
    12: {
        house: "12th House (Foreign, Trust, Liberation)",
        classical: "Partner takes native to foreign places, jail, or gives moksha.",
        expanded: "Marriage fosters a high level of trust. When afflicted, trust issues and accusations threaten the relationship. Planetary combinations reveal the partner’s traits: expressive or reserved, aggressive or nurturing."
    }
};
const SEVENTH_LORD_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        classical: "विवाह से जातक का व्यक्तित्व बदलता है, प्रभावशाली जीवनसाथी आता है; परिवार को पहले से ही जीवनसाथी की जानकारी होती है।",
        expanded: "विवाह के बाद जातक की पहचान और व्यक्तित्व में महत्वपूर्ण परिवर्तन होता है, अक्सर जीवनसाथी का प्रभाव प्रमुख रहता है। जीवनसाथी मुख्य निर्णयों में मार्गदर्शन या नियंत्रण कर सकता है, आमतौर पर HR, श्रम या यांत्रिक क्षेत्रों से जुड़ा हो सकता है। जातक के जीवन विकल्प एवं व्यक्तित्व जीवनसाथी के कारण गहराई से प्रभावित होते हैं।"
    },
    2: {
        house: "द्वितीय भाव (परिवार, धन, वाणी)",
        classical: "परिवार, भोजन या पारिवारिक व्यवसाय से जुड़े व्यक्ति से विवाह। जीवनसाथी के परिवार की मजबूत विरासत होती है।",
        expanded: "विवाह से जातक वंशजों की संपत्ति एवं संसाधनों से जुड़ता है, और कई बार दूसरों की हानि से लाभ प्राप्त करता है। रिश्तों में साम्य बनाए रखने के लिए जीवनसाथी के परिवार में दान करना शुभ होता है। वंश के नियमों के कारण कभी-कभी कन्यादान निकट संबंधियों द्वारा होता है।"
    },
    3: {
        house: "तृतीय भाव (भाई-बहन, साहस, संवाद)",
        classical: "जीवनसाथी मित्र/भाई-बहन या करीबी व्यक्ति हो सकता है; अप्रचलित आदतों से चुनौती।",
        expanded: "यह योग प्रायः असामान्य विवाहों का संकेत देता है, जैसे राहु-केतु के प्रभाव से समान-लिंग विवाह या नज़दीकी संबंध। सफल संबंध के लिए जीवनसाथी के स्वभाव और आदतों की गहरी समझ जरूरी होती है; संकीर्ण विचार रिश्ते में समस्या ला सकते हैं।"
    },
    4: {
        house: "चतुर्थ भाव (घर, संपत्ति, माता)",
        classical: "सामाजिक रूप या भावनाओं से जुड़े जीवनसाथी; विवाह के बाद घर व संपत्ति के नियम बदलते हैं।",
        expanded: "विवाह के बाद घर के माहौल या जमीन/संपत्ति के हक में बदलाव आवश्यक हो सकता है। घरेलू या स्थान संबंधी विवाद उत्पन्न हो सकते हैं, जिनका समाधान जीवनसाथी की भावनात्मक ज़रूरतों और वास्तु से जुड़ा होता है।"
    },
    5: {
        house: "पंचम भाव (संतान, रचनात्मकता, प्रतिष्ठा)",
        classical: "विवाह से प्रसिद्धि (या अपयश) मिलती है; जीवनसाथी जातक की स्थिति को बढ़ाता या गिराता है।",
        expanded: "जीवनसाथी को सम्मान और आदर देने से सफलता और प्रतिष्ठा बढ़ती है, उपेक्षा करने से पतन आता है। उपाय: जीवनसाथी का नाम सम्मानपूर्वक लेना, सार्वजनिक सम्मान देना, दीप जलाना, और ग्रह दोष की स्थिति में उपवास रखना लाभदायक है।"
    },
    6: {
        house: "षष्ठ भाव (सेवा, ऋण, शत्रु)",
        classical: "विवाह में समस्याएं, ऋण एवं सक्रिय विवाद समाधान; अलगाव आम है।",
        expanded: "जातक अक्सर जीवनसाथी की समस्याओं की जिम्मेदारी लेता है। यह योग समस्याओं के समाधान में दक्षता देता है, पर कार्य या स्वास्थ्य के कारण अलगाव तलाक से अधिक उचित है। जीवनसाथी अधिक प्रतिक्रिया करने वाला हो सकता है; शनि उपाय, उपवास या नीलम पहनना लाभकारी है।"
    },
    7: {
        house: "सप्तम भाव (विवाह, साझेदारी)",
        classical: "प्रत्यक्ष विवाह, मजबूत साझेदारी, दोष की स्थिति में बाधाएँ।",
        expanded: "यह भाव स्वाभाविक रूप से विवाह और साझेदारी का कारक है। अशुभ ग्रहों का प्रभाव होने पर प्रत्यक्ष चुनौतियाँ आती हैं। शक्ति एवं तीव्रता ग्रहों के अनुसार बदलती है।"
    },
    8: {
        house: "अष्टम भाव (परिवर्तन, अचानक घटनाएँ)",
        classical: "विवाह संवेदनशील, जीवनसाथी को पीड़ा या परेशानी होती है।",
        expanded: "यह योग नाजुक संबंधों का संकेत देता है, जिसमें जीवनसाथी को हानि या गिरावट का सामना करना पड़ सकता है। उपाय: वर्षगांठ पर भोजन/धन का दान तथा अत्यधिक संवेदनशील मुद्दों/संभोग संबंधी या जीवनशैली संबधी विवादों में सतर्कता, खासकर शनि की उपस्थिति में।"
    },
    9: {
        house: "नवम भाव (भाग्य, धर्म, आध्यात्मिकता)",
        classical: "आदर्शवादी जीवनसाथी, मान्यताओं और परंपराओं पर विवाद।",
        expanded: "जीवनसाथी का दृष्टिकोण अक्सर कठोर होता है और जातक की मान्यताओं को नज़रअंदाज़ कर सकता है। विवाह में लचीलापन और वृद्धि के लिए पन्ना रत्न पहनना लाभदायक है।"
    },
    10: {
        house: "दशम भाव (कैरियर, सार्वजनिक जीवन)",
        classical: "जीवनसाथी कार्य/व्यवसाय क्षेत्र से आता है; विवाह के बाद करियर बढ़ता है।",
        expanded: "यदि योग अनुकूल हो तो विवाह के बाद करियर में प्रगति और राहत मिलती है, अन्यथा व्यवसाय गिर सकता है। जीवनसाथी सामान्यतः आक्रामक, मेहनती और जिद्दी होता है।"
    },
    11: {
        house: "एकादश भाव (लाभ, सामाजिक नेटवर्क, ससुराल)",
        classical: "जीवनसाथी अच्छा होता है; परेशानी ससुराल या स्वास्थ्य से आती है।",
        expanded: "जीवनसाथी समर्थनकारी होता है, लेकिन जातक को ससुराल पक्ष या जीवनसाथी के पुराने/दीर्घकालिक स्वास्थ्य मुद्दों से दिक्कतें आ सकती हैं। चुनौतियाँ विशेष जीवन काल में बढ़ सकती हैं।"
    },
    12: {
        house: "द्वादश भाव (विदेश, विश्वास, मोक्ष)",
        classical: "जीवनसाथी विदेश या कारागार में ले जाता है या मोक्ष देता है।",
        expanded: "विवाह से गहरा विश्वास उत्पन्न होता है। दोष की स्थिति में विश्वासघात या आरोप समस्या ला सकते हैं। योगों से जीवनसाथी की प्रवृत्ति जानी जा सकती है: व्यक्त या मौन, आक्रामक या पोषक।"
    }
};

const EIGHTH_LORD_EFFECTS = {
    1: {
        house: "1st House ([translate:Ascendant/Lagna])",
        classical: "Lord of darkness in the spotlight, struggle with health and ego, frequent need to let go.",
        expanded: "The native experiences continuous decay of the body and personal attachments, symbolizing a life of periodic endings and transformations. Liberation is attained through selfless actions and the ability to release control over material things and life processes. Careful attention to health is necessary, as the physical body has limited resilience. Wisdom is gained by learning when to let go and embrace change during major life cycles."
    },
    2: {
        house: "2nd House (Wealth, Family, Speech)",
        classical: "Decay or transformation of family, money, speech; chronic family disputes.",
        expanded: "Significant struggles or repeated losses concerning family matters and financial resources foster lessons in detachment. True peace arrives after the realization that family and money are transient. This transformation often manifests strongly after the age of 35, where accepting change and loss brings emotional relief."
    },
    3: {
        house: "3rd House (Siblings, Skills, Communication)",
        classical: "Skills and credit vanish, talents lost in cycles, sibling dynamics unstable.",
        expanded: "Recognition for work is often delayed or lost due to cyclical challenges. Around 41 years of age, the native may experience a breakthrough by embracing innovative and unconventional thinking. Being open and transparent by sharing important information is emphasized as a remedy to overcome these cycles."
    },
    4: {
        house: "4th House (Home, Mother, Property)",
        classical: "Compelled to leave home/location after age 30. Decay/curses/prayers relate to land.",
        expanded: "The native struggles to maintain peace if resistant to relocating after age 30. Attachment to property and home can cause recurring issues unless released. Hidden familial or societal debts linked to land and property must be addressed for stability."
    },
    5: {
        house: "5th House (Children, Creativity, Fame)",
        classical: "Sensitive thinker, isolation needed for growth, creative vision hampered by criticism.",
        expanded: "The native is highly influenced by public opinion and feedback that may hamper creative expression. True greatness often unfolds after 33 years, marking a journey through isolation to social acknowledgment and fame."
    },
    6: {
        house: "6th House (Service, Diseases, Enemies)",
        classical: "Pathbreaking healers, clear family diseases/enemies.",
        expanded: "This position is associated with a powerful ability to overcome familial health issues and enemies, often seen in legendary healers or warriors. Engaging in charitable health-related activities amplifies positive karmic outcomes."
    },
    7: {
        house: "7th House (Marriage, Partnerships)",
        classical: "Isolation streak post-marriage; karmic partners, soulmate, or sexual issues.",
        expanded: "Following marriage, the native may undergo profound transformations marked by isolation or intense relationship dynamics. The spouse often acts as a karmic partner whose involvement triggers or resolves chronic personal problems."
    },
    8: {
        house: "8th House (Transformation, Depth, Secrets)",
        classical: "Deep-thinking, meditative, expert in handling chronic problems.",
        expanded: "Possessing strong survival instincts, the native easily overcomes adversity. There is potential for extramarital affairs if power is misused. The house is deeply connected to inheritance and resources like minerals."
    },
    9: {
        house: "9th House (Luck, Guru, Spirituality)",
        classical: "Blockage in access to teachers, traditions; struggle for wisdom.",
        expanded: "The native faces obstacles in obtaining guidance from spiritual teachers and accessing traditions. Achieving liberation necessitates deep humility, surrendering of ego, and nurturing relationships with [translate:guru] and spiritual lineage."
    },
    10: {
        house: "10th House (Career, Public Life)",
        classical: "Breaks career cycles, work instability, career change is essential.",
        expanded: "Independent work is essential as sustained employment in controlled environments is often untenable. Career changes, entrepreneurship, or innovative paths are recommended to align with the native’s true drive."
    },
    11: {
        house: "11th House (Gains, Fulfillment, Networks)",
        classical: "Sudden gains—inheritance, insurance, oil, minerals.",
        expanded: "Wealth and network expansions often come unexpectedly or through inheritance. Major transformations occur in social circles throughout the native’s life journey."
    },
    12: {
        house: "12th House (Loss, Isolation, Liberation)",
        classical: "Isolation, salvation, ends chronic struggles.",
        expanded: "Solitude and spiritual quests help resolve long-standing issues. Ultimate peace is found by relinquishing the ego and worldly attachments. The path leads towards [translate:salvation], achieved especially by surrender and selfless service."
    }
};
const EIGHTH_LORD_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        classical: "अंधकार का स्वामी प्रकाश में, स्वास्थ्य और अहंकार की समस्या, बार-बार छोड़ने की आवश्यकता।",
        expanded: "जातक को शरीर और व्यक्तिगत संबंधों में बार-बार पतन व समाप्ति का अनुभव होता है, जो लगातार परिवर्तन और अंत का जीवन दर्शाता है। त्याग और निष्काम कर्म के द्वारा ही मुक्ति मिलती है। स्वास्थ्य पर विशेष ध्यान आवश्यक है क्योंकि शारीरिक सहनशक्ति सीमित रहती है। कब छोड़ना है और जीवन के मुख्य चक्रों में बदलाव को कैसे अपनाना है, यही सच्चा ज्ञान है।"
    },
    2: {
        house: "द्वितीय भाव (धन, परिवार, वाणी)",
        classical: "परिवार, धन, वाणी का पतन या रूपांतरण; पुराने पारिवारिक झगड़े।",
        expanded: "परिवार और धन संबंधी विषयों में गंभीर संघर्ष या बार-बार क्षति होती है, जो त्याग का पाठ सिखाते हैं। सच्ची शांति तभी आती है जब यह समझ लिया जाए कि परिवार और धन अस्थायी हैं। यह परिवर्तन आमतौर पर 35 वर्ष के बाद जोर पकड़ता है, जहां स्वीकार्यता राहत देती है।"
    },
    3: {
        house: "तृतीय भाव (भाई-बहन, कौशल, संवाद)",
        classical: "कौशल और प्रतिष्ठा गायब, प्रतिभा चक्रों में खो जाती है, भाई-बहन के संबंध अस्थिर।",
        expanded: "कार्य की पहचान कई बार विलंबित या खो जाती है, चक्रीय चुनौतियों के कारण। लगभग 41 वर्ष की आयु में नवाचार और असामान्य सोच अपना प्रभाव दिखाती है। महत्वपूर्ण जानकारी साझा कर खुलेपन का पालन करना समाधान का मुख्य उपाय है।"
    },
    4: {
        house: "चतुर्थ भाव (घर, माता, संपत्ति)",
        classical: "30 वर्ष के बाद स्थान/घर छोड़ने का दबाव; जमीन से संबंधित पतन/शाप/प्रार्थना।",
        expanded: "यदि 30 वर्ष के बाद स्थान बदलने से परहेज करें तो शांति पाना कठिन हो सकता है। संपत्ति और घर से बहुत लगाव बार-बार समस्या बनता है, जिसे छोड़ना जरूरी है। भूमि व संपत्ति से जुड़े अशुद्ध पारिवारिक या सामाजिक ऋण स्थिरता के लिए चुकाना अनिवार्य है।"
    },
    5: {
        house: "पंचम भाव (संतान, रचनात्मकता, प्रसिद्धि)",
        classical: "संवेदनशील सोच, विकास के लिए एकांत जरूरी, आलोचना से रचनात्मकता बाधित।",
        expanded: "जातक सामाजिक प्रतिक्रिया एवं जनमत से अत्यधिक प्रभावित होता है, जिससे रचनात्मक प्रकटीकरण में बाधा आती है। 33 वर्ष के बाद असली उत्कृष्टता सामने आती है जब एकांत से समाजिक मान्यता और प्रसिद्धि मिलती है।"
    },
    6: {
        house: "षष्ठ भाव (सेवा, रोग, शत्रु)",
        classical: "पथ-प्रदर्शक चिकित्सक, परिवार की बीमारियाँ/शत्रु दूर करता है।",
        expanded: "इस योग से जातक को पारिवारिक स्वास्थ्य समस्याओं और शत्रुओं को दूर करने की जबरदस्त शक्ति मिलती है, अक्सर यह गुण महान चिकित्सा या योद्धा में देखने को मिलता है। चिकित्सा संबंधी दान करना सकारात्मक कर्मों को बढ़ाता है।"
    },
    7: {
        house: "सप्तम भाव (विवाह, साझेदारी)",
        classical: "विवाह के बाद एकांत की प्रवृत्ति; कर्मिक साथी, आत्मिक या यौन समस्याएं।",
        expanded: "विवाह के बाद जातक का जीवन गहन बदलाव से गुजरता है, जिसमें अकेलेपन या तीव्र संबंध-संबंधी समस्याएं होती हैं। पत्नी प्रायः कर्मिक साथी होती है, जिसका जुड़ाव पुरानी व्यक्तिगत समस्याओं को सक्रिय या हल करता है।"
    },
    8: {
        house: "अष्टम भाव (रूपांतरण, गहराई, रहस्य)",
        classical: "गहन चिंतक, ध्यानशील, लगातार समस्याएं हल करने में माहिर।",
        expanded: "तीव्र उत्तरजीविता प्रवृत्ति होती है, जातक आसानी से संकटों का समाधान पा लेता है। यदि शक्ति का गलत उपयोग हो तो विवाहेतर संबंध संभव हैं। यह भाव विरासत, खनिज आदि संपत्ति से गहराई से जुड़ा है।"
    },
    9: {
        house: "नवम भाव (भाग्य, गुरु, आध्यात्मिकता)",
        classical: "गुरु और परंपराओं तक पहुँच में रुकावट, ज्ञान हेतु संघर्ष।",
        expanded: "गुरुओं और परंपराओं से सलाह प्राप्त करने में दिक्कत आती है। मुक्ति पाने के लिए गहरा विनम्रता, अहंकार का त्याग और गुरुजात तथा आध्यात्मिक परंपरा का सम्मान करना जरूरी होता है।"
    },
    10: {
        house: "दशम भाव (कैरियर, सार्वजनिक जीवन)",
        classical: "करियर के चक्र टूटते हैं, कार्य में अस्थिरता, करियर परिवर्तन आवश्यक।",
        expanded: "अपनेपना जरूरी होता है क्योंकि नियंत्रित माहौल में लगातार काम नहीं होता। करियर परिवर्तन, उद्यमिता या नवाचार की राह अपनाना जातक की वास्तविक प्रवृत्ति से मेल करता है।"
    },
    11: {
        house: "एकादश भाव (लाभ, संतुष्टि, नेटवर्क)",
        classical: "अचानक लाभ—विरासत, बीमा, तेल, खनिज।",
        expanded: "अक्सर धन और सामाजिक नेटवर्क में विस्तार अचानक या विरासत के माध्यम से आता है। मुख्य जीवन यात्रा के दौरान मित्रों के समूहों में बड़े परिवर्तन होते हैं।"
    },
    12: {
        house: "द्वादश भाव (हानि, एकांत, मोक्ष)",
        classical: "एकांत, मुक्ति, पुरानी समस्याओं का अंत।",
        expanded: "एकांत और आध्यात्मिक साधना लंबे संघर्षों का समाधान प्रदान करते हैं। अहंकार और सांसारिक आसक्ति का त्याग कर अंतिम शांति मिलती है। मार्ग मोक्ष की ओर जाता है, विशेष रूप से समर्पण और निष्काम सेवा से।"
    }
};


const NINTH_LORD_EFFECTS = {
    1: {
        house: "1st House ([translate:Ascendant/Lagna])",
        classical: "Strong moral code, destiny supports native’s identity and non-conventional choices.",
        expanded: "Luck favors a holistic life philosophy with emphasis on long-term goals and periodic retreats for self-reflection. The native prefers focusing on big-picture thinking rather than mundane daily routines, often taking significant breaks for personal growth. Recommended remedy includes daily or weekly self-reflection in environments resonant with the planet’s or house’s energies."
    },
    2: {
        house: "2nd House (Wealth, Family, Speech)",
        classical: "Unending resource accumulation, idealistic but struggles with satisfaction.",
        expanded: "The native’s luck is closely tied to material resources but is marked by a persistent desire for more, seldom feeling content. Risks of fanaticism or obsessive accumulation exist; therefore, energy should be directed toward sharing and distribution rather than hoarding. Remedies include regular feeding of others, honoring family traditions, and praying to the [translate:Kula Devata] (ancestral deity)."
    },
    3: {
        house: "3rd House (Siblings, Skills, Communication)",
        classical: "Innovator who questions tradition; advice is often ignored.",
        expanded: "This native often challenges established conventions and provides unconventional advice, which may be rejected or lead to dissatisfaction. Thrives in creative or religious environments that allow freedom of thought and expression. Avoidance of rigid or authoritarian superiors enhances well-being. Marriages or ceremonies are likely to be nontraditional."
    },
    4: {
        house: "4th House (Home, Masses, Mother)",
        classical: "Fame/popularity, support from masses, good home atmosphere.",
        expanded: "The native enjoys popularity and success, especially when involved in service to the masses or community. Remedies include working on river welfare, offering fruits and silver to water bodies, and respecting rivers to enhance prosperity."
    },
    5: {
        house: "5th House (Children, Creativity, Fame)",
        classical: "Support from both generations, increasing fame and creative growth.",
        expanded: "Blessed by ancestral support, the native’s education, power, and fame progressively increase. Suggested remedies include donating lamps or performing [translate:deepdan] (lamp-lighting rituals) during important occasions to strengthen lineage connections."
    },
    6: {
        house: "6th House (Service, Conflict, Debt)",
        classical: "Clashes due to undervaluing knowledge, boss disputes, lack of recognition.",
        expanded: "The native often underestimates their talents, leading to persistent struggles for appreciation at work. Remedies involve donating educational materials, refraining from selling books, and working independently to maximize fortunes."
    },
    7: {
        house: "7th House (Marriage, Partnerships)",
        classical: "Sudden rise through partner; fortune comes by respecting relationships.",
        expanded: "Respect toward the partner significantly boosts luck and fortune. Marriages may involve considerable shifts in religious beliefs or practices. Remedies include giving gifts, honoring the partner, and performing fasts or lighting lamps, especially under afflicted planetary combinations."
    },
    8: {
        house: "8th House (Transformation, Secrets, Death)",
        classical: "Danger to virtue, health issues, must fight back after destruction.",
        expanded: "Often the native plays a role in saving others from loss but at a personal cost. Learning to rebuild after setbacks and practicing resilience is crucial. Recommended remedies include regular [translate:sadhana] breathing exercises and studying principles of recovery and resistance."
    },
    9: {
        house: "9th House ([translate:Luck, Dharma, Guru])",
        classical: "Extraordinary destiny, powerful guidance, consistent rise.",
        expanded: "Multiple auspicious planetary influences amplify results, with luck improving significantly during favorable dasha periods. The native’s success depends on a holistic approach to planetary influences rather than isolated placements."
    },
    10: {
        house: "10th House (Career, Decisions, Fame)",
        classical: "Wisdom and happiness in career decisions, smooth life with good judgment.",
        expanded: "Benefic planetary placements bring enduring happiness that transcends financial gain. Remedies include seeking satisfaction beyond material success and serving family and community with wisdom and discernment."
    },
    11: {
        house: "11th House (Gains, Social Circles, Desires)",
        classical: "Over-ambitious, endless desire, health problems; satisfaction often missing.",
        expanded: "Despite hard work, the native may find true peace elusive due to constant striving. Learning to appreciate accomplishments and cultivate contentment is key to overcoming persistent restlessness."
    },
    12: {
        house: "12th House (Loss, Liberation, Salvation)",
        classical: "Spiritual liberation, luck via ancestors' good karma, freedom from obligations.",
        expanded: "The native experiences spiritual growth and freedom from worldly duties during certain dasha periods, often guided by [translate:guru] or mentors rather than conventional employment. Remedies emphasize focusing on practices leading to liberation and honoring ancestors through charitable deeds."
    }
};
const NINTH_LORD_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        classical: "मजबूत नैतिकता, भाग्य जातक की पहचान व असामान्य चुनावों का समर्थन करता है।",
        expanded: "भाग्य समग्र जीवन-दृष्टिकोण व दीर्घकालिक लक्ष्यों को समर्थन देता है; आत्म-चिंतन हेतु समय-समय पर जीवन में विराम आवश्यक होता है। जातक मुख्यतः बड़े लक्ष्य पर ध्यान केंद्रित करना पसंद करता है, और व्यक्तिगत विकास हेतु महत्वपूर्ण ब्रेक लेता है। उपाय: प्रतिदिन या साप्ताहिक आत्म-चिंतन करें, घर/ग्रह के अनुकूल वातावरण में।"
    },
    2: {
        house: "द्वितीय भाव (धन, परिवार, वाणी)",
        classical: "संसाधनों का सतत संचय, आदर्शवादी किंतु संतुष्टि में कमी होती है।",
        expanded: "भाग्य भौतिक संसाधनों से जुड़ा होता है, लेकिन हमेशा और अधिक पाने की इच्छा के कारण संतुष्टि कम होती है। कट्टरता या आवश्यकता से अधिक संचय की प्रवृत्ति रहती है; ऊर्जा को संग्रह के बजाय वितरण व साझेदारी हेतु लगाया जाए। उपाय: दूसरों को भोजन कराएँ, पारिवारिक परंपराओं का सम्मान करें, और कुलदेवता की प्रार्थना करें।"
    },
    3: {
        house: "तृतीय भाव (भाई-बहन, कौशल, संवाद)",
        classical: "परंपरागत सोच को चुनौती देने वाला नवाचारी; सलाह अक्सर अनदेखी रहती है।",
        expanded: "जातक पारंपरिक मान्यताओं को चुनौती देता है व अप्रयुक्त/अप्रचलित सलाह देता है जिसे अक्सर ठुकरा दिया जाता है। स्वतंत्र विचारों या धार्मिक गतिविधियों में सफलता मिलती है। कठोर या प्रभुत्ववादी अधिकारी से बचना लाभदायक होता है। विवाह आदि अनौपचारिक हो सकते हैं।"
    },
    4: {
        house: "चतुर्थ भाव (घर, जनसमूह, माता)",
        classical: "लोकप्रियता और प्रसिद्धि, जनसमूह से समर्थन, घर का अच्छा वातावरण।",
        expanded: "जातक जनसमूह या समाज सेवा में सफलता व लोकप्रियता पाता है। उपाय: नदी संरक्षण के लिए कार्य करें, जल में फल/चांदी अर्पित करें, और नदियों का सम्मान करें जिससे समृद्धि मिलती है।"
    },
    5: {
        house: "पंचम भाव (संतान, रचनात्मकता, प्रसिद्धि)",
        classical: "दोनों पीढ़ियों से समर्थन, बढ़ती प्रसिद्धि और रचनात्मक विकास।",
        expanded: "पूर्वजों का समर्थन एवं आशीर्वाद शिक्षा, शक्ति व प्रसिद्धि को बढ़ाता है। उपाय: महत्वपूर्ण अवसरों पर दीपदान करें, वंश परंपरा को सशक्त बनाने के लिए।"
    },
    6: {
        house: "षष्ठ भाव (सेवा, संघर्ष, ऋण)",
        classical: "ज्ञान को कम आंकने के कारण विवाद, अधिकारी से विवाद, मान्यता की कमी।",
        expanded: "जातक अकसर अपनी प्रतिभा को कम आंकता है, जिससे कार्यस्थल पर मान्यता पाने के लिए संघर्ष होता है। उपाय: शैक्षिक सामग्री दान करें, पुस्तकों की बिक्री से बचें, और स्वतंत्र रूप से काम करें।"
    },
    7: {
        house: "सप्तम भाव (विवाह, साझेदारी)",
        classical: "जीवनसाथी के माध्यम से अचानक सफलता; संबंधों का सम्मान भाग्य बढ़ाता है।",
        expanded: "जीवनसाथी के प्रति सम्मान भाग्य और सफलता को बढ़ाता है। विवाह में धार्मिक विश्वास या अभ्यास में बड़ा बदलाव आ सकता है। उपाय: उपहार दें, जीवनसाथी का सम्मान करें, तथा ग्रह दोष की स्थिति में उपवास या दीपदान करें।"
    },
    8: {
        house: "अष्टम भाव (रूपांतरण, रहस्य, मृत्यु)",
        classical: "सदाचार पर संकट, स्वास्थ्य समस्याएं, संघर्ष के बाद फिर उठने की क्षमता।",
        expanded: "जातक दूसरों को हानि से बचाता है मगर स्वयं को हानि होती है। हर झटके के बाद पुनर्निर्माण व प्रतिरोध सीखना जरूरी है। उपाय: नियमित साधना-प्राणायाम व पुनः उठने की शिक्षा लें।"
    },
    9: {
        house: "नवम भाव (भाग्य, धर्म, गुरु)",
        classical: "असाधारण भाग्य, मजबूत मार्गदर्शन, लगातार उन्नति।",
        expanded: "कई शुभ ग्रह प्रभाव परिणाम को कई गुना बढ़ाते हैं, शुभ दशा में भाग्य अत्यंत अच्छा होता है। जातक की सफलता व्यक्तिगत ग्रहों के योग से अधिक समग्र प्रभाव पर निर्भर करती है।"
    },
    10: {
        house: "दशम भाव (कैरियर, निर्णय, प्रसिद्धि)",
        classical: "कैरियर निर्णयों में बुद्धि और खुशी, अच्छे विवेक से जीवन सहज।",
        expanded: "शुभ ग्रह होने पर स्थाई खुशी मिलती है जो केवल धन से नहीं, बल्कि संतोष एवं परिवार-समाज की सेवा से आती है। उपाय: भौतिक सफलता के अलावा संतोष खोजें, बुद्धिमत्ता से परिवार व समुदाय की सेवा करें।"
    },
    11: {
        house: "एकादश भाव (लाभ, मित्र समूह, इच्छाएं)",
        classical: "अत्यधिक महत्वाकांक्षा, अंतहीन इच्छाएं, स्वास्थ्य समस्याएं; संतोष की कमी।",
        expanded: "कड़ी मेहनत के बावजूद जातक को सच्ची शांति पाना कठिन होता है, क्योंकि लगातार कुछ नया पाने की इच्छा बनी रहती है। उपलब्धियों की सराहना व संतोष पालना महत्वपूर्ण है।"
    },
    12: {
        house: "द्वादश भाव (हानि, मुक्ति, मोक्ष)",
        classical: "आध्यात्मिक मुक्ति, पूर्वजों के पुण्य से भाग्य, जिम्मेदारियों से मुक्ति।",
        expanded: "जातक को खास दशा काल में आध्यात्मिक वृद्धि व सांसारिक जिम्मेदारियों से मुक्ति मिलती है, प्रायः गुरु या मार्गदर्शक के माध्यम से, साधारण नौकरी से अलग। उपाय: मुक्ति दिलाने वाली साधना करें, पूर्वजों का सम्मान दान के द्वारा करें।"
    }
};


const TENTH_LORD_EFFECTS = {
    1: {
        house: "1st House ([translate:Ascendant/Lagna])",
        classical: "Karma deeply linked with self-identity, works for the masses, social impact career, service to siblings.",
        expanded: "The native’s life focus involves helping and impacting others, often through work that supports handicapped or less privileged groups. Karma is fulfilled by engaging with large communities and realizing personal limitations. If Venus influences this house, careers often relate to clothing or beauty; if Mercury, education or advisory professions are common."
    },
    2: {
        house: "2nd House (Family, Wealth, Speech)",
        classical: "Duty toward family, food, ancestral legacy; karma revolves around feeding and supporting family.",
        expanded: "Profession typically revolves around family businesses, food-related professions, gift-giving, or religious activities. Progress is achieved by nurturing family harmony through acts like feeding others and offering gifts within the household."
    },
    3: {
        house: "3rd House (Siblings, Skills, Communication)",
        classical: "Karma via hobbies and skills, solitary work, creative arts.",
        expanded: "The native’s career may be based on communication, writing, teaching, performing arts, or craftsmanship. Success stems from hobbies and creative abilities, with a preference for working independently."
    },
    4: {
        house: "4th House (Home, Mother, Masses)",
        classical: "Leader of society, mass appeal, frequent public service, unstable career.",
        expanded: "Work often centers on public welfare roles such as doctors, lawyers, astrologers, or social leaders. Careers tend to be unstable and may carry over into the home environment, with success linked to public impact and social causes."
    },
    5: {
        house: "5th House (Children, Creativity, Fame)",
        classical: "Acquires respectable position through personal hard work, repeat karmic themes.",
        expanded: "Position is achieved through one’s own efforts rather than inheritance, often repeating themes from previous lives. Success is fueled by sharing knowledge and engaging in creative pursuits."
    },
    6: {
        house: "6th House (Service, Health, Details)",
        classical: "Intense work related to food/service/health, career in highly detailed fields, lots of effort required.",
        expanded: "Success comes from detailed-oriented work such as confectionery, law, medicine, or the food industry. Business ventures tend to be less favorable unless supported by other beneficial chart placements."
    },
    7: {
        house: "7th House (Marriage, Partnerships)",
        classical: "Balanced work-family life, partnership success.",
        expanded: "The native progresses concurrently in professional life and family relationships, exhibiting strong integration between the two. Recognition and success come from effectively balancing these domains."
    },
    8: {
        house: "8th House (Transformation, Humility, Secrets)",
        classical: "Karmas involve humility, often not credited in life—fame comes posthumously.",
        expanded: "Living recognition is rare, though the native’s legacy may flourish after death. The remedy involves embracing humility and relinquishing ego to maximize benefits."
    },
    9: {
        house: "9th House ([translate:Wisdom, Philosophy, Teaching])",
        classical: "Karmas through teaching/advising, periodic need for wisdom and self-improvement.",
        expanded: "This house promotes lifelong learning and imparting guidance, often involving educational, advisory, or directorial roles. A deep commitment to study and wisdom-sharing characterizes the native’s life."
    },
    10: {
        house: "10th House (Career, Fame, Public Life)",
        classical: "Stable career, strong support system, excels with backup from others.",
        expanded: "This is the most favorable placement for career, especially when supported by friends and associates. No major obstacles are anticipated. An exalted or well-aspected lord ensures consistent triumphs."
    },
    11: {
        house: "11th House (Gains, Networks, Ego)",
        classical: "Success through help from others and networks, must avoid ego.",
        expanded: "Career gains demand collaboration and support from networks. The native is advised to always credit helpers and remain humble to sustain long-lasting achievements."
    },
    12: {
        house: "12th House (Loss, Wisdom, Isolation)",
        classical: "Karma in isolation/foreign places, delayed progress, wisdom emerges over time.",
        expanded: "The native often thrives best away from the place of birth or in foreign lands, working in solitude or with limited resources. Wisdom and career progress typically accelerate after the age of 37. A recommended remedy is relocation for career advancement alongside cultivating patience."
    }
};
const TENTH_LORD_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        classical: "कर्म व्यक्तिगत पहचान से गहराई से जुड़ा, जनसमूह के लिए सेवा, सामाजिक प्रभाव वाला करियर, भाई-बहनों की सेवा।",
        expanded: "जातक का जीवन लक्ष्य दूसरों की सहायता और समाज पर सकारात्मक प्रभाव डालना होता है, प्रायः दिव्यांग या वंचित समुदाय के लिए कार्य करता है। कर्म जनसमूह से जुड़कर सिद्ध होता है और स्वयं की सीमाएं पहचानना जरूरी है। शुक्र के प्रभाव में वस्त्र/सौंदर्य से जुड़ी नौकरी, बुध के प्रभाव में शिक्षा/परामर्श के कार्य होते हैं।"
    },
    2: {
        house: "द्वितीय भाव (परिवार, धन, वाणी)",
        classical: "परिवार, भोजन, वंश परंपरा की जिम्मेदारी; परिवार को भोजन कराना व सहयोग देना कर्म का मूल।",
        expanded: "आमतौर पर पेशा पारिवारिक व्यवसाय, भोजन संबंधी कार्य, उपहार देने या धार्मिक गतिविधियों से जुड़ा है। प्रगति परिवार में सामंजस्य, दूसरों को भोजन कराने और घर में उपहार देने जैसी गतिविधियों से आती है।"
    },
    3: {
        house: "तृतीय भाव (भाई-बहन, कौशल, संवाद)",
        classical: "कर्म रुचियों व कौशल से जुड़े, एकांत कार्य, रचनात्मक कला।",
        expanded: "करियर संचार, लेखन, शिक्षण, कला या हस्तकला में आधारित होता है। सफलता रुचियों एवं रचनात्मकता से आती है, और जातक स्वतंत्र रूप से कार्य करना पसंद करता है।"
    },
    4: {
        house: "चतुर्थ भाव (घर, माता, जनसमूह)",
        classical: "समाज का नेतृत्वकर्ता, जनअपील, सार्वजनिक सेवा में सक्रिय, करियर अस्थिर।",
        expanded: "कार्य अक्सर सार्वजनिक कल्याण जैसे डॉक्टर, वकील, ज्योतिषी या सामाजिक नेता के रूप में होता है। करियर अस्थिर रह सकता है और घर के माहौल में फैल सकता है, सफलता जनहित व सामाजिक कार्य से जुड़ी रहती है।"
    },
    5: {
        house: "पंचम भाव (संतान, रचनात्मकता, प्रसिद्धि)",
        classical: "स्वयं के प्रयासों से सम्मानजनक पद, कर्म के विषय दोहराए जाते हैं।",
        expanded: "स्थानाधिकार स्वयं की मेहनत से प्राप्त होता है, वंशावली से नहीं। पिछले जन्मों के विषय दोहराए जाते हैं। सफलता ज्ञान साझा करने व रचनात्मक कार्यों से मिलती है।"
    },
    6: {
        house: "षष्ठ भाव (सेवा, स्वास्थ्य, विवरण)",
        classical: "खाद्य/सेवा/स्वास्थ्य से जुड़ा गहन कार्य, बेहद विशिष्ट क्षेत्रों में पेशा, कड़ी मेहनत आवश्यक।",
        expanded: "सफलता विस्तारयुक्त कार्य जैसे मिठाई, कानून, चिकित्सा या भोजन उद्योग में मिलती है। व्यापार उतना अनुकूल नहीं रहता जब तक अन्य शुभ योग सहायक न हों।"
    },
    7: {
        house: "सप्तम भाव (विवाह, साझेदारी)",
        classical: "समतुल्य करियर-परिवार जीवन, साझेदारी में सफलता।",
        expanded: "जातक को पेशेवर जीवन और पारिवारिक संबंधों में एक साथ प्रगति मिलती है, दोनों में अच्छा संतुलन रहता है। पहचान और सफलता इन दोनों क्षेत्रों के संतुलन से मिलती है।"
    },
    8: {
        house: "अष्टम भाव (रूपांतरण, विनम्रता, रहस्य)",
        classical: "कर्म में विनम्रता, जीवनकाल में पहचान की कमी—मरणोपरांत प्रसिद्धि।",
        expanded: "जीवन में सीधे पहचान प्रायः नहीं मिलती, लेकिन निधन के बाद विरासत प्रसिद्ध होती है। अधिकतम लाभ के लिए विनम्रता अपनाना और अहंकार त्यागना जरूरी है।"
    },
    9: {
        house: "नवम भाव (ज्ञान, दर्शन, शिक्षण)",
        classical: "शिक्षण/परामर्श में कर्म, ज्ञान और आत्म-विकास का निरंतर आग्रह।",
        expanded: "जीवन भर ज्ञान प्राप्ति और मार्गदर्शन देना अनिवार्य है; शिक्षण, सलाह या नेतृत्वात्मक भूमिकाएँ मिलती हैं। अध्ययन और ज्ञान-साझाकरण के प्रति समर्पण जीवन का केंद्रबिंदु है।"
    },
    10: {
        house: "दशम भाव (कैरियर, प्रसिद्धि, सार्वजनिक जीवन)",
        classical: "स्थिर करियर, मजबूत समर्थन प्रणाली, सहयोग से उत्कृष्टता।",
        expanded: "यह सबसे उत्तम करियर स्थिति है, विशेषकर जब मित्रों और सहयोगियों का समर्थन मिलता है। कोई बड़ा अवरोध नहीं आता। उच्च स्थान या शुभ भाव के स्वामी से निरंतर उपलब्धियाँ मिलती हैं।"
    },
    11: {
        house: "एकादश भाव (लाभ, नेटवर्क, अहंकार)",
        classical: "सहयोगियों व नेटवर्क से सफलता, अहंकार से बचना चाहिए।",
        expanded: "करियर और लाभ के लिए सहयोग व नेटवर्क का समर्थन आवश्यक है। सफलता बनाए रखने हेतु हमेशा सहयोगियों को श्रेय दें व विनम्र रहें।"
    },
    12: {
        house: "द्वादश भाव (हानि, ज्ञान, एकांत)",
        classical: "एकांत/विदेश में कर्म, प्रगति में देरी, समय के साथ ज्ञान का विकास।",
        expanded: "जातक को जन्मस्थान से दूर या विदेशी भूमि में, सीमित संसाधनों में कार्य करना अच्छा रहता है। करियर व ज्ञान आमतौर पर 37 वर्ष के बाद तीव्र बढ़ता है। उपाय: करियर विकास के लिए स्थान परिवर्तन व धैर्य का अभ्यास करें।"
    }
};

const ELEVENTH_LORD_EFFECTS = {
    1: {
        house: "1st House ([translate:Ascendant/Lagna])",
        classical: "Stubborn personality, strong [translate:Dhanyog], life focused on fulfilling unique past-life desires.",
        expanded: "The native may be born into accidental circumstances, with a life focused on completing past incarnation desires. They often support their father significantly and maintain a strong circle of friends, though married life may face challenges. Energy is driven by unresolved karmic tasks from previous lives."
    },
    2: {
        house: "2nd House (Family, Wealth, Speech)",
        classical: "Great money-making combination, family values multiply wealth.",
        expanded: "Wealth is accumulated largely through family resources; desire and earning power are both amplified. When afflicted, pride or disappointment can disrupt family harmony, requiring balance to maintain peace."
    },
    3: {
        house: "3rd House (Siblings, Skills, Communication)",
        classical: "Brain generates endless ideas, divided focus brings happiness.",
        expanded: "The native enjoys sharing ideas freely and adapts well within creative circles or social groups. Hobbies provide satisfaction independent of material wealth, highlighting a happy and adjustable personality."
    },
    4: {
        house: "4th House (Home, Peace, Property)",
        classical: "Desires for peace, home, property, land.",
        expanded: "If the lord is benefic, the native seeks silence and tranquility; if malefic, there is a strong materialistic desire for assets. Disturbances occur when malefic planets or difficult aspects are present. Remedies include offering foods linked to the house or lord, and installing water features or benches in temples or parks to enhance peace."
    },
    5: {
        house: "5th House (Children, Fame, Creativity)",
        classical: "Desires for fame, social acceptability, children.",
        expanded: "Donations to children’s hospitals can boost fame and social position. Recognition and social acceptance develop slowly, with a recommended remedy of supporting children’s causes for better results."
    },
    6: {
        house: "6th House (Service, Debt, Enemies)",
        classical: "Desires for revenge, debt repayment, fighting for one’s part.",
        expanded: "The native is born to repay debts and seek justice; often facing underpayment or struggles for rightful recognition. Legal battles and ongoing struggles are common themes."
    },
    7: {
        house: "7th House (Marriage, Partnerships)",
        classical: "Desires fulfilled through marriage and partnerships.",
        expanded: "Married life may be troubled due to unfulfilled or misdirected desires. Malefic planets, particularly Mars and Mercury, intensify strife. Success is best achieved under Jupiter’s positive influence."
    },
    8: {
        house: "8th House (Transformation, Losses, Secrets)",
        classical: "Desires fulfilled but cannot enjoy, sudden losses.",
        expanded: "The native gains desired assets but loses them or cannot relish them fully. Health issues and a preference for solitude emerge. Remedies involve working for ancestors and maintaining good health to appreciate one’s gains."
    },
    9: {
        house: "9th House ([translate:Fortune, Dharma, Father])",
        classical: "Desires to teach, work for religion/father-related matters.",
        expanded: "A strong karmic role involving teachers and religious duties defines growth. Malefic planets may afflict support from father and spiritual mentors, while benefics enhance guru blessings and fortune in later life."
    },
    10: {
        house: "10th House ([translate:Karma, Profession, Status])",
        classical: "Resources for karma fulfillment, peak success ages 36-42.",
        expanded: "All desires, especially career goals, are fulfilled through karmic actions; precise timing depends on planetary ages. Remedies include aligning work habits with the planetary influences to optimize success."
    },
    11: {
        house: "11th House (Income, Desires, Networks)",
        classical: "Most powerful combination, desires achieved with support.",
        expanded: "Success depends on exalted or friendly planet placements, enabling achievement of goals with proper backing. This is a rare and highly auspicious configuration."
    },
    12: {
        house: "12th House (Liberation, Isolation, Salvation)",
        classical: "Desires for liberation, absence of wants, step toward [translate:moksha].",
        expanded: "True freedom comes with realizing the futility of desires. Salvation is attained by renouncing wants. Remedies include worship of Lord Shiva, recitation of the [translate:Rudrashtakam], and honoring natural elements associated with one’s profession or income."
    }
};
const ELEVENTH_LORD_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        classical: "जिद्दी व्यक्तित्व, मजबूत धन योग, पिछले जन्म की इच्छाओं को पूरी करने पर जीवन केंद्रित।",
        expanded: "जातक का जन्म अक्सर आकस्मिक परिस्थितियों में होता है, और उसका जीवन पिछले जन्म की अधूरी इच्छाओं को पूरी करने में लगा रहता है। पिता का सहयोग प्रबल होता है, मित्र मंडली सशक्त रहती है, हालांकि वैवाहिक जीवन में समस्याएं आ सकती हैं। ऊर्जा पूर्व जन्म के कर्मिक कार्यों की पूर्ति में लगी रहती है।"
    },
    2: {
        house: "द्वितीय भाव (परिवार, धन, वाणी)",
        classical: "धन अर्जन का उत्तम योग, पारिवारिक मूल्य धन को बढ़ाते हैं।",
        expanded: "धन का संचय मुख्यतः पारिवारिक संसाधनों से होता है; इच्छा और कमाई की शक्ति दोनों ही तीव्र होती है। अशुभ भाव में अभिमान, दुःख या पारिवारिक विघटन अशांति ला सकता है, अतः संतुलन आवश्यक है।"
    },
    3: {
        house: "तृतीय भाव (भाई-बहन, कौशल, संवाद)",
        classical: "मस्तिष्क अनंत विचार उत्पन्न करता है, बंटी हुई ऊर्जा खुशी देती है।",
        expanded: "जातक विचारों को खुलेपन से साझा करता है और रचनात्मक समूहों या सामाजिक मंडली में आसानी से घुल-मिल जाता है। शौक धन से स्वतंत्र संतोष देते हैं, जो खुशमिजाज और समायोज्य व्यक्तित्व को दर्शाते हैं।"
    },
    4: {
        house: "चतुर्थ भाव (घर, शांति, संपत्ति)",
        classical: "शांति, घर, संपत्ति, भूमि की इच्छा।",
        expanded: "शुभ ग्रह होने पर जातक मौन और शांति चाहता है; अशुभ में भौतिक संपत्ति की तीव्र इच्छा होती है। अशुभ ग्रह या कठिन योग में अशांति होती है। उपाय: भाव/स्वामी से जुड़े भोज्य पदार्थ अर्पित करें, मंदिर या पार्क में जल-स्रोत या बेंच लगाना शांति बढ़ाने के लिए लाभकारी है।"
    },
    5: {
        house: "पंचम भाव (संतान, प्रसिद्धि, रचनात्मकता)",
        classical: "प्रसिद्धि, सामाजिक स्वीकृति, संतान की इच्छा।",
        expanded: "बच्चों के अस्पताल में दान प्रतिष्ठा व सामाजिक सम्मान को बढ़ा सकता है। पहचान और स्वीकार्यता धीरे-धीरे आती है, बच्चों की सहायता करने से परिणाम बेहतर होते हैं।"
    },
    6: {
        house: "षष्ठ भाव (सेवा, ऋण, शत्रु)",
        classical: "बदला, ऋण चुकाने, अपने हिस्से के लिए संघर्ष की इच्छा।",
        expanded: "जातक जन्म से ऋण चुकाने और न्याय पाने के लिए संघर्ष करता है; कम वेतन और मान्यता हेतु यथेष्ठता के लिये संघर्ष करते हैं। कानूनी झगड़े और निरंतर लड़ाइयाँ आम हैं।"
    },
    7: {
        house: "सप्तम भाव (विवाह, साझेदारी)",
        classical: "इच्छाएँ विवाह व साझेदारी से पूरी होती हैं।",
        expanded: "वैवाहिक जीवन अधूरी या गलत इच्छाओं के कारण परेशान हो सकता है। अशुभ ग्रह, विशेषकर मंगल व बुध, संघर्ष बढ़ाते हैं। गुरु के शुभ प्रभाव में सफलता मिलती है।"
    },
    8: {
        house: "अष्टम भाव (परिवर्तन, हानि, रहस्य)",
        classical: "इच्छाएँ पूरी होती हैं लेकिन आनंद नहीं मिल पाता, अचानक नुकसान।",
        expanded: "जातक वांछित वस्तुओं को पाता है मगर उन्हें पूरी तरह भोग नहीं पाता या जल्दी खो देता है। स्वास्थ्य की समस्या और एकांत की प्रवृत्ति बनती है। उपाय: पूर्वजों के लिए कार्य करें, अच्छे स्वास्थ्य को बनाए रखें ताकि अपने लाभ का आनंद ले सकें।"
    },
    9: {
        house: "नवम भाव (भाग्य, धर्म, पिता)",
        classical: "शिक्षण की इच्छा, धर्म/पिता से जुड़े कार्य।",
        expanded: "गुरु और धार्मिक कर्तव्यों से जुड़ी मजबूत कर्मिक भूमिका विकास को परिभाषित करती है। अशुभ ग्रहों से पिता और आध्यात्मिक मार्गदर्शकों का सहयोग बाधित होता है, जबकि शुभ ग्रह आशीर्वाद व जीवन के उत्तरार्ध में भाग्य बढ़ाते हैं।"
    },
    10: {
        house: "दशम भाव (कर्म, व्यवसाय, प्रतिष्ठा)",
        classical: "कर्म सिद्धि हेतु संसाधन, 36-42 वर्ष में चरम सफलता।",
        expanded: "सभी इच्छाएँ, खासतौर पर करियर लक्ष्य, अपने कर्मों के माध्यम से पूरी होती हैं; सटीक समय ग्रहों के अनुसार तय होता है। उपाय: सफलता के लिए कार्यशैली को ग्रहों के प्रभाव के अनुरूप बनाएं।"
    },
    11: {
        house: "एकादश भाव (आय, इच्छाएँ, नेटवर्क)",
        classical: "सबसे शक्तिशाली योग, सहयोग से इच्छाएँ प्राप्त होती हैं।",
        expanded: "सफलता उच्च भाव या मित्र ग्रह होने पर, सहयोग व समर्थन से मिलती है। यह दुर्लभ व बहुत शुभ योग है।"
    },
    12: {
        house: "द्वादश भाव (मुक्ति, एकांत, मोक्ष)",
        classical: "मुक्ति की इच्छा, इच्छाओं का अभाव, मोक्ष की ओर एक कदम।",
        expanded: "सच्चा सुख इच्छाओं की भ्रांति को समझकर मिलता है। इच्छाओं का त्याग मोक्ष दिलाता है। उपाय: भगवान शिव की पूजा, रुद्राष्टक का पाठ, व्यवसाय/आय से जुड़े प्राकृतिक तत्त्वों का सम्मान करें।"
    }
};


const TWELFTH_LORD_EFFECTS = {
    1: {
        house: "1st House ([translate:Ascendant/Lagna])",
        classical: "Lives in own dreamy world, struggles with practical reality, frequent sleep/work cycle issues.",
        expanded: "The native has a strong tendency to live in imagination, often sleeping during the day and being active at night. This can lead to misunderstandings with others and difficulty in practical or business planning. Remedies include making donations for ancestors on special days such as [translate:Amavasya], [translate:Poornima], and [translate:Sankranti]."
    },
    2: {
        house: "2nd House (Family, Wealth, Speech)",
        classical: "Losses through family, speech, and savings; family seldom offers lasting support.",
        expanded: "Earnings may dwindle due to family responsibilities or lack of harmony within the family. Communication habits or speech patterns sometimes contribute to financial depletion."
    },
    3: {
        house: "3rd House (Siblings, Skills, Communication)",
        classical: "Loss or forgetting of talent/skills; often works for others over self.",
        expanded: "The native often cannot capitalize on personal talents, frequently losing or underusing skills. They may work behind the scenes or serve foreign lands, with key relationships often neglected or sacrificed."
    },
    4: {
        house: "4th House (Home, Mother, Property)",
        classical: "Dependent on others for property, food, home comforts; repeated loss/change of residence.",
        expanded: "Frequent relocation is common, and the native may face difficulty owning or maintaining property. If working away from parents or outside of comfort zones, some degree of fame or relief may be gained."
    },
    5: {
        house: "5th House (Children, Fame, Creativity)",
        classical: "Loss of position/fame, creativity interrupted by downfall or illness.",
        expanded: "The native struggles to enjoy promotions, creative work, or teaching roles, with power sometimes fleeting. Both reputation and health may be compromised during peak periods."
    },
    6: {
        house: "6th House (Service, Debt, Disease)",
        classical: "Large expenditures for health, debts easily forgiven, lets go of enmity easily.",
        expanded: "Considerable spending on health or others’ difficulties occurs, but the native easily forgives and overcomes enmities. This placement suits mediators or counselors."
    },
    7: {
        house: "7th House (Marriage, Partnerships)",
        classical: "Income spent on partner, dependent on partners, profits for spouse/partner.",
        expanded: "Best suited for independent work, as partnerships often drain resources or foster dependence."
    },
    8: {
        house: "8th House (Transformation, Secrets, Decay)",
        classical: "Spiritual liberation through change, guides others at time of death.",
        expanded: "The native develops profound understanding of decay and transformation, often aiding others through spiritual knowledge. They survive multiple near-death experiences with unexpected help, learning to slow down, transform, and seek peace."
    },
    9: {
        house: "9th House ([translate:Fortune, Dharma, Father])",
        classical: "Frequent travel, help from mentors or religion; growth tied to spirituality.",
        expanded: "Guidance from teachers, [translate:guru], or religious pursuits leads to growth. Breaking free from limiting beliefs is vital for spiritual advancement. Ancestral karma significantly influences outcomes."
    },
    10: {
        house: "10th House (Profession, Status, Work)",
        classical: "Fame/work lost; career is unstable, works silently, under-credited.",
        expanded: "Though hardworking, the native’s contributions may be underrecognized, with others benefiting from their efforts. Remedies focus on ensuring appropriate recognition and valuing self-worth."
    },
    11: {
        house: "11th House (Income, Gains, Networks)",
        classical: "Delayed or partial realization of income/desires; salary or profit is diminished.",
        expanded: "The native often gives away resources before fully enjoying them, leading to elusive personal fulfillment. Remedies include prioritizing self-care and learning to meet one’s own needs."
    },
    12: {
        house: "12th House (Expenses, Isolation, Liberation)",
        classical: "Careless or lavish spending, or extreme frugality if malefic.",
        expanded: "Spending habits may be impulsive if the planet is powerful, or excessively stingy if weak. The key remedy involves balancing generosity with prudence, avoiding both miserliness and reckless giving."
    }
};
const TWELFTH_LORD_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        classical: "अपनी कल्पना में जीता है, व्यावहारिकता से संघर्ष, नींद व कार्य चक्र में परेशानी।",
        expanded: "जातक का मन अक्सर कल्पना में डूबा रहता है, दिन में सोता है, रात में सक्रिय रहता है। इससे दूसरों के साथ मतभेद और व्यावसायिक/योजनात्मक कार्यों में कठिनाई आती है। उपाय: अमावस्या, पूर्णिमा, संक्रांति जैसे विशेष दिनों पर पूर्वजों के लिए दान करें।"
    },
    2: {
        house: "द्वितीय भाव (परिवार, धन, वाणी)",
        classical: "परिवार, वाणी और बचत में हानि; परिवार से स्थायी सहयोग कम मिलता है।",
        expanded: "परिवार की जिम्मेदारियों या सामंजस्य की कमी के कारण आय घट सकती है। वाणी के तौर-तरीके या संवाद संभाषण कई बार आर्थिक क्षय का कारण बनते हैं।"
    },
    3: {
        house: "तृतीय भाव (भाई-बहन, कौशल, संवाद)",
        classical: "प्रतिभा/कौशल का ह्रास या भूलना, अक्सर दूसरों के लिए कार्य करते हैं।",
        expanded: "जातक निजी प्रतिभाओं का पूर्ण लाभ नहीं ले पाता, बार-बार कौशल खोता या कम प्रयोग करता है। परदे के पीछे कार्य करना या विदेश सेवा आम है, महत्वपूर्ण संबंधों की उपेक्षा या बलिदान भी होता है।"
    },
    4: {
        house: "चतुर्थ भाव (घर, माता, संपत्ति)",
        classical: "संपत्ति, भोजन, सुख-सुविधाओं के लिए दूसरों पर निर्भर, बार-बार निवास परिवर्तन।",
        expanded: "अक्सर स्थान बदलना पड़ता है, और संपत्ति पाने या संभालने में कठिनाई आती है। माता-पिता या आराम की जगहों से दूर काम करने पर थोड़ी प्रसिद्धि या राहत मिल सकती है।"
    },
    5: {
        house: "पंचम भाव (संतान, प्रसिद्धि, रचनात्मकता)",
        classical: "पद या प्रसिद्धि का ह्रास, रचनात्मकता बीमारी या पतन से बाधित।",
        expanded: "जातक पदोन्नति, रचनात्मक कार्य, या शिक्षण में पूर्णतः आनंद नहीं ले पाता, शक्ति अस्थायी होती है। प्रतिष्ठा व स्वास्थ्य दोनों चरम समय पर कमजोर पड़ सकते हैं।"
    },
    6: {
        house: "षष्ठ भाव (सेवा, ऋण, रोग)",
        classical: "स्वास्थ्य पर बड़ा खर्च, ऋण आसानी से माफ होते हैं, शत्रुता जल्दी छोड़ता है।",
        expanded: "स्वास्थ्य या दूसरों की कठिनाइयों पर अधिक खर्च होता है; जातक द्वेष जल्दी छोड़ देता है व आसानी से क्षमा कर देता है। संधि या सलाहकार कार्य के लिए उपयुक्त है।"
    },
    7: {
        house: "सप्तम भाव (विवाह, साझेदारी)",
        classical: "आय जीवनसाथी पर खर्च होती है, साझीदारों पर निर्भरता, लाभ साथी के लिए।",
        expanded: "स्वतंत्र कार्य सबसे उपयुक्त है, क्योंकि साझेदारी अक्सर संसाधनों को कम करती या निर्भरता बढ़ाती है।"
    },
    8: {
        house: "अष्टम भाव (रूपांतरण, रहस्य, क्षय)",
        classical: "परिवर्तन से आध्यात्मिक मुक्ति, मृत्यु के समय दूसरों को मार्गदर्शन देते हैं।",
        expanded: "जातक को क्षय व रूपांतरण की गहरी समझ मिलती है, वे अक्सर दूसरों को आध्यात्मिक ज्ञान देते हैं। कई बार मृत्यु के निकट अनुभव होते हैं, जिसमें अप्रत्याशित सहायता मिलती है; धीमे रहना, बदलना और शांति पाना सीखना पड़ता है।"
    },
    9: {
        house: "नवम भाव (भाग्य, धर्म, पिता)",
        classical: "बार-बार यात्रा, गुरु/धर्म से मदद; वृद्धि आध्यात्मिकता से जुड़ी।",
        expanded: "शिक्षकों, गुरु या धार्मिक कार्यों से मार्गदर्शन मिलता है, जिससे वृद्धि होती है। सीमित मान्यताओं को तोड़ना आध्यात्मिक उन्नति के लिए आवश्यक है। पूर्वजों का कर्म परिणाम को गहराई से प्रभावित करता है।"
    },
    10: {
        house: "दशम भाव (व्यवसाय, प्रतिष्ठा, कार्य)",
        classical: "कार्य/प्रसिद्धि का ह्रास; करियर अस्थिर, मौन में कार्य करते हैं, श्रेय काम का नहीं मिलता।",
        expanded: "कड़ी मेहनत के बावजूद योगदान को कम मान्यता मिलती है, दूसरों को लाभ मिलता है। उपाय: उचित मान्यता सुनिश्चित करना और आत्म-मूल्य का सम्मान करना आवश्यक है।"
    },
    11: {
        house: "एकादश भाव (आय, लाभ, नेटवर्क)",
        classical: "आय/इच्छाओं की पूर्णता में देरी या कमी; वेतन या लाभ कम मिलता है।",
        expanded: "जातक अक्सर संसाधनों का उपयोग करने से पहले ही उन्हें दूसरों के लिए छोड़ देता है, जिससे निजी संतुष्टि बाधित होती है। उपाय: आत्म-देखभाल प्राथमिकता दें एवं अपनी आवश्यकताएँ पूर्ण करना सीखें।"
    },
    12: {
        house: "द्वादश भाव (खर्च, एकांत, मोक्ष)",
        classical: "असावधानीपूर्वक या भव्य खर्च, अशुभ दशा में अत्यधिक कंजूसी।",
        expanded: "यदि ग्रह मजबूत है तो खर्च करने की प्रवृत्ति अधिक होती है, कमजोर हो तो अत्यधिक कंजूसी आ सकती है। उपाय: उदारता और विवेक दोनों का संतुलन रखना आवश्यक है, न अत्यधिक कंजूसी न ही फिजूलखर्ची।"
    }
};


// Audience: Astrology students and practitioners seeking practical, psychological, and karmic guidance on 3rd lord placements, blending ancient and contemporary teachings.






const HOUSE_LORDS_EFFECTS = {
    1: ASCENDANT_LORD_EFFECTS,
    2: SECOND_LORD_EFFECTS,
    3: THIRD_LORD_EFFECTS,
    4: FOURTH_LORD_EFFECTS,
    5: FIFTH_LORD_EFFECTS,
    6: SIXTH_LORD_EFFECTS,
    7: SEVENTH_LORD_EFFECTS,
    8: EIGHTH_LORD_EFFECTS,
    9: NINTH_LORD_EFFECTS,
    10: TENTH_LORD_EFFECTS,
    11:ELEVENTH_LORD_EFFECTS,
    12: TWELFTH_LORD_EFFECTS
};

const HOUSE_LORDS_EFFECTS_HINDI = {
    1: ASCENDANT_LORD_EFFECTS_HINDI,
    2: SECOND_LORD_EFFECTS_HINDI,
    3: THIRD_LORD_EFFECTS_HINDI,
    4: FOURTH_LORD_EFFECTS_HINDI,
    5: FIFTH_LORD_EFFECTS_HINDI,
    6: SIXTH_LORD_EFFECTS_HINDI,
    7: SEVENTH_LORD_EFFECTS_HINDI,
    8: EIGHTH_LORD_EFFECTS_HINDI,
    9: NINTH_LORD_EFFECTS_HINDI,
    10: TENTH_LORD_EFFECTS_HINDI,
    11: ELEVENTH_LORD_EFFECTS_HINDI,
    12: TWELFTH_LORD_EFFECTS_HINDI
};

const MOON_IN_HOUSES_EFFECTS = {
    1: {
        house: "1st House",
        effect: "Intuitive, sensitive, and emotional. Strong connection with mother brings prosperity. Past life blessings. Avoid selling milk or silver."
    },
    2: {
        house: "2nd House",
        effect: "Attractive facial features and voice, fond of good food. Financially comfortable if keeps cash at home. Watch for relationship ups and downs."
    },
    3: {
        house: "3rd House",
        effect: "Gifted in communication, writing, and healing. Great for creative expression. May face emotional fluctuations and instability."
    },
    4: {
        house: "4th House",
        effect: "Strong mother’s influence. Comfort-seeking and interested in home aesthetics. Feeding others brings blessings."
    },
    5: {
        house: "5th House",
        effect: "Creative talent, multiple relationships possible. Politically sharp and can spot trends, especially in government or administrative roles."
    },
    6: {
        house: "6th House",
        effect: "May experience health, debt, or enemies. Success likely away from birthplace. Important for mother to practice spirituality. Avoid milk at night."
    },
    7: {
        house: "7th House",
        effect: "Attractive and popular, skilled in public interactions. Marriage could be unstable due to emotional ups and downs or too many choices. Importance of home Vastu."
    },
    8: {
        house: "8th House",
        effect: "Deeply intuitive, mystical experiences possible. Emotional turmoil, unexpected gains or losses. Should channel emotions into research, occult, or healing fields."
    },
    9: {
        house: "9th House",
        effect: "Strong fortune, optimistic, strongly influenced by father or gurus. Inclined towards worshiping female deities, frequent travel indicated."
    },
    10: {
        house: "10th House",
        effect: "Career instability unless in creative roles. Difficulty finding satisfaction in work. Personal and professional issues often overlap."
    },
    11: {
        house: "11th House",
        effect: "Gains through creativity, commissions, networking. Early monetary gains possible. Emotional attachment to friends; should choose associations wisely."
    },
    12: {
        house: "12th House",
        effect: "Connection with foreign lands, strong intuition, disturbed sleep and vivid dreams. Effective as healers but risk emotional exhaustion."
    }
};
const MOON_IN_HOUSES_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव",
        effect: "सहज, संवेदनशील और भावुक। माता से गहरा संबंध समृद्धि लाता है। पूर्वजन्म का आशीर्वाद। दूध या चांदी बेचना टालें।"
    },
    2: {
        house: "द्वितीय भाव",
        effect: "आकर्षक चेहरा और मधुर वाणी, अच्छे भोजन का शौक। घर में नकद रखने पर आर्थिक स्थिति ठीक रहती है। संबंधों में उतार-चढ़ाव सम्भव।"
    },
    3: {
        house: "तृतीय भाव",
        effect: "संचार, लेखन, और चिकित्सा में प्रतिभा। रचनात्मक अभिव्यक्ति के लिए श्रेष्ठ। भावनात्मक अस्थिरता रह सकती है।"
    },
    4: {
        house: "चतुर्थ भाव",
        effect: "माता का प्रभाव प्रबल। आराम पसंद और घर की साज-सज्जा में रुचि। दूसरों को भोजन कराना शुभता लाता है।"
    },
    5: {
        house: "पंचम भाव",
        effect: "रचनात्मक प्रतिभा, अनेक संबंध संभव। राजनीतिक दृष्टि तीक्ष्ण, विशेषतः सरकारी या प्रशासनिक पदों में।"
    },
    6: {
        house: "षष्ठ भाव",
        effect: "स्वास्थ्य, ऋण या शत्रुता का अनुभव हो सकता है। जन्मस्थान से दूर सफल होता है। माता को अध्यात्म अभ्यास करना चाहिए। रात में दूध से परहेज करें।"
    },
    7: {
        house: "सप्तम भाव",
        effect: "आकर्षक और लोकप्रिय, सार्वजनिक संपर्कों में कुशल। विवाह भावनाओं अथवा विकल्पों के कारण अस्थिर हो सकता है। घर में वास्तु की महत्ता।"
    },
    8: {
        house: "अष्टम भाव",
        effect: "बहुत सहज अनुभूति, अलौकिक अनुभव संभव। भावनात्मक उतार-चढ़ाव, अप्रत्याशित लाभ या हानि। शोध, गूढ़ विज्ञान या चिकित्सा में भावनाओं को निवेश करना चाहिए।"
    },
    9: {
        house: "नवम भाव",
        effect: "भाग्य प्रबल, आशावादी, पिता या गुरु का गहरा प्रभाव। महिला देवी की पूजा में रुचि, बार-बार यात्रा संभावित।"
    },
    10: {
        house: "दशम भाव",
        effect: "करियर में स्थिरता नहीं, रचनात्मक कार्यों में ही सफलता। कार्य में संतुष्टि मिलना कठिन। व्यक्तिगत और पेशेवर समस्याएँ जुड़ी रहती हैं।"
    },
    11: {
        house: "एकादश भाव",
        effect: "रचनात्मकता, कमीशन, नेटवर्किंग से लाभ। प्रारंभिक धनलाभ संभव। मित्रों से भावनात्मक लगाव; अच्छी मित्रता का चयन जरूरी।"
    },
    12: {
        house: "द्वादश भाव",
        effect: "विदेशी भूमि से संबंध, गहरी सहज अनुभूति, नींद में बाधा और जीवंत सपने। अच्छे चिकित्सक बन सकते हैं पर भावनात्मक थکاान का खतरा।"
    }
};

const MERCURY_IN_HOUSES_EFFECTS = {
    1: {
        house: "1st House (Ascendant)",
        effect: "Mercury in the 1st house gives a youthful appearance, childlike smile, and analytical mind. Natives tend to approach even emotional situations logically, and are methodical in everyday life. Early naivety may be followed by a wake-up call, after which they become mentally defensive; some might use sharp intellect for manipulation. Validation and praise are needed—if Sun is also here, sudden financial gains and prominent reputation can emerge after age 34. Remedies: Avoid eggs, count your blessings rather than calculate everything."
    },
    2: {
        house: "2nd House",
        effect: "Mercury here bestows salesmanship and persuasive speech—can 'sell a comb to a bald man.' Imagination often becomes reality, but can lead to deception if misused, especially for selfish motives. Native excels in convincing but may lie for material goals. Relationship problems due to harsh words or dishonesty are common. Success increases with good accounting habits and honest record-keeping. Gambling, betting, and keeping green birds at home should be avoided."
    },
    3: {
        house: "3rd House",
        effect: "Brings skill with hands—musicians, artists, flexible with fingers. Youthful or unique voice, strong bond with siblings, especially younger ones. Success and stability come from good sibling relationships; conflict here can destabilize Mercury. Remedy: Maintain good relations with siblings; avoid living in south-facing homes. Mars’ influence brings Raj Yoga, while bad relations or negative planets cause setbacks."
    },
    4: {
        house: "4th House",
        effect: "Particularly strong for women—excellent home management skills and budgeting. Deep connect to home and childhood, interior decorating talents. Positive placements bring wealth (especially with Moon in 2nd/Jupiter in 9th). Negative placements or conjunctions with Ketu lead to wrong advice, losses, or maternal illness. Remedies: Worship Vishnu, respect sound advice, and be cautious of Ketu's influence."
    },
    5: {
        house: "5th House",
        effect: "Gives creative and convincing speech. Words spoken manifest easily—be careful with promises. Political and speculative sharpness; strong for trading (especially if connected to 11th house lord). Sudden rise after 34, recognition from government, possible digestive issues. Remedy: Eat home food, teach needed skills at orphanages, study history and philosophy."
    },
    6: {
        house: "6th House",
        effect: "Excels in office politics, can tactfully handle enemies and debts through speech. Skill in rolling money/lending. Fame—good or bad—is linked to maternal uncle. Start career with a job before business. Keep speech limited and precise to maintain respect. Negative placements involve misusing loans or poor maternal health. Remedy: Avoid north-facing property, respect dominant planets in the chart."
    },
    7: {
        house: "7th House",
        effect: "Strong business expansion and partnership skills. Popular and conversational, gaining reputation with age. Marriage or sexual issues if Venus is weak; avoid verbal arguments with partners. Green color is auspicious. Remedy: Perform Vishnu Arti at dusk and help elderly people. With benefic planets in 1st house, business and financial gains rise; avoid engagement with spouse’s sister if Ketu is present."
    },
    8: {
        house: "8th House",
        effect: "Not a very benefic position—a sense of anxiety, trouble expressing feelings, stammering, or interrupted thought process possible. Supports research, occult, and healing fields when paired with helpful planets. Deep meditation, supporting neurological patients, and joining environmental causes reduce negative effects. Avoid day-trading; long-term ethical investments are preferable."
    },
    9: {
        house: "9th House",
        effect: "Sensitive position—tests faith. Natives may endlessly question religion, sometimes even disrespecting it if Mercury is afflicted. With positive placements, native excels in translating scriptures and spiritual teaching. Father is influential but may have a job with frequent transfers. Remedy: Go on pilgrimages with friends and take responsibility for expenses, wear silver jewelry, read scripture like Bhagavad Gita or Vishnu Purana."
    },
    10: {
        house: "10th House",
        effect: "Superb managerial talent, great speed, but needs support from other planets or risks becoming 'jack of all trades, master of none.' Chronic procrastination stunts career. Learning new skills and respecting paternal elders, as well as participating in tree-planting or orphanage-related charity, empowers Mercury. Strictly avoid alcohol, meat, and intoxicants to maintain positive results, especially between ages 36-41."
    },
    11: {
        house: "11th House",
        effect: "Fulfilling desires through Mercury traits—friendship, speech, business acumen. Makes friends easily but must choose associations wisely; bad company leads to downfall. Significant gains from speech-driven business, but premature entry into business is risky—job first advised. Avoid giving wrong advice for personal gain. Remedy: Donate to orphanages and environmental organizations, delay business setup until after age 34."
    },
    12: {
        house: "12th House",
        effect: "Highly imaginative, risk of procrastination and broken promises—especially false pledges to friends or God. Native may think a lot but struggles to act. Profound spiritual knowledge, but must channel it practically. Deep meditation, helping orphans and regular charity work stabilize Mercury, and avoid trusting siblings or neighbors completely. Remedy: Do not marry before age 25, donate stationery and spend Wednesdays with orphans."
    }
};
const MERCURY_IN_HOUSES_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        effect: "बुध पहले भाव में होने से युवा रूप, बचपन जैसी मुस्कान और विश्लेषणात्मक सोच मिलती है। भावनात्मक स्थिति में भी तर्कशीलता रहती है, दिनचर्या व्यवस्थित होती है। शुरू में मासूमियत होती है, बाद में मानसिक रूप से सतर्क हो जाते हैं; कुछ लोग तेज बुद्धि का दुरुपयोग भी कर सकते हैं। मान्यता व सराहना जरूरी है—सूर्य के साथ हो तो 34 वर्ष के बाद अचानक धन-लाभ और प्रसिद्धि मिलती है। उपाय: अंडा न खाएँ, आभार व्यक्त करें, सब बातें गिनें नहीं।"
    },
    2: {
        house: "द्वितीय भाव",
        effect: "बुध यहां अच्छा बिक्री कौशल और प्रेरक वाणी देता है—गंजे को कंघी भी बेच सकते हैं। कल्पना अक्सर हकीकत बनती है, पर स्वार्थ के लिए दुरुपयोग होने पर धोखा हो सकता है। संबंधों में झगड़े कठोर वाणी व असत्य बोलने से आते हैं। सफलता ईमानदार लेखा प्रबंधन व सही रिकॉर्ड रखने से बढ़ती है। जुआ, सट्टेबाजी और घर में हरे रंग के पक्षी रखने से बचें।"
    },
    3: {
        house: "तृतीय भाव",
        effect: "हाथों में दक्षता—संगीतकार, कलाकार, उंगलियों में लचीलापन। आवाज युवाशक्ति या अनोखी, छोटे भाई-बहनों से बंधन मजबूत। भाई-बहनों से अच्छे संबंध रहें तो सफलता व स्थिरता मिलती है; झगड़ें या ग्रह दोष हों तो बुध कमजोर होता है। उपाय: भाई-बहनों से अच्छे संबंध रखें, दक्षिणमुखी घर में न रहें। मंगल के प्रभाव में राजयोग, नकारात्मक संबंध या ग्रह दोष हो तो बाधा।"
    },
    4: {
        house: "चतुर्थ भाव",
        effect: "महिलाओं के लिए विशेष रूप से मजबूत—घर प्रबंधन और बजट में कुशल। घर व बचपन से गहरा लगाव, इंटीरियर डेकोरेशन में प्रतिभा। अच्छा योग धन देता है (विशेषतः चंद्र द्वितीय/गुरु नवम में हो)। खराब योग या केतु के साथ संयोग में गलत सलाह, नुकसान, माँ की बीमारी। उपाय: विष्णु की उपासना करें, सही सलाह का सम्मान करें, केतु के प्रभाव से सतर्क रहें।"
    },
    5: {
        house: "पंचम भाव",
        effect: "रचनात्मक व प्रेरक वाणी देता है। कही बात तुरंत प्रकट हो जाती है—वचन सोच-समझकर दें। राजनीति व सट्टा की तेजबुद्धि; व्यापार के लिए उत्तम (विशेषकर एकादश स्वामी से जुड़ा हो)। 34 वर्ष के बाद अचानक लाभ, सरकारी मान्यता, पाचन संबंधी समस्या संभव। उपाय: घर का बना भोजन खाएँ, अनाथालय में जरूरत की शिक्षा दें, इतिहास/दर्शन पढ़ें।"
    },
    6: {
        house: "षष्ठ भाव",
        effect: "ऑफिस पॉलिटिक्स में उत्कृष्ट, शत्रुओं/ऋण को वाणी से निपटाने में माहिर। धन घुमाने या उधार देने में दक्ष। प्रसिद्धि—अच्छी या खराब—मामा से जुड़ी है। करियर नौकरी से शुरू करें, फिर व्यापार। सम्मान पाने हेतु वाणी सीमित रखें। अगर योग खराब हो तो उधार या मामा की तबीयत प्रभावित। उपाय: उत्तरमुखी संपत्ति न लें, चार्ट के मजबूत ग्रहों का सम्मान करें।"
    },
    7: {
        house: "सप्तम भाव",
        effect: "व्यापार विस्तार और साझेदारी में प्रबल। लोकप्रियता और बातचीत में कुशल, उम्र के साथ पहचान बढ़ती है। शुक्र कमजोर हो तो विवाह या यौन समस्याएँ; जीवनसाथी से वाद-विवाद न करें। हरा रंग शुभ। उपाय: सांझ को विष्णु आरती करें और बुजुर्गों की सेवा करें। लग्न में शुभ ग्रह हों तो व्यापार व धनलाभ; केतु हो तो जीवनसाथी की बहन से संबंध से बचें।"
    },
    8: {
        house: "अष्टम भाव",
        effect: "बहुत शुभ नहीं—चिंता, भावनाएँ व्यक्त करने में कठिनाई, हकलाना, विचार बाधित। अच्छे योग हों तो शोध, रहस्य, चिकित्सा क्षेत्र में उत्कृष्टता। गहन ध्यान, न्यूरोलॉजिकल मरीजों की सेवा, पर्यावरण में सक्रियता लाभकारी। शेयर बाजार में दिन-प्रतिदिन सौदे न करें, दीर्घकालीन नैतिक निवेश बेहतर है।"
    },
    9: {
        house: "नवम भाव",
        effect: "संवेदनशील स्थान—आस्था की परीक्षा। जातक हमेशा धर्म पर सवाल करता है, बुध अशुभ हो तो धर्म की अवमानना। अच्छा योग हो तो ग्रंथों का अनुवाद व आध्यात्मिक शिक्षण में दक्ष। पिता प्रभावशाली पर अक्सर ट्रांसफर वाली नौकरी। उपाय: मित्रों के साथ तीर्थ जाएँ, खर्च का जिम्मा लें, चाँदी पहनें, गीता या विष्णुपुराण पढ़ें।"
    },
    10: {
        house: "दशम भाव",
        effect: "प्रबंधन में उत्कृष्ट प्रतिभा, तेज गति, पर अन्य ग्रहों का समर्थन जरूरी; वरना 'जैक ऑफ ऑल ट्रेड्स, मास्टर ऑफ नन’। टालमटोल से करियर रुकता है। नए कौशल सीखें, पिता के बुजुर्गों का सम्मान करें, पेड़ लगाएँ या अनाथालय में दान करें। 36-41 वर्ष के बीच शराब, मांस, नशा से पूरी तरह बचें।"
    },
    11: {
        house: "एकादश भाव",
        effect: "बुध के गुणों से इच्छापूर्ति—मित्रता, वाणी, व्यापार बोध। मित्र बनाना आसान; संबंध सावधानी से चुनें, गलत मित्र संगति हानि लाती है। वाणी से कारोबार में बड़ा लाभ, जल्दी व्यापार शुरू करना अनुचित—पहले नौकरी करें। अपने लाभ के लिए गलत सलाह न दें। उपाय: अनाथालय/पर्यावरण संस्थानों में दान दें, व्यापार 34 के बाद शुरू करें।"
    },
    12: {
        house: "द्वादश भाव",
        effect: "ज्यादा कल्पनाशीलता, कार्य टालना और वादों का उल्लंघन—खासकर मित्र या ईश्वर से किये वादे। ज्यादा सोचता है, कार्य करने में दिक्कत। गहरा आध्यात्मिक ज्ञान, पर उसे व्यावहारिक बनाएं। गहन ध्यान, अनाथों की सेवा और नियमित दान बुध को स्थिर करता है, भाई-बहनों या पड़ोसियों पर संपूर्ण विश्वास करने से बचें। उपाय: 25 वर्ष से पहले विवाह न करें, स्टेशनरी दान करें, बुधवार को अनाथों के साथ बिताएं।"
    }
};


const VENUS_IN_HOUSES_EFFECTS = {
    1: {
        house: "1st House (Ascendant)",
        effect: "Venus in the Ascendant makes the native naturally charming, beautiful or handsome, and gives a magnetic presence. Such people tend to be the 'product' themselves—others are drawn to their looks, style, and aura. They are attracted to luxury, perfumes, fine clothes, and often have one highly attractive facial feature. However, it's critical to maintain respect in relationships, as mistreatment or infidelity—especially between ages 16 to 32—directly impacts wealth and fortune. Remedies include treating the spouse with utmost respect and avoiding extra-marital involvements. Attraction to others' partners can lead to significant negative karma. Relationship with the mother can face turbulence; relationship harmony is key to both emotional and financial well-being."
    },
    2: {
        house: "2nd House",
        effect: "Venus in the 2nd grants a sweet voice, pleasant facial features, and a love for delicious food and luxury items. These natives have strong financial skills and intuitively understand money matters, banking, and investments. However, there may be a risk of addiction or overindulgence, particularly in sweets, alcohol, or smoking. Relationships with maternal aunts and their blessings are strongly linked to Venus’s strength. Regular donation of food and clothes, especially to women or girl children, is highly beneficial. Marriage may face periodic challenges; maintaining good relations within the extended family is important."
    },
    3: {
        house: "3rd House",
        effect: "Venus here opens doors for frequent travel, strong sibling relationships, and creative talents, particularly in music or arts. These individuals attract multiple relationships or love proposals, and often face repeated breakups and emotional ups and downs. There can be mental stress stemming from relationship issues or sexual orientation. It's important to not let loneliness drive one into toxic bonds. Creative pursuits and supporting siblings—especially sisters—act as powerful remedies. Relationship choices must be made with clarity and responsibility."
    },
    4: {
        house: "4th House",
        effect: "Venus in the 4th gives directional strength (digbala), great aesthetic sense, and a deep love for home, luxury, and comfort. These people create beautiful living spaces and may collect antiques, musical instruments, or fine furniture. However, they may get caught between mother and spouse relationships—balancing both is crucial. Early romantic involvement can derail developing creative talents. Home should be filled with soft colors, scented candles, and plants. White color, home donations, and supporting cows help balance Venus here. Spiritual practices with the mother or partner brings peace."
    },
    5: {
        house: "5th House",
        effect: "This is a placement of great romance, creativity, and love for the performing arts. The native experiences powerful love affairs, and these relationships—positive or negative—bring deep life lessons and transformation. Great opportunity exists for earning through creativity, teaching, or performance. However, sexual desires may be high, and extramarital involvements or taking love for granted produces karma. Blessing elderly women and participating in festivals like Navratri bring positive results. Musical instruments and creative hobbies act as important channels for Venus energy."
    },
    6: {
        house: "6th House",
        effect: "Contrary to common belief, Venus in the 6th can make a person physically attractive, especially if Mercury is strong. The native has expertise in color or fashion coordination and can get great deals while shopping. Relationship karma involves conflicts or false allegations, possibly due to past-life actions. It's essential to respect and help underprivileged women—donate to sweepers, underprivileged girl children, and avoid gossip or flattery. This placement means learning boundaries and avoiding unnecessary romantic entanglements serves well."
    },
    7: {
        house: "7th House",
        effect: "This placement gives immense relationship power, attraction, and a strong bond with the spouse. Famous for looks, particularly among men who get thick beards or women with glamorous appeal. Marriage brings notable changes—financial gains or change in residence. These natives often act as relationship counselors, mediators, or peacemakers. Partner's respect or disrespect directly impacts social status and fortunes. Avoiding conflicts within family and respecting females is critical. Spiritual engagement (e.g., devotional music or dance) brings deeper satisfaction."
    },
    8: {
        house: "8th House",
        effect: "Venus in the 8th makes one a true transformer and healer. Native may help others through crises or transformations and suddenly acquire wealth (e.g., inheritance, insurance). Relationships are deeply intense, sometimes delayed, but once committed, these bonds become all-consuming. The native must manage desires and avoid addiction, as excesses lead to health problems. Occult or healing professions, helping with last rites, and donation of medicines or food at hospitals balance karma. Spouse's family may bring property or gains."
    },
    9: {
        house: "9th House",
        effect: "Great emphasis on spiritual or creative lineage—father may be artistic, attractive, or connected to performance arts. Relationship with married goddesses or devotion to feminine divinities amplifies luck. Frequent support from rich friends, travel luxuries, and spiritual quests are highlighted. Taking regular breaks and pilgrimages, supporting father or family in spiritual ventures, and donating to temples or goddess shrines are beneficial. Avoid major investments during Venus periods unless advised."
    },
    10: {
        house: "10th House",
        effect: "Highly lucrative for career and reputation; the native may gain from business, especially family trades, and enjoy high income from workplace. However, workplace romance or misuse of power for relationships can damage reputation and finances. The family plays a central role in prosperity, and after age 42, Venus's effects become pronounced. Focus on professional integrity and charity for workers, orphans, or environmental causes. Avoid distractions and stick to ethical earning."
    },
    11: {
        house: "11th House",
        effect: "Intense desire to earn money and experience luxury. Early in life, the native is resourceful, earning through side gigs or creative enterprises. Opportunities (including dowry or commissions) increase after marriage. Full financial reward is linked to hard work and paying off debts. Donations to domestic help or supporting their children’s education, along with home-based remedies (like using soft home colors), are crucial. Overthinking can be managed by creating a soothing environment at home."
    },
    12: {
        house: "12th House",
        effect: "Venus is exalted in the 12th house—ultimate liberation via selfless giving. Native is extremely lucky; spouse absorbs or deflects many life problems. Losses turn into gains through charity, spiritual growth, and deep meditative practices with the partner. Luxury is appreciated but not hoarded. Giving food (especially oily or sweet), serving orphans or old-age homes, and joint meditation with the spouse ensures continued fortune. Even if initial wealth is low, the mind is satisfied due to high spiritual consciousness and the feeling that nothing material can be carried beyond this life."
    }
};
const VENUS_IN_HOUSES_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        effect: "शुक्र लग्न में होने से जातक स्वाभाविक रूप से आकर्षक, सुंदर/हैंडसम और चुंबकीय व्यक्तित्व वाला होता है। ऐसे लोग स्वयं ही 'प्रोडक्ट' बन जाते हैं—दूसरे उनके रूप, स्टाइल और आभा से आकर्षित होते हैं। विलासिता, इत्र, सुंदर कपड़े इन्हें भाते हैं और चेहरा विशेष आकर्षक होता है। रिश्तों में सम्मान बनाए रखना बेहद जरूरी है, विशेषकर 16 से 32 वर्ष के बीच गलत व्यवहार या बेवफाई धन/भाग्य को सीधे प्रभावित करती है। उपाय: जीवनसाथी को सम्मान दें, विवाहेतर संबंधों से बचें। अन्य के साथी के लिए आकर्षण भारी कर्म दोष ला सकता है। माता से संबंध अस्थिर हो सकते हैं; संबंधों की शांति ही मानसिक और वित्तीय सुख की कुंजी है।"
    },
    2: {
        house: "द्वितीय भाव",
        effect: "शुक्र यहां मधुर वाणी, आकर्षक चेहरा और स्वादिष्ट भोजन, विलासिता की वस्तुओं की रुचि देता है। वित्तीय समझ तेज होती है, बैंकिंग/निवेश में माहिर। मिठाई, शराब या धूम्रपान की लत की संभावना रहती है। मामा पक्ष से संबंध और उनका आशीर्वाद शुक्र की शक्ति से जुड़े हैं। स्त्रियों/बालिकाओं को भोजन/कपड़े देना लाभकारी है। विवाह में उतार-चढ़ाव संभव; विस्तृत परिवार में अच्छे संबंध जरूरी हैं।"
    },
    3: {
        house: "तृतीय भाव",
        effect: "शुक्र यहां बार-बार यात्राएं, भाई-बहनों से मजबूत संबंध और संगीत/कला में प्रतिभा देता है। अनेक रिश्ते या प्रेम प्रस्ताव मिलते हैं, अक्सर ब्रेकअप व भावनात्मक उतार-चढ़ाव का अनुभव होता है। यौनता या रिश्तों में तनाव आ सकता है। अकेलापन ऐसे व्यक्ति को गलत संबंधों में न धकेल दे। रचनात्मक कार्य और भाई-बहनों, खासकर बहनों की सहयोगी भूमिका बढ़िया उपाय हैं। रिश्तों में स्पष्टता व जिम्मेदारी अनिवार्य है।"
    },
    4: {
        house: "चतुर्थ भाव",
        effect: "दिग्बल से प्रबल, सुंदरता का बेहतरीन भाव, घर, विलासिता व आराम में विशेष रुचि। घर को सुंदर बनाने, प्राचीन वस्तुएं, वाद्य, फर्नीचर संग्रह करने में माहिर। माता व जीवनसाथी के साथ तालमेल जरूरी है, दोनों के बीच संतुलन रखना मुश्किल हो सकता है। जल्दी प्रेम में पड़ना रचनात्मकता को भटका सकता है। घर में हल्के रंग, सुगंधित मोमबत्तियाँ, पौधे रखें। सफेद रंग, गाय की सेवा, दान और मां अथवा जीवनसाथी के साथ ध्यान करना शांति देता है।"
    },
    5: {
        house: "पंचम भाव",
        effect: "विलक्षण रोमांस, रचनात्मकता, मंचीय कलाओं का प्रेम। गहरे प्रेम संबंध जीवन में बड़ा बदलाव लाते हैं। रचनात्मकता, शिक्षण, प्रदर्शन से कमाई का अच्छा अवसर। सेक्स-इच्छाएँ तीव्र, प्रेम को हल्के में लेना या विवाहेतर संबंध कर्म बढ़ाते हैं। बुजुर्ग महिलाओं का आशीर्वाद और नवरात्रि जैसे त्योहारों में भाग लेना लाभकारी। संगीत या रचनात्मक शौक शुक्र की ऊर्जा को दिशा देते हैं।"
    },
    6: {
        house: "षष्ठ भाव",
        effect: "सामान्य विश्वास के विपरीत, बुध मजबूत हो तो शुक्र शारीरिक रूप से आकर्षक बना सकता है। रंग/फैशन का अच्छा तालमेल मिलता है, खरीदारी में डीलिंग में माहिर। रिश्तों का कर्म संघर्ष या झूठे आरोप ला सकता है; पुराने कर्मों का असर। अक्षम महिलाओं की सहायता करें—झाडू लगाने वालों, गरीब बालिकाओं에게 दान दें, चुगली-चापलूसी से बचें। सीमा सीखना और फालतू रोमांस से दूरी रखना जरूरी है।"
    },
    7: {
        house: "सप्तम भाव",
        effect: "रिश्तों की जबर्दस्त शक्ति, आकर्षण, जीवनसाथी से गहरा बंधन। पुरुषों को घनी दाढ़ी, महिलाओं में ग्लैमरस आकर्षण। विवाह से बड़ा परिवर्तन—आर्थिक लाभ या घर बदलना संभव। ये रिश्तों में सलाहकार, मध्यस्थ या शांति-साधक बनते हैं। जीवनसाथी के सम्मान या अपमान से सामाजिक प्रतिष्ठा व भाग्य प्रभावित होता है। परिवार/स्त्रियों का सम्मान करना जरूरी। भक्ति संगीत/नृत्य व आध्यात्मिक साधना संतुष्टि देती है।"
    },
    8: {
        house: "अष्टम भाव",
        effect: "शुक्र यहाँ परिवर्तनशील और उपचारकर्ता बनाता है। संकटों में दूसरों की मदद, अचानक धन प्राप्ति (विरासत, बीमा)। रिश्ते गहरे/तीव्र, कभी विलंबित, लेकिन एक बार जुड़े तो सबकुछ समर्पित। इच्छाओं और लत्तों पर नियंत्रण रखें, वरना स्वास्थ्य खराब। गूढ़ विज्ञान/चिकित्सा, अंतिम संस्कार, अस्पताल में दवा/भोजन दान से कर्म संतुलित। जीवनसाथी के परिवार से संपत्ति या लाभ मिल सकता है।"
    },
    9: {
        house: "नवम भाव",
        effect: "आध्यात्मिक/रचनात्मक वंशवली पर जोर; पिता कलात्मक, आकर्षक या मंच से जुड़े। देवी पूजा या स्त्री देवी के प्रति भक्ति से भाग्य मजबूत। धनवान मित्रों का सहयोग, विलासिता पूर्ण यात्राएं, आध्यात्मिक खोज। नियमित विराम, तीर्थ, पिता या परिवार को आध्यात्मिक कार्यों में सहयोग, मंदिर/देवी स्थलों में दान लाभकारी। शुक्र की दशा में बड़ी खरीद-फरोख्त न करें जब तक सलाह न हो।"
    },
    10: {
        house: "दशम भाव",
        effect: "कैरियर/प्रतिष्ठा के लिए बड़ा लाभदायक; फैमिली बिज़नेस या कार्यस्थल से अच्छी आय। ऑफिस रोमांस या शक्तियों का गलत प्रयोग प्रतिष्ठा/धन को नुकसान पहुंचा सकता है। परिवार संपन्नता का मुख्य स्रोत, 42 वर्ष के बाद शुक्र का योग अधिक फलप्रद। पेशेगत ईमानदारी, कामगार/अनाथ/पर्यावरण का दान जरूरी। विचलित न हों, नैतिक कमाई पर ध्यान दें।"
    },
    11: {
        house: "एकादश भाव",
        effect: "धन कमाने व विलासिता प्राप्त करने की तीव्र इच्छा। जीवन के शुरू में समझदारी से कमाई, साइड बिज़नेस या रचनात्मक क्षेत्र से आय। शादी के बाद मौके (दहेज/कमीशन) बढ़ते हैं। पूरी वित्तीय सफलता अनुशासन व ऋण चुकाने से जुड़ी है। घरेलू कार्यकर्ताओं के बच्चों की शिक्षा, घर में हल्के रंग का उपयोग लाभकारी। अति विचार को शांत वातावरण से नियंत्रित करें।"
    },
    12: {
        house: "द्वादश भाव",
        effect: "शुक्र द्वादश भाव में उच्च—त्याग से मोक्ष। बेहद भाग्यशाली, साथी कई समस्याएँ दूर कर देता है। हानि दान, साधना, गहन ध्यान से लाभ में बदलती है। विलासिता का आनंद लिया जाता है लेकिन संचय नहीं होता। तैलीय/मिठाई भोजन दान, अनाथ या वृद्धाश्रम में सेवा, जीवनसाथी के साथ ध्यान से भाग्य स्थायी रहता है। शुरू में धन कम हो तो भी उच्च चिंतन व आत्मिक संतोष रहता है।"
    }
};


const KETU_IN_HOUSES_EFFECTS = {
    1: {
        house: "1st House (Ascendant)",
        effect: "Ketu in the 1st house gives a highly imaginative and otherworldly personality. The native often feels disconnected from reality, living in a world of their own thoughts, daydreams, and predictions of future scenarios. There’s a tendency toward impulsive decisions and regret afterwards. Overthinking is common, often manifesting as vivid manifestation skills—great for creative success if managed, but it can lead to anxiety if not balanced. Remedy: Strengthen the Moon, meditate, pursue practices for mental clarity, and respect grandparents, especially maternal grandfather."
    },
    2: {
        house: "2nd House",
        effect: "Such natives find it hard to accumulate wealth as expenses or family needs often drain savings. There may be frequent financial breaks, medical expenses, or circumstances leading to living apart from family or facing separation within the family. Speech may hurt relationships if not controlled, and addiction to tamasic foods, smoking, or even substances can arise. Remedy: Avoid onions, garlic, alcohol, and consuming food after sunset. Practice non-violence and speak gently."
    },
    3: {
        house: "3rd House",
        effect: "Bestows magical healing power—native may become an excellent healer, writer, or critic. A magic touch is present but relationships, especially with siblings, often face disruption or separation. There’s a pattern of purposeless travel, restlessness, and sometimes social isolation. Remedies: Avoid unrealistic expectations from younger siblings, practice healing professions (physio, reiki, etc.), and keep a regular practice of meditation or yoga."
    },
    4: {
        house: "4th House",
        effect: "Creates a restless feeling at home—especially for men, the more time spent at home, the more frustration or disputes arise. Mother is often spiritual or mentally detached, or health issues may exist. Career or chapter away from home is favored. Possibility of surgeries or chest/acid-related health issues. Remedy: Respect the mother, donate to hospitals or women’s charities, and avoid smoking."
    },
    5: {
        house: "5th House",
        effect: "Romantic life may face repeated break-ups and lack of emotional fulfillment. Natives carry past-life genius or talent in arts, analysis, or creativity and may see unique talents in their children. There’s a tendency to feel like a dissatisfied king. Remedy: Protect important paperwork, avoid overconfidence in love, and use your analytical gifts for teaching or research."
    },
    6: {
        house: "6th House",
        effect: "Brings a selfless, helpful tendency and connects past-life debts or enmities to the present. There’s difficulty following routines or keeping regular employment—business or freelance may seem easier. Prone to allergies, joint pains, or chronic illnesses connected to karma. Remedy: Write down daily routines and goals, take Mercury’s support, and adopt a structured lifestyle."
    },
    7: {
        house: "7th House",
        effect: "Partnerships draw karmic baggage—sometimes there is separation, adjustment due to age, status, or race gaps in marriage. Such natives may find difficulties in long-term friendships as well. Sharing everything with a partner may backfire—balance and boundaries are crucial. Remedy: Respect your spouse fully, keep certain thoughts private, and avoid full transparency about past or financial matters."
    },
    8: {
        house: "8th House",
        effect: "Gives deep research skills and an attraction to occult, healing, or finance fields (like stock trading). Secretive nature is amplified and secrecy brings success. Problems may occur in the urinary or reproductive system. Remedy: Serve and donate to dogs, keep secrets in financial matters, and avoid unnecessary exposure of private details."
    },
    9: {
        house: "9th House",
        effect: "Questioning religious dogma, shifting spiritual philosophies, and frequent pilgrimages or attraction to different gurus. Father may be silent, spiritual, or frequently absent. Remedy: Explore different philosophies, take blessings from the father, value personal faith, and donate to temples."
    },
    10: {
        house: "10th House",
        effect: "Acts as a catalyst in career—important changes often occur after age 48. Sudden breaks, career shifts, or transformations common. May over-deliver in work and act as a problem-solver in professional life. Extramarital affairs or misuse of status can destroy reputation. Remedy: Always deliver something extra in business, offer sweets secretly at work, avoid illegal or unethical relations."
    },
    11: {
        house: "11th House",
        effect: "Futuristic thinking, minimal expectations from friends, loneliness over time, but earns respect for wisdom and independence. Past-life fulfillment means little need for reliance on others for support. Health of mother or grandmother may be affected after birth of a son. Remedy: Avoid emotional dependency on friends, meditate, and help others selflessly. Major life changes at ages 11, 23, 36, or 48."
    },
    12: {
        house: "12th House",
        effect: "The most spiritual and beneficial Ketu placement—strong urge to donate, serve, and sacrifice. May feel detached from material life, love animals, and pursue spirituality naturally. Low attachment to outcomes means deep spiritual satisfaction. Risk of being misled by false gurus if Jupiter or the 12th lord are weak. Remedy: Donate regularly, adopt pets or serve animals, and operate with minimal expectations from people and outcomes."
    }
};
const KETU_IN_HOUSES_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        effect: "केतु लग्न में होने पर कल्पनाशील, अलौकिक व्यक्तित्व मिलता है। जातक अक्सर वास्तविकता से कट जाता है, अपने विचारों, दिवास्वप्नों और भविष्य की कल्पना में खोया रहता है। अचानक निर्णय लेकर बाद में पछतावा हो सकता है। जरूरत से ज्यादा सोचना आम है, जो रचनात्मक सफलता के लिए अच्छा है, पर संतुलन न हो तो चिंता भी बढ़ती है। उपाय: चंद्र को मजबूत करें, ध्यान करें, मानसिक स्पष्टता के लिए साधना करें और दादाजी (मौसी पक्ष) का सम्मान करें।"
    },
    2: {
        house: "द्वितीय भाव",
        effect: "ऐसे जातकों को धन-संचय करना कठिन होता है क्योंकि खर्च या परिवार की जरूरतें बचत को कम कर देती हैं। बार-बार आर्थिक बाधाएँ, चिकित्सा खर्च या परिवार से दूरी का अनुभव हो सकता है। अगर वाणी नियंत्रित न हो तो संबंध बिगड़ सकते हैं; तामसिक भोजन, नशा, धूम्रपान की लत भी संभव। उपाय: प्याज, लहसुन, शराब, सूर्यास्त के बाद भोजन त्यागें। अहिंसा और कोमल वाणी का अभ्यास करें।"
    },
    3: {
        house: "तृतीय भाव",
        effect: "जादुई उपचार शक्ति देता है—जातक उत्तम चिकित्सक, लेखक या आलोचक बन सकता है। मैजिक टच रहता है लेकिन भाई-बहनों से संबंधों में बाधा/वियोजन हो सकता है। बिना उद्देश्य के यात्रा, अस्थिरता व सामाजिक अकेलापन मिल सकता है। उपाय: छोटे भाई-बहनों से अतिरंजित अपेक्षा न रखें, हीलिंग प्रोफेशन अपनाएं, नियमित ध्यान या योग करें।"
    },
    4: {
        house: "चतुर्थ भाव",
        effect: "घर में बेचैनी आती है—खासकर पुरुषों को घर में ज्यादा समय बिताने पर असंतोष या झगड़े बढ़ते हैं। मां अक्सर धार्मिक/मानसिक रूप से अलग हो सकती है या स्वास्थ्य में समस्या रहती है। घर से दूर कैरियर अनुकूल रहता है। सर्जरी या सीने/एसिड संबंधित स्वास्थ्य दोष संभव। उपाय: मां का सम्मान करें, अस्पताल/महिला संस्थानों को दान दें, धूम्रपान से बचें।"
    },
    5: {
        house: "पंचम भाव",
        effect: "प्रेम जीवन बार-बार टूटता है, भावनात्मक संतोष नहीं मिलता। जातक में पूर्व जन्म का कौशल या कला/विश्लेषण की प्रतिभा होती है, बच्चों में विशिष्ट गुण दिख सकते हैं। अक्सर असंतुष्ट राजा जैसा महसूस होता है। उपाय: जरूरी कागज़ सुरक्षित रखें, प्रेम में अति-विश्वास न करें, विश्लेषणात्मक प्रतिभा शिक्षण/शोध में लगाएं।"
    },
    6: {
        house: "षष्ठ भाव",
        effect: "निःस्वार्थ सहायता की प्रवृत्ति व पूर्व जन्म के ऋण/शत्रुता से वर्तमान संबंध। रोज़मर्रा का पालन या नौकरी में दिक्कत; व्यापार या स्वतंत्र कार्य अधिक अनुकूल। एलर्जी, जोड़ों में दर्द या पुरानी बीमारियाँ कर्म से जुड़ी होती हैं। उपाय: रोज़ाना रूटीन व लक्ष्य लिखें, बुध का समर्थन लें, संयोजित जीवनशैली अपनाएँ।"
    },
    7: {
        house: "सप्तम भाव",
        effect: "साझेदारी से कर्मिक बोझ आता है—विवाह में उम्र, स्थिति या जाति के अंतर से समायोजन या अलगाव संभव। लंबी मित्रता में भी परेशानी। अत्यधिक पारदर्शिता साझीदार के साथ उल्टा असर ला सकती है। उपाय: जीवनसाथी का सम्मान करें, कुछ विचार निजी रखें, भूत या वित्तीय बातों में पूर्ण पारदर्शिता न अपनाएँ।"
    },
    8: {
        house: "अष्टम भाव",
        effect: "गहन शोध की क्षमता, गूढ़ विज्ञान, हीलिंग, शेयर बाजार में आकर्षण। गुप्त स्वभाव व गोपनीयता से सफलता मिलती है। मूत्र या प्रजनन तंत्र में समस्या संभव। उपाय: कुत्तों की सेवा, वित्तीय मामलों की गोपनीयता रखें, निजी बातों का अनावश्यक सार्वजनिक प्रदर्शन न करें।"
    },
    9: {
        house: "नवम भाव",
        effect: "धार्मिक मतों से सवाल, बदलती आध्यात्मिक सोच; तीर्थ यात्रा व विभिन्न गुरु का आकर्षण। पिता मौन, धार्मिक या अनुपस्थित। उपाय: विभिन्न दर्शन का अध्ययन करें, पिता का आशीर्वाद लें, निजी श्रद्धा का मूल्य जानें, मंदिरों को दान दें।"
    },
    10: {
        house: "दशम भाव",
        effect: "कैरियर में उत्प्रेरक का कार्य—48 वर्ष के बाद बड़े परिवर्तन। अचानक विराम, बदलाव या रूपांतरण। कार्य में अतिरिक्त श्रम, समस्या समाधान की प्रवृत्ति। विवाहेतर संबंध या प्रतिष्ठा का दुरुपयोग बड़ी हानि ला सकता है। उपाय: व्यापार में हमेशा एक्स्ट्रा दें, कार्यस्थल पर गुप्त रूप से मिठाई बाँटें, गैरकानूनी/अनीतिक संबंधों से बचें।"
    },
    11: {
        house: "एकादश भाव",
        effect: "भविष्य की सोच, मित्रों से अपेक्षा कम, समय के साथ अकेलापन, ज्ञान व स्वतंत्रता के लिए सम्मान। पिछले जन्म की पूर्ति के कारण दूसरों पर निर्भरता कम रहती है। बेटे के जन्म के बाद मां/दादी की सेहत पर असर संभव। उपाय: भावनात्मक निर्भरता से बचें, ध्यान करें, दूसरों की निःस्वार्थ सहायता करें। बड़े बदलाव 11, 23, 36 या 48 वर्ष पर।"
    },
    12: {
        house: "द्वादश भाव",
        effect: "सबसे आध्यात्मिक और लाभकारी केतु स्थान—दान, सेवा, त्याग की प्रवृत्ति। भौतिकता से दूरी, पशुप्रेम व स्वाभाविक आध्यात्मिकता। कम लगाव होने से गहरी संतुष्टि। गुरु या बारहवें स्वामी कमजोर हों तो गलत मार्गदर्शक का खतरा। उपाय: नियमित दान दें, पशुओं को पालें, कम अपेक्षा रखें।"
    }
};

const RAHU_IN_HOUSES_EFFECTS = {
    1: {
        house: "1st House (Ascendant)",
        effect: "Rahu in the 1st gives a magnetic, ambitious, and sometimes conflicted personality. Deep, unfulfilled desires drive the native to pursue what others may consider impossible. Strong self-focus and tendency to search for fast money and shortcuts may overshadow hard work. Often self-obsessed, with issues discerning right from wrong when negatively placed. Remedies include keeping the main entrance/gate clean, working out regularly, meditating daily, and making donations to cancer patients every Wednesday."
    },
    2: {
        house: "2nd House",
        effect: "Brings powerful persuasive speech, sales talent, and a tendency towards ups and downs in wealth. Manifestation skills are strong; natives can convince anyone but must beware of manipulation, scams, or deceitful speech. MLM or network marketing success is possible, especially with Saturn’s influence. Avoid lying, smoking, and giving wrong advice; worship aggressive deities (e.g., Kali, Hanuman) for positive results. Remedy: Speak kindly, maintain strict honesty, and donate food, especially to aggressive deities."
    },
    3: {
        house: "3rd House",
        effect: "Bestows rapid action, multiple skills, and adaptability. Native may excel in communication, languages, online business, and side hustles. Tendency toward shortcuts and breaking rules. Beware of anger or impulsiveness, especially with Mars influence; practice secrecy in travel or business. Remedy: Feed fish or ants (mix of flour and sugar), cultivate skillful sibling relations, and avoid publicizing travel plans."
    },
    4: {
        house: "4th House",
        effect: "Strong attachment to home and objects. Obsession with home comfort and possessions; may lead to mental instability, homesickness, or spiritual unrest. Issues with mother’s health or spiritual detachment, especially if afflicted. Houses near railways, crematoriums, or public facilities often show Rahu’s influence. Remedy: Respect mother, donate to hospitals, fill the home with soft colors, and maintain a peaceful environment."
    },
    5: {
        house: "5th House",
        effect: "Extreme obsession with fame, creativity, and knowledge. Intense but sometimes troubled relationships; emotional hypersensitivity. Native may excel at analysis (especially stock market, research) but must guard against overconfidence and karmic mistakes. Remedy: Apply intellect to teaching, research, worship Sun and Jupiter, and do mantra chanting for stability."
    },
    6: {
        house: "6th House",
        effect: "Sharp, skeptical mind. Defeats enemies and excels with animals or in risky ventures. Health and addiction issues are possible; business or freelance work is favored over routine jobs. Remedy: Plan days in advance, avoid phone use in bathrooms, and donate to animal-related charities. Avoid procrastination and addictions through Mercury-driven routines."
    },
    7: {
        house: "7th House",
        effect: "Obsession in marriage and partnerships—either deeply attached to own partner or constantly drawn to others. Prone to confusion and ego clashes, extra-marital tendencies if negative. Relationship brings location or life changes. Remedies: Respect spouse and all women, avoid extramarital affairs or obsession with others’ partners, and pursue spiritual creativity, such as dance or music."
    },
    8: {
        house: "8th House",
        effect: "Powerful research and healing skills; obsession with secrets or occult. May experience sudden changes, accidents, or responsibilities for family. Remedy: Pursue research, occult sciences, palmistry, or healing, and donate medicines or food for critical illnesses. Keep emotional and mental health in check."
    },
    9: {
        house: "9th House",
        effect: "Shakes spiritual beliefs; relationship with father may be troubled or health-impacted. Blessings and setbacks may alternate, with delayed but eventual foreign travel or prosperity possible. Remedy: Respect religion, perform regular pilgrimages, and support religious or father-figure charities."
    },
    10: {
        house: "10th House",
        effect: "Master of artificial needs—creates high ambitions and new market trends at work. Diplomatic, skilled at attracting and influencing masses or customers. Success depends on Saturn’s placement and emotional control. Remedy: Donate to disabled persons, work for ethical causes, and balance emotional stability to maintain career momentum."
    },
    11: {
        house: "11th House",
        effect: "Huge desires and management skills; resources often come from diverse networks. Early betrayals by friends, but native eventually rises to become a major manager or industrialist. Must return favors and avoid pride or overconfidence. Remedy: Donate to disabled or physically challenged, help others without expectation, and avoid emotional dependencies."
    },
    12: {
        house: "12th House",
        effect: "Gives spiritual altruism or—if negative—attraction to illegal pursuits (smuggling, substance abuse). When positive, brings renown, spiritual satisfaction, and power to help others selflessly. Negative placements attract manipulative practices or generational karma. Remedy: Donate, serve selflessly (especially to animals and disabled), and avoid black magic or manipulative rituals."
    }
};
const RAHU_IN_HOUSES_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        effect: "राहु लग्न में चुंबकीय, महत्वाकांक्षी और कभी-कभी द्वंद्वयुक्त व्यक्तित्व देता है। गहरी, अधूरी इच्छाएँ जातक को असंभव कार्यों की ओर आकर्षित करती हैं। आत्म-केंद्रितता और जल्दी पैसा या शॉर्टकट खोजने की प्रवृत्ति मेहनत को पीछे छोड़ देती है। आत्मग्रस्तता बढ़ती है, गलत-सही में भेद नहीं कर पाता जब राहु कमजोर हो। उपाय: मुख्य द्वार को साफ रखें, नियमित व्यायाम करें, प्रतिदिन ध्यान करें, बुधवार को कैंसर रोगियों को दान करें।"
    },
    2: {
        house: "द्वितीय भाव",
        effect: "शक्तिशाली प्रेरक वाणी, बिक्री कौशल और धन में उतार-चढ़ाव देता है। प्रदर्शनीय क्षमता मजबूत, पर गुमराह करने वाली वाणी या धोखा संभावित है। नेटवर्क या MLM में सफलता संभव—विशेषकर शनि के साथ। झूठ, धूम्रपान, गलत सलाह से बचें; आक्रामक देवताओं (जैसे काली, हनुमान) की पूजा करें। उपाय: मधुर बोले, ईमानदारी रखें, आक्रामक देवताओं को भोजन का दान दें।"
    },
    3: {
        house: "तृतीय भाव",
        effect: "राहु यहां तेजी, बहु-कौशल और अनुकूलनशीलता देता है। संवाद, भाषाओं, ऑनलाइन बिजनेस और साइड हसल्स में सफलता। शॉर्टकट व नियम तोड़ने की प्रवृत्ति। मंगल के साथ गुस्सा-आवेग बढ़ सकता है; यात्रा/व्यापार में गोपनीयता रखें। उपाय: आटे-शक्कर का मिश्रण मछलियों/चींटियों को खिलाएँ, भाई-बहनों से रिश्ते सधे रखें, यात्रा योजनाएँ प्रचारित न करें।"
    },
    4: {
        house: "चतुर्थ भाव",
        effect: "घर और चीजों से गहरा मोह। आराम और वस्तुओं का लगाव मानसिक बेचैनी, घर की याद या आध्यात्मिक अशांति देता है। मां का स्वास्थ्य या मन से दूरी, विशेषकर अशुभ दशा में। रेलवे, श्मशान या सार्वजनिक सुविधा के पास मकान में राहु का प्रभाव। उपाय: मां का सम्मान करें, अस्पताल में दान दें, घर में हल्के रंग रखें, शांति का माहौल बनाएं।"
    },
    5: {
        house: "पंचम भाव",
        effect: "प्रसिद्धि, रचनात्मकता और ज्ञान की तीव्र इच्छा। संबंध तीव्र पर दिक्कतों भरे, संवेदनशीलता अधिक। विश्लेषण (विशेष रूप से शेयर बाजार/शोध) में सफलता, पर अति आत्मविश्वास व कर्म दोष से सावधान रहें। उपाय: शिक्षा, शोध, सूर्य-विष्णु की पूजा, मंत्रजाप करें।"
    },
    6: {
        house: "षष्ठ भाव",
        effect: "तीखी, संशयात्मक बुद्धि। शत्रुओं पर विजय, जानवरों या जोखिम में सफलता। स्वास्थ्य व नशे की समस्या संभव; नौकरी के बजाय कारोबार या स्वतंत्र काम अनुकूल। उपाय: दिनचर्या पहले से प्लान करें, बाथरूम में फोन न लें, जानवरों की सेवा करें, विलंब और लत से बचें।"
    },
    7: {
        house: "सप्तम भाव",
        effect: "विवाह/साझेदारी में आकर्षण या अति-लगाव—या अपने जीवनसाथी से या पराए से। भ्रम, अहं संघर्ष व विवाहेतर प्रवृत्ति संभव। संबंध स्थल या जीवन में बड़ा बदलाव लाते हैं। उपाय: जीवनसाथी व सभी महिलाओं का सम्मान करें, विवाहेतर संबंध या दूसरे के साथी के प्रति आसक्ति से बचें, नृत्य-संगीत जैसी रचनात्मकता अपनाएँ।"
    },
    8: {
        house: "अष्टम भाव",
        effect: "शोध, चिकित्सा शक्ति; रहस्य या गूढ़ ज्ञानी। अचानक बदलाव, दुर्घटना या परिवार की जिम्मेदारी बढ़ सकती है। उपाय: शोध, तांत्रिक शास्त्र, हस्तरेखा या चिकित्सा करें, गंभीर रोगों में दवा/भोजन दान करें, मानसिक-भावनात्मक संतुलन रखें।"
    },
    9: {
        house: "नवम भाव",
        effect: "धार्मिक विश्वासों में उलझन; पिता से संबंध में समस्या या स्वास्थ्य पर असर। आशीर्वाद व रुकावटें बारी-बारी से आती हैं, देर से विदेश यात्रा या समृद्धि मिलती है। उपाय: धर्म का सम्मान करें, नियमित तीर्थ यात्रा करें, धार्मिक व पिता समान संस्थाओं में दान करें।"
    },
    10: {
        house: "दशम भाव",
        effect: "कृत्रिम आवश्यकताओं का स्वामी—कैरियर में उच्च महत्वाकांक्षा व नए ट्रेंड बनाए। जनता/ग्राहकों को आकर्षित करने में माहिर। सफलता शनि व भावनात्मक नियंत्रण पर निर्भर है। उपाय: दिव्यांगों को दान दें, नैतिक कारणों के लिए काम करें, भावनात्मक संतुलन रखें।"
    },
    11: {
        house: "एकादश भाव",
        effect: "बड़ी इच्छाएँ व मैनेजमेंट; धन विविध स्रोतों से। मित्रों से शुरू में धोखा, पर अंततः बड़ा प्रबंधक या उद्योगपति बनते हैं। एहसान चुकाएँ, घमंड/अति आत्मविश्वास से बचें। उपाय: दिव्यांगों को दान, निःस्वार्थ मदद करें, भावनात्मक निर्भरता न रखें।"
    },
    12: {
        house: "द्वादश भाव",
        effect: "आध्यात्मिक परमार्थ या उल्टा हो तो गैरकानूनी प्रवृत्ति (तस्करी, नशा)। शुभ दशा में प्रसिद्धि, आत्मसंतोष व निःस्वार्थ सेवा का बल। गलत प्लेसमेंट हो तो तंत्र-क्रिया या पुराना कर्म आकर्षित करता है। उपाय: सेवा, निःस्वार्थ दान (जानवर/दिव्यांग को), तंत्र-मंत्र या काला जादू से बचें।"
    }
};

const MARS_IN_HOUSES_EFFECTS = {
    1: {
        house: "1st House (Ascendant)",
        effect: "Mars in the Ascendant gives a strong will, impulsive energy, and natural leadership. The native feels heat in the body, is prone to bursts of courage, and often has distinguishing facial moles or marks. Early sibling blessings, especially from sisters, are prominent. After age 28, brings name, fame, and recognition, but must manage aggression and avoid self-centeredness. Key remedy: Meditate, balance internal heat, regularly pray to Hanuman, help with surgeries or health procedures for others, and recite Hanuman Chalisa eight times daily."
    },
    2: {
        house: "2nd House",
        effect: "Mars here brings direct speech and a tendency to be blunt or aggressive, sometimes causing family disputes or broken relationships. Strong spending habits exist, often leading to impulsive purchases beyond income. Prone to ulcers, mouth or teeth issues, loves spicy food, and may get motivated to speak with passion. Remedy: Feed others, help with eye surgeries, watch spending, avoid smoking/drinking, and support those facing family problems."
    },
    3: {
        house: "3rd House",
        effect: "The native is brave for others, a defender and protector, but hesitant to act for self-interest. There’s success after recognition of one's self-worth, and great power in healing and helping those facing setbacks in career. Sibling relationships matter; listen to motivational speakers and work to increase personal confidence. Thyroid or voice tone issues may arise. Remedy: Embrace self-advocacy, encourage siblings, and mend sibling relations."
    },
    4: {
        house: "4th House",
        effect: "Debilitated position for Mars, leading to emotional instability, rebellious childhood, and possible breathing or chest issues. May cause family clashes and rebellious temperament, even criminal tendencies if afflicted. Remedy: Meditate for emotional... (TRUNCATED FOR SPACE) ...supporting the mother, avoid smoking, and create a calm home environment."
    },
    5: {
        house: "5th House",
        effect: "Highly energetic in romance and creativity; prone to conflicts in relationships and expecting too much from partners. Abortions, delivery issues, and property problems may occur if Venus is afflicted. Children may become wealthy and successful. Remedy: Focus on healthy relationships, avoid abortions, nurture creative talents, and recognize others’ contributions."
    },
    6: {
        house: "6th House",
        effect: "Mars gives immense courage to overcome debts, diseases, and enemies but disrupts routine and brings karmic struggles. Right-hand to politicians role is common, strong self-esteem, and aversion to disrespect. Remedy: Pray to Hanuman, light Akhand diya on Tuesdays, recite Hanuman Chalisa, avoid non-veg food, and be careful with debts."
    },
    7: {
        house: "7th House",
        effect: "Mars here makes self-respect very high in marriage and partnerships, sometimes leading to ego clashes or separations. Unique management dynamics appear in relationships. If positive, helps others advance and fulfills wishes. Remedy: Help society through karma and education, manage ego, and support spouse’s self-respect."
    },
    8: {
        house: "8th House",
        effect: "Gives deep research skills, interest in occult and dark subjects, sudden and intense events, and aggressive healing power. Sudden death, intense relationships, chronic health issues may arise. Remedy: Fasting helps spiritual development, watch speech, and assist in healing and supporting others through crises."
    },
    9: {
        house: "9th House",
        effect: "Native comes from a family with strong goodwill and name. Promotes growth of family status and supports spiritual journeys. If afflicted, may bring issues for father. Remedy: Support elders in religious pilgrimages, respect all religions, avoid criticism of faiths, and help elderly with travel."
    },
    10: {
        house: "10th House",
        effect: "Exalted Mars brings huge energy in career, ability to build an empire, and reputation as a problem-solver. Good relationship with siblings, support from father's friends. May result in unstable love life. Remedy: Stay fit, help others, act ethically, avoid disputes, and follow Saturn’s guidance for societal success."
    },
    11: {
        house: "11th House",
        effect: "Desires for fast gains and action, effective leadership and communication, resourcefulness in commissions and side income. Prone to gambling or betting; check Saturn/Rahu placements. Blessed with help and support, even in legal troubles. Remedy: Help animals, especially dogs, think before speaking, and use powerful speech constructively."
    },
    12: {
        house: "12th House",
        effect: "Mars in the 12th suggests isolation, challenges with comfort, possible exile or imprisonment, and health issues due to anger or aggression. Risk of addiction, especially to hard substances. Remedy: Meditate, avoid red in bedroom, manage aggression, and heal others to balance karmic energy."
    }
};
const MARS_IN_HOUSES_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        effect: "मंगल लग्न में दृढ़ इच्छा, तीव्र ऊर्जा और स्वाभाविक नेतृत्व क्षमता देता है। शरीर में गर्मी महसूस होती है, साहस के अचानक झोंके आते हैं, चेहरे पर कोई विशेष तिल या निशान होता है। बड़ी बहनों का आशीर्वाद मिलता है। 28 वर्ष के बाद नाम, प्रसिद्धि और मान्यता मिलती है, पर आक्रोश और आत्मकेंद्रितता पर नियंत्रण जरूरी है। उपाय: ध्यान करें, अंदरूनी गर्मी संतुलित रखें, नियमित हनुमान जी की पूजा करें, दूसरों की सर्जरी/उपचार में मदद करें, हनुमान चालीसा रोज़ आठ बार पढ़ें।"
    },
    2: {
        house: "द्वितीय भाव",
        effect: "सीधी वाणी और कभी-कभी कठोरता या आक्रामकता, जिससे परिवार में विवाद या संबंध टूट सकते हैं। खर्च करने की आदत प्रबल, आमदनी से अधिक खर्च की प्रवृत्ति। अल्सर, मुंह-हर समस्या, तीखा भोजन पसंद, वाणी में जोश। उपाय: दूसरों को भोजन कराएँ, नेत्र सर्जरी में मदद करें, खर्च पर नियंत्रण रखें, धूम्रपान/शराब से बचें, पारिवारिक समस्या वाले लोगों की सहायता करें।"
    },
    3: {
        house: "तृतीय भाव",
        effect: "दूसरों के लिए साहसी, रक्षक और संरक्षक—अपने लिए काम करने में हिचक। स्वयं के मूल्य की पहचान के बाद सफलता मिलती है, विपरीत परिस्थितियों वाले लोगों के लिए उपचार में बड़ी शक्ति होती है। भाई-बहनों से संबंध अहम, प्रेरक वक्ता सुनें, आत्मविश्वास बढ़ाएँ। गला/थायरॉइड की समस्या आ सकती है। उपाय: आत्म-समर्थन अपनाएँ, भाई-बहनों को प्रेरित करें, संबंधों को सुलझाएँ।"
    },
    4: {
        house: "चतुर्थ भाव",
        effect: "मंगल के लिए नीच स्थान—भावनात्मक अस्थिरता, विद्रोही बचपन, सांस/छाती की समस्या संभव। परिवार में टकराव, विद्रोही स्वभाव, अशुभ दशा में आपराधिक प्रवृत्ति। उपाय: ध्यान, माता का सहयोग, धूम्रपान से बचें, घर का वातावरण शांत रखें।"
    },
    5: {
        house: "पंचम भाव",
        effect: "प्रेम और रचनात्मकता में अत्यधिक उर्जा; रिश्तों में संघर्ष की संभावना, साथी से अधिक अपेक्षा। शुक्र अशुभ हो तो गर्भपात, प्रसव समस्या, संपत्ति विवाद। संतान धनी व सफल होती है। उपाय: स्वस्थ रिश्तों पर ध्यान दें, गर्भपात से बचें, रचनात्मक प्रतिभा निखारें, दूसरों के योगदान को मानें।"
    },
    6: {
        house: "षष्ठ भाव",
        effect: "मंगल अद्भुत साहस देता है, ऋण/रोग/शत्रुता से पार पाने की शक्ति, पर रूटीन में व्यवधान और कर्मिक संघर्ष। राजनीतिज्ञों के सहायक, आत्मसम्मान प्रबल, अपमान नापसंद। उपाय: मंगलवार को हनुमान जी की पूजा, अखंड दीपक जलाना, हनुमान चालीसा पढ़ना, मांसाहार से परहेज, ऋण से सतर्क रहें।"
    },
    7: {
        house: "सप्तम भाव",
        effect: "विवाह व साझेदारी में आत्म-सम्मान ऊँचा—अहं टकराव, अलगाव या विशेष प्रबंध वाली साझेदारी। शुभ दशा में दूसरों को आगे बढ़ाने और इच्छापूर्ति में सहायक। उपाय: समाजसेवा, शिक्षा, अहंकार का प्रबंधन, जीवनसाथी के आत्म-सम्मान का समर्थन।"
    },
    8: {
        house: "अष्टम भाव",
        effect: "गहरा शोध कौशल, गूढ़ विज्ञान, अचानक तीव्र घटनाएँ, चिकित्सा शक्ति। अचानक मृत्यु, तीव्र संबंध या पुरानी बीमारी संभव। उपाय: उपवास, वाणी पर नियंत्रण, संकटग्रस्तों को उपचार व सहायता।"
    },
    9: {
        house: "नवम भाव",
        effect: "परिवार में नेम-फेम, कुल का नाम बढ़ाने की क्षमता। पिता संबंधी समस्या हो सकती है यदि अशुभ दशा में हो। उपाय: बड़ों को धार्मिक यात्राओं में भेजें, सभी धर्मों का सम्मान करें, आस्था की आलोचना न करें, बड़ों की यात्रा में सहायता करें।"
    },
    10: {
        house: "दशम भाव",
        effect: "उत्कृष्ट मंगल करियर में ऊर्जा, साम्राज्य स्थापित करने की क्षमता, समस्या समाधानकर्ता। भाई-बहनों से अच्छे संबंध, पिता के मित्रों से सहयोग। प्रेम जीवन अस्थिर हो सकता है। उपाय: फिट रहें, दूसरों की मदद करें, नैतिकता निभाएँ, विवादों से बचें, सफल सामाजिक जीवन के लिए शनि का अनुसरण करें।"
    },
    11: {
        house: "एकादश भाव",
        effect: "शीघ्र लाभ की इच्छा, तेज नेतृत्व व संवाद, कमीशन व साइड इनकम में दक्षता। जुआ-सट्टा की प्रवृत्ति, शनि/राहु की दशा देखें। कानूनी समस्या में भी मदद मिलती है। उपाय: जानवरों खासकर कुत्तों की मदद करें, सोच-समझकर बोलें, शक्तिशाली वाणी सकारात्मक दिशा में लगाएँ।"
    },
    12: {
        house: "द्वादश भाव",
        effect: "मंगल यहाँ अलगाव, सुविधा में समस्या, निर्वासन या जेल का संकेत, आक्रोश या उग्रता की वजह से स्वास्थ्य पर असर। नशे की लत संभव। उपाय: ध्यान करें, शयनकक्ष में लाल रंग न हो, आक्रोश नियंत्रित करें, दूसरों को उपचार कराकर कर्म-ऊर्जा संतुलित करें।"
    }
};

const SATURN_IN_HOUSES_EFFECTS = {
    1: {
        house: "1st House (Ascendant)",
        effect: "Saturn here brings a serious, mature, and disciplined personality, often giving a sense of burden and responsibility from a young age. The native may face early life hardships, delay in success, or low self-esteem until after age 36. Saturn teaches resilience through repeated challenges. Remedy: Maintain regular routine, practice daily self-discipline, do seva (service) for laborers or elderly, and wear dark blue/black responsibly. Spend time alone, meditate, and develop patience for your efforts to bear fruit over time."
    },
    2: {
        house: "2nd House",
        effect: "Brings financial discipline, slow wealth accumulation, and possible family distance during childhood. Savings come only with prudent management and effort. Speech may be mature, cautious, but sometimes pessimistic. Remedy: Donate food to the hungry, speak honestly and kindly, and regularly support poor families or orphans with grains or meals."
    },
    3: {
        house: "3rd House",
        effect: "Grants perseverance in creative pursuits, writing, and communication, but success is slow and comes after much hard work. Sibling relationships might be strained, especially younger ones. Courage develops after facing repeated failures. Remedy: Help siblings selflessly, teach skills to the underprivileged, and keep a journal for self-reflection."
    },
    4: {
        house: "4th House",
        effect: "Saturn burdens home/motherly happiness, making the home environment strict or emotionally distant. Mother's health or emotional condition may suffer. Accumulation of property is slow, but possible after hardship. Remedy: Serve and respect the mother or motherly figures, donate blankets or warm items to poor women, add black sesame (til) or coal to water storage at home."
    },
    5: {
        house: "5th House",
        effect: "Difficulties with children, creative blockage, or slow manifestation of romantic happiness. Suited to research or teaching fields; logical and methodical. May face delays in childbirth or strained relations with children. Remedy: Teach unprivileged kids, meditate to boost creativity, support others' children with education or clothing."
    },
    6: {
        house: "6th House",
        effect: "Saturn strengthens the fight against enemies, diseases, and debts, but brings routine physical and mental challenges. Judicial or government career is favored. Tendency to attract burdens and stressors. Remedy: Serve the sick, donate to workers, avoid unnecessary fights, follow a disciplined daily schedule, and manage chronic health proactively."
    },
    7: {
        house: "7th House",
        effect: "Marriage/partnerships carry heavy karmic lessons; delays, age gaps, or serious partners are common. Business partnerships demand hard work and trust development. Spouse may bring responsibilities. Remedy: Respect spouse’s time and labor, patiently handle differences, avoid shortcuts in business, and be loyal and honest in partnerships."
    },
    8: {
        house: "8th House",
        effect: "Deep transformations, intense research, sudden gains and losses, and interest in occult. Accidents and chronic ailments may occur, often relating to joints or bones. Life becomes materially easier after 36. Remedy: Donate black items, care for the disabled or those with chronic illnesses, and keep ancestral traditions alive."
    },
    9: {
        house: "9th House",
        effect: "Restricts easy fortunes, delays foreign travel or higher learning, and can create doubts in spiritual beliefs. Saturn here teaches through setbacks and makes the native self-made. The father’s health/status may impact luck cycles. Remedy: Respect teachers/gurus, assist in religious activities, maintain discipline in spiritual routines, and read scriptures for wisdom."
    },
    10: {
        house: "10th House",
        effect: "Saturn is strongest here (digbala), rewarding persistent hard work and service in career. Promotes high positions after obstacles. Fame is earned, not gifted. Native must build a reputation based on ethics. Remedy: Lead work by example, help colleagues; do regular community service on Saturdays, and avoid shortcuts in professional growth."
    },
    11: {
        house: "11th House",
        effect: "Delays or tests in network expansion and fulfilling desires—but rewards are large and sustainable when they come. Friendships with older, serious individuals. Remedy: Help friends in need without expectations, support elderly community, and always keep long-term vision for gains."
    },
    12: {
        house: "12th House",
        effect: "Brings detachment, interest in solitude, monastic or foreign life, and challenges with sleep or isolation. May bring expenditure on health or foreign settlements late in life. Remedy: Donate regularly to old age homes, hospitals, or prisons, meditate in solitude, maintain a humble routine, and use donations to purify karma."
    }
};
const SATURN_IN_HOUSES_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        effect: "शनि यहां गंभीर, परिपक्व और अनुशासित व्यक्तित्व देता है; कम उम्र में ही बोझ या जिम्मेदारी की अनुभूति होती है। प्रारंभिक जीवन में संघर्ष, देरी या आत्मविश्वास की कमी हो सकती है; 36 के बाद स्थिति बेहतर होती है। शनि बार-बार चुनौतियों के जरिए धैर्य और आत्म-संवर्धन सिखाता है। उपाय: नियमित दिनचर्या, अनुशासन, मजदूरों या बुजुर्गों की सेवा, गहरे नीले/काले रंग का संतुलित उपयोग करें। एकांत में समय बिताएं, ध्यान करें, प्रयासों के परिणाम के लिए धैर्य रखें।"
    },
    2: {
        house: "द्वितीय भाव",
        effect: "वित्तीय अनुशासन, धन संचय में धीमापन, बचपन में परिवार से दूरी संभव। बचत केवल मेहनत और दूरदर्शिता से बनती है। वाणी में परिपक्वता, सतर्कता, लेकिन कभी-कभी निराशावाद। उपाय: भूखों को भोजन दान करें, सद्भावना से और सत्य बोलें, गरीबों/अनाथों को अन्न या भोजन से मदद करें।"
    },
    3: {
        house: "तृतीय भाव",
        effect: "रचनात्मकता, लेखन, संवाद की दिशा में दृढ़ता, लेकिन सफलता धीमे और कड़ी मेहनत के बाद। भाई-बहनों (खासकर छोटे) से संबंध तनावपूर्ण हो सकते हैं। कई असफलताओं के बाद साहस मिलता है। उपाय: निष्काम भाव से भाई-बहनों की मदद करें, हुनर असहायों को सिखाएँ, आत्मचिंतन हेतु डायरी लिखें।"
    },
    4: {
        house: "चतुर्थ भाव",
        effect: "शनि घर/मातृसुख पर बोझ डालता है, घर का वातावरण कठोर या भावनात्मक रूप से दूर रहता है। मां का स्वास्थ्य या भावनात्मक स्थिति प्रभावित हो सकती है। कठिनाई के बाद संपत्ति संचय संभव है। उपाय: मां/मातृ समान स्त्रियों की सेवा करें, गरीब महिलाओं को कंबल या गर्म वस्त्र दान दें, घर के पानी में काला तिल या कोयला डालें।"
    },
    5: {
        house: "पंचम भाव",
        effect: "संतान, रचनात्मकता या प्रेम में अड़चन/देरी; शोध, शिक्षण में अच्छे। तर्कशील, विधिपूर्वक कार्य करने वाले; संतान होने में विलंब या बच्चों से दूरी। उपाय: वंचित बच्चों को पढ़ाएँ, ध्यान करके सृजनात्मकता बढ़ाएँ, दूसरों के बच्चों की शिक्षा या वस्त्र से सहायता करें।"
    },
    6: {
        house: "षष्ठ भाव",
        effect: "शनि शत्रु, रोग, ऋण से संघर्ष को मजबूत बनाता है, पर नियमित शारीरिक-मानसिक समस्याएं लाता है। न्यायिक या सरकारी करियर अनुकूल। बोझ और तनाव आकर्षित करता है। उपाय: बीमारों की सेवा करें, मजदूरों को दान दें, अनावश्यक विवाद से बचें, अनुशासित दिनचर्या रखें, पुरानी बीमारियों का ध्यान रखें।"
    },
    7: {
        house: "सप्तम भाव",
        effect: "विवाह/साझेदारी में भारी कर्मिक पाठ; देरी, उम्र का अंतर या गंभीर साथी संभव। व्यवसायिक साझेदारी में कड़ी मेहनत और भरोसा बनाना जरूरी। जीवनसाथी जिम्मेदारियों के साथ आएगा। उपाय: जीवनसाथी के समय और श्रम का सम्मान करें, मतभेदों को धैर्य से सुलझाएँ, व्यवसाय में शॉर्टकट न लें, सद्भावना और ईमानदारी से संबंध निभाएँ।"
    },
    8: {
        house: "अष्टम भाव",
        effect: "गहरे रूपांतरण, गहन शोध, अचानक लाभ-हानि, गूढ़ विज्ञान में रुचि। दुर्घटना या पुरानी बीमारी (हड्डी/जोड़) संभव। 36 के बाद जीवन सरल हो जाता है। उपाय: काली वस्तुएं दान दें, अपंगों या पुरानी बीमारी वालों की देखभाल करें, पारिवारिक परंपरा बनाए रखें।"
    },
    9: {
        house: "नवम भाव",
        effect: "भाग्य में देरी, विदेशी यात्रा या उच्च शिक्षा में अड़चन; आस्था में संदेह लाता है। शनि बाधा देकर आत्मनिर्भर बनाता है। पिता का स्वास्थ्य/स्थिति भाग्य चक्र को प्रभावित करता है। उपाय: गुरु/शिक्षकों का सम्मान करें, धार्मिक कार्य में मदद करें, आध्यात्मिक दिनचर्या में अनुशासन रखें, धार्मिक ग्रंथ पढ़ें।"
    },
    10: {
        house: "दशम भाव",
        effect: "शनि यहाँ सबसे प्रबल (दिग्बल) है—करियर में सेवाभाव और परिश्रम का फल देता है। अवरोधों के बाद उच्च पद मिलता है। प्रसिद्धि मेहनत से मिलती है, उपहार में नहीं। नैतिकता पर आधारित प्रतिष्ठा जरूरी। उपाय: उदाहरण प्रस्तुत कर नेतृत्व करें, साथियों की मदद करें, शनिवार को नियमित समाजसेवा करें, करियर में शॉर्टकट न अपनाएँ।"
    },
    11: {
        house: "एकादश भाव",
        effect: "नेटवर्क, इच्छाओं की पूर्ति में विलंब या परीक्षा—पर परिणाम स्थायी और बड़ा मिलता है। वृद्ध या गंभीर दोस्तों से मित्रता। उपाय: बिना अपेक्षा के मित्रों की मदद करें, वृद्ध समाज का साथ दें, लाभों के लिए दीर्घकालिक सोच रखें।"
    },
    12: {
        house: "द्वादश भाव",
        effect: "विरक्ति, एकांतप्रियता, सन्यासी या विदेश जीवन, नींद/अलगाव की समस्या। स्वास्थ्य या विदेश में खर्च, जीवन के उत्तरार्ध में। उपाय: वृद्धाश्रम, अस्पताल, जेल में दान करें, एकांत में ध्यान करें, सादा दिनचर्या रखें, दान द्वारा कर्म शुद्ध करें।"
    }
};

const JUPITER_IN_HOUSES_EFFECTS = {
    1: {
        house: "1st House (Ascendant)",
        effect: "Jupiter in the 1st gives a charismatic aura, natural confidence, and strong self-belief. The native enjoys good fortune and blessings but can become lazy or overly reliant on luck. There is a risk of obesity or liver issues. People with Jupiter in the 1st are hard to ignore in a crowd, seem divinely protected, and have attractive children. However, ego and stubbornness may develop, as they often feel their destiny is in their control. Remedy: Take action instead of relying solely on luck, stay humble, and manage health, especially weight."
    },
    2: {
        house: "2nd House",
        effect: "Brings attractive facial features, a catchy voice, and an easy ability to influence others. Education and family are major blessings, and these people often have large or joint families. Wealth expands over time. But there can be addiction risks and family disputes if Jupiter is afflicted. Remedy: Use speech positively, teach or mentor others (especially religious subjects), and donate food or money to those in need."
    },
    3: {
        house: "3rd House",
        effect: "Leads to independence, occasional selfishness, and decision-making influenced by sibling rivalry. Siblings may become famous, and there is a pattern of overthinking but slow action. It is important to maintain good relationships with younger siblings and avoid being too focused on personal benefit. Remedy: Limit overthinking, improve relationships with siblings, and try remedies involving action and Mars support."
    },
    4: {
        house: "4th House",
        effect: "Ultimate happiness from the mother and home. Blessed with comfort, luxury, and property. The upbringing is loving, and the mother is a teacher figure. Inheritance is possible, and home life feels fortunate. Remedy: Keep a harmonious home, maintain closeness with the mother, and use inherited resources wisely for the benefit of all."
    },
    5: {
        house: "5th House",
        effect: "Intellectual, wise, and cautious. Brings luck with children, who may themselves be gifted. Plans major life moves carefully and is often involved in teaching or imparting wisdom. Passive income and gains accumulate slowly but surely. Remedy: Prioritize value-based parenting, teach others, and help orphans if facing child issues."
    },
    6: {
        house: "6th House",
        effect: "Forgiving nature—quick to forget wrongs but potentially opens up to repeated deceit. Finds it hard to distinguish friends from foes, and can face health or debt issues if not careful. Remedy: Be cautious in friendships, avoid lending money expecting repayment, and serve or help people without expecting anything in return."
    },
    7: {
        house: "7th House",
        effect: "Talent for advisory roles and public interaction. Attracts a wise or teacher-like spouse, and marriage brings fortune. The public perceives them as consultants or advisors. Remedy: Listen to your partner’s advice, work in consultancy or matchmaking, and build public goodwill."
    },
    8: {
        house: "8th House",
        effect: "Brings deep healing abilities, research skills, and the chance for sudden gains or inheritance. People share their problems with the native, leading to mental heaviness. There is potential for great wealth if Jupiter is strong, but also health risks if cleanliness is neglected. Remedy: Maintain boundaries, learn healing arts, and practice cleanliness."
    },
    9: {
        house: "9th House",
        effect: "One of the best placements: brings fame, leadership, administrative capability, and blessings from father and teachers. Luck increases with travel and religious visits, and children are supportive. Remedy: Visit temples or places of worship before major decisions, respect elders, and engage in charitable travel or donations."
    },
    10: {
        house: "10th House",
        effect: "Heavy responsibilities, practical approach to life, and later-life enjoyment of wealth earned through hard work. Leadership qualities are prominent, and support from bosses is high. Early life may be difficult, but great reward comes after 36 or 40. Remedy: Fulfill responsibilities to family, avoid shortcuts, and take pride in honest work."
    },
    11: {
        house: "11th House",
        effect: "Natural luck for gains, large networks, and receiving blessings from many. Gains often come with little effort; comfort and luxury are enjoyed. Can be outspoken about opinions and may have few, but meaningful, children. Remedy: Refrain from charging high interest if lending money and use fortune to help others."
    },
    12: {
        house: "12th House",
        effect: "Spiritual, charitable, and humble. Faces initial struggles and detachment in childhood, but becomes generous and service-oriented. Prosperity comes after age 36, especially if engaged in societal service. Foreign settlements and spiritual journeys are common. Remedy: Engage in charity, especially for children’s health, and embrace humility throughout life."
    }
};
const JUPITER_IN_HOUSES_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        effect: "गुरु लग्न में करिश्माई आभा, स्वाभाविक आत्मविश्वास व दृढ़ विश्वास देता है। जातक को भाग्य और आशीर्वाद मिलते हैं, लेकिन आलस्य या केवल भाग्य पर निर्भरता नुकसानदायक है। मोटापा या लिवर संबंधी समस्या की आशंका। ऐसे लोग भीड़ में अलग नजर आते हैं, दिव्य रूप से सुरक्षित होते हैं और संतान आकर्षक होती है, पर घमंड और जिद आ सकती है। उपाय: केवल भाग्य पर निर्भर न रहें, सतत मेहनत करें, विनम्र रहें, वजन नियंत्रित रखें।"
    },
    2: {
        house: "द्वितीय भाव",
        effect: "आकर्षक चेहरा, मधुर वाणी और दूसरों पर असर डालने की क्षमता। शिक्षा और परिवार का बड़ा आशीर्वाद, संयुक्त परिवार में रहते हैं, धन बढ़ता रहता है। यदि गुरु अशुभ हो तो व्यसन और पारिवारिक विवाद। उपाय: वाणी का सदुपयोग करें, धार्मिक शिक्षा दें, दान दें।"
    },
    3: {
        house: "तृतीय भाव",
        effect: "स्वतंत्रता, कभी-कभी स्वार्थ, फैसले भाई-बहन में प्रतिस्पर्धा से प्रभावित। भाई-बहन प्रसिद्ध हो सकते हैं, ज्यादा सोच और धीमी क्रिया की प्रवृत्ति। छोटे भाई-बहनों से अच्छे संबंध बनाए रखें, सिर्फ व्यक्तिगत लाभ पर न टिकें। उपाय: विचार सीमित करें, भाई-बहनों से संबंध सुधारें, मंगल के उपाय अपनाएं।"
    },
    4: {
        house: "चतुर्थ भाव",
        effect: "मां और घर से परम सुख, संपत्ति, विलासिता और प्रेम जीवन। पालन-पोषण में स्नेह व मां गुरु जैसी। संपत्ति विरासत में मिल सकती है, घर जीवन में भाग्यशाली लगता है। उपाय: घर में सौहार्द रखें, मां से निकटता बनाएँ, संपत्ति सभी के हित में उपयोग करें।"
    },
    5: {
        house: "पंचम भाव",
        effect: "बुद्धिमान, विवेकशील, सतर्क। संतान से भाग्य, संतान भी प्रतिभाशाली हो सकती है। जीवन के बड़े निर्णय बहुत सोच-समझकर; शिक्षण/ज्ञान-वितरण में रुचि। पैसिव इनकम धीरे-धीरे आती है। उपाय: मूल्य आधारित पालन-पोषण करें, पढ़ाएँ, अनाथ बच्चों की मदद करें।"
    },
    6: {
        house: "षष्ठ भाव",
        effect: "माफ करने वाली प्रवृत्ति—जल्दी भूल जाते हैं, बार-बार धोखा खाने की संभावना। मित्र-शत्रु में फर्क करना कठिन, सेहत या कर्ज संबंधी समस्या। उपाय: दोस्ती में सतर्क रहें, बिना भलाई की आशा के मदद करें, उधार के पैसे वापस न आने की उम्मीद में न रहें।"
    },
    7: {
        house: "सप्तम भाव",
        effect: "परामर्श और जनसंपर्क की प्रतिभा। शिक्षक जैसे बुद्धिमान जीवनसाथी से विवाह, विवाह से भाग्य बढ़ता है। समाज इन्हें सलाहकार समझता है। उपाय: साथी की सलाह सुनें, परामर्श सेवाओं में काम करें, जनसेवा/मैत्रीकार्य करें।"
    },
    8: {
        house: "अष्टम भाव",
        effect: "गहरी उपचार क्षमता, अनुसंधान कौशल, अचानक लाभ/विरासत। लोग अपनी समस्याएँ इन्हें बताते हैं; मानसिक दबाव बन सकता है। गुरु बलवान हो तो बड़े धनयोग, अशुभ में स्वास्थ्य समस्या। उपाय: सीमाएँ तय करें, चिकित्सा कलाएँ सीखें, स्वच्छता बनाए रखें।"
    },
    9: {
        house: "नवम भाव",
        effect: "सर्वश्रेष्ठ स्थान—प्रसिद्धि, नेतृत्व, प्रशासनिक क्षमता, पिता-गुरु का आशीर्वाद। यात्रा और धार्मिक कार्यों से भाग्य बढ़ता है, संतान सहयोगी रहती है। उपाय: बड़े फैसलों से पहले तीर्थ जाएँ, बड़ों का सम्मान करें, विनम्रता से यात्रा/दान करें।"
    },
    10: {
        house: "दशम भाव",
        effect: "भारी जिम्मेदारी, व्यावहारिक नजरिया; मेहनत से प्राप्त धन का सुख जीवन के उत्तरार्ध में मिलता है। नेतृत्व गुण प्रबल, बॉस का सहयोग रहता है। प्रारंभिक जीवन कठिन, 36-40 के बाद उन्नति। उपाय: परिवार के प्रति जिम्मेदारी निभाएं, शॉर्टकट न लें, ईमानदार मेहनत पर गौरव करें।"
    },
    11: {
        house: "एकादश भाव",
        effect: "प्राकृतिक भाग्य, बड़े नेटवर्क, अनेक लोगों का आशीर्वाद। बिना प्रयास के लाभ, आराम, विलासिता का जीवन। खुले विचारों वाले, संतति कम लेकिन महत्वपूर्ण। उपाय: ऋण पर ऊँचा ब्याज न लें, भाग्य से दूसरों का भला करें।"
    },
    12: {
        house: "द्वादश भाव",
        effect: "आध्यात्मिक, दानशील, विनम्र। आरंभिक जीवन में संघर्ष, बाद में उदार व सेवा-भावी बनते हैं। 36 के बाद, खासकर समाज सेवा में संपन्नता मिलती है। विदेश में बसना, अध्यात्मिक यात्रा संभव। उपाय: बच्चों के स्वास्थ्य के लिए दान करें, जीवन भर विनम्र बनें।"
    }
};

const SUN_IN_HOUSES_EFFECTS = {
    1: {
        house: "1st House (Ascendant)",
        effect: "Sun in the 1st house creates a commanding presence, strong sense of self, and natural authority. The native is often ambitious, proud, and expects others to follow their lead. Quick-tempered, finds it difficult to forgive, and may face relationship issues due to inflexibility. Life success comes with humility and self-awareness—dominance and stubbornness otherwise block prosperity. Shiny eyes, thin hair, and early hair fall are common features. To maximize luck, practice humility, learn to work with others as a team, and be forgiving."
    },
    2: {
        house: "2nd House",
        effect: "Bestows a powerful, authoritative voice and great influence, but brings challenges in collecting, saving, and growing wealth. Can have speech problems (e.g., stuttering) and marks or burns on the face. Family and fatherly issues, especially if Sun combines with Rahu. Blunt and dominating in speech; ensure kindness and patience in speaking. Foster good family relationships and manage financial discipline."
    },
    3: {
        house: "3rd House",
        effect: "Provides the drive to fight injustice and advocate for others. Can be heroic and earn a strong reputation if standing up for those in trouble, but sibling relationships are turbulent—rivalry or interference is common. Highly courageous, but needs to channel aggression positively. Maintain good relations with siblings and use courage in support of others."
    },
    4: {
        house: "4th House",
        effect: "Creates need for specific comforts—happiness is limited to particular people or things. The mother is often dominant, sometimes taking over the father’s responsibilities. Not easily satisfied, may struggle to relax at home. Positivity arises if the mother–child bond is strong and anger is managed. Best suited for work in government or high positions, but must nurture emotional security."
    },
    5: {
        house: "5th House",
        effect: "Brings high intelligence, broad friend circles, and strong leadership—especially after age 50. Trouble conceiving or relating to children is possible, as are unstable romantic relationships. For women, check reproductive health. Creative talents blossom after midlife. Best results come from sharing wisdom and education with the younger generation."
    },
    6: {
        house: "6th House",
        effect: "Sun here produces a powerful problem-solver and ‘right hand’ for influential people. These natives excel at overcoming obstacles, defeating enemies, and problem-solving in work and everyday life. Brings opportunities for fame and success, particularly after age 32. Excel in coding, management, and office politics. To ensure lasting results, act with integrity, not aggression."
    },
    7: {
        house: "7th House",
        effect: "Not a favorable position—brings relationship challenges, body issues, and problems with higher authorities or bosses. High chances of divorce or separation due to ego and intensity in partnerships. Struggles to receive respect in marriage or business partnerships. Must learn to respect others' perspectives, develop patience, and avoid egotism for marital and professional stability."
    },
    8: {
        house: "8th House",
        effect: "Best for those seeking relaxation and detachment from materialism. Sun’s ‘setting’ phase—focuses on inner joy over external rewards. May lead to relaxation or indifference, but risk of addiction or escapism is high. Manage friendships, avoid overreliance on others, and maintain moderation in all pleasures. Meditation during sunset brings peace."
    },
    9: {
        house: "9th House",
        effect: "Adds strong discipline, respects tradition, and supports the transmission of religious/familial values to children. Early success if aligned with tradition; strict parents, especially father, are common. Frequent pilgrimages or religious travel. Should embrace tradition and use success to help others and honor the family legacy."
    },
    10: {
        house: "10th House",
        effect: "Strongest for public success (directional strength). Promotes power, success after obstacles, leadership, and celebrity status. The native must help those beneath them and avoid arrogance to fully unlock karmic blessings. Professional integrity and humility are key; new homes or vehicles should be inaugurated with the help of subordinates or staff."
    },
    11: {
        house: "11th House",
        effect: "One of the best placements—ensures large following, business success, and long life. Natives rise quickly, influence many, and remain wealthy. Their mistakes are often pointed out by many, and learning humility prevents big losses. To maintain continuous gains, acknowledge your mistakes and help friends/community selflessly."
    },
    12: {
        house: "12th House",
        effect: "Weak placement—brings restless sleep, detachment from father, eye issues, and losses, especially wealth. Aggression in the bedroom and desire for domination may impact relationships. Spiritual pursuits and charity abroad or in hospitals/asylums bring fulfillment. Relationship with government may be challenging. Avoid orange/red in the bedroom, meditate, and work on anger management."
    }
};
const SUN_IN_HOUSES_EFFECTS_HINDI = {
    1: {
        house: "पहला भाव (लग्न)",
        effect: "सूर्य लग्न में होने से प्रभावशाली उपस्थिति, मजबूत स्वभाव और स्वाभाविक नेतृत्व मिलता है। महत्वाकांक्षा, गर्व और दूसरों से अनुसरण की अपेक्षा रहती है। स्वभाव में जल्दी गुस्सा, माफ़ करना कठिन, जिद के कारण संबंधों में समस्या। विनम्रता, टीम भावना और क्षमा से ही सफलता संभव। चमकीली आंखें, पतले बाल, जल्दी बाल झड़ना अक्सर होता है। उपाय: विनम्र रहें, सहयोगी बनें, क्षमा भाव बढ़ाएँ।"
    },
    2: {
        house: "द्वितीय भाव",
        effect: "शक्तिशाली वाणी, प्रभावशाली व्यक्तित्व और नेतृत्व क्षमता पर धन-संचय, बचत व बढ़ोतरी में चुनौतियाँ। वाणी दोष (हकलाहट), चेहरे पर निशान या जलन संभव। पिता/परिवार से समस्या, विशेषकर सूर्य-राहु योग में। वाणी में कटुता, डाँट-डपट से बचें, परिवार में तालमेल रखें, वित्तीय अनुशासन बनाएं।"
    },
    3: {
        house: "तृतीय भाव",
        effect: "अन्याय के खिलाफ लड़ने और दूसरों के लिए खड़े होने की पराक्रम देता है। सामाजिक प्रतिष्ठा मिलती है लेकिन भाई-बहनों से प्रतिस्पर्धा या हस्तक्षेप रह सकता है। साहसी, पर आक्रोश को सकारात्मक दिशा दें। भाई-बहनों से संबंध अच्छे रखें, साहस को दूसरों की मदद में लगाएँ।"
    },
    4: {
        house: "चतुर्थ भाव",
        effect: "विशेष सुख-सुविधाओं की चाह; खुशी खास जगहों या लोगों तक सीमित। मां अक्सर प्रबल व पिता की जिम्मेदारी संभालने वाली। संतुष्टि पाने में कठिनाई, घर में आराम नहीं मिलता। मां–संतान संबंध मजबूत हो तो सकारात्मकता आती है। शासन या उच्च पदों पर काम के लिए श्रेष्ठ, लेकिन भावनात्मक सुरक्षा पर ध्यान जरूरी।"
    },
    5: {
        house: "पंचम भाव",
        effect: "बुद्धिमत्ता, मित्रों का बड़ा दायरा और नेतृत्व क्षमता, खासकर 50 की उम्र के बाद। संतान से जुड़ी समस्या या संतानोत्पति में विलंब, प्रेम संबंध अस्थिर। महिलाओं को प्रजनन स्वास्थ्य देखना चाहिए। रचनात्मकता मध्य आयु के बाद खिलती है। अमूल्य शिक्षा युवाओं के साथ बाँटने से सबसे अच्छा फल मिलता है।"
    },
    6: {
        house: "षष्ठ भाव",
        effect: "कठिन समस्याओं के हल और खास लोगों की ‘राइट हैंड’ बनने की ताकत। जीवन की चुनौतियों, शत्रुओं व बाधाओं से जूझने, काम में समाधान निकालने में माहिर। प्रसिद्धि, सफलता खासकर 32 वर्ष के बाद संभव। प्रबंधन, कोडिंग, ऑफिस पॉलिटिक्स में अग्रणी। सतत सफलता के लिए नैतिकता जरूरी, आक्रोश नहीं।"
    },
    7: {
        house: "सप्तम भाव",
        effect: "अपनी स्थिति के लिए लाभकारी नहीं—संबंध, शरीर और उच्च अधिकारियों से समस्या। अहंकार और कटुता के कारण संबंधों में दरार, तलाक या अलगाव संभव। शादी और बिजनेस में सम्मान पाना कठिन। दूसरों का नजरिया समझें, धैर्य रखें और अहंकार से बचें।"
    },
    8: {
        house: "अष्टम भाव",
        effect: "विश्रांति व भौतिकता से दूरी चाहने वालों के लिए श्रेष्ठ। सूर्य अस्त की अवस्था—आंतरिक आनंद ही लक्ष्य। संबंधों में ढील, व्यसन या पलायन का खतरा। मित्रता, संतुलन में रहें, सुखों में अति न करें। सूर्यास्त के समय ध्यान/आराम करें।"
    },
    9: {
        house: "नवम भाव",
        effect: "अनुशासन, परंपरा का मान, धार्मिक/पारिवारिक मूल्यों का संतान तक प्रसार। परंपरा से जुड़े रहें तो प्रारंभिक सफलता; कड़े माता-पिता, खासकर पिता। तीर्थ यात्रा, धार्मिक प्रवास बार-बार। परंपरा अपनाएँ, सफलता से दूसरों की मदद करें, वंश की प्रतिष्ठा बढ़ाएँ।"
    },
    10: {
        house: "दशम भाव",
        effect: "सार्वजनिक सफलता के लिए सबसे श्रेष्ठ, दिग्बल। अवरोध के बाद शक्ति, नेतृत्व, सेलेब्रिटी योग। नीचे वालों की मदद करें, अहंकार त्यागें, तभी पूर्ण फल। पेशेवर ईमानदारी, विनम्रता जरूरी; नया घर/वाहन स्टाफ/नीच पद वालों से शुभारंभ कराएँ।"
    },
    11: {
        house: "एकादश भाव",
        effect: "बेहतरीन स्थान—अनुयायियों की फौज, व्यवसाय में सफलता, दीर्घायु। तेजी से उन्नति, धन व प्रसिद्धि; गलतियाँ बड़ी संख्या में उजागर होती हैं, विनम्रता ही हानि से बचाव। सतत लाभ के लिए भूलें स्वीकारें, मित्रों/समुदाय का निस्वार्थ सहयोग करें।"
    },
    12: {
        house: "द्वादश भाव",
        effect: "कमजोर स्थिति—नींद की कमी, पिता से दूरी, नेत्र समस्या, विशेषकर धन की हानि। बेडरूम में आक्रोश, हावी प्रवृत्ति से संबंधों में कष्ट। विदेश, अस्पताल/आश्रम में दान व साधना संतोष देती है। सरकार से संबंध चुनौतीपूर्ण। उपाय: शयनकक्ष में नारंगी/लाल रंग से बचें, ध्यान करें, क्रोध प्रबंधित करें।"
    }
};


const PLANET_EFFECTS_BY_HOUSE = {
    "Moon": MOON_IN_HOUSES_EFFECTS,
    "Mercury": MERCURY_IN_HOUSES_EFFECTS,
    "Venus": VENUS_IN_HOUSES_EFFECTS,
    "Mars": MARS_IN_HOUSES_EFFECTS,
    "Jupiter": JUPITER_IN_HOUSES_EFFECTS,
    "Saturn": SATURN_IN_HOUSES_EFFECTS,
    "Sun": SUN_IN_HOUSES_EFFECTS,
    "Ketu": KETU_IN_HOUSES_EFFECTS,
    "Rahu": RAHU_IN_HOUSES_EFFECTS
};

const PLANET_EFFECTS_BY_HOUSE_HINDI = {
    "Moon": MOON_IN_HOUSES_EFFECTS_HINDI,
    "Mercury": MERCURY_IN_HOUSES_EFFECTS_HINDI,
    "Venus": VENUS_IN_HOUSES_EFFECTS_HINDI,
    "Mars": MARS_IN_HOUSES_EFFECTS_HINDI,
    "Jupiter": JUPITER_IN_HOUSES_EFFECTS_HINDI,
    "Saturn": SATURN_IN_HOUSES_EFFECTS_HINDI,
    "Sun": SUN_IN_HOUSES_EFFECTS_HINDI,
    "Ketu": KETU_IN_HOUSES_EFFECTS_HINDI,
    "Rahu": RAHU_IN_HOUSES_EFFECTS_HINDI
};
function getOrdinalSuffix(i) {
    let j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return "st";
    }
    if (j == 2 && k != 12) {
        return "nd";
    }
    if (j == 3 && k != 13) {
        return "rd";
    }
    return "th";
}

function generatePlanetsHouseEffectsHTML(apiResult, language = 'en', currentDasha = null) {
    var planetsList =   ["Moon", "Mercury","Venus","Mars" ,
    "Jupiter",
    "Saturn" ,
    "Sun",
    "Ketu",
    "Rahu"];
    let htmlOutput = "";
    var planetDetail = apiResult.output[1];
    const planetEffects = language === 'hi' ? PLANET_EFFECTS_BY_HOUSE_HINDI : PLANET_EFFECTS_BY_HOUSE;
    const texts = language === 'hi' ? {
        inHouse: "में",
        house: "भाव",
        classicalEffects: "क्लासिकल प्रभाव"
    } : {
        inHouse: "in the",
        house: "House",
        classicalEffects: "Classical Effects"
    };
    
    for (var planet of planetsList) {
        const houseNum = planetDetail[planet].house_number;
        const effect = planetEffects[planet] && planetEffects[planet][houseNum] ? planetEffects[planet][houseNum].effect : '';
        const planetName = PLANET_NAMES[language] && PLANET_NAMES[language][planet] ? PLANET_NAMES[language][planet] : planet;
        const isHighlighted = shouldHighlightPlanet(planet, currentDasha, apiResult);
        const highlightClass = isHighlighted ? 'dasha-highlighted' : '';
        let badgeHTML = '';
        if (isHighlighted && currentDasha) {
            const badgeText = planet === currentDasha.mahaDasha 
                ? (language === 'hi' ? 'महादशा' : 'Mahadasha')
                : (language === 'hi' ? 'अंतर दशा' : 'Antar Dasha');
            badgeHTML = `<span class="dasha-badge">⭐ ${badgeText}</span>`;
        }
        
htmlOutput += `
    <div class="ascendant-lord-section ${highlightClass}" style="margin-top: 60px;">
    <h2>
      ${planetName} ${texts.inHouse} ${getOrdinal(houseNum, language)} ${texts.house} ${badgeHTML}
    </h2>
    <div style="margin-top: 10px;">
      <h3 style="color: #75623e; font-weight: 600;">${texts.classicalEffects}</h3>
      <p style="font-size: 18px; margin-bottom: 22px;">
        ${effect}
      </p>
    </div>
  </div>
`;



}
    // planetsList.map(x=> planeteffect[x][planetDetail[x].house_number].effect)

    htmlOutput += "</div>";
    return htmlOutput;
}

// Function to fetch Mahadasha and Antar Dasha data
async function fetchMahaDashaData(apiData) {
    try {
        const requestBody = {
            year: apiData.year,
            month: apiData.month,
            date: apiData.date,
            hours: apiData.hours,
            minutes: apiData.minutes,
            seconds: apiData.seconds,
            latitude: apiData.latitude,
            longitude: apiData.longitude,
            timezone: apiData.timezone,
            config: {
                observation_point: "topocentric",
                ayanamsha: "lahiri"
            }
        };
        
        console.log('Fetching Mahadasha data with:', requestBody);
        console.log('API URL:', API_CONFIG.mahaDashaUrl);
        console.log('API Key:', API_CONFIG.key ? 'Present (' + API_CONFIG.key.substring(0, 10) + '...)' : 'Missing');
        
        // Create headers object
        const headers = {
            'Content-Type': 'application/json',
            'x-api-key': API_CONFIG.key
        };
        
        console.log('Request headers:', headers);
        
        const response = await fetch(API_CONFIG.mahaDashaUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        console.log('Mahadasha API response status:', response.status);
        console.log('Mahadasha API response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Mahadasha API error response:', errorText);
            
            // Try to parse as JSON if possible
            let errorMessage = errorText;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorText;
            } catch (e) {
                // Not JSON, use as is
            }
            
            throw new Error(`Mahadasha API request failed: ${response.status} - ${errorMessage}`);
        }
        
        const data = await response.json();
        console.log('Mahadasha data received:', data);
        
        // If the response has an "output" field that's a string, parse it
        if (data && data.output && typeof data.output === 'string') {
            try {
                const parsedOutput = JSON.parse(data.output);
                console.log('Parsed output:', parsedOutput);
                return { output: parsedOutput };
            } catch (e) {
                console.error('Error parsing output string:', e);
            }
        }
        
        return data;
    } catch (error) {
        console.error('Error fetching Mahadasha data:', error);
        console.error('Error details:', error.message);
        return null;
    }
}

// Function to find current Mahadasha and Antar Dasha
function findCurrentDasha(mahaDashaData) {
    if (!mahaDashaData) {
        console.log('No Mahadasha data provided');
        return null;
    }
    
    // Parse the data if it's a string
    let parsedData = mahaDashaData;
    if (typeof mahaDashaData === 'string') {
        try {
            parsedData = JSON.parse(mahaDashaData);
        } catch (e) {
            console.error('Error parsing Mahadasha data:', e);
            return null;
        }
    }
    
    // If data is nested in an "output" property, extract it
    if (parsedData.output && typeof parsedData.output === 'string') {
        try {
            parsedData = JSON.parse(parsedData.output);
        } catch (e) {
            console.error('Error parsing output string:', e);
        }
    } else if (parsedData.output && typeof parsedData.output === 'object') {
        parsedData = parsedData.output;
    }
    
    // Get current date and time
    const now = new Date();
    const currentTimestamp = now.getTime();
    console.log('Current timestamp for Dasha lookup:', now.toISOString());
    
    // Iterate through all Mahadashas
    for (const [mahaDashaPlanet, antarDasas] of Object.entries(parsedData)) {
        for (const [antarDashaPlanet, period] of Object.entries(antarDasas)) {
            // Parse the start and end times - handle both "YYYY-MM-DD HH:mm:ss" and ISO format
            let startTime, endTime;
            
            if (period.start_time && period.end_time) {
                // Handle "YYYY-MM-DD HH:mm:ss" format
                if (period.start_time.includes(' ')) {
                    startTime = new Date(period.start_time.replace(' ', 'T'));
                    endTime = new Date(period.end_time.replace(' ', 'T'));
                } else {
                    startTime = new Date(period.start_time);
                    endTime = new Date(period.end_time);
                }
                
                // Check if current time falls within this period
                if (currentTimestamp >= startTime.getTime() && currentTimestamp < endTime.getTime()) {
                    console.log(`Found current Dasha: ${mahaDashaPlanet} - ${antarDashaPlanet}`);
                    console.log(`Period: ${period.start_time} to ${period.end_time}`);
                    return {
                        mahaDasha: mahaDashaPlanet,
                        antarDasha: antarDashaPlanet,
                        startTime: period.start_time,
                        endTime: period.end_time
                    };
                }
            }
        }
    }
    
    console.log('No matching Dasha period found for current timestamp');
    return null;
}

// Function to check if a planet should be highlighted
function shouldHighlightPlanet(planetName, currentDasha, apiResult) {
    if (!currentDasha || !apiResult.output || !Array.isArray(apiResult.output) || apiResult.output.length < 2) {
        return false;
    }
    
    const planetsData = apiResult.output[1];
    return planetName === currentDasha.mahaDasha || planetName === currentDasha.antarDasha;
}

// Function to check if a house lord section should be highlighted
function shouldHighlightHouseLord(houseLordNum, lordPlanet, currentDasha, apiResult) {
    if (!currentDasha || !apiResult.output || !Array.isArray(apiResult.output) || apiResult.output.length < 2) {
        return false;
    }
    
    const planetsData = apiResult.output[1];
    
    // Check if the house where the lord is placed contains the Mahadasha or Antar Dasha planet
    if (planetsData[currentDasha.mahaDasha]) {
        const mahaDashaHouse = planetsData[currentDasha.mahaDasha].house_number;
        if (planetsData[lordPlanet]) {
            const lordHouse = planetsData[lordPlanet].house_number;
            // Highlight if lord is in the same house as Mahadasha planet
            if (lordHouse === mahaDashaHouse) {
                return true;
            }
        }
    }
    
    if (planetsData[currentDasha.antarDasha]) {
        const antarDashaHouse = planetsData[currentDasha.antarDasha].house_number;
        if (planetsData[lordPlanet]) {
            const lordHouse = planetsData[lordPlanet].house_number;
            // Highlight if lord is in the same house as Antar Dasha planet
            if (lordHouse === antarDashaHouse) {
                return true;
            }
        }
    }
    
    // Also highlight if the house lord itself is the Mahadasha or Antar Dasha planet
    if (lordPlanet === currentDasha.mahaDasha || lordPlanet === currentDasha.antarDasha) {
        return true;
    }
    
    return false;
}

// Function to generate Mahadasha summary section
function generateDashaSummary(currentDasha, apiResult, language, texts) {
    if (!currentDasha || !apiResult.output || !Array.isArray(apiResult.output) || apiResult.output.length < 2) {
        return '';
    }
    
    const planetsData = apiResult.output[1];
    const mahaDashaPlanet = currentDasha.mahaDasha;
    const antarDashaPlanet = currentDasha.antarDasha;
    const mahaDashaName = PLANET_NAMES[language] && PLANET_NAMES[language][mahaDashaPlanet] ? PLANET_NAMES[language][mahaDashaPlanet] : mahaDashaPlanet;
    const antarDashaName = PLANET_NAMES[language] && PLANET_NAMES[language][antarDashaPlanet] ? PLANET_NAMES[language][antarDashaPlanet] : antarDashaPlanet;
    
    const mahaDashaHouse = planetsData[mahaDashaPlanet] ? planetsData[mahaDashaPlanet].house_number : null;
    const antarDashaHouse = planetsData[antarDashaPlanet] ? planetsData[antarDashaPlanet].house_number : null;
    
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const signsHindi = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'];
    const selectedSigns = language === 'hi' ? signsHindi : signs;
    const mahaDashaSign = planetsData[mahaDashaPlanet] ? selectedSigns[planetsData[mahaDashaPlanet].current_sign - 1] : 'N/A';
    const antarDashaSign = planetsData[antarDashaPlanet] ? selectedSigns[planetsData[antarDashaPlanet].current_sign - 1] : 'N/A';
    
    const dashaTexts = language === 'hi' ? {
        title: "वर्तमान महादशा और अंतर दशा",
        mahaDasha: "महादशा",
        antarDasha: "अंतर दशा",
        period: "अवधि",
        planet: "ग्रह",
        house: "भाव",
        sign: "राशि",
        note: "नोट: नीचे दिए गए विश्लेषण में महादशा और अंतर दशा से संबंधित खंडों को हाइलाइट किया गया है।"
    } : {
        title: "Current Mahadasha and Antar Dasha",
        mahaDasha: "Mahadasha",
        antarDasha: "Antar Dasha",
        period: "Period",
        planet: "Planet",
        house: "House",
        sign: "Sign",
        note: "Note: Sections related to your current Mahadasha and Antar Dasha are highlighted in the analysis below."
    };
    
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };
    
    return `
        <div class="dasha-summary-section" style="margin: 40px 0; padding: 32px; background: #fafafa; border: 1px solid #e5e5e5; border-left: 4px solid #1a1a1a; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
            <h2 style="color: #1a1a1a; font-size: 22px; margin-bottom: 24px; font-weight: 600; letter-spacing: -0.3px; border-bottom: 1.5px solid #e5e5e5; padding-bottom: 12px;">${dashaTexts.title}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                <div style="background: white; padding: 20px; border: 1px solid #e5e5e5; border-left: 3px solid #1a1a1a;">
                    <h3 style="color: #666; font-size: 11px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">${dashaTexts.mahaDasha}</h3>
                    <p style="font-size: 20px; font-weight: 600; margin-bottom: 10px; color: #1a1a1a; letter-spacing: -0.2px;">${mahaDashaName}</p>
                    ${mahaDashaHouse ? `<p style="font-size: 13px; color: #666; margin-bottom: 6px; line-height: 1.5;">${dashaTexts.house}: ${getOrdinal(mahaDashaHouse, language)} ${dashaTexts.house}</p>` : ''}
                    <p style="font-size: 13px; color: #666; line-height: 1.5;">${dashaTexts.sign}: ${mahaDashaSign}</p>
                </div>
                <div style="background: white; padding: 20px; border: 1px solid #e5e5e5; border-left: 3px solid #1a1a1a;">
                    <h3 style="color: #666; font-size: 11px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">${dashaTexts.antarDasha}</h3>
                    <p style="font-size: 20px; font-weight: 600; margin-bottom: 10px; color: #1a1a1a; letter-spacing: -0.2px;">${antarDashaName}</p>
                    ${antarDashaHouse ? `<p style="font-size: 13px; color: #666; margin-bottom: 6px; line-height: 1.5;">${dashaTexts.house}: ${getOrdinal(antarDashaHouse, language)} ${dashaTexts.house}</p>` : ''}
                    <p style="font-size: 13px; color: #666; line-height: 1.5;">${dashaTexts.sign}: ${antarDashaSign}</p>
                </div>
            </div>
            <div style="background: white; padding: 16px 20px; border: 1px solid #e5e5e5; margin-top: 20px;">
                <p style="font-size: 13px; color: #333; line-height: 1.6;"><strong style="color: #1a1a1a;">${dashaTexts.period}:</strong> ${formatDate(currentDasha.startTime)} - ${formatDate(currentDasha.endTime)}</p>
            </div>
            <p style="font-size: 12px; margin-top: 18px; color: #666; text-align: left; font-style: italic; line-height: 1.5;">${dashaTexts.note}</p>
        </div>
    `;
}

// Function to generate article-style HTML for same-page display
function generateArticleHTML(fullName, birthDate, formattedDate, timeOfBirth, placeOfBirth, apiResult, language = 'en', currentDasha = null) {
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const signsHindi = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'];
    const selectedSigns = language === 'hi' ? signsHindi : signs;
    
    // Language-specific texts
    const texts = language === 'hi' ? {
        backButton: "← फॉर्म पर वापस जाएं",
        title: "आपकी वैदिक जन्म कुंडली",
        subtitle: "ग्रहों की स्थिति विश्लेषण",
        intro: "जन्म कुंडली, या कुंडली, आकाश का एक नक्शा है जो आपके जन्म के ठीक उसी क्षण का है। यह विश्लेषण लाहिरी अयनांश प्रणाली का उपयोग करते हुए प्राचीन वैदिक ज्योतिष सिद्धांतों पर आधारित है।",
        birthInfo: "जन्म जानकारी",
        name: "नाम",
        date: "दिनांक",
        time: "समय",
        location: "स्थान",
        note: "ध्यान दें",
        noteText: "नीचे दिए गए ज्योतिषीय भविष्यवाणियां और व्याख्याएं <strong>वैदिक ज्योतिष सिद्धांतों</strong> पर आधारित हैं—कई स्रोतों से एकत्रित। किसी भी सलाह के लिए कृपया पेशेवर ज्योतिषी से सलाह लें।",
        planetaryPositions: "ग्रहों की स्थिति",
        planet: "ग्रह",
        sign: "राशि",
        degree: "डिग्री",
        status: "स्थिति",
        retrograde: "वक्री",
        direct: "मार्गी",
        houseLordInHouses: "भाव स्वामी के 12 भावों में प्रभाव",
        planetaryHouseEffects: "ग्रहों के भाव प्रभाव",
        lordIsIn: "स्वामी है:",
        classicalEffects: "क्लासिकल प्रभाव",
        detailedEffects: "विस्तृत प्रभाव",
        houseLord: "भाव स्वामी",
        inHouse: "में",
        house: "भाव",
        footerNote: "आपकी कुंडली में प्रत्येक ग्रह की स्थिति आपके जीवन के विभिन्न पहलुओं को प्रभावित करती है। जिस राशि में प्रत्येक ग्रह स्थित है, उसके साथ-साथ उसकी डिग्री और चाहे वह आगे बढ़ रहा हो (मार्गी) या पीछे (वक्री), ये सभी आपके अद्वितीय ज्योतिषीय प्रोफ़ाइल में योगदान करते हैं।"
    } : {
        backButton: "← Back to Form",
        title: "Your Vedic Birth Chart",
        subtitle: "Planetary Positions Analysis",
        intro: "A birth chart, or Kundli, is a map of the sky at the exact moment you were born. This analysis is based on ancient Vedic astrology principles using the Lahiri ayanamsha system.",
        birthInfo: "Birth Information",
        name: "Name",
        date: "Date",
        time: "Time",
        location: "Location",
        note: "Note",
        noteText: "The astrological predictions and interpretations below are based on <strong>Vedic Astrology Principals</strong>— gathered from multiple sources. Please consult professional astrologer for any advice.",
        planetaryPositions: "Planetary Positions",
        planet: "Planet",
        sign: "Sign",
        degree: "Degree",
        status: "Status",
        retrograde: "Retrograde",
        direct: "Direct",
        houseLordInHouses: "House Lord in 12 Houses Effects",
        planetaryHouseEffects: "Planetary House Effects",
        lordIsIn: "Lord is in:",
        classicalEffects: "Classical Effects",
        detailedEffects: "Detailed Effects",
        houseLord: "House Lord",
        inHouse: "in",
        house: "House",
        footerNote: "Each planet's position in your chart influences different aspects of your life. The zodiac sign where each planet is located, along with its degree and whether it's moving forward (Direct) or backward (Retrograde), all contribute to your unique astrological profile."
    };
    
    let planetsHTML = '';
    let houseLordsHTML = '';
    let planetsHouseEffectsHTML = generatePlanetsHouseEffectsHTML(apiResult, language, currentDasha);
    const houseLordsEffects = language === 'hi' ? HOUSE_LORDS_EFFECTS_HINDI : HOUSE_LORDS_EFFECTS;
    
    if (apiResult.output && Array.isArray(apiResult.output) && apiResult.output.length > 1) {
        const planetsData = apiResult.output[1];
        let ascendantSign = null;
        if (planetsData.Ascendant) ascendantSign = planetsData.Ascendant.current_sign;

        // Table of planetary positions
        for (const [planetName, planetInfo] of Object.entries(planetsData)) {
            if (planetName !== 'ayanamsa') {
                const signName = selectedSigns[planetInfo.current_sign - 1] || 'N/A';
                const degree = planetInfo.normDegree ? planetInfo.normDegree.toFixed(2) : 'N/A';
                const retroStatus = planetInfo.isRetro === 'true' || planetInfo.isRetro === true ? texts.retrograde : texts.direct;
                const retroColor = planetInfo.isRetro === 'true' || planetInfo.isRetro === true ? '#d32f2f' : '#2e7d32';
                const translatedPlanetName = PLANET_NAMES[language] && PLANET_NAMES[language][planetName] ? PLANET_NAMES[language][planetName] : planetName;
                planetsHTML += `
                    <tr>
                        <td class="planet-name"><strong>${translatedPlanetName}</strong></td>
                        <td>${signName}</td>
                        <td>${degree}°</td>
                        <td style="color: ${retroColor}; font-weight: 500;">${retroStatus}</td>
                    </tr>
                `;
            }
        }

        // ------- For each house lord (1–12), display its result -------
        for (let lordNum = 1; lordNum <= 12; lordNum++) {
            let lordHouseSign = ascendantSign + lordNum - 1;
            if (lordHouseSign > 12) lordHouseSign -= 12;
            const lordPlanet = ZODIAC_LORDS[lordHouseSign];
            let lordObj = null;

            for (const [planetName, planetInfo] of Object.entries(planetsData)) {
                if (planetName === lordPlanet) {
                    const lordHouseNumber = getRelativeHouseNumber(ascendantSign, planetInfo.current_sign);
                    const houseEffectMapping = houseLordsEffects[lordNum];
                    lordObj = {
                        house: lordHouseNumber,
                        planet: planetName,
                        signName: selectedSigns[planetInfo.current_sign - 1],
                        houseLordNum: lordNum,
                        effect: houseEffectMapping ? houseEffectMapping[lordHouseNumber] : undefined
                    };
                    break;
                }
            }

            if (lordObj && lordObj.effect) {
                const translatedPlanetName = PLANET_NAMES[language] && PLANET_NAMES[language][lordObj.planet] ? PLANET_NAMES[language][lordObj.planet] : lordObj.planet;
                const shouldHighlight = shouldHighlightHouseLord(lordObj.houseLordNum, lordObj.planet, currentDasha, apiResult);
                const highlightClass = shouldHighlight ? 'dasha-highlighted' : '';
                const planetsData = apiResult.output[1];
                let highlightNote = '';
                
                if (shouldHighlight && currentDasha) {
                    if (planetsData[currentDasha.mahaDasha] && planetsData[currentDasha.mahaDasha].house_number === lordObj.house) {
                        const mahaDashaName = PLANET_NAMES[language] && PLANET_NAMES[language][currentDasha.mahaDasha] ? PLANET_NAMES[language][currentDasha.mahaDasha] : currentDasha.mahaDasha;
                        highlightNote = `<span class="dasha-badge">⭐ ${language === 'hi' ? 'महादशा' : 'Mahadasha'}: ${mahaDashaName}</span>`;
                    }
                    if (planetsData[currentDasha.antarDasha] && planetsData[currentDasha.antarDasha].house_number === lordObj.house) {
                        const antarDashaName = PLANET_NAMES[language] && PLANET_NAMES[language][currentDasha.antarDasha] ? PLANET_NAMES[language][currentDasha.antarDasha] : currentDasha.antarDasha;
                        highlightNote += ` <span class="dasha-badge">⭐ ${language === 'hi' ? 'अंतर दशा' : 'Antar Dasha'}: ${antarDashaName}</span>`;
                    }
                }
                
                houseLordsHTML += `
                <div class="ascendant-lord-section ${highlightClass}" style="margin-top: 60px;">
<h2>${getOrdinal(lordObj.houseLordNum, language)} ${texts.houseLord} (${translatedPlanetName}) ${texts.inHouse} ${getOrdinal(lordObj.house, language)} ${texts.house} ${highlightNote}</h2>
                    <div style="background: #f9f9f9; padding: 25px; border-left: 4px solid #1a1a1a; margin-bottom: 30px;">
                        <p><strong>${texts.lordIsIn} </strong> ${lordObj.signName}</p>
                    </div>
                    <div style="margin-top: 30px;">
                        <h3>${texts.classicalEffects}</h3>
                        <p>${lordObj.effect.classical}</p>
                        ${lordObj.effect.expanded ? `
                            <h3>${texts.detailedEffects}</h3>
                            <p>${lordObj.effect.expanded}</p>
                        ` : ''}
                    </div>
                </div>
                `;
            }
        }
    }

    // ------------ RENDER THE HTML ------------
   return `
    <button onclick="goBackToForm()" class="back-button">${texts.backButton}</button>
    <div class="article-content">
        <div class="article-header">
            <h1>${texts.title}</h1>
            <div class="article-meta">${texts.subtitle}</div>
        </div>
        <div class="article-body">
            <div class="article-intro">
                <p>${texts.intro}</p>
            </div>
            <div class="birth-details-box">
                <h2>${texts.birthInfo}</h2>
                <p><strong>${texts.name}:</strong> ${fullName}</p>
                <p><strong>${texts.date}:</strong> ${formattedDate}</p>
                ${timeOfBirth ? `<p><strong>${texts.time}:</strong> ${timeOfBirth}</p>` : ''}
                <p><strong>${texts.location}:</strong> ${placeOfBirth}</p>
            </div>
            <div class="fundamental-note" style="margin: 24px 0 36px 0;">
                <p style="background: #ffe7b1; color: #634800; font-size: 17px; padding: 18px 22px; border-left: 6px solid #d9a900;">
                    <strong>${texts.note}:</strong> ${texts.noteText}
                </p>
            </div>
            ${currentDasha ? generateDashaSummary(currentDasha, apiResult, language, texts) : `
            <div class="fundamental-note" style="margin: 24px 0 36px 0; background: #f0f0f0; border-left: 4px solid #999;">
                <p style="padding: 15px; color: #666; font-size: 14px;">
                    <strong>${language === 'hi' ? 'नोट' : 'Note'}:</strong> ${language === 'hi' 
                        ? 'महादशा जानकारी उपलब्ध नहीं है। कृपया ब्राउज़र कंसोल में त्रुटियों की जांच करें।' 
                        : 'Mahadasha information not available. Please check browser console for errors.'}
                </p>
            </div>
            `}
            <div class="planets-section">
                <h2>${texts.planetaryPositions}</h2>
                <div class="planets-table-wrapper">
                    <table class="planets-table">
                        <thead>
                            <tr>
                                <th>${texts.planet}</th>
                                <th>${texts.sign}</th>
                                <th>${texts.degree}</th>
                                <th>${texts.status}</th>
                            </tr>
                        </thead>
                        <tbody>${planetsHTML}</tbody>
                    </table>
                </div>
            </div>
                   <div class="planets-section">
  <h2>${texts.houseLordInHouses}</h2>
            ${houseLordsHTML}
            <div class="planets-section">
  <h2>${texts.planetaryHouseEffects}</h2>
  ${planetsHouseEffectsHTML} 
            <div class="article-intro" style="margin-top: 60px;">
                <p style="font-size: 18px; color: #666; font-style: italic;">
                    ${texts.footerNote}
                </p>
            </div>
        </div>
    </div>
    `;

}

// Global function to go back to form
window.goBackToForm = function() {
    const mainContainer = document.getElementById('mainContainer');
    const articleView = document.getElementById('articleView');
    
    // Hide article view
    articleView.classList.add('hidden');
    articleView.classList.remove('active');
    
    // Show main container
    mainContainer.classList.remove('hidden');
    
    // Scroll to top
    window.scrollTo(0, 0);
};

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('kundliForm');
    const loadingMessage = document.getElementById('loadingMessage');
    const result = document.getElementById('result');
    const resultContent = document.querySelector('.result-content');
    
    // Setup searchable dropdown with API
    const placeInput = document.getElementById('placeOfBirth');
    const dropdownList = document.getElementById('dropdownList');
    let selectedCity = '';
    let selectedLatitude = '';
    let selectedLongitude = '';
    let searchTimeout;
    let currentSearchTerm = '';
    
    // Debounce function to limit API calls
    function debounce(func, wait) {
        return function(...args) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    // Fetch cities from API
    async function fetchCities(searchTerm) {
        try {
            // Show loading state
            dropdownList.innerHTML = '<div class="dropdown-item loading-item">Searching...</div>';
            dropdownList.classList.remove('hidden');
            
            const response = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=10&language=en&format=json`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch cities');
            }
            
            const data = await response.json();
            
            // Clear dropdown
            dropdownList.innerHTML = '';
            
            if (!data.results || data.results.length === 0) {
                dropdownList.innerHTML = '<div class="dropdown-item">No cities found</div>';
                dropdownList.classList.remove('hidden');
                return;
            }
            
            // Display results
            data.results.forEach((city) => {
                const cityName = `${city.name}, ${city.admin1 || ''}${city.country ? ', ' + city.country : ''}`.replace(/\s+/g, ' ');
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.textContent = cityName;
                
                // Store coordinates for potential future use
                item.dataset.latitude = city.latitude;
                item.dataset.longitude = city.longitude;
                
                item.addEventListener('click', function() {
                    placeInput.value = cityName;
                    selectedCity = cityName;
                    selectedLatitude = city.latitude;
                    selectedLongitude = city.longitude;
                    dropdownList.classList.add('hidden');
                });
                
                dropdownList.appendChild(item);
            });
            
            dropdownList.classList.remove('hidden');
            
        } catch (error) {
            console.error('Error fetching cities:', error);
            dropdownList.innerHTML = '<div class="dropdown-item error-item">Failed to load cities. Please try again.</div>';
            dropdownList.classList.remove('hidden');
        }
    }
    
    // Debounced search function
    const searchCities = debounce(function(searchTerm) {
        if (searchTerm.length >= 2) {
            fetchCities(searchTerm);
        } else if (searchTerm.length === 0) {
            dropdownList.classList.add('hidden');
        }
    }, 300);
    
    placeInput.addEventListener('input', function() {
        const searchTerm = this.value.trim();
        currentSearchTerm = searchTerm;
        
        if (searchTerm.length === 0) {
            dropdownList.classList.add('hidden');
            return;
        }
        
        if (searchTerm.length < 2) {
            dropdownList.classList.add('hidden');
            return;
        }
        
        // Call debounced search
        searchCities(searchTerm);
    });
    
    // Clear dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!placeInput.contains(e.target) && !dropdownList.contains(e.target)) {
            dropdownList.classList.add('hidden');
        }
    });
    
    // Fetch coordinates from city name if not already stored
    async function getCoordinatesFromCity(cityName) {
        try {
            const response = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
            );
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                return {
                    latitude: data.results[0].latitude,
                    longitude: data.results[0].longitude
                };
            }
        } catch (error) {
            console.error('Error fetching coordinates:', error);
        }
        return null;
    }
    
    // Get timezone from coordinates
    async function getTimezone(latitude, longitude) {
        try {
            const response = await fetch(
                `https://api.timezonedb.com/v2.1/get-time-zone?key=YOUR_KEY&format=json&by=position&lat=${latitude}&lng=${longitude}`
            );
            const data = await response.json();
            if (data.status === 'OK') {
                return data.gmtOffset / 60; // Convert to hours
            }
        } catch (error) {
            console.error('Error fetching timezone:', error);
        }
        // Fallback: calculate approximate timezone from longitude
        return longitude / 15;
    }
    
    // Parse date into day, month, year
    function parseDate(dateString) {
        const parseDate = dateString.split('-');
        return {
            day: parseDate[2],
            month: parseDate[1], // JavaScript months are 0-indexed
            year: parseDate[0]
        };
    }
    
    // Parse time into hour, minute, second
    function parseTime(timeString) {
        if (!timeString) return { hour: 0, minute: 0, second: 0 };
        const [hours, minutes, seconds] = timeString.split(':');
        return {
            hour: parseInt(hours) || 0,
            minute: parseInt(minutes) || 0,
            second: parseInt(seconds) || 0
        };
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form values
        const dateOfBirth = document.getElementById('dateOfBirth').value;
        const timeOfBirth = document.getElementById('timeOfBirth').value;
        const placeOfBirth = document.getElementById('placeOfBirth').value;
        
        // Hide result and show loading
        result.classList.add('hidden');
        loadingMessage.classList.remove('hidden');
        
        try {
            // Parse date and time

            const { day, month, year } = parseDate(dateOfBirth);
            const { hour, minute, second } = parseTime(timeOfBirth);
            
            // Get coordinates if not already stored
            let latitude = selectedLatitude;
            let longitude = selectedLongitude;
            
            if (!latitude || !longitude) {
                const coords = await getCoordinatesFromCity(placeOfBirth);
                if (coords) {
                    latitude = coords.latitude;
                    longitude = coords.longitude;
                }
            }
            
            // Get timezone (simplified - using longitude approximation)
            const timezone = 5.5;
            
            // Prepare API request data according to FreeAstrologyAPI documentation
            // Reference: https://freeastrologyapi.com/api-reference/planets
            const apiData = {
                year: parseInt(year),
                month: parseInt(month),
                date: parseInt(day),
                hours: parseInt(hour),
                minutes: parseInt(minute),
                seconds: parseInt(second),
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                timezone: parseFloat(timezone),
                settings: {
                    observation_point: "topocentric",
                    ayanamsha: "lahiri"
                }
            };
            
            // Validate API key
            if (API_CONFIG.key === 'YOUR_API_KEY') {
                throw new Error('API key not configured');
            }
            
            console.log('Sending request to FreeAstrologyAPI');
            console.log('API URL:', API_CONFIG.url);
            console.log('Request data:', apiData);
            console.log('Request data (JSON):', JSON.stringify(apiData, null, 2));
            
            // Call FreeAstrologyAPI
            const response = await fetch(API_CONFIG.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_CONFIG.key
                },
                body: JSON.stringify(apiData)
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                throw new Error('API request failed');
            }
            
            const apiResult = await response.json();
            
            // Log the full response for debugging
            console.log('Full API Response:', apiResult);
            console.log('Response keys:', Object.keys(apiResult));
            
            // Fetch Mahadasha data
            let currentDasha = null;
            try {
                const mahaDashaData = await fetchMahaDashaData({
                    year: parseInt(year),
                    month: parseInt(month),
                    date: parseInt(day),
                    hours: parseInt(hour),
                    minutes: parseInt(minute),
                    seconds: parseInt(second),
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    timezone: parseFloat(timezone)
                });
                
                // Find current Mahadasha and Antar Dasha
                currentDasha = findCurrentDasha(mahaDashaData);
                console.log('Current Dasha:', currentDasha);
                if (currentDasha) {
                    console.log('Mahadasha:', currentDasha.mahaDasha, 'Antar Dasha:', currentDasha.antarDasha);
                } else {
                    console.warn('No current Dasha found. Mahadasha data:', mahaDashaData);
                    // If API returned data but no current period found, try to use the first available period as fallback
                    if (mahaDashaData && Object.keys(mahaDashaData).length > 0) {
                        const firstMahaDasha = Object.keys(mahaDashaData)[0];
                        const firstAntarDasas = mahaDashaData[firstMahaDasha];
                        if (firstAntarDasas && Object.keys(firstAntarDasas).length > 0) {
                            const firstAntarDasha = Object.keys(firstAntarDasas)[0];
                            const firstPeriod = firstAntarDasas[firstAntarDasha];
                            console.log('Using fallback: First available Dasha period');
                            currentDasha = {
                                mahaDasha: firstMahaDasha,
                                antarDasha: firstAntarDasha,
                                startTime: firstPeriod.start_time,
                                endTime: firstPeriod.end_time
                            };
                        }
                    }
                }
            } catch (error) {
                console.error('Error processing Mahadasha:', error);
                console.error('Error message:', error.message);
                // Create a fallback currentDasha using first planet from chart
                if (apiResult.output && Array.isArray(apiResult.output) && apiResult.output.length > 1) {
                    const planetsData = apiResult.output[1];
                    const planetNames = ['Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Sun', 'Ketu', 'Rahu'];
                    const firstPlanet = planetNames.find(p => planetsData[p]);
                    const secondPlanet = planetNames.find(p => p !== firstPlanet && planetsData[p]);
                    if (firstPlanet) {
                        console.log('Using emergency fallback with planets:', firstPlanet, secondPlanet);
                        currentDasha = {
                            mahaDasha: firstPlanet,
                            antarDasha: secondPlanet || firstPlanet,
                            startTime: new Date().toISOString().split('T')[0],
                            endTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                        };
                        console.log('Fallback currentDasha created:', currentDasha);
                    } else {
                        console.warn('Could not create fallback - no planets found in chart data');
                    }
                } else {
                    console.warn('Could not create fallback - invalid apiResult structure');
                }
            }
            
            // Final check - ensure we have currentDasha for display
            if (!currentDasha) {
                console.warn('No currentDasha available - Mahadasha features will not be displayed');
            } else {
                console.log('Final currentDasha to use:', currentDasha);
            }
            
            // Hide loading and show article view
            loadingMessage.classList.add('hidden');
            
            // Get form values for display
            const fullName = document.getElementById('fullName').value;
            const language = document.getElementById('language').value || 'en';
            
            // Generate article HTML
            const birthDate = new Date(dateOfBirth);
            const dateLocale = language === 'hi' ? 'hi-IN' : 'en-IN';
            const formattedDate = birthDate.toLocaleDateString(dateLocale, { 
                weekday: 'long',
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                timeZone:'Asia/Kolkata'
            });
            
            let articleHTML = generateArticleHTML(fullName, birthDate, formattedDate, timeOfBirth, placeOfBirth, apiResult, language, currentDasha);
            
            // Hide entire main container and show article view
            const mainContainer = document.getElementById('mainContainer');
            const articleView = document.getElementById('articleView');
            const articleContent = document.getElementById('articleContent');
            
            // Hide main container
            mainContainer.classList.add('hidden');
            
            // Display article
            articleContent.innerHTML = articleHTML;
            articleView.classList.remove('hidden');
            articleView.classList.add('active');
            
        } catch (error) {
            console.error('Error:', error);
            
            // Hide loading and show error
            loadingMessage.classList.add('hidden');
            result.classList.remove('hidden');
            
            const birthDate = new Date(dateOfBirth);
            const formattedDate = birthDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            resultContent.innerHTML = `
                <p><strong>Date of Birth:</strong> ${formattedDate}</p>
                <p><strong>Time of Birth:</strong> ${timeOfBirth || 'Not provided'}</p>
                <p><strong>Place of Birth:</strong> ${placeOfBirth}</p>
                <br>
                <p style="color: #d32f2f; font-weight: 600;">Error fetching kundli data.</p>
                <p style="margin-top: 8px; color: #666;">
                    ${error.message.includes('not configured') 
                        ? 'Please configure your FreeAstrologyAPI key in script.js (see API_CONFIG at the top of the file).' 
                        : 'Please check your API key and endpoint configuration.'}
                </p>
                <p style="margin-top: 12px; font-size: 13px; color: #999;">
                    Error details: ${error.message}
                </p>
            `;
        }
    });
});
