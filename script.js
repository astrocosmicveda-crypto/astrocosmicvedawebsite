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

// House calculation function
function getRelativeHouseNumber(ascendantSign, planetSign) {
    return ((planetSign - ascendantSign + 12) % 12) + 1;
}
// Utility function to get ordinal string
function getOrdinal(n) {
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

function generatePlanetsHouseEffectsHTML(apiResult) {
    var planetsList =   ["Moon", "Mercury","Venus","Mars" ,
    "Jupiter",
    "Saturn" ,
    "Sun",
    "Ketu",
    "Rahu"] 
let htmlOutput = "";
    var planetDetail = apiResult.output[1];
    for (var planet of planetsList) {
        
htmlOutput += `
    <div class="ascendant-lord-section" style="margin-top: 60px;">
    <h2>
      ${planet} in the ${planetDetail[planet].house_number}${getOrdinalSuffix(planetDetail[planet].house_number)} House
    </h2>
    <div style="margin-top: 10px;">
      <h3 style="color: #75623e; font-weight: 600;">Classical Effects</h3>
      <p style="font-size: 18px; margin-bottom: 22px;">
        ${PLANET_EFFECTS_BY_HOUSE[planet][planetDetail[planet].house_number].effect}
      </p>
    </div>
  </div>
`;



}
    // planetsList.map(x=> planeteffect[x][planetDetail[x].house_number].effect)

    htmlOutput += "</div>";
    return htmlOutput;
}


// Function to generate article-style HTML for same-page display
function generateArticleHTML(fullName, birthDate, formattedDate, timeOfBirth, placeOfBirth, apiResult) {
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    let planetsHTML = '';
    let houseLordsHTML = '';
    let planetsHouseEffectsHTML = generatePlanetsHouseEffectsHTML(apiResult);
    if (apiResult.output && Array.isArray(apiResult.output) && apiResult.output.length > 1) {
        const planetsData = apiResult.output[1];
        let ascendantSign = null;
        if (planetsData.Ascendant) ascendantSign = planetsData.Ascendant.current_sign;

        // Table of planetary positions
        for (const [planetName, planetInfo] of Object.entries(planetsData)) {
            if (planetName !== 'ayanamsa') {
                const signName = signs[planetInfo.current_sign - 1] || 'N/A';
                const degree = planetInfo.normDegree ? planetInfo.normDegree.toFixed(2) : 'N/A';
                const retroStatus = planetInfo.isRetro === 'true' || planetInfo.isRetro === true ? 'Retrograde' : 'Direct';
                const retroColor = planetInfo.isRetro === 'true' || planetInfo.isRetro === true ? '#d32f2f' : '#2e7d32';
                planetsHTML += `
                    <tr>
                        <td class="planet-name"><strong>${planetName}</strong></td>
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
                    const houseEffectMapping = HOUSE_LORDS_EFFECTS[lordNum];
                    lordObj = {
                        house: lordHouseNumber,
                        planet: planetName,
                        signName: signs[planetInfo.current_sign - 1],
                        houseLordNum: lordNum,
                        effect: houseEffectMapping ? houseEffectMapping[lordHouseNumber] : undefined
                    };
                    break;
                }
            }

            if (lordObj && lordObj.effect) {
                houseLordsHTML += `
                <div class="ascendant-lord-section" style="margin-top: 60px;">
<h2>${getOrdinal(lordObj.houseLordNum)} House Lord (${lordObj.planet}) in ${getOrdinal(lordObj.house)} House</h2>
                    <div style="background: #f9f9f9; padding: 25px; border-left: 4px solid #1a1a1a; margin-bottom: 30px;">
                        <p><strong>Lord is in: </strong> ${lordObj.signName}</p>
                    </div>
                    <div style="margin-top: 30px;">
                        <h3>Classical Effects</h3>
                        <p>${lordObj.effect.classical}</p>
                        ${lordObj.effect.expanded ? `
                            <h3>Detailed Effects</h3>
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
    <button onclick="goBackToForm()" class="back-button">← Back to Form</button>
    <div class="article-content">
        <div class="article-header">
            <h1>Your Vedic Birth Chart</h1>
            <div class="article-meta">Planetary Positions Analysis</div>
        </div>
        <div class="article-body">
            <div class="article-intro">
                <p>A birth chart, or Kundli, is a map of the sky at the exact moment you were born. This analysis is based on ancient Vedic astrology principles using the Lahiri ayanamsha system.</p>
            </div>
            <div class="birth-details-box">
                <h2>Birth Information</h2>
                <p><strong>Name:</strong> ${fullName}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                ${timeOfBirth ? `<p><strong>Time:</strong> ${timeOfBirth}</p>` : ''}
                <p><strong>Location:</strong> ${placeOfBirth}</p>
            </div>
            <div class="fundamental-note" style="margin: 24px 0 36px 0;">
                <p style="background: #ffe7b1; color: #634800; font-size: 17px; padding: 18px 22px; border-left: 6px solid #d9a900;">
                    <strong>Note:</strong> The astrological predictions and interpretations below are based on <strong>Vedic Astrology Principals</strong>— gathered from multiple sources. Please consult professional astrologer for any advice.
                </p>
            </div>
            <div class="planets-section">
                <h2>Planetary Positions</h2>
                <div class="planets-table-wrapper">
                    <table class="planets-table">
                        <thead>
                            <tr>
                                <th>Planet</th>
                                <th>Sign</th>
                                <th>Degree</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>${planetsHTML}</tbody>
                    </table>
                </div>
            </div>
                   <div class="planets-section">
  <h2>House Lord in 12 Houses Effects</h2>
            ${houseLordsHTML}
            <div class="planets-section">
  <h2>Planetary House Effects</h2>
  ${planetsHouseEffectsHTML} 
            <div class="article-intro" style="margin-top: 60px;">
                <p style="font-size: 18px; color: #666; font-style: italic;">
                    Each planet's position in your chart influences different aspects of your life. The zodiac sign where each planet is located, along with its degree and whether it's moving forward (Direct) or backward (Retrograde), all contribute to your unique astrological profile.
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
            
            // Hide loading and show article view
            loadingMessage.classList.add('hidden');
            
            // Get form values for display
            const fullName = document.getElementById('fullName').value;
            
            // Generate article HTML
            const birthDate = new Date(dateOfBirth);
            const formattedDate = birthDate.toLocaleDateString('en-IN', { 
                weekday: 'long',
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                timeZone:'Asia/Kolkata'
            });
            
            let articleHTML = generateArticleHTML(fullName, birthDate, formattedDate, timeOfBirth, placeOfBirth, apiResult);
            
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
