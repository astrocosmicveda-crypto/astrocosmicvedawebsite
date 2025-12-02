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
    shadbalaUrl: 'https://json.freeastrologyapi.com/shadbala/summary',
    dasaInformationUrl: 'https://json.freeastrologyapi.com/vimsottari/dasa-information',
    key: 'zZ89eRlc4n5lxXNXXQZBE8i3eq2EhNsK4OZQLT5v'
};

// =====================================================
// FIREBASE FIRESTORE CONFIGURATION
// =====================================================
// To store user form submissions:
// 1. Create a Firebase project at https://console.firebase.google.com
// 2. Enable Firestore Database
// 3. Set up Firestore security rules (see comments below)
// 4. Get your Firebase config from Project Settings
// 5. Update the firebaseConfig in index.html
// =====================================================

/**
 * Generate a unique key from date, time, and place
 * This key is used as the document ID in Firestore to ensure uniqueness
 */
function generateUniqueKey(dateOfBirth, timeOfBirth, placeOfBirth) {
    // Normalize place name (lowercase, trim, remove extra spaces)
    const normalizedPlace = placeOfBirth.toLowerCase().trim().replace(/\s+/g, '_');
    
    // Combine date, time, and place into a unique string
    // Format: YYYY-MM-DD_HH-MM_place_name
    const dateStr = dateOfBirth.replace(/-/g, '');
    const timeStr = (timeOfBirth || '00:00').replace(/:/g, '-');
    
    return `${dateStr}_${timeStr}_${normalizedPlace}`;
}

/**
 * Store user form submission data in Firestore
 * Uses date, time, and place as a composite unique key
 * This function is completely non-blocking and will not fail the user experience
 */
async function storeUserSubmission(formData, apiResult) {
    // Check if Firestore is available
    if (!window.firestoreDb || !window.firestoreFunctions) {
        console.warn('Firestore not initialized. Skipping data storage.');
        return { success: false, error: 'Firestore not initialized', silent: true };
    }
    
    // Wait a bit for Firestore to be ready (in case it's still initializing)
    let retries = 0;
    while (!window.firestoreDb && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
    }
    
    if (!window.firestoreDb) {
        console.warn('Firestore initialization timeout. Skipping data storage.');
        return { success: false, error: 'Firestore initialization timeout', silent: true };
    }
    
    try {
        const { doc, setDoc, getDoc, serverTimestamp, enableNetwork } = window.firestoreFunctions;
        const db = window.firestoreDb;
        
        // Generate unique key from date, time, and place
        const uniqueKey = generateUniqueKey(
            formData.dateOfBirth,
            formData.timeOfBirth || '00:00',
            formData.placeOfBirth
        );
        
        const docRef = doc(db, 'kundli_submissions', uniqueKey);
        
        // Prepare data to store
        const submissionData = {
            fullName: formData.fullName,
            dateOfBirth: formData.dateOfBirth,
            timeOfBirth: formData.timeOfBirth || '00:00',
            placeOfBirth: formData.placeOfBirth,
            language: formData.language,
            latitude: formData.latitude,
            longitude: formData.longitude,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString(),
            ascendantSign: apiResult?.output?.[1]?.Ascendant?.current_sign || null,
            uniqueKey: uniqueKey
        };
        
        // Skip duplicate check if offline - just try to write
        // Firestore will handle offline persistence automatically
        try {
            // Try to enable network (non-blocking)
            enableNetwork(db).catch(() => {
                // Ignore network enable errors
            });
            
            // Try to write directly - Firestore will queue if offline
            // Use a timeout to prevent hanging
            const writePromise = setDoc(docRef, submissionData);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Write timeout')), 5000)
            );
            
            await Promise.race([writePromise, timeoutPromise]);
            
            console.log('✅ User submission stored successfully with key:', uniqueKey);
            return { 
                success: true, 
                isDuplicate: false, 
                uniqueKey: uniqueKey,
                message: 'Data stored successfully' 
            };
            
        } catch (writeError) {
            // If offline/unavailable, Firestore persistence will handle it
            // We'll still return success since the data will be queued
            if (writeError.code === 'unavailable' || 
                writeError.code === 'failed-precondition' || 
                writeError.message.includes('offline') ||
                writeError.message.includes('timeout')) {
                
                // Firestore has offline persistence - data will sync automatically
                console.log('📦 Firestore offline - data queued for sync:', uniqueKey);
                console.log('   Data will be synced automatically when connection is restored');
                
                // Still try to write (Firestore will queue it in offline mode)
                setDoc(docRef, submissionData).catch(() => {
                    // Even if this fails, Firestore persistence might have it
                    console.log('   Note: Write queued in offline mode');
                });
                
                return { 
                    success: true, 
                    isDuplicate: false, 
                    uniqueKey: uniqueKey,
                    message: 'Data queued (will sync when online)',
                    queued: true
                };
            } else if (writeError.code === 'permission-denied') {
                console.error('❌ Firestore permission denied');
                console.error('   Fix: https://console.firebase.google.com/project/astrocosmicveda-2d8d9/firestore/rules');
                return { 
                    success: false, 
                    error: 'Permission denied - check security rules',
                    message: 'Permission denied',
                    silent: true // Don't show error to user
                };
            } else {
                // Unknown error - log but don't fail
                console.warn('⚠️ Firestore write error (non-critical):', writeError.code, writeError.message);
                return { 
                    success: false, 
                    error: writeError.message,
                    message: 'Storage failed (non-critical)',
                    silent: true
                };
            }
        }
        
    } catch (error) {
        // Catch-all: log but don't fail the user experience
        console.warn('⚠️ Firestore storage error (non-critical):', error.code || 'unknown', error.message);
        return { 
            success: false, 
            error: error.message || 'Unknown error',
            message: 'Storage unavailable (non-critical)',
            silent: true // Silent failure - don't interrupt user
        };
    }
}

function generateYogaSection(yogaResults, language = 'en') {
    if (!yogaResults || (!yogaResults.good.length && !yogaResults.bad.length)) {
        return '';
    }

    const headings = language === 'hi'
        ? {
            goodTitle: 'शुभ योग (Good Yogas)',
            badTitle: 'अशुभ योग (Bad Yogas)'
        }
        : {
            goodTitle: 'Good Yogas (Auspicious)',
            badTitle: 'Bad Yogas (Inauspicious)'
        };

    const renderCards = (items, challenging = false) => items.map(yoga => `
            <div class="yoga-card${challenging ? ' yoga-card--challenging' : ''}">
                <h3>${yoga.name}</h3>
                <p><strong>Rule:</strong> ${yoga.rule}</p>
                <p><strong>Example:</strong> ${yoga.example}</p>
                <p><strong>Explanation:</strong> ${yoga.explanation}</p>
                ${yoga.extra ? `<p><strong>${yoga.dynamicLabel || 'In your birth chart'}:</strong> ${yoga.extra}</p>` : ''}
            </div>
    `).join('');

    const goodSection = yogaResults.good.length
        ? `<h2>${headings.goodTitle}</h2><div class="yoga-category">${renderCards(yogaResults.good)}</div>`
        : '';

    const badSection = yogaResults.bad.length
        ? `<h2 class="yoga-section__subtitle">${headings.badTitle}</h2><div class="yoga-category">${renderCards(yogaResults.bad, true)}</div>`
        : '';

    return `
    <div class="yoga-section article-section" id="yogas">
        ${goodSection}
        ${badSection}
    </div>
    `;
}

// Generate Kundli Strength Assessment Section
function generateStrengthAssessmentSection(planetsData, ascendantSign, language = 'en', shadbalaApiData = null) {
    if (!planetsData || !ascendantSign) return '';
    
    // Calculate Kundli Scores
    const yogaResults = computeYogas(planetsData, ascendantSign);
    const currentDasha = window.kundliTabData.currentDasha || null;
    const kundliScores = calculateOverallKundliScore(planetsData, ascendantSign, yogaResults, currentDasha, shadbalaApiData);
    
    const texts = language === 'hi' ? {
        title: 'कुंडली शक्ति मूल्यांकन (Chart Strength Assessment)',
        overallStrength: 'समग्र चार्ट शक्ति',
        planetaryStrength: 'ग्रहीय शक्ति',
        houseLordStrength: 'भाव स्वामी शक्ति',
        planetaryAnalysis: 'ग्रहीय विश्लेषण',
        planet: 'ग्रह',
        dignity: 'गरिमा',
        shadbala: 'षड्बल',
        strength: 'शक्ति',
        status: 'स्थिति',
        house: 'भाव',
        houseLordAnalysis: 'भाव स्वामी विश्लेषण',
        houseNumber: 'भाव संख्या',
        lord: 'स्वामी',
        lordInHouse: 'स्वामी भाव में',
        totalStrength: 'कुल शक्ति',
        strong: 'मजबूत',
        good: 'अच्छा',
        moderate: 'मध्यम',
        weak: 'कमजोर',
        own: 'स्वयं',
        exalted: 'उच्च',
        moolatrikona: 'मूलत्रिकोण',
        debilitated: 'नीच',
        friendly: 'मित्र',
        enemy: 'शत्रु',
        neutral: 'तटस्थ',
        retrograde: 'वक्री',
        direct: 'मार्गी',
        combust: 'दग्ध',
        aspects: 'दृष्टि',
        beneficial: 'शुभ',
        malefic: 'अशुभ',
        noData: 'डेटा उपलब्ध नहीं'
    } : {
        title: 'Kundli Strength Assessment',
        overallStrength: 'Overall Chart Strength',
        planetaryStrength: 'Planetary Strength',
        houseLordStrength: 'House Lord Strength',
        planetaryAnalysis: 'Planetary Analysis',
        planet: 'Planet',
        dignity: 'Dignity',
        shadbala: 'Shadbala',
        strength: 'Strength',
        status: 'Status',
        house: 'House',
        houseLordAnalysis: 'House Lord Analysis',
        houseNumber: 'House',
        lord: 'Lord',
        lordInHouse: 'Lord in House',
        totalStrength: 'Total Strength',
        strong: 'Strong',
        good: 'Good',
        moderate: 'Moderate',
        weak: 'Weak',
        own: 'Own Sign',
        exalted: 'Exalted',
        moolatrikona: 'Moolatrikona',
        debilitated: 'Debilitated',
        friendly: 'Friendly',
        enemy: 'Enemy',
        neutral: 'Neutral',
        retrograde: 'Retrograde',
        direct: 'Direct',
        combust: 'Combust',
        aspects: 'Aspects',
        beneficial: 'Beneficial',
        malefic: 'Malefic',
        noData: 'No data available'
    };
    
    // Calculate overall chart strength based on average of health, finance, and career
    const overallStrengthPercentage = Math.round(kundliScores.overall * 10); // Convert 1-10 scale to percentage
    const healthPercentage = Math.round(kundliScores.health.score * 10);
    const financePercentage = Math.round(kundliScores.finance.score * 10);
    const careerPercentage = Math.round(kundliScores.career.score * 10);
    
    // Calculate Planetary Strength and House Lord Strength for display
    const planetaryStrengthData = calculateOverallChartStrength(planetsData, ascendantSign, shadbalaApiData);
    
    // Determine category based on percentage
    let strengthCategory = 'moderate';
    if (overallStrengthPercentage >= 75) strengthCategory = 'strong';
    else if (overallStrengthPercentage >= 60) strengthCategory = 'good';
    else if (overallStrengthPercentage >= 45) strengthCategory = 'moderate';
    else strengthCategory = 'weak';
    
    // Get strength category color
    const getStrengthColor = (category) => {
        switch(category) {
            case 'strong': return '#2e7d32';
            case 'good': return '#388e3c';
            case 'moderate': return '#f57c00';
            case 'weak': return '#d32f2f';
            default: return '#666';
        }
    };
    
    const strengthColor = getStrengthColor(strengthCategory);
    
    let overallHTML = '';
    if (kundliScores) {
        overallHTML = `
            <div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 25px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="margin-top: 0; color: #1a1a1a;">${texts.overallStrength}</h2>
                <div style="display: flex; align-items: center; gap: 20px; margin: 20px 0;">
                    <div style="flex: 1;">
                        <div style="font-size: 48px; font-weight: bold; color: ${strengthColor};">
                            ${overallStrengthPercentage}%
                        </div>
                        <div style="font-size: 18px; color: ${strengthColor}; font-weight: 600; text-transform: capitalize;">
                            ${texts[strengthCategory] || strengthCategory}
                        </div>
                    </div>
                    <div style="flex: 1; border-left: 2px solid #ddd; padding-left: 20px;">
                        <p style="margin: 5px 0;"><strong>${texts.planetaryStrength}:</strong> ${planetaryStrengthData ? planetaryStrengthData.avgPlanetaryStrength : 0}%</p>
                        <p style="margin: 5px 0;"><strong>${texts.houseLordStrength}:</strong> ${planetaryStrengthData ? planetaryStrengthData.avgHouseLordStrength : 0}%</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Add Kundli Rating Section with calculation details
    let kundliRatingHTML = '';
    if (kundliScores) {
        const scoreTexts = language === 'hi' ? {
            title: 'कुंडली रेटिंग (1-10)',
            health: 'स्वास्थ्य',
            finance: 'वित्त',
            career: 'करियर/नौकरी',
            overall: 'समग्र कुंडली स्कोर',
            strong: 'मजबूत',
            moderate: 'मध्यम',
            weak: 'कमजोर',
            veryWeak: 'बहुत कमजोर',
            excellent: 'उत्कृष्ट कुंडली',
            good: 'अच्छी कुंडली',
            moderateKundli: 'मध्यम कुंडली',
            weakKundli: 'कमजोर कुंडली',
            calculation: 'गणना विवरण',
            factors: 'कारक',
            houseStrength: 'भाव शक्ति',
            lordStrength: 'स्वामी शक्ति',
            yogas: 'योग',
            dasha: 'दशा',
            rawScore: 'कच्चा स्कोर',
            finalRating: 'अंतिम रेटिंग',
            method: 'स्कोरिंग विधि',
            methodText: 'स्कोर 0 से शुरू होता है, फिर सकारात्मक कारकों के लिए अंक जोड़े जाते हैं और नकारात्मक कारकों के लिए घटाए जाते हैं।'
        } : {
            title: 'Kundli Rating (1-10)',
            health: 'Health',
            finance: 'Finance',
            career: 'Career/Job',
            overall: 'Overall Kundli Score',
            strong: 'Strong',
            moderate: 'Moderate',
            weak: 'Weak',
            veryWeak: 'Very Weak',
            excellent: 'Excellent Kundli',
            good: 'Good Kundli',
            moderateKundli: 'Moderate Kundli',
            weakKundli: 'Weak Kundli',
            calculation: 'Calculation Details',
            factors: 'Factors',
            houseStrength: 'House Strength',
            lordStrength: 'Lord Strength',
            yogas: 'Yogas',
            dasha: 'Dasha',
            rawScore: 'Raw Score',
            finalRating: 'Final Rating',
            method: 'Scoring Method',
            methodText: 'Score starts at 0, then points are added for positive factors and subtracted for negative factors.'
        };
        
        kundliRatingHTML = `
            <div class="kundli-scores-section" style="margin: 30px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="color: white; margin: 0 0 25px 0; font-size: 24px; font-weight: 600; text-align: center;">
                    ${scoreTexts.title}
                </h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px;">
                    <div style="background: rgba(255,255,255,0.95); padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="font-size: 14px; color: #666; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            ${scoreTexts.health}
                        </div>
                        <div style="font-size: 36px; font-weight: 700; color: #4caf50; margin-bottom: 5px;">
                            ${kundliScores.health.score.toFixed(1)}/10
                        </div>
                        <div style="font-size: 11px; color: #999; margin-top: 5px;">
                            ${kundliScores.health.score >= 8 ? scoreTexts.strong : 
                              kundliScores.health.score >= 6 ? scoreTexts.moderate : 
                              kundliScores.health.score >= 4 ? scoreTexts.weak : 
                              scoreTexts.veryWeak}
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.95); padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="font-size: 14px; color: #666; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            ${scoreTexts.finance}
                        </div>
                        <div style="font-size: 36px; font-weight: 700; color: #2196f3; margin-bottom: 5px;">
                            ${kundliScores.finance.score.toFixed(1)}/10
                        </div>
                        <div style="font-size: 11px; color: #999; margin-top: 5px;">
                            ${kundliScores.finance.score >= 8 ? scoreTexts.strong : 
                              kundliScores.finance.score >= 6 ? scoreTexts.moderate : 
                              kundliScores.finance.score >= 4 ? scoreTexts.weak : 
                              scoreTexts.veryWeak}
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.95); padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="font-size: 14px; color: #666; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            ${scoreTexts.career}
                        </div>
                        <div style="font-size: 36px; font-weight: 700; color: #ff9800; margin-bottom: 5px;">
                            ${kundliScores.career.score.toFixed(1)}/10
                        </div>
                        <div style="font-size: 11px; color: #999; margin-top: 5px;">
                            ${kundliScores.career.score >= 8 ? scoreTexts.strong : 
                              kundliScores.career.score >= 6 ? scoreTexts.moderate : 
                              kundliScores.career.score >= 4 ? scoreTexts.weak : 
                              scoreTexts.veryWeak}
                        </div>
                    </div>
                </div>
                <div style="background: rgba(255,255,255,0.95); padding: 25px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 2px solid rgba(255,255,255,0.5); margin-bottom: 25px;">
                    <div style="font-size: 16px; color: #666; margin-bottom: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${scoreTexts.overall}
                    </div>
                    <div style="font-size: 48px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px;">
                        ${kundliScores.overall.toFixed(1)}/10
                    </div>
                    <div style="font-size: 13px; color: #666; margin-top: 8px;">
                        ${kundliScores.overall >= 8 ? scoreTexts.excellent : 
                          kundliScores.overall >= 6 ? scoreTexts.good : 
                          kundliScores.overall >= 4 ? scoreTexts.moderateKundli : 
                          scoreTexts.weakKundli}
                    </div>
                </div>
                
                <!-- Calculation Details -->
                <div style="background: rgba(255,255,255,0.95); padding: 25px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
                        ${scoreTexts.calculation}
                    </h3>
                    
                    <!-- Health Calculation -->
                    <div style="margin-bottom: 25px; padding: 15px; background: #f5f5f5; border-radius: 6px; border-left: 4px solid #4caf50;">
                        <h4 style="color: #4caf50; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">${scoreTexts.health}</h4>
                        
                        <!-- Formula -->
                        <div style="margin-bottom: 15px; padding: 12px; background: #e8f5e9; border-radius: 4px; border-left: 3px solid #4caf50;">
                            <strong style="display: block; margin-bottom: 8px; color: #2e7d32; font-size: 14px;">Formula:</strong>
                            <div style="font-size: 13px; color: #1b5e20; line-height: 1.6;">
                                <strong>Raw Score = House Strength + Lord Strength + Yogas</strong><br>
                                <span style="margin-left: 20px;">• House Strength: Points from planets in 1st, 6th, 8th, 12th houses</span><br>
                                <span style="margin-left: 20px;">• Lord Strength: Sum of (Dignity + Shadbala + Aspects/Conjunctions) for 1st, 6th, 8th, 12th house lords + Health Protector Bonus</span><br>
                                <span style="margin-left: 20px;">• Yogas: Health-related yogas (Gaja, Hamsa, Neecha = +3 each; Grahan, Shrapit = -3 each)</span><br>
                                <strong>Final Rating (1-10) = Map Raw Score using piecewise linear function</strong>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 15px;">
                            <div><strong>${scoreTexts.houseStrength}:</strong> ${kundliScores.health.factors.houseStrength >= 0 ? '+' : ''}${kundliScores.health.factors.houseStrength}</div>
                            <div><strong>${scoreTexts.lordStrength}:</strong> ${kundliScores.health.factors.lordStrength >= 0 ? '+' : ''}${kundliScores.health.factors.lordStrength}</div>
                            <div><strong>${scoreTexts.yogas}:</strong> ${kundliScores.health.factors.yogas >= 0 ? '+' : ''}${kundliScores.health.factors.yogas}</div>
                        </div>
                        
                        ${kundliScores.health.factors.houseBreakdown ? `
                        <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 4px;">
                            <strong style="display: block; margin-bottom: 8px; color: #4caf50;">${scoreTexts.houseStrength} ${language === 'hi' ? 'विवरण' : 'Details'}:</strong>
                            ${kundliScores.health.factors.houseBreakdown.map(h => `
                                <div style="margin-bottom: 8px; font-size: 13px;">
                                    <strong>${getOrdinal(h.house, language)} ${language === 'hi' ? 'भाव' : 'House'}:</strong> ${h.score >= 0 ? '+' : ''}${h.score} points
                                    ${h.planets && h.planets.length > 0 ? `
                                        <div style="margin-left: 15px; margin-top: 4px; color: #666;">
                                            ${h.planets.map(p => {
                                                const planetName = PLANET_NAMES[language] && PLANET_NAMES[language][p.planet] ? PLANET_NAMES[language][p.planet] : p.planet;
                                                return `${planetName}: ${p.points >= 0 ? '+' : ''}${p.points} (${p.details})`;
                                            }).join('<br>')}
                                            ${h.multipleMaleficsPenalty && h.multipleMaleficsPenalty < 0 ? `<br><span style="color: #d32f2f;">Multiple Malefics Penalty: ${h.multipleMaleficsPenalty}</span>` : ''}
                                        </div>
                                    ` : '<span style="color: #999; margin-left: 10px;">No planets</span>'}
                                </div>
                            `).join('')}
                            ${kundliScores.health.factors.houseBreakdown[0] && kundliScores.health.factors.houseBreakdown[0].globalModifier ? `
                                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 13px; color: #666;">
                                    <strong>Global Modifier:</strong> ${kundliScores.health.factors.houseBreakdown[0].globalModifier}
                                </div>
                            ` : ''}
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 2px solid #4caf50; font-size: 13px; font-weight: 600;">
                                <strong>Total House Strength:</strong> ${kundliScores.health.factors.houseStrength >= 0 ? '+' : ''}${kundliScores.health.factors.houseStrength} 
                                (${kundliScores.health.factors.houseBreakdown.reduce((sum, h) => sum + h.score, 0)}${kundliScores.health.factors.houseBreakdown[0] && kundliScores.health.factors.houseBreakdown[0].globalModifier ? 
                                    (kundliScores.health.factors.houseBreakdown[0].globalModifier.includes('+1') ? ' + 1' : 
                                     kundliScores.health.factors.houseBreakdown[0].globalModifier.includes('-1') ? ' - 1' : '') : ''})
                            </div>
                        </div>
                        ` : ''}
                        
                        ${kundliScores.health.factors.lordBreakdown ? `
                        <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 4px;">
                            <strong style="display: block; margin-bottom: 8px; color: #4caf50;">${scoreTexts.lordStrength} ${language === 'hi' ? 'विवरण' : 'Details'}:</strong>
                            ${kundliScores.health.factors.lordBreakdown.map(l => {
                                const lordName = PLANET_NAMES[language] && PLANET_NAMES[language][l.lord] ? PLANET_NAMES[language][l.lord] : l.lord;
                                return `
                                <div style="margin-bottom: 8px; font-size: 13px;">
                                    <strong>${getOrdinal(l.house, language)} ${language === 'hi' ? 'भाव स्वामी' : 'House Lord'} (${lordName}):</strong> ${l.score >= 0 ? '+' : ''}${l.score} points
                                    ${l.details ? `<div style="margin-left: 15px; margin-top: 4px; color: #666;">${l.details}</div>` : ''}
                                </div>
                                `;
                            }).join('')}
                            ${kundliScores.health.factors.lordBreakdown[0] && kundliScores.health.factors.lordBreakdown[0].beneficProtectorBonus ? `
                                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 13px; color: #2e7d32;">
                                    <strong>Health Protector Bonus:</strong> ${kundliScores.health.factors.lordBreakdown[0].beneficProtectorBonus}
                                </div>
                            ` : ''}
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 2px solid #4caf50; font-size: 13px; font-weight: 600;">
                                <strong>Total Lord Strength:</strong> ${kundliScores.health.factors.lordStrength >= 0 ? '+' : ''}${kundliScores.health.factors.lordStrength} 
                                (${kundliScores.health.factors.lordBreakdown.reduce((sum, l) => sum + l.score, 0)})
                            </div>
                        </div>
                        ` : ''}
                        
                        ${kundliScores.health.factors.yogaBreakdown ? `
                        <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 4px;">
                            <strong style="display: block; margin-bottom: 8px; color: #4caf50;">${scoreTexts.yogas} ${language === 'hi' ? 'विवरण' : 'Details'}:</strong>
                            ${kundliScores.health.factors.yogaBreakdown.good && kundliScores.health.factors.yogaBreakdown.good.length > 0 ? `
                                <div style="margin-bottom: 6px;">
                                    <strong style="color: #2e7d32;">${language === 'hi' ? 'शुभ योग' : 'Good Yogas'}:</strong>
                                    ${kundliScores.health.factors.yogaBreakdown.good.map(y => `<div style="margin-left: 15px; margin-top: 4px; color: #666; font-size: 13px;">${y.name}: +${y.points}</div>`).join('')}
                                </div>
                            ` : ''}
                            ${kundliScores.health.factors.yogaBreakdown.bad && kundliScores.health.factors.yogaBreakdown.bad.length > 0 ? `
                                <div>
                                    <strong style="color: #d32f2f;">${language === 'hi' ? 'अशुभ योग' : 'Bad Yogas'}:</strong>
                                    ${kundliScores.health.factors.yogaBreakdown.bad.map(y => `<div style="margin-left: 15px; margin-top: 4px; color: #666; font-size: 13px;">${y.name}: ${y.points}</div>`).join('')}
                                </div>
                            ` : ''}
                            ${(!kundliScores.health.factors.yogaBreakdown.good || kundliScores.health.factors.yogaBreakdown.good.length === 0) && 
                              (!kundliScores.health.factors.yogaBreakdown.bad || kundliScores.health.factors.yogaBreakdown.bad.length === 0) ? 
                              `<span style="color: #999; font-size: 13px;">${language === 'hi' ? 'कोई प्रासंगिक योग नहीं' : 'No relevant yogas'}</span>` : ''}
                        </div>
                        ` : ''}
                        
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 2px solid #4caf50;">
                            <strong>${scoreTexts.rawScore}:</strong> ${kundliScores.health.factors.rawTotal >= 0 ? '+' : ''}${kundliScores.health.factors.rawTotal} → 
                            <strong>${scoreTexts.finalRating}:</strong> ${kundliScores.health.score.toFixed(1)}/10
                        </div>
                    </div>
                    
                    <!-- Finance Calculation -->
                    <div style="margin-bottom: 25px; padding: 15px; background: #f5f5f5; border-radius: 6px; border-left: 4px solid #2196f3;">
                        <h4 style="color: #2196f3; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">${scoreTexts.finance}</h4>
                        
                        <!-- Formula -->
                        <div style="margin-bottom: 15px; padding: 12px; background: #e3f2fd; border-radius: 4px; border-left: 3px solid #2196f3;">
                            <strong style="display: block; margin-bottom: 8px; color: #1565c0; font-size: 14px;">Formula:</strong>
                            <div style="font-size: 13px; color: #0d47a1; line-height: 1.6;">
                                <strong>Raw Score = House Strength + Lord Strength + Yogas</strong><br>
                                <span style="margin-left: 20px;">• House Strength: Points from planets in 2nd, 11th, 5th, 9th, 10th houses + Placement Bonuses</span><br>
                                <span style="margin-left: 20px;">• Lord Strength: Sum of (Dignity + Shadbala + Aspects/Conjunctions) for 2nd, 11th, 9th, 10th house lords + Placement Bonuses (+1 if lord in 2H/11H)</span><br>
                                <span style="margin-left: 20px;">• Yogas: Wealth-related yogas involving 2nd/11th/9th/5th/10th house lords</span><br>
                                <span style="margin-left: 40px;">- <strong>Strong yogas:</strong> All involved lords have dignity ≥ neutral (not enemy) and Shadbala ≥ moderate (≥350) → +4 each internally, capped at +2 total</span><br>
                                <span style="margin-left: 40px;">- <strong>Weak yogas:</strong> Some mild weakness (enemy sign OR Shadbala 300-349) but no debilitation → +2 each internally, shows as +0.5-1 after cap</span><br>
                                <span style="margin-left: 40px;">- <strong>Broken yogas:</strong> Debilitated OR very weak (Shadbala &lt;300) OR weak with multiple afflictions → 0 (no bonus)</span><br>
                                <span style="margin-left: 40px;">- <strong>Bad yogas (Daridra):</strong> -4 if involves wealth lords with afflictions, capped at -2 total</span><br>
                                <span style="margin-left: 40px;">- Net Yogas range: -2 to +2 (tweaks score, doesn't overwhelm house/lord strength)</span><br>
                                <strong>Final Rating (1-10) = Map Raw Score using piecewise linear function</strong>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 15px;">
                            <div><strong>${scoreTexts.houseStrength}:</strong> ${kundliScores.finance.factors.houseStrength >= 0 ? '+' : ''}${kundliScores.finance.factors.houseStrength}</div>
                            <div><strong>${scoreTexts.lordStrength}:</strong> ${kundliScores.finance.factors.lordStrength >= 0 ? '+' : ''}${kundliScores.finance.factors.lordStrength}</div>
                            <div><strong>${scoreTexts.yogas}:</strong> ${kundliScores.finance.factors.yogas >= 0 ? '+' : ''}${kundliScores.finance.factors.yogas}</div>
                        </div>
                        
                        ${kundliScores.finance.factors.houseBreakdown ? `
                        <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 4px;">
                            <strong style="display: block; margin-bottom: 8px; color: #2196f3;">${scoreTexts.houseStrength} ${language === 'hi' ? 'विवरण' : 'Details'}:</strong>
                            ${kundliScores.finance.factors.houseBreakdown.map(h => `
                                <div style="margin-bottom: 8px; font-size: 13px;">
                                    <strong>${getOrdinal(h.house, language)} ${language === 'hi' ? 'भाव' : 'House'}:</strong> ${h.score >= 0 ? '+' : ''}${h.score} points
                                    ${h.planets && h.planets.length > 0 ? `
                                        <div style="margin-left: 15px; margin-top: 4px; color: #666;">
                                            ${h.planets.map(p => {
                                                const planetName = PLANET_NAMES[language] && PLANET_NAMES[language][p.planet] ? PLANET_NAMES[language][p.planet] : p.planet;
                                                return `${planetName}: ${p.points >= 0 ? '+' : ''}${p.points} (${p.details})`;
                                            }).join('<br>')}
                                            ${h.multipleMaleficsPenalty && h.multipleMaleficsPenalty < 0 ? `<br><span style="color: #d32f2f;">Multiple Malefics Penalty: ${h.multipleMaleficsPenalty}</span>` : ''}
                                        </div>
                                    ` : '<span style="color: #999; margin-left: 10px;">No planets</span>'}
                                </div>
                            `).join('')}
                            ${kundliScores.finance.factors.houseBreakdown[0] && kundliScores.finance.factors.houseBreakdown[0].placementBonus ? `
                                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 13px; color: #666;">
                                    <strong>Placement Bonuses:</strong> ${kundliScores.finance.factors.houseBreakdown[0].placementBonus}
                                </div>
                            ` : ''}
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 2px solid #2196f3; font-size: 13px; font-weight: 600;">
                                <strong>Total House Strength:</strong> ${kundliScores.finance.factors.houseStrength >= 0 ? '+' : ''}${kundliScores.finance.factors.houseStrength}
                            </div>
                        </div>
                        ` : ''}
                        
                        ${kundliScores.finance.factors.lordBreakdown ? `
                        <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 4px;">
                            <strong style="display: block; margin-bottom: 8px; color: #2196f3;">${scoreTexts.lordStrength} ${language === 'hi' ? 'विवरण' : 'Details'}:</strong>
                            ${kundliScores.finance.factors.lordBreakdown.map(l => {
                                const lordName = PLANET_NAMES[language] && PLANET_NAMES[language][l.lord] ? PLANET_NAMES[language][l.lord] : l.lord;
                                return `
                                <div style="margin-bottom: 8px; font-size: 13px;">
                                    <strong>${getOrdinal(l.house, language)} ${language === 'hi' ? 'भाव स्वामी' : 'House Lord'} (${lordName}):</strong> ${l.score >= 0 ? '+' : ''}${l.score} points
                                    ${l.details ? `<div style="margin-left: 15px; margin-top: 4px; color: #666;">${l.details}</div>` : ''}
                                    ${l.placementBonus ? `<div style="margin-left: 15px; margin-top: 4px; color: #2e7d32;">${l.placementBonus}</div>` : ''}
                                </div>
                                `;
                            }).join('')}
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 2px solid #2196f3; font-size: 13px; font-weight: 600;">
                                <strong>Total Lord Strength:</strong> ${kundliScores.finance.factors.lordStrength >= 0 ? '+' : ''}${kundliScores.finance.factors.lordStrength}
                                (${kundliScores.finance.factors.lordBreakdown.reduce((sum, l) => sum + l.score, 0)})
                            </div>
                        </div>
                        ` : ''}
                        
                        ${kundliScores.finance.factors.yogaBreakdown ? `
                        <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 4px;">
                            <strong style="display: block; margin-bottom: 8px; color: #2196f3;">${scoreTexts.yogas} ${language === 'hi' ? 'विवरण' : 'Details'}:</strong>
                            ${kundliScores.finance.factors.yogaBreakdown.good && kundliScores.finance.factors.yogaBreakdown.good.length > 0 ? `
                                <div style="margin-bottom: 6px;">
                                    <strong style="color: #2e7d32;">${language === 'hi' ? 'शुभ योग' : 'Good Yogas'}:</strong>
                                    ${kundliScores.finance.factors.yogaBreakdown.good.map(y => `<div style="margin-left: 15px; margin-top: 4px; color: #666; font-size: 13px;">${y.name}: +${y.points}</div>`).join('')}
                                </div>
                            ` : ''}
                            ${kundliScores.finance.factors.yogaBreakdown.bad && kundliScores.finance.factors.yogaBreakdown.bad.length > 0 ? `
                                <div>
                                    <strong style="color: #d32f2f;">${language === 'hi' ? 'अशुभ योग' : 'Bad Yogas'}:</strong>
                                    ${kundliScores.finance.factors.yogaBreakdown.bad.map(y => `<div style="margin-left: 15px; margin-top: 4px; color: #666; font-size: 13px;">${y.name}: ${y.points}</div>`).join('')}
                                </div>
                            ` : ''}
                            ${(!kundliScores.finance.factors.yogaBreakdown.good || kundliScores.finance.factors.yogaBreakdown.good.length === 0) && 
                              (!kundliScores.finance.factors.yogaBreakdown.bad || kundliScores.finance.factors.yogaBreakdown.bad.length === 0) ? 
                              `<span style="color: #999; font-size: 13px;">${language === 'hi' ? 'कोई प्रासंगिक योग नहीं' : 'No relevant yogas'}</span>` : ''}
                        </div>
                        ` : ''}
                        
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 2px solid #2196f3;">
                            <strong>${scoreTexts.rawScore}:</strong> ${kundliScores.finance.factors.rawTotal >= 0 ? '+' : ''}${kundliScores.finance.factors.rawTotal} → 
                            <strong>${scoreTexts.finalRating}:</strong> ${kundliScores.finance.score.toFixed(1)}/10
                        </div>
                    </div>
                    
                    <!-- Career Calculation -->
                    <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 6px; border-left: 4px solid #ff9800;">
                        <h4 style="color: #ff9800; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">${scoreTexts.career}</h4>
                        
                        <!-- Formula -->
                        <div style="margin-bottom: 15px; padding: 12px; background: #fff3e0; border-radius: 4px; border-left: 3px solid #ff9800;">
                            <strong style="display: block; margin-bottom: 8px; color: #e65100; font-size: 14px;">Formula:</strong>
                            <div style="font-size: 13px; color: #bf360c; line-height: 1.6;">
                                <strong>Work Strength = 0.4 × (10th/8) × 10 + 0.3 × (6th/3) × 10 + 0.2 × (Lagna/4) × 10 + 0.1 × (3rd/3) × 10 + YogaBonus_work + AspectBonus_work</strong><br>
                                <span style="margin-left: 20px;">• 10th Block (0-8): Raw = H10 + L10_strength, where H10 = house base + placement bonuses (10L in 10H/11H: +2, 10L in 6H/9H: +1), L10_strength = Dignity + Shadbala + Aspects/Conjunctions. Normalize: clamp((raw10 + 5) × 8/10, 0, 8)</span><br>
                                <span style="margin-left: 20px;">• Lagna Block (0-4): Raw = H1 + L1_strength, where H1 = house base + placement bonus (1L in kendra/trikona with Shadbala ≥ 350: +1), L1_strength = Dignity + Shadbala + Aspects/Conjunctions. Normalize: clamp((raw1 + 4) × 4/8, 0, 4)</span><br>
                                <span style="margin-left: 20px;">• 6th Block (0-3): Raw = H6 + L6_strength, where H6 = house base + placement bonus (6L in 6H/10H: +2), L6_strength = Dignity + Shadbala + Aspects/Conjunctions. Normalize: clamp((raw6 + 4) × 3/8, 0, 3)</span><br>
                                <span style="margin-left: 20px;">• 3rd Block (0-3): Raw = H3 + L3_strength, where H3 = house base + placement bonus (3L in 3H/10H/11H: +1), L3_strength = Dignity + Shadbala + Aspects/Conjunctions. Normalize: clamp((raw3 + 4) × 3/8, 0, 3)</span><br>
                                <span style="margin-left: 20px;">• YogaBonus_work (0-2): Clear strong career yogas (Raj, Akhanda Samrajya, Dhana, Amala, Panch, Parivartana) involving 10L/9L/Lagna/2L/11L with reasonably strong lords = +2; weaker/single yoga = +1</span><br>
                                <span style="margin-left: 20px;">• AspectBonus_work (0-1): Multiple strong benefics (exalted/own sign, Shadbala ≥ 480) aspecting 10H or 10L = +1</span><br>
                                <strong>Earnings Strength = 0.4 × (2nd/3) × 10 + 0.6 × (11th/3) × 10 + KarakaBonus</strong><br>
                                <span style="margin-left: 20px;">• 2nd Block (0-3): Raw = H2 + L2_strength, where H2 = house base + placement bonus (2L in 2H/11H: +1), L2_strength = Dignity + Shadbala + Aspects/Conjunctions. Normalize: clamp((raw2 + 4) × 3/8, 0, 3)</span><br>
                                <span style="margin-left: 20px;">• 11th Block (0-3): Raw = H11 + L11_strength, where H11 = house base + placement bonuses (11L in 11H/10H: +2, 10L in 11H: +1), L11_strength = Dignity + Shadbala + Aspects/Conjunctions. Normalize: clamp((raw11 + 4) × 3/8, 0, 3)</span><br>
                                <span style="margin-left: 20px;">• KarakaBonus (-2 to +3): For Sun, Saturn, Mercury, Jupiter - well placed (good dignity, moderate Shadbala, in career houses 2/6/10/11 or Lagna) = +0.5 to +1.0 each; seriously weak/hurting (debilitated/weak Shadbala + malefic aspects, afflicting career houses) = -0.5 to -1.0 each</span><br>
                                <strong>Overall Career = 0.6 × Work Strength + 0.4 × Earnings Strength</strong><br>
                                <span style="margin-left: 20px;">• Lagna Reduction: If Lagna_raw (H1 + L1_strength) ≤ -1 and > -3, apply -15% reduction; if ≤ -3, apply -25% reduction</span><br>
                                <span style="margin-left: 20px;">• Sanity Floor: If 10L, 2L, 11L all have dignity ≥ neutral and Shadbala ≥ moderate, ensure Overall Career ≥ 3.5</span>
                            </div>
                        </div>
                        
                        <!-- Detailed English Explanation -->
                        <div style="margin-top: 20px; padding: 15px; background: #fffbf0; border-radius: 6px; border-left: 4px solid #ff9800;">
                            <h4 style="color: #ff9800; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">How the Career/Job Score is Calculated (Plain English)</h4>
                            <div style="font-size: 13px; color: #5d4037; line-height: 1.8;">
                                <p style="margin: 0 0 12px 0;"><strong>The Career Score has two main components: Work Strength and Earnings Strength.</strong></p>
                                
                                <p style="margin: 0 0 10px 0;"><strong>Work Strength (0-10):</strong> This measures your ability to perform work, handle responsibilities, and maintain employment. It combines four key areas:</p>
                                <ul style="margin: 0 0 10px 20px; padding: 0;">
                                    <li style="margin-bottom: 6px;"><strong>10th House Block (40% weight):</strong> The 10th house represents your career, profession, and public reputation. We calculate a raw score by adding: (1) points from planets in the 10th house, (2) placement bonuses if the 10th lord is in powerful positions (like the 10th or 11th house), and (3) the strength of the 10th lord itself (based on its dignity, shadbala, and aspects/conjunctions). This raw score is then normalized to a 0-8 scale.</li>
                                    <li style="margin-bottom: 6px;"><strong>6th House Block (30% weight):</strong> The 6th house represents work, service, and daily routines. Similar calculation: house occupants + placement bonuses + 6th lord strength, normalized to 0-3.</li>
                                    <li style="margin-bottom: 6px;"><strong>Lagna Block (20% weight):</strong> Your ascendant (1st house) represents your overall vitality and self. If the Lagna lord is strong and well-placed, it supports your work capacity. Calculated as house base + placement bonus + Lagna lord strength, normalized to 0-4.</li>
                                    <li style="margin-bottom: 6px;"><strong>3rd House Block (10% weight):</strong> The 3rd house represents effort, courage, and communication. Calculated similarly, normalized to 0-3.</li>
                                </ul>
                                <p style="margin: 0 0 10px 0;">Additionally, we add bonuses: <strong>YogaBonus_work (0-2 points)</strong> for strong career yogas involving career-related house lords, and <strong>AspectBonus_work (0-1 point)</strong> if multiple strong benefic planets are aspecting your 10th house or 10th lord.</p>
                                
                                <p style="margin: 0 0 10px 0;"><strong>Earnings Strength (0-10):</strong> This measures your ability to generate income and financial gains from work. It combines:</p>
                                <ul style="margin: 0 0 10px 20px; padding: 0;">
                                    <li style="margin-bottom: 6px;"><strong>2nd House Block (40% weight):</strong> The 2nd house represents wealth, family resources, and speech. Calculated as house base + placement bonus + 2nd lord strength, normalized to 0-3.</li>
                                    <li style="margin-bottom: 6px;"><strong>11th House Block (60% weight):</strong> The 11th house represents gains, income, and fulfillment of desires. This is weighted more heavily as it directly relates to earnings. Calculated with placement bonuses (11th lord in 11th/10th house, or 10th lord in 11th house), normalized to 0-3.</li>
                                </ul>
                                <p style="margin: 0 0 10px 0;">We also add <strong>KarakaBonus (-2 to +3 points)</strong> based on the placement of career significator planets (Sun, Saturn, Mercury, Jupiter). If these planets are well-placed in career houses, they add points; if they're weak or afflicted, they subtract points.</p>
                                
                                <p style="margin: 0 0 10px 0;"><strong>Overall Career Score (0-10):</strong> This is calculated as 60% Work Strength + 40% Earnings Strength. However, if your Lagna (ascendant) is weak (raw score ≤ -1), we apply a reduction: -15% if moderately weak, or -25% if very weak. This reflects that a weak foundation affects overall career potential.</p>
                                
                                <p style="margin: 0 0 0 0;"><strong>Sanity Floor:</strong> If your 10th lord, 2nd lord, and 11th lord are all at least moderately strong (not debilitated, with decent shadbala), we ensure your Overall Career score is at least 3.5, even if other factors are weak. This prevents unreasonably low scores when the core career indicators are reasonable.</p>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 15px;">
                            <div><strong>${language === 'hi' ? 'कार्य शक्ति' : 'Work Strength'}:</strong> ${kundliScores.career.workStrength ? kundliScores.career.workStrength.toFixed(1) : kundliScores.career.score.toFixed(1)}/10</div>
                            <div><strong>${language === 'hi' ? 'आय शक्ति' : 'Earnings Strength'}:</strong> ${kundliScores.career.earningsStrength ? kundliScores.career.earningsStrength.toFixed(1) : 'N/A'}/10</div>
                            <div><strong>${language === 'hi' ? 'समग्र करियर' : 'Overall Career'}:</strong> ${kundliScores.career.score.toFixed(1)}/10</div>
                        </div>
                        ${kundliScores.career.factors ? `
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 15px; font-size: 13px;">
                            <div><strong>10th Block:</strong> ${kundliScores.career.factors.tenthBlock >= 0 ? '+' : ''}${kundliScores.career.factors.tenthBlock || 0}/8</div>
                            <div><strong>Lagna Block:</strong> ${kundliScores.career.factors.lagnaBlock >= 0 ? '+' : ''}${kundliScores.career.factors.lagnaBlock || 0}/4</div>
                            <div><strong>6th Block:</strong> ${kundliScores.career.factors.sixthBlock >= 0 ? '+' : ''}${kundliScores.career.factors.sixthBlock || 0}/3</div>
                            <div><strong>3rd Block:</strong> ${kundliScores.career.factors.thirdBlock >= 0 ? '+' : ''}${kundliScores.career.factors.thirdBlock || 0}/3</div>
                            <div><strong>2nd Block:</strong> ${kundliScores.career.factors.secondBlock >= 0 ? '+' : ''}${kundliScores.career.factors.secondBlock || 0}/3</div>
                            <div><strong>11th Block:</strong> ${kundliScores.career.factors.eleventhBlock >= 0 ? '+' : ''}${kundliScores.career.factors.eleventhBlock || 0}/3</div>
                            <div><strong>Karakas:</strong> ${kundliScores.career.factors.karakaScore >= 0 ? '+' : ''}${kundliScores.career.factors.karakaScore || 0}/3</div>
                            <div><strong>Yogas:</strong> ${kundliScores.career.factors.yogaScore >= 0 ? '+' : ''}${kundliScores.career.factors.yogaScore || 0}/3</div>
                            <div><strong>Aspects:</strong> ${kundliScores.career.factors.aspectsScore >= 0 ? '+' : ''}${kundliScores.career.factors.aspectsScore || 0}</div>
                            ${kundliScores.career.factors.lagnaReduction > 0 ? `<div style="color: #d32f2f;"><strong>Lagna Reduction:</strong> -${(kundliScores.career.factors.lagnaReduction * 100).toFixed(0)}%</div>` : ''}
                        </div>
                        ` : ''}
                        
                        ${kundliScores.career.factors.houseBreakdown ? `
                        <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 4px;">
                            <strong style="display: block; margin-bottom: 8px; color: #ff9800;">${scoreTexts.houseStrength} ${language === 'hi' ? 'विवरण' : 'Details'}:</strong>
                            ${kundliScores.career.factors.houseBreakdown.map(h => `
                                <div style="margin-bottom: 8px; font-size: 13px;">
                                    <strong>${getOrdinal(h.house, language)} ${language === 'hi' ? 'भाव' : 'House'}:</strong> ${h.score >= 0 ? '+' : ''}${h.score} points
                                    ${h.planets && h.planets.length > 0 ? `
                                        <div style="margin-left: 15px; margin-top: 4px; color: #666;">
                                            ${h.planets.map(p => {
                                                const planetName = PLANET_NAMES[language] && PLANET_NAMES[language][p.planet] ? PLANET_NAMES[language][p.planet] : p.planet;
                                                return `${planetName}: ${p.points >= 0 ? '+' : ''}${p.points} (${p.details})`;
                                            }).join('<br>')}
                                            ${h.multipleMaleficsPenalty && h.multipleMaleficsPenalty < 0 ? `<br><span style="color: #d32f2f;">Multiple Malefics Penalty: ${h.multipleMaleficsPenalty}</span>` : ''}
                                        </div>
                                    ` : '<span style="color: #999; margin-left: 10px;">No planets</span>'}
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                        
                        ${kundliScores.career.factors.lordBreakdown ? `
                        <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 4px;">
                            <strong style="display: block; margin-bottom: 8px; color: #ff9800;">${scoreTexts.lordStrength} ${language === 'hi' ? 'विवरण' : 'Details'}:</strong>
                            ${kundliScores.career.factors.lordBreakdown.map(l => {
                                const lordName = PLANET_NAMES[language] && PLANET_NAMES[language][l.lord] ? PLANET_NAMES[language][l.lord] : l.lord;
                                return `
                                <div style="margin-bottom: 8px; font-size: 13px;">
                                    <strong>${getOrdinal(l.house, language)} ${language === 'hi' ? 'भाव स्वामी' : 'House Lord'} (${lordName}):</strong> ${l.score >= 0 ? '+' : ''}${l.score} points
                                    ${l.details ? `<div style="margin-left: 15px; margin-top: 4px; color: #666;">${l.details}</div>` : ''}
                                </div>
                                `;
                            }).join('')}
                        </div>
                        ` : ''}
                        
                        ${kundliScores.career.factors.yogaBreakdown ? `
                        <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 4px;">
                            <strong style="display: block; margin-bottom: 8px; color: #ff9800;">${scoreTexts.yogas} ${language === 'hi' ? 'विवरण' : 'Details'}:</strong>
                            ${kundliScores.career.factors.yogaBreakdown.good && kundliScores.career.factors.yogaBreakdown.good.length > 0 ? `
                                <div style="margin-bottom: 6px;">
                                    <strong style="color: #2e7d32;">${language === 'hi' ? 'शुभ योग' : 'Good Yogas'}:</strong>
                                    ${kundliScores.career.factors.yogaBreakdown.good.map(y => `<div style="margin-left: 15px; margin-top: 4px; color: #666; font-size: 13px;">${y.name}: +${y.points}</div>`).join('')}
                                </div>
                            ` : ''}
                            ${kundliScores.career.factors.yogaBreakdown.bad && kundliScores.career.factors.yogaBreakdown.bad.length > 0 ? `
                                <div>
                                    <strong style="color: #d32f2f;">${language === 'hi' ? 'अशुभ योग' : 'Bad Yogas'}:</strong>
                                    ${kundliScores.career.factors.yogaBreakdown.bad.map(y => `<div style="margin-left: 15px; margin-top: 4px; color: #666; font-size: 13px;">${y.name}: ${y.points}</div>`).join('')}
                                </div>
                            ` : ''}
                            ${(!kundliScores.career.factors.yogaBreakdown.good || kundliScores.career.factors.yogaBreakdown.good.length === 0) && 
                              (!kundliScores.career.factors.yogaBreakdown.bad || kundliScores.career.factors.yogaBreakdown.bad.length === 0) ? 
                              `<span style="color: #999; font-size: 13px;">${language === 'hi' ? 'कोई प्रासंगिक योग नहीं' : 'No relevant yogas'}</span>` : ''}
                        </div>
                        ` : ''}
                        
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 2px solid #ff9800;">
                            <strong>${scoreTexts.rawScore}:</strong> ${kundliScores.career.factors.rawTotal >= 0 ? '+' : ''}${kundliScores.career.factors.rawTotal} → 
                            <strong>${scoreTexts.finalRating}:</strong> ${kundliScores.career.score.toFixed(1)}/10
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.3); border-radius: 6px;">
                        <p style="color: white; font-size: 12px; margin: 0; line-height: 1.6;">
                            <strong>${scoreTexts.method}:</strong> ${scoreTexts.methodText}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Generate planetary analysis
    let planetaryHTML = '<div class="strength-planetary-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0;">';
    
    for (const [planet, planetInfo] of Object.entries(planetsData)) {
        if (planet === 'Ascendant' || planet === 'ayanamsa' || !planetInfo || !planetInfo.current_sign) continue;
        
        const shadbala = calculateShadbala(planet, planetInfo, planetsData, ascendantSign, shadbalaApiData);
        const dignity = calculatePlanetaryDignity(planet, planetInfo);
        const combust = isPlanetCombust(planet, planetInfo, planetsData);
        const planetHouse = getRelativeHouseNumber(ascendantSign, planetInfo.current_sign);
        const isRetro = planetInfo.isRetro === true || planetInfo.isRetro === 'true';
        
        // Only show planets with Shadbala API data - skip if not available
        if (!shadbala || !shadbala.fromApi) continue;
        
        const translatedPlanetName = PLANET_NAMES[language] && PLANET_NAMES[language][planet] 
            ? PLANET_NAMES[language][planet] 
            : planet;
        
        const dignityText = dignity ? texts[dignity.type] || dignity.type : texts.neutral;
        const dignityStrength = dignity ? dignity.strength : 50;
        
        let statusBadges = '';
        if (isRetro) {
            statusBadges += `<span style="background: #ff9800; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; margin-right: 5px;">${texts.retrograde}</span>`;
        }
        if (combust) {
            statusBadges += `<span style="background: #f44336; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px;">${texts.combust}</span>`;
        }
        
        // Use Shadbala value from API only - skip if not available
        if (!shadbala || !shadbala.fromApi) {
            continue; // Skip planets without API data
        }
        
        // Use Shadbala value from API and its category
        const shadbalaValue = shadbala.shadbala;
        const strengthLevel = shadbala.strengthCategory; // 'strong', 'moderate', or 'weak'
        const strengthCategory = shadbala.strengthCategory;
        const displayStrength = shadbala.displayStrength || 50;
        
        const strengthColorBar = getStrengthColor(strengthLevel);
        
        planetaryHTML += `
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${strengthColorBar}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="margin-top: 0; color: #1a1a1a;">${translatedPlanetName}</h3>
                <div style="margin: 10px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span><strong>${texts.dignity}:</strong></span>
                        <span style="color: ${strengthColorBar}; font-weight: 600;">${dignityText}</span>
                    </div>
                    ${shadbala ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span><strong>${texts.shadbala}:</strong></span>
                            <span style="font-weight: 600;">${shadbalaValue.toFixed(1)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span><strong>${language === 'hi' ? 'श्रेणी' : 'Category'}:</strong></span>
                            <span style="color: ${strengthColorBar}; font-weight: 600; text-transform: capitalize;">${texts[strengthLevel] || strengthLevel}</span>
                        </div>
                        ${shadbala.fromApi && shadbala.rupas ? `
                            <div style="font-size: 12px; color: #666; margin-top: 4px;">
                                <div>Rupas: ${shadbala.rupas.toFixed(3)} | Ishta Phala: ${shadbala.ishtaPhala?.toFixed(2) || 'N/A'} | Kashta Phala: ${shadbala.kashtaPhala?.toFixed(2) || 'N/A'}</div>
                                ${shadbala.percentageStrength ? `<div>Percentage Strength: ${shadbala.percentageStrength.toFixed(2)}%</div>` : ''}
                            </div>
                        ` : ''}
                        ${!shadbala.fromApi ? `
                            <div style="font-size: 12px; color: #666; margin-top: 8px;">
                                <div>Positional: ${shadbala.sthanaBala}% | Directional: ${shadbala.digBala}%</div>
                                <div>Aspects: ${texts.beneficial} ${shadbala.beneficialAspects}% | ${texts.malefic} ${shadbala.maleficAspects}%</div>
                            </div>
                        ` : ''}
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                        <span><strong>${texts.house}:</strong></span>
                        <span>${getOrdinal(planetHouse, language)}</span>
                    </div>
                    ${statusBadges ? `<div style="margin-top: 10px;">${statusBadges}</div>` : ''}
                    <div style="margin-top: 12px;">
                        <div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="background: ${strengthColorBar}; height: 100%; width: ${displayStrength}%; transition: width 0.3s;"></div>
                        </div>
                        <div style="text-align: center; margin-top: 5px; font-size: 14px; font-weight: 600; color: ${strengthColorBar};">
                            Shadbala: ${shadbalaValue.toFixed(1)} - ${texts[strengthLevel] || strengthLevel}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    planetaryHTML += '</div>';
    
    // Generate house lord analysis
    let houseLordHTML = '<div class="strength-house-lord-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; margin: 30px 0;">';
    
    // Focus on important houses: 1, 2, 3, 4, 5, 7, 9, 10, 11, 12
    const importantHouses = [1, 2, 3, 4, 5, 7, 9, 10, 11, 12];
    
    for (const houseNum of importantHouses) {
        const lordStrength = calculateHouseLordStrength(houseNum, ascendantSign, planetsData);
        if (!lordStrength) continue;
        
        const translatedLordName = PLANET_NAMES[language] && PLANET_NAMES[language][lordStrength.lord]
            ? PLANET_NAMES[language][lordStrength.lord]
            : lordStrength.lord;
        
        const dignityText = lordStrength.dignity 
            ? texts[lordStrength.dignity.type] || lordStrength.dignity.type 
            : texts.neutral;
        
        const strengthLevel = lordStrength.totalStrength >= 75 ? 'strong' 
            : lordStrength.totalStrength >= 60 ? 'good' 
            : lordStrength.totalStrength >= 45 ? 'moderate' 
            : 'weak';
        const strengthColorBar = getStrengthColor(strengthLevel);
        
        houseLordHTML += `
            <div style="background: white; padding: 18px; border-radius: 8px; border-top: 3px solid ${strengthColorBar}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 10px;">
                    ${getOrdinal(houseNum, language)} ${texts.house} ${texts.lord}
                </div>
                <div style="font-size: 14px; color: #555; margin-bottom: 8px;">
                    <strong>${translatedLordName}</strong> ${texts.lordInHouse} ${getOrdinal(lordStrength.lordHouse, language)}
                </div>
                <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                    ${texts.dignity}: <span style="color: ${strengthColorBar}; font-weight: 600;">${dignityText}</span>
                </div>
                <div style="margin-top: 10px;">
                    <div style="background: #e0e0e0; height: 6px; border-radius: 3px; overflow: hidden;">
                        <div style="background: ${strengthColorBar}; height: 100%; width: ${lordStrength.totalStrength}%;"></div>
                    </div>
                    <div style="text-align: center; margin-top: 4px; font-size: 12px; font-weight: 600; color: ${strengthColorBar};">
                        ${lordStrength.totalStrength}%
                    </div>
                </div>
            </div>
        `;
    }
    
    houseLordHTML += '</div>';
    
    // Add criteria note based on Shadbala thresholds
    const criteriaNote = language === 'hi' 
        ? '<p style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 4px; font-size: 14px; color: #856404;"><strong>शक्ति मानदंड:</strong> ग्रह <strong>मजबूत</strong> है यदि शड्बल ≥ 480, <strong>मध्यम</strong> है यदि 350-479, और <strong>कमजोर</strong> है यदि &lt; 350।</p>'
        : '<p style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 4px; font-size: 14px; color: #856404;"><strong>Strength Criteria:</strong> A planet is <strong>Strong</strong> if Shadbala ≥ 480, <strong>Moderate</strong> if 350-479, and <strong>Weak</strong> if &lt; 350.</p>';
    
    return `
    <div class="strength-assessment-section article-section" id="chart-strength">
        <h1 style="color: #1a1a1a; margin-bottom: 30px; font-size: 28px; margin-top: 0;">${texts.title}</h1>
        ${criteriaNote}
        ${overallHTML}
        ${kundliRatingHTML}
        
        <h2 style="color: #1a1a1a; margin: 40px 0 20px 0; font-size: 22px;">${texts.planetaryAnalysis}</h2>
        ${planetaryHTML}
        
        <h2 style="color: #1a1a1a; margin: 40px 0 20px 0; font-size: 22px;">${texts.houseLordAnalysis}</h2>
        ${houseLordHTML}
    </div>
    `;
}

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

const SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const KENDRA_HOUSES = [1, 4, 7, 10];
const TRIKONA_HOUSES = [1, 5, 9];
const DUSTHANA_HOUSES = [6, 8, 12];
const PLANET_LIST = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const MALIFIC_PLANETS = ['Saturn', 'Mars', 'Rahu', 'Ketu'];

// Helper: Check if planet is malefic (natural malefics: Mars, Saturn, Sun)
function isMalefic(planet) {
    return ['Mars', 'Saturn', 'Sun'].includes(planet);
}
const BENEFIC_PLANETS = ['Jupiter', 'Venus', 'Mercury'];

let chatbotKnowledge = [];
let chatbotLanguage = 'en';
let chatbotReady = false;

const PLANET_DIGNITIES = {
    Sun: { own: [5], exalted: 1, debilitated: 7 },
    Moon: { own: [4], exalted: 2, debilitated: 8 },
    Mars: { own: [1, 8], exalted: 10, debilitated: 4 },
    Mercury: { own: [3, 6], exalted: 6, debilitated: 12 },
    Jupiter: { own: [9, 12], exalted: 4, debilitated: 10 },
    Venus: { own: [2, 7], exalted: 12, debilitated: 6 },
    Saturn: { own: [10, 11], exalted: 7, debilitated: 1 }
};

// Moolatrikona signs (special dignity between own sign and exaltation)
const MOOLATRIKONA = {
    Sun: 5,      // Leo
    Moon: 4,     // Cancer
    Mars: 1,     // Aries
    Mercury: 6,  // Virgo
    Jupiter: 9,  // Sagittarius
    Venus: 7,    // Libra
    Saturn: 11   // Aquarius
};

// Planetary relationships (friendly/enemy)
const PLANETARY_RELATIONSHIPS = {
    Sun: { friends: ['Moon', 'Mars', 'Jupiter'], enemies: ['Venus', 'Saturn'], neutral: ['Mercury'] },
    Moon: { friends: ['Sun', 'Mercury'], enemies: ['Mars', 'Saturn'], neutral: ['Jupiter', 'Venus'] },
    Mars: { friends: ['Sun', 'Moon', 'Jupiter'], enemies: ['Mercury'], neutral: ['Venus', 'Saturn'] },
    Mercury: { friends: ['Sun', 'Venus'], enemies: ['Moon'], neutral: ['Mars', 'Jupiter', 'Saturn'] },
    Jupiter: { friends: ['Sun', 'Moon', 'Mars'], enemies: ['Mercury', 'Venus'], neutral: ['Saturn'] },
    Venus: { friends: ['Mercury', 'Saturn'], enemies: ['Sun', 'Moon'], neutral: ['Mars', 'Jupiter'] },
    Saturn: { friends: ['Mercury', 'Venus'], enemies: ['Sun', 'Moon', 'Mars'], neutral: ['Jupiter'] }
};

/**
 * Get planetary relationship (friend, enemy, neutral, same)
 * Global helper function for use across all prediction functions
 */
function getPlanetaryRelationship(planet1, planet2) {
    if (planet1 === planet2) return 'same';
    if (planet1 === 'Rahu' || planet1 === 'Ketu' || planet2 === 'Rahu' || planet2 === 'Ketu') {
        return 'neutral'; // Rahu/Ketu relationships not defined in standard system
    }
    const relationship = PLANETARY_RELATIONSHIPS[planet1];
    if (!relationship) return 'neutral';
    if (relationship.friends.includes(planet2)) return 'friend';
    if (relationship.enemies.includes(planet2)) return 'enemy';
    return 'neutral';
}

// Aspect (Drishti) patterns in Vedic astrology
const ASPECT_PATTERNS = {
    // Planets aspect specific houses from their position
    // 1st, 7th house: full aspect (100%)
    // 3rd, 10th house: 75% aspect (Mars/Saturn/Jupiter special)
    // 5th, 9th house: 50% aspect (Jupiter special)
    // All planets aspect 7th house (100%)
    // Mars aspects 4th and 8th (75%)
    // Saturn aspects 3rd and 10th (75%)
    // Jupiter aspects 5th and 9th (50%)
    getAspects: function(planet, planetHouse, planetSign) {
        const aspects = {};
        
        // All planets aspect 7th house (full aspect)
        const aspect7th = ((planetHouse + 6 - 1) % 12) + 1;
        aspects[aspect7th] = { strength: 100, type: 'full' };
        
        if (planet === 'Mars') {
            // Mars aspects 4th and 8th houses (75%)
            const aspect4th = ((planetHouse + 3 - 1) % 12) + 1;
            const aspect8th = ((planetHouse + 7 - 1) % 12) + 1;
            aspects[aspect4th] = { strength: 75, type: 'special' };
            aspects[aspect8th] = { strength: 75, type: 'special' };
        }
        
        if (planet === 'Saturn') {
            // Saturn aspects 3rd and 10th houses (75%)
            const aspect3rd = ((planetHouse + 2 - 1) % 12) + 1;
            const aspect10th = ((planetHouse + 9 - 1) % 12) + 1;
            aspects[aspect3rd] = { strength: 75, type: 'special' };
            aspects[aspect10th] = { strength: 75, type: 'special' };
        }
        
        if (planet === 'Jupiter') {
            // Jupiter aspects 5th and 9th houses (50%)
            const aspect5th = ((planetHouse + 4 - 1) % 12) + 1;
            const aspect9th = ((planetHouse + 8 - 1) % 12) + 1;
            aspects[aspect5th] = { strength: 50, type: 'benefic' };
            aspects[aspect9th] = { strength: 50, type: 'benefic' };
        }
        
        return aspects;
    }
};

// Shadbala (Six-fold strength) calculation system
// Uses ONLY API data - no fallback calculations
function calculateShadbala(planet, planetInfo, planetsData, ascendantSign, shadbalaApiData = null) {
    if (!planetsData || !planetInfo) return null;
    
    // Only use API data - return null if not available
    if (!shadbalaApiData || !shadbalaApiData[planet]) {
        return null;
    }
    
    // Use real Shadbala API data
    if (shadbalaApiData && shadbalaApiData[planet]) {
        const apiData = shadbalaApiData[planet];
        const sign = planetInfo.current_sign;
        const house = getRelativeHouseNumber(ascendantSign, sign);
        
        // Parse API data - use Shadbala value (sum of all six strengths)
        const shadbalaValue = apiData.Shadbala || 0;
        const rupas = apiData.rupas || 0;
        const percentageStrength = apiData.percentage_strength || 0;
        const ishtaPhala = apiData.ishta_phala || 0;
        const kashtaPhala = apiData.kashta_phala || 0;
        
        // Categorize based on Shadbala value (from image criteria):
        // Strong: >= 480 (Shadbala is sum of all six strengths)
        // Moderate: 350-479
        // Weak: < 350
        let strengthCategory = 'moderate';
        let displayPercentage = 50; // For visualization bar (0-100%)
        
        if (shadbalaValue >= 480) {
            strengthCategory = 'strong';
            // Map 480+ to 70-100% for display bar
            // Typical range: 480-600, map to 70-100%
            displayPercentage = 70 + Math.min(30, ((shadbalaValue - 480) / 120) * 30);
        } else if (shadbalaValue < 350) {
            strengthCategory = 'weak';
            // Map <350 to 0-50% for display bar
            // Typical range: 200-349, map to 0-50%
            displayPercentage = (shadbalaValue / 350) * 50;
            if (shadbalaValue < 200) displayPercentage = (shadbalaValue / 200) * 30; // Very weak planets
        } else {
            strengthCategory = 'moderate';
            // Map 350-479 to 50-70% for display bar
            displayPercentage = 50 + ((shadbalaValue - 350) / 130) * 20;
        }
        
        // Ensure display percentage is within 0-100%
        displayPercentage = Math.max(0, Math.min(100, displayPercentage));
        
        // Calculate aspects for additional info
        let beneficialAspects = 0;
        let maleficAspects = 0;
        
        if (planetsData) {
            for (const [otherPlanet, otherInfo] of Object.entries(planetsData)) {
                if (otherPlanet === planet || otherPlanet === 'Ascendant' || otherPlanet === 'ayanamsa') continue;
                if (!otherInfo.current_sign) continue;
                
                const otherHouse = getRelativeHouseNumber(ascendantSign, otherInfo.current_sign);
                const aspects = ASPECT_PATTERNS.getAspects(otherPlanet, otherHouse, otherInfo.current_sign);
                
                if (aspects[house]) {
                    const aspectStrength = aspects[house].strength;
                    if (BENEFIC_PLANETS.includes(otherPlanet)) {
                        beneficialAspects += aspectStrength;
                    } else if (MALIFIC_PLANETS.includes(otherPlanet)) {
                        maleficAspects += aspectStrength;
                    }
                }
            }
        }
        
        return {
            shadbala: shadbalaValue,
            rupas: rupas,
            percentageStrength: percentageStrength,
            ishtaPhala: ishtaPhala,
            kashtaPhala: kashtaPhala,
            totalShadbala: Math.round(shadbalaValue), // Use Shadbala value (sum of six strengths)
            displayStrength: Math.round(displayPercentage), // For display bars (0-100%)
            strengthCategory: strengthCategory, // 'strong', 'moderate', or 'weak' based on thresholds
            beneficialAspects: Math.round(beneficialAspects),
            maleficAspects: Math.round(maleficAspects),
            fromApi: true
        };
    }
    
    // No fallback - return null if API data not available
    return null;
}

// Calculate planetary dignity status
function calculatePlanetaryDignity(planet, planetInfo) {
    if (!planetInfo || !planetInfo.current_sign) return null;
    
    const dignities = PLANET_DIGNITIES[planet];
    if (!dignities) return null; // Rahu/Ketu
    
    const sign = planetInfo.current_sign;
    const isOwnSign = dignities.own.includes(sign);
    const isExalted = dignities.exalted === sign;
    const isMoolatrikona = MOOLATRIKONA[planet] === sign;
    const isDebilitated = dignities.debilitated === sign;
    
    let dignityType = 'neutral';
    let dignityStrength = 50;
    
    if (isOwnSign) {
        dignityType = 'own';
        dignityStrength = 100;
    } else if (isExalted) {
        dignityType = 'exalted';
        dignityStrength = 90;
    } else if (isMoolatrikona) {
        dignityType = 'moolatrikona';
        dignityStrength = 85;
    } else if (isDebilitated) {
        dignityType = 'debilitated';
        dignityStrength = 20;
    } else {
        // Check friendly/enemy relationship with sign lord
        const signLord = ZODIAC_LORDS[sign];
        const relationship = PLANETARY_RELATIONSHIPS[planet];
        
        if (relationship) {
            if (relationship.friends.includes(signLord)) {
                dignityType = 'friendly';
                dignityStrength = 60;
            } else if (relationship.enemies.includes(signLord)) {
                dignityType = 'enemy';
                dignityStrength = 40;
            } else {
                dignityType = 'neutral';
                dignityStrength = 50;
            }
        }
    }
    
    return {
        type: dignityType,
        strength: dignityStrength,
        isOwnSign,
        isExalted,
        isMoolatrikona,
        isDebilitated,
        sign
    };
}

// Check if planet is combust (too close to Sun)
function isPlanetCombust(planet, planetInfo, planetsData) {
    if (planet === 'Sun') return false; // Sun cannot be combust
    
    const sunInfo = planetsData?.Sun;
    if (!sunInfo || !planetInfo) return false;
    
    // Planet is combust if within 8.5 degrees of Sun (simplified)
    const sunSign = sunInfo.current_sign;
    const planetSign = planetInfo.current_sign;
    
    if (sunSign !== planetSign) return false; // Different signs = not combust
    
    const sunDegree = sunInfo.normDegree || 0;
    const planetDegree = planetInfo.normDegree || 0;
    const distance = Math.abs(planetDegree - sunDegree);
    
    return distance <= 8.5; // Within 8.5 degrees = combust
}

// Calculate house lord strength
function calculateHouseLordStrength(houseNumber, ascendantSign, planetsData) {
    // Get the sign of the house
    let houseSign = ascendantSign + houseNumber - 1;
    if (houseSign > 12) houseSign -= 12;
    
    // Get the lord of that sign
    const houseLord = ZODIAC_LORDS[houseSign];
    if (!houseLord) return null;
    
    // Find the planet data
    const lordInfo = planetsData[houseLord];
    if (!lordInfo) return null;
    
    const lordSign = lordInfo.current_sign;
    const lordHouse = getRelativeHouseNumber(ascendantSign, lordSign);
    
    // Calculate strength based on:
    // 1. Dignity of the lord
    const dignity = calculatePlanetaryDignity(houseLord, lordInfo);
    
    // 2. House placement
    let houseStrength = 50;
    if (KENDRA_HOUSES.includes(lordHouse)) houseStrength = 80;
    else if (TRIKONA_HOUSES.includes(lordHouse)) houseStrength = 70;
    else if (DUSTHANA_HOUSES.includes(lordHouse)) houseStrength = 40;
    else houseStrength = 50;
    
    // 3. Special house positions
    if (houseNumber === 1 && lordHouse === 1) houseStrength = 100; // Ascendant lord in ascendant
    if (houseNumber === 10 && lordHouse === 10) houseStrength = 95; // 10th lord in 10th
    
    // Calculate total strength
    const dignityStrength = dignity ? dignity.strength : 50;
    const totalStrength = (dignityStrength + houseStrength) / 2;
    
    return {
        houseNumber,
        lord: houseLord,
        lordSign,
        lordHouse,
        dignity: dignity,
        houseStrength,
        totalStrength: Math.round(totalStrength)
    };
}

// Calculate overall chart strength
function calculateOverallChartStrength(planetsData, ascendantSign, shadbalaApiData = null) {
    if (!planetsData || !ascendantSign) return null;
    
    const planetaryStrengths = [];
    const houseLordStrengths = [];
    
    // Calculate strength for each planet
    for (const [planet, planetInfo] of Object.entries(planetsData)) {
        if (planet === 'Ascendant' || planet === 'ayanamsa') continue;
        if (!planetInfo || !planetInfo.current_sign) continue;
        
        const shadbala = calculateShadbala(planet, planetInfo, planetsData, ascendantSign, shadbalaApiData);
        if (shadbala) {
            // For API data, use the Shadbala value; for calculated, use totalShadbala
            const strengthValue = shadbala.fromApi ? shadbala.shadbala : shadbala.totalShadbala;
            planetaryStrengths.push(strengthValue);
        }
    }
    
    // Calculate strength for each house lord
    for (let houseNum = 1; houseNum <= 12; houseNum++) {
        const lordStrength = calculateHouseLordStrength(houseNum, ascendantSign, planetsData);
        if (lordStrength) {
            houseLordStrengths.push(lordStrength.totalStrength);
        }
    }
    
    // Calculate averages
    const avgPlanetaryStrength = planetaryStrengths.length > 0
        ? planetaryStrengths.reduce((a, b) => a + b, 0) / planetaryStrengths.length
        : 415; // Default to moderate range (350-479 average)
    
    const avgHouseLordStrength = houseLordStrengths.length > 0
        ? houseLordStrengths.reduce((a, b) => a + b, 0) / houseLordStrengths.length
        : 50; // For house lords, keep 0-100 scale
    
    // For API Shadbala values, they're already in the 200-600 range
    // Normalize for overall strength calculation if needed
    let normalizedPlanetaryStrength = avgPlanetaryStrength;
    if (avgPlanetaryStrength > 100) {
        // This is likely API Shadbala value, normalize it
        // Strong >= 480, Moderate 350-479, Weak < 350
        if (avgPlanetaryStrength >= 480) {
            normalizedPlanetaryStrength = 85; // Strong
        } else if (avgPlanetaryStrength >= 350) {
            normalizedPlanetaryStrength = 60; // Moderate
        } else {
            normalizedPlanetaryStrength = 35; // Weak
        }
    }
    
    // Overall strength (weighted: 60% planetary, 40% house lords)
    const overallStrength = (normalizedPlanetaryStrength * 0.6) + (avgHouseLordStrength * 0.4);
    
    // Categorize overall strength
    let strengthCategory = 'moderate';
    if (overallStrength >= 75) strengthCategory = 'strong';
    else if (overallStrength >= 60) strengthCategory = 'good';
    else if (overallStrength >= 45) strengthCategory = 'moderate';
    else strengthCategory = 'weak';
    
    return {
        overallStrength: Math.round(overallStrength),
        category: strengthCategory,
        avgPlanetaryStrength: Math.round(avgPlanetaryStrength),
        avgHouseLordStrength: Math.round(avgHouseLordStrength),
        planetaryCount: planetaryStrengths.length,
        houseLordCount: houseLordStrengths.length
    };
}

// Job Timing Prediction System
function analyzeJobTiming(planetsData, ascendantSign, mahaDashaData, language = 'en', shadbalaApiData = null) {
    if (!planetsData || !ascendantSign || !mahaDashaData) return null;
    
    // Get house lords for job-related houses
    const getHouseLord = (houseNum) => {
        let houseSign = ascendantSign + houseNum - 1;
        if (houseSign > 12) houseSign -= 12;
        return ZODIAC_LORDS[houseSign];
    };
    
    const sixthLord = getHouseLord(6);
    const tenthLord = getHouseLord(10);
    const eleventhLord = getHouseLord(11);
    const ascendantLord = getHouseLord(1);
    const secondLord = getHouseLord(2);
    const seventhLord = getHouseLord(7);
    
    // Parse mahaDasha data structure
    let parsedData = mahaDashaData;
    if (mahaDashaData.output && typeof mahaDashaData.output === 'object') {
        parsedData = mahaDashaData.output;
    } else if (typeof mahaDashaData === 'string') {
        try {
            parsedData = JSON.parse(mahaDashaData);
            if (parsedData.output) parsedData = parsedData.output;
        } catch (e) {
            console.error('Error parsing mahaDashaData:', e);
            return null;
        }
    }
    
    const now = new Date();
    const jobPeriods = [];
    const favorablePlanets = [sixthLord, tenthLord, eleventhLord, ascendantLord];
    
    // Analyze all upcoming dasha periods
    for (const [mahaDashaPlanet, antarDasas] of Object.entries(parsedData)) {
        for (const [antarDashaPlanet, period] of Object.entries(antarDasas)) {
            if (!period.start_time || !period.end_time) continue;
            
            // Parse dates
            let startDate, endDate;
            try {
                if (period.start_time.includes(' ')) {
                    startDate = new Date(period.start_time.replace(' ', 'T'));
                    endDate = new Date(period.end_time.replace(' ', 'T'));
                } else {
                    startDate = new Date(period.start_time);
                    endDate = new Date(period.end_time);
                }
            } catch (e) {
                continue;
            }
            
            // Only consider future periods or current period
            if (endDate < now) continue;
            
            // Calculate job timing score using structured method
            const mahaPlanetInfo = planetsData[mahaDashaPlanet];
            const antarPlanetInfo = planetsData[antarDashaPlanet];
            
            // Get planet dignities
            const mahaDignity = calculatePlanetaryDignity(mahaDashaPlanet, mahaPlanetInfo);
            const antarDignity = calculatePlanetaryDignity(antarDashaPlanet, antarPlanetInfo);
            
            // Get Shadbala
            const mahaShadbala = mahaPlanetInfo ? calculateShadbala(mahaDashaPlanet, mahaPlanetInfo, planetsData, ascendantSign, shadbalaApiData) : null;
            const antarShadbala = antarPlanetInfo ? calculateShadbala(antarDashaPlanet, antarPlanetInfo, planetsData, ascendantSign, shadbalaApiData) : null;
            
            // Get houses ruled by each planet
            const getHousesRuledBy = (planet) => {
                const houses = [];
                for (let houseNum = 1; houseNum <= 12; houseNum++) {
                    const lord = getHouseLord(houseNum);
                    if (lord === planet) {
                        houses.push(houseNum);
                    }
                }
                return houses;
            };
            
            const mahaHousesRuled = getHousesRuledBy(mahaDashaPlanet);
            const antarHousesRuled = getHousesRuledBy(antarDashaPlanet);
            
            // Calculate MD_base_score for job (0-40)
            let mdBaseScore = 0;
            let mdReasons = [];
            
            // 1. Role for career/job (0-20)
            if (mahaDashaPlanet === tenthLord) {
                mdBaseScore += 20;
                mdReasons.push(`MD of ${tenthLord} (10th lord - career source)`);
            } else if (mahaDashaPlanet === sixthLord) {
                mdBaseScore += 18;
                mdReasons.push(`MD of ${sixthLord} (6th lord - work/service)`);
            } else if (mahaDashaPlanet === eleventhLord) {
                mdBaseScore += 15;
                mdReasons.push(`MD of ${eleventhLord} (11th lord - gains)`);
            } else if (mahaDashaPlanet === ascendantLord) {
                mdBaseScore += 12;
                mdReasons.push(`MD of ${ascendantLord} (Lagna lord - overall strength)`);
            } else {
                mdBaseScore += 5;
            }
            
            // 2. Dignity of MD lord (0-10 or -5)
            if (mahaDignity) {
                if (mahaDignity.isExalted) {
                    mdBaseScore += 10;
                    mdReasons.push(`Exalted ${mahaDashaPlanet}`);
                } else if (mahaDignity.isOwnSign || mahaDignity.isMoolatrikona) {
                    mdBaseScore += 8;
                    mdReasons.push(`Own sign ${mahaDashaPlanet}`);
                } else if (mahaDignity.type === 'friendly') {
                    mdBaseScore += 4;
                } else if (mahaDignity.type === 'neutral') {
                    mdBaseScore += 2;
                } else if (mahaDignity.isDebilitated) {
                    mdBaseScore -= 5;
                    mdReasons.push(`Debilitated ${mahaDashaPlanet} (may cause delays)`);
                }
            }
            
            // 3. Shadbala of MD lord (0-5)
            if (mahaShadbala && mahaShadbala.fromApi) {
                if (mahaShadbala.shadbala >= 480) {
                    mdBaseScore += 5;
                    mdReasons.push(`Strong ${mahaDashaPlanet} (Shadbala: ${mahaShadbala.shadbala.toFixed(1)})`);
                } else if (mahaShadbala.shadbala >= 350) {
                    mdBaseScore += 2;
                } else {
                    mdBaseScore += 0;
                    mdReasons.push(`Weak ${mahaDashaPlanet} (Shadbala: ${mahaShadbala.shadbala.toFixed(1)})`);
                }
            }
            
            // 4. Afflictions / support
            const isMahaRetro = mahaPlanetInfo?.isRetro === true || mahaPlanetInfo?.isRetro === 'true';
            if (isMahaRetro && isMalefic(mahaDashaPlanet)) {
                mdBaseScore -= 4; // Retrograde malefic
            }
            
            // Count malefic/benefic aspects
            const countMaleficAspects = (planet) => {
                if (!planetsData[planet]) return 0;
                const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
                let maleficCount = 0;
                for (const [otherPlanet, otherInfo] of Object.entries(planetsData)) {
                    if (otherPlanet === planet || otherPlanet === 'Ascendant' || otherPlanet === 'ayanamsa') continue;
                    if (!otherInfo.current_sign) continue;
                    const otherHouse = getRelativeHouseNumber(ascendantSign, otherInfo.current_sign);
                    const aspects = ASPECT_PATTERNS.getAspects(otherPlanet, otherHouse, otherInfo.current_sign);
                    if (aspects[planetHouse] && MALIFIC_PLANETS.includes(otherPlanet)) {
                        maleficCount++;
                    }
                }
                return maleficCount;
            };
            
            const countBeneficAspects = (planet) => {
                if (!planetsData[planet]) return 0;
                const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
                let beneficCount = 0;
                for (const [otherPlanet, otherInfo] of Object.entries(planetsData)) {
                    if (otherPlanet === planet || otherPlanet === 'Ascendant' || otherPlanet === 'ayanamsa') continue;
                    if (!otherInfo.current_sign) continue;
                    const otherHouse = getRelativeHouseNumber(ascendantSign, otherInfo.current_sign);
                    const aspects = ASPECT_PATTERNS.getAspects(otherPlanet, otherHouse, otherInfo.current_sign);
                    if (aspects[planetHouse] && BENEFIC_PLANETS.includes(otherPlanet)) {
                        beneficCount++;
                    }
                }
                return beneficCount;
            };
            
            const maleficAspectCount = countMaleficAspects(mahaDashaPlanet);
            if (maleficAspectCount >= 1) {
                mdBaseScore -= 3; // Strong malefic aspect (Saturn, Rahu, Mars)
            }
            
            const beneficAspectCount = countBeneficAspects(mahaDashaPlanet);
            if (beneficAspectCount >= 1) {
                mdBaseScore += 2; // Strong benefic aspect
            }
            
            mdBaseScore = Math.max(0, Math.min(40, mdBaseScore));
            
            // Calculate AD_job_raw (can be negative)
            let adJobRaw = 0;
            let adReasons = [];
            
            // 1. House-role weight for job - pick strongest
            const ninthLord = getHouseLord(9);
            const fifthLord = getHouseLord(5);
            const eighthLord = getHouseLord(8);
            const twelfthLord = getHouseLord(12);
            
            let adHouseRoleScore = 0;
            if (antarDashaPlanet === sixthLord || antarDashaPlanet === tenthLord || antarDashaPlanet === eleventhLord) {
                adHouseRoleScore = 20;
                adReasons.push(`AD of ${antarDashaPlanet} (${antarDashaPlanet === sixthLord ? '6th' : antarDashaPlanet === tenthLord ? '10th' : '11th'} lord - key job indicator)`);
            } else if (antarDashaPlanet === ascendantLord || antarDashaPlanet === secondLord || antarDashaPlanet === ninthLord) {
                adHouseRoleScore = 15;
                adReasons.push(`AD of ${antarDashaPlanet} (${antarDashaPlanet === ascendantLord ? 'Lagna' : antarDashaPlanet === secondLord ? '2nd' : '9th'} lord - supports career)`);
            } else if (antarDashaPlanet === fifthLord || antarDashaPlanet === seventhLord) {
                adHouseRoleScore = 10;
            } else if (antarDashaPlanet === eighthLord || antarDashaPlanet === twelfthLord) {
                adHouseRoleScore = -5;
                adReasons.push(`AD of ${antarDashaPlanet} (${antarDashaPlanet === eighthLord ? '8th' : '12th'} lord - obstacles/losses)`);
            } else {
                adHouseRoleScore = 6; // Others (3rd, 4th only)
            }
            adJobRaw += adHouseRoleScore;
            
            // 2. Dignity of AD lord
            if (antarDignity) {
                if (antarDignity.isExalted) {
                    adJobRaw += 6;
                } else if (antarDignity.isOwnSign || antarDignity.isMoolatrikona) {
                    adJobRaw += 5;
                } else if (antarDignity.type === 'friendly') {
                    adJobRaw += 3;
                } else if (antarDignity.type === 'neutral') {
                    adJobRaw += 1;
                } else if (antarDignity.type === 'enemy') {
                    adJobRaw -= 1;
                } else if (antarDignity.isDebilitated) {
                    adJobRaw -= 4;
                    if (antarDashaPlanet === 'Saturn') {
                        adReasons.push(`Debilitated Saturn (hard work, pressure, delays)`);
                    }
                }
            }
            
            // 3. Afflictions / benefit
            const isAntarRetro = antarPlanetInfo?.isRetro === true || antarPlanetInfo?.isRetro === 'true';
            if (isAntarRetro && isMalefic(antarDashaPlanet)) {
                adJobRaw -= 4; // Retrograde malefic
            }
            
            const antarBeneficAspectCount = countBeneficAspects(antarDashaPlanet);
            if (antarBeneficAspectCount >= 1) {
                adJobRaw += 3; // Strong benefic aspect
            }
            
            const antarMaleficAspectCount = countMaleficAspects(antarDashaPlanet);
            if (antarMaleficAspectCount >= 1) {
                adJobRaw -= 3; // Strong malefic aspect
            }
            
            // RULE: Soften penalties under strong career MD
            // If MD_job ≥ 28, cap AD penalties at -8, then add 20
            let adJob;
            if (mdBaseScore >= 28) {
                adJob = Math.max(adJobRaw, -8) + 20; // AD_job lies roughly 12-40
            } else {
                adJob = adJobRaw + 20; // Add 20 for baseline
            }
            adJob = Math.max(0, Math.min(40, adJob));
            
            // Calculate Synergy score (0-20)
            let synergyScore = 0;
            let synergyReasons = [];
            
            // 1. Functional friendliness and house linkage
            const getPlanetaryRelationship = (planet1, planet2) => {
                if (planet1 === planet2) return 'same';
                if (planet1 === 'Rahu' || planet1 === 'Ketu' || planet2 === 'Rahu' || planet2 === 'Ketu') {
                    return 'neutral';
                }
                const relationship = PLANETARY_RELATIONSHIPS[planet1];
                if (!relationship) return 'neutral';
                if (relationship.friends.includes(planet2)) return 'friend';
                if (relationship.enemies.includes(planet2)) return 'enemy';
                return 'neutral';
            };
            
            const relationship = getPlanetaryRelationship(mahaDashaPlanet, antarDashaPlanet);
            const jobHouses = [6, 10, 11, 1];
            const mdJobLink = mahaHousesRuled.some(h => jobHouses.includes(h)) || mahaDashaPlanet === sixthLord || mahaDashaPlanet === tenthLord || mahaDashaPlanet === eleventhLord || mahaDashaPlanet === ascendantLord;
            const adJobLink = antarHousesRuled.some(h => jobHouses.includes(h)) || antarDashaPlanet === sixthLord || antarDashaPlanet === tenthLord || antarDashaPlanet === eleventhLord || antarDashaPlanet === ascendantLord;
            
            if (mdJobLink && adJobLink) {
                if (relationship === 'friend' || (BENEFIC_PLANETS.includes(mahaDashaPlanet) && BENEFIC_PLANETS.includes(antarDashaPlanet))) {
                    synergyScore += 15;
                    synergyReasons.push(`Strong job house linkage (10th-6th-11th-lagna combination)`);
                } else if (relationship === 'neutral') {
                    synergyScore += 8;
                } else {
                    synergyScore += 3;
                }
            } else if (mdJobLink || adJobLink) {
                synergyScore += 5;
            }
            
            // Special combinations
            if ((mahaDashaPlanet === tenthLord && antarDashaPlanet === ascendantLord) ||
                (mahaDashaPlanet === ascendantLord && antarDashaPlanet === tenthLord)) {
                synergyScore += 5;
                synergyReasons.push(`10th lord + Lagna lord combination`);
            }
            
            // Negative synergy for 8th/12th involvement
            if ((mahaHousesRuled.includes(8) || mahaHousesRuled.includes(12)) &&
                (antarHousesRuled.includes(8) || antarHousesRuled.includes(12))) {
                synergyScore -= 5;
            }
            
            synergyScore = Math.max(0, Math.min(20, synergyScore));
            
            // Final job score: 0.4 * MD_job + 0.4 * AD_job + 0.2 * Syn_job
            const mdScaled = (mdBaseScore / 40) * 100;
            const adScaled = (adJob / 40) * 100;
            const synergyScaled = (synergyScore / 20) * 100;
            let favorabilityScore = 0.4 * mdScaled + 0.4 * adScaled + 0.2 * synergyScaled;
            
            // RULE: Floor for strong career MDs
            // If MD_job ≥ 28, enforce floor of 45
            if (mdBaseScore >= 28) {
                favorabilityScore = Math.max(favorabilityScore, 45);
            }
            
            // Ensure score is 0-100
            favorabilityScore = Math.max(0, Math.min(100, Math.round(favorabilityScore)));
            
            // Combine reasons
            let reasons = [...mdReasons, ...adReasons, ...synergyReasons];
            
            // Add specific context for Saturn, Rahu, Ketu
            if (antarDashaPlanet === 'Saturn' && antarDignity?.isDebilitated) {
                reasons.push(`Afflicted Saturn AD: jobs with heavy responsibility, gains via hard work but with stress, delays, and self-doubt`);
            }
            
            if (antarDashaPlanet === 'Rahu') {
                reasons.push(`Rahu AD: good for role changes, foreign/tech opportunities, but expect instability`);
            }
            
            if (antarDashaPlanet === 'Ketu' || mahaDashaPlanet === 'Ketu') {
                reasons.push(`Ketu period: may bring job changes, but unstable, short-term, or consulting roles`);
            }
            
            // Categorize favorability using new thresholds
            let category = 'moderate';
            if (favorabilityScore >= 80) {
                category = 'highly favorable';
            } else if (favorabilityScore >= 60) {
                category = 'favorable';
            } else if (favorabilityScore >= 40) {
                category = 'moderate';
            } else if (favorabilityScore >= 20) {
                category = 'challenging';
            } else {
                category = 'highly challenging';
            }
            
            // Only include periods with at least moderate favorability
            if (favorabilityScore >= 30 || 
                favorablePlanets.includes(mahaDashaPlanet) || 
                favorablePlanets.includes(antarDashaPlanet)) {
                
                jobPeriods.push({
                    mahaDasha: mahaDashaPlanet,
                    antarDasha: antarDashaPlanet,
                    startDate: startDate,
                    endDate: endDate,
                    startTime: period.start_time,
                    endTime: period.end_time,
                    favorabilityScore: favorabilityScore,
                    category: category,
                    reasons: reasons
                });
            }
        }
    }
    
    // Sort by timing (earliest first), then by favorability score (highest first)
    jobPeriods.sort((a, b) => {
        const dateDiff = a.startDate.getTime() - b.startDate.getTime();
        if (dateDiff !== 0) return dateDiff; // Sort by date first
        return b.favorabilityScore - a.favorabilityScore; // Then by score
    });
    
    // Limit to top 8 periods
    const topPeriods = jobPeriods.slice(0, 8);
    
    return {
        periods: topPeriods,
        sixthLord: sixthLord,
        tenthLord: tenthLord,
        eleventhLord: eleventhLord,
        ascendantLord: ascendantLord
    };
}

// Generate Job Timing Prediction HTML Section
function generateJobTimingSection(planetsData, ascendantSign, mahaDashaData, language = 'en', shadbalaApiData = null) {
    if (!planetsData || !ascendantSign || !mahaDashaData) return '';
    
    const analysis = analyzeJobTiming(planetsData, ascendantSign, mahaDashaData, language, shadbalaApiData);
    if (!analysis || !analysis.periods || analysis.periods.length === 0) return '';
    
    const texts = language === 'hi' ? {
        title: 'नौकरी/कार्य की भविष्यवाणी (Job Timing Prediction)',
        subtitle: 'अगले दशा काल में नौकरी की संभावनाएं',
        highlyFavorable: 'अत्यधिक अनुकूल',
        favorable: 'अनुकूल',
        moderate: 'मध्यम',
        challenging: 'चुनौतीपूर्ण',
        unfavorable: 'अनुकूल नहीं',
        mahaDasha: 'महादशा',
        antarDasha: 'अंतर दशा',
        period: 'अवधि',
        score: 'अंक',
        reasons: 'कारण',
        recommended: 'अनुशंसित',
        note: 'नोट',
        noteText: 'यह भविष्यवाणी वैदिक ज्योतिष सिद्धांतों पर आधारित है। वास्तविक समय में, बृहस्पति और शनि की गोचर भी महत्वपूर्ण भूमिका निभाती है।',
        sixthLord: 'षष्ठ भाव स्वामी (कार्य)',
        tenthLord: 'दशम भाव स्वामी (करियर)',
        eleventhLord: 'एकादश भाव स्वामी (लाभ)',
        timingGuidance: 'समय मार्गदर्शन'
    } : {
        title: 'Job Timing Prediction',
        subtitle: 'Upcoming favorable periods for employment opportunities',
        highlyFavorable: 'Highly Favorable',
        favorable: 'Favorable',
        moderate: 'Moderate',
        challenging: 'Challenging',
        unfavorable: 'Unfavorable',
        mahaDasha: 'Mahadasha',
        antarDasha: 'Antar Dasha',
        period: 'Period',
        score: 'Score',
        reasons: 'Reasons',
        recommended: 'Recommended',
        note: 'Note',
        noteText: 'This prediction is based on Vedic astrology principles. In real-time, Jupiter and Saturn transits also play important roles in activating job opportunities.',
        sixthLord: '6th House Lord (Work)',
        tenthLord: '10th House Lord (Career)',
        eleventhLord: '11th House Lord (Gains)',
        timingGuidance: 'Timing Guidance'
    };
    
    const getCategoryColor = (category) => {
        switch(category) {
            case 'highly favorable': return '#2e7d32';
            case 'favorable': return '#388e3c';
            case 'moderate': return '#f57c00';
            case 'challenging': return '#d32f2f';
            case 'unfavorable': return '#c62828';
            default: return '#666';
        }
    };
    
    const formatDate = (dateStr) => {
        try {
            let date;
            if (dateStr.includes(' ')) {
                date = new Date(dateStr.replace(' ', 'T'));
            } else {
                date = new Date(dateStr);
            }
            return date.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };
    
    let periodsHTML = '';
    analysis.periods.forEach((period, index) => {
        const mahaDashaName = PLANET_NAMES[language] && PLANET_NAMES[language][period.mahaDasha]
            ? PLANET_NAMES[language][period.mahaDasha]
            : period.mahaDasha;
        const antarDashaName = PLANET_NAMES[language] && PLANET_NAMES[language][period.antarDasha]
            ? PLANET_NAMES[language][period.antarDasha]
            : period.antarDasha;
        
        const categoryColor = getCategoryColor(period.category);
        const isRecommended = period.favorabilityScore >= 70;
        
        periodsHTML += `
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${categoryColor}; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${isRecommended ? `<div style="background: #ffd700; color: #8b5a00; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; font-weight: 600; font-size: 13px;">⭐ ${texts.recommended}</div>` : ''}
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div>
                        <h3 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 18px;">
                            ${index + 1}. ${mahaDashaName} - ${antarDashaName}
                        </h3>
                        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">
                            <strong>${texts.period}:</strong> ${formatDate(period.startTime)} - ${formatDate(period.endTime)}
                        </div>
                        <div style="display: inline-block; background: ${categoryColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
                            ${texts[period.category] || period.category}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 24px; font-weight: bold; color: ${categoryColor};">
                            ${period.favorabilityScore}
                        </div>
                        <div style="font-size: 11px; color: #666; text-transform: uppercase;">
                            ${texts.score}
                        </div>
                    </div>
                </div>
                ${period.reasons && period.reasons.length > 0 ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
                        <div style="font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px;">${texts.reasons}:</div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #666; line-height: 1.6;">
                            ${period.reasons.map(reason => `<li style="margin-bottom: 4px;">${reason}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    const sixthLordName = PLANET_NAMES[language] && PLANET_NAMES[language][analysis.sixthLord]
        ? PLANET_NAMES[language][analysis.sixthLord]
        : analysis.sixthLord;
    const tenthLordName = PLANET_NAMES[language] && PLANET_NAMES[language][analysis.tenthLord]
        ? PLANET_NAMES[language][analysis.tenthLord]
        : analysis.tenthLord;
    const eleventhLordName = PLANET_NAMES[language] && PLANET_NAMES[language][analysis.eleventhLord]
        ? PLANET_NAMES[language][analysis.eleventhLord]
        : analysis.eleventhLord;
    
    // Add formula explanation for Career/Job timing prediction
    const formulaSection = language === 'hi' ? '' : `
        <div style="margin-bottom: 25px; padding: 15px; background: #f5f5f5; border-radius: 6px; border-left: 4px solid #ff9800;">
            <h4 style="color: #ff9800; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Career/Job Score Calculation Formula</h4>
            
            <!-- Formula -->
            <div style="margin-bottom: 15px; padding: 12px; background: #fff3e0; border-radius: 4px; border-left: 3px solid #ff9800;">
                <strong style="display: block; margin-bottom: 8px; color: #e65100; font-size: 14px;">Formula:</strong>
                <div style="font-size: 13px; color: #bf360c; line-height: 1.6;">
                    <strong>Favorability Score = 0.4 × MD_career + 0.4 × AD_career + 0.2 × Synergy_career</strong><br>
                    <span style="margin-left: 20px;">• MD_career (0-40): Mahadasha career weight</span><br>
                    <span style="margin-left: 40px;">- House Role: 10th lord (20), Lagna/9th lords (15), 5th lord (10), 6th lord (5), Others (5)</span><br>
                    <span style="margin-left: 40px;">- Dignity: Exalted (+8), Own/Mooltrikona (+6), Friendly (+3), Neutral (+1), Enemy (-1), Debilitated (-5)</span><br>
                    <span style="margin-left: 40px;">- Shadbala: Strong (+4), Moderate (+2)</span><br>
                    <span style="margin-left: 40px;">- Afflictions: Retrograde malefic (-4), Malefic aspect (-3), Benefic aspect (+2)</span><br>
                    <span style="margin-left: 20px;">• AD_career (0-40): Antardasha career weight</span><br>
                    <span style="margin-left: 40px;">- House Role: 10th lord (22), Lagna/9th lords (18), 5th lord (12), 6th lord (5), Others (8)</span><br>
                    <span style="margin-left: 40px;">- Dignity: Exalted (+6), Own/Mooltrikona (+5), Friendly (+3), Neutral (+1), Enemy (-1), Debilitated (-4)</span><br>
                    <span style="margin-left: 40px;">- Afflictions: Retrograde malefic (-4), Malefic aspect (-3), Benefic aspect (+3)</span><br>
                    <span style="margin-left: 40px;">- Softening: If MD_career ≥ 28, cap AD penalties at -8, then add 20 baseline</span><br>
                    <span style="margin-left: 20px;">• Synergy_career (0-20): Planetary relationship and house linkage</span><br>
                    <span style="margin-left: 40px;">- Nature/Relationship (0-10): Friend/Benefic (7-10), Neutral (4-6), Enemy/Malefic (0-3)</span><br>
                    <span style="margin-left: 40px;">- House Linkage (0-10): Both planets linked to career houses (10/6/3/2/11/1) = 7-10, One linked = 4, 6th/8th/12th involvement reduces score</span><br>
                    <strong>Final Score (0-100) = 0.4 × (MD_career/40 × 100) + 0.4 × (AD_career/40 × 100) + 0.2 × (Synergy_career/20 × 100)</strong><br>
                    <span style="margin-left: 20px;">• If MD_career ≥ 28, enforce minimum floor of 45</span>
                </div>
            </div>
        </div>
    `;
    
    return `
    <div class="job-timing-section article-section" id="job-timing">
        <h1 style="color: #1a1a1a; margin-bottom: 10px; font-size: 28px; margin-top: 0;">${texts.title}</h1>
        <p style="color: #666; margin-bottom: 30px; font-size: 15px;">${texts.subtitle}</p>
        
        ${formulaSection}
        
        <div style="background: #f5f7fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 16px;">${texts.timingGuidance}</h3>
            <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.8; font-size: 14px;">
                <li><strong>${texts.sixthLord}:</strong> ${sixthLordName}</li>
                <li><strong>${texts.tenthLord}:</strong> ${tenthLordName}</li>
                <li><strong>${texts.eleventhLord}:</strong> ${eleventhLordName}</li>
            </ul>
        </div>
        
        ${periodsHTML}
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 30px; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                <strong>${texts.note}:</strong> ${texts.noteText}
            </p>
        </div>
    </div>
    `;
}

// Money Prediction Analysis
function analyzeMoneyTiming(planetsData, ascendantSign, mahaDashaData, language = 'en', shadbalaApiData = null) {
    if (!planetsData || !ascendantSign || !mahaDashaData) return null;
    
    const getHouseLord = (houseNum) => {
        let houseSign = ascendantSign + houseNum - 1;
        if (houseSign > 12) houseSign -= 12;
        return ZODIAC_LORDS[houseSign];
    };
    
    const getHousesRuledBy = (planet) => {
        const houses = [];
        for (let houseNum = 1; houseNum <= 12; houseNum++) {
            const lord = getHouseLord(houseNum);
            if (lord === planet) {
                houses.push(houseNum);
            }
        }
        return houses;
    };
    
    const getPlanetaryRelationship = (planet1, planet2) => {
        if (planet1 === planet2) return 'same';
        if (planet1 === 'Rahu' || planet1 === 'Ketu' || planet2 === 'Rahu' || planet2 === 'Ketu') {
            return 'neutral';
        }
        const relationship = PLANETARY_RELATIONSHIPS[planet1];
        if (!relationship) return 'neutral';
        if (relationship.friends.includes(planet2)) return 'friend';
        if (relationship.enemies.includes(planet2)) return 'enemy';
        return 'neutral';
    };
    
    const arePlanetsConjunct = (planet1, planet2) => {
        if (!planetsData[planet1] || !planetsData[planet2]) return false;
        return planetsData[planet1].current_sign === planetsData[planet2].current_sign;
    };
    
    const havePlanetaryExchange = (planet1, planet2) => {
        const houses1 = getHousesRuledBy(planet1);
        const houses2 = getHousesRuledBy(planet2);
        if (houses1.length === 0 || houses2.length === 0) return false;
        const house1 = getRelativeHouseNumber(ascendantSign, planetsData[planet1].current_sign);
        const house2 = getRelativeHouseNumber(ascendantSign, planetsData[planet2].current_sign);
        if (houses1.includes(house2) && houses2.includes(house1)) {
            return true;
        }
        if (houses2.includes(house1) || houses1.includes(house2)) {
            return true;
        }
        return false;
    };
    
    const countMaleficAspects = (planet) => {
        if (!planetsData[planet]) return 0;
        const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
        let maleficCount = 0;
        for (const [otherPlanet, otherInfo] of Object.entries(planetsData)) {
            if (otherPlanet === planet || otherPlanet === 'Ascendant' || otherPlanet === 'ayanamsa') continue;
            if (!otherInfo.current_sign) continue;
            const otherHouse = getRelativeHouseNumber(ascendantSign, otherInfo.current_sign);
            const aspects = ASPECT_PATTERNS.getAspects(otherPlanet, otherHouse, otherInfo.current_sign);
            if (aspects[planetHouse] && MALIFIC_PLANETS.includes(otherPlanet)) {
                maleficCount++;
            }
        }
        return maleficCount;
    };
    
    const countBeneficAspects = (planet) => {
        if (!planetsData[planet]) return 0;
        const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
        let beneficCount = 0;
        for (const [otherPlanet, otherInfo] of Object.entries(planetsData)) {
            if (otherPlanet === planet || otherPlanet === 'Ascendant' || otherPlanet === 'ayanamsa') continue;
            if (!otherInfo.current_sign) continue;
            const otherHouse = getRelativeHouseNumber(ascendantSign, otherInfo.current_sign);
            const aspects = ASPECT_PATTERNS.getAspects(otherPlanet, otherHouse, otherInfo.current_sign);
            if (aspects[planetHouse] && BENEFIC_PLANETS.includes(otherPlanet)) {
                beneficCount++;
            }
        }
        return beneficCount;
    };
    
    const secondLord = getHouseLord(2);
    const tenthLord = getHouseLord(10);
    const eleventhLord = getHouseLord(11);
    const ninthLord = getHouseLord(9);
    const lagnaLord = getHouseLord(1);
    const fifthLord = getHouseLord(5);
    const sixthLord = getHouseLord(6);
    const eighthLord = getHouseLord(8);
    const twelfthLord = getHouseLord(12);
    
    let parsedData = mahaDashaData;
    if (mahaDashaData.output && typeof mahaDashaData.output === 'object') {
        parsedData = mahaDashaData.output;
    } else if (typeof mahaDashaData === 'string') {
        try {
            parsedData = JSON.parse(mahaDashaData);
            if (parsedData.output) parsedData = parsedData.output;
        } catch (e) {
            return null;
        }
    }
    
    const now = new Date();
    const moneyPeriods = [];
    const wealthPlanets = [secondLord, tenthLord, eleventhLord];
    
    for (const [mahaDashaPlanet, antarDasas] of Object.entries(parsedData)) {
        for (const [antarDashaPlanet, period] of Object.entries(antarDasas)) {
            if (!period.start_time || !period.end_time) continue;
            
            let startDate, endDate;
            try {
                if (period.start_time.includes(' ')) {
                    startDate = new Date(period.start_time.replace(' ', 'T'));
                    endDate = new Date(period.end_time.replace(' ', 'T'));
                } else {
                    startDate = new Date(period.start_time);
                    endDate = new Date(period.end_time);
                }
            } catch (e) {
                continue;
            }
            
            if (endDate < now) continue;
            
            const mahaPlanetInfo = planetsData[mahaDashaPlanet];
            const antarPlanetInfo = planetsData[antarDashaPlanet];
            
            // Get planet dignities
            const mahaDignity = calculatePlanetaryDignity(mahaDashaPlanet, mahaPlanetInfo);
            const antarDignity = calculatePlanetaryDignity(antarDashaPlanet, antarPlanetInfo);
            
            // Get Shadbala
            const mahaShadbala = mahaPlanetInfo ? calculateShadbala(mahaDashaPlanet, mahaPlanetInfo, planetsData, ascendantSign, shadbalaApiData) : null;
            const antarShadbala = antarPlanetInfo ? calculateShadbala(antarDashaPlanet, antarPlanetInfo, planetsData, ascendantSign, shadbalaApiData) : null;
            
            // Get houses ruled
            const mahaHousesRuled = getHousesRuledBy(mahaDashaPlanet);
            const antarHousesRuled = getHousesRuledBy(antarDashaPlanet);
            
            // Calculate MD_money (0-40) using new rules
            let mdMoney = 0;
            let mdReasons = [];
            
            // 1. House role weight (money focus)
            if (mahaDashaPlanet === secondLord || mahaDashaPlanet === eleventhLord || mahaDashaPlanet === tenthLord) {
                mdMoney += 20;
                mdReasons.push(`MD of ${mahaDashaPlanet} (${mahaDashaPlanet === secondLord ? '2nd' : mahaDashaPlanet === eleventhLord ? '11th' : '10th'} lord - key money/career source)`);
            } else if (mahaDashaPlanet === lagnaLord || mahaDashaPlanet === ninthLord) {
                mdMoney += 15;
                mdReasons.push(`MD of ${mahaDashaPlanet} (${mahaDashaPlanet === lagnaLord ? 'Lagna' : '9th'} lord - supports wealth)`);
            } else if (mahaDashaPlanet === fifthLord) {
                mdMoney += 10;
            } else if (mahaDashaPlanet === sixthLord) {
                mdMoney += 5;
            } else {
                mdMoney += 5; // Others (3,4,7,8,12)
            }
            
            // 2. Dignity
            if (mahaDignity) {
                if (mahaDignity.isExalted) {
                    mdMoney += 8;
                    mdReasons.push(`Exalted ${mahaDashaPlanet}`);
                } else if (mahaDignity.isOwnSign || mahaDignity.isMoolatrikona) {
                    mdMoney += 6;
                    mdReasons.push(`Own sign ${mahaDashaPlanet}`);
                } else if (mahaDignity.type === 'friendly') {
                    mdMoney += 3;
                } else if (mahaDignity.type === 'neutral') {
                    mdMoney += 1;
                } else if (mahaDignity.type === 'enemy') {
                    mdMoney -= 1;
                } else if (mahaDignity.isDebilitated) {
                    mdMoney -= 5;
                    mdReasons.push(`Debilitated ${mahaDashaPlanet} (may cause delays)`);
                }
            }
            
            // 3. Shadbala
            if (mahaShadbala) {
                const shadbalaValue = mahaShadbala.shadbala || mahaShadbala.value || 0;
                if (mahaShadbala.category === 'Strong' || shadbalaValue >= 480) {
                    mdMoney += 4;
                    mdReasons.push(`Strong ${mahaDashaPlanet} (Shadbala: ${shadbalaValue.toFixed(1)})`);
                } else if (mahaShadbala.category === 'Moderate' || (shadbalaValue >= 350 && shadbalaValue < 480)) {
                    mdMoney += 2;
                }
            }
            
            // 4. Afflictions/benefit
            const isMahaRetro = mahaPlanetInfo?.isRetro === true || mahaPlanetInfo?.isRetro === 'true';
            if (isMahaRetro && isMalefic(mahaDashaPlanet)) {
                mdMoney -= 4; // Retrograde malefic
            }
            
            const maleficAspectCount = countMaleficAspects(mahaDashaPlanet);
            if (maleficAspectCount >= 1) {
                mdMoney -= 3; // Strong malefic aspect
            }
            
            const beneficAspectCount = countBeneficAspects(mahaDashaPlanet);
            if (beneficAspectCount >= 1) {
                mdMoney += 2; // Strong benefic aspect
            }
            
            mdMoney = Math.max(0, Math.min(40, mdMoney));
            
            // Calculate AD_money_raw (can be negative)
            let adMoneyRaw = 0;
            let adReasons = [];
            
            // 1. House role for money
            if (antarDashaPlanet === secondLord || antarDashaPlanet === eleventhLord) {
                adMoneyRaw += 22;
                adReasons.push(`AD of ${antarDashaPlanet} (${antarDashaPlanet === secondLord ? '2nd' : '11th'} lord - key wealth/gains)`);
            } else if (antarDashaPlanet === ninthLord || antarDashaPlanet === fifthLord || antarDashaPlanet === lagnaLord) {
                adMoneyRaw += 15;
                adReasons.push(`AD of ${antarDashaPlanet} (${antarDashaPlanet === ninthLord ? '9th' : antarDashaPlanet === fifthLord ? '5th' : 'Lagna'} lord - supports wealth)`);
            } else if (antarDashaPlanet === tenthLord) {
                adMoneyRaw += 12;
                adReasons.push(`AD of ${antarDashaPlanet} (10th lord - career/income)`);
            } else if (antarDashaPlanet === sixthLord) {
                adMoneyRaw += 8;
            } else if (antarDashaPlanet === eighthLord || antarDashaPlanet === twelfthLord) {
                adMoneyRaw -= 5;
                adReasons.push(`AD of ${antarDashaPlanet} (${antarDashaPlanet === eighthLord ? '8th' : '12th'} lord - obstacles/losses)`);
            } else {
                adMoneyRaw += 6; // Others (3,4,7)
            }
            
            // 2. Dignity
            if (antarDignity) {
                if (antarDignity.isExalted) {
                    adMoneyRaw += 6;
                } else if (antarDignity.isOwnSign || antarDignity.isMoolatrikona) {
                    adMoneyRaw += 5;
                } else if (antarDignity.type === 'friendly') {
                    adMoneyRaw += 3;
                } else if (antarDignity.type === 'neutral') {
                    adMoneyRaw += 1;
                } else if (antarDignity.type === 'enemy') {
                    adMoneyRaw -= 1;
                } else if (antarDignity.isDebilitated) {
                    adMoneyRaw -= 4;
                    adReasons.push(`Debilitated ${antarDashaPlanet} (may cause delays)`);
                }
            }
            
            // 3. Afflictions/benefit
            const isAntarRetro = antarPlanetInfo?.isRetro === true || antarPlanetInfo?.isRetro === 'true';
            if (isAntarRetro && isMalefic(antarDashaPlanet)) {
                adMoneyRaw -= 4; // Retrograde malefic
            }
            
            const antarBeneficAspectCount = countBeneficAspects(antarDashaPlanet);
            if (antarBeneficAspectCount >= 1) {
                adMoneyRaw += 3; // Strong benefic aspect
            }
            
            const antarMaleficAspectCount = countMaleficAspects(antarDashaPlanet);
            if (antarMaleficAspectCount >= 1) {
                adMoneyRaw -= 3; // Strong malefic aspect
            }
            
            // RULE: Soften penalties under strong MD
            // If MD_money ≥ 28, cap total negative from AD at -8, then add 20
            let adMoney;
            if (mdMoney >= 28) {
                adMoney = Math.max(adMoneyRaw, -8) + 20; // AD_money lies roughly 12-40
            } else {
                adMoney = Math.max(0, Math.min(40, adMoneyRaw));
            }
            
            // Calculate Synergy (0-20)
            let synergy = 0;
            let synergyReasons = [];
            
            // 1. Relationship & nature (0-10)
            const relationship = getPlanetaryRelationship(mahaDashaPlanet, antarDashaPlanet);
            const mdIsBenefic = BENEFIC_PLANETS.includes(mahaDashaPlanet);
            const adIsBenefic = BENEFIC_PLANETS.includes(antarDashaPlanet);
            
            const mdLinkedToMoney = mahaHousesRuled.includes(2) || mahaHousesRuled.includes(11) || mahaHousesRuled.includes(10) || 
                                    mahaDashaPlanet === secondLord || mahaDashaPlanet === eleventhLord || mahaDashaPlanet === tenthLord;
            const adLinkedToMoney = antarHousesRuled.includes(2) || antarHousesRuled.includes(11) || antarHousesRuled.includes(10) || 
                                    antarDashaPlanet === secondLord || antarDashaPlanet === eleventhLord || antarDashaPlanet === tenthLord;
            
            let relScore = 0;
            if ((relationship === 'friend' || (mdIsBenefic && adIsBenefic)) && (mdLinkedToMoney || adLinkedToMoney)) {
                relScore = 8;
                if (arePlanetsConjunct(mahaDashaPlanet, antarDashaPlanet) || havePlanetaryExchange(mahaDashaPlanet, antarDashaPlanet)) {
                    relScore = 10; // Max
                }
                synergyReasons.push(`Strong functional friendship with money house linkage`);
            } else if (relationship === 'neutral') {
                relScore = mdLinkedToMoney || adLinkedToMoney ? 6 : 4;
            } else if (relationship === 'enemy') {
                const mdHas6or8 = mahaHousesRuled.includes(6) || mahaHousesRuled.includes(8);
                const adHas6or8 = antarHousesRuled.includes(6) || antarHousesRuled.includes(8);
                if (mdHas6or8 || adHas6or8 || (mahaHousesRuled.includes(2) && antarHousesRuled.includes(12)) || 
                    (mahaHousesRuled.includes(12) && antarHousesRuled.includes(2))) {
                    relScore = 0; // Functional enemies or heavy 6-8/2-12
                } else {
                    relScore = 3;
                }
            }
            
            // 2. House linkage (0-10)
            let houseLinkScore = 0;
            const moneyHouses = [2, 11, 10, 9, 5];
            const mdMoneyLink = mahaHousesRuled.some(h => moneyHouses.includes(h)) || 
                               mahaDashaPlanet === secondLord || mahaDashaPlanet === eleventhLord || mahaDashaPlanet === tenthLord || 
                               mahaDashaPlanet === ninthLord || mahaDashaPlanet === fifthLord || mahaDashaPlanet === lagnaLord;
            const adMoneyLink = antarHousesRuled.some(h => moneyHouses.includes(h)) || 
                               antarDashaPlanet === secondLord || antarDashaPlanet === eleventhLord || antarDashaPlanet === tenthLord || 
                               antarDashaPlanet === ninthLord || antarDashaPlanet === fifthLord || antarDashaPlanet === lagnaLord;
            
            if (mdMoneyLink && adMoneyLink) {
                if (arePlanetsConjunct(mahaDashaPlanet, antarDashaPlanet) || havePlanetaryExchange(mahaDashaPlanet, antarDashaPlanet)) {
                    houseLinkScore = 10; // Max
                } else {
                    houseLinkScore = 7;
                }
                synergyReasons.push(`Clear connection between money house lords (2/11/10/9/5)`);
            } else if (mdMoneyLink || adMoneyLink) {
                houseLinkScore = 4;
            }
            
            // Strong involvement of 8th/12th in money chain
            const mdHas8or12 = mahaHousesRuled.includes(8) || mahaHousesRuled.includes(12) || mahaDashaPlanet === eighthLord || mahaDashaPlanet === twelfthLord;
            const adHas8or12 = antarHousesRuled.includes(8) || antarHousesRuled.includes(12) || antarDashaPlanet === eighthLord || antarDashaPlanet === twelfthLord;
            if (mdHas8or12 && adHas8or12) {
                houseLinkScore = Math.max(0, houseLinkScore - 4);
            } else if (mdHas8or12 || adHas8or12) {
                houseLinkScore = Math.max(0, houseLinkScore - 2);
            }
            
            synergy = relScore + houseLinkScore;
            synergy = Math.max(0, Math.min(20, synergy));
            
            // Final money score: 0.4 * MD_money + 0.4 * AD_money + 0.2 * Syn
            const mdScaled = (mdMoney / 40) * 100;
            const adScaled = (adMoney / 40) * 100;
            const synergyScaled = (synergy / 20) * 100;
            let favorabilityScore = 0.4 * mdScaled + 0.4 * adScaled + 0.2 * synergyScaled;
            
            // RULE: Floors for strong MD
            // If MD_money ≥ 28, enforce floor of 45
            if (mdMoney >= 28) {
                favorabilityScore = Math.max(favorabilityScore, 45);
            }
            
            // RULE D: Adjust Ketu/Rahu MD behavior
            if (mahaDashaPlanet === 'Ketu' || mahaDashaPlanet === 'Rahu') {
                const baseScore = 40;
                const keyBeneficLords = [secondLord, tenthLord, eleventhLord, ninthLord, lagnaLord];
                const isStrongBeneficAD = keyBeneficLords.includes(antarDashaPlanet) && 
                                         antarDignity && !antarDignity.isDebilitated &&
                                         (!antarShadbala || !antarShadbala.fromApi || 
                                          (antarShadbala.shadbala && antarShadbala.shadbala >= 350));
                
                if (isStrongBeneficAD) {
                    favorabilityScore = Math.max(favorabilityScore, 45);
                } else {
                    favorabilityScore = baseScore + (favorabilityScore - baseScore) * 0.5;
                }
            }
            
            // Ensure score is 0-100
            favorabilityScore = Math.max(0, Math.min(100, Math.round(favorabilityScore)));
            
            // Combine reasons
            let reasons = [...mdReasons, ...adReasons, ...synergyReasons];
            
            // Determine prediction category
            let prediction = 'moderate';
            if (favorabilityScore >= 80) {
                prediction = 'highly favorable';
            } else if (favorabilityScore >= 60) {
                prediction = 'favorable';
            } else if (favorabilityScore >= 40) {
                prediction = 'moderate';
            } else if (favorabilityScore >= 20) {
                prediction = 'challenging';
            } else {
                prediction = 'highly challenging';
            }
            
            if (favorabilityScore >= 30 || wealthPlanets.includes(mahaDashaPlanet) || wealthPlanets.includes(antarDashaPlanet)) {
                moneyPeriods.push({
                    mahaDasha: mahaDashaPlanet,
                    antarDasha: antarDashaPlanet,
                    startDate: startDate,
                    endDate: endDate,
                    startTime: period.start_time,
                    endTime: period.end_time,
                    favorabilityScore: favorabilityScore,
                    prediction: prediction,
                    reasons: reasons
                });
            }
        }
    }
    
    // Sort by timing (earliest first), then by favorability score (highest first)
    moneyPeriods.sort((a, b) => {
        const dateDiff = a.startDate.getTime() - b.startDate.getTime();
        if (dateDiff !== 0) return dateDiff; // Sort by date first
        return b.favorabilityScore - a.favorabilityScore; // Then by score
    });
    return {
        periods: moneyPeriods.slice(0, 8),
        secondLord: secondLord,
        tenthLord: tenthLord,
        eleventhLord: eleventhLord
    };
}

// Health Prediction Analysis
/**
 * Calculate Natal Base Health (0-40) - computed once per chart
 */
function calculateNatalHealthBase(planetsData, ascendantSign, shadbalaApiData) {
    if (!planetsData || !ascendantSign) return 20; // Default moderate
    
    const getHouseLord = (houseNum) => {
        let houseSign = ascendantSign + houseNum - 1;
        if (houseSign > 12) houseSign -= 12;
        return ZODIAC_LORDS[houseSign];
    };
    
    const getPlanetsInHouse = (houseNum) => {
        const planets = [];
        for (const [planet, planetInfo] of Object.entries(planetsData)) {
            if (planet === 'Ascendant' || planet === 'ayanamsa') continue;
            if (!planetInfo || !planetInfo.current_sign) continue;
            const planetHouse = getRelativeHouseNumber(ascendantSign, planetInfo.current_sign);
            if (planetHouse === houseNum) {
                planets.push({ planet, planetInfo });
            }
        }
        return planets;
    };
    
    let natalHealthBase = 0;
    
    // a) Lagna & 1st lord
    const lagnaLord = getHouseLord(1);
    const lagnaLordInfo = planetsData[lagnaLord];
    const lagnaLordStrength = computeLordStrength(1, ascendantSign, planetsData, shadbalaApiData);
    
    // Check if Lagna lord is in 6/8/12
    let lagnaLordInHealthHouse = false;
    if (lagnaLordInfo) {
        const lagnaLordHouse = getRelativeHouseNumber(ascendantSign, lagnaLordInfo.current_sign);
        if ([6, 8, 12].includes(lagnaLordHouse)) {
            lagnaLordInHealthHouse = true;
        }
    }
    
    // Check for benefic support to Lagna
    let beneficSupportCount = 0;
    for (const planet of BENEFIC_PLANETS) {
        if (planetsData[planet]) {
            const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
            // Check if benefic aspects 1H (7th house aspect)
            const aspect7th = ((planetHouse + 6 - 1) % 12) + 1;
            if (aspect7th === 1) {
                beneficSupportCount++;
            }
        }
    }
    
    const hasBeneficSupport = beneficSupportCount > 0;
    const isLagnaLordStrong = lagnaLordStrength.dignity >= 0 && 
                              lagnaLordStrength.shadbala >= 0 && 
                              !lagnaLordInHealthHouse;
    
    if (isLagnaLordStrong && hasBeneficSupport) {
        natalHealthBase += 15; // Strong
    } else if (lagnaLordStrength.dignity >= -1 && lagnaLordStrength.shadbala >= -1) {
        natalHealthBase += 7; // Average
    } else {
        natalHealthBase += 2; // Weak
    }
    
    // b) 6th / 8th / 12th balance
    const healthHouses = [6, 8, 12];
    let maleficCountInHealthHouses = 0;
    let weakHealthLords = 0;
    
    for (const houseNum of healthHouses) {
        const planetsInHouse = getPlanetsInHouse(houseNum);
        for (const { planet } of planetsInHouse) {
            // Check if planet is malefic (using generic check)
            if (MALIFIC_PLANETS.includes(planet) || isMalefic(planet)) {
                maleficCountInHealthHouses++;
            }
        }
        
        // Check if health house lord is weak
        const healthLord = getHouseLord(houseNum);
        const healthLordStrength = computeLordStrength(houseNum, ascendantSign, planetsData, shadbalaApiData);
        if (healthLordStrength.dignity < 0 || healthLordStrength.shadbala < 0) {
            weakHealthLords++;
        }
    }
    
    if (maleficCountInHealthHouses >= 2 && weakHealthLords >= 2) {
        natalHealthBase -= 8; // Many malefics + weak lords
    } else if (maleficCountInHealthHouses >= 1) {
        natalHealthBase -= 3;
    }
    
    // Check for benefics aspecting 1H or 6H or their lords
    let beneficAspectBonus = 0;
    for (const planet of BENEFIC_PLANETS) {
        if (planetsData[planet]) {
            const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
            const aspect7th = ((planetHouse + 6 - 1) % 12) + 1;
            if (aspect7th === 1 || aspect7th === 6) {
                const planetDignity = calculatePlanetaryDignity(planet, planetsData[planet]);
                const planetShadbala = calculateShadbala(planet, planetsData[planet], planetsData, ascendantSign, shadbalaApiData);
                if ((planetDignity && planetDignity.strength >= 60) || 
                    (planetShadbala && getShadbalaScore(planetShadbala) >= 0)) {
                    beneficAspectBonus += 2;
                }
            }
        }
    }
    natalHealthBase += Math.min(5, beneficAspectBonus);
    
    // c) Natural health protector (strongest benefic planet, typically Jupiter but generic)
    let strongestBeneficProtector = null;
    let strongestBeneficScore = -1;
    
    for (const planet of BENEFIC_PLANETS) {
        if (planetsData[planet]) {
            const planetDignity = calculatePlanetaryDignity(planet, planetsData[planet]);
            const planetShadbala = calculateShadbala(planet, planetsData[planet], planetsData, ascendantSign, shadbalaApiData);
            const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
            
            // Calculate strength score
            let strengthScore = 0;
            if (planetDignity) {
                if (planetDignity.isExalted) strengthScore += 3;
                else if (planetDignity.isOwnSign || planetDignity.isMoolatrikona) strengthScore += 2;
                else if (planetDignity.strength >= 60) strengthScore += 1;
            }
            if (planetShadbala && getShadbalaScore(planetShadbala) > 0) {
                strengthScore += 1;
            }
            
            // Check if planet is badly afflicted (in 6/8/12 or multiple malefic aspects)
            let maleficAspectCount = 0;
            for (const maleficPlanet of MALIFIC_PLANETS) {
                if (planetsData[maleficPlanet] && maleficPlanet !== planet) {
                    const maleficHouse = getRelativeHouseNumber(ascendantSign, planetsData[maleficPlanet].current_sign);
                    const aspect7th = ((maleficHouse + 6 - 1) % 12) + 1;
                    if (aspect7th === planetHouse) {
                        maleficAspectCount++;
                    }
                }
            }
            
            const isAfflicted = [6, 8, 12].includes(planetHouse) || maleficAspectCount >= 2;
            
            // Only consider strong, unafflicted benefics as protectors
            if (strengthScore >= 2 && !isAfflicted && strengthScore > strongestBeneficScore) {
                strongestBeneficScore = strengthScore;
                strongestBeneficProtector = planet;
            }
        }
    }
    
    // Add protection bonus based on strongest benefic protector
    if (strongestBeneficProtector) {
        const protectorDignity = calculatePlanetaryDignity(strongestBeneficProtector, planetsData[strongestBeneficProtector]);
        const protectorShadbala = calculateShadbala(strongestBeneficProtector, planetsData[strongestBeneficProtector], planetsData, ascendantSign, shadbalaApiData);
        const isStrong = (protectorDignity && protectorDignity.strength >= 60) || 
                        (protectorShadbala && getShadbalaScore(protectorShadbala) >= 0);
        
        if (isStrong) {
            natalHealthBase += 4; // Strong benefic protector
        } else {
            natalHealthBase += 1; // Moderate benefic protector
        }
    }
    
    // Clamp to 0-40
    return Math.max(0, Math.min(40, Math.round(natalHealthBase)));
}

/**
 * Calculate Mahadasha Health Weight (MD_health, 0-40)
 */
function calculateMDHealthWeight(mahaDashaPlanet, planetsData, ascendantSign, shadbalaApiData) {
    if (!planetsData || !mahaDashaPlanet || !planetsData[mahaDashaPlanet]) return 20;
    
    const getHouseLord = (houseNum) => {
        let houseSign = ascendantSign + houseNum - 1;
        if (houseSign > 12) houseSign -= 12;
        return ZODIAC_LORDS[houseSign];
    };
    
    const mahaPlanetInfo = planetsData[mahaDashaPlanet];
    const mahaHouse = getRelativeHouseNumber(ascendantSign, mahaPlanetInfo.current_sign);
    
    // a) Role of MD lord X
    let MD_role = 0;
    
    const lagnaLord = getHouseLord(1);
    const sixthLord = getHouseLord(6);
    const eighthLord = getHouseLord(8);
    const twelfthLord = getHouseLord(12);
    
    if (mahaDashaPlanet === lagnaLord) {
        MD_role += 10; // 1L: +10
    }
    if (mahaDashaPlanet === sixthLord || mahaDashaPlanet === eighthLord || mahaDashaPlanet === twelfthLord) {
        MD_role -= 5; // 6L/8L/12L: -5
    }
    
    const isBenefic = BENEFIC_PLANETS.includes(mahaDashaPlanet);
    if (isBenefic && mahaDashaPlanet !== sixthLord && mahaDashaPlanet !== eighthLord && mahaDashaPlanet !== twelfthLord) {
        if (![6, 8, 12].includes(mahaHouse)) {
            MD_role += 5; // Benefic not in 6/8/12: +5
        }
    }
    
    if ([6, 8, 12].includes(mahaHouse)) {
        MD_role -= 3; // In 6H/8H/12H: -3
    }
    
    // Check if X aspects Lagna or 6H as a benefic
    if (isBenefic) {
        const aspect7th = ((mahaHouse + 6 - 1) % 12) + 1;
        if (aspect7th === 1 || aspect7th === 6) {
            MD_role += 2; // Aspects Lagna or 6H as benefic: +2
        }
    }
    
    // b) Strength of X
    const dignity = calculatePlanetaryDignity(mahaDashaPlanet, mahaPlanetInfo);
    const shadbala = calculateShadbala(mahaDashaPlanet, mahaPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
    
    const dignityScore = getDignityScore(dignity);
    const shadbalaScore = getShadbalaScore(shadbala);
    
    // Afflictions (capped at -3)
    const aspectRetro = calculateAspectRetroScore(mahaDashaPlanet, mahaPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
    let afflictions = aspectRetro.retroScore; // Retrograde malefic: -1
    
    // Strong malefic aspects: -1 each (max -2 total)
    if (aspectRetro.isStrongMalefic) {
        afflictions -= 1;
    }
    // Strong benefic aspect: +1
    if (aspectRetro.isStrongBenefic) {
        afflictions += 1;
    }
    
    afflictions = Math.max(-3, Math.min(3, afflictions));
    
    // Calculate MD_raw = MD_role + Dignity + Shadbala + Afflictions
    const MD_raw = MD_role + dignityScore + shadbalaScore + afflictions;
    
    // Normalize: Map from [-10, +10] to [0, 40]
    // Formula: clamp((MD_raw + 10) × 40/20, 0, 40)
    const MD_health = Math.max(0, Math.min(40, Math.round(((MD_raw + 10) * 40 / 20) * 10) / 10));
    
    return MD_health;
}

/**
 * Calculate Antardasha Health Weight (AD_health, 0-40)
 */
function calculateADHealthWeight(antarDashaPlanet, natalHealthBase, planetsData, ascendantSign, shadbalaApiData) {
    if (!planetsData || !antarDashaPlanet || !planetsData[antarDashaPlanet]) return 20;
    
    const getHouseLord = (houseNum) => {
        let houseSign = ascendantSign + houseNum - 1;
        if (houseSign > 12) houseSign -= 12;
        return ZODIAC_LORDS[houseSign];
    };
    
    const antarPlanetInfo = planetsData[antarDashaPlanet];
    const antarHouse = getRelativeHouseNumber(ascendantSign, antarPlanetInfo.current_sign);
    
    // a) Role of AD lord Y
    let AD_role = 0;
    
    const lagnaLord = getHouseLord(1);
    const sixthLord = getHouseLord(6);
    const eighthLord = getHouseLord(8);
    const twelfthLord = getHouseLord(12);
    const thirdLord = getHouseLord(3);
    
    if (antarDashaPlanet === sixthLord || antarDashaPlanet === eighthLord || antarDashaPlanet === twelfthLord) {
        AD_role -= 10; // 6L/8L/12L: -10
    }
    if (antarDashaPlanet === lagnaLord) {
        AD_role += 8; // 1L: +8
    }
    // Strong benefic protector (typically Jupiter but generic)
    if (BENEFIC_PLANETS.includes(antarDashaPlanet)) {
        const adDignity = calculatePlanetaryDignity(antarDashaPlanet, antarPlanetInfo);
        const adShadbala = calculateShadbala(antarDashaPlanet, antarPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
        const isStrongBenefic = (adDignity && (adDignity.isExalted || adDignity.isOwnSign || adDignity.strength >= 60)) ||
                               (adShadbala && getShadbalaScore(adShadbala) >= 0);
        if (isStrongBenefic && ![6, 8, 12].includes(antarHouse)) {
            AD_role += 6; // Strong benefic protector: +6
        }
    }
    
    const isMalefic = MALIFIC_PLANETS.includes(antarDashaPlanet);
    if (isMalefic && [1, 6, 8, 12].includes(antarHouse)) {
        AD_role -= 6; // Malefic in 1H/6H/8H/12H: -6
    }
    
    const isBenefic = BENEFIC_PLANETS.includes(antarDashaPlanet);
    if (isBenefic && (antarHouse === 1 || antarHouse === 6)) {
        const dignity = calculatePlanetaryDignity(antarDashaPlanet, antarPlanetInfo);
        const shadbala = calculateShadbala(antarDashaPlanet, antarPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
        const isReasonablyStrong = (dignity && dignity.strength >= 50) || 
                                  (shadbala && getShadbalaScore(shadbala) >= 0);
        if (isReasonablyStrong) {
            AD_role += 4; // Benefic in 1H or 6H and reasonably strong: +4
        }
    }
    
    // Check if Y strongly links 3H and 6H (overwork/stress)
    if (antarDashaPlanet === thirdLord && antarHouse === 6) {
        AD_role -= 3; // Links 3H and 6H: -3
    }
    
    // b) Strength of Y
    const dignity = calculatePlanetaryDignity(antarDashaPlanet, antarPlanetInfo);
    const shadbala = calculateShadbala(antarDashaPlanet, antarPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
    
    const dignityScore = getDignityScore(dignity);
    const shadbalaScore = getShadbalaScore(shadbala);
    
    // Afflictions (capped at -3)
    const aspectRetro = calculateAspectRetroScore(antarDashaPlanet, antarPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
    let afflictions = aspectRetro.retroScore; // Retrograde malefic: -1
    
    // Strong malefic aspect: -1 each (max -2)
    if (aspectRetro.isStrongMalefic) {
        afflictions -= 1;
    }
    // Strong benefic aspect: +1
    if (aspectRetro.isStrongBenefic) {
        afflictions += 1;
    }
    
    afflictions = Math.max(-3, Math.min(3, afflictions));
    
    // Calculate AD_raw_0 = AD_role + Dignity + Shadbala + Afflictions
    const AD_raw_0 = AD_role + dignityScore + shadbalaScore + afflictions;
    
    // Softening by constitution and strong MD
    // Need to check MD_health - but we don't have it here, so we'll calculate it
    // For now, we'll use a simplified check: if MD lord is strong benefic or lagna lord, consider MD strong
    const mahaDashaPlanet = null; // We don't have MD planet here, need to pass it
    // Actually, we need to refactor to pass MD_health or calculate it
    // For now, use constitution-based only, and we'll enhance in analyzeHealthTiming
    
    const strongConstitution = natalHealthBase >= 25;
    // Note: Strong MD check (MD_health >= 28) will be done in analyzeHealthTiming where we have both values
    
    let AD_raw;
    if (strongConstitution) {
        // Strong constitution only: AD_raw = max(AD_raw_0, -12) + 18
        AD_raw = Math.max(AD_raw_0, -12) + 18;
    } else {
        // Normal: AD_raw = AD_raw_0 + 20
        AD_raw = AD_raw_0 + 20;
    }
    
    // Clamp to 0-40
    const AD_health = Math.max(0, Math.min(40, Math.round(AD_raw)));
    
    return AD_health;
}

/**
 * Calculate Synergy Health Score (Syn_health, 0-20)
 */
function calculateSynergyHealth(mahaDashaPlanet, antarDashaPlanet, planetsData, ascendantSign) {
    if (!planetsData || !mahaDashaPlanet || !antarDashaPlanet) return 10;
    
    const getHouseLord = (houseNum) => {
        let houseSign = ascendantSign + houseNum - 1;
        if (houseSign > 12) houseSign -= 12;
        return ZODIAC_LORDS[houseSign];
    };
    
    const getHousesRuledBy = (planet) => {
        const houses = [];
        for (let houseNum = 1; houseNum <= 12; houseNum++) {
            const lord = getHouseLord(houseNum);
            if (lord === planet) {
                houses.push(houseNum);
            }
        }
        return houses;
    };
    
    const mahaHousesRuled = getHousesRuledBy(mahaDashaPlanet);
    const antarHousesRuled = getHousesRuledBy(antarDashaPlanet);
    
    const mahaIsBenefic = BENEFIC_PLANETS.includes(mahaDashaPlanet);
    const adIsBenefic = BENEFIC_PLANETS.includes(antarDashaPlanet);
    const mahaIsMalefic = MALIFIC_PLANETS.includes(mahaDashaPlanet);
    const adIsMalefic = MALIFIC_PLANETS.includes(antarDashaPlanet);
    
    const lagnaLord = getHouseLord(1);
    const healthHouses = [6, 8, 12];
    const mdRulesHealth = mahaHousesRuled.some(h => healthHouses.includes(h));
    const adRulesHealth = antarHousesRuled.some(h => healthHouses.includes(h));
    
    // Check if both are supportive to Lagna/1H/6H
    const mahaSupportsLagna = mahaDashaPlanet === lagnaLord || 
                             (mahaIsBenefic && !mdRulesHealth);
    const adSupportsLagna = antarDashaPlanet === lagnaLord || 
                           (adIsBenefic && !adRulesHealth);
    
    // Check if both are malefic or both strongly tied to 6/8/12 with no benefic help
    const bothMaleficOrHealth = (mahaIsMalefic && adIsMalefic) || (mdRulesHealth && adRulesHealth);
    // Check for strong benefic help (generic - any strong benefic, not just Jupiter)
    const mahaIsStrongBenefic = mahaIsBenefic && (() => {
        const mahaDignity = calculatePlanetaryDignity(mahaDashaPlanet, planetsData[mahaDashaPlanet]);
        const mahaShadbala = calculateShadbala(mahaDashaPlanet, planetsData[mahaDashaPlanet], planetsData, ascendantSign, null);
        return (mahaDignity && (mahaDignity.isExalted || mahaDignity.isOwnSign || mahaDignity.strength >= 60)) ||
               (mahaShadbala && getShadbalaScore(mahaShadbala) >= 0);
    })();
    const adIsStrongBenefic = adIsBenefic && (() => {
        const adDignity = calculatePlanetaryDignity(antarDashaPlanet, planetsData[antarDashaPlanet]);
        const adShadbala = calculateShadbala(antarDashaPlanet, planetsData[antarDashaPlanet], planetsData, ascendantSign, null);
        return (adDignity && (adDignity.isExalted || adDignity.isOwnSign || adDignity.strength >= 60)) ||
               (adShadbala && getShadbalaScore(adShadbala) >= 0);
    })();
    const hasBeneficHelp = mahaIsStrongBenefic || adIsStrongBenefic ||
                          mahaDashaPlanet === lagnaLord || antarDashaPlanet === lagnaLord;
    
    if ((mahaIsBenefic && adIsBenefic) || (mahaSupportsLagna && adSupportsLagna)) {
        return 15; // Both benefic or supportive: 10-20 (use 15)
    } else if ((mahaIsBenefic && !adIsMalefic) || (!mahaIsMalefic && adIsBenefic)) {
        return 7; // Mixed/neutral: 5-10 (use 7)
    } else if (bothMaleficOrHealth && !hasBeneficHelp) {
        return 2; // Both malefic or both tied to 6/8/12, no benefic help: 0-5 (use 2)
    }
    
    return 7; // Default mixed
}

function analyzeHealthTiming(planetsData, ascendantSign, mahaDashaData, language = 'en', shadbalaApiData = null) {
    if (!planetsData || !ascendantSign || !mahaDashaData) return null;
    
    const getHouseLord = (houseNum) => {
        let houseSign = ascendantSign + houseNum - 1;
        if (houseSign > 12) houseSign -= 12;
        return ZODIAC_LORDS[houseSign];
    };
    
    const sixthLord = getHouseLord(6);   // Diseases
    const eighthLord = getHouseLord(8);  // Longevity/Health issues
    const twelfthLord = getHouseLord(12); // Hospitalization/Loss
    
    // Calculate Natal Health Base once per chart
    const natalHealthBase = calculateNatalHealthBase(planetsData, ascendantSign, shadbalaApiData);
    
    let parsedData = mahaDashaData;
    if (mahaDashaData.output && typeof mahaDashaData.output === 'object') {
        parsedData = mahaDashaData.output;
    } else if (typeof mahaDashaData === 'string') {
        try {
            parsedData = JSON.parse(mahaDashaData);
            if (parsedData.output) parsedData = parsedData.output;
        } catch (e) {
            return null;
        }
    }
    
    const now = new Date();
    const healthPeriods = [];
    const healthPlanets = [sixthLord, eighthLord, twelfthLord];
    
    for (const [mahaDashaPlanet, antarDasas] of Object.entries(parsedData)) {
        for (const [antarDashaPlanet, period] of Object.entries(antarDasas)) {
            if (!period.start_time || !period.end_time) continue;
            
            let startDate, endDate;
            try {
                if (period.start_time.includes(' ')) {
                    startDate = new Date(period.start_time.replace(' ', 'T'));
                    endDate = new Date(period.end_time.replace(' ', 'T'));
                } else {
                    startDate = new Date(period.start_time);
                    endDate = new Date(period.end_time);
                }
            } catch (e) {
                continue;
            }
            
            if (endDate < now) continue;
            
            // Calculate health components using new specification
            const MD_health = calculateMDHealthWeight(mahaDashaPlanet, planetsData, ascendantSign, shadbalaApiData);
            
            // Calculate AD_health with proper softening based on MD_health and constitution
            // First calculate AD_raw_0
            const antarPlanetInfo = planetsData[antarDashaPlanet];
            const antarHouse = antarPlanetInfo ? getRelativeHouseNumber(ascendantSign, antarPlanetInfo.current_sign) : null;
            const lagnaLordAD = getHouseLord(1);
            const sixthLordAD = getHouseLord(6);
            const eighthLordAD = getHouseLord(8);
            const twelfthLordAD = getHouseLord(12);
            const thirdLord = getHouseLord(3);
            
            let AD_role = 0;
            if (antarDashaPlanet === sixthLordAD || antarDashaPlanet === eighthLordAD || antarDashaPlanet === twelfthLordAD) {
                AD_role -= 10;
            }
            if (antarDashaPlanet === lagnaLordAD) {
                AD_role += 8;
            }
            if (BENEFIC_PLANETS.includes(antarDashaPlanet)) {
                const adDignityCalc = calculatePlanetaryDignity(antarDashaPlanet, antarPlanetInfo);
                const adShadbalaCalc = calculateShadbala(antarDashaPlanet, antarPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
                const isStrongBenefic = (adDignityCalc && (adDignityCalc.isExalted || adDignityCalc.isOwnSign || adDignityCalc.strength >= 60)) ||
                                       (adShadbalaCalc && getShadbalaScore(adShadbalaCalc) >= 0);
                if (isStrongBenefic && ![6, 8, 12].includes(antarHouse)) {
                    AD_role += 6;
                }
            }
            if (MALIFIC_PLANETS.includes(antarDashaPlanet) && [1, 6, 8, 12].includes(antarHouse)) {
                AD_role -= 6;
            }
            if (BENEFIC_PLANETS.includes(antarDashaPlanet) && (antarHouse === 1 || antarHouse === 6)) {
                const dignityCalc = calculatePlanetaryDignity(antarDashaPlanet, antarPlanetInfo);
                const shadbalaCalc = calculateShadbala(antarDashaPlanet, antarPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
                const isReasonablyStrong = (dignityCalc && dignityCalc.strength >= 50) || 
                                          (shadbalaCalc && getShadbalaScore(shadbalaCalc) >= 0);
                if (isReasonablyStrong) {
                    AD_role += 4;
                }
            }
            if (antarDashaPlanet === thirdLord && antarHouse === 6) {
                AD_role -= 3;
            }
            
            const adDignityAD = calculatePlanetaryDignity(antarDashaPlanet, antarPlanetInfo);
            const adShadbalaAD = calculateShadbala(antarDashaPlanet, antarPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
            const adDignityScoreAD = getDignityScore(adDignityAD);
            const adShadbalaScoreAD = getShadbalaScore(adShadbalaAD);
            const adAspectRetroAD = calculateAspectRetroScore(antarDashaPlanet, antarPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
            let adAfflictionsAD = adAspectRetroAD.retroScore;
            if (adAspectRetroAD.isStrongMalefic) adAfflictionsAD -= 1;
            if (adAspectRetroAD.isStrongBenefic) adAfflictionsAD += 1;
            adAfflictionsAD = Math.max(-3, Math.min(3, adAfflictionsAD));
            
            const AD_raw_0 = AD_role + adDignityScoreAD + adShadbalaScoreAD + adAfflictionsAD;
            
            // Softening by constitution and strong MD
            const strongConstitution = natalHealthBase >= 25;
            const strongMD = MD_health >= 28;
            
            let AD_raw;
            if (strongMD && strongConstitution) {
                // Strong MD AND strong constitution: AD_raw = max(AD_raw_0, -10) + 20
                AD_raw = Math.max(AD_raw_0, -10) + 20;
            } else if (strongConstitution) {
                // Strong constitution only: AD_raw = max(AD_raw_0, -12) + 18
                AD_raw = Math.max(AD_raw_0, -12) + 18;
            } else {
                // Normal: AD_raw = AD_raw_0 + 20
                AD_raw = AD_raw_0 + 20;
            }
            
            const AD_health = Math.max(0, Math.min(40, Math.round(AD_raw)));
            
            const Syn_health = calculateSynergyHealth(mahaDashaPlanet, antarDashaPlanet, planetsData, ascendantSign);
            
            // Final health score: New formula with weights 35% Natal, 25% MD, 25% AD, 15% Synergy
            // HealthScore (0-100) = 0.35 × (NatalHealthBase/40 × 100) + 0.25 × (MD_health/40 × 100) + 0.25 × (AD_health/40 × 100) + 0.15 × (Synergy_health/20 × 100)
            const Natal_norm = (natalHealthBase / 40) * 100;
            const MD_norm = (MD_health / 40) * 100;
            const AD_norm = (AD_health / 40) * 100;
            const Syn_norm = (Syn_health / 20) * 100;
            
            let HealthScore_0_100 = 0.35 * Natal_norm + 0.25 * MD_norm + 0.25 * AD_norm + 0.15 * Syn_norm;
            
            // Apply floors
            if (MD_health >= 28 && natalHealthBase >= 25) {
                // Strong MD + good constitution: enforce HealthScore ≥ 50
                HealthScore_0_100 = Math.max(HealthScore_0_100, 50);
            } else if (natalHealthBase >= 25) {
                // Good constitution: enforce HealthScore ≥ 40
                HealthScore_0_100 = Math.max(HealthScore_0_100, 40);
            }
            // If fragile constitution (≤10) and both MD/AD strongly 6L/8L/12L and malefic, allow lower scores (no floor)
            
            // Clamp to 0-100
            HealthScore_0_100 = Math.max(0, Math.min(100, Math.round(HealthScore_0_100)));
            
            // Map 0-100 → 1-10 roughly
            let healthRating_1_10;
            if (HealthScore_0_100 <= 20) {
                healthRating_1_10 = 1 + (HealthScore_0_100 / 20) * 2; // 1-3
            } else if (HealthScore_0_100 <= 40) {
                healthRating_1_10 = 3 + ((HealthScore_0_100 - 20) / 20) * 2; // 3-5
            } else if (HealthScore_0_100 <= 60) {
                healthRating_1_10 = 5 + ((HealthScore_0_100 - 40) / 20) * 2; // 5-7
            } else if (HealthScore_0_100 <= 80) {
                healthRating_1_10 = 7 + ((HealthScore_0_100 - 60) / 20) * 2; // 7-9
            } else {
                healthRating_1_10 = 9 + ((HealthScore_0_100 - 80) / 20) * 1; // 9-10
            }
            
            healthRating_1_10 = Math.max(1, Math.min(10, Math.round(healthRating_1_10 * 10) / 10));
            
            // Generate reasons based on actual calculated values and Vedic astrology principles
            let reasons = [];
            
            // Get house lords for Maraka planets (2nd and 7th lords can cause health issues)
            const secondLord = getHouseLord(2);
            const seventhLord = getHouseLord(7);
            
            // MD reasons - use actual MD_health value to guide reason accuracy
            const mahaPlanetInfo = planetsData[mahaDashaPlanet];
            const mahaHouse = mahaPlanetInfo ? getRelativeHouseNumber(ascendantSign, mahaPlanetInfo.current_sign) : null;
            const lagnaLordReasons = getHouseLord(1);
            
            const mahaDignity = calculatePlanetaryDignity(mahaDashaPlanet, mahaPlanetInfo);
            const mahaShadbala = calculateShadbala(mahaDashaPlanet, mahaPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
            const mahaIsStrong = (mahaDignity && (mahaDignity.isExalted || mahaDignity.isOwnSign || mahaDignity.strength >= 60)) ||
                                (mahaShadbala && getShadbalaScore(mahaShadbala) >= 0);
            const mahaIsWeak = (mahaDignity && mahaDignity.isDebilitated) ||
                              (mahaShadbala && getShadbalaScore(mahaShadbala) < 0);
            
            // Check for Maraka planets (2nd and 7th lords - can cause significant health issues)
            if (mahaDashaPlanet === secondLord || mahaDashaPlanet === seventhLord) {
                if (mahaIsWeak) {
                    reasons.push(`MD of ${mahaDashaPlanet} (${mahaDashaPlanet === secondLord ? '2nd' : '7th'} lord - Maraka planet, weak - requires health attention)`);
                } else {
                    reasons.push(`MD of ${mahaDashaPlanet} (${mahaDashaPlanet === secondLord ? '2nd' : '7th'} lord - Maraka planet, may require health monitoring)`);
                }
            } else if (mahaDashaPlanet === lagnaLordReasons) {
                if (mahaIsStrong) {
                    reasons.push(`MD of ${lagnaLord} (Lagna lord - strongly supports overall vitality and constitution)`);
                } else if (mahaIsWeak) {
                    reasons.push(`MD of ${lagnaLord} (Lagna lord, but weak - moderate vitality support)`);
                } else {
                    reasons.push(`MD of ${lagnaLord} (Lagna lord - supports overall vitality)`);
                }
            } else if (mahaDashaPlanet === sixthLord) {
                // 6th House (Roga Bhava) - Diseases and health susceptibility
                if (BENEFIC_PLANETS.includes(mahaDashaPlanet)) {
                    reasons.push(`MD of ${mahaDashaPlanet} (6th lord - Roga Bhava, but benefic nature provides some protection from diseases)`);
                } else {
                    reasons.push(`MD of ${mahaDashaPlanet} (6th lord - Roga Bhava, period of health susceptibility and diseases)`);
                }
            } else if (mahaDashaPlanet === eighthLord) {
                // 8th House (Ayur Bhava) - Longevity and chronic conditions
                if (BENEFIC_PLANETS.includes(mahaDashaPlanet)) {
                    reasons.push(`MD of ${mahaDashaPlanet} (8th lord - Ayur Bhava, but benefic nature may mitigate chronic health issues)`);
                } else {
                    reasons.push(`MD of ${mahaDashaPlanet} (8th lord - Ayur Bhava, period of chronic conditions and longevity concerns)`);
                }
            } else if (mahaDashaPlanet === twelfthLord) {
                // 12th House (Vyaya Bhava) - Hospitalization and recovery
                if (BENEFIC_PLANETS.includes(mahaDashaPlanet)) {
                    reasons.push(`MD of ${mahaDashaPlanet} (12th lord - Vyaya Bhava, but benefic nature may reduce hospitalization needs)`);
                } else {
                    reasons.push(`MD of ${mahaDashaPlanet} (12th lord - Vyaya Bhava, period of hospitalization and recovery concerns)`);
                }
            } else if (BENEFIC_PLANETS.includes(mahaDashaPlanet)) {
                if (mahaIsStrong) {
                    reasons.push(`MD of ${mahaDashaPlanet} (strong benefic - supportive of health and vitality)`);
                } else {
                    reasons.push(`MD of ${mahaDashaPlanet} (benefic - generally supportive of health)`);
                }
            } else if (MALIFIC_PLANETS.includes(mahaDashaPlanet)) {
                // Add specific planetary health significations
                let healthNote = '';
                if (mahaDashaPlanet === 'Sun') healthNote = ' - governs heart, eyes, and vitality';
                else if (mahaDashaPlanet === 'Moon') healthNote = ' - affects mind, emotions, and fluids';
                else if (mahaDashaPlanet === 'Mars') healthNote = ' - rules energy, blood, and muscles';
                else if (mahaDashaPlanet === 'Saturn') healthNote = ' - indicates chronic illnesses and bones';
                else if (mahaDashaPlanet === 'Rahu' || mahaDashaPlanet === 'Ketu') healthNote = ' - shadow planets with malefic health effects';
                
                reasons.push(`MD of ${mahaDashaPlanet} (malefic${healthNote} - may require health attention)`);
            }
            
            if (mahaHouse && [6, 8, 12].includes(mahaHouse)) {
                const houseName = mahaHouse === 6 ? 'Roga Bhava (diseases)' : mahaHouse === 8 ? 'Ayur Bhava (longevity)' : 'Vyaya Bhava (hospitalization)';
                reasons.push(`${mahaDashaPlanet} MD in ${mahaHouse}H - ${houseName}`);
            }
            
            if (mahaDignity) {
                if (mahaDignity.isExalted) reasons.push(`Strong ${mahaDashaPlanet} (exalted - favorable for health)`);
                else if (mahaDignity.isDebilitated) reasons.push(`Weak ${mahaDashaPlanet} (debilitated - health vulnerability)`);
                else if (mahaDignity.isOwnSign || mahaDignity.isMoolatrikona) reasons.push(`Strong ${mahaDashaPlanet} (own sign - stable health influence)`);
            }
            
            // AD reasons - use actual AD_health value and check actual strength
            // Note: antarPlanetInfo and antarHouse already declared above, reuse them
            const adDignityReasons = calculatePlanetaryDignity(antarDashaPlanet, antarPlanetInfo);
            const adShadbalaReasons = calculateShadbala(antarDashaPlanet, antarPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
            const adIsStrongBenefic = BENEFIC_PLANETS.includes(antarDashaPlanet) && 
                                   ((adDignityReasons && (adDignityReasons.isExalted || adDignityReasons.isOwnSign || adDignityReasons.strength >= 60)) ||
                                    (adShadbalaReasons && getShadbalaScore(adShadbalaReasons) >= 0));
            const adIsWeak = (adDignityReasons && adDignityReasons.isDebilitated) ||
                           (adShadbalaReasons && getShadbalaScore(adShadbalaReasons) < 0);
            const isInHealthHouse = antarHouse && [6, 8, 12].includes(antarHouse);
            
            // Check for Maraka planets in AD (2nd and 7th lords - can cause significant health issues)
            if (antarDashaPlanet === secondLord || antarDashaPlanet === seventhLord) {
                if (adIsWeak) {
                    reasons.push(`AD of ${antarDashaPlanet} (${antarDashaPlanet === secondLord ? '2nd' : '7th'} lord - Maraka planet, weak - significant health attention required)`);
                } else {
                    reasons.push(`AD of ${antarDashaPlanet} (${antarDashaPlanet === secondLord ? '2nd' : '7th'} lord - Maraka planet, requires health monitoring)`);
                }
            } else if (antarDashaPlanet === lagnaLordReasons) {
                if (adIsStrongBenefic) {
                    reasons.push(`AD of ${lagnaLordReasons} (Lagna lord - strongly supports vitality and constitution)`);
                } else {
                    reasons.push(`AD of ${lagnaLordReasons} (Lagna lord - supports vitality)`);
                }
            } else if (antarDashaPlanet === sixthLord) {
                // 6th House (Roga Bhava) - Diseases and health susceptibility
                if (BENEFIC_PLANETS.includes(antarDashaPlanet)) {
                    reasons.push(`AD of ${antarDashaPlanet} (6th lord - Roga Bhava, but benefic nature provides some protection from diseases)`);
                } else {
                    reasons.push(`AD of ${antarDashaPlanet} (6th lord - Roga Bhava, period of health susceptibility and diseases)`);
                }
            } else if (antarDashaPlanet === eighthLord) {
                // 8th House (Ayur Bhava) - Longevity and chronic conditions
                if (BENEFIC_PLANETS.includes(antarDashaPlanet)) {
                    reasons.push(`AD of ${antarDashaPlanet} (8th lord - Ayur Bhava, but benefic nature may mitigate chronic health issues)`);
                } else {
                    reasons.push(`AD of ${antarDashaPlanet} (8th lord - Ayur Bhava, period of chronic conditions and longevity concerns)`);
                }
            } else if (antarDashaPlanet === twelfthLord) {
                // 12th House (Vyaya Bhava) - Hospitalization and recovery
                if (BENEFIC_PLANETS.includes(antarDashaPlanet)) {
                    reasons.push(`AD of ${antarDashaPlanet} (12th lord - Vyaya Bhava, but benefic nature may reduce hospitalization needs)`);
                } else {
                    reasons.push(`AD of ${antarDashaPlanet} (12th lord - Vyaya Bhava, period of hospitalization and recovery concerns)`);
                }
            } else if (adIsStrongBenefic && !isInHealthHouse) {
                // Strong benefic protector (not in health house) - prioritize this
                // Check if it's Jupiter (natural health protector) or other strong benefic
                if (antarDashaPlanet === 'Jupiter') {
                    reasons.push(`AD of Jupiter (strong benefic - natural health protector and healer)`);
                } else {
                    reasons.push(`AD of ${antarDashaPlanet} (strong benefic - natural health protector)`);
                }
            } else if (BENEFIC_PLANETS.includes(antarDashaPlanet)) {
                // Benefic but not strong enough or in health house
                if (adIsWeak) {
                    reasons.push(`AD of ${antarDashaPlanet} (benefic, but weak - limited health support)`);
                } else if (isInHealthHouse) {
                    const houseName = antarHouse === 6 ? 'Roga Bhava (diseases)' : antarHouse === 8 ? 'Ayur Bhava (longevity)' : 'Vyaya Bhava (hospitalization)';
                    reasons.push(`AD of ${antarDashaPlanet} (benefic, but in ${houseName} - mixed health influence)`);
                } else {
                    reasons.push(`AD of ${antarDashaPlanet} (benefic - generally supportive of health)`);
                }
            } else if (MALIFIC_PLANETS.includes(antarDashaPlanet)) {
                // Add specific planetary health significations
                let healthNote = '';
                if (antarDashaPlanet === 'Sun') healthNote = ' - governs heart, eyes, and vitality';
                else if (antarDashaPlanet === 'Moon') healthNote = ' - affects mind, emotions, and fluids';
                else if (antarDashaPlanet === 'Mars') healthNote = ' - rules energy, blood, and muscles';
                else if (antarDashaPlanet === 'Saturn') healthNote = ' - indicates chronic illnesses and bones';
                else if (antarDashaPlanet === 'Rahu' || antarDashaPlanet === 'Ketu') healthNote = ' - shadow planets with malefic health effects';
                
                reasons.push(`AD of ${antarDashaPlanet} (malefic${healthNote} - may require health attention)`);
            }
            
            if (antarHouse && [1, 6, 8, 12].includes(antarHouse)) {
                if (MALIFIC_PLANETS.includes(antarDashaPlanet)) {
                    const houseName = antarHouse === 6 ? 'Roga Bhava (diseases)' : antarHouse === 8 ? 'Ayur Bhava (longevity)' : antarHouse === 12 ? 'Vyaya Bhava (hospitalization)' : 'Lagna';
                    reasons.push(`${antarDashaPlanet} AD in ${antarHouse}H - ${houseName} (malefic in health-related house)`);
                } else if (BENEFIC_PLANETS.includes(antarDashaPlanet) && (antarHouse === 1 || antarHouse === 6)) {
                    const houseName = antarHouse === 1 ? 'Lagna' : 'Roga Bhava';
                    reasons.push(`${antarDashaPlanet} AD in ${antarHouse}H - ${houseName} (benefic support for health)`);
                }
            }
            
            if (adDignityReasons) {
                if (adDignityReasons.isExalted) reasons.push(`Strong ${antarDashaPlanet} (exalted - favorable for health)`);
                else if (adDignityReasons.isDebilitated) reasons.push(`Weak ${antarDashaPlanet} (debilitated - health vulnerability)`);
            }
            
            // Now add detailed calculation breakdown showing all components used in scoring
            // Calculate MD_health components for detailed breakdown
            let MD_role_calc = 0;
            const lagnaLord_calc = getHouseLord(1);
            const sixthLord_calc = getHouseLord(6);
            const eighthLord_calc = getHouseLord(8);
            const twelfthLord_calc = getHouseLord(12);
            
            if (mahaDashaPlanet === lagnaLord_calc) {
                MD_role_calc += 10;
            }
            if (mahaDashaPlanet === sixthLord_calc || mahaDashaPlanet === eighthLord_calc || mahaDashaPlanet === twelfthLord_calc) {
                MD_role_calc -= 5;
            }
            const isBeneficMD = BENEFIC_PLANETS.includes(mahaDashaPlanet);
            if (isBeneficMD && mahaDashaPlanet !== sixthLord_calc && mahaDashaPlanet !== eighthLord_calc && mahaDashaPlanet !== twelfthLord_calc) {
                if (![6, 8, 12].includes(mahaHouse)) {
                    MD_role_calc += 5;
                }
            }
            if ([6, 8, 12].includes(mahaHouse)) {
                MD_role_calc -= 3;
            }
            if (isBeneficMD) {
                const aspect7th = ((mahaHouse + 6 - 1) % 12) + 1;
                if (aspect7th === 1 || aspect7th === 6) {
                    MD_role_calc += 2;
                }
            }
            
            const mahaDignityScore = getDignityScore(mahaDignity);
            const mahaShadbalaScore = getShadbalaScore(mahaShadbala);
            const mahaAspectRetro = calculateAspectRetroScore(mahaDashaPlanet, mahaPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
            let mahaAfflictions = mahaAspectRetro.retroScore;
            if (mahaAspectRetro.isStrongMalefic) mahaAfflictions -= 1;
            if (mahaAspectRetro.isStrongBenefic) mahaAfflictions += 1;
            mahaAfflictions = Math.max(-3, Math.min(3, mahaAfflictions));
            
            // Calculate AD_health components for detailed breakdown
            let AD_role_calc = 0;
            if (antarDashaPlanet === sixthLord_calc || antarDashaPlanet === eighthLord_calc || antarDashaPlanet === twelfthLord_calc) {
                AD_role_calc -= 10;
            }
            if (antarDashaPlanet === lagnaLord_calc) {
                AD_role_calc += 8;
            }
            if (BENEFIC_PLANETS.includes(antarDashaPlanet)) {
                const adDignityCalc = calculatePlanetaryDignity(antarDashaPlanet, antarPlanetInfo);
                const adShadbalaCalc = calculateShadbala(antarDashaPlanet, antarPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
                const isStrongBeneficCalc = (adDignityCalc && (adDignityCalc.isExalted || adDignityCalc.isOwnSign || adDignityCalc.strength >= 60)) ||
                                           (adShadbalaCalc && getShadbalaScore(adShadbalaCalc) >= 0);
                if (isStrongBeneficCalc && ![6, 8, 12].includes(antarHouse)) {
                    AD_role_calc += 6;
                }
            }
            if (MALIFIC_PLANETS.includes(antarDashaPlanet) && [1, 6, 8, 12].includes(antarHouse)) {
                AD_role_calc -= 6;
            }
            if (BENEFIC_PLANETS.includes(antarDashaPlanet) && (antarHouse === 1 || antarHouse === 6)) {
                const dignityCalc = calculatePlanetaryDignity(antarDashaPlanet, antarPlanetInfo);
                const shadbalaCalc = calculateShadbala(antarDashaPlanet, antarPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
                const isReasonablyStrongCalc = (dignityCalc && dignityCalc.strength >= 50) || 
                                              (shadbalaCalc && getShadbalaScore(shadbalaCalc) >= 0);
                if (isReasonablyStrongCalc) {
                    AD_role_calc += 4;
                }
            }
            const thirdLord_calc = getHouseLord(3);
            if (antarDashaPlanet === thirdLord_calc && antarHouse === 6) {
                AD_role_calc -= 3;
            }
            
            const adDignityScoreCalc = getDignityScore(adDignityReasons);
            const adShadbalaScoreCalc = getShadbalaScore(adShadbalaReasons);
            const adAspectRetroCalc = calculateAspectRetroScore(antarDashaPlanet, antarPlanetInfo, planetsData, ascendantSign, shadbalaApiData);
            let adAfflictionsCalc = adAspectRetroCalc.retroScore;
            if (adAspectRetroCalc.isStrongMalefic) adAfflictionsCalc -= 1;
            if (adAspectRetroCalc.isStrongBenefic) adAfflictionsCalc += 1;
            adAfflictionsCalc = Math.max(-3, Math.min(3, adAfflictionsCalc));
            
            const AD_raw_calc = AD_role_calc + adDignityScoreCalc + adShadbalaScoreCalc + adAfflictionsCalc;
            // Calculate AD_health with proper softening
            const strongConstitution_calc = natalHealthBase >= 25;
            const strongMD_calc = MD_health >= 28;
            let AD_raw_calc_final;
            if (strongMD_calc && strongConstitution_calc) {
                AD_raw_calc_final = Math.max(AD_raw_calc, -10) + 20;
            } else if (strongConstitution_calc) {
                AD_raw_calc_final = Math.max(AD_raw_calc, -12) + 18;
            } else {
                AD_raw_calc_final = AD_raw_calc + 20;
            }
            const AD_health_calc = Math.max(0, Math.min(40, Math.round(AD_raw_calc_final)));
            
            // Calculate MD_raw for display
            const MD_raw_calc = MD_role_calc + mahaDignityScore + mahaShadbalaScore + mahaAfflictions;
            
            // Add detailed calculation breakdown
            reasons.push(`--- MD Health Calculation: MD_raw(${MD_raw_calc.toFixed(1)}) = Role(${MD_role_calc}) + Dignity(${mahaDignityScore}) + Shadbala(${mahaShadbalaScore}) + Afflictions(${mahaAfflictions}), normalized to MD_health(${MD_health}/40)`);
            reasons.push(`--- AD Health Calculation: AD_raw_0(${AD_raw_calc.toFixed(1)}) = Role(${AD_role_calc}) + Dignity(${adDignityScoreCalc}) + Shadbala(${adShadbalaScoreCalc}) + Afflictions(${adAfflictionsCalc}), after softening AD_raw(${AD_raw_calc_final.toFixed(1)}), normalized to AD_health(${AD_health}/40)`);
            
            // Add final score breakdown with new formula
            const baseContribution = 0.35 * Natal_norm;
            const mdContribution = 0.25 * MD_norm;
            const adContribution = 0.25 * AD_norm;
            const synContribution = 0.15 * Syn_norm;
            
            reasons.push(`--- Final Score: ${HealthScore_0_100}/100 = 0.35×Natal(${Natal_norm.toFixed(1)}) + 0.25×MD(${MD_norm.toFixed(1)}) + 0.25×AD(${AD_norm.toFixed(1)}) + 0.15×Syn(${Syn_norm.toFixed(1)}) = ${baseContribution.toFixed(1)} + ${mdContribution.toFixed(1)} + ${adContribution.toFixed(1)} + ${synContribution.toFixed(1)}`);
            
            // Ensure at least one reason is always present
            if (reasons.length === 0) {
                // Fallback: provide basic information about the period
                const mahaIsMalefic = MALIFIC_PLANETS.includes(mahaDashaPlanet);
                const adIsMalefic = MALIFIC_PLANETS.includes(antarDashaPlanet);
                if (mahaIsMalefic && adIsMalefic) {
                    reasons.push(`Both malefic periods (may require health attention)`);
                } else if (mahaIsMalefic || adIsMalefic) {
                    reasons.push(`Mixed periods (one malefic - moderate health attention needed)`);
                } else {
                    reasons.push(`${mahaDashaPlanet} MD - ${antarDashaPlanet} AD period`);
                }
            }
            
            // Determine prediction category
            let prediction = 'moderate';
            if (HealthScore_0_100 >= 80) {
                prediction = 'excellent';
            } else if (HealthScore_0_100 >= 60) {
                prediction = 'good';
            } else if (HealthScore_0_100 >= 40) {
                prediction = 'moderate';
            } else if (HealthScore_0_100 >= 20) {
                prediction = 'requires attention';
            } else {
                prediction = 'challenging';
            }
            
            // For backward compatibility, calculate concernScore (inverted)
            const concernScore = 100 - HealthScore_0_100;
            const healthScore = HealthScore_0_100; // Keep for compatibility
            
            // Include periods with health relevance
            if (concernScore >= 20 || healthPlanets.includes(mahaDashaPlanet) || healthPlanets.includes(antarDashaPlanet) || HealthScore_0_100 < 60) {
                healthPeriods.push({
                    mahaDasha: mahaDashaPlanet,
                    antarDasha: antarDashaPlanet,
                    startDate: startDate,
                    endDate: endDate,
                    startTime: period.start_time,
                    endTime: period.end_time,
                    concernScore: concernScore,
                    healthScore: healthScore,
                    healthRating: healthRating_1_10,
                    prediction: prediction,
                    reasons: reasons,
                    natalHealthBase: natalHealthBase,
                    mdHealth: MD_health,
                    adHealth: AD_health,
                    synHealth: Syn_health
                });
            }
        }
    }
    
    // Sort by timing (earliest first), then by concern score (lower concern = better)
    healthPeriods.sort((a, b) => {
        const dateDiff = a.startDate.getTime() - b.startDate.getTime();
        if (dateDiff !== 0) return dateDiff; // Sort by date first
        return a.concernScore - b.concernScore; // Then by concern (lower is better)
    });
    return {
        periods: healthPeriods.slice(0, 8),
        sixthLord: sixthLord,
        eighthLord: eighthLord,
        twelfthLord: twelfthLord
    };
}

// Relationship Prediction Analysis
function analyzeRelationshipTiming(planetsData, ascendantSign, mahaDashaData, language = 'en', shadbalaApiData = null) {
    if (!planetsData || !ascendantSign || !mahaDashaData) return null;
    
    const getHouseLord = (houseNum) => {
        let houseSign = ascendantSign + houseNum - 1;
        if (houseSign > 12) houseSign -= 12;
        return ZODIAC_LORDS[houseSign];
    };
    
    const getHousesRuledBy = (planet) => {
        const houses = [];
        for (let houseNum = 1; houseNum <= 12; houseNum++) {
            const lord = getHouseLord(houseNum);
            if (lord === planet) {
                houses.push(houseNum);
            }
        }
        return houses;
    };
    
    const getPlanetaryRelationship = (planet1, planet2) => {
        if (planet1 === planet2) return 'same';
        if (planet1 === 'Rahu' || planet1 === 'Ketu' || planet2 === 'Rahu' || planet2 === 'Ketu') {
            return 'neutral';
        }
        const relationship = PLANETARY_RELATIONSHIPS[planet1];
        if (!relationship) return 'neutral';
        if (relationship.friends.includes(planet2)) return 'friend';
        if (relationship.enemies.includes(planet2)) return 'enemy';
        return 'neutral';
    };
    
    const arePlanetsConjunct = (planet1, planet2) => {
        if (!planetsData[planet1] || !planetsData[planet2]) return false;
        return planetsData[planet1].current_sign === planetsData[planet2].current_sign;
    };
    
    const havePlanetaryExchange = (planet1, planet2) => {
        const houses1 = getHousesRuledBy(planet1);
        const houses2 = getHousesRuledBy(planet2);
        if (houses1.length === 0 || houses2.length === 0) return false;
        const house1 = getRelativeHouseNumber(ascendantSign, planetsData[planet1].current_sign);
        const house2 = getRelativeHouseNumber(ascendantSign, planetsData[planet2].current_sign);
        if (houses1.includes(house2) && houses2.includes(house1)) {
            return true;
        }
        if (houses2.includes(house1) || houses1.includes(house2)) {
            return true;
        }
        return false;
    };
    
    const countMaleficAspects = (planet) => {
        if (!planetsData[planet]) return 0;
        const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
        let maleficCount = 0;
        for (const [otherPlanet, otherInfo] of Object.entries(planetsData)) {
            if (otherPlanet === planet || otherPlanet === 'Ascendant' || otherPlanet === 'ayanamsa') continue;
            if (!otherInfo.current_sign) continue;
            const otherHouse = getRelativeHouseNumber(ascendantSign, otherInfo.current_sign);
            const aspects = ASPECT_PATTERNS.getAspects(otherPlanet, otherHouse, otherInfo.current_sign);
            if (aspects[planetHouse] && MALIFIC_PLANETS.includes(otherPlanet)) {
                maleficCount++;
            }
        }
        return maleficCount;
    };
    
    const countBeneficAspects = (planet) => {
        if (!planetsData[planet]) return 0;
        const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
        let beneficCount = 0;
        for (const [otherPlanet, otherInfo] of Object.entries(planetsData)) {
            if (otherPlanet === planet || otherPlanet === 'Ascendant' || otherPlanet === 'ayanamsa') continue;
            if (!otherInfo.current_sign) continue;
            const otherHouse = getRelativeHouseNumber(ascendantSign, otherInfo.current_sign);
            const aspects = ASPECT_PATTERNS.getAspects(otherPlanet, otherHouse, otherInfo.current_sign);
            if (aspects[planetHouse] && BENEFIC_PLANETS.includes(otherPlanet)) {
                beneficCount++;
            }
        }
        return beneficCount;
    };
    
    const seventhLord = getHouseLord(7);
    const fifthLord = getHouseLord(5);
    const secondLord = getHouseLord(2);
    const eleventhLord = getHouseLord(11);
    const lagnaLord = getHouseLord(1);
    const ninthLord = getHouseLord(9);
    const fourthLord = getHouseLord(4);
    const sixthLord = getHouseLord(6);
    const eighthLord = getHouseLord(8);
    const twelfthLord = getHouseLord(12);
    
    let parsedData = mahaDashaData;
    if (mahaDashaData.output && typeof mahaDashaData.output === 'object') {
        parsedData = mahaDashaData.output;
    } else if (typeof mahaDashaData === 'string') {
        try {
            parsedData = JSON.parse(mahaDashaData);
            if (parsedData.output) parsedData = parsedData.output;
        } catch (e) {
            return null;
        }
    }
    
    const now = new Date();
    const relationshipPeriods = [];
    const relationshipPlanets = [seventhLord, 'Venus'];
    
    for (const [mahaDashaPlanet, antarDasas] of Object.entries(parsedData)) {
        for (const [antarDashaPlanet, period] of Object.entries(antarDasas)) {
            if (!period.start_time || !period.end_time) continue;
            
            let startDate, endDate;
            try {
                if (period.start_time.includes(' ')) {
                    startDate = new Date(period.start_time.replace(' ', 'T'));
                    endDate = new Date(period.end_time.replace(' ', 'T'));
                } else {
                    startDate = new Date(period.start_time);
                    endDate = new Date(period.end_time);
                }
            } catch (e) {
                continue;
            }
            
            if (endDate < now) continue;
            
            const mahaPlanetInfo = planetsData[mahaDashaPlanet];
            const antarPlanetInfo = planetsData[antarDashaPlanet];
            
            // Get planet dignities
            const mahaDignity = calculatePlanetaryDignity(mahaDashaPlanet, mahaPlanetInfo);
            const antarDignity = calculatePlanetaryDignity(antarDashaPlanet, antarPlanetInfo);
            
            // Get Shadbala
            const mahaShadbala = mahaPlanetInfo ? calculateShadbala(mahaDashaPlanet, mahaPlanetInfo, planetsData, ascendantSign, shadbalaApiData) : null;
            const antarShadbala = antarPlanetInfo ? calculateShadbala(antarDashaPlanet, antarPlanetInfo, planetsData, ascendantSign, shadbalaApiData) : null;
            
            // Get houses ruled
            const mahaHousesRuled = getHousesRuledBy(mahaDashaPlanet);
            const antarHousesRuled = getHousesRuledBy(antarDashaPlanet);
            
            // Calculate MD_rel (0-40) using new rules
            let mdRel = 0;
            let mdReasons = [];
            
            // 1. House role weight (relationship focus) - take highest, not sum
            let houseRoleScore = 0;
            if (mahaDashaPlanet === seventhLord) {
                houseRoleScore = 20;
                mdReasons.push(`MD of ${mahaDashaPlanet} (7th lord - primary relationship/marriage indicator)`);
            } else if (mahaDashaPlanet === 'Venus') {
                houseRoleScore = 10;
                mdReasons.push(`MD of ${mahaDashaPlanet} (Venus - natural karaka for relationships)`);
            } else if (mahaDashaPlanet === fifthLord || mahaDashaPlanet === secondLord || 
                      mahaDashaPlanet === eleventhLord || mahaDashaPlanet === lagnaLord || 
                      mahaDashaPlanet === ninthLord) {
                houseRoleScore = 8;
                mdReasons.push(`MD of ${mahaDashaPlanet} (${mahaDashaPlanet === fifthLord ? '5th' : mahaDashaPlanet === secondLord ? '2nd' : mahaDashaPlanet === eleventhLord ? '11th' : mahaDashaPlanet === lagnaLord ? 'Lagna' : '9th'} lord - supports relationships)`);
            } else if (mahaDashaPlanet === fourthLord) {
                houseRoleScore = 5;
                mdReasons.push(`MD of ${mahaDashaPlanet} (4th lord - home/emotional base)`);
            } else if (mahaDashaPlanet === sixthLord || mahaDashaPlanet === eighthLord || 
                      mahaDashaPlanet === twelfthLord) {
                houseRoleScore = 3;
                mdReasons.push(`MD of ${mahaDashaPlanet} (${mahaDashaPlanet === sixthLord ? '6th' : mahaDashaPlanet === eighthLord ? '8th' : '12th'} lord - obstacles in relationships)`);
            }
            mdRel += houseRoleScore;
            
            // 2. Dignity of MD lord
            if (mahaDignity) {
                if (mahaDignity.isExalted) {
                    mdRel += 8;
                    mdReasons.push(`Exalted ${mahaDashaPlanet}`);
                } else if (mahaDignity.isOwnSign || mahaDignity.isMoolatrikona) {
                    mdRel += 6;
                    mdReasons.push(`Own sign ${mahaDashaPlanet}`);
                } else if (mahaDignity.type === 'friendly') {
                    mdRel += 3;
                } else if (mahaDignity.type === 'neutral') {
                    mdRel += 1;
                } else if (mahaDignity.type === 'enemy') {
                    mdRel -= 1;
                } else if (mahaDignity.isDebilitated) {
                    mdRel -= 5;
                    mdReasons.push(`Debilitated ${mahaDashaPlanet} (may cause relationship delays)`);
                }
            }
            
            // 3. Shadbala of MD lord
            if (mahaShadbala) {
                const shadbalaValue = mahaShadbala.shadbala || mahaShadbala.value || 0;
                if (mahaShadbala.category === 'Strong' || shadbalaValue >= 480) {
                    mdRel += 4;
                    mdReasons.push(`Strong ${mahaDashaPlanet} (Shadbala: ${shadbalaValue.toFixed(1)})`);
                } else if (mahaShadbala.category === 'Moderate' || (shadbalaValue >= 350 && shadbalaValue < 480)) {
                    mdRel += 2;
                }
            }
            
            // 4. Afflictions / support
            const isMahaRetro = mahaPlanetInfo?.isRetro === true || mahaPlanetInfo?.isRetro === 'true';
            if (isMahaRetro && isMalefic(mahaDashaPlanet)) {
                mdRel -= 4; // Retrograde malefic
            }
            
            const maleficAspectCount = countMaleficAspects(mahaDashaPlanet);
            if (maleficAspectCount >= 1) {
                mdRel -= 3; // Strong malefic aspect (Saturn/Rahu/Mars)
            }
            
            const beneficAspectCount = countBeneficAspects(mahaDashaPlanet);
            if (beneficAspectCount >= 1) {
                mdRel += 2; // Strong benefic aspect
            }
            
            mdRel = Math.max(0, Math.min(40, mdRel));
            
            // Calculate AD_rel_raw (can be negative)
            let adRelRaw = 0;
            let adReasons = [];
            
            // 1. House role for relationships - take highest
            let adHouseRoleScore = 0;
            if (antarDashaPlanet === seventhLord || antarDashaPlanet === 'Venus') {
                adHouseRoleScore = 22;
                adReasons.push(`AD of ${antarDashaPlanet} (${antarDashaPlanet === seventhLord ? '7th lord' : 'Venus'} - key relationship indicator)`);
            } else if (antarDashaPlanet === fifthLord || antarDashaPlanet === secondLord || 
                      antarDashaPlanet === eleventhLord || antarDashaPlanet === lagnaLord || 
                      antarDashaPlanet === ninthLord || antarDashaPlanet === 'Jupiter') {
                adHouseRoleScore = 15;
                adReasons.push(`AD of ${antarDashaPlanet} (${antarDashaPlanet === 'Jupiter' ? 'Jupiter' : antarDashaPlanet === fifthLord ? '5th' : antarDashaPlanet === secondLord ? '2nd' : antarDashaPlanet === eleventhLord ? '11th' : antarDashaPlanet === lagnaLord ? 'Lagna' : '9th'} lord - supports relationships)`);
            } else if (antarDashaPlanet === fourthLord) {
                adHouseRoleScore = 10;
            } else if (antarDashaPlanet === sixthLord || antarDashaPlanet === eighthLord || 
                      antarDashaPlanet === twelfthLord) {
                adHouseRoleScore = -5;
                adReasons.push(`AD of ${antarDashaPlanet} (${antarDashaPlanet === sixthLord ? '6th' : antarDashaPlanet === eighthLord ? '8th' : '12th'} lord - obstacles in relationships)`);
            } else {
                adHouseRoleScore = 6; // Others (3rd, 10th only)
            }
            adRelRaw += adHouseRoleScore;
            
            // 2. Dignity
            if (antarDignity) {
                if (antarDignity.isExalted) {
                    adRelRaw += 6;
                } else if (antarDignity.isOwnSign || antarDignity.isMoolatrikona) {
                    adRelRaw += 5;
                } else if (antarDignity.type === 'friendly') {
                    adRelRaw += 3;
                } else if (antarDignity.type === 'neutral') {
                    adRelRaw += 1;
                } else if (antarDignity.type === 'enemy') {
                    adRelRaw -= 1;
                } else if (antarDignity.isDebilitated) {
                    adRelRaw -= 4;
                    adReasons.push(`Debilitated ${antarDashaPlanet} (may cause relationship delays)`);
                }
            }
            
            // 3. Afflictions / benefit
            const isAntarRetro = antarPlanetInfo?.isRetro === true || antarPlanetInfo?.isRetro === 'true';
            if (isAntarRetro && isMalefic(antarDashaPlanet)) {
                adRelRaw -= 4; // Retrograde malefic
            }
            
            const antarBeneficAspectCount = countBeneficAspects(antarDashaPlanet);
            if (antarBeneficAspectCount >= 1) {
                adRelRaw += 3; // Strong benefic aspect
            }
            
            const antarMaleficAspectCount = countMaleficAspects(antarDashaPlanet);
            if (antarMaleficAspectCount >= 1) {
                adRelRaw -= 3; // Strong malefic aspect
            }
            
            // RULE: Soften penalties under strong MD
            // If MD_rel ≥ 28, cap AD penalties at -8, then add 20
            let adRel;
            if (mdRel >= 28) {
                adRel = Math.max(adRelRaw, -8) + 20; // AD_rel lies roughly 12-40
            } else {
                adRel = adRelRaw + 20; // Add 20 for baseline
            }
            adRel = Math.max(0, Math.min(40, adRel));
            
            // Calculate Synergy (0-20)
            let synergy = 0;
            let synergyReasons = [];
            
            // 1. Nature/relationship (0-10)
            const relationship = getPlanetaryRelationship(mahaDashaPlanet, antarDashaPlanet);
            const mdIsBenefic = BENEFIC_PLANETS.includes(mahaDashaPlanet);
            const adIsBenefic = BENEFIC_PLANETS.includes(antarDashaPlanet);
            const mdIsMalefic = MALIFIC_PLANETS.includes(mahaDashaPlanet);
            const adIsMalefic = MALIFIC_PLANETS.includes(antarDashaPlanet);
            
            let relScore = 0;
            const isRelKeyPlanet = (planet) => {
                return planet === seventhLord || planet === 'Venus' || planet === 'Jupiter';
            };
            
            if ((relationship === 'friend' || (mdIsBenefic && adIsBenefic)) || 
                isRelKeyPlanet(mahaDashaPlanet) || isRelKeyPlanet(antarDashaPlanet)) {
                relScore = 7; // Can go up to 10
                if (arePlanetsConjunct(mahaDashaPlanet, antarDashaPlanet) || 
                    havePlanetaryExchange(mahaDashaPlanet, antarDashaPlanet)) {
                    relScore = 10; // Max
                }
                synergyReasons.push(`Strong functional friendship or key relationship planet involvement`);
            } else if (relationship === 'neutral') {
                relScore = 4; // Can go up to 6
                if (isRelKeyPlanet(mahaDashaPlanet) || isRelKeyPlanet(antarDashaPlanet)) {
                    relScore = 6;
                }
            } else if (relationship === 'enemy' || (mdIsMalefic && adIsMalefic)) {
                // Check for 6-8 or 2-12 relationship
                const mdHas6or8 = mahaHousesRuled.includes(6) || mahaHousesRuled.includes(8);
                const adHas6or8 = antarHousesRuled.includes(6) || antarHousesRuled.includes(8);
                const mdHas2or12 = mahaHousesRuled.includes(2) || mahaHousesRuled.includes(12);
                const adHas2or12 = antarHousesRuled.includes(2) || antarHousesRuled.includes(12);
                
                if ((mdHas6or8 && adHas6or8) || (mdHas2or12 && adHas2or12) || 
                    (mahaHousesRuled.includes(2) && antarHousesRuled.includes(12)) ||
                    (mahaHousesRuled.includes(12) && antarHousesRuled.includes(2))) {
                    relScore = 0; // Functional enemies, both malefic, or tied by 6-8/2-12
                } else {
                    relScore = 3;
                }
            }
            
            // 2. House linkage for relationships (0-10)
            let houseLinkScore = 0;
            const relHouses = [7, 5, 2, 11, 1, 9];
            const mdRelLink = mahaHousesRuled.some(h => relHouses.includes(h)) || 
                             mahaDashaPlanet === seventhLord || mahaDashaPlanet === fifthLord || 
                             mahaDashaPlanet === secondLord || mahaDashaPlanet === eleventhLord || 
                             mahaDashaPlanet === lagnaLord || mahaDashaPlanet === ninthLord || 
                             mahaDashaPlanet === 'Venus' || mahaDashaPlanet === 'Jupiter';
            const adRelLink = antarHousesRuled.some(h => relHouses.includes(h)) || 
                             antarDashaPlanet === seventhLord || antarDashaPlanet === fifthLord || 
                             antarDashaPlanet === secondLord || antarDashaPlanet === eleventhLord || 
                             antarDashaPlanet === lagnaLord || antarDashaPlanet === ninthLord || 
                             antarDashaPlanet === 'Venus' || antarDashaPlanet === 'Jupiter';
            
            if (mdRelLink && adRelLink) {
                if (arePlanetsConjunct(mahaDashaPlanet, antarDashaPlanet) || 
                    havePlanetaryExchange(mahaDashaPlanet, antarDashaPlanet)) {
                    houseLinkScore = 10; // Max
                } else {
                    houseLinkScore = 7; // Strong link
                }
                synergyReasons.push(`Clear connection between relationship house lords (7/5/2/11/Lagna/9)`);
            } else if (mdRelLink || adRelLink) {
                houseLinkScore = 4;
            }
            
            // Prominent 6th, 8th, 12th involvement
            const mdHas6or8or12 = mahaHousesRuled.includes(6) || mahaHousesRuled.includes(8) || 
                                 mahaHousesRuled.includes(12) || mahaDashaPlanet === sixthLord || 
                                 mahaDashaPlanet === eighthLord || mahaDashaPlanet === twelfthLord;
            const adHas6or8or12 = antarHousesRuled.includes(6) || antarHousesRuled.includes(8) || 
                                 antarHousesRuled.includes(12) || antarDashaPlanet === sixthLord || 
                                 antarDashaPlanet === eighthLord || antarDashaPlanet === twelfthLord;
            
            if (mdHas6or8or12 && adHas6or8or12) {
                houseLinkScore = Math.max(0, houseLinkScore - 4); // Subtract 3-5, or just keep low (0-3)
            } else if (mdHas6or8or12 || adHas6or8or12) {
                houseLinkScore = Math.max(0, houseLinkScore - 2);
            }
            
            synergy = relScore + houseLinkScore;
            synergy = Math.max(0, Math.min(20, synergy));
            
            // Final relationship score: 0.4 * MD_rel + 0.4 * AD_rel + 0.2 * Syn_rel
            const mdScaled = (mdRel / 40) * 100;
            const adScaled = (adRel / 40) * 100;
            const synergyScaled = (synergy / 20) * 100;
            let favorabilityScore = 0.4 * mdScaled + 0.4 * adScaled + 0.2 * synergyScaled;
            
            // RULE: Floor under strong 7th-lord MD
            // If MD_rel ≥ 28, enforce floor of 45
            if (mdRel >= 28) {
                favorabilityScore = Math.max(favorabilityScore, 45);
            }
            
            // Ensure score is 0-100
            favorabilityScore = Math.max(0, Math.min(100, Math.round(favorabilityScore)));
            
            // Combine reasons
            let reasons = [...mdReasons, ...adReasons, ...synergyReasons];
            
            // Determine prediction category using new thresholds
            let prediction = 'moderate';
            if (favorabilityScore >= 80) {
                prediction = 'highly favorable';
            } else if (favorabilityScore >= 60) {
                prediction = 'favorable';
            } else if (favorabilityScore >= 40) {
                prediction = 'moderate';
            } else if (favorabilityScore >= 20) {
                prediction = 'challenging';
            } else {
                prediction = 'highly challenging';
            }
            
            if (favorabilityScore >= 30 || relationshipPlanets.includes(mahaDashaPlanet) || relationshipPlanets.includes(antarDashaPlanet)) {
                relationshipPeriods.push({
                    mahaDasha: mahaDashaPlanet,
                    antarDasha: antarDashaPlanet,
                    startDate: startDate,
                    endDate: endDate,
                    startTime: period.start_time,
                    endTime: period.end_time,
                    favorabilityScore: favorabilityScore,
                    prediction: prediction,
                    reasons: reasons
                });
            }
        }
    }
    
    // Sort by timing (earliest first), then by favorability score (highest first)
    relationshipPeriods.sort((a, b) => {
        const dateDiff = a.startDate.getTime() - b.startDate.getTime();
        if (dateDiff !== 0) return dateDiff; // Sort by date first
        return b.favorabilityScore - a.favorabilityScore; // Then by score
    });
    return {
        periods: relationshipPeriods.slice(0, 8),
        seventhLord: seventhLord
    };
}

// Generate Money Prediction Section
function generateMoneyPredictionSection(planetsData, ascendantSign, mahaDashaData, language = 'en', shadbalaApiData = null) {
    if (!planetsData || !ascendantSign || !mahaDashaData) return '';
    
    const analysis = analyzeMoneyTiming(planetsData, ascendantSign, mahaDashaData, language, shadbalaApiData);
    if (!analysis || !analysis.periods || analysis.periods.length === 0) return '';
    
    const texts = language === 'hi' ? {
        title: 'धन/वित्तीय भविष्यवाणी (Money/Financial Prediction)',
        subtitle: 'अगले दशा काल में धन की संभावनाएं',
        highlyFavorable: 'अत्यधिक अनुकूल',
        favorable: 'अनुकूल',
        moderate: 'मध्यम',
        challenging: 'चुनौतीपूर्ण',
        unfavorable: 'अनुकूल नहीं',
        period: 'अवधि',
        score: 'अंक',
        reasons: 'कारण',
        recommended: 'अनुशंसित',
        note: 'नोट',
        noteText: 'धन की भविष्यवाणी 2nd, 10th, और 11th भाव स्वामियों के दशा काल पर आधारित है। बृहस्पति, शुक्र या 10th भाव स्वामी के शुभ गोचर भी आय को बढ़ा सकते हैं।'
    } : {
        title: 'Money/Financial Prediction',
        subtitle: 'Upcoming financial opportunities and fluctuations',
        highlyFavorable: 'Highly Favorable',
        favorable: 'Favorable',
        moderate: 'Moderate',
        challenging: 'Challenging',
        unfavorable: 'Unfavorable',
        period: 'Period',
        score: 'Score',
        reasons: 'Reasons',
        recommended: 'Recommended',
        note: 'Note',
        noteText: 'Financial predictions are based on dasha periods of 2nd, 10th, and 11th house lords. Positive transits of Jupiter, Venus, or 10th lord can enhance income opportunities.'
    };
    
    return generatePredictionSectionHTML(analysis, texts, language, 'money');
}

// Generate Health Prediction Section
function generateHealthPredictionSection(planetsData, ascendantSign, mahaDashaData, language = 'en', shadbalaApiData = null) {
    if (!planetsData || !ascendantSign || !mahaDashaData) return '';
    
    const analysis = analyzeHealthTiming(planetsData, ascendantSign, mahaDashaData, language, shadbalaApiData);
    if (!analysis || !analysis.periods || analysis.periods.length === 0) return '';
    
    const texts = language === 'hi' ? {
        title: 'स्वास्थ्य भविष्यवाणी (Health Prediction)',
        subtitle: 'स्वास्थ्य सम्बन्धी चुनौतियाँ और सुधार के अवसर',
        excellent: 'उत्कृष्ट',
        good: 'अच्छा',
        moderate: 'मध्यम',
        requiresAttention: 'ध्यान आवश्यक',
        challenging: 'चुनौतीपूर्ण',
        period: 'अवधि',
        healthScore: 'स्वास्थ्य स्कोर',
        reasons: 'कारण',
        note: 'नोट',
        noteText: 'स्वास्थ्य भविष्यवाणी 6th, 8th, और 12th भाव स्वामियों के दशा काल पर आधारित है। शनि, राहु या केतु के गोचर इन भावों पर स्वास्थ्य चिंता का कारण बन सकते हैं। बृहस्पति का शुभ गोचर स्वास्थ्य में सुधार ला सकता है।'
    } : {
        title: 'Health Prediction',
        subtitle: 'Health challenges and recovery opportunities',
        excellent: 'Excellent',
        good: 'Good',
        moderate: 'Moderate',
        requiresAttention: 'Requires Attention',
        challenging: 'Challenging',
        period: 'Period',
        healthScore: 'Health Score',
        reasons: 'Reasons',
        note: 'Note',
        noteText: 'Health predictions are based on dasha periods of 6th, 8th, and 12th house lords. Transits of Saturn, Rahu, or Ketu over these houses may trigger health concerns. Positive Jupiter transits can improve health.'
    };
    
    return generatePredictionSectionHTML(analysis, texts, language, 'health');
}

// Generate Relationship Prediction Section
function generateRelationshipPredictionSection(planetsData, ascendantSign, mahaDashaData, language = 'en', shadbalaApiData = null) {
    if (!planetsData || !ascendantSign || !mahaDashaData) return '';
    
    const analysis = analyzeRelationshipTiming(planetsData, ascendantSign, mahaDashaData, language, shadbalaApiData);
    if (!analysis || !analysis.periods || analysis.periods.length === 0) return '';
    
    const texts = language === 'hi' ? {
        title: 'संबंध/विवाह भविष्यवाणी (Relationship/Marriage Prediction)',
        subtitle: 'संबंधों और विवाह के लिए अनुकूल अवधि',
        highlyFavorable: 'अत्यधिक अनुकूल',
        favorable: 'अनुकूल',
        moderate: 'मध्यम',
        challenging: 'चुनौतीपूर्ण',
        unfavorable: 'अनुकूल नहीं',
        period: 'अवधि',
        score: 'अंक',
        reasons: 'कारण',
        recommended: 'अनुशंसित',
        note: 'नोट',
        noteText: 'संबंध भविष्यवाणी 7th भाव स्वामी और शुक्र के दशा काल पर आधारित है। शुक्र या 7th भाव पर शुभ गोचर सामंजस्य और मिलन का समर्थन करते हैं। अशुभ शुक्र या अशुभ गोचर संबंधों में समस्याएं संकेत कर सकते हैं।'
    } : {
        title: 'Relationship/Marriage Prediction',
        subtitle: 'Favorable periods for relationships and marriage',
        highlyFavorable: 'Highly Favorable',
        favorable: 'Favorable',
        moderate: 'Moderate',
        challenging: 'Challenging',
        unfavorable: 'Unfavorable',
        period: 'Period',
        score: 'Score',
        reasons: 'Reasons',
        recommended: 'Recommended',
        note: 'Note',
        noteText: 'Relationship predictions are based on dasha periods of 7th house lord and Venus. Benefic transits over Venus or 7th house support harmony and union. Afflicted Venus or malefic transits may indicate relationship troubles.'
    };
    
    return generatePredictionSectionHTML(analysis, texts, language, 'relationship');
}

// Generic function to generate prediction section HTML
function generatePredictionSectionHTML(analysis, texts, language, type) {
    const getCategoryColor = (category) => {
        if (type === 'health') {
            switch(category) {
                case 'excellent': return '#2e7d32';
                case 'good': return '#388e3c';
                case 'moderate': return '#f57c00';
                case 'requires attention': return '#e65100';
                case 'challenging': return '#d32f2f';
                default: return '#666';
            }
        } else {
            switch(category) {
                case 'highly favorable': return '#2e7d32';
                case 'favorable': return '#388e3c';
                case 'moderate': return '#f57c00';
                case 'challenging': return '#d32f2f';
                case 'unfavorable': return '#c62828';
                default: return '#666';
            }
        }
    };
    
    const formatDate = (dateStr) => {
        try {
            let date;
            if (dateStr.includes(' ')) {
                date = new Date(dateStr.replace(' ', 'T'));
            } else {
                date = new Date(dateStr);
            }
            return date.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };
    
    let periodsHTML = '';
    analysis.periods.forEach((period, index) => {
        const mahaDashaName = PLANET_NAMES[language] && PLANET_NAMES[language][period.mahaDasha]
            ? PLANET_NAMES[language][period.mahaDasha]
            : period.mahaDasha;
        const antarDashaName = PLANET_NAMES[language] && PLANET_NAMES[language][period.antarDasha]
            ? PLANET_NAMES[language][period.antarDasha]
            : period.antarDasha;
        
        const categoryColor = getCategoryColor(period.prediction);
        const isRecommended = type === 'health' 
            ? (period.healthScore >= 70 || period.prediction === 'excellent' || period.prediction === 'good')
            : period.favorabilityScore >= 70;
        
        // For health, use the 0-100 score (same as finance/job); for others, use the score as-is
        const score = type === 'health' ? period.healthScore : period.favorabilityScore;
        const scoreLabel = type === 'health' ? texts.healthScore : texts.score;
        
        periodsHTML += `
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${categoryColor}; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${isRecommended ? `<div style="background: #ffd700; color: #8b5a00; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; font-weight: 600; font-size: 13px;">⭐ ${texts.recommended || 'Recommended'}</div>` : ''}
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div>
                        <h3 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 18px;">
                            ${index + 1}. ${mahaDashaName} - ${antarDashaName}
                        </h3>
                        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">
                            <strong>${texts.period}:</strong> ${formatDate(period.startTime)} - ${formatDate(period.endTime)}
                        </div>
                        <div style="display: inline-block; background: ${categoryColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
                            ${texts[period.prediction] || period.prediction}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 24px; font-weight: bold; color: ${categoryColor};">
                            ${score}
                        </div>
                        <div style="font-size: 11px; color: #666; text-transform: uppercase;">
                            ${scoreLabel}
                        </div>
                    </div>
                </div>
                ${period.reasons && period.reasons.length > 0 ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
                        <div style="font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px;">${texts.reasons}:</div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #666; line-height: 1.6;">
                            ${period.reasons.map(reason => `<li style="margin-bottom: 4px;">${reason}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    const sectionId = type === 'money' ? 'money-prediction' : type === 'health' ? 'health-prediction' : 'relationship-prediction';
    
    // Add formula explanation for predictions
    let formulaSection = '';
    if (type === 'relationship') {
        formulaSection = `
        <div style="margin-bottom: 25px; padding: 15px; background: #f5f5f5; border-radius: 6px; border-left: 4px solid #e91e63;">
            <h4 style="color: #e91e63; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Relationship Score Calculation Formula</h4>
            
            <!-- Formula -->
            <div style="margin-bottom: 15px; padding: 12px; background: #fce4ec; border-radius: 4px; border-left: 3px solid #e91e63;">
                <strong style="display: block; margin-bottom: 8px; color: #c2185b; font-size: 14px;">Formula:</strong>
                <div style="font-size: 13px; color: #880e4f; line-height: 1.6;">
                    <strong>Favorability Score = 0.4 × MD_rel + 0.4 × AD_rel + 0.2 × Synergy_rel</strong><br>
                    <span style="margin-left: 20px;">• MD_rel (0-40): Mahadasha relationship weight</span><br>
                    <span style="margin-left: 40px;">- House Role: 7th lord (20), Venus (10), 5th/2nd/11th/Lagna/9th lords (8), 4th lord (5), 6th/8th/12th lords (3)</span><br>
                    <span style="margin-left: 40px;">- Dignity: Exalted (+8), Own/Mooltrikona (+6), Friendly (+3), Neutral (+1), Enemy (-1), Debilitated (-5)</span><br>
                    <span style="margin-left: 40px;">- Shadbala: Strong (+4), Moderate (+2)</span><br>
                    <span style="margin-left: 40px;">- Afflictions: Retrograde malefic (-4), Malefic aspect (-3), Benefic aspect (+2)</span><br>
                    <span style="margin-left: 20px;">• AD_rel (0-40): Antardasha relationship weight</span><br>
                    <span style="margin-left: 40px;">- House Role: 7th lord/Venus (22), 5th/2nd/11th/Lagna/9th/Jupiter (15), 4th lord (10), 6th/8th/12th lords (-5), Others (6)</span><br>
                    <span style="margin-left: 40px;">- Dignity: Exalted (+6), Own/Mooltrikona (+5), Friendly (+3), Neutral (+1), Enemy (-1), Debilitated (-4)</span><br>
                    <span style="margin-left: 40px;">- Afflictions: Retrograde malefic (-4), Malefic aspect (-3), Benefic aspect (+3)</span><br>
                    <span style="margin-left: 40px;">- Softening: If MD_rel ≥ 28, cap AD penalties at -8, then add 20 baseline</span><br>
                    <span style="margin-left: 20px;">• Synergy_rel (0-20): Planetary relationship and house linkage</span><br>
                    <span style="margin-left: 40px;">- Nature/Relationship (0-10): Friend/Benefic (7-10), Neutral (4-6), Enemy/Malefic (0-3)</span><br>
                    <span style="margin-left: 40px;">- House Linkage (0-10): Both planets linked to relationship houses (7/5/2/11/1/9) = 7-10, One linked = 4, 6th/8th/12th involvement reduces score</span><br>
                    <strong>Final Score (0-100) = 0.4 × (MD_rel/40 × 100) + 0.4 × (AD_rel/40 × 100) + 0.2 × (Synergy_rel/20 × 100)</strong><br>
                    <span style="margin-left: 20px;">• If MD_rel ≥ 28, enforce minimum floor of 45</span>
                </div>
            </div>
        </div>
        `;
    } else if (type === 'money') {
        formulaSection = `
        <div style="margin-bottom: 25px; padding: 15px; background: #f5f5f5; border-radius: 6px; border-left: 4px solid #2196f3;">
            <h4 style="color: #2196f3; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Financial Score Calculation Formula</h4>
            
            <!-- Formula -->
            <div style="margin-bottom: 15px; padding: 12px; background: #e3f2fd; border-radius: 4px; border-left: 3px solid #2196f3;">
                <strong style="display: block; margin-bottom: 8px; color: #1565c0; font-size: 14px;">Formula:</strong>
                <div style="font-size: 13px; color: #0d47a1; line-height: 1.6;">
                    <strong>Favorability Score = 0.4 × MD_money + 0.4 × AD_money + 0.2 × Synergy_money</strong><br>
                    <span style="margin-left: 20px;">• MD_money (0-40): Mahadasha financial weight</span><br>
                    <span style="margin-left: 40px;">- House Role: 2nd/11th/10th lords (20), Lagna/9th lords (15), 5th lord (10), 6th lord (5), Others (5)</span><br>
                    <span style="margin-left: 40px;">- Dignity: Exalted (+8), Own/Mooltrikona (+6), Friendly (+3), Neutral (+1), Enemy (-1), Debilitated (-5)</span><br>
                    <span style="margin-left: 40px;">- Shadbala: Strong (+4), Moderate (+2)</span><br>
                    <span style="margin-left: 40px;">- Afflictions: Retrograde malefic (-4), Malefic aspect (-3), Benefic aspect (+2)</span><br>
                    <span style="margin-left: 20px;">• AD_money (0-40): Antardasha financial weight</span><br>
                    <span style="margin-left: 40px;">- House Role: 2nd/11th/10th lords (22), Lagna/9th lords (18), 5th lord (12), 6th lord (5), Others (8)</span><br>
                    <span style="margin-left: 40px;">- Dignity: Exalted (+6), Own/Mooltrikona (+5), Friendly (+3), Neutral (+1), Enemy (-1), Debilitated (-4)</span><br>
                    <span style="margin-left: 40px;">- Afflictions: Retrograde malefic (-4), Malefic aspect (-3), Benefic aspect (+3)</span><br>
                    <span style="margin-left: 40px;">- Softening: If MD_money ≥ 28, cap AD penalties at -8, then add 20 baseline</span><br>
                    <span style="margin-left: 20px;">• Synergy_money (0-20): Planetary relationship and house linkage</span><br>
                    <span style="margin-left: 40px;">- Nature/Relationship (0-10): Friend/Benefic (7-10), Neutral (4-6), Enemy/Malefic (0-3)</span><br>
                    <span style="margin-left: 40px;">- House Linkage (0-10): Both planets linked to wealth houses (2/11/10/9/5) = 7-10, One linked = 4, 6th/8th/12th involvement reduces score</span><br>
                    <strong>Final Score (0-100) = 0.4 × (MD_money/40 × 100) + 0.4 × (AD_money/40 × 100) + 0.2 × (Synergy_money/20 × 100)</strong><br>
                    <span style="margin-left: 20px;">• If MD_money ≥ 28, enforce minimum floor of 45</span>
                </div>
            </div>
        </div>
        `;
    } else if (type === 'health') {
        formulaSection = `
        <div style="margin-bottom: 25px; padding: 15px; background: #f5f5f5; border-radius: 6px; border-left: 4px solid #4caf50;">
            <h4 style="color: #4caf50; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Health Score Calculation Formula</h4>
            
            <!-- Formula -->
            <div style="margin-bottom: 15px; padding: 12px; background: #e8f5e9; border-radius: 4px; border-left: 3px solid #4caf50;">
                <strong style="display: block; margin-bottom: 8px; color: #2e7d32; font-size: 14px;">Formula:</strong>
                <div style="font-size: 13px; color: #1b5e20; line-height: 1.6;">
                    <strong>Health Score (0-100) = 0.35 × (NatalHealthBase/40 × 100) + 0.25 × (MD_health/40 × 100) + 0.25 × (AD_health/40 × 100) + 0.15 × (Synergy_health/20 × 100)</strong><br>
                    <span style="margin-left: 20px;">Weights: Natal 35%, MD 25%, AD 25%, Synergy 15%</span><br>
                    <span style="margin-left: 20px;">• NatalHealthBase (0-40): Foundation from birth chart</span><br>
                    <span style="margin-left: 40px;">- House Strength: Benefics in 1H (+2 each), Malefics in 1/6/8/12 (-1 to -2), Nodes in 6/8/12 worse</span><br>
                    <span style="margin-left: 40px;">- Lord Strength: Sum of (Dignity + Shadbala + Aspects/Conjunctions) for 1L, 6L, 8L, 12L</span><br>
                    <span style="margin-left: 40px;">- Health Protector Bonus: Strong Jupiter or strong Mercury/Venus (+1 to +3)</span><br>
                    <span style="margin-left: 20px;">• MD_health (0-40): Mahadasha health weight</span><br>
                    <span style="margin-left: 40px;">- MD_role: Lagna lord (+10), 6L/8L/12L (-5), Benefic not in 6/8/12 (+5), In 6H/8H/12H (-3), Aspects Lagna/6H as benefic (+2)</span><br>
                    <span style="margin-left: 40px;">- Strength: Dignity (Exalted +4, Own +3, Friendly +1, Neutral 0, Enemy -1, Debilitated -3) + Shadbala (Strong +1, Moderate 0, Weak -1) + Afflictions (capped -3 to +3)</span><br>
                    <span style="margin-left: 40px;">- MD_raw = MD_role + Dignity + Shadbala + Afflictions, normalized: MD_health = clamp((MD_raw + 10) × 40/20, 0, 40)</span><br>
                    <span style="margin-left: 20px;">• AD_health (0-40): Antardasha health weight</span><br>
                    <span style="margin-left: 40px;">- AD_role: 6L/8L/12L (-10), Lagna lord (+8), Jupiter/strong benefic protector (+6), Malefic in 1H/6H/8H/12H (-6), Benefic in 1H/6H (+4), Links 3H-6H (-3)</span><br>
                    <span style="margin-left: 40px;">- Strength: Same dignity/Shadbala/affliction scheme as MD</span><br>
                    <span style="margin-left: 40px;">- Softening: If strong MD (≥28) AND strong constitution (≥25): AD_raw = max(AD_raw_0, -10) + 20; If strong constitution only: AD_raw = max(AD_raw_0, -12) + 18; Else: AD_raw = AD_raw_0 + 20</span><br>
                    <span style="margin-left: 20px;">• Synergy_health (0-20): Planetary relationship and house linkage</span><br>
                    <span style="margin-left: 40px;">- Nature/Relationship (0-10): Friend/Benefic (7-10), Neutral (4-6), Enemy/Malefic (0-3)</span><br>
                    <span style="margin-left: 40px;">- House Linkage (0-10): Both tied to health houses (1/6/8/12) or Lagna/1L (7-10), One tied (4-6), Mainly non-health (0-3)</span><br>
                    <strong>Floors: If MD_health ≥ 28 and NatalHealthBase ≥ 25: HealthScore ≥ 50; If NatalHealthBase ≥ 25: HealthScore ≥ 40</strong>
                </div>
            </div>
        </div>
        `;
    }
    
    return `
    <div class="prediction-section article-section" id="${sectionId}">
        <h1 style="color: #1a1a1a; margin-bottom: 10px; font-size: 28px; margin-top: 0;">${texts.title}</h1>
        <p style="color: #666; margin-bottom: 30px; font-size: 15px;">${texts.subtitle}</p>
        
        ${formulaSection}
        
        ${periodsHTML}
        
        <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin-top: 30px; border-radius: 4px;">
            <p style="margin: 0; color: #1565c0; font-size: 14px; line-height: 1.6;">
                <strong>${texts.note}:</strong> ${texts.noteText}
            </p>
        </div>
    </div>
    `;
}

// Planet themes and meanings for Dasa predictions
const PLANET_THEMES = {
    'Sun': {
        themes: 'Leadership, authority, ego, father, government, royalty, fame, vitality',
        career: 'Government positions, leadership roles, administrative work, public service',
        finance: 'Gains through authority, inheritance, government benefits',
        health: 'Heart, eyes, bones, vitality, fever-related issues',
        relationships: 'Relationship with father, authority figures, partnerships with superiors'
    },
    'Moon': {
        themes: 'Emotions, mind, mother, public, intuition, creativity, comfort, peace',
        career: 'Public relations, hospitality, nursing, creative fields, water-related businesses',
        finance: 'Gains through public appeal, emotions, maternal inheritance',
        health: 'Mental health, digestive system, emotional balance, water retention',
        relationships: 'Mother, family bonds, emotional connections, marriage timing'
    },
    'Mars': {
        themes: 'Energy, courage, aggression, siblings, land, property, surgery, fire',
        career: 'Engineering, military, police, sports, surgery, real estate, fire-related work',
        finance: 'Gains through land, property, construction, energy-driven activities',
        health: 'Accidents, injuries, blood issues, inflammation, surgical interventions',
        relationships: 'Siblings, competitive partnerships, conflicts, assertive partners'
    },
    'Mercury': {
        themes: 'Intellect, communication, business, learning, adaptability, speech, trade',
        career: 'Business, trading, communication, writing, teaching, analysis, technology',
        finance: 'Gains through business, communication, trading, intellectual property',
        health: 'Nervous system, speech disorders, skin issues, mental stress',
        relationships: 'Communication in relationships, business partnerships, siblings'
    },
    'Jupiter': {
        themes: 'Wisdom, knowledge, teacher, guru, expansion, spirituality, children, fortune',
        career: 'Teaching, counseling, law, finance, spiritual work, advisory roles',
        finance: 'Fortune, gains through knowledge, teaching, children, spirituality',
        health: 'Liver, fat-related issues, diabetes, wisdom-related health',
        relationships: 'Guru, teachers, children, harmonious partnerships, marriage blessings'
    },
    'Venus': {
        themes: 'Love, beauty, luxury, arts, creativity, marriage, finances, comfort',
        career: 'Arts, entertainment, beauty industry, luxury goods, finance, fashion',
        finance: 'Gains through arts, beauty, relationships, luxury items, marriage',
        health: 'Reproductive system, urinary tract, diabetes, beauty-related health',
        relationships: 'Marriage, love, partnerships, romantic relationships, spouse'
    },
    'Saturn': {
        themes: 'Discipline, hard work, delays, longevity, karma, service, restrictions',
        career: 'Service-oriented work, labor, construction, agriculture, delays in career',
        finance: 'Gains through hard work, delayed but steady, savings, discipline',
        health: 'Chronic diseases, bones, joints, teeth, longevity, slow recovery',
        relationships: 'Delays in marriage, older partners, service-oriented relationships'
    },
    'Rahu': {
        themes: 'Desires, illusions, foreign connections, technology, sudden gains, obsessions',
        career: 'Technology, foreign connections, research, unexpected career changes',
        finance: 'Sudden gains, foreign income, speculative gains, unexpected wealth',
        health: 'Mental illusions, addictions, skin diseases, nervous disorders',
        relationships: 'Unconventional relationships, foreign connections, sudden partnerships'
    },
    'Ketu': {
        themes: 'Spirituality, detachment, isolation, past karma, research, intuition',
        career: 'Research, spirituality, isolation, technical work, detachment from career',
        finance: 'Gains through spirituality, research, unexpected losses or gains',
        health: 'Isolation, mysterious diseases, mental detachment, past karma',
        relationships: 'Detachment in relationships, spiritual partnerships, isolation'
    }
};

// Helper function to get planet placement info
function getPlanetPlacementInfo(planet, planetsData, ascendantSign, shadbalaApiData) {
    if (!planetsData || !planetsData[planet]) return null;
    
    const planetInfo = planetsData[planet];
    const sign = planetInfo.current_sign;
    const house = getRelativeHouseNumber(ascendantSign, sign);
    const isRetro = planetInfo.isRetro === 'true' || planetInfo.isRetro === true;
    
    // Get Shadbala if available
    let shadbala = null;
    if (shadbalaApiData) {
        const planetShadbala = calculateShadbala(planet, planetInfo, planetsData, ascendantSign, shadbalaApiData);
        if (planetShadbala && planetShadbala.fromApi) {
            shadbala = {
                value: planetShadbala.shadbala,
                category: planetShadbala.shadbala >= 480 ? 'Strong' : (planetShadbala.shadbala < 350 ? 'Weak' : 'Moderate')
            };
        }
    }
    
    return { sign, house, isRetro, shadbala };
}

// Dasa Predictions Analysis - Stepwise approach following the guide
function analyzeDasaPredictions(dasaInfo, planetsData, ascendantSign, language = 'en', shadbalaApiData = null) {
    if (!dasaInfo || !planetsData || !ascendantSign) return null;
    
    // Helper: Get house lord for a given house number
    const getHouseLord = (houseNum) => {
        let houseSign = ascendantSign + houseNum - 1;
        if (houseSign > 12) houseSign -= 12;
        return ZODIAC_LORDS[houseSign];
    };
    
    // Helper: Find which houses a planet rules
    const getHousesRuledBy = (planet) => {
        const houses = [];
        for (let houseNum = 1; houseNum <= 12; houseNum++) {
            const lord = getHouseLord(houseNum);
            if (lord === planet) {
                houses.push(houseNum);
            }
        }
        return houses;
    };
    
    // Helper: Get relationship between two planets
    const getPlanetaryRelationship = (planet1, planet2) => {
        if (planet1 === planet2) return 'same';
        if (planet1 === 'Rahu' || planet1 === 'Ketu' || planet2 === 'Rahu' || planet2 === 'Ketu') {
            return 'neutral'; // Rahu/Ketu relationships not defined in standard system
        }
        const relationship = PLANETARY_RELATIONSHIPS[planet1];
        if (!relationship) return 'neutral';
        if (relationship.friends.includes(planet2)) return 'friend';
        if (relationship.enemies.includes(planet2)) return 'enemy';
        return 'neutral';
    };
    
    // Helper: Check if planet is yogakaraka (functional benefic)
    const isYogakaraka = (planet, ascendantSign) => {
        // Simplified: Jupiter and Venus are generally benefic, but this should be chart-specific
        // For now, we'll check if it's a natural benefic
        return ['Jupiter', 'Venus', 'Mercury'].includes(planet);
    };
    
    // Helper: Check if planet is malefic
    const isMalefic = (planet) => {
        return ['Mars', 'Saturn', 'Sun'].includes(planet);
    };
    
    // Helper: Check if a planet aspects a house
    const checkPlanetAspectsHouse = (planet, planetHouse, targetHouse) => {
        const aspects = ASPECT_PATTERNS.getAspects(planet, planetHouse, planetsData[planet]?.current_sign);
        return aspects[targetHouse] !== undefined;
    };
    
    // Helper: Check if two planets are in conjunction (same house)
    const arePlanetsConjunct = (planet1, planet2) => {
        const house1 = getRelativeHouseNumber(ascendantSign, planetsData[planet1]?.current_sign);
        const house2 = getRelativeHouseNumber(ascendantSign, planetsData[planet2]?.current_sign);
        return house1 === house2;
    };
    
    // Helper: Check if planets have exchange (mutual aspect or conjunction with each other's houses)
    const havePlanetaryExchange = (planet1, planet2) => {
        const houses1 = getHousesRuledBy(planet1);
        const houses2 = getHousesRuledBy(planet2);
        const house1 = getRelativeHouseNumber(ascendantSign, planetsData[planet1]?.current_sign);
        const house2 = getRelativeHouseNumber(ascendantSign, planetsData[planet2]?.current_sign);
        
        // Check if planet1 aspects planet2's house or vice versa
        if (checkPlanetAspectsHouse(planet1, house1, house2) || checkPlanetAspectsHouse(planet2, house2, house1)) {
            return true;
        }
        
        // Check if planet1 is in planet2's ruled house or vice versa
        if (houses2.includes(house1) || houses1.includes(house2)) {
            return true;
        }
        
        return false;
    };
    
    // Helper: Count malefic aspects on a planet
    const countMaleficAspects = (planet) => {
        if (!planetsData[planet]) return 0;
        const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
        let maleficCount = 0;
        
        for (const [otherPlanet, otherInfo] of Object.entries(planetsData)) {
            if (otherPlanet === planet || otherPlanet === 'Ascendant' || otherPlanet === 'ayanamsa') continue;
            if (!otherInfo.current_sign) continue;
            
            const otherHouse = getRelativeHouseNumber(ascendantSign, otherInfo.current_sign);
            const aspects = ASPECT_PATTERNS.getAspects(otherPlanet, otherHouse, otherInfo.current_sign);
            
            if (aspects[planetHouse] && MALIFIC_PLANETS.includes(otherPlanet)) {
                maleficCount++;
            }
        }
        
        return maleficCount;
    };
    
    // Helper: Count benefic aspects on a planet
    const countBeneficAspects = (planet) => {
        if (!planetsData[planet]) return 0;
        const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
        let beneficCount = 0;
        
        for (const [otherPlanet, otherInfo] of Object.entries(planetsData)) {
            if (otherPlanet === planet || otherPlanet === 'Ascendant' || otherPlanet === 'ayanamsa') continue;
            if (!otherInfo.current_sign) continue;
            
            const otherHouse = getRelativeHouseNumber(ascendantSign, otherInfo.current_sign);
            const aspects = ASPECT_PATTERNS.getAspects(otherPlanet, otherHouse, otherInfo.current_sign);
            
            if (aspects[planetHouse] && BENEFIC_PLANETS.includes(otherPlanet)) {
                beneficCount++;
            }
        }
        
        return beneficCount;
    };
    
    // Calculate MD_money (0-40) for money/finance - NEW RULES
    const calculateMDBaseScore = (mdPlanet, mdHousesRuled, mdDignity, mdShadbala, mdPlanetInfo) => {
        let score = 0;
        
        // 1. House role weight (money focus)
        const tenthLord = getHouseLord(10);
        const secondLord = getHouseLord(2);
        const eleventhLord = getHouseLord(11);
        const ninthLord = getHouseLord(9);
        const lagnaLord = getHouseLord(1);
        const fifthLord = getHouseLord(5);
        const sixthLord = getHouseLord(6);
        
        if (mdPlanet === secondLord || mdPlanet === eleventhLord || mdPlanet === tenthLord) {
            score += 20;
        } else if (mdPlanet === lagnaLord || mdPlanet === ninthLord) {
            score += 15;
        } else if (mdPlanet === fifthLord) {
            score += 10;
        } else if (mdPlanet === sixthLord) {
            score += 5;
        } else {
            // Others (3,4,7,8,12 only)
            score += 5;
        }
        
        // 2. Dignity
        if (mdDignity) {
            if (mdDignity.isExalted) {
                score += 8;
            } else if (mdDignity.isOwnSign || mdDignity.isMoolatrikona) {
                score += 6;
            } else if (mdDignity.type === 'friendly') {
                score += 3;
            } else if (mdDignity.type === 'neutral') {
                score += 1;
            } else if (mdDignity.type === 'enemy') {
                score -= 1;
            } else if (mdDignity.isDebilitated) {
                score -= 5;
            }
        }
        
        // 3. Shadbala
        if (mdShadbala) {
            const shadbalaValue = mdShadbala.shadbala || mdShadbala.value || 0;
            if (mdShadbala.category === 'Strong' || shadbalaValue >= 480) {
                score += 4;
            } else if (mdShadbala.category === 'Moderate' || (shadbalaValue >= 350 && shadbalaValue < 480)) {
                score += 2;
            } else {
                score += 0; // Weak
            }
        }
        
        // 4. Afflictions/benefit
        const isRetro = mdPlanetInfo?.isRetro === true || mdPlanetInfo?.isRetro === 'true';
        if (isRetro && isMalefic(mdPlanet)) {
            score -= 4; // Retrograde malefic
        }
        
        const maleficAspectCount = countMaleficAspects(mdPlanet);
        if (maleficAspectCount >= 1) {
            score -= 3; // Strong malefic aspect
        }
        
        const beneficAspectCount = countBeneficAspects(mdPlanet);
        if (beneficAspectCount >= 1) {
            score += 2; // Strong benefic aspect
        }
        
        // Clip to 0-40 (so even average MD has some base support)
        return Math.max(0, Math.min(40, score));
    };
    
    // Calculate AD_money_weight (0-40) for money/finance - NEW RULES
    // Note: This returns AD_raw. The softening rule (cap at -8, add 20) is applied in the calling function
    const calculateADMoneyWeight = (adPlanet, adHousesRuled, adDignity, adPlanetInfo) => {
        let score = 0;
        
        // 1. House role for money
        const secondLord = getHouseLord(2);
        const eleventhLord = getHouseLord(11);
        const ninthLord = getHouseLord(9);
        const fifthLord = getHouseLord(5);
        const lagnaLord = getHouseLord(1);
        const sixthLord = getHouseLord(6);
        const tenthLord = getHouseLord(10);
        const eighthLord = getHouseLord(8);
        const twelfthLord = getHouseLord(12);
        
        if (adPlanet === secondLord || adPlanet === eleventhLord) {
            score += 22;
        } else if (adPlanet === ninthLord || adPlanet === fifthLord || adPlanet === lagnaLord) {
            score += 15;
        } else if (adPlanet === tenthLord) {
            score += 12;
        } else if (adPlanet === sixthLord) {
            score += 8;
        } else if (adPlanet === eighthLord || adPlanet === twelfthLord) {
            score -= 5;
        } else {
            // Others (3,4,7 only)
            score += 6;
        }
        
        // 2. Dignity
        if (adDignity) {
            if (adDignity.isExalted) {
                score += 6;
            } else if (adDignity.isOwnSign || adDignity.isMoolatrikona) {
                score += 5;
            } else if (adDignity.type === 'friendly') {
                score += 3;
            } else if (adDignity.type === 'neutral') {
                score += 1;
            } else if (adDignity.type === 'enemy') {
                score -= 1;
            } else if (adDignity.isDebilitated) {
                score -= 4;
            }
        }
        
        // 3. Afflictions/benefit
        const isRetro = adPlanetInfo?.isRetro === true || adPlanetInfo?.isRetro === 'true';
        if (isRetro && isMalefic(adPlanet)) {
            score -= 4; // Retrograde malefic
        }
        
        const beneficAspectCount = countBeneficAspects(adPlanet);
        if (beneficAspectCount >= 1) {
            score += 3; // Strong benefic aspect
        }
        
        const maleficAspectCount = countMaleficAspects(adPlanet);
        if (maleficAspectCount >= 1) {
            score -= 3; // Strong malefic aspect
        }
        
        // Return AD_raw (can be negative, will be adjusted in calling function)
        return score;
    };
    
    // Calculate Synergy score (0-20) between MD and AD - NEW RULES
    const calculateSynergyScore = (mdPlanet, adPlanet, mdHousesRuled, adHousesRuled) => {
        let relScore = 0; // Relationship component (0-10)
        let houseLinkScore = 0; // House linkage component (0-10)
        
        // 1. Relationship & nature (0-10)
        const relationship = getPlanetaryRelationship(mdPlanet, adPlanet);
        const mdIsBenefic = BENEFIC_PLANETS.includes(mdPlanet);
        const adIsBenefic = BENEFIC_PLANETS.includes(adPlanet);
        
        const secondLord = getHouseLord(2);
        const eleventhLord = getHouseLord(11);
        const tenthLord = getHouseLord(10);
        
        const mdLinkedToMoney = mdHousesRuled.includes(2) || mdHousesRuled.includes(11) || mdHousesRuled.includes(10) || 
                                mdPlanet === secondLord || mdPlanet === eleventhLord || mdPlanet === tenthLord;
        const adLinkedToMoney = adHousesRuled.includes(2) || adHousesRuled.includes(11) || adHousesRuled.includes(10) || 
                                adPlanet === secondLord || adPlanet === eleventhLord || adPlanet === tenthLord;
        
        // Both benefics / functional friends, or support 2/11/10 link
        if ((relationship === 'friend' || (mdIsBenefic && adIsBenefic)) && (mdLinkedToMoney || adLinkedToMoney)) {
            relScore += 8; // Can go up to 10 if they aspect/conjunct
            if (arePlanetsConjunct(mdPlanet, adPlanet) || havePlanetaryExchange(mdPlanet, adPlanet)) {
                relScore += 2; // Max 10
            }
        } else if (relationship === 'neutral') {
            relScore += 4; // Can go up to 6
            if (mdLinkedToMoney || adLinkedToMoney) {
                relScore += 2; // Up to 6
            }
        } else if (relationship === 'enemy') {
            // Check for heavy 6-8 or 2-12 relationship
            const sixthLord = getHouseLord(6);
            const eighthLord = getHouseLord(8);
            const twelfthLord = getHouseLord(12);
            if ((mdHousesRuled.includes(6) || mdHousesRuled.includes(8)) || 
                (adHousesRuled.includes(6) || adHousesRuled.includes(8)) ||
                (mdPlanet === sixthLord && adPlanet === eighthLord) ||
                (mdHousesRuled.includes(2) && adHousesRuled.includes(12)) ||
                (mdHousesRuled.includes(12) && adHousesRuled.includes(2))) {
                relScore += 0; // Functional enemies or heavy 6-8/2-12 relationship
            } else {
                relScore += 3; // Moderate
            }
        }
        
        // 2. House linkage (0-10)
        const ninthLord = getHouseLord(9);
        const fifthLord = getHouseLord(5);
        const lagnaLord = getHouseLord(1);
        const eighthLord = getHouseLord(8);
        const twelfthLord = getHouseLord(12);
        
        // Clear connection between 2nd, 11th, 10th, 9th, 5th lords
        const moneyHouses = [2, 11, 10, 9, 5];
        const mdMoneyLink = mdHousesRuled.some(h => moneyHouses.includes(h)) || 
                           mdPlanet === secondLord || mdPlanet === eleventhLord || mdPlanet === tenthLord || 
                           mdPlanet === ninthLord || mdPlanet === fifthLord || mdPlanet === lagnaLord;
        const adMoneyLink = adHousesRuled.some(h => moneyHouses.includes(h)) || 
                           adPlanet === secondLord || adPlanet === eleventhLord || adPlanet === tenthLord || 
                           adPlanet === ninthLord || adPlanet === fifthLord || adPlanet === lagnaLord;
        
        if (mdMoneyLink && adMoneyLink) {
            // Check if they aspect or conjunct
            if (arePlanetsConjunct(mdPlanet, adPlanet) || havePlanetaryExchange(mdPlanet, adPlanet)) {
                houseLinkScore += 10; // Max
            } else {
                houseLinkScore += 7; // Strong link
            }
        } else if (mdMoneyLink || adMoneyLink) {
            houseLinkScore += 4; // Moderate link
        }
        
        // Strong involvement of 8th/12th in money chain
        const mdHas8or12 = mdHousesRuled.includes(8) || mdHousesRuled.includes(12) || mdPlanet === eighthLord || mdPlanet === twelfthLord;
        const adHas8or12 = adHousesRuled.includes(8) || adHousesRuled.includes(12) || adPlanet === eighthLord || adPlanet === twelfthLord;
        if (mdHas8or12 && adHas8or12) {
            houseLinkScore = Math.max(0, houseLinkScore - 4); // Subtract 3-5, or just give 0-2
        } else if (mdHas8or12 || adHas8or12) {
            houseLinkScore = Math.max(0, houseLinkScore - 2);
        }
        
        // Combine: Syn = rel component + house-link component
        const totalScore = relScore + houseLinkScore;
        
        // Clip to 0-20
        return Math.max(0, Math.min(20, totalScore));
    };
    
    // Calculate MD_rel (0-40) for relationships - NEW RULES
    const calculateMDRelationshipScore = (mdPlanet, mdHousesRuled, mdDignity, mdShadbala, mdPlanetInfo) => {
        let score = 0;
        
        // 1. House role weight (relationship focus) - take highest, not sum
        const seventhLord = getHouseLord(7);
        const fifthLord = getHouseLord(5);
        const secondLord = getHouseLord(2);
        const eleventhLord = getHouseLord(11);
        const lagnaLord = getHouseLord(1);
        const ninthLord = getHouseLord(9);
        const fourthLord = getHouseLord(4);
        const sixthLord = getHouseLord(6);
        const eighthLord = getHouseLord(8);
        const twelfthLord = getHouseLord(12);
        
        let houseRoleScore = 0;
        if (mdPlanet === seventhLord) {
            houseRoleScore = 20; // Primary
        } else if (mdPlanet === 'Venus') {
            houseRoleScore = 10; // Natural karaka
        } else if (mdPlanet === fifthLord || mdPlanet === secondLord || 
                  mdPlanet === eleventhLord || mdPlanet === lagnaLord || 
                  mdPlanet === ninthLord) {
            houseRoleScore = 8;
        } else if (mdPlanet === fourthLord) {
            houseRoleScore = 5;
        } else if (mdPlanet === sixthLord || mdPlanet === eighthLord || 
                  mdPlanet === twelfthLord) {
            houseRoleScore = 3; // Obstacles
        }
        score += houseRoleScore;
        
        // 2. Dignity of MD lord
        if (mdDignity) {
            if (mdDignity.isExalted) {
                score += 8;
            } else if (mdDignity.isOwnSign || mdDignity.isMoolatrikona) {
                score += 6;
            } else if (mdDignity.type === 'friendly') {
                score += 3;
            } else if (mdDignity.type === 'neutral') {
                score += 1;
            } else if (mdDignity.type === 'enemy') {
                score -= 1;
            } else if (mdDignity.isDebilitated) {
                score -= 5;
            }
        }
        
        // 3. Shadbala of MD lord
        if (mdShadbala) {
            const shadbalaValue = mdShadbala.shadbala || mdShadbala.value || 0;
            if (mdShadbala.category === 'Strong' || shadbalaValue >= 480) {
                score += 4;
            } else if (mdShadbala.category === 'Moderate' || (shadbalaValue >= 350 && shadbalaValue < 480)) {
                score += 2;
            }
        }
        
        // 4. Afflictions / support
        const isRetro = mdPlanetInfo?.isRetro === true || mdPlanetInfo?.isRetro === 'true';
        if (isRetro && isMalefic(mdPlanet)) {
            score -= 4; // Retrograde malefic
        }
        
        const maleficAspectCount = countMaleficAspects(mdPlanet);
        if (maleficAspectCount >= 1) {
            score -= 3; // Strong malefic aspect (Saturn/Rahu/Mars)
        }
        
        const beneficAspectCount = countBeneficAspects(mdPlanet);
        if (beneficAspectCount >= 1) {
            score += 2; // Strong benefic aspect
        }
        
        // Clip to 0-40
        return Math.max(0, Math.min(40, score));
    };
    
    // Calculate AD_rel (0-40) for relationships - NEW RULES
    // Note: This returns AD_raw. The softening rule (cap at -8, add 20) is applied in the calling function
    const calculateADRelationshipWeight = (adPlanet, adHousesRuled, adDignity, adPlanetInfo) => {
        let score = 0;
        
        // 1. House role for relationships - take highest
        const seventhLord = getHouseLord(7);
        const fifthLord = getHouseLord(5);
        const secondLord = getHouseLord(2);
        const eleventhLord = getHouseLord(11);
        const lagnaLord = getHouseLord(1);
        const ninthLord = getHouseLord(9);
        const fourthLord = getHouseLord(4);
        const sixthLord = getHouseLord(6);
        const eighthLord = getHouseLord(8);
        const twelfthLord = getHouseLord(12);
        
        let houseRoleScore = 0;
        if (adPlanet === seventhLord || adPlanet === 'Venus') {
            houseRoleScore = 22;
        } else if (adPlanet === fifthLord || adPlanet === secondLord || 
                  adPlanet === eleventhLord || adPlanet === lagnaLord || 
                  adPlanet === ninthLord || adPlanet === 'Jupiter') {
            houseRoleScore = 15;
        } else if (adPlanet === fourthLord) {
            houseRoleScore = 10;
        } else if (adPlanet === sixthLord || adPlanet === eighthLord || 
                  adPlanet === twelfthLord) {
            houseRoleScore = -5;
        } else {
            houseRoleScore = 6; // Others (3rd, 10th only)
        }
        score += houseRoleScore;
        
        // 2. Dignity
        if (adDignity) {
            if (adDignity.isExalted) {
                score += 6;
            } else if (adDignity.isOwnSign || adDignity.isMoolatrikona) {
                score += 5;
            } else if (adDignity.type === 'friendly') {
                score += 3;
            } else if (adDignity.type === 'neutral') {
                score += 1;
            } else if (adDignity.type === 'enemy') {
                score -= 1;
            } else if (adDignity.isDebilitated) {
                score -= 4;
            }
        }
        
        // 3. Afflictions / benefit
        const isRetro = adPlanetInfo?.isRetro === true || adPlanetInfo?.isRetro === 'true';
        if (isRetro && isMalefic(adPlanet)) {
            score -= 4; // Retrograde malefic
        }
        
        const beneficAspectCount = countBeneficAspects(adPlanet);
        if (beneficAspectCount >= 1) {
            score += 3; // Strong benefic aspect
        }
        
        const maleficAspectCount = countMaleficAspects(adPlanet);
        if (maleficAspectCount >= 1) {
            score -= 3; // Strong malefic aspect
        }
        
        // Return AD_raw (can be negative, will be adjusted in calling function)
        return score;
    };
    
    // Calculate MD_job (0-40) for job/career - NEW RULES
    const calculateMDJobScore = (mdPlanet, mdHousesRuled, mdDignity, mdShadbala, mdPlanetInfo) => {
        let score = 0;
        
        // 1. House-role weight for job - pick strongest applicable role
        const tenthLord = getHouseLord(10);
        const sixthLord = getHouseLord(6);
        const eleventhLord = getHouseLord(11);
        const lagnaLord = getHouseLord(1);
        const ninthLord = getHouseLord(9);
        const secondLord = getHouseLord(2);
        const fifthLord = getHouseLord(5);
        const fourthLord = getHouseLord(4);
        const seventhLord = getHouseLord(7);
        const eighthLord = getHouseLord(8);
        const twelfthLord = getHouseLord(12);
        
        let houseRoleScore = 0;
        if (mdPlanet === tenthLord) {
            houseRoleScore = 20; // Primary career indicator
        } else if (mdPlanet === sixthLord || mdPlanet === eleventhLord) {
            houseRoleScore = 15;
        } else if (mdPlanet === lagnaLord || mdPlanet === ninthLord || mdPlanet === secondLord) {
            houseRoleScore = 10;
        } else if (mdPlanet === fifthLord) {
            houseRoleScore = 8;
        } else if (mdPlanet === fourthLord || mdPlanet === seventhLord) {
            houseRoleScore = 6;
        } else if (mdPlanet === eighthLord || mdPlanet === twelfthLord) {
            houseRoleScore = 3; // Obstacles
        }
        score += houseRoleScore;
        
        // 2. Dignity of MD lord
        if (mdDignity) {
            if (mdDignity.isExalted) {
                score += 8;
            } else if (mdDignity.isOwnSign || mdDignity.isMoolatrikona) {
                score += 6;
            } else if (mdDignity.type === 'friendly') {
                score += 3;
            } else if (mdDignity.type === 'neutral') {
                score += 1;
            } else if (mdDignity.type === 'enemy') {
                score -= 1;
            } else if (mdDignity.isDebilitated) {
                score -= 5;
            }
        }
        
        // 3. Shadbala of MD lord
        if (mdShadbala) {
            const shadbalaValue = mdShadbala.shadbala || mdShadbala.value || 0;
            if (mdShadbala.category === 'Strong' || shadbalaValue >= 480) {
                score += 4;
            } else if (mdShadbala.category === 'Moderate' || (shadbalaValue >= 350 && shadbalaValue < 480)) {
                score += 2;
            }
        }
        
        // 4. Afflictions / support
        const isRetro = mdPlanetInfo?.isRetro === true || mdPlanetInfo?.isRetro === 'true';
        if (isRetro && isMalefic(mdPlanet)) {
            score -= 4; // Retrograde malefic
        }
        
        const maleficAspectCount = countMaleficAspects(mdPlanet);
        if (maleficAspectCount >= 1) {
            score -= 3; // Strong malefic aspect (Saturn, Rahu, Mars)
        }
        
        const beneficAspectCount = countBeneficAspects(mdPlanet);
        if (beneficAspectCount >= 1) {
            score += 2; // Strong benefic aspect
        }
        
        // Clip to 0-40
        return Math.max(0, Math.min(40, score));
    };
    
    // Calculate AD_job (0-40) for job/career - NEW RULES
    // Note: This returns AD_raw. The softening rule (cap at -8, add 20) is applied in the calling function
    const calculateADJobWeight = (adPlanet, adHousesRuled, adDignity, adPlanetInfo) => {
        let score = 0;
        
        // 1. House-role weight for job - pick strongest
        const sixthLord = getHouseLord(6);
        const tenthLord = getHouseLord(10);
        const eleventhLord = getHouseLord(11);
        const lagnaLord = getHouseLord(1);
        const secondLord = getHouseLord(2);
        const ninthLord = getHouseLord(9);
        const fifthLord = getHouseLord(5);
        const seventhLord = getHouseLord(7);
        const eighthLord = getHouseLord(8);
        const twelfthLord = getHouseLord(12);
        
        let houseRoleScore = 0;
        if (adPlanet === sixthLord || adPlanet === tenthLord || adPlanet === eleventhLord) {
            houseRoleScore = 20;
        } else if (adPlanet === lagnaLord || adPlanet === secondLord || adPlanet === ninthLord) {
            houseRoleScore = 15;
        } else if (adPlanet === fifthLord || adPlanet === seventhLord) {
            houseRoleScore = 10;
        } else if (adPlanet === eighthLord || adPlanet === twelfthLord) {
            houseRoleScore = -5;
        } else {
            houseRoleScore = 6; // Others (3rd, 4th only)
        }
        score += houseRoleScore;
        
        // 2. Dignity of AD lord
        if (adDignity) {
            if (adDignity.isExalted) {
                score += 6;
            } else if (adDignity.isOwnSign || adDignity.isMoolatrikona) {
                score += 5;
            } else if (adDignity.type === 'friendly') {
                score += 3;
            } else if (adDignity.type === 'neutral') {
                score += 1;
            } else if (adDignity.type === 'enemy') {
                score -= 1;
            } else if (adDignity.isDebilitated) {
                score -= 4;
            }
        }
        
        // 3. Afflictions / benefit
        const isRetro = adPlanetInfo?.isRetro === true || adPlanetInfo?.isRetro === 'true';
        if (isRetro && isMalefic(adPlanet)) {
            score -= 4; // Retrograde malefic
        }
        
        const beneficAspectCount = countBeneficAspects(adPlanet);
        if (beneficAspectCount >= 1) {
            score += 3; // Strong benefic aspect
        }
        
        const maleficAspectCount = countMaleficAspects(adPlanet);
        if (maleficAspectCount >= 1) {
            score -= 3; // Strong malefic aspect
        }
        
        // Return AD_raw (can be negative, will be adjusted in calling function)
        return score;
    };
    
    // Calculate Synergy_job (0-20) for job/career - NEW RULES
    const calculateJobSynergyScore = (mdPlanet, adPlanet, mdHousesRuled, adHousesRuled) => {
        let relScore = 0; // Nature & relationship component (0-10)
        let houseLinkScore = 0; // House-linkage component (0-10)
        
        // 1. Nature & relationship (0-10)
        const relationship = getPlanetaryRelationship(mdPlanet, adPlanet);
        const mdIsBenefic = BENEFIC_PLANETS.includes(mdPlanet);
        const adIsBenefic = BENEFIC_PLANETS.includes(adPlanet);
        const mdIsMalefic = MALIFIC_PLANETS.includes(mdPlanet);
        const adIsMalefic = MALIFIC_PLANETS.includes(adPlanet);
        
        const sixthLord = getHouseLord(6);
        const tenthLord = getHouseLord(10);
        const eleventhLord = getHouseLord(11);
        const secondLord = getHouseLord(2);
        const lagnaLord = getHouseLord(1);
        const ninthLord = getHouseLord(9);
        
        const mdLinkedToJob = mdHousesRuled.includes(6) || mdHousesRuled.includes(10) || mdHousesRuled.includes(11) || 
                              mdPlanet === sixthLord || mdPlanet === tenthLord || mdPlanet === eleventhLord;
        const adLinkedToJob = adHousesRuled.includes(6) || adHousesRuled.includes(10) || adHousesRuled.includes(11) || 
                             adPlanet === sixthLord || adPlanet === tenthLord || adPlanet === eleventhLord;
        
        if ((relationship === 'friend' || (mdIsBenefic && adIsBenefic)) && (mdLinkedToJob || adLinkedToJob)) {
            relScore = 7; // Can go up to 10
            if (arePlanetsConjunct(mdPlanet, adPlanet) || havePlanetaryExchange(mdPlanet, adPlanet)) {
                relScore = 10; // Max
            }
        } else if (relationship === 'neutral') {
            relScore = mdLinkedToJob || adLinkedToJob ? 6 : 4;
        } else if (relationship === 'enemy' || (mdIsMalefic && adIsMalefic)) {
            // Check for 6-8 or 2-12 relationships
            const eighthLord = getHouseLord(8);
            const twelfthLord = getHouseLord(12);
            const mdHas6or8 = mdHousesRuled.includes(6) || mdHousesRuled.includes(8);
            const adHas6or8 = adHousesRuled.includes(6) || adHousesRuled.includes(8);
            const mdHas2or12 = mdHousesRuled.includes(2) || mdHousesRuled.includes(12);
            const adHas2or12 = adHousesRuled.includes(2) || adHousesRuled.includes(12);
            
            if ((mdHas6or8 && adHas6or8) || (mdHas2or12 && adHas2or12) ||
                (mdHousesRuled.includes(2) && adHousesRuled.includes(12)) ||
                (mdHousesRuled.includes(12) && adHousesRuled.includes(2))) {
                relScore = 0; // Functional enemies or strongly tied by 6-8/2-12
            } else {
                relScore = 3;
            }
        }
        
        // 2. House-linkage for job (0-10)
        const fifthLord = getHouseLord(5);
        const eighthLord = getHouseLord(8);
        const twelfthLord = getHouseLord(12);
        
        const jobHouses = [10, 6, 11, 2, 1, 9];
        const mdJobLink = mdHousesRuled.some(h => jobHouses.includes(h)) || 
                         mdPlanet === tenthLord || mdPlanet === sixthLord || mdPlanet === eleventhLord || 
                         mdPlanet === secondLord || mdPlanet === lagnaLord || mdPlanet === ninthLord;
        const adJobLink = adHousesRuled.some(h => jobHouses.includes(h)) || 
                         adPlanet === tenthLord || adPlanet === sixthLord || adPlanet === eleventhLord || 
                         adPlanet === secondLord || adPlanet === lagnaLord || adPlanet === ninthLord;
        
        if (mdJobLink && adJobLink) {
            if (arePlanetsConjunct(mdPlanet, adPlanet) || havePlanetaryExchange(mdPlanet, adPlanet)) {
                houseLinkScore = 10; // Max
            } else {
                houseLinkScore = 7; // Strong link
            }
        } else if (mdJobLink || adJobLink) {
            houseLinkScore = 4;
        }
        
        // Heavy involvement of 8th/12th in this chain
        const mdHas8or12 = mdHousesRuled.includes(8) || mdHousesRuled.includes(12) || mdPlanet === eighthLord || mdPlanet === twelfthLord;
        const adHas8or12 = adHousesRuled.includes(8) || adHousesRuled.includes(12) || adPlanet === eighthLord || adPlanet === twelfthLord;
        
        if (mdHas8or12 && adHas8or12) {
            houseLinkScore = Math.max(0, houseLinkScore - 4); // Subtract 3-5, or keep linkage low
        } else if (mdHas8or12 || adHas8or12) {
            houseLinkScore = Math.max(0, houseLinkScore - 2);
        }
        
        // Combine: Syn_job = rel component + house-link component
        const totalScore = relScore + houseLinkScore;
        
        // Clip to 0-20
        return Math.max(0, Math.min(20, totalScore));
    };
    
    // Calculate Synergy_rel (0-20) for relationships - NEW RULES
    const calculateRelationshipSynergyScore = (mdPlanet, adPlanet, mdHousesRuled, adHousesRuled) => {
        let relScore = 0; // Nature/relationship component (0-10)
        let houseLinkScore = 0; // House linkage component (0-10)
        
        // 1. Nature/relationship (0-10)
        const relationship = getPlanetaryRelationship(mdPlanet, adPlanet);
        const mdIsBenefic = BENEFIC_PLANETS.includes(mdPlanet);
        const adIsBenefic = BENEFIC_PLANETS.includes(adPlanet);
        const mdIsMalefic = MALIFIC_PLANETS.includes(mdPlanet);
        const adIsMalefic = MALIFIC_PLANETS.includes(adPlanet);
        
        const seventhLord = getHouseLord(7);
        const isRelKeyPlanet = (planet) => {
            return planet === seventhLord || planet === 'Venus' || planet === 'Jupiter';
        };
        
        if ((relationship === 'friend' || (mdIsBenefic && adIsBenefic)) || 
            isRelKeyPlanet(mdPlanet) || isRelKeyPlanet(adPlanet)) {
            relScore = 7; // Can go up to 10
            if (arePlanetsConjunct(mdPlanet, adPlanet) || havePlanetaryExchange(mdPlanet, adPlanet)) {
                relScore = 10; // Max
            }
        } else if (relationship === 'neutral') {
            relScore = isRelKeyPlanet(mdPlanet) || isRelKeyPlanet(adPlanet) ? 6 : 4;
        } else if (relationship === 'enemy' || (mdIsMalefic && adIsMalefic)) {
            // Check for 6-8 or 2-12 relationship
            const mdHas6or8 = mdHousesRuled.includes(6) || mdHousesRuled.includes(8);
            const adHas6or8 = adHousesRuled.includes(6) || adHousesRuled.includes(8);
            const mdHas2or12 = mdHousesRuled.includes(2) || mdHousesRuled.includes(12);
            const adHas2or12 = adHousesRuled.includes(2) || adHousesRuled.includes(12);
            
            if ((mdHas6or8 && adHas6or8) || (mdHas2or12 && adHas2or12) || 
                (mdHousesRuled.includes(2) && adHousesRuled.includes(12)) ||
                (mdHousesRuled.includes(12) && adHousesRuled.includes(2))) {
                relScore = 0; // Functional enemies, both malefic, or tied by 6-8/2-12
            } else {
                relScore = 3;
            }
        }
        
        // 2. House linkage for relationships (0-10)
        const fifthLord = getHouseLord(5);
        const secondLord = getHouseLord(2);
        const eleventhLord = getHouseLord(11);
        const lagnaLord = getHouseLord(1);
        const ninthLord = getHouseLord(9);
        const sixthLord = getHouseLord(6);
        const eighthLord = getHouseLord(8);
        const twelfthLord = getHouseLord(12);
        
        const relHouses = [7, 5, 2, 11, 1, 9];
        const mdRelLink = mdHousesRuled.some(h => relHouses.includes(h)) || 
                         mdPlanet === seventhLord || mdPlanet === fifthLord || 
                         mdPlanet === secondLord || mdPlanet === eleventhLord || 
                         mdPlanet === lagnaLord || mdPlanet === ninthLord || 
                         mdPlanet === 'Venus' || mdPlanet === 'Jupiter';
        const adRelLink = adHousesRuled.some(h => relHouses.includes(h)) || 
                         adPlanet === seventhLord || adPlanet === fifthLord || 
                         adPlanet === secondLord || adPlanet === eleventhLord || 
                         adPlanet === lagnaLord || adPlanet === ninthLord || 
                         adPlanet === 'Venus' || adPlanet === 'Jupiter';
        
        if (mdRelLink && adRelLink) {
            if (arePlanetsConjunct(mdPlanet, adPlanet) || havePlanetaryExchange(mdPlanet, adPlanet)) {
                houseLinkScore = 10; // Max
            } else {
                houseLinkScore = 7; // Strong link
            }
        } else if (mdRelLink || adRelLink) {
            houseLinkScore = 4;
        }
        
        // Prominent 6th, 8th, 12th involvement
        const mdHas6or8or12 = mdHousesRuled.includes(6) || mdHousesRuled.includes(8) || 
                             mdHousesRuled.includes(12) || mdPlanet === sixthLord || 
                             mdPlanet === eighthLord || mdPlanet === twelfthLord;
        const adHas6or8or12 = adHousesRuled.includes(6) || adHousesRuled.includes(8) || 
                             adHousesRuled.includes(12) || adPlanet === sixthLord || 
                             adPlanet === eighthLord || adPlanet === twelfthLord;
        
        if (mdHas6or8or12 && adHas6or8or12) {
            houseLinkScore = Math.max(0, houseLinkScore - 4); // Subtract 3-5, or just keep low (0-3)
        } else if (mdHas6or8or12 || adHas6or8or12) {
            houseLinkScore = Math.max(0, houseLinkScore - 2);
        }
        
        // Combine: Syn_rel = rel component + house-link component
        const totalScore = relScore + houseLinkScore;
        
        // Clip to 0-20
        return Math.max(0, Math.min(20, totalScore));
    };
    
    // Extract Dasa information
    const mahaDasaInfo = dasaInfo.maha_dasa;
    const antarDasaInfo = dasaInfo.antar_dasa;
    const pratyantarDasaInfo = dasaInfo.pratyantar_dasa;
    const sookshmaDasaInfo = dasaInfo.sookshma_antar_dasa;
    
    const mahaDasa = mahaDasaInfo?.Lord;
    const antarDasa = antarDasaInfo?.Lord;
    const pratyantarDasa = pratyantarDasaInfo?.Lord;
    const sookshmaDasa = sookshmaDasaInfo?.Lord;
    
    // Get planet themes
    const mahaThemes = PLANET_THEMES[mahaDasa] || {};
    const antarThemes = PLANET_THEMES[antarDasa] || {};
    const pratyantarThemes = PLANET_THEMES[pratyantarDasa] || {};
    const sookshmaThemes = PLANET_THEMES[sookshmaDasa] || {};
    
    // Get planet placement and dignity info
    const mahaPlacement = getPlanetPlacementInfo(mahaDasa, planetsData, ascendantSign, shadbalaApiData);
    const antarPlacement = getPlanetPlacementInfo(antarDasa, planetsData, ascendantSign, shadbalaApiData);
    const pratyantarPlacement = getPlanetPlacementInfo(pratyantarDasa, planetsData, ascendantSign, shadbalaApiData);
    const sookshmaPlacement = getPlanetPlacementInfo(sookshmaDasa, planetsData, ascendantSign, shadbalaApiData);
    
    const mahaPlanetInfo = planetsData[mahaDasa];
    const antarPlanetInfo = planetsData[antarDasa];
    const pratyantarPlanetInfo = planetsData[pratyantarDasa];
    const sookshmaPlanetInfo = planetsData[sookshmaDasa];
    
    const mahaDignity = calculatePlanetaryDignity(mahaDasa, mahaPlanetInfo);
    const antarDignity = calculatePlanetaryDignity(antarDasa, antarPlanetInfo);
    const pratyantarDignity = calculatePlanetaryDignity(pratyantarDasa, pratyantarPlanetInfo);
    const sookshmaDignity = calculatePlanetaryDignity(sookshmaDasa, sookshmaPlanetInfo);
    
    // Get houses ruled by each dasha lord
    const mahaHousesRuled = getHousesRuledBy(mahaDasa);
    const antarHousesRuled = getHousesRuledBy(antarDasa);
    const pratyantarHousesRuled = getHousesRuledBy(pratyantarDasa);
    const sookshmaHousesRuled = getHousesRuledBy(sookshmaDasa);
    
    // Get relationship between MD and AD
    const mdAdRelationship = getPlanetaryRelationship(mahaDasa, antarDasa);
    
    // Calculate duration helper
    const calculateDuration = (startTime, endTime) => {
        try {
            const start = new Date(startTime.replace(' ', 'T'));
            const end = new Date(endTime.replace(' ', 'T'));
            const diffMs = end - start;
            const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
            const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30);
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            
            if (diffYears >= 1) {
                return `${diffYears.toFixed(1)} years`;
            } else if (diffMonths >= 1) {
                return `${diffMonths.toFixed(1)} months`;
            } else {
                return `${diffDays.toFixed(0)} days`;
            }
        } catch (e) {
            return 'N/A';
        }
    };
    
    // Get remedies helper
    const getRemedies = (planet) => {
        const remedies = {
            'Sun': 'Worship Sun God, donate copper, avoid conflicts with authority',
            'Moon': 'Worship Moon, maintain emotional balance, avoid excessive water activities',
            'Mars': 'Worship Hanuman, avoid conflicts, be careful with fire and sharp objects',
            'Mercury': 'Worship Lord Vishnu, practice communication skills, avoid nervous stress',
            'Jupiter': 'Worship Guru, donate yellow items, seek knowledge and wisdom',
            'Venus': 'Worship Goddess Lakshmi, maintain harmony in relationships, enjoy arts',
            'Saturn': 'Worship Shani Dev, practice discipline, help others, accept delays patiently',
            'Rahu': 'Worship Rahu, practice detachment, avoid addictions, be cautious of illusions',
            'Ketu': 'Worship Lord Ganesha, practice spirituality, research, accept detachment'
        };
        return remedies[planet] || 'Practice meditation and maintain positive attitude';
    };
    
    // STEP 1: Analyze Mahadasha (MD) - Sets overall theme
    const mahaDasaAnalysis = {
        housesRuled: mahaHousesRuled,
        placement: mahaPlacement,
        dignity: mahaDignity,
        isYogakaraka: isYogakaraka(mahaDasa, ascendantSign),
        isMalefic: isMalefic(mahaDasa),
        strength: mahaPlacement?.shadbala?.category || (mahaDignity?.strength >= 60 ? 'Strong' : mahaDignity?.strength < 40 ? 'Weak' : 'Moderate'),
        broadQuality: mahaThemes.themes || '',
        majorEvents: mahaThemes.career || mahaThemes.finance || '',
        environment: mahaThemes.relationships || ''
    };
    
    // STEP 2: Analyze Antardasha (AD) - Fine-tunes MD area
    const antarDasaAnalysis = {
        housesRuled: antarHousesRuled,
        placement: antarPlacement,
        dignity: antarDignity,
        relationshipWithMD: mdAdRelationship,
        supportsMD: mdAdRelationship === 'friend' || mdAdRelationship === 'same',
        specificArea: antarThemes.themes || '',
        concreteEvents: antarThemes.career || antarThemes.finance || ''
    };
    
    // STEP 3: Analyze Pratyantar Dasha (PD) - Event trigger level
    const pratyantarDasaAnalysis = {
        housesRuled: pratyantarHousesRuled,
        placement: pratyantarPlacement,
        dignity: pratyantarDignity,
        linkWithMD: getPlanetaryRelationship(mahaDasa, pratyantarDasa),
        linkWithAD: getPlanetaryRelationship(antarDasa, pratyantarDasa),
        eventTrigger: pratyantarThemes.themes || '',
        timing: pratyantarThemes.career || pratyantarThemes.finance || ''
    };
    
    // STEP 4: Analyze Sookshma Dasha (SD) - Mood/tone indicator
    const sookshmaDasaAnalysis = {
        housesRuled: sookshmaHousesRuled,
        placement: sookshmaPlacement,
        dignity: sookshmaDignity,
        mood: sookshmaThemes.themes || '',
        smoothOrStressful: sookshmaDignity?.strength >= 60 ? 'Smooth' : sookshmaDignity?.strength < 40 ? 'Stressful' : 'Moderate',
        supportOrBlock: sookshmaDignity?.strength >= 60 ? 'Support' : sookshmaDignity?.strength < 40 ? 'Block' : 'Neutral'
    };
    
    // Build step information
    const steps = {
        step1: {
            dasa: 'Maha Dasa',
            planet: mahaDasa,
            duration: calculateDuration(mahaDasaInfo?.start_time, mahaDasaInfo?.end_time),
            analysis: mahaDasaAnalysis,
            themes: mahaThemes.themes || '',
            career: mahaThemes.career || '',
            finance: mahaThemes.finance || '',
            health: mahaThemes.health || '',
            relationships: mahaThemes.relationships || '',
            placement: mahaPlacement,
            startTime: mahaDasaInfo?.start_time,
            endTime: mahaDasaInfo?.end_time
        },
        step2: {
            dasa: 'Antar Dasa',
            planet: antarDasa,
            duration: calculateDuration(antarDasaInfo?.start_time, antarDasaInfo?.end_time),
            analysis: antarDasaAnalysis,
            themes: antarThemes.themes || '',
            career: antarThemes.career || '',
            finance: antarThemes.finance || '',
            health: antarThemes.health || '',
            relationships: antarThemes.relationships || '',
            placement: antarPlacement,
            startTime: antarDasaInfo?.start_time,
            endTime: antarDasaInfo?.end_time
        },
        step3: {
            dasa: 'Pratyantar Dasa',
            planet: pratyantarDasa,
            duration: calculateDuration(pratyantarDasaInfo?.start_time, pratyantarDasaInfo?.end_time),
            analysis: pratyantarDasaAnalysis,
            themes: pratyantarThemes.themes || '',
            placement: pratyantarPlacement,
            startTime: pratyantarDasaInfo?.start_time,
            endTime: pratyantarDasaInfo?.end_time
        },
        step4: {
            dasa: 'Sookshma Dasa',
            planet: sookshmaDasa,
            duration: calculateDuration(sookshmaDasaInfo?.start_time, sookshmaDasaInfo?.end_time),
            analysis: sookshmaDasaAnalysis,
            themes: sookshmaThemes.themes || '',
            placement: sookshmaPlacement,
            startTime: sookshmaDasaInfo?.start_time,
            endTime: sookshmaDasaInfo?.end_time
        }
    };
    
    // STEP 5: Combine All Four Levels using formula: (MD Theme) + (AD Area) + (PD Event) + (SD Tone)
    const generateCombinedPrediction = () => {
        const mdTheme = mahaDasaAnalysis.broadQuality || mahaThemes.themes || '';
        const adArea = antarDasaAnalysis.specificArea || antarThemes.themes || '';
        const pdEvent = pratyantarDasaAnalysis.eventTrigger || pratyantarThemes.themes || '';
        const sdTone = sookshmaDasaAnalysis.mood || sookshmaThemes.themes || '';
        
        return {
            formula: `(${mahaDasa} MD Theme) + (${antarDasa} AD Area) + (${pratyantarDasa} PD Event) + (${sookshmaDasa} SD Tone)`,
            mdTheme: mdTheme,
            adArea: adArea,
            pdEvent: pdEvent,
            sdTone: sdTone,
            combined: `${mdTheme} + ${adArea} + ${pdEvent} + ${sdTone}`
        };
    };
    
    const combinedPrediction = generateCombinedPrediction();
    
    // Generate specific predictions based on the combination
    const generatePredictions = () => {
        const predictions = [];
        
        // Finance predictions
        const financePredictions = [];
        if (mahaDasaAnalysis.housesRuled.includes(2) || mahaDasaAnalysis.housesRuled.includes(11)) {
            financePredictions.push(`Financial opportunities through ${mahaDasa} MD (rules ${mahaDasaAnalysis.housesRuled.join(', ')} house)`);
        }
        if (antarDasaAnalysis.housesRuled.includes(2) || antarDasaAnalysis.housesRuled.includes(11)) {
            financePredictions.push(`Financial gains activated by ${antarDasa} AD`);
        }
        if (pratyantarDasaAnalysis.housesRuled.includes(2) || pratyantarDasaAnalysis.housesRuled.includes(11)) {
            financePredictions.push(`Financial events triggered by ${pratyantarDasa} PD`);
        }
        
        // Job/Career predictions
        const jobPredictions = [];
        if (mahaDasaAnalysis.housesRuled.includes(10) || mahaDasaAnalysis.housesRuled.includes(6)) {
            jobPredictions.push(`Career growth through ${mahaDasa} MD (rules ${mahaDasaAnalysis.housesRuled.join(', ')} house)`);
        }
        if (antarDasaAnalysis.housesRuled.includes(10) || antarDasaAnalysis.housesRuled.includes(6)) {
            jobPredictions.push(`Job opportunities in ${antarDasa} AD period`);
        }
        if (pratyantarDasaAnalysis.housesRuled.includes(10) || pratyantarDasaAnalysis.housesRuled.includes(6)) {
            jobPredictions.push(`Career events like interviews, negotiations during ${pratyantarDasa} PD`);
        }
        
        // Relationship predictions
        const relationshipPredictions = [];
        if (mahaDasaAnalysis.housesRuled.includes(7) || mahaDasa === 'Venus') {
            relationshipPredictions.push(`Important relationship phases in ${mahaDasa} MD`);
        }
        if (antarDasaAnalysis.housesRuled.includes(7) || antarDasa === 'Venus') {
            relationshipPredictions.push(`Relationship developments in ${antarDasa} AD`);
    }
    if (pratyantarDasa === 'Moon') {
            relationshipPredictions.push(`Emotional balance needed in relationships during ${pratyantarDasa} PD`);
        }
        
        // Calculate money/finance score using new detailed method
        const mdBaseScore = calculateMDBaseScore(
            mahaDasa,
            mahaHousesRuled,
            mahaDignity,
            mahaPlacement?.shadbala,
            mahaPlanetInfo
        );
        
        // Get house lords for money calculations
        const secondLord = getHouseLord(2);
        const tenthLord = getHouseLord(10);
        const eleventhLord = getHouseLord(11);
        const ninthLord = getHouseLord(9);
        const lagnaLord = getHouseLord(1);
        
        // RULE: Floors for strong MD - check if MD_money ≥ 28 (strong MD)
        // Note: We use mdBaseScore directly (not mdFactorMoney) for the floor check
        
        // Calculate AD_money_weight (returns AD_raw, can be negative)
        const adMoneyRaw = calculateADMoneyWeight(
            antarDasa,
            antarHousesRuled,
            antarDignity,
            antarPlanetInfo
        );
        
        // RULE: Soften penalties under strong MD
        // If MD_money ≥ 28 (strong MD), cap total negative from AD at -8
        let adMoneyWeight;
        if (mdBaseScore >= 28) {
            // AD_money = max(AD_raw, -8) + 20
            // This ensures AD_money lies roughly 12-40
            adMoneyWeight = Math.max(adMoneyRaw, -8) + 20;
        } else {
            // For weaker MDs, use AD_raw directly but clip to 0-40
            adMoneyWeight = Math.max(0, Math.min(40, adMoneyRaw));
        }
        
        const synergyScore = calculateSynergyScore(
            mahaDasa,
            antarDasa,
            mahaHousesRuled,
            antarHousesRuled
        );
        
        // Final money score: 0.4 * MD_money + 0.4 * AD_money + 0.2 * Syn
        // Scale each component to 0-100 first
        const mdScaled = (mdBaseScore / 40) * 100; // 0-100
        const adScaled = (adMoneyWeight / 40) * 100; // 0-100
        const synergyScaled = (synergyScore / 20) * 100; // 0-100
        let financeScore = 0.4 * mdScaled + 0.4 * adScaled + 0.2 * synergyScaled;
        
        // RULE: Floors for strong MD
        // If MD_money ≥ 28 (strong Mercury-like phase), enforce floor of 45
        if (mdBaseScore >= 28) {
            financeScore = Math.max(financeScore, 45);
        }
        
        // RULE D: Adjust Ketu/Rahu MD behavior for money
        if (mahaDasa === 'Ketu' || mahaDasa === 'Rahu') {
            const baseScore = 40;
            const keyBeneficLords = [secondLord, tenthLord, eleventhLord, ninthLord, lagnaLord];
            const antarShadbala = antarPlacement?.shadbala;
            const isStrongBeneficAD = keyBeneficLords.includes(antarDasa) && 
                                     antarDignity && !antarDignity.isDebilitated &&
                                     (!antarShadbala || !antarShadbala.fromApi || 
                                      (antarShadbala.shadbala && antarShadbala.shadbala >= 350));
            
            if (isStrongBeneficAD) {
                financeScore = Math.max(financeScore, 45);
            } else {
                financeScore = baseScore + (financeScore - baseScore) * 0.5;
            }
        }
        
        // Ensure score is 0-100
        financeScore = Math.max(0, Math.min(100, Math.round(financeScore)));
        
        // Calculate relationship score using new structured method
        const mdRelScore = calculateMDRelationshipScore(
            mahaDasa,
            mahaHousesRuled,
            mahaDignity,
            mahaPlacement?.shadbala,
            mahaPlanetInfo
        );
        
        // Calculate AD_rel_raw (can be negative)
        const adRelRaw = calculateADRelationshipWeight(
            antarDasa,
            antarHousesRuled,
            antarDignity,
            antarPlanetInfo
        );
        
        // RULE: Soften penalties under strong MD
        // If MD_rel ≥ 28, cap AD penalties at -8, then add 20
        let adRelScore;
        if (mdRelScore >= 28) {
            adRelScore = Math.max(adRelRaw, -8) + 20; // AD_rel lies roughly 12-40
        } else {
            adRelScore = adRelRaw + 20; // Add 20 for baseline
        }
        adRelScore = Math.max(0, Math.min(40, adRelScore));
        
        const relationshipSynergyScore = calculateRelationshipSynergyScore(
            mahaDasa,
            antarDasa,
            mahaHousesRuled,
            antarHousesRuled
        );
        
        // Final relationship score: 0.4 * MD_rel + 0.4 * AD_rel + 0.2 * Syn_rel
        const mdRelScaled = (mdRelScore / 40) * 100;
        const adRelScaled = (adRelScore / 40) * 100;
        const synergyRelScaled = (relationshipSynergyScore / 20) * 100;
        let relationshipScore = 0.4 * mdRelScaled + 0.4 * adRelScaled + 0.2 * synergyRelScaled;
        
        // RULE: Floor under strong 7th-lord MD
        // If MD_rel ≥ 28, enforce floor of 45
        if (mdRelScore >= 28) {
            relationshipScore = Math.max(relationshipScore, 45);
        }
        
        // Ensure score is 0-100
        relationshipScore = Math.max(0, Math.min(100, Math.round(relationshipScore)));
        
        // Calculate job score using new structured method
        const mdJobScore = calculateMDJobScore(
            mahaDasa,
            mahaHousesRuled,
            mahaDignity,
            mahaPlacement?.shadbala,
            mahaPlanetInfo
        );
        
        // Calculate AD_job_raw (can be negative)
        const adJobRaw = calculateADJobWeight(
            antarDasa,
            antarHousesRuled,
            antarDignity,
            antarPlanetInfo
        );
        
        // RULE: Soften penalties under strong career MD
        // If MD_job ≥ 28, cap AD penalties at -8, then add 20
        let adJobScore;
        if (mdJobScore >= 28) {
            adJobScore = Math.max(adJobRaw, -8) + 20; // AD_job lies roughly 12-40
        } else {
            adJobScore = adJobRaw + 20; // Add 20 for baseline
        }
        adJobScore = Math.max(0, Math.min(40, adJobScore));
        
        const jobSynergyScore = calculateJobSynergyScore(
            mahaDasa,
            antarDasa,
            mahaHousesRuled,
            antarHousesRuled
        );
        
        // Final job score: 0.4 * MD_job + 0.4 * AD_job + 0.2 * Syn_job
        const mdJobScaled = (mdJobScore / 40) * 100;
        const adJobScaled = (adJobScore / 40) * 100;
        const synergyJobScaled = (jobSynergyScore / 20) * 100;
        let jobScore = 0.4 * mdJobScaled + 0.4 * adJobScaled + 0.2 * synergyJobScaled;
        
        // RULE: Floor for strong career MDs
        // If MD_job ≥ 28, enforce floor of 45
        if (mdJobScore >= 28) {
            jobScore = Math.max(jobScore, 45);
        }
        
        // Ensure score is 0-100
        jobScore = Math.max(0, Math.min(100, Math.round(jobScore)));
    
        // Label thresholds for finance
        let financePrediction;
        if (financeScore >= 80) {
            financePrediction = 'highly favorable';
        } else if (financeScore >= 60) {
            financePrediction = 'favorable';
        } else if (financeScore >= 40) {
            financePrediction = 'moderate';
        } else if (financeScore >= 20) {
            financePrediction = 'challenging';
        } else {
            financePrediction = 'highly challenging';
        }
        
        // Job prediction using new thresholds
        let jobPrediction;
        if (jobScore >= 80) {
            jobPrediction = 'highly favorable';
        } else if (jobScore >= 60) {
            jobPrediction = 'favorable';
        } else if (jobScore >= 40) {
            jobPrediction = 'moderate';
        } else if (jobScore >= 20) {
            jobPrediction = 'challenging';
        } else {
            jobPrediction = 'highly challenging';
        }
        
        // Relationship prediction using new thresholds
        let relationshipPrediction;
        if (relationshipScore >= 80) {
            relationshipPrediction = 'highly favorable';
        } else if (relationshipScore >= 60) {
            relationshipPrediction = 'favorable';
        } else if (relationshipScore >= 40) {
            relationshipPrediction = 'moderate';
        } else if (relationshipScore >= 20) {
            relationshipPrediction = 'challenging';
        } else {
            relationshipPrediction = 'highly challenging';
        }
    
    return {
            finance: {
                score: Math.max(0, Math.min(100, financeScore)),
                prediction: financePrediction,
                insights: financePredictions.length > 0 ? financePredictions : [`${mahaDasa} MD + ${antarDasa} AD combination affects finances`]
            },
            job: {
                score: Math.max(0, Math.min(100, jobScore)),
                prediction: jobPrediction,
                insights: jobPredictions.length > 0 ? jobPredictions : [`${mahaDasa} MD + ${antarDasa} AD combination affects career`]
            },
            relationship: {
                score: Math.max(0, Math.min(100, relationshipScore)),
                prediction: relationshipPrediction,
                insights: relationshipPredictions.length > 0 ? relationshipPredictions : [`${mahaDasa} MD + ${antarDasa} AD combination affects relationships`]
            }
        };
    };
    
    const synthesis = generatePredictions();
    
    return {
        steps: steps,
        synthesis: synthesis,
        combinedPrediction: combinedPrediction,
        remedies: {
            mahaDasa: getRemedies(mahaDasa),
            antarDasa: getRemedies(antarDasa),
            pratyantarDasa: getRemedies(pratyantarDasa),
            sookshmaDasa: getRemedies(sookshmaDasa)
        },
        houseLords: {
            secondLord: getHouseLord(2),
            sixthLord: getHouseLord(6),
            seventhLord: getHouseLord(7),
            tenthLord: getHouseLord(10),
            eleventhLord: getHouseLord(11),
            ascendantLord: getHouseLord(1)
        },
        dasaInfo: { mahaDasa, antarDasa, pratyantarDasa, sookshmaDasa }
    };
}

// Generate Dasa Predictions Section with date picker
function generateDasaPredictionsSection(planetsData, ascendantSign, language = 'en', shadbalaApiData = null) {
    if (!planetsData || !ascendantSign) return '';
    
    const texts = language === 'hi' ? {
        title: 'दशा भविष्यवाणी (Dasa Predictions)',
        subtitle: 'वित्त, नौकरी और संबंधों के लिए दशा-आधारित भविष्यवाणी',
        selectDate: 'तारीख चुनें',
        getPredictions: 'भविष्यवाणी प्राप्त करें',
        loading: 'लोड हो रहा है...',
        finance: 'वित्त (Finance)',
        job: 'नौकरी/करियर (Job/Career)',
        relationship: 'संबंध (Relationships)',
        mahaDasa: 'महादशा',
        antarDasa: 'अंतरदशा',
        pratyantarDasa: 'प्रत्यंतर दशा',
        sookshmaDasa: 'सूक्ष्म दशा',
        highlyFavorable: 'अत्यधिक अनुकूल',
        favorable: 'अनुकूल',
        moderate: 'मध्यम',
        challenging: 'चुनौतीपूर्ण',
        reasons: 'कारण',
        note: 'नोट',
        noteText: 'भविष्यवाणियाँ चुने गए तारीख पर चल रहे दशा काल पर आधारित हैं।'
    } : {
        title: 'Dasa Predictions',
        subtitle: 'Predictions for Finance, Job, and Relationships based on Dasa periods',
        selectDate: 'Select Date & Time',
        getPredictions: 'Get Predictions',
        loading: 'Loading...',
        finance: 'Finance',
        job: 'Job/Career',
        relationship: 'Relationships',
        mahaDasa: 'Maha Dasa',
        antarDasa: 'Antar Dasa',
        pratyantarDasa: 'Pratyantar Dasa',
        sookshmaDasa: 'Sookshma Dasa',
        highlyFavorable: 'Highly Favorable',
        favorable: 'Favorable',
        moderate: 'Moderate',
        challenging: 'Challenging',
        reasons: 'Reasons',
        note: 'Note',
        noteText: 'Predictions are based on the Dasa periods running on the selected date.'
    };
    
    // Get current date/time as default
    const now = new Date();
    const defaultDate = now.toISOString().slice(0, 16);
    
    return `
    <div class="dasa-predictions-section article-section" id="dasa-predictions">
        <h1 style="color: #1a1a1a; margin-bottom: 10px; font-size: 28px; margin-top: 0;">${texts.title}</h1>
        <p style="color: #666; margin-bottom: 30px; font-size: 15px;">${texts.subtitle}</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #333;">${texts.selectDate}:</label>
            <input type="datetime-local" id="dasaDatePicker" value="${defaultDate}" style="padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px; width: 100%; max-width: 300px; margin-bottom: 15px;">
            <button id="getDasaPredictionsBtn" style="background: #1a1a1a; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 600;">
                ${texts.getPredictions}
            </button>
        </div>
        
        <div id="dasaPredictionsResult" style="display: none;" data-loading-text="${texts.loading}" data-button-text="${texts.getPredictions}"></div>
        
        <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin-top: 30px; border-radius: 4px;">
            <p style="margin: 0; color: #1565c0; font-size: 14px; line-height: 1.6;">
                <strong>${texts.note}:</strong> ${texts.noteText}
            </p>
        </div>
    </div>
    `;
}

// Initialize Dasa Predictions date picker handler
window.initializeDasaPredictionsHandler = function() {
    const btn = document.getElementById('getDasaPredictionsBtn');
    if (!btn) return;
    
    btn.addEventListener('click', async function() {
        const datePicker = document.getElementById('dasaDatePicker');
        const resultDiv = document.getElementById('dasaPredictionsResult');
        if (!datePicker || !resultDiv) return;
        
        // Get selected date/time
        const selectedDateTime = new Date(datePicker.value);
        if (isNaN(selectedDateTime.getTime())) {
            alert('Please select a valid date and time');
            return;
        }
        
        // Show loading
        btn.disabled = true;
        btn.textContent = resultDiv.getAttribute('data-loading-text') || 'Loading...';
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="spinner" style="margin: 0 auto 20px;"></div><p>Fetching Dasa information...</p></div>';
        
        try {
            const { planetsData, ascendantSign, shadbalaApiData, language, apiDataForRequests } = window.kundliTabData;
            
            if (!apiDataForRequests) {
                throw new Error('Birth data not available');
            }
            
            // Prepare event date for API
            const eventDate = {
                year: selectedDateTime.getFullYear(),
                month: selectedDateTime.getMonth() + 1,
                date: selectedDateTime.getDate(),
                hours: selectedDateTime.getHours(),
                minutes: selectedDateTime.getMinutes(),
                seconds: selectedDateTime.getSeconds()
            };
            
            // Fetch Dasa information
            const dasaInfo = await fetchDasaInformation(apiDataForRequests, eventDate);
            
            if (!dasaInfo) {
                throw new Error('Failed to fetch Dasa information');
            }
            
            // Analyze predictions
            const analysis = analyzeDasaPredictions(dasaInfo, planetsData, ascendantSign, language, shadbalaApiData);
            
            if (!analysis) {
                throw new Error('Failed to analyze Dasa predictions');
            }
            
            // Display predictions
            resultDiv.innerHTML = renderDasaPredictions(dasaInfo, analysis, language);
            
        } catch (error) {
            console.error('Error getting Dasa predictions:', error);
            resultDiv.innerHTML = `<div style="padding: 20px; color: #f44336;">Error: ${error.message}. Please try again.</div>`;
        } finally {
            btn.disabled = false;
            btn.textContent = resultDiv.getAttribute('data-button-text') || 'Get Predictions';
        }
    });
}

// Render Dasa Predictions HTML - Stepwise Approach
function renderDasaPredictions(dasaInfo, analysis, language) {
    if (!analysis || !analysis.steps) {
        return '<div style="padding: 20px; color: #f44336;">Error: Analysis data not available</div>';
    }
    
    const texts = language === 'hi' ? {
        step1: 'चरण 1: महादशा थीम को समझें',
        step2: 'चरण 2: महादशा के भीतर अंतरदशा का विश्लेषण करें',
        step3: 'चरण 3: अंतरदशा के भीतर प्रत्यंतर दशा पर ध्यान दें',
        step4: 'चरण 4: प्रत्यंतर दशा के भीतर सूक्ष्म दशा में ज़ूम करें',
        step5: 'चरण 5: संश्लेषण और भविष्यवाणी',
        step6: 'चरण 6: उपचार और सावधानियाँ लें',
        duration: 'अवधि',
        themes: 'थीम',
        represents: 'प्रतिनिधित्व करता है',
        expect: 'अपेक्षा करें',
        focusOn: 'ध्यान दें',
        watchFor: 'ध्यान रखें',
        finance: 'वित्त',
        job: 'नौकरी/करियर',
        relationship: 'संबंध',
        synthesis: 'संश्लेषण',
        predictions: 'भविष्यवाणियाँ',
        remedies: 'उपचार',
        precautions: 'सावधानियाँ',
        highlyFavorable: 'अत्यधिक अनुकूल',
        favorable: 'अनुकूल',
        moderate: 'मध्यम',
        challenging: 'चुनौतीपूर्ण'
    } : {
        step1: 'Step 1: Understand Maha Dasa Themes',
        step2: 'Step 2: Analyze Antar Dasa Within Maha Dasa',
        step3: 'Step 3: Focus on Pratyantar Dasa Within Antar Dasa',
        step4: 'Step 4: Zoom into Sookshma Dasa Within Pratyantar Dasa',
        step5: 'Step 5: Synthesize and Predict',
        step6: 'Step 6: Take Remedies and Precautions',
        duration: 'Duration',
        themes: 'Themes',
        represents: 'represents',
        expect: 'Expect',
        focusOn: 'Focus on',
        watchFor: 'Watch for',
        finance: 'Finance',
        job: 'Job/Career',
        relationship: 'Relationships',
        synthesis: 'Synthesis',
        predictions: 'Predictions',
        remedies: 'Remedies',
        precautions: 'Precautions',
        highlyFavorable: 'Highly Favorable',
        favorable: 'Favorable',
        moderate: 'Moderate',
        challenging: 'Challenging'
    };
    
    const formatDate = (dateStr) => {
        try {
            const date = new Date(dateStr.replace(' ', 'T'));
            return date.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };
    
    const getPlanetName = (planet) => {
        return PLANET_NAMES[language] && PLANET_NAMES[language][planet] ? PLANET_NAMES[language][planet] : planet;
    };
    
    const getCategoryColor = (prediction) => {
        if (prediction === 'highly favorable') return '#4caf50';
        if (prediction === 'favorable') return '#8bc34a';
        if (prediction === 'moderate') return '#ff9800';
        return '#f44336';
    };
    
    const steps = analysis.steps;
    const synthesis = analysis.synthesis;
    const remedies = analysis.remedies;
    
    let html = '<div style="margin-top: 30px;">';
    
    // Step 1: Maha Dasa
    const step1 = steps.step1;
    html += `
        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 5px solid #d4af37;">
            <h2 style="color: #1a1a1a; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">${texts.step1}</h2>
            <div style="margin-bottom: 15px;">
                <strong style="color: #333; font-size: 16px;">${getPlanetName(step1.planet)} ${texts.represents}</strong> ${step1.themes}
            </div>
            <div style="margin-bottom: 10px; color: #666;">
                <strong>${texts.duration}:</strong> ${step1.duration} (${formatDate(step1.startTime)} - ${formatDate(step1.endTime)})
            </div>
            <div style="margin-top: 15px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
                <div style="margin-bottom: 8px;"><strong>Career:</strong> ${step1.career || 'General career themes'}</div>
                <div style="margin-bottom: 8px;"><strong>Finance:</strong> ${step1.finance || 'Financial aspects'}</div>
                <div style="margin-bottom: 8px;"><strong>Health:</strong> ${step1.health || 'Health considerations'}</div>
                <div><strong>Relationships:</strong> ${step1.relationships || 'Relationship aspects'}</div>
            </div>
        </div>
    `;
    
    // Step 2: Antar Dasa
    const step2 = steps.step2;
    html += `
        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 5px solid #2196f3;">
            <h2 style="color: #1a1a1a; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">${texts.step2}</h2>
            <div style="margin-bottom: 15px;">
                <strong style="color: #333; font-size: 16px;">${getPlanetName(step2.planet)} ${texts.represents}</strong> ${step2.themes}
            </div>
            <div style="margin-bottom: 10px; color: #666;">
                <strong>${texts.duration}:</strong> ${step2.duration} (${formatDate(step2.startTime)} - ${formatDate(step2.endTime)})
            </div>
            <div style="margin-top: 15px; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                <div style="margin-bottom: 8px;"><strong>${texts.focusOn}:</strong> ${step2.finance || step2.career || 'Activities related to this planet'}</div>
                <div><strong>${texts.expect}:</strong> Gains from ${step2.career ? step2.career.toLowerCase() : 'related activities'}</div>
            </div>
        </div>
    `;
    
    // Step 3: Pratyantar Dasa
    const step3 = steps.step3;
    html += `
        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 5px solid #9c27b0;">
            <h2 style="color: #1a1a1a; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">${texts.step3}</h2>
            <div style="margin-bottom: 15px;">
                <strong style="color: #333; font-size: 16px;">${getPlanetName(step3.planet)} ${texts.represents}</strong> ${step3.themes}
            </div>
            <div style="margin-bottom: 10px; color: #666;">
                <strong>${texts.duration}:</strong> ${step3.duration} (${formatDate(step3.startTime)} - ${formatDate(step3.endTime)})
            </div>
            <div style="margin-top: 15px; padding: 15px; background: #f3e5f5; border-radius: 5px;">
                <div><strong>${texts.watchFor}:</strong> Short-term impacts on work life, relationships, and emotional balance</div>
            </div>
        </div>
    `;
    
    // Step 4: Sookshma Dasa
    const step4 = steps.step4;
    html += `
        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 5px solid #ff9800;">
            <h2 style="color: #1a1a1a; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">${texts.step4}</h2>
            <div style="margin-bottom: 15px;">
                <strong style="color: #333; font-size: 16px;">${getPlanetName(step4.planet)} ${texts.represents}</strong> ${step4.themes}
            </div>
            <div style="margin-bottom: 10px; color: #666;">
                <strong>${texts.duration}:</strong> ${step4.duration} (${formatDate(step4.startTime)} - ${formatDate(step4.endTime)})
            </div>
            <div style="margin-top: 15px; padding: 15px; background: #fff3e0; border-radius: 5px;">
                <div><strong>${texts.focusOn}:</strong> Ideal time for ${step4.isHouseLord ? 'important actions' : 'communication, decisions, and planning'}</div>
            </div>
        </div>
    `;
    
    // Step 5: Synthesize and Predict
    html += `
        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 5px solid #4caf50;">
            <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">${texts.step5}</h2>
    `;
    
    // Finance
    if (synthesis.finance) {
        const finance = synthesis.finance;
        const financeColor = getCategoryColor(finance.prediction);
        html += `
            <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
                <h3 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px;">${texts.finance}</h3>
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                    <span style="background: ${financeColor}; color: white; padding: 5px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">
                        ${texts[finance.prediction] || finance.prediction}
                    </span>
                    <span style="font-size: 18px; font-weight: bold; color: ${financeColor};">Score: ${finance.score}</span>
                </div>
                ${finance.insights && finance.insights.length > 0 ? `
                    <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #666; line-height: 1.6;">
                        ${finance.insights.map(i => `<li style="margin-bottom: 5px;">${i}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        `;
    }
    
    // Job
    if (synthesis.job) {
        const job = synthesis.job;
        const jobColor = getCategoryColor(job.prediction);
        html += `
            <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
                <h3 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px;">${texts.job}</h3>
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                    <span style="background: ${jobColor}; color: white; padding: 5px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">
                        ${texts[job.prediction] || job.prediction}
                    </span>
                    <span style="font-size: 18px; font-weight: bold; color: ${jobColor};">Score: ${job.score}</span>
                </div>
                ${job.insights && job.insights.length > 0 ? `
                    <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #666; line-height: 1.6;">
                        ${job.insights.map(i => `<li style="margin-bottom: 5px;">${i}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        `;
    }
    
    // Relationships
    if (synthesis.relationship) {
        const relationship = synthesis.relationship;
        const relationshipColor = getCategoryColor(relationship.prediction);
        html += `
            <div style="margin-bottom: 10px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
                <h3 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px;">${texts.relationship}</h3>
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                    <span style="background: ${relationshipColor}; color: white; padding: 5px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">
                        ${texts[relationship.prediction] || relationship.prediction}
                    </span>
                    <span style="font-size: 18px; font-weight: bold; color: ${relationshipColor};">Score: ${relationship.score}</span>
                </div>
                ${relationship.insights && relationship.insights.length > 0 ? `
                    <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #666; line-height: 1.6;">
                        ${relationship.insights.map(i => `<li style="margin-bottom: 5px;">${i}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        `;
    }
    
    html += '</div>';
    
    // Step 6: Remedies and Precautions
    html += `
        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 5px solid #f44336;">
            <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">${texts.step6}</h2>
            <div style="margin-bottom: 15px;">
                <strong>Maha Dasa (${getPlanetName(steps.step1.planet)}):</strong>
                <div style="margin-top: 5px; padding: 10px; background: #ffebee; border-radius: 5px; color: #666;">
                    ${remedies.mahaDasa}
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Antar Dasa (${getPlanetName(steps.step2.planet)}):</strong>
                <div style="margin-top: 5px; padding: 10px; background: #ffebee; border-radius: 5px; color: #666;">
                    ${remedies.antarDasa}
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Pratyantar Dasa (${getPlanetName(steps.step3.planet)}):</strong>
                <div style="margin-top: 5px; padding: 10px; background: #ffebee; border-radius: 5px; color: #666;">
                    ${remedies.pratyantarDasa}
                </div>
            </div>
            <div>
                <strong>Sookshma Dasa (${getPlanetName(steps.step4.planet)}):</strong>
                <div style="margin-top: 5px; padding: 10px; background: #ffebee; border-radius: 5px; color: #666;">
                    ${remedies.sookshmaDasa}
                </div>
            </div>
        </div>
    `;
    
    html += '</div>';
    return html;
}

const GOOD_YOGA_DEFINITIONS = {
    raj: {
        name: 'Raj Yoga',
        rule: 'Lords of Kendra (1, 4, 7, 10) and Trikona (1, 5, 9) houses conjoin, mutually aspect, or exchange.',
        example: 'Lord of 1st house in 10th house and vice versa.',
        explanation: 'The ruler of the ascendant links directly with the 10th house of career while the 10th lord returns to the ascendant. This circuit generates natural authority, leadership, and public recognition.',
        dynamicLabel: 'In your birth chart'
    },
    parivartana: {
        name: 'Parivartana Yoga (Mutual Exchange Yoga)',
        rule: 'Two house lords occupy each other’s houses, forming a mutual exchange.',
        example: '2nd lord in 5th house and 5th lord in 2nd house.',
        explanation: 'Mutual exchange fuses the meanings of the involved houses. Wealth, family values, intellect, and creativity strengthen one another, often producing resourceful expression.',
        dynamicLabel: 'In your birth chart'
    },
    panch: {
        name: 'Panch Mahapurush Yogas',
        rule: 'Mars, Mercury, Jupiter, Venus, or Saturn in its own or exalted sign in a Kendra (1, 4, 7, 10).',
        example: 'Mars in own sign in a Kendra (1st, 4th, 7th, 10th) forms Ruchaka Yoga.',
        explanation: 'Each planet creates a distinct Mahapurush yoga when dignified in a central house, gifting extraordinary courage, intellect, wisdom, artistry, or discipline commonly seen in high achievers.',
        dynamicLabel: 'In your birth chart'
    },
    gaja: {
        name: 'Gaja Kesari Yoga',
        rule: 'Jupiter positioned in a Kendra (1, 4, 7, 10) from the Moon.',
        example: 'Jupiter in Kendra (1, 4, 7, 10) from Moon.',
        explanation: 'Jupiter supporting the Moon from a strong angle steadies emotions and judgment, bestowing prosperity, respect, and sound counsel.',
        dynamicLabel: 'In your birth chart'
    },
    neecha: {
        name: 'Neecha Bhang Raj Yoga',
        rule: 'A debilitated planet regains strength via cancellation factors or strong placement.',
        example: 'Debilitated planet effect canceled by benefic influences.',
        explanation: 'When a weakened planet gains dignity—especially through Kendra placement—it transforms early setbacks into significant later success.',
        dynamicLabel: 'In your birth chart'
    },
    vipreet: {
        name: 'Vipreet Raj Yoga',
        rule: 'Lords of Dusthana houses (6th, 8th, 12th) exchange places or reside in one another’s houses.',
        example: 'Lord of 6th house in 8th or 12th house.',
        explanation: 'Difficult house lords neutralise one another, allowing the native to harvest unexpected benefits through adversity and transformation.',
        dynamicLabel: 'In your birth chart'
    },
    dhana: {
        name: 'Dhana Yoga',
        rule: 'Benefic planets activate the 2nd or 11th house, or their lords.',
        example: 'Venus with Jupiter in 11th house.',
        explanation: 'Benefics energising the house of gains attract supportive networks, steady income, and sustained prosperity.',
        dynamicLabel: 'In your birth chart'
    },
    hamsa: {
        name: 'Hamsa Yoga',
        rule: 'Jupiter in own sign (Sagittarius, Pisces) or exalted (Cancer) and occupying a Kendra (1, 4, 7, 10).',
        example: 'Jupiter in Cancer placed in the 4th house.',
        explanation: 'A dignified Jupiter in a central house grants wisdom, humility, spirituality, and enduring reputation.',
        dynamicLabel: 'In your birth chart'
    },
    malavya: {
        name: 'Malavya Yoga',
        rule: 'Venus in own sign (Taurus, Libra) or exalted (Pisces) positioned in a Kendra.',
        example: 'Venus in Taurus occupying the 7th house.',
        explanation: 'Malavya blesses grace, charisma, luxury, artistic talents, and enduring relationships.',
        dynamicLabel: 'In your birth chart'
    },
    bhadra: {
        name: 'Bhadra Yoga',
        rule: 'Mercury in own sign (Gemini, Virgo) seated in a Kendra.',
        example: 'Mercury in Virgo placed in the 10th house.',
        explanation: 'Bhadra confers intelligence, eloquence, longevity, and a refined sense of service and travel.',
        dynamicLabel: 'In your birth chart'
    },
    ruchaka: {
        name: 'Ruchaka Yoga',
        rule: 'Mars in own sign (Aries, Scorpio) or exalted (Capricorn) occupying a Kendra.',
        example: 'Mars in Capricorn positioned in the 10th house.',
        explanation: 'Ruchaka produces courage, leadership, strategic prowess, and physical as well as mental strength.',
        dynamicLabel: 'In your birth chart'
    },
    sasa: {
        name: 'Sasa Yoga',
        rule: 'Saturn in own sign (Capricorn, Aquarius) or exalted (Libra) located in a Kendra.',
        example: 'Saturn in Aquarius placed in the 1st house.',
        explanation: 'Sasa Yoga elevates status, discipline, organisational skills, and the capacity to wield lasting influence.',
        dynamicLabel: 'In your birth chart'
    },
    budhAditya: {
        name: 'Budh Aditya Yoga',
        rule: 'Sun and Mercury conjoin in any house.',
        example: 'Sun and Mercury together in the 5th house.',
        explanation: 'This bright conjunction sharpens intellect, communication, memory, and decision-making ability.',
        dynamicLabel: 'In your birth chart'
    },
    chandraMangal: {
        name: 'Chandra Mangal Yoga',
        rule: 'Moon and Mars conjoin (or strongly aspect) each other.',
        example: 'Moon and Mars occupying the same house.',
        explanation: 'When benefic, this yoga generates financial acumen, enterprise, and decisive emotional drive.',
        dynamicLabel: 'In your birth chart'
    },
    guruMangal: {
        name: 'Guru Mangal Yoga',
        rule: 'Jupiter and Mars conjoin or occupy mutually 1st/7th houses.',
        example: 'Jupiter and Mars together in the 1st house.',
        explanation: 'The blend of Jupiter’s wisdom and Mars’ initiative supports prosperity, optimism, and principled activism.',
        dynamicLabel: 'In your birth chart'
    },
    amala: {
        name: 'Amala Yoga',
        rule: 'Benefic planet (Jupiter, Mercury, Venus) in the 10th house from the ascendant.',
        example: 'Venus positioned in the 10th house.',
        explanation: 'Amala Yoga enhances career reputation, charitable instincts, and compassionate leadership.',
        dynamicLabel: 'In your birth chart'
    },
    kahala: {
        name: 'Kahala Yoga',
        rule: 'Strong link between 4th and 9th house lords, especially when placed in Kendras.',
        example: '4th lord in the 10th house and 9th lord in the 1st.',
        explanation: 'Kahala grants courage, stability, luck, and sustained happiness when foundational houses cooperate.',
        dynamicLabel: 'In your birth chart'
    },
    lakshmi: {
        name: 'Lakshmi Yoga',
        rule: 'A strong 9th house lord (in own/exalted sign) aligns with a benefic ascendant lord, avoiding Dusthana houses.',
        example: '9th lord exalted and aspecting the ascendant lord.',
        explanation: 'Lakshmi Yoga ushers material abundance, versatility, and skill when fortune and self align beneficially.',
        dynamicLabel: 'In your birth chart'
    },
    mahabhagya: {
        name: 'MahaBhagya Yoga',
        rule: 'Ascendant, Sun, and Moon all occupy either odd (for males) or even (for females) signs.',
        example: 'Ascendant, Sun, Moon each in odd-numbered signs.',
        explanation: 'When birth parity aligns perfectly, it bestows exceptional fortune, charisma, and societal recognition.',
        dynamicLabel: 'In your birth chart'
    },
    akhandaSamrajya: {
        name: 'Akhanda Samrajya Yoga',
        rule: 'Second, ninth, and eleventh lords strongly placed with support from Jupiter and Moon.',
        example: 'Moon in a Kendra while 2nd, 9th, and 11th lords occupy strong houses.',
        explanation: 'This regal combination indicates broad influence, leadership aptitude, and the ability to guide communities.',
        dynamicLabel: 'In your birth chart'
    }
};

const BAD_YOGA_DEFINITIONS = {
    kemadruma: {
        name: 'Kemadruma Yoga',
        rule: 'Moon has no planets in adjacent houses (2nd or 12th).',
        example: 'Moon with no planets on either side.',
        explanation: 'An unsupported Moon amplifies feelings of isolation and financial instability, urging the native to cultivate emotional and material support systems.',
        dynamicLabel: 'In your birth chart'
    },
    daridra: {
        name: 'Daridra Yoga',
        rule: '11th lord is afflicted and placed in a Dusthana house (6th, 8th, or 12th).',
        example: '11th lord afflicted in 6th, 8th, or 12th house.',
        explanation: 'When the lord of gains struggles in difficult houses, income becomes erratic and financial planning is crucial to counter losses.',
        dynamicLabel: 'In your birth chart'
    },
    grahan: {
        name: 'Grahan Yoga',
        rule: 'Sun or Moon is conjunct/aspected by Rahu or Ketu.',
        example: 'Sun or Moon conjunct Rahu/Ketu.',
        explanation: 'Shadowy nodes eclipse the luminaries, producing emotional turbulence, reputation swings, and a need for mental clarity practices.',
        dynamicLabel: 'In your birth chart'
    },
    shrapit: {
        name: 'Shrapit Yoga',
        rule: 'Saturn combines with Rahu (conjunction or strong aspect).',
        example: 'Saturn conjunct Rahu.',
        explanation: 'This pairing highlights karmic debts, delays, or ancestral responsibilities that demand patient, disciplined effort.',
        dynamicLabel: 'In your birth chart'
    },
    angarak: {
        name: 'Angarak Yoga',
        rule: 'Mars conjoins Rahu.',
        example: 'Mars conjunct Rahu causes aggression and conflicts.',
        explanation: 'Intense Martian fire merges with Rahu’s volatility, generating impulsive actions or confrontational situations.',
        dynamicLabel: 'In your birth chart'
    },
    kuja: {
        name: 'Kuja Dosha',
        rule: 'Mars occupies 1st, 4th, 7th, 8th, or 12th from Lagna or Moon.',
        example: 'Mars in 1st, 4th, 7th, 8th, or 12th house leads to relationship problems.',
        explanation: 'Mars in marital houses can create agitation, so conscious communication and compatibility checks become essential.',
        dynamicLabel: 'In your birth chart'
    },
    bhanga: {
        name: 'Bhanga Yoga',
        rule: 'Benefic yogas get weakened by malefic influence.',
        example: 'Good yogas negated by malefics or afflictions.',
        explanation: 'When malefics disturb auspicious combinations, promised benefits may not fully manifest unless remedial efforts are made.',
        dynamicLabel: 'In your birth chart'
    }
};

function computeYogas(planetsData, ascendantSign) {
    const results = { good: [], bad: [] };
    if (!planetsData || !ascendantSign) {
        return results;
    }

    const addedKeys = { good: new Set(), bad: new Set() };

    const addYoga = (category, key, extra) => {
        const definitions = category === 'good' ? GOOD_YOGA_DEFINITIONS : BAD_YOGA_DEFINITIONS;
        if (!definitions[key] || addedKeys[category].has(key)) return;
        const yogaInfo = { ...definitions[key] };
        if (extra) {
            yogaInfo.extra = extra;
        }
        yogaInfo.key = key;
        results[category].push(yogaInfo);
        addedKeys[category].add(key);
    };

    const getHouse = (planet) => {
        const entry = planetsData[planet];
        if (!entry || entry.house_number === undefined || entry.house_number === null) return null;
        return parseInt(entry.house_number, 10);
    };

    const getSign = (planet) => {
        const entry = planetsData[planet];
        if (!entry || entry.current_sign === undefined || entry.current_sign === null) return null;
        return parseInt(entry.current_sign, 10);
    };

    const getHouseSign = (houseNum) => {
        let sign = (ascendantSign + houseNum - 2) % 12;
        if (sign < 0) sign += 12;
        return sign + 1;
    };

    const getSignName = (signNum) => {
        if (!signNum) return '';
        return SIGN_NAMES[((signNum - 1) % 12 + 12) % 12];
    };

    // Raj Yoga (1st and 10th lords exchanging houses)
    const firstLord = ZODIAC_LORDS[ascendantSign];
    const tenthSign = getHouseSign(10);
    const tenthLord = ZODIAC_LORDS[tenthSign];
    const firstLordHouse = getHouse(firstLord);
    const tenthLordHouse = getHouse(tenthLord);
    if (firstLord && tenthLord && firstLordHouse === 10 && tenthLordHouse === 1) {
        addYoga('good', 'raj', `${firstLord} resides in the 10th house and ${tenthLord} returns to the 1st, tightly linking self and career.`);
    }

    // Parivartana Yoga (2nd <-> 5th)
    const secondLordParivartana = ZODIAC_LORDS[getHouseSign(2)];
    const fifthLord = ZODIAC_LORDS[getHouseSign(5)];
    if (secondLordParivartana && fifthLord && getHouse(secondLordParivartana) === 5 && getHouse(fifthLord) === 2) {
        addYoga('good', 'parivartana', `${secondLordParivartana} occupies the 5th while ${fifthLord} sits in the 2nd, forming a strong mutual exchange.`);
    }

    // Panch Mahapurush Yogas
    const panchDetails = [];
    ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].forEach(planet => {
        const sign = getSign(planet);
        const house = getHouse(planet);
        if (!sign || !house) return;
        const dignities = PLANET_DIGNITIES[planet];
        const inOwn = dignities.own.includes(sign);
        const inExaltation = dignities.exalted === sign;
        if (KENDRA_HOUSES.includes(house) && (inOwn || inExaltation)) {
            panchDetails.push(`${planet} in the ${house}th house (${getSignName(sign)})`);
        }
    });
    if (panchDetails.length) {
        addYoga('good', 'panch', panchDetails.join('; '));
    }

    // Individual Mahapurush yogas
    const jupiterSign = getSign('Jupiter');
    const jupiterHouse = getHouse('Jupiter');
    const moonHouse = getHouse('Moon');
    if (jupiterSign && jupiterHouse && KENDRA_HOUSES.includes(jupiterHouse) && [9, 12, 4].includes(jupiterSign)) {
        addYoga('good', 'hamsa', `Jupiter resides in the ${jupiterHouse}th house within ${getSignName(jupiterSign)}.`);
    }

    const venusSign = getSign('Venus');
    const venusHouse = getHouse('Venus');
    if (venusSign && venusHouse && KENDRA_HOUSES.includes(venusHouse) && [2, 7, 12].includes(venusSign)) {
        addYoga('good', 'malavya', `Venus occupies the ${venusHouse}th house in ${getSignName(venusSign)}.`);
    }

    const mercurySign = getSign('Mercury');
    const mercuryHouse = getHouse('Mercury');
    if (mercurySign && mercuryHouse && KENDRA_HOUSES.includes(mercuryHouse) && [3, 6].includes(mercurySign)) {
        addYoga('good', 'bhadra', `Mercury is seated in the ${mercuryHouse}th house within ${getSignName(mercurySign)}.`);
    }

    const marsSign = getSign('Mars');
    const marsHouse = getHouse('Mars');
    if (marsSign && marsHouse && KENDRA_HOUSES.includes(marsHouse) && [1, 8, 10].includes(marsSign)) {
        addYoga('good', 'ruchaka', `Mars holds the ${marsHouse}th house in ${getSignName(marsSign)}.`);
    }

    const saturnSign = getSign('Saturn');
    const saturnHouse = getHouse('Saturn');
    if (saturnSign && saturnHouse && KENDRA_HOUSES.includes(saturnHouse) && [10, 11, 7].includes(saturnSign)) {
        addYoga('good', 'sasa', `Saturn anchors the ${saturnHouse}th house in ${getSignName(saturnSign)}.`);
    }

    // Gaja Kesari Yoga
    const moonSign = getSign('Moon');
    if (moonSign && jupiterSign) {
        const relativeHouse = getRelativeHouseNumber(moonSign, jupiterSign);
        if (KENDRA_HOUSES.includes(relativeHouse)) {
            addYoga('good', 'gaja', `Moon is in house ${getHouse('Moon')} while Jupiter stands ${relativeHouse}th from the Moon in ${getSignName(jupiterSign)}.`);
        }
    }

    // Neecha Bhang Raj Yoga (debilitated planet in Kendra)
    const neechaDetails = [];
    Object.keys(PLANET_DIGNITIES).forEach(planet => {
        const sign = getSign(planet);
        const house = getHouse(planet);
        const dignity = PLANET_DIGNITIES[planet];
        if (sign && house && dignity.debilitated === sign && KENDRA_HOUSES.includes(house)) {
            neechaDetails.push(`${planet} debilitated in ${getSignName(sign)} but strengthened in a Kendra (house ${house}).`);
        }
    });
    if (neechaDetails.length) {
        addYoga('good', 'neecha', neechaDetails.join(' '));
    }

    // Vipreet Raj Yoga (dusthana lords in dusthana houses)
    const vipreetDetails = [];
    DUSTHANA_HOUSES.forEach(houseNumber => {
        const sign = getHouseSign(houseNumber);
        const lord = ZODIAC_LORDS[sign];
        const lordHouse = getHouse(lord);
        if (lord && lordHouse && DUSTHANA_HOUSES.includes(lordHouse)) {
            vipreetDetails.push(`${lord} (lord of the ${houseNumber}th) sits in the ${lordHouse}th house.`);
        }
    });
    if (vipreetDetails.length) {
        addYoga('good', 'vipreet', vipreetDetails.join(' '));
    }

    // Dhana Yoga (Venus & Jupiter in 11th)
    if (getHouse('Venus') === 11 && getHouse('Jupiter') === 11) {
        addYoga('good', 'dhana', `Venus and Jupiter join forces in the 11th house of gains.`);
    }

    // Budh Aditya Yoga
    const sunHouse = getHouse('Sun');
    if (sunHouse && sunHouse === mercuryHouse) {
        addYoga('good', 'budhAditya', `Sun and Mercury unite in house ${sunHouse}.`);
    }

    // Chandra Mangal Yoga
    if (moonHouse && marsHouse && moonHouse === marsHouse) {
        addYoga('good', 'chandraMangal', `Moon and Mars together energise the ${moonHouse}th house.`);
    }

    // Guru Mangal Yoga
    if (marsHouse && jupiterHouse) {
        const diff = Math.abs(marsHouse - jupiterHouse);
        const wrapDiff = 12 - diff;
        if (diff === 0 || diff === 6 || wrapDiff === 6) {
            addYoga('good', 'guruMangal', `Mars and Jupiter align across houses ${marsHouse} and ${jupiterHouse}.`);
        }
    }

    // Amala Yoga
    if (ascendantSign) {
        BENEFIC_PLANETS.forEach(planet => {
            const house = getHouse(planet);
            if (house === 10) {
                addYoga('good', 'amala', `${planet} illuminates the 10th house, fortifying career reputation.`);
            }
        });
    }

    // Kahala Yoga
    const fourthLord = ZODIAC_LORDS[getHouseSign(4)];
    const ninthLord = ZODIAC_LORDS[getHouseSign(9)];
    const fourthLordHouse = getHouse(fourthLord);
    const ninthLordHouse = getHouse(ninthLord);
    if (fourthLord && ninthLord && fourthLordHouse && ninthLordHouse &&
        KENDRA_HOUSES.includes(fourthLordHouse) && KENDRA_HOUSES.includes(ninthLordHouse)) {
        addYoga('good', 'kahala', `${fourthLord} and ${ninthLord} both anchor Kendra houses (${fourthLordHouse} & ${ninthLordHouse}).`);
    }

    // Lakshmi Yoga
    if (ascendantSign && ninthLord) {
        const ninthLordSign = getSign(ninthLord);
        const ascLord = ZODIAC_LORDS[ascendantSign];
        const ascLordHouse = getHouse(ascLord);
        const ninthDignity = PLANET_DIGNITIES[ninthLord];
        const isStrongNinth = ninthLordSign && ninthDignity && (ninthDignity.own.includes(ninthLordSign) || ninthDignity.exalted === ninthLordSign);
        const ascLordSafe = ascLordHouse && !DUSTHANA_HOUSES.includes(ascLordHouse);
        if (isStrongNinth && ascLordSafe) {
            addYoga('good', 'lakshmi', `${ninthLord} holds dignity in ${getSignName(ninthLordSign)} while ${ascLord} avoids Dusthana houses.`);
        }
    }

    // MahaBhagya Yoga (parity check)
    if (ascendantSign && sunHouse && moonHouse) {
        const ascParity = ascendantSign % 2;
        const sunSign = getSign('Sun');
        const moonSignForParity = moonSign;
        if (sunSign && moonSignForParity) {
            const sunParity = sunSign % 2;
            const moonParity = moonSignForParity % 2;
            if (ascParity === sunParity && sunParity === moonParity) {
                const parityLabel = ascParity === 1 ? 'odd signs' : 'even signs';
                addYoga('good', 'mahabhagya', `Ascendant, Sun, and Moon all occupy ${parityLabel}, indicating exceptional fortune.`);
            }
        }
    }

    // Akhanda Samrajya Yoga (heuristic)
    const secondLordSamrajya = ZODIAC_LORDS[getHouseSign(2)];
    const eleventhLordSamrajya = ZODIAC_LORDS[getHouseSign(11)];
    const moonInKendra = moonHouse && KENDRA_HOUSES.includes(moonHouse);
    const supportiveLords = [secondLordSamrajya, ninthLord, eleventhLordSamrajya].every(lord => {
        const house = getHouse(lord);
        return lord && house && (KENDRA_HOUSES.includes(house) || TRIKONA_HOUSES.includes(house));
    });
    if (moonInKendra && supportiveLords) {
        addYoga('good', 'akhandaSamrajya', `Moon anchors a Kendra while 2nd, 9th, and 11th lords (${[secondLordSamrajya, ninthLord, eleventhLordSamrajya].join(', ')}) occupy strong houses.`);
    }

    // Kemadruma Yoga
    if (moonHouse) {
        const leftHouse = moonHouse === 1 ? 12 : moonHouse - 1;
        const rightHouse = moonHouse === 12 ? 1 : moonHouse + 1;
        const hasSupport = PLANET_LIST.some(planet => {
            if (planet === 'Moon') return false;
            const house = getHouse(planet);
            return house === leftHouse || house === rightHouse;
        });
        if (!hasSupport) {
            addYoga('bad', 'kemadruma', `Moon stands alone in house ${moonHouse} with vacant neighbours (${leftHouse} & ${rightHouse}).`);
        }
    }

    // Daridra Yoga
    const eleventhLordDaridra = ZODIAC_LORDS[getHouseSign(11)];
    const eleventhLordHouse = getHouse(eleventhLordDaridra);
    if (eleventhLordDaridra && eleventhLordHouse && DUSTHANA_HOUSES.includes(eleventhLordHouse)) {
        addYoga('bad', 'daridra', `${eleventhLordDaridra} (lord of gains) resides in the ${eleventhLordHouse}th house, stressing finances.`);
    }

    // Grahan Yoga
    const rahuHouse = getHouse('Rahu');
    const ketuHouse = getHouse('Ketu');
    const grahanDetails = [];
    if (sunHouse && (sunHouse === rahuHouse || sunHouse === ketuHouse)) {
        grahanDetails.push(`Sun shares the ${sunHouse}th house with ${sunHouse === rahuHouse ? 'Rahu' : 'Ketu'}.`);
    }
    if (moonHouse && (moonHouse === rahuHouse || moonHouse === ketuHouse)) {
        grahanDetails.push(`Moon shares the ${moonHouse}th house with ${moonHouse === rahuHouse ? 'Rahu' : 'Ketu'}.`);
    }
    if (grahanDetails.length) {
        addYoga('bad', 'grahan', grahanDetails.join(' '));
    }

    // Shrapit Yoga
    if (getHouse('Saturn') && getHouse('Saturn') === rahuHouse) {
        addYoga('bad', 'shrapit', `Saturn and Rahu conjoin in the ${rahuHouse}th house.`);
    }

    // Angarak Yoga
    if (marsHouse && marsHouse === rahuHouse) {
        addYoga('bad', 'angarak', `Mars and Rahu unite in the ${rahuHouse}th house.`);
    }

    // Kuja Dosha
    if (marsHouse && [1, 4, 7, 8, 12].includes(marsHouse)) {
        addYoga('bad', 'kuja', `Mars resides in house ${marsHouse}, potentially impacting partnerships.`);
    }

    // Bhanga Yoga (malefics touching benefic yogas)
    const maleficHouseSet = new Set(MALIFIC_PLANETS.map(planet => getHouse(planet)).filter(Boolean));
    const bhangaDetails = [];
    if (addedKeys.good.has('raj') && (maleficHouseSet.has(1) || maleficHouseSet.has(10))) {
        bhangaDetails.push('Malefic presence in the 1st/10th houses can dilute Raj Yoga outcomes.');
    }
    if (addedKeys.good.has('dhana') && maleficHouseSet.has(11)) {
        bhangaDetails.push('Malefics occupying the 11th house may obstruct Dhana Yoga gains.');
    }
    if (bhangaDetails.length) {
        addYoga('bad', 'bhanga', bhangaDetails.join(' '));
    }

    return results;
}

// =====================================================
// KUNDLI SCORING SYSTEM (1-10 scale) - UPDATED RULES
// Calculates Health, Finance, and Career scores based on new specification
// =====================================================

/**
 * Get Dignity Score according to new spec
 * Exalted: +4, Own/Mooltrikona: +3, Friendly: +1, Neutral: 0, Enemy: -1, Debilitated: -3
 */
function getDignityScore(dignity) {
    if (!dignity) return 0;
    if (dignity.isExalted) return 4;
    if (dignity.isOwnSign || dignity.isMoolatrikona) return 3;
    if (dignity.type === 'friendly') return 1;
    if (dignity.type === 'neutral') return 0;
    if (dignity.type === 'enemy') return -1;
    if (dignity.isDebilitated) return -3;
    return 0;
}

/**
 * Get Shadbala Score according to new spec
 * Strong (≥480): +1, Moderate (350-479): 0, Weak (<350): -1
 */
function getShadbalaScore(shadbala) {
    if (!shadbala) return 0;
    const shadbalaValue = shadbala.fromApi ? shadbala.shadbala : shadbala.totalShadbala;
    if (shadbalaValue >= 480) return 1;  // Strong
    if (shadbalaValue >= 350) return 0;  // Moderate
    return -1;  // Weak
}

/**
 * Calculate Aspect and Retrograde contribution for a lord
 * Strong benefic aspect: +1, Strong malefic aspect: -1, Retrograde malefic: -1
 * Returns score and whether it's a strong aspect
 */
function calculateAspectRetroScore(lord, lordInfo, planetsData, ascendantSign, shadbalaApiData) {
    if (!lordInfo || !planetsData) return { aspectScore: 0, retroScore: 0, isStrongBenefic: false, isStrongMalefic: false };
    
    let aspectScore = 0;
    let retroScore = 0;
    let isStrongBenefic = false;
    let isStrongMalefic = false;
    
    const lordHouse = getRelativeHouseNumber(ascendantSign, lordInfo.current_sign);
    const isRetro = lordInfo.isRetro === 'true' || lordInfo.isRetro === true;
    
    // Retrograde malefic: -1
    if (isRetro && MALIFIC_PLANETS.includes(lord)) {
        retroScore = -1;
    }
    
    // Check for strong benefic aspect (Jupiter aspecting with good dignity/shadbala)
    if (planetsData.Jupiter) {
        const jupiterDignity = calculatePlanetaryDignity('Jupiter', planetsData.Jupiter);
        const jupiterShadbala = calculateShadbala('Jupiter', planetsData.Jupiter, planetsData, ascendantSign, shadbalaApiData);
        const jupiterHouse = getRelativeHouseNumber(ascendantSign, planetsData.Jupiter.current_sign);
        
        // Check if Jupiter aspects this lord's house (7th house aspect)
        const aspect7th = ((jupiterHouse + 6 - 1) % 12) + 1;
        if (aspect7th === lordHouse) {
            const jupiterStrong = (jupiterDignity && (jupiterDignity.isExalted || jupiterDignity.isOwnSign)) ||
                                  (jupiterShadbala && getShadbalaScore(jupiterShadbala) >= 0);
            if (jupiterStrong) {
                aspectScore += 1;
                isStrongBenefic = true;
            }
        }
    }
    
    // Check for strong malefic aspect
    for (const planet of MALIFIC_PLANETS) {
        if (planetsData[planet] && planet !== lord) {
            const planetDignity = calculatePlanetaryDignity(planet, planetsData[planet]);
            const planetShadbala = calculateShadbala(planet, planetsData[planet], planetsData, ascendantSign, shadbalaApiData);
            const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
            
            // Check if this malefic aspects the lord's house
            const aspect7th = ((planetHouse + 6 - 1) % 12) + 1;
            if (aspect7th === lordHouse) {
                const planetStrong = (planetDignity && (planetDignity.isExalted || planetDignity.isOwnSign)) ||
                                    (planetShadbala && getShadbalaScore(planetShadbala) >= 0);
                if (planetStrong) {
                    aspectScore -= 1;
                    isStrongMalefic = true;
                    break; // Count once
                }
            }
        }
    }
    
    return { aspectScore, retroScore, isStrongBenefic, isStrongMalefic };
}

/**
 * Calculate Conjunction contribution for a lord (-3 to +3)
 * Benefic + friend + strong: up to +3
 * Generic benefic conjunction: +1 to +2
 * Malefic + enemy + strong: up to -3
 * Generic malefic conjunction: -1 to -2
 * IMPORTANT: Total negative from (conjunctions + aspects + retrograde) is capped at -3 per lord
 */
function calculateConjunctionScoreForLord(lord, planetsData, ascendantSign, shadbalaApiData) {
    if (!planetsData[lord]) return { score: 0, details: [] };
    
    let conjunctionScore = 0;
    const conjunctionDetails = [];
    const lordInfo = planetsData[lord];
    const lordHouse = getRelativeHouseNumber(ascendantSign, lordInfo.current_sign);
    
    // Check all planets for conjunctions with this lord
    for (const [planet, planetInfo] of Object.entries(planetsData)) {
        if (planet === lord || planet === 'Ascendant' || planet === 'ayanamsa') continue;
        if (!planetInfo || !planetInfo.current_sign) continue;
        
        const planetHouse = getRelativeHouseNumber(ascendantSign, planetInfo.current_sign);
        if (planetHouse !== lordHouse) continue; // Not in same house
        
        const isBenefic = BENEFIC_PLANETS.includes(planet);
        const isMalefic = MALIFIC_PLANETS.includes(planet);
        const planetDignity = calculatePlanetaryDignity(planet, planetInfo);
        const planetShadbala = calculateShadbala(planet, planetInfo, planetsData, ascendantSign, shadbalaApiData);
        const relationship = getPlanetaryRelationship(lord, planet);
        const isStrong = (planetDignity && (planetDignity.isExalted || planetDignity.isOwnSign)) ||
                        (planetShadbala && getShadbalaScore(planetShadbala) >= 0);
        
        let points = 0;
        let detail = '';
        
        if (isBenefic) {
            // Benefic conjunctions
            if (relationship === 'friend' && isStrong) {
                points = 3; // Benefic + friend + strong: +3
                detail = `${planet} (benefic, friend, strong)`;
            } else if (relationship === 'friend' || isStrong) {
                points = 2; // Generic benefic with friend or strong: +2
                detail = `${planet} (benefic, ${relationship === 'friend' ? 'friend' : 'strong'})`;
            } else {
                points = 1; // Generic benefic: +1
                detail = `${planet} (benefic)`;
            }
            conjunctionScore += points;
            conjunctionDetails.push(`+${points} (${detail})`);
        } else if (isMalefic) {
            // Malefic conjunctions
            if (relationship === 'enemy' && isStrong) {
                points = -3; // Malefic + enemy + strong: -3
                detail = `${planet} (malefic, enemy, strong)`;
            } else if (relationship === 'enemy' || isStrong) {
                points = -2; // Generic malefic with enemy or strong: -2
                detail = `${planet} (malefic, ${relationship === 'enemy' ? 'enemy' : 'strong'})`;
            } else {
                points = -1; // Generic malefic: -1
                detail = `${planet} (malefic)`;
            }
            conjunctionScore += points;
            conjunctionDetails.push(`${points} (${detail})`);
        }
    }
    
    // Cap at -3 to +3 per lord
    conjunctionScore = Math.max(-3, Math.min(3, conjunctionScore));
    
    return { score: conjunctionScore, details: conjunctionDetails };
}

/**
 * Calculate Lord Strength using new spec
 * LordStrength = DignityScore + ShadbalaScore + AspectRetroConjScore (capped at -3..+3)
 * IMPORTANT: Total negative from (conjunctions + aspects + retrograde) is capped at -3
 */
function computeLordStrength(houseNum, ascendantSign, planetsData, shadbalaApiData) {
    if (!planetsData || !ascendantSign) return { total: 0, dignity: 0, shadbala: 0, aspectRetro: 0, conjunction: 0, details: {} };
    
    const houseSign = ((ascendantSign + houseNum - 2) % 12) + 1;
    const lord = ZODIAC_LORDS[houseSign];
    if (!lord || !planetsData[lord]) return { total: 0, dignity: 0, shadbala: 0, aspectRetro: 0, conjunction: 0, details: {} };
    
    const lordInfo = planetsData[lord];
    const dignity = calculatePlanetaryDignity(lord, lordInfo);
    const shadbala = calculateShadbala(lord, lordInfo, planetsData, ascendantSign, shadbalaApiData);
    
    const dignityScore = getDignityScore(dignity);
    const shadbalaScore = getShadbalaScore(shadbala);
    
    const aspectRetro = calculateAspectRetroScore(lord, lordInfo, planetsData, ascendantSign, shadbalaApiData);
    const conjunction = calculateConjunctionScoreForLord(lord, planetsData, ascendantSign, shadbalaApiData);
    
    // Calculate total aspect/retro/conjunction score
    let aspectRetroConjTotal = aspectRetro.aspectScore + aspectRetro.retroScore + conjunction.score;
    
    // CAP RULE: Total negative from (conjunctions + aspects + retrograde) is capped at -3
    if (aspectRetroConjTotal < -3) {
        aspectRetroConjTotal = -3;
    }
    // Also cap positive at +3
    if (aspectRetroConjTotal > 3) {
        aspectRetroConjTotal = 3;
    }
    
    const total = dignityScore + shadbalaScore + aspectRetroConjTotal;
    
    return {
        total,
        dignity: dignityScore,
        shadbala: shadbalaScore,
        aspectRetro: aspectRetro.aspectScore + aspectRetro.retroScore,
        conjunction: conjunction.score,
        aspectRetroConjTotal,
        details: {
            dignity,
            shadbala,
            aspectRetro,
            conjunction: conjunction.details
        }
    };
}

/**
 * Map Raw Score to 1-10 Rating with piecewise linear mapping
 * If Raw ≤ -8   → 1.5
 * If -8 < Raw ≤ -4 → 2.5-3.5 (linear)
 * If -4 < Raw ≤ 0  → 3.5-5.0 (linear)
 * If 0 < Raw ≤ 4   → 5.0-7.0 (linear)
 * If 4 < Raw ≤ 8   → 7.0-8.5 (linear)
 * If Raw > 8       → 8.5-9.5 (cap at 9.5)
 */
function mapRawTo1to10(rawScore) {
    if (rawScore <= -8) return 1.5;
    if (rawScore <= -4) {
        // Linear interpolation: -8 → 1.5, -4 → 3.5
        return 1.5 + ((rawScore + 8) / 4) * (3.5 - 1.5);
    }
    if (rawScore <= 0) {
        // Linear interpolation: -4 → 3.5, 0 → 5.0
        return 3.5 + ((rawScore + 4) / 4) * (5.0 - 3.5);
    }
    if (rawScore <= 4) {
        // Linear interpolation: 0 → 5.0, 4 → 7.0
        return 5.0 + (rawScore / 4) * (7.0 - 5.0);
    }
    if (rawScore <= 8) {
        // Linear interpolation: 4 → 7.0, 8 → 8.5
        return 7.0 + ((rawScore - 4) / 4) * (8.5 - 7.0);
    }
    // Raw > 8: cap at 9.5
    return Math.min(9.5, 8.5 + ((rawScore - 8) / 10) * (9.5 - 8.5));
}

/**
 * Apply sanity floor to rating
 * If most relevant house lords have dignity ≥ neutral and shadbala ≥ moderate,
 * rating should not fall below 3.5-4.0
 */
function applySanityFloor(rating, relevantLords, planetsData, ascendantSign, shadbalaApiData) {
    if (rating >= 4.0) return rating; // Already above floor
    
    // Check if most relevant lords are at least neutral
    let neutralOrBetterCount = 0;
    let totalLords = 0;
    
    for (const houseNum of relevantLords) {
        const lordStrength = computeLordStrength(houseNum, ascendantSign, planetsData, shadbalaApiData);
        totalLords++;
        if (lordStrength.dignity >= 0 && lordStrength.shadbala >= 0) {
            neutralOrBetterCount++;
        }
    }
    
    // If most (≥50%) lords are neutral or better, apply floor
    if (totalLords > 0 && neutralOrBetterCount / totalLords >= 0.5) {
        return Math.max(rating, 3.5);
    }
    
    return rating;
}

/**
 * Calculate House Strength raw score (starting from 0)
 * Add/subtract points based on planets in the house (occupants only)
 * Note: Shadbala is NOT counted here (only in lord scoring)
 */
function calculateHouseStrengthRaw(houseNum, planetsData, ascendantSign) {
    if (!planetsData || !ascendantSign) return 0;
    
    let rawScore = 0; // Start at 0
    
    // Find planets in this house
    const planetsInHouse = [];
    for (const [planet, planetInfo] of Object.entries(planetsData)) {
        if (planet === 'Ascendant' || planet === 'ayanamsa') continue;
        if (!planetInfo || !planetInfo.current_sign) continue;
        const planetHouse = getRelativeHouseNumber(ascendantSign, planetInfo.current_sign);
        if (planetHouse === houseNum) {
            planetsInHouse.push({ planet, planetInfo });
        }
    }
    
    for (const { planet, planetInfo } of planetsInHouse) {
        const dignity = calculatePlanetaryDignity(planet, planetInfo);
        const isRetro = planetInfo.isRetro === 'true' || planetInfo.isRetro === true;
        const isCombust = isPlanetCombust(planet, planetInfo, planetsData);
        
        // Dignity points (occupant scoring)
        if (dignity) {
            if (dignity.isExalted) rawScore += 4;
            else if (dignity.isOwnSign || dignity.isMoolatrikona) rawScore += 3;
            else if (dignity.type === 'friendly') rawScore += 1;
            else if (dignity.type === 'neutral') rawScore += 0;
            else if (dignity.type === 'enemy') rawScore -= 1;
            else if (dignity.isDebilitated) rawScore -= 3; // Debilitated: -3
        }
        
        // Retrograde (occupant scoring)
        if (isRetro) {
            if (BENEFIC_PLANETS.includes(planet)) {
                rawScore += 0; // Benefic retrograde: 0
            } else if (MALIFIC_PLANETS.includes(planet)) {
                rawScore -= 2; // Malefic retrograde: -2
            }
        }
        
        // Aspects (occupant scoring - check for strong benefic/malefic aspects)
        if (planetsData.Jupiter) {
            const jupiterDignity = calculatePlanetaryDignity('Jupiter', planetsData.Jupiter);
            if (jupiterDignity && jupiterDignity.strength >= 60) {
                rawScore += 1; // Strong benefic aspect: +1
            }
        }
        // Check for strong malefic aspects (simplified - check if any strong malefic aspects this house)
        for (const maleficPlanet of MALIFIC_PLANETS) {
            if (planetsData[maleficPlanet] && maleficPlanet !== planet) {
                const maleficDignity = calculatePlanetaryDignity(maleficPlanet, planetsData[maleficPlanet]);
                if (maleficDignity && maleficDignity.strength >= 60) {
                    rawScore -= 1; // Strong malefic aspect: -1
                    break; // Count once per planet
                }
            }
        }
        
        // Negative points
        if (isCombust) rawScore -= 2; // Combust
    }
    
    // Check for malefic affliction (multiple malefics penalty: -2 max)
    const maleficCount = planetsInHouse.filter(p => MALIFIC_PLANETS.includes(p.planet)).length;
    if (maleficCount > 1) rawScore -= 2; // Multiple malefics: -2
    
    return rawScore;
}

/**
 * Calculate House Score with Lord Bonus
 * Returns: house score (occupants) + lord bonus (+1 if lord ≥ +3, -1 if lord ≤ -3)
 */
function calculateHouseScoreWithLordBonus(houseNum, planetsData, ascendantSign, shadbalaApiData) {
    // Calculate house score (occupants only)
    let houseScore = calculateHouseStrengthRaw(houseNum, planetsData, ascendantSign);
    
    // Calculate lord score
    const lordScore = calculateLordStrengthRaw(houseNum, ascendantSign, planetsData, shadbalaApiData);
    
    // Add house lord bonus
    if (lordScore >= 3) {
        houseScore += 1; // Strong lord: +1 bonus
    } else if (lordScore <= -3) {
        houseScore -= 1; // Weak lord: -1 penalty
    }
    
    // Cap per-house score (min -5, max +5)
    houseScore = Math.max(-5, Math.min(5, houseScore));
    
    return houseScore;
}

/**
 * Calculate Lord Strength raw score (starting from 0)
 * Add/subtract points based on lord's dignity, aspects, etc.
 */
function calculateLordStrengthRaw(houseNum, ascendantSign, planetsData, shadbalaApiData) {
    if (!planetsData || !ascendantSign) return 0;
    
    const houseSign = ((ascendantSign + houseNum - 2) % 12) + 1;
    const lord = ZODIAC_LORDS[houseSign];
    if (!lord || !planetsData[lord]) return 0;
    
    let rawScore = 0; // Start at 0
    
    const lordInfo = planetsData[lord];
    const dignity = calculatePlanetaryDignity(lord, lordInfo);
    const shadbala = calculateShadbala(lord, lordInfo, planetsData, ascendantSign, shadbalaApiData);
    const isCombust = isPlanetCombust(lord, lordInfo, planetsData);
    const isRetro = lordInfo.isRetro === 'true' || lordInfo.isRetro === true;
    
    // Dignity points (lord scoring)
    if (dignity) {
        if (dignity.isExalted) rawScore += 4; // Exalted: +4
        else if (dignity.isOwnSign || dignity.isMoolatrikona) rawScore += 3; // Own/Moolatrikona: +3
        else if (dignity.type === 'friendly') rawScore += 1; // Friendly: +1
        else if (dignity.type === 'neutral') rawScore += 0; // Neutral: 0
        else if (dignity.type === 'enemy') rawScore -= 1; // Enemy: -1
        else if (dignity.isDebilitated) rawScore -= 3; // Debilitated: -3
    }
    
    // Shadbala impact (lord scoring only)
    if (shadbala) {
        const shadbalaValue = shadbala.fromApi ? shadbala.shadbala : shadbala.totalShadbala;
        if (shadbalaValue >= 480) rawScore += 1; // Strong: +1
        else if (shadbalaValue < 350) rawScore -= 1; // Weak: -1
    }
    
    // Retrograde (lord scoring)
    if (isRetro) {
        if (BENEFIC_PLANETS.includes(lord)) {
            rawScore += 0; // Benefic retrograde: 0
        } else if (MALIFIC_PLANETS.includes(lord)) {
            rawScore -= 2; // Malefic retrograde: -2
        }
    }
    
    // Aspects received (lord scoring)
    const lordHouse = getRelativeHouseNumber(ascendantSign, lordInfo.current_sign);
    // Strong benefic aspect: +1
    if (planetsData.Jupiter) {
        const jupiterDignity = calculatePlanetaryDignity('Jupiter', planetsData.Jupiter);
        if (jupiterDignity && jupiterDignity.strength >= 60) {
            rawScore += 1; // Strong benefic aspect: +1
        }
    }
    // Strong malefic aspect: -1 (simplified check)
    for (const planet of MALIFIC_PLANETS) {
        if (planetsData[planet] && planet !== lord) {
            const planetDignity = calculatePlanetaryDignity(planet, planetsData[planet]);
            if (planetDignity && planetDignity.strength >= 60) {
                rawScore -= 1; // Strong malefic aspect: -1
                break; // Count once
            }
        }
    }
    
    // Negative points (lord scoring)
    if (isCombust) rawScore -= 2; // Combust
    
    return rawScore;
}

/**
 * Calculate Yogas raw score (starting from 0)
 * Add/subtract points based on good/bad yogas
 */
function calculateYogasScoreRaw(yogas, category, planetsData = null, ascendantSign = null) {
    if (!yogas) return 0;
    
    let rawScore = 0; // Start at 0
    const goodYogas = yogas.good || [];
    const badYogas = yogas.bad || [];
    
    // Helper to check if a planet is debilitated or strongly afflicted
    const isPlanetAfflicted = (planet, planetsData, ascendantSign) => {
        if (!planetsData || !planetsData[planet]) return false;
        const dignity = calculatePlanetaryDignity(planet, planetsData[planet]);
        return dignity && dignity.isDebilitated;
    };
    
    // Helper to check if Parivartana involves good houses/benefics
    const evaluateParivartanaQuality = (yoga, planetsData, ascendantSign) => {
        // Check if yoga.extra contains house information
        // For now, we'll use a simplified check based on involved planets
        if (!planetsData || !ascendantSign) return 2; // Default to mixed (+2)
        
        // Check if exchange involves any debilitated planet (not just Saturn)
        // This applies to all planets - if any planet in the exchange is debilitated, reduce quality
        const allPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
        let hasAfflictedPlanet = false;
        
        for (const planet of allPlanets) {
            if (isPlanetAfflicted(planet, planetsData, ascendantSign)) {
                hasAfflictedPlanet = true;
                break; // Found at least one afflicted planet
            }
        }
        
        if (hasAfflictedPlanet) {
            return 1; // Involving any afflicted/debilitated planet: +1
        }
        
        // If we can't determine, default based on category
        if (category === 'finance' || category === 'career') {
            return 2; // Mixed: +2
        }
        
        return 3; // Good: +3 to +4 (default to +3)
    };
    
    // Good yogas add points (scaled by quality for Parivartana)
    if (category === 'health') {
        const healthYogas = goodYogas.filter(y => ['gaja', 'hamsa', 'neecha'].includes(y.key));
        rawScore += healthYogas.length * 3; // +3 per yoga
    } else if (category === 'finance') {
        const dhanaYogas = goodYogas.filter(y => y.key === 'dhana');
        const lakshmiYogas = goodYogas.filter(y => y.key === 'lakshmi');
        const parivartanaYogas = goodYogas.filter(y => y.key === 'parivartana');
        
        rawScore += dhanaYogas.length * 4; // Dhana: +4
        rawScore += lakshmiYogas.length * 4; // Lakshmi: +4
        
        // Parivartana: scale by quality
        for (const yoga of parivartanaYogas) {
            const quality = evaluateParivartanaQuality(yoga, planetsData, ascendantSign);
            rawScore += quality; // +1 to +3 based on quality
        }
    } else if (category === 'career') {
        const rajYogas = goodYogas.filter(y => y.key === 'raj');
        const amalaYogas = goodYogas.filter(y => y.key === 'amala');
        const panchYogas = goodYogas.filter(y => y.key === 'panch');
        const parivartanaYogas = goodYogas.filter(y => y.key === 'parivartana');
        
        rawScore += rajYogas.length * 4; // Raj: +4
        rawScore += amalaYogas.length * 3; // Amala: +3
        rawScore += panchYogas.length * 3; // Panch: +3
        
        // Parivartana: scale by quality (if involves career houses)
        for (const yoga of parivartanaYogas) {
            const quality = evaluateParivartanaQuality(yoga, planetsData, ascendantSign);
            rawScore += quality; // +1 to +3 based on quality
        }
    }
    
    // Bad yogas subtract points (-2 to -4)
    if (category === 'health') {
        const badHealthYogas = badYogas.filter(y => ['grahan', 'shrapit'].includes(y.key));
        rawScore -= badHealthYogas.length * 3; // -3 per bad yoga
    } else if (category === 'finance') {
        const badFinanceYogas = badYogas.filter(y => ['daridra'].includes(y.key));
        rawScore -= badFinanceYogas.length * 4; // -4 for major bad yoga
    } else if (category === 'career') {
        const badCareerYogas = badYogas.filter(y => ['bhanga'].includes(y.key));
        rawScore -= badCareerYogas.length * 3; // -3 per bad yoga
    }
    
    return rawScore;
}

/**
 * Calculate Dasha Strength raw score (starting from 0)
 * Add/subtract points based on dasha lords
 */
function calculateDashaStrengthRaw(currentDasha, category, planetsData, ascendantSign) {
    if (!currentDasha) return 0;
    
    let rawScore = 0; // Start at 0
    const mahaDasa = currentDasha.mahaDasa;
    const antarDasa = currentDasha.antarDasa;
    
    // Check dignity of dasha lords
    let mahaDasaDignity = null;
    let antarDasaDignity = null;
    if (planetsData && mahaDasa && planetsData[mahaDasa]) {
        mahaDasaDignity = calculatePlanetaryDignity(mahaDasa, planetsData[mahaDasa]);
    }
    if (planetsData && antarDasa && planetsData[antarDasa]) {
        antarDasaDignity = calculatePlanetaryDignity(antarDasa, planetsData[antarDasa]);
    }
    
    if (category === 'health') {
        // For health, Moon and Jupiter are good
        if (mahaDasa === 'Moon' || mahaDasa === 'Jupiter') {
            rawScore += 3; // Strong dasha
            if (mahaDasaDignity && (mahaDasaDignity.isExalted || mahaDasaDignity.isOwnSign)) {
                rawScore += 1; // Extra point for strong dignity
            }
        } else if (mahaDasa === 'Saturn' || mahaDasa === 'Mars') {
            rawScore -= 3; // Bad dasha
        } else {
            rawScore += 1; // Neutral
        }
        
        if (antarDasa === 'Moon' || antarDasa === 'Jupiter') {
            rawScore += 2; // Good AD
        } else if (antarDasa === 'Saturn' || antarDasa === 'Mars') {
            rawScore -= 2; // Bad AD
        }
    } else if (category === 'finance') {
        // For finance, Jupiter and Venus are good
        if (mahaDasa === 'Jupiter' || mahaDasa === 'Venus') {
            rawScore += 3; // Strong dasha
            if (mahaDasaDignity && (mahaDasaDignity.isExalted || mahaDasaDignity.isOwnSign)) {
                rawScore += 1;
            }
        } else if (mahaDasa === 'Saturn' || mahaDasa === 'Rahu') {
            rawScore -= 4; // Bad dasha for finance
        } else {
            rawScore += 1; // Neutral
        }
        
        if (antarDasa === 'Jupiter' || antarDasa === 'Venus') {
            rawScore += 2; // Good AD
        } else if (antarDasa === 'Saturn' || antarDasa === 'Rahu') {
            rawScore -= 2; // Bad AD
        }
    } else if (category === 'career') {
        // For career, Sun, Mercury, Jupiter are good
        if (mahaDasa === 'Sun' || mahaDasa === 'Mercury' || mahaDasa === 'Jupiter') {
            rawScore += 3; // Strong dasha
            if (mahaDasaDignity && (mahaDasaDignity.isExalted || mahaDasaDignity.isOwnSign)) {
                rawScore += 1;
            }
        } else if (mahaDasa === 'Saturn') {
            rawScore -= 5; // Very bad dasha for career
        } else {
            rawScore += 1; // Neutral
        }
        
        if (antarDasa === 'Sun' || antarDasa === 'Mercury' || antarDasa === 'Jupiter') {
            rawScore += 2; // Good AD
        } else if (antarDasa === 'Saturn') {
            rawScore -= 3; // Bad AD
        }
    }
    
    return rawScore;
}

/**
 * Convert raw score to 1-10 rating using simplified method
 * Adjusted for 3 factors (without Dasha)
 */
function convertRawScoreToRating(rawScore) {
    // With 3 factors instead of 4, maximum scores are lower, so adjust thresholds
    if (rawScore >= 12) return 9.5; // 9-10 rating
    if (rawScore >= 8) return 7.5;  // 7-8 rating
    if (rawScore >= 4) return 6.5;  // 6-7 rating
    if (rawScore >= 0) return 4.5;  // 4-5 rating
    if (rawScore >= -4) return 3;   // 2-4 rating
    return 1.5; // 1-2 rating (below -4)
}

/**
 * Get detailed house breakdown for a list of houses
 * category: 'health', 'finance', or 'career'
 */
function getHouseBreakdown(houses, planetsData, ascendantSign, category = 'health', shadbalaApiData = null) {
    const breakdown = [];
    
    // Helper: Get planets in a house
    const getPlanetsInHouse = (houseNum) => {
        const planets = [];
        for (const [planet, planetInfo] of Object.entries(planetsData)) {
            if (planet === 'Ascendant' || planet === 'ayanamsa') continue;
            if (!planetInfo || !planetInfo.current_sign) continue;
            const planetHouse = getRelativeHouseNumber(ascendantSign, planetInfo.current_sign);
            if (planetHouse === houseNum) {
                planets.push({ planet, planetInfo });
            }
        }
        return planets;
    };
    
    if (category === 'health') {
        // Health-specific logic
        for (const houseNum of houses) {
            let houseScore = 0;
            const planetsInHouse = [];
            const planetsInHouseData = getPlanetsInHouse(houseNum);
            
            for (const { planet, planetInfo } of planetsInHouseData) {
                const dignity = calculatePlanetaryDignity(planet, planetInfo);
                const isExalted = dignity && dignity.isExalted;
                const isBenefic = BENEFIC_PLANETS.includes(planet);
                const isMalefic = MALIFIC_PLANETS.includes(planet);
                
                let points = 0;
                let details = [];
                
                if (houseNum === 1) {
                    if (isBenefic) {
                        points += 2;
                        houseScore += 2;
                        const houseName = houseNum === 1 ? 'Lagna (1st House)' : `${houseNum}th House`;
                        details.push(`Benefic in ${houseName} (+2) - strengthens vitality and constitution`);
                    }
                } else if ([6, 8, 12].includes(houseNum)) {
                    const houseName = houseNum === 6 ? 'Roga Bhava (6th House - diseases)' : 
                                     houseNum === 8 ? 'Ayur Bhava (8th House - longevity)' : 
                                     'Vyaya Bhava (12th House - hospitalization)';
                    if (isMalefic) {
                        points -= 2;
                        houseScore -= 2;
                        details.push(`Malefic in ${houseName} (-2) - increases health susceptibility`);
                    }
                    if (isBenefic) {
                        const shadbala = calculateShadbala(planet, planetInfo, planetsData, ascendantSign, shadbalaApiData);
                        const isAfflicted = (dignity && dignity.isDebilitated) || 
                                           (shadbala && getShadbalaScore(shadbala) < 0);
                        if (isAfflicted) {
                            points -= 1;
                            houseScore -= 1;
                            let afflictionReason = '';
                            if (dignity && dignity.isDebilitated) afflictionReason = 'debilitated';
                            else if (shadbala && getShadbalaScore(shadbala) < 0) afflictionReason = 'weak shadbala';
                            details.push(`Afflicted benefic in ${houseName} (-1) - ${afflictionReason}, limited protection`);
                        }
                    }
                    if (planet === 'Ketu' || planet === 'Rahu') {
                        points -= 2;
                        houseScore -= 2;
                        details.push(`${planet} in ${houseName} (-2) - shadow planet in health house, significant health concern`);
                    }
                }
                
                planetsInHouse.push({
                    planet,
                    planetInfo,
                    points,
                    details: details.join(', ')
                });
            }
            
            breakdown.push({
                house: houseNum,
                score: houseScore,
                planets: planetsInHouse
            });
        }
        
        // Add global modifiers for health
        const houses6812 = [6, 8, 12];
        let maleficCount6812 = 0;
        let hasMaleficIn6812 = false;
        
        for (const houseNum of houses6812) {
            const planetsInHouseData = getPlanetsInHouse(houseNum);
            let houseMaleficCount = 0;
            for (const { planet } of planetsInHouseData) {
                if (MALIFIC_PLANETS.includes(planet) || planet === 'Ketu' || planet === 'Rahu') {
                    houseMaleficCount++;
                    hasMaleficIn6812 = true;
                }
            }
            if (houseMaleficCount >= 2) {
                maleficCount6812++;
            }
        }
        
        if (!hasMaleficIn6812 && breakdown.length > 0) {
            breakdown[0].globalModifier = '+1 (No malefics in 6/8/12 houses - excellent health protection)';
        }
        if (maleficCount6812 > 0 && breakdown.length > 0) {
            if (!breakdown[0].globalModifier) {
                breakdown[0].globalModifier = `-1 (Multiple malefics in 6/8/12 houses - ${maleficCount6812} house(s) with 2+ malefics, increased health vulnerability)`;
            } else {
                breakdown[0].globalModifier += `, -1 (Multiple malefics - ${maleficCount6812} house(s) with 2+ malefics)`;
            }
        }
        
    } else if (category === 'finance') {
        // Finance-specific logic
        const isKendra = (houseNum) => [1, 4, 7, 10].includes(houseNum);
        const isTrikona = (houseNum) => [1, 5, 9].includes(houseNum);
        const getHouseLord = (houseNum) => {
            const houseSign = ((ascendantSign + houseNum - 2) % 12) + 1;
            return ZODIAC_LORDS[houseSign];
        };
        
        for (const houseNum of houses) {
            let houseScore = 0;
            const planetsInHouse = [];
            const planetsInHouseData = getPlanetsInHouse(houseNum);
            let beneficCount = 0;
            let maleficCount = 0;
            
            for (const { planet, planetInfo } of planetsInHouseData) {
                const dignity = calculatePlanetaryDignity(planet, planetInfo);
                const isExalted = dignity && dignity.isExalted;
                const isBenefic = BENEFIC_PLANETS.includes(planet);
                const isMalefic = MALIFIC_PLANETS.includes(planet);
                
                let points = 0;
                let details = [];
                
                const houseName = houseNum === 2 ? '2nd House (wealth)' : 
                                 houseNum === 11 ? '11th House (gains)' : 
                                 houseNum === 5 ? '5th House (speculation)' : 
                                 houseNum === 9 ? '9th House (fortune)' : 
                                 '10th House (career)';
                
                if (isBenefic) {
                    beneficCount++;
                    if (beneficCount <= 3) {
                        points += 1;
                        houseScore += 1;
                        details.push(`Benefic in ${houseName} (+1) - supports financial growth`);
                    }
                    if (isExalted) {
                        points += 1;
                        houseScore += 1;
                        details.push(`Exalted benefic (+1) - maximum financial benefit`);
                    }
                } else if (isMalefic) {
                    maleficCount++;
                    points -= 1;
                    houseScore -= 1;
                    details.push(`Malefic in ${houseName} (-1) - financial challenges`);
                }
                
                if ((planet === 'Ketu' || planet === 'Rahu') && [2, 11, 10].includes(houseNum)) {
                    points -= 1;
                    houseScore -= 1;
                    details.push(`${planet} in ${houseName} (-1) - financial volatility`);
                    if (maleficCount > 0) {
                        points -= 1;
                        houseScore -= 1;
                        details.push(`With other malefic (-1) - compounded financial risk`);
                    }
                }
                
                if (houseNum === 5 && isMalefic) {
                    points -= 1;
                    houseScore -= 1;
                    details.push(`Malefic in 5H (-1) - speculation and investment risk`);
                }
                
                planetsInHouse.push({
                    planet,
                    planetInfo,
                    points,
                    details: details.join(', ')
                });
            }
            
            breakdown.push({
                house: houseNum,
                score: houseScore,
                planets: planetsInHouse
            });
        }
        
        // Add placement bonuses
        const tenthLord = getHouseLord(10);
        const eleventhLord = getHouseLord(11);
        const secondLord = getHouseLord(2);
        
        if (tenthLord && planetsData[tenthLord]) {
            const tenthLordHouse = getRelativeHouseNumber(ascendantSign, planetsData[tenthLord].current_sign);
            if (tenthLordHouse === 11) {
                if (breakdown.length > 0) {
                    breakdown[0].placementBonus = '+2 (10th lord in 11th house - career supports gains, strong financial connection)';
                }
            }
        }
        
        if (eleventhLord && planetsData[eleventhLord]) {
            const eleventhLordHouse = getRelativeHouseNumber(ascendantSign, planetsData[eleventhLord].current_sign);
            if (eleventhLordHouse === 9 || eleventhLordHouse === 10) {
                if (breakdown.length > 0) {
                    const houseDesc = eleventhLordHouse === 9 ? '9th house (fortune)' : '10th house (career)';
                    if (!breakdown[0].placementBonus) {
                        breakdown[0].placementBonus = `+1 (11th lord in ${houseDesc} - gains connected to fortune/career)`;
                    } else {
                        breakdown[0].placementBonus += `, +1 (11L in ${houseDesc})`;
                    }
                }
            }
        }
        
        if (secondLord && planetsData[secondLord]) {
            const secondLordHouse = getRelativeHouseNumber(ascendantSign, planetsData[secondLord].current_sign);
            if (isKendra(secondLordHouse) || isTrikona(secondLordHouse)) {
                if (breakdown.length > 0) {
                    const houseType = isKendra(secondLordHouse) ? 'kendra (angular house)' : 'trikona (trine house)';
                    if (!breakdown[0].placementBonus) {
                        breakdown[0].placementBonus = `+1 (2nd lord in ${houseType} - wealth lord in powerful position)`;
                    } else {
                        breakdown[0].placementBonus += `, +1 (2L in ${houseType})`;
                    }
                }
            }
        }
        
    } else if (category === 'career') {
        // Career-specific logic - use calculateHouseStrengthRaw for individual houses
        for (const houseNum of houses) {
            const houseScore = calculateHouseStrengthRaw(houseNum, planetsData, ascendantSign);
            const planetsInHouseData = getPlanetsInHouse(houseNum);
            const planetsInHouse = planetsInHouseData.map(({ planet, planetInfo }) => {
                const dignity = calculatePlanetaryDignity(planet, planetInfo);
                let details = [];
                if (dignity) {
                    if (dignity.isExalted) details.push('Exalted (+4)');
                    else if (dignity.isOwnSign || dignity.isMoolatrikona) details.push('Own/Mooltrikona (+3)');
                    else if (dignity.type === 'friendly') details.push('Friendly (+1)');
                    else if (dignity.type === 'enemy') details.push('Enemy (-1)');
                    else if (dignity.isDebilitated) details.push('Debilitated (-3)');
                }
                if (BENEFIC_PLANETS.includes(planet)) details.push('Benefic (+1)');
                if (MALIFIC_PLANETS.includes(planet)) details.push('Malefic (-1)');
                return {
                    planet,
                    planetInfo,
                    points: 0, // Individual planet points not used in career
                    details: details.join(', ')
                };
            });
            
            breakdown.push({
                house: houseNum,
                score: houseScore,
                planets: planetsInHouse
            });
        }
    }
    
    return breakdown;
}

/**
 * Get detailed lord breakdown for a list of house numbers
 * category: 'health', 'finance', or 'career'
 */
function getLordBreakdown(houses, ascendantSign, planetsData, shadbalaApiData, category = 'health') {
    const breakdown = [];
    const getHouseLord = (houseNum) => {
        const houseSign = ((ascendantSign + houseNum - 2) % 12) + 1;
        return ZODIAC_LORDS[houseSign];
    };
    
    for (const houseNum of houses) {
        const lordStrength = computeLordStrength(houseNum, ascendantSign, planetsData, shadbalaApiData);
        const lord = getHouseLord(houseNum);
        
        if (lord && planetsData[lord]) {
            const lordInfo = planetsData[lord];
            const dignity = calculatePlanetaryDignity(lord, lordInfo);
            const shadbala = calculateShadbala(lord, lordInfo, planetsData, ascendantSign, shadbalaApiData);
            
            let details = [];
            
            // Get actual scores for detailed breakdown
            const dignityScore = getDignityScore(dignity);
            const shadbalaScore = getShadbalaScore(shadbala);
            const aspectRetro = calculateAspectRetroScore(lord, lordInfo, planetsData, ascendantSign, shadbalaApiData);
            const conjunction = calculateConjunctionScoreForLord(lord, planetsData, ascendantSign, shadbalaApiData);
            let aspectRetroConjTotal = aspectRetro.aspectScore + aspectRetro.retroScore + conjunction.score;
            aspectRetroConjTotal = Math.max(-3, Math.min(3, aspectRetroConjTotal));
            
            // Dignity with explanation
            if (dignity) {
                if (dignity.isExalted) details.push(`Exalted (+${dignityScore}) - planet in exaltation sign, maximum strength`);
                else if (dignity.isOwnSign || dignity.isMoolatrikona) details.push(`Own/Mooltrikona (+${dignityScore}) - planet in own sign, strong position`);
                else if (dignity.type === 'friendly') details.push(`Friendly Sign (+${dignityScore}) - planet in friendly sign, supportive`);
                else if (dignity.type === 'neutral') details.push(`Neutral (${dignityScore}) - planet in neutral sign, average influence`);
                else if (dignity.type === 'enemy') details.push(`Enemy Sign (${dignityScore}) - planet in enemy sign, weakened`);
                else if (dignity.isDebilitated) details.push(`Debilitated (${dignityScore}) - planet in debilitation sign, weakest position`);
            }
            
            // Shadbala with explanation
            if (shadbala) {
                const shadbalaValue = shadbala.fromApi ? shadbala.shadbala : shadbala.totalShadbala;
                if (shadbalaValue >= 480) details.push(`Strong Shadbala (+${shadbalaScore}) - high planetary strength (${Math.round(shadbalaValue)})`);
                else if (shadbalaValue < 350) details.push(`Weak Shadbala (${shadbalaScore}) - low planetary strength (${Math.round(shadbalaValue)})`);
                else details.push(`Moderate Shadbala (${shadbalaScore}) - average planetary strength (${Math.round(shadbalaValue)})`);
            }
            
            // Aspect/Retro/Conjunction with detailed breakdown
            if (aspectRetroConjTotal !== 0) {
                let aspectDetails = [];
                if (aspectRetro.aspectScore !== 0) {
                    if (aspectRetro.isStrongBenefic) aspectDetails.push(`Strong Benefic Aspect (+1)`);
                    if (aspectRetro.isStrongMalefic) aspectDetails.push(`Strong Malefic Aspect (-1)`);
                }
                if (aspectRetro.retroScore !== 0) {
                    const isRetro = lordInfo.isRetro === true || lordInfo.isRetro === 'true';
                    if (isRetro && MALIFIC_PLANETS.includes(lord)) aspectDetails.push(`Retrograde Malefic (-1)`);
                }
                if (conjunction.score !== 0) {
                    if (conjunction.score > 0) aspectDetails.push(`Benefic Conjunction (+${conjunction.score})`);
                    else aspectDetails.push(`Malefic Conjunction (${conjunction.score})`);
                }
                if (aspectDetails.length > 0) {
                    details.push(`Aspects/Conjunctions: ${aspectDetails.join(', ')} = ${aspectRetroConjTotal > 0 ? '+' : ''}${aspectRetroConjTotal}`);
                } else {
                    details.push(`Aspects/Conjunctions: ${aspectRetroConjTotal > 0 ? '+' : ''}${aspectRetroConjTotal}`);
                }
            } else {
                details.push(`Aspects/Conjunctions: No significant aspects or conjunctions (0)`);
            }
            
            // Add calculation summary
            details.push(`Calculation: Dignity(${dignityScore}) + Shadbala(${shadbalaScore}) + Aspects/Conjunctions(${aspectRetroConjTotal > 0 ? '+' : ''}${aspectRetroConjTotal}) = ${lordStrength.total > 0 ? '+' : ''}${lordStrength.total}`);
            
            breakdown.push({
                house: houseNum,
                lord,
                score: lordStrength.total,
                details: details.join(', ')
            });
        }
    }
    
    // Category-specific bonuses
    if (category === 'health') {
        // Add benefic protector bonus
        let strongestBeneficProtector = null;
        let strongestBeneficScore = -1;
        
        for (const planet of BENEFIC_PLANETS) {
            if (planetsData[planet]) {
                const planetShadbala = calculateShadbala(planet, planetsData[planet], planetsData, ascendantSign, shadbalaApiData);
                const planetDignity = calculatePlanetaryDignity(planet, planetsData[planet]);
                
                if (planetShadbala && getShadbalaScore(planetShadbala) >= 0) {
                    const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
                    let maleficAspectCount = 0;
                    for (const maleficPlanet of MALIFIC_PLANETS) {
                        if (planetsData[maleficPlanet] && maleficPlanet !== planet) {
                            const maleficHouse = getRelativeHouseNumber(ascendantSign, planetsData[maleficPlanet].current_sign);
                            const aspect7th = ((maleficHouse + 6 - 1) % 12) + 1;
                            if (aspect7th === planetHouse) {
                                maleficAspectCount++;
                            }
                        }
                    }
                    
                    let strengthScore = 0;
                    if (planetDignity) {
                        if (planetDignity.isExalted) strengthScore += 3;
                        else if (planetDignity.isOwnSign || planetDignity.isMoolatrikona) strengthScore += 2;
                        else if (planetDignity.strength >= 60) strengthScore += 1;
                    }
                    if (getShadbalaScore(planetShadbala) > 0) strengthScore += 1;
                    
                    if (maleficAspectCount < 2 && strengthScore > strongestBeneficScore) {
                        strongestBeneficScore = strengthScore;
                        strongestBeneficProtector = planet;
                    }
                }
            }
        }
        
        if (strongestBeneficProtector && breakdown.length > 0) {
            breakdown[0].beneficProtectorBonus = `+1 (${strongestBeneficProtector} as health protector)`;
            // Add the bonus to the first lord's score so the sum is correct
            breakdown[0].score += 1;
        }
        
    } else if (category === 'finance') {
        // Add placement bonuses for finance lords
        for (const houseNum of houses) {
            const lord = getHouseLord(houseNum);
            if (lord && planetsData[lord]) {
                const lordHouse = getRelativeHouseNumber(ascendantSign, planetsData[lord].current_sign);
                if (lordHouse === 2 || lordHouse === 11) {
                    const breakdownItem = breakdown.find(b => b.house === houseNum);
                    if (breakdownItem) {
                        // Add the bonus to the score so the sum is correct
                        breakdownItem.score += 1;
                        if (!breakdownItem.placementBonus) {
                            breakdownItem.placementBonus = `+1 (${lord} in ${lordHouse}H)`;
                        } else {
                            breakdownItem.placementBonus += `, +1 (${lord} in ${lordHouse}H)`;
                        }
                    }
                }
            }
        }
    }
    
    return breakdown;
}

/**
 * Get detailed yoga breakdown for a category
 */
function getYogaBreakdown(yogas, category) {
    if (!yogas) return { good: [], bad: [] };
    
    const goodYogas = yogas.good || [];
    const badYogas = yogas.bad || [];
    
    let relevantGood = [];
    let relevantBad = [];
    
    if (category === 'health') {
        relevantGood = goodYogas.filter(y => ['gaja', 'hamsa', 'neecha'].includes(y.key));
        relevantBad = badYogas.filter(y => ['grahan', 'shrapit'].includes(y.key));
    } else if (category === 'finance') {
        relevantGood = goodYogas.filter(y => ['dhana', 'lakshmi', 'parivartana'].includes(y.key));
        relevantBad = badYogas.filter(y => ['daridra'].includes(y.key));
    } else if (category === 'career') {
        relevantGood = goodYogas.filter(y => ['raj', 'amala', 'panch'].includes(y.key));
        relevantBad = badYogas.filter(y => ['bhanga'].includes(y.key));
    }
    
    return {
        good: relevantGood.map(y => ({
            name: y.name,
            points: category === 'finance' || category === 'career' ? 4 : 3
        })),
        bad: relevantBad.map(y => ({
            name: y.name,
            points: category === 'finance' ? -4 : -3
        }))
    };
}

/**
 * Calculate Health Score (1-10) using new specification
 * Houses analyzed: 1st (Lagna), 6th, 8th, 12th
 */
function calculateHealthScore(planetsData, ascendantSign, yogas, currentDasha, shadbalaApiData) {
    if (!planetsData || !ascendantSign) return { score: 5, factors: {} };
    
    // Helper: Get planets in a house
    const getPlanetsInHouse = (houseNum) => {
        const planets = [];
        for (const [planet, planetInfo] of Object.entries(planetsData)) {
            if (planet === 'Ascendant' || planet === 'ayanamsa') continue;
            if (!planetInfo || !planetInfo.current_sign) continue;
            const planetHouse = getRelativeHouseNumber(ascendantSign, planetInfo.current_sign);
            if (planetHouse === houseNum) {
                planets.push({ planet, planetInfo });
            }
        }
        return planets;
    };
    
    // ========== 1. Health House Strength (HS_health) ==========
    let HS_health = 0;
    const healthHouses = [1, 6, 8, 12];
    
    for (const houseNum of healthHouses) {
        const planetsInHouse = getPlanetsInHouse(houseNum);
        
        for (const { planet, planetInfo } of planetsInHouse) {
            const dignity = calculatePlanetaryDignity(planet, planetInfo);
            const isExalted = dignity && dignity.isExalted;
            const isBenefic = BENEFIC_PLANETS.includes(planet);
            const isMalefic = MALIFIC_PLANETS.includes(planet);
            
            if (houseNum === 1) {
                // Benefic in 1H: +2
                if (isBenefic) {
                    HS_health += 2;
                    if (isExalted) HS_health += 0; // Already counted
                }
            } else if ([6, 8, 12].includes(houseNum)) {
                // Malefic in 6H/8H/12H: -2
                if (isMalefic) {
                    HS_health -= 2;
                }
                // Benefic in 6H/8H/12H: 0 or -1 (choose -1 if heavily afflicted)
                if (isBenefic) {
                    // Check if heavily afflicted (debilitated or weak shadbala)
                    const shadbala = calculateShadbala(planet, planetInfo, planetsData, ascendantSign, shadbalaApiData);
                    const isAfflicted = (dignity && dignity.isDebilitated) || 
                                       (shadbala && getShadbalaScore(shadbala) < 0);
                    if (isAfflicted) {
                        HS_health -= 1;
                    }
                }
                // Ketu/Rahu in 6H/8H/12H: -2
                if (planet === 'Ketu' || planet === 'Rahu') {
                    HS_health -= 2;
                }
            }
        }
    }
    
    // Global modifiers
    const houses6812 = [6, 8, 12];
    let maleficCount6812 = 0;
    let hasMaleficIn6812 = false;
    
    for (const houseNum of houses6812) {
        const planetsInHouse = getPlanetsInHouse(houseNum);
        let houseMaleficCount = 0;
        for (const { planet } of planetsInHouse) {
            if (MALIFIC_PLANETS.includes(planet) || planet === 'Ketu' || planet === 'Rahu') {
                houseMaleficCount++;
                hasMaleficIn6812 = true;
            }
        }
        if (houseMaleficCount >= 2) {
            maleficCount6812++;
        }
    }
    
    // If 6H, 8H, 12H have NO malefics at all: HS_health += 1
    if (!hasMaleficIn6812) {
        HS_health += 1;
    }
    // If any of 6H, 8H, 12H has 2+ malefics: HS_health -= 1
    if (maleficCount6812 > 0) {
        HS_health -= 1;
    }
    
    // ========== 2. Health Lord Strength (LS_health) ==========
    const relevantLords = [1, 6, 8, 12];
    let LS_health = 0;
    
    for (const houseNum of relevantLords) {
        const lordStrength = computeLordStrength(houseNum, ascendantSign, planetsData, shadbalaApiData);
        LS_health += lordStrength.total;
    }
    
    // Add strongest benefic as natural health protector (typically Jupiter but generic)
    let strongestBeneficProtector = null;
    let strongestBeneficScore = -1;
    
    for (const planet of BENEFIC_PLANETS) {
        if (planetsData[planet]) {
            const planetShadbala = calculateShadbala(planet, planetsData[planet], planetsData, ascendantSign, shadbalaApiData);
            const planetDignity = calculatePlanetaryDignity(planet, planetsData[planet]);
            
            if (planetShadbala && getShadbalaScore(planetShadbala) >= 0) {
                // Check if planet is heavily afflicted (multiple malefic aspects)
                const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
                let maleficAspectCount = 0;
                for (const maleficPlanet of MALIFIC_PLANETS) {
                    if (planetsData[maleficPlanet] && maleficPlanet !== planet) {
                        const maleficHouse = getRelativeHouseNumber(ascendantSign, planetsData[maleficPlanet].current_sign);
                        const aspect7th = ((maleficHouse + 6 - 1) % 12) + 1;
                        if (aspect7th === planetHouse) {
                            maleficAspectCount++;
                        }
                    }
                }
                
                // Calculate strength score
                let strengthScore = 0;
                if (planetDignity) {
                    if (planetDignity.isExalted) strengthScore += 3;
                    else if (planetDignity.isOwnSign || planetDignity.isMoolatrikona) strengthScore += 2;
                    else if (planetDignity.strength >= 60) strengthScore += 1;
                }
                if (getShadbalaScore(planetShadbala) > 0) strengthScore += 1;
                
                // Only consider strong, unafflicted benefics as protectors
                if (maleficAspectCount < 2 && strengthScore > strongestBeneficScore) {
                    strongestBeneficScore = strengthScore;
                    strongestBeneficProtector = planet;
                }
            }
        }
    }
    
    // Add bonus for strongest benefic protector
    if (strongestBeneficProtector) {
        LS_health += 1;
    }
    
    // ========== 3. Health Yogas (optional, usually 0-2) ==========
    const healthYogas = calculateYogasScoreRaw(yogas, 'health', planetsData, ascendantSign);
    // Cap yogas to 0-2 range
    const healthYogasCapped = Math.max(0, Math.min(2, healthYogas));
    
    // ========== 4. Raw and Rating ==========
    const Raw_health = HS_health + LS_health + healthYogasCapped;
    let HealthRating = mapRawTo1to10(Raw_health);
    
    // Apply sanity floor
    HealthRating = applySanityFloor(HealthRating, relevantLords, planetsData, ascendantSign, shadbalaApiData);
    
    // Get detailed breakdowns
    const houseBreakdown = getHouseBreakdown(healthHouses, planetsData, ascendantSign);
    const lordBreakdown = getLordBreakdown(relevantLords, ascendantSign, planetsData, shadbalaApiData);
    const yogaBreakdown = getYogaBreakdown(yogas, 'health');
    
    const factors = {
        houseStrength: HS_health,
        lordStrength: LS_health,
        yogas: healthYogasCapped,
        rawTotal: Raw_health,
        houseBreakdown,
        lordBreakdown,
        yogaBreakdown
    };
    
    return { 
        score: Math.max(1, Math.min(10, Math.round(HealthRating * 10) / 10)), 
        factors 
    };
}

/**
 * Calculate Finance Score (1-10) with conjunction scoring for all lords
 */
/**
 * Calculate Finance Score (1-10) using new specification
 * Houses analyzed: 2nd, 11th, 5th, 9th, 10th
 */
function calculateFinanceScore(planetsData, ascendantSign, yogas, currentDasha, shadbalaApiData) {
    if (!planetsData || !ascendantSign) return { score: 5, factors: {} };
    
    // Helper: Get house lord
    const getHouseLord = (houseNum) => {
        const houseSign = ((ascendantSign + houseNum - 2) % 12) + 1;
        return ZODIAC_LORDS[houseSign];
    };
    
    // Helper: Get planets in a house
    const getPlanetsInHouse = (houseNum) => {
        const planets = [];
        for (const [planet, planetInfo] of Object.entries(planetsData)) {
            if (planet === 'Ascendant' || planet === 'ayanamsa') continue;
            if (!planetInfo || !planetInfo.current_sign) continue;
            const planetHouse = getRelativeHouseNumber(ascendantSign, planetInfo.current_sign);
            if (planetHouse === houseNum) {
                planets.push({ planet, planetInfo });
            }
        }
        return planets;
    };
    
    // Helper: Check if house is kendra (1, 4, 7, 10) or trikona (1, 5, 9)
    const isKendra = (houseNum) => [1, 4, 7, 10].includes(houseNum);
    const isTrikona = (houseNum) => [1, 5, 9].includes(houseNum);
    
    // ========== 1. Finance House Strength (HS_finance) ==========
    let HS_finance = 0;
    const financeHouses = [2, 11, 5, 9, 10];
    
    for (const houseNum of financeHouses) {
        const planetsInHouse = getPlanetsInHouse(houseNum);
        let houseScore = 0;
        let beneficCount = 0;
        let maleficCount = 0;
        
        for (const { planet, planetInfo } of planetsInHouse) {
            const dignity = calculatePlanetaryDignity(planet, planetInfo);
            const isExalted = dignity && dignity.isExalted;
            const isBenefic = BENEFIC_PLANETS.includes(planet);
            const isMalefic = MALIFIC_PLANETS.includes(planet);
            
            if (isBenefic) {
                beneficCount++;
                // Benefic in 2H/11H/9H/10H: +1 each (max +3 per house)
                if (beneficCount <= 3) {
                    houseScore += 1;
                }
                // Exalted benefic there: +2 (additional)
                if (isExalted) {
                    houseScore += 1; // Total +2 for exalted benefic
                }
            } else if (isMalefic) {
                maleficCount++;
                // Malefic in 2H/11H/9H/10H: -1 each
                houseScore -= 1;
            }
            
            // Ketu/Rahu in 2H/11H/10H: -1 (volatility)
            if ((planet === 'Ketu' || planet === 'Rahu') && [2, 11, 10].includes(houseNum)) {
                houseScore -= 1;
                // If with another malefic, extra -1
                if (maleficCount > 0) {
                    houseScore -= 1;
                }
            }
            
            // Malefic in 5H (speculation risk): -1
            if (houseNum === 5 && isMalefic) {
                houseScore -= 1;
            }
        }
        
        HS_finance += houseScore;
    }
    
    // Placement bonuses
    const tenthLord = getHouseLord(10);
    const eleventhLord = getHouseLord(11);
    const secondLord = getHouseLord(2);
    
    if (tenthLord && planetsData[tenthLord]) {
        const tenthLordHouse = getRelativeHouseNumber(ascendantSign, planetsData[tenthLord].current_sign);
        // If 10L sits in 11H: HS_finance += 2 (career >> gains)
        if (tenthLordHouse === 11) {
            HS_finance += 2;
        }
    }
    
    if (eleventhLord && planetsData[eleventhLord]) {
        const eleventhLordHouse = getRelativeHouseNumber(ascendantSign, planetsData[eleventhLord].current_sign);
        // If 11L sits in 9H or 10H: HS_finance += 1
        if (eleventhLordHouse === 9 || eleventhLordHouse === 10) {
            HS_finance += 1;
        }
    }
    
    if (secondLord && planetsData[secondLord]) {
        const secondLordHouse = getRelativeHouseNumber(ascendantSign, planetsData[secondLord].current_sign);
        // If 2L sits in kendra/trikona: HS_finance += 1
        if (isKendra(secondLordHouse) || isTrikona(secondLordHouse)) {
            HS_finance += 1;
        }
    }
    
    // ========== 2. Finance Lord Strength (LS_finance) ==========
    const relevantLords = [2, 11, 9, 10];
    let LS_finance = 0;
    
    for (const houseNum of relevantLords) {
        const lordStrength = computeLordStrength(houseNum, ascendantSign, planetsData, shadbalaApiData);
        LS_finance += lordStrength.total;
        
        // Placement bonus: If this lord sits in 2H or 11H: LordStrength += 1
        const lord = getHouseLord(houseNum);
        if (lord && planetsData[lord]) {
            const lordHouse = getRelativeHouseNumber(ascendantSign, planetsData[lord].current_sign);
            if (lordHouse === 2 || lordHouse === 11) {
                LS_finance += 1;
            }
        }
    }
    
    // ========== 3. Finance Yogas ==========
    // Helper function to count malefic aspects on a planet
    const countMaleficAspects = (planet) => {
        if (!planetsData[planet]) return 0;
        const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
        let maleficCount = 0;
        for (const [otherPlanet, otherInfo] of Object.entries(planetsData)) {
            if (otherPlanet === planet || otherPlanet === 'Ascendant' || otherPlanet === 'ayanamsa') continue;
            if (!otherInfo || !otherInfo.current_sign) continue;
            const otherHouse = getRelativeHouseNumber(ascendantSign, otherInfo.current_sign);
            const aspects = ASPECT_PATTERNS.getAspects(otherPlanet, otherHouse, otherInfo.current_sign);
            if (aspects[planetHouse] && MALIFIC_PLANETS.includes(otherPlanet)) {
                maleficCount++;
            }
        }
        return maleficCount;
    };
    
    // Helper function to check lord strength level: 'strong', 'weak', 'broken', or false
    const getLordStrengthLevel = (lord, planetsData, ascendantSign, shadbalaApiData) => {
        if (!lord || !planetsData[lord]) return false;
        const dignity = calculatePlanetaryDignity(lord, planetsData[lord]);
        const shadbala = calculateShadbala(lord, planetsData[lord], planetsData, ascendantSign, shadbalaApiData);
        const shadbalaValue = shadbala ? (shadbala.shadbala || shadbala.totalShadbala || 0) : 0;
        const maleficAspectCount = countMaleficAspects(lord);
        
        // Broken: Debilitated OR very weak (Shadbala < 300) OR (weak Shadbala < 350 + multiple malefic aspects)
        const isDebilitated = dignity && dignity.isDebilitated;
        const isVeryWeak = shadbalaValue < 300;
        const isWeakWithAfflictions = shadbalaValue < 350 && maleficAspectCount >= 2;
        
        if (isDebilitated || isVeryWeak || isWeakWithAfflictions) {
            return 'broken';
        }
        
        // Strong: Dignity ≥ neutral (not debilitated, not enemy) AND Shadbala ≥ moderate (≥ 350)
        const dignityOK = !dignity || (!dignity.isDebilitated && dignity.type !== 'enemy');
        const shadbalaOK = shadbalaValue >= 350;
        
        if (dignityOK && shadbalaOK) {
            return 'strong';
        }
        
        // Weak: Some mild weakness (enemy sign OR Shadbala just below moderate 300-349) but not broken
        const isEnemy = dignity && dignity.type === 'enemy';
        const isSlightlyWeakShadbala = shadbalaValue >= 300 && shadbalaValue < 350;
        
        if (isEnemy || isSlightlyWeakShadbala) {
            return 'weak';
        }
        
        // Default to weak if we can't determine
        return 'weak';
    };
    
    // Helper function to check if a lord is reasonably strong (for backward compatibility)
    const isLordReasonablyStrong = (lord, planetsData, ascendantSign, shadbalaApiData) => {
        return getLordStrengthLevel(lord, planetsData, ascendantSign, shadbalaApiData) === 'strong';
    };
    
    // Helper function to check yoga strength level: 'strong', 'weak', 'broken', or false
    // Returns the strength level if yoga involves finance houses, false otherwise
    const yogaInvolvesFinanceHouses = (yogaKey, planetsData, ascendantSign, shadbalaApiData) => {
        const getHouseLord = (houseNum) => {
            const houseSign = ((ascendantSign + houseNum - 2) % 12) + 1;
            return ZODIAC_LORDS[houseSign];
        };
        
        const secondLord = getHouseLord(2);
        const fifthLord = getHouseLord(5);
        const ninthLord = getHouseLord(9);
        const tenthLord = getHouseLord(10);
        const eleventhLord = getHouseLord(11);
        const lagnaLord = getHouseLord(1);
        
        // Helper to get minimum strength level from multiple lords
        const getMinStrengthLevel = (lords) => {
            if (!lords || lords.length === 0) return false;
            const levels = lords.map(lord => getLordStrengthLevel(lord, planetsData, ascendantSign, shadbalaApiData)).filter(Boolean);
            if (levels.length === 0) return false;
            
            // Return the weakest level: broken > weak > strong
            if (levels.includes('broken')) return 'broken';
            if (levels.includes('weak')) return 'weak';
            if (levels.every(level => level === 'strong')) return 'strong';
            return 'weak'; // Mixed strong/weak defaults to weak
        };
        
        if (yogaKey === 'dhana') {
            // Dhana: Venus & Jupiter in 11th house
            const venusHouse = planetsData.Venus ? getRelativeHouseNumber(ascendantSign, planetsData.Venus.current_sign) : null;
            const jupiterHouse = planetsData.Jupiter ? getRelativeHouseNumber(ascendantSign, planetsData.Jupiter.current_sign) : null;
            if (venusHouse === 11 && jupiterHouse === 11) {
                // Check 11th lord strength level
                return getLordStrengthLevel(eleventhLord, planetsData, ascendantSign, shadbalaApiData);
            }
        } else if (yogaKey === 'lakshmi') {
            // Lakshmi: 9th lord + Lagna lord
            return getMinStrengthLevel([ninthLord, lagnaLord]);
        } else if (yogaKey === 'parivartana') {
            // Parivartana: Check if involves finance house exchanges
            const secondLordHouse = planetsData[secondLord] ? getRelativeHouseNumber(ascendantSign, planetsData[secondLord].current_sign) : null;
            const fifthLordHouse = planetsData[fifthLord] ? getRelativeHouseNumber(ascendantSign, planetsData[fifthLord].current_sign) : null;
            if (secondLordHouse === 5 && fifthLordHouse === 2) {
                // 2nd <-> 5th exchange
                return getMinStrengthLevel([secondLord, fifthLord]);
            }
            // Check other parivartana combinations involving finance houses
            const financeLords = [secondLord, eleventhLord, ninthLord, fifthLord, tenthLord];
            for (const lord1 of financeLords) {
                if (!lord1 || !planetsData[lord1]) continue;
                const lord1Houses = [];
                for (let h = 1; h <= 12; h++) {
                    if (getHouseLord(h) === lord1) lord1Houses.push(h);
                }
                for (const lord2 of financeLords) {
                    if (lord1 === lord2 || !lord2 || !planetsData[lord2]) continue;
                    const lord2House = getRelativeHouseNumber(ascendantSign, planetsData[lord2].current_sign);
                    if (lord1Houses.includes(lord2House)) {
                        const lord2Houses = [];
                        for (let h = 1; h <= 12; h++) {
                            if (getHouseLord(h) === lord2) lord2Houses.push(h);
                        }
                        const lord1House = getRelativeHouseNumber(ascendantSign, planetsData[lord1].current_sign);
                        if (lord2Houses.includes(lord1House)) {
                            // Mutual exchange found
                            return getMinStrengthLevel([lord1, lord2]);
                        }
                    }
                }
            }
        }
        return false;
    };
    
    // Calculate good yogas with strength tiers
    let financeYogasPlus = 0;
    if (yogas && yogas.good) {
        const dhanaYoga = yogas.good.find(y => y.key === 'dhana');
        const lakshmiYoga = yogas.good.find(y => y.key === 'lakshmi');
        const parivartanaYoga = yogas.good.find(y => y.key === 'parivartana');
        
        // Check each yoga and add points based on strength level
        const dhanaStrength = dhanaYoga ? yogaInvolvesFinanceHouses('dhana', planetsData, ascendantSign, shadbalaApiData) : false;
        const lakshmiStrength = lakshmiYoga ? yogaInvolvesFinanceHouses('lakshmi', planetsData, ascendantSign, shadbalaApiData) : false;
        const parivartanaStrength = parivartanaYoga ? yogaInvolvesFinanceHouses('parivartana', planetsData, ascendantSign, shadbalaApiData) : false;
        
        // Strong yoga: +4 internally
        if (dhanaStrength === 'strong') financeYogasPlus += 4;
        if (lakshmiStrength === 'strong') financeYogasPlus += 4;
        if (parivartanaStrength === 'strong') financeYogasPlus += 4;
        
        // Weak yoga: +2 internally (shows as +0.5-1 after cap)
        if (dhanaStrength === 'weak') financeYogasPlus += 2;
        if (lakshmiStrength === 'weak') financeYogasPlus += 2;
        if (parivartanaStrength === 'weak') financeYogasPlus += 2;
        
        // Broken yoga: 0 (no bonus, or could contribute to negative if Daridra-like)
        // Already handled by not adding anything
    }
    // Cap good yogas at +2 total
    financeYogasPlus = Math.min(financeYogasPlus, 2);
    
    // Calculate bad yogas (capped at -2)
    let financeYogasMinus = 0;
    if (yogas && yogas.bad) {
        const daridraYoga = yogas.bad.find(y => y.key === 'daridra');
        if (daridraYoga) {
            // Check if Daridra involves wealth lords and at least one is clearly afflicted
            const getHouseLord = (houseNum) => {
                const houseSign = ((ascendantSign + houseNum - 2) % 12) + 1;
                return ZODIAC_LORDS[houseSign];
            };
            const secondLord = getHouseLord(2);
            const eleventhLord = getHouseLord(11);
            const ninthLord = getHouseLord(9);
            const tenthLord = getHouseLord(10);
            const wealthLords = [secondLord, eleventhLord, ninthLord, tenthLord];
            
            let involvesWealthLord = false;
            let hasAfflictedLord = false;
            
            for (const lord of wealthLords) {
                if (!lord || !planetsData[lord]) continue;
                involvesWealthLord = true;
                
                const dignity = calculatePlanetaryDignity(lord, planetsData[lord]);
                const shadbala = calculateShadbala(lord, planetsData[lord], planetsData, ascendantSign, shadbalaApiData);
                const shadbalaValue = shadbala ? (shadbala.shadbala || shadbala.totalShadbala || 0) : 0;
                
                // Check if clearly afflicted (debilitated OR weak shadbala + malefic aspects)
                const isDebilitated = dignity && dignity.isDebilitated;
                const isWeakShadbala = shadbalaValue < 350;
                const maleficAspectCount = countMaleficAspects(lord);
                
                if (isDebilitated || (isWeakShadbala && maleficAspectCount >= 1)) {
                    hasAfflictedLord = true;
                    break;
                }
            }
            
            if (involvesWealthLord && hasAfflictedLord) {
                financeYogasMinus -= 4; // -4 internally
            }
        }
    }
    // Cap bad yogas at -2
    financeYogasMinus = Math.max(financeYogasMinus, -2);
    
    // Net yogas = good + bad (range: -2 to +2)
    const financeYogas = financeYogasPlus + financeYogasMinus;
    
    // ========== 4. Raw and Rating ==========
    const Raw_finance = HS_finance + LS_finance + financeYogas;
    let FinanceRating = mapRawTo1to10(Raw_finance);
    
    // Apply sanity floor
    FinanceRating = applySanityFloor(FinanceRating, relevantLords, planetsData, ascendantSign, shadbalaApiData);
    
    // Get detailed breakdowns
    const houseBreakdown = getHouseBreakdown(financeHouses, planetsData, ascendantSign, 'finance', shadbalaApiData);
    const lordBreakdown = getLordBreakdown(relevantLords, ascendantSign, planetsData, shadbalaApiData, 'finance');
    const yogaBreakdown = getYogaBreakdown(yogas, 'finance');
    
    const factors = {
        houseStrength: HS_finance,
        lordStrength: LS_finance,
        yogas: financeYogas,
        rawTotal: Raw_finance,
        houseBreakdown,
        lordBreakdown,
        yogaBreakdown
    };
    
    return { 
        score: Math.max(1, Math.min(10, Math.round(FinanceRating * 10) / 10)), 
        factors 
    };
}

/**
 * Calculate house base score for Career calculation
 * Returns raw house score from occupants only (no lord bonus)
 */
function calculateCareerHouseBase(houseNum, planetsData, ascendantSign) {
    let houseScore = 0;
    
    // Get planets in this house
    const planetsInHouse = [];
    for (const [planet, planetInfo] of Object.entries(planetsData)) {
        if (planet === 'Ascendant' || planet === 'ayanamsa') continue;
        if (!planetInfo || !planetInfo.current_sign) continue;
        const planetHouse = getRelativeHouseNumber(ascendantSign, planetInfo.current_sign);
        if (planetHouse === houseNum) {
            planetsInHouse.push({ planet, planetInfo });
        }
    }
    
    for (const { planet, planetInfo } of planetsInHouse) {
        const isBenefic = BENEFIC_PLANETS.includes(planet);
        const isMalefic = MALIFIC_PLANETS.includes(planet);
        
        if (houseNum === 10) {
            // 10th house: Benefic +1, Malefic -1, Ketu -1 extra
            if (isBenefic) houseScore += 1;
            else if (isMalefic) houseScore -= 1;
            if (planet === 'Ketu') houseScore -= 1; // Extra -1 for Ketu
        } else if (houseNum === 1) {
            // 1st house: Benefic +1, Malefic -1
            if (isBenefic) houseScore += 1;
            else if (isMalefic) houseScore -= 1;
        } else if (houseNum === 6) {
            // 6th house: Benefic +1, Malefic -1
            if (isBenefic) houseScore += 1;
            else if (isMalefic) houseScore -= 1;
        } else if (houseNum === 3) {
            // 3rd house: Benefic +1, Malefic -1
            if (isBenefic) houseScore += 1;
            else if (isMalefic) houseScore -= 1;
        } else if (houseNum === 2) {
            // 2nd house: Benefic +1, Malefic -1, Rahu/Ketu -1 extra
            if (isBenefic) houseScore += 1;
            else if (isMalefic) houseScore -= 1;
            if (planet === 'Rahu' || planet === 'Ketu') houseScore -= 1; // Extra -1 for volatility
        } else if (houseNum === 11) {
            // 11th house: Benefic +1, Malefic -1
            if (isBenefic) houseScore += 1;
            else if (isMalefic) houseScore -= 1;
        }
    }
    
    return houseScore;
}

/**
 * Calculate Career/Job Score using updated detailed scoring system
 * Returns: Work Strength, Earnings Strength, and Overall Career Rating
 */
function calculateCareerScore(planetsData, ascendantSign, yogas, currentDasha, shadbalaApiData) {
    if (!planetsData || !ascendantSign) return { 
        score: 5, 
        workStrength: 5, 
        earningsStrength: 5, 
        factors: {} 
    };
    
    // Helper: Get house lord
    const getHouseLord = (houseNum) => {
        const houseSign = ((ascendantSign + houseNum - 2) % 12) + 1;
        return ZODIAC_LORDS[houseSign];
    };
    
    // Helper: Check if house is kendra (1, 4, 7, 10) or trikona (1, 5, 9)
    const isKendra = (houseNum) => [1, 4, 7, 10].includes(houseNum);
    const isTrikona = (houseNum) => [1, 5, 9].includes(houseNum);
    
    // Helper: Check if planet aspects a house (simplified - check if planet is in aspecting house)
    const checkAspects = (planet, targetHouse, planetsData, ascendantSign) => {
        if (!planetsData[planet]) return { benefic: 0, malefic: 0 };
        const planetHouse = getRelativeHouseNumber(ascendantSign, planetsData[planet].current_sign);
        const isBenefic = BENEFIC_PLANETS.includes(planet);
        const isMalefic = MALIFIC_PLANETS.includes(planet);
        
        // Simplified aspect check: 7th house aspect (opposition)
        let beneficCount = 0, maleficCount = 0;
        if (planetHouse === ((targetHouse + 5) % 12) + 1) {
            if (isBenefic) beneficCount = 1;
            if (isMalefic) maleficCount = 1;
        }
        return { benefic: beneficCount, malefic: maleficCount };
    };
    
    // Helper: Check conjunction (planets in same house)
    const checkConjunction = (planet1, planet2, planetsData, ascendantSign) => {
        if (!planetsData[planet1] || !planetsData[planet2]) return false;
        const house1 = getRelativeHouseNumber(ascendantSign, planetsData[planet1].current_sign);
        const house2 = getRelativeHouseNumber(ascendantSign, planetsData[planet2].current_sign);
        return house1 === house2;
    };
    
    // Helper: Get planetary relationship
    const getPlanetaryRelationship = (planet1, planet2) => {
        if (planet1 === planet2) return 'same';
        if (planet1 === 'Rahu' || planet1 === 'Ketu' || planet2 === 'Rahu' || planet2 === 'Ketu') {
            return 'neutral'; // Rahu/Ketu relationships not defined in standard system
        }
        const relationship = PLANETARY_RELATIONSHIPS[planet1];
        if (!relationship) return 'neutral';
        if (relationship.friends.includes(planet2)) return 'friend';
        if (relationship.enemies.includes(planet2)) return 'enemy';
        return 'neutral';
    };
    
    // Helper: Calculate conjunction score for a lord (-3 to +3)
    const calculateConjunctionScore = (lord, planetsData, ascendantSign, shadbalaApiData) => {
        if (!planetsData[lord]) return { score: 0, details: [] };
        
        let conjunctionScore = 0;
        const conjunctionDetails = [];
        const lordInfo = planetsData[lord];
        const lordHouse = getRelativeHouseNumber(ascendantSign, lordInfo.current_sign);
        
        // Check all planets for conjunctions with this lord
        for (const [planet, planetInfo] of Object.entries(planetsData)) {
            if (planet === lord || planet === 'Ascendant' || planet === 'ayanamsa') continue;
            if (!planetInfo || !planetInfo.current_sign) continue;
            
            if (checkConjunction(planet, lord, planetsData, ascendantSign)) {
                const isBenefic = BENEFIC_PLANETS.includes(planet);
                const isMalefic = MALIFIC_PLANETS.includes(planet);
                const planetDignity = calculatePlanetaryDignity(planet, planetInfo);
                const planetShadbala = calculateShadbala(planet, planetInfo, planetsData, ascendantSign, shadbalaApiData);
                const relationship = getPlanetaryRelationship(lord, planet);
                
                let points = 0;
                let detail = '';
                
                if (isBenefic) {
                    // Benefic Conjunctions (+1 to +3)
                    points = 1; // Base: +1 for benefic conjunction
                    detail = `${planet} (benefic)`;
                    
                    // With own sign lord / friend: +2
                    if (relationship === 'friend') {
                        points = 2;
                        detail += ', friend';
                    }
                    
                    // With strong benefic (exalted / strong shadbala): +3
                    if (planetDignity && (planetDignity.isExalted || planetDignity.isOwnSign)) {
                        points = 3;
                        detail += ', strong (exalted/own)';
                    } else if (planetShadbala) {
                        const shadbalaValue = planetShadbala.fromApi ? planetShadbala.shadbala : planetShadbala.totalShadbala;
                        if (shadbalaValue >= 480) {
                            points = 3;
                            detail += ', strong (shadbala)';
                        }
                    }
                    
                    conjunctionScore += points;
                    conjunctionDetails.push(`+${points} (${detail})`);
                } else if (isMalefic) {
                    // Malefic Conjunctions (-1 to -3)
                    points = -1; // Base: -1 for mild malefic conjunction
                    detail = `${planet} (malefic)`;
                    
                    // With enemy planet: -2
                    if (relationship === 'enemy') {
                        points = -2;
                        detail += ', enemy';
                    }
                    
                    // With strong malefic (exalted / strong shadbala): -3
                    if (planetDignity && (planetDignity.isExalted || planetDignity.isOwnSign)) {
                        points = -3;
                        detail += ', strong (exalted/own)';
                    } else if (planetShadbala) {
                        const shadbalaValue = planetShadbala.fromApi ? planetShadbala.shadbala : planetShadbala.totalShadbala;
                        if (shadbalaValue >= 480) {
                            points = -3;
                            detail += ', strong (shadbala)';
                        }
                    }
                    
                    conjunctionScore += points;
                    conjunctionDetails.push(`${points} (${detail})`);
                }
            }
        }
        
        // Cap at -3 to +3 per lord
        conjunctionScore = Math.max(-3, Math.min(3, conjunctionScore));
        
        return { score: conjunctionScore, details: conjunctionDetails };
    };
    
    // ========== 1. 10th House & 10th-lord Block (Primary work indicator) — max 8 points ==========
    // Calculate 10th house base score (H10)
    let H10 = calculateCareerHouseBase(10, planetsData, ascendantSign);
    
    // Placement bonuses for 10th house
    const tenthLord = getHouseLord(10);
    if (tenthLord && planetsData[tenthLord]) {
        const tenthLordHouse = getRelativeHouseNumber(ascendantSign, planetsData[tenthLord].current_sign);
        if (tenthLordHouse === 10 || tenthLordHouse === 11) {
            H10 += 2; // 10L in 10H or 11H: +2
        } else if (tenthLordHouse === 6 || tenthLordHouse === 9) {
            H10 += 1; // 10L in 6H or 9H: +1
        }
    }
    
    // 10L strength using computeLordStrength (includes Dignity + Shadbala + Aspects/Conjunctions)
    const tenthLordStrength = computeLordStrength(10, ascendantSign, planetsData, shadbalaApiData);
    const L10_strength = tenthLordStrength.total; // Already includes aspects/conjunctions
    
    // Raw score
    const raw10 = H10 + L10_strength;
    
    // Normalize: Map from [-5, +5] to [0, 8]
    // Formula: clamp((raw10 + 5) × 8/10, 0, 8)
    const tenthBlockScore = Math.max(0, Math.min(8, Math.round(((raw10 + 5) * 8 / 10) * 10) / 10));
    
    // ========== 2. Lagna/Ascendant & Lagna-lord Block — max 4 points ==========
    // Calculate 1st house base score (H1)
    let H1 = calculateCareerHouseBase(1, planetsData, ascendantSign);
    
    // Placement bonus for 1st house
    const lagnaLord = getHouseLord(1);
    if (lagnaLord && planetsData[lagnaLord]) {
        const lagnaLordHouse = getRelativeHouseNumber(ascendantSign, planetsData[lagnaLord].current_sign);
        const lagnaLordShadbala = calculateShadbala(lagnaLord, planetsData[lagnaLord], planetsData, ascendantSign, shadbalaApiData);
        const shadbalaValue = lagnaLordShadbala ? (lagnaLordShadbala.shadbala || lagnaLordShadbala.totalShadbala || 0) : 0;
        if ((isKendra(lagnaLordHouse) || isTrikona(lagnaLordHouse)) && shadbalaValue >= 350) {
            H1 += 1; // 1L in kendra/trikona and Shadbala ≥ moderate: +1
        }
    }
    
    // 1L strength using computeLordStrength
    const lagnaLordStrength = computeLordStrength(1, ascendantSign, planetsData, shadbalaApiData);
    const L1_strength = lagnaLordStrength.total;
    
    // Raw score (for Lagna reduction calculation)
    const lagnaRaw = H1 + L1_strength;
    const lagnaWeak = lagnaRaw <= -1;
    
    // Normalize: Map from [-4, +4] to [0, 4]
    // Formula: clamp((raw1 + 4) × 4/8, 0, 4)
    const lagnaBlockScore = Math.max(0, Math.min(4, Math.round(((lagnaRaw + 4) * 4 / 8) * 10) / 10));
    
    // ========== 3. 6th House & 3rd House Blocks (work environment, service, effort) — max 3 points each ==========
    // 6th Block: 6th house base + placement bonus + 6th lord strength
    let H6 = calculateCareerHouseBase(6, planetsData, ascendantSign);
    
    // Placement bonus for 6th house
    const sixthLord = getHouseLord(6);
    if (sixthLord && planetsData[sixthLord]) {
        const sixthLordHouse = getRelativeHouseNumber(ascendantSign, planetsData[sixthLord].current_sign);
        if (sixthLordHouse === 6 || sixthLordHouse === 10) {
            H6 += 2; // 6L in 6H or 10H: +2
        }
    }
    
    // 6L strength
    const sixthLordStrength = computeLordStrength(6, ascendantSign, planetsData, shadbalaApiData);
    const L6_strength = sixthLordStrength.total;
    
    // Raw score
    const raw6 = H6 + L6_strength;
    
    // Normalize: Map from [-4, +4] to [0, 3]
    // Formula: clamp((raw6 + 4) × 3/8, 0, 3)
    const sixthBlockScore = Math.max(0, Math.min(3, Math.round(((raw6 + 4) * 3 / 8) * 10) / 10));
    
    // 3rd Block: 3rd house base + placement bonus + 3rd lord strength
    let H3 = calculateCareerHouseBase(3, planetsData, ascendantSign);
    
    // Placement bonus for 3rd house
    const thirdLord = getHouseLord(3);
    if (thirdLord && planetsData[thirdLord]) {
        const thirdLordHouse = getRelativeHouseNumber(ascendantSign, planetsData[thirdLord].current_sign);
        if (thirdLordHouse === 3 || thirdLordHouse === 10 || thirdLordHouse === 11) {
            H3 += 1; // 3L in 3H, 10H, or 11H: +1
        }
    }
    
    // 3L strength
    const thirdLordStrength = computeLordStrength(3, ascendantSign, planetsData, shadbalaApiData);
    const L3_strength = thirdLordStrength.total;
    
    // Raw score
    const raw3 = H3 + L3_strength;
    
    // Normalize: Map from [-4, +4] to [0, 3]
    // Formula: clamp((raw3 + 4) × 3/8, 0, 3)
    const thirdBlockScore = Math.max(0, Math.min(3, Math.round(((raw3 + 4) * 3 / 8) * 10) / 10));
    
    // ========== 4. 2nd House & 11th House Blocks (income from work / gains) — max 3 points each ==========
    // 2nd Block: 2nd house base + placement bonus + 2nd lord strength
    let H2 = calculateCareerHouseBase(2, planetsData, ascendantSign);
    
    // Placement bonus for 2nd house
    const secondLord = getHouseLord(2);
    if (secondLord && planetsData[secondLord]) {
        const secondLordHouse = getRelativeHouseNumber(ascendantSign, planetsData[secondLord].current_sign);
        if (secondLordHouse === 2 || secondLordHouse === 11) {
            H2 += 1; // 2L in 2H or 11H: +1
        }
    }
    
    // 2L strength
    const secondLordStrength = computeLordStrength(2, ascendantSign, planetsData, shadbalaApiData);
    const L2_strength = secondLordStrength.total;
    
    // Raw score
    const raw2 = H2 + L2_strength;
    
    // Normalize: Map from [-4, +4] to [0, 3]
    // Formula: clamp((raw2 + 4) × 3/8, 0, 3)
    const secondBlockScore = Math.max(0, Math.min(3, Math.round(((raw2 + 4) * 3 / 8) * 10) / 10));
    
    // 11th Block: 11th house base + placement bonuses + 11th lord strength
    let H11 = calculateCareerHouseBase(11, planetsData, ascendantSign);
    
    // Placement bonuses for 11th house
    const eleventhLord = getHouseLord(11);
    if (eleventhLord && planetsData[eleventhLord]) {
        const eleventhLordHouse = getRelativeHouseNumber(ascendantSign, planetsData[eleventhLord].current_sign);
        if (eleventhLordHouse === 11 || eleventhLordHouse === 10) {
            H11 += 2; // 11L in 11H or 10H: +2
        }
    }
    if (tenthLord && planetsData[tenthLord]) {
        const tenthLordHouse = getRelativeHouseNumber(ascendantSign, planetsData[tenthLord].current_sign);
        if (tenthLordHouse === 11) {
            H11 += 1; // 10L in 11H: +1
        }
    }
    
    // 11L strength
    const eleventhLordStrength = computeLordStrength(11, ascendantSign, planetsData, shadbalaApiData);
    const L11_strength = eleventhLordStrength.total;
    
    // Raw score
    const raw11 = H11 + L11_strength;
    
    // Normalize: Map from [-4, +4] to [0, 3]
    // Formula: clamp((raw11 + 4) × 3/8, 0, 3)
    const eleventhBlockScore = Math.max(0, Math.min(3, Math.round(((raw11 + 4) * 3 / 8) * 10) / 10));
    
    // ========== 5. KarakaBonus (-2 to +3) for Earnings Strength ==========
    // Consider Sun, Saturn, Mercury, Jupiter as career/earnings karakas
    const careerKarakas = ['Sun', 'Saturn', 'Mercury', 'Jupiter'];
    const careerHouses = [2, 6, 10, 11];
    let karakaBonus = 0;
    
    for (const planet of careerKarakas) {
        if (!planetsData[planet]) continue;
        
        const planetInfo = planetsData[planet];
        const planetDignity = calculatePlanetaryDignity(planet, planetInfo);
        const planetShadbala = calculateShadbala(planet, planetInfo, planetsData, ascendantSign, shadbalaApiData);
        const planetHouse = getRelativeHouseNumber(ascendantSign, planetInfo.current_sign);
        const shadbalaValue = planetShadbala ? (planetShadbala.shadbala || planetShadbala.totalShadbala || 0) : 0;
        
        // Check if well placed for money/career
        const hasGoodDignity = planetDignity && !planetDignity.isDebilitated && 
                              (planetDignity.isExalted || planetDignity.isOwnSign || planetDignity.isMoolatrikona || planetDignity.strength >= 60);
        const hasModerateShadbala = shadbalaValue >= 350;
        const isInCareerHouse = careerHouses.includes(planetHouse);
        const isConnected = isInCareerHouse || planetHouse === 1; // Connected to 2/6/10/11 or Lagna
        
        // Check if seriously weak/hurting
        const isDebilitated = planetDignity && planetDignity.isDebilitated;
        const isWeakShadbala = shadbalaValue < 350;
        const countMaleficAspects = (p) => {
            if (!planetsData[p]) return 0;
            const pHouse = getRelativeHouseNumber(ascendantSign, planetsData[p].current_sign);
            let count = 0;
            for (const [otherPlanet, otherInfo] of Object.entries(planetsData)) {
                if (otherPlanet === p || otherPlanet === 'Ascendant' || otherPlanet === 'ayanamsa') continue;
                if (!otherInfo || !otherInfo.current_sign) continue;
                const otherHouse = getRelativeHouseNumber(ascendantSign, otherInfo.current_sign);
                const aspects = ASPECT_PATTERNS.getAspects(otherPlanet, otherHouse, otherInfo.current_sign);
                if (aspects[pHouse] && MALIFIC_PLANETS.includes(otherPlanet)) count++;
            }
            return count;
        };
        const maleficAspectCount = countMaleficAspects(planet);
        const isAfflictingCareerHouses = isInCareerHouse && maleficAspectCount >= 1;
        
        if (hasGoodDignity && hasModerateShadbala && isConnected) {
            // Well placed: +0.5 to +1.0
            if (hasGoodDignity && hasModerateShadbala && isInCareerHouse) {
                karakaBonus += 1.0; // Strong placement
            } else {
                karakaBonus += 0.5; // Moderate placement
            }
        } else if ((isDebilitated || (isWeakShadbala && maleficAspectCount >= 1)) && isAfflictingCareerHouses) {
            // Seriously weak/hurting: -0.5 to -1.0
            if (isDebilitated && isAfflictingCareerHouses) {
                karakaBonus -= 1.0; // Strong negative
            } else {
                karakaBonus -= 0.5; // Moderate negative
            }
        }
    }
    
    // Cap total: positive cap +3, negative cap -2
    karakaBonus = Math.max(-2, Math.min(3, Math.round(karakaBonus * 10) / 10));
    
    // ========== 6. YogaBonus_work (0-2) for Work Strength ==========
    let yogaBonusWork = 0;
    if (yogas && yogas.good) {
        // Check for clear strong career yogas involving 10L, 9L, Lagna, 2L, 11L
        const getHousesRuledBy = (planet) => {
            const houses = [];
            for (let h = 1; h <= 12; h++) {
                if (getHouseLord(h) === planet) houses.push(h);
            }
            return houses;
        };
        
        const isLordReasonablyStrong = (lord) => {
            if (!lord || !planetsData[lord]) return false;
            const dignity = calculatePlanetaryDignity(lord, planetsData[lord]);
            const shadbala = calculateShadbala(lord, planetsData[lord], planetsData, ascendantSign, shadbalaApiData);
            const shadbalaValue = shadbala ? (shadbala.shadbala || shadbala.totalShadbala || 0) : 0;
            const dignityOK = !dignity || !dignity.isDebilitated;
            const shadbalaOK = shadbalaValue >= 350;
            return dignityOK && shadbalaOK;
        };
        
        const yogaInvolvesCareerLords = (yogaKey) => {
            const tenthLord = getHouseLord(10);
            const ninthLord = getHouseLord(9);
            const lagnaLord = getHouseLord(1);
            const secondLord = getHouseLord(2);
            const eleventhLord = getHouseLord(11);
            
            if (yogaKey === 'raj' || yogaKey === 'akhandaSamrajya') {
                // Raj yoga typically involves strong combinations
                return true; // Assume involves career lords if present
            } else if (yogaKey === 'dhana') {
                // Dhana yoga: check if involves 2L/11L
                return isLordReasonablyStrong(secondLord) || isLordReasonablyStrong(eleventhLord);
            } else if (yogaKey === 'amala') {
                // Amala yoga: benefic in 10H
                return true; // Already involves 10H
            } else if (yogaKey === 'panch') {
                // Panch Mahapurush: check if involves career lords
                return isLordReasonablyStrong(tenthLord) || isLordReasonablyStrong(lagnaLord);
            } else if (yogaKey === 'parivartana') {
                // Parivartana: check if involves career house lords
                const careerLords = [tenthLord, ninthLord, lagnaLord, secondLord, eleventhLord];
                for (const lord of careerLords) {
                    if (lord && isLordReasonablyStrong(lord)) {
                        const housesRuled = getHousesRuledBy(lord);
                        const lordHouse = getRelativeHouseNumber(ascendantSign, planetsData[lord].current_sign);
                        // Check if there's mutual exchange with another career lord
                        for (const otherLord of careerLords) {
                            if (lord !== otherLord && otherLord && isLordReasonablyStrong(otherLord)) {
                                const otherHousesRuled = getHousesRuledBy(otherLord);
                                const otherLordHouse = getRelativeHouseNumber(ascendantSign, planetsData[otherLord].current_sign);
                                if (otherHousesRuled.includes(lordHouse) && housesRuled.includes(otherLordHouse)) {
                                    return true; // Mutual exchange found
                                }
                            }
                        }
                    }
                }
            }
            return false;
        };
        
        const rajYoga = yogas.good.find(y => y.key === 'raj');
        const akhandaSamrajya = yogas.good.find(y => y.key === 'akhandaSamrajya');
        const dhanaYoga = yogas.good.find(y => y.key === 'dhana');
        const amalaYoga = yogas.good.find(y => y.key === 'amala');
        const panchYoga = yogas.good.find(y => y.key === 'panch');
        const parivartanaYoga = yogas.good.find(y => y.key === 'parivartana');
        
        // Clear strong career yogas: +2
        if ((rajYoga || akhandaSamrajya) && yogaInvolvesCareerLords('raj')) {
            yogaBonusWork = 2;
        } else if ((dhanaYoga || amalaYoga || panchYoga || parivartanaYoga) && 
                   (yogaInvolvesCareerLords('dhana') || yogaInvolvesCareerLords('amala') || 
                    yogaInvolvesCareerLords('panch') || yogaInvolvesCareerLords('parivartana'))) {
            yogaBonusWork = 2;
        } else if (rajYoga || akhandaSamrajya || dhanaYoga || amalaYoga || panchYoga || parivartanaYoga) {
            // Weaker or single yoga: +1
            yogaBonusWork = 1;
        }
    }
    yogaBonusWork = Math.min(2, yogaBonusWork);
    
    // ========== 7. AspectBonus_work (0-1) for Work Strength ==========
    // Check for multiple benefics strongly aspecting 10H or 10L beyond what's already in LordStrength
    let aspectBonusWork = 0;
    const tenthLordHouse = tenthLord && planetsData[tenthLord] ? 
        getRelativeHouseNumber(ascendantSign, planetsData[tenthLord].current_sign) : null;
    
    let strongBeneficAspectCount = 0;
    for (const planet of BENEFIC_PLANETS) {
        if (!planetsData[planet]) continue;
        const planetInfo = planetsData[planet];
        const planetHouse = getRelativeHouseNumber(ascendantSign, planetInfo.current_sign);
        const planetDignity = calculatePlanetaryDignity(planet, planetInfo);
        const planetShadbala = calculateShadbala(planet, planetInfo, planetsData, ascendantSign, shadbalaApiData);
        const shadbalaValue = planetShadbala ? (planetShadbala.shadbala || planetShadbala.totalShadbala || 0) : 0;
        
        // Check if strongly aspects 10H or 10L
        const aspects = ASPECT_PATTERNS.getAspects(planet, planetHouse, planetInfo.current_sign);
        const aspects10H = aspects[10];
        const aspects10L = tenthLordHouse && aspects[tenthLordHouse];
        
        if ((aspects10H || aspects10L) && 
            (planetDignity && (planetDignity.isExalted || planetDignity.isOwnSign || planetDignity.strength >= 60)) &&
            shadbalaValue >= 480) {
            strongBeneficAspectCount++;
        }
    }
    
    if (strongBeneficAspectCount >= 2) {
        aspectBonusWork = 1; // Multiple strong benefic aspects
    }
    
    // ========== Calculate Work Strength and Earnings Strength ==========
    // Work Strength: Weighted average of blocks (10th, 6th, Lagna, 3rd) + bonuses
    // Formula: 0.4 * (10th/8) * 10 + 0.3 * (6th/3) * 10 + 0.2 * (Lagna/4) * 10 + 0.1 * (3rd/3) * 10 + YogaBonus_work + AspectBonus_work
    const workFromBlocks = 
        (0.4 * (tenthBlockScore / 8) * 10) +
        (0.3 * (sixthBlockScore / 3) * 10) +
        (0.2 * (lagnaBlockScore / 4) * 10) +
        (0.1 * (thirdBlockScore / 3) * 10);
    
    const workStrength = Math.max(0, Math.min(10, workFromBlocks + yogaBonusWork + aspectBonusWork));
    
    // Earnings Strength: Weighted average of blocks (2nd, 11th) + KarakaBonus
    // Formula: 0.4 * (2nd/3) * 10 + 0.6 * (11th/3) * 10 + KarakaBonus
    const earningsFromBlocks = 
        (0.4 * (secondBlockScore / 3) * 10) +
        (0.6 * (eleventhBlockScore / 3) * 10);
    
    const earningsStrength = Math.max(0, Math.min(10, earningsFromBlocks + karakaBonus));
    
    // ========== Overall Career Rating ==========
    let careerRaw = (0.6 * workStrength) + (0.4 * earningsStrength);
    
    // ========== Apply Lagna Reduction if Lagna is weak ==========
    // Use Lagna_raw (H1 + L1_strength) for reduction calculation
    let careerAdj = careerRaw;
    if (lagnaRaw <= -1 && lagnaRaw > -3) {
        careerAdj = careerRaw * 0.85; // -15% reduction
    } else if (lagnaRaw <= -3) {
        careerAdj = careerRaw * 0.75; // -25% reduction
    }
    
    // Normalize to 0-10
    let overallCareer = Math.max(0, Math.min(10, careerAdj));
    
    // Optional sanity floor: If 10L, 2L, 11L all have dignity ≥ neutral and Shadbala ≥ moderate, ensure ≥ 3.5-4.0
    const tenthLordDignity = tenthLord ? calculatePlanetaryDignity(tenthLord, planetsData[tenthLord]) : null;
    const tenthLordShadbala = tenthLord ? calculateShadbala(tenthLord, planetsData[tenthLord], planetsData, ascendantSign, shadbalaApiData) : null;
    const secondLordDignity = secondLord ? calculatePlanetaryDignity(secondLord, planetsData[secondLord]) : null;
    const secondLordShadbala = secondLord ? calculateShadbala(secondLord, planetsData[secondLord], planetsData, ascendantSign, shadbalaApiData) : null;
    const eleventhLordDignity = eleventhLord ? calculatePlanetaryDignity(eleventhLord, planetsData[eleventhLord]) : null;
    const eleventhLordShadbala = eleventhLord ? calculateShadbala(eleventhLord, planetsData[eleventhLord], planetsData, ascendantSign, shadbalaApiData) : null;
    
    const tenthLordOK = !tenthLordDignity || !tenthLordDignity.isDebilitated;
    const tenthLordShadbalaOK = !tenthLordShadbala || (tenthLordShadbala.shadbala || tenthLordShadbala.totalShadbala || 0) >= 350;
    const secondLordOK = !secondLordDignity || !secondLordDignity.isDebilitated;
    const secondLordShadbalaOK = !secondLordShadbala || (secondLordShadbala.shadbala || secondLordShadbala.totalShadbala || 0) >= 350;
    const eleventhLordOK = !eleventhLordDignity || !eleventhLordDignity.isDebilitated;
    const eleventhLordShadbalaOK = !eleventhLordShadbala || (eleventhLordShadbala.shadbala || eleventhLordShadbala.totalShadbala || 0) >= 350;
    
    if (tenthLordOK && tenthLordShadbalaOK && secondLordOK && secondLordShadbalaOK && 
        eleventhLordOK && eleventhLordShadbalaOK) {
        overallCareer = Math.max(overallCareer, 3.5); // Sanity floor
    }
    
    // Get detailed breakdowns for display
    const houseBreakdown = getHouseBreakdown([10, 6, 3, 2, 11, 1], planetsData, ascendantSign);
    const lordBreakdown = getLordBreakdown([10, 6, 3, 2, 11, 1], ascendantSign, planetsData, shadbalaApiData);
    const yogaBreakdown = getYogaBreakdown(yogas, 'career');
    
    // Calculate total raw score (sum of raw scores before normalization)
    const totalRawScore = raw10 + lagnaRaw + raw6 + raw3 + raw2 + raw11;
    
    const factors = {
        tenthBlock: tenthBlockScore,
        lagnaBlock: lagnaBlockScore,
        sixthBlock: sixthBlockScore,
        thirdBlock: thirdBlockScore,
        secondBlock: secondBlockScore,
        eleventhBlock: eleventhBlockScore,
        karakaScore: karakaBonus,
        yogaScore: yogaBonusWork,
        aspectsScore: aspectBonusWork,
        workFromBlocks: workFromBlocks,
        earningsFromBlocks: earningsFromBlocks,
        rawTotal: totalRawScore, // Total raw score for display
        lagnaWeak: lagnaWeak,
        lagnaReduction: lagnaRaw <= -1 ? (lagnaRaw <= -3 ? 0.25 : 0.15) : 0,
        houseBreakdown,
        lordBreakdown,
        yogaBreakdown
    };
    
    return { 
        score: Math.round(overallCareer * 10) / 10,
        workStrength: Math.round(workStrength * 10) / 10,
        earningsStrength: Math.round(earningsStrength * 10) / 10,
        factors 
    };
}

/**
 * Calculate Overall Kundli Score (1-10) - Average of Health, Finance, and Career
 */
function calculateOverallKundliScore(planetsData, ascendantSign, yogas, currentDasha, shadbalaApiData) {
    const healthScore = calculateHealthScore(planetsData, ascendantSign, yogas, currentDasha, shadbalaApiData);
    const financeScore = calculateFinanceScore(planetsData, ascendantSign, yogas, currentDasha, shadbalaApiData);
    const careerScore = calculateCareerScore(planetsData, ascendantSign, yogas, currentDasha, shadbalaApiData);
    
    const overallScore = (healthScore.score + financeScore.score + careerScore.score) / 3;
    const finalOverallScore = Math.max(1, Math.min(10, Math.round(overallScore * 10) / 10));
    
    return {
        overall: finalOverallScore,
        health: healthScore,
        finance: financeScore,
        career: careerScore
    };
}

function setupChatbotUI() {
    const toggle = document.getElementById('chatbotToggle');
    const windowEl = document.getElementById('chatbotWindow');
    const closeBtn = document.getElementById('chatbotClose');
    const form = document.getElementById('chatbotForm');
    const input = document.getElementById('chatbotInput');

    if (!toggle || !windowEl || !form || !input) return;

    const showWindow = () => {
        windowEl.classList.remove('hidden');
        if (!chatbotReady) {
            appendChatbotMessage('bot', 'Generate your birth chart to enable Q&A about your personalised results.', true);
        }
        setTimeout(() => {
            input.focus();
        }, 120);
    };

    const hideWindow = () => {
        windowEl.classList.add('hidden');
    };

    toggle.addEventListener('click', () => {
        if (windowEl.classList.contains('hidden')) {
            showWindow();
        } else {
            hideWindow();
        }
    });

    closeBtn?.addEventListener('click', hideWindow);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const question = input.value.trim();
        if (!question) return false;

        appendChatbotMessage('user', question);
        input.value = '';

        if (!chatbotReady) {
            appendChatbotMessage('bot', 'I can help once you generate your birth chart. Please fill the form and tap Generate.');
            return;
        }

        const thinkingMessage = chatbotLanguage === 'hi' ? 'सोच रहा हूँ…' : 'Thinking…';
        const placeholder = appendChatbotMessage('bot', thinkingMessage, true);

        try {
            const answer = await fetchChatGPTAnswer(question);
            updateChatbotMessage(placeholder, answer);
        } catch (error) {
            console.error('Chatbot error:', error);
            // Try to get a helpful error message
            let errorMsg = error.message || 'An error occurred';
            
            if (errorMsg.includes('429') || errorMsg.includes('Rate limit')) {
                const rateLimitMsg = chatbotLanguage === 'hi' 
                    ? 'अभी बहुत सारे अनुरोध हैं। कृपया कुछ क्षण बाद पुनः प्रयास करें।' 
                    : 'Too many requests right now. Please try again in a moment.';
                updateChatbotMessage(placeholder, rateLimitMsg);
            } else if (errorMsg.includes('Network error') || errorMsg.includes('Cannot reach') || errorMsg.includes('Failed to fetch')) {
                // Network/connection error - use fallback
                const networkErrorMsg = chatbotLanguage === 'hi'
                    ? 'सर्वर से कनेक्ट नहीं हो सका। स्थानीय खोज का उपयोग कर रहे हैं...'
                    : 'Could not connect to server. Using local search...';
                updateChatbotMessage(placeholder, networkErrorMsg);
                setTimeout(() => {
                    const fallback = getChatbotAnswer(question);
                    updateChatbotMessage(placeholder, fallback);
                }, 500);
            } else {
                // Fallback to local search for other errors
                const fallback = getChatbotAnswer(question);
                updateChatbotMessage(placeholder, fallback);
            }
        }
    });
}

function appendChatbotMessage(sender, text, allowDuplicate = false) {
    const messagesEl = document.getElementById('chatbotMessages');
    if (!messagesEl) return null;

    if (!allowDuplicate && messagesEl.lastElementChild && messagesEl.lastElementChild.dataset && messagesEl.lastElementChild.dataset.text === text && messagesEl.lastElementChild.classList.contains(sender)) {
        return messagesEl.lastElementChild;
    }

    const messageEl = document.createElement('div');
    messageEl.className = `chatbot-message ${sender}`;
    messageEl.textContent = text;
    messageEl.dataset.text = text;
    messagesEl.appendChild(messageEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return messageEl;
}

function updateChatbotMessage(messageEl, newText) {
    if (!messageEl) return;
    messageEl.textContent = newText;
    messageEl.dataset.text = newText;
}

function initializeChatbot(language = 'en') {
    const messagesEl = document.getElementById('chatbotMessages');
    if (messagesEl) {
        messagesEl.innerHTML = '';
    }

    chatbotKnowledge = [];
    chatbotLanguage = language || 'en';
    chatbotReady = false;

    const articleContent = document.querySelector('.article-content');
    if (!articleContent) {
        appendChatbotMessage('bot', chatbotLanguage === 'hi'
            ? 'कृपया पहले अपनी जन्म कुंडली बनाएँ।'
            : 'Please generate your birth chart to start chatting.');
        return;
    }

    const headings = articleContent.querySelectorAll('h1, h2, h3, h4');
    headings.forEach((heading) => {
        let pointer = heading.nextElementSibling;
        while (pointer && !['H1', 'H2', 'H3', 'H4'].includes(pointer.tagName)) {
            const text = pointer.innerText ? pointer.innerText.trim() : '';
            if (text && text.length > 40) {
                chatbotKnowledge.push({
                    title: heading.innerText.trim(),
                    content: text,
                    contentLower: text.toLowerCase()
                });
            }
            if (pointer.tagName === 'DIV' && pointer.classList.contains('yoga-card')) {
                const cardHeading = pointer.querySelector('h3');
                const cardText = pointer.innerText.trim();
                if (cardText.length > 40) {
                    chatbotKnowledge.push({
                        title: cardHeading ? cardHeading.innerText.trim() : heading.innerText.trim(),
                        content: cardText,
                        contentLower: cardText.toLowerCase()
                    });
                }
            }
            pointer = pointer.nextElementSibling;
        }
    });

    const fullArticleText = articleContent.innerText.trim();
    if (fullArticleText) {
        chatbotKnowledge.push({
            title: chatbotLanguage === 'hi' ? 'पूर्ण रिपोर्ट' : 'Full Report',
            content: fullArticleText,
            contentLower: fullArticleText.toLowerCase()
        });
    }

    chatbotReady = chatbotKnowledge.length > 0;

    const introMessage = chatbotLanguage === 'hi'
        ? 'नमस्ते! मैं आपके वैदिक जन्म विश्लेषण से उत्तर देता हूँ। किसी भी सेक्शन या योग के बारे में पूछें।'
        : 'Hi! I answer using your Vedic birth analysis. Ask about any section, yoga, or placement.';
    appendChatbotMessage('bot', introMessage, true);
}

function getRelevantKnowledge(question, maxItems = 3) {
    if (!chatbotKnowledge.length) {
        return [];
    }

    const normalizedQuestion = question.toLowerCase();
    const tokens = normalizedQuestion.split(/\W+/).filter(word => word.length > 2);

    const scored = chatbotKnowledge.map(entry => {
        let score = 0;
        tokens.forEach((word) => {
            if (entry.contentLower.includes(word)) {
                score += 1;
            }
            if (entry.title && entry.title.toLowerCase().includes(word)) {
                score += 2;
            }
        });
        if (normalizedQuestion.includes('yoga') && entry.title.toLowerCase().includes('yoga')) {
            score += 2;
        }
        return { entry, score };
    });

    return scored
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxItems)
        .map(item => item.entry);
}

function getChatbotAnswer(question) {
    if (!chatbotKnowledge.length) {
        return chatbotLanguage === 'hi'
            ? 'मैं अभी आपकी रिपोर्ट नहीं पढ़ पा रहा हूँ। कृपया पहले रिपोर्ट तैयार करें।'
            : 'I cannot see your report yet. Please generate it first.';
    }

    const matches = getRelevantKnowledge(question, 1);
    if (matches.length) {
        const bestMatch = matches[0];
        const snippet = bestMatch.content.length > 700 ? bestMatch.content.slice(0, 700) + '…' : bestMatch.content;
        return `${bestMatch.title ? bestMatch.title + ': ' : ''}${snippet}`;
    }

    return chatbotLanguage === 'hi'
        ? 'मुझे इस प्रश्न का उत्तर नहीं मिला। कृपया किसी सेक्शन या योग का नाम लेते हुए दोबारा पूछें।'
        : 'I could not find that in your chart. Try referencing a section or yoga name from your report.';
}

async function fetchChatGPTAnswer(question) {
    const relevant = getRelevantKnowledge(question, 3);
    const payload = {
        question,
        language: chatbotLanguage,
        context: relevant.map(item => ({
            title: item.title,
            content: item.content
        }))
    };

    try {
        console.log('Calling /api/chat with payload:', payload);
        
        let response;
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
        } catch (fetchError) {
            // Handle network errors
            if (fetchError.name === 'AbortError') {
                throw new Error('Request timeout. The server took too long to respond.');
            } else if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
                throw new Error('Network error: Cannot reach the server. The API endpoint may not be deployed.');
            } else {
                throw fetchError;
            }
        }

        console.log('Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ChatGPT API error response:', errorText);
            let errorMessage = `ChatGPT request failed (${response.status})`;
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error) errorMessage = errorData.error;
                if (errorData.details) errorMessage += ': ' + errorData.details;
            } catch (e) {
                // Not JSON, use the text as is
                if (errorText) errorMessage += ': ' + errorText;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('ChatGPT response data:', data);
        
        if (!data || typeof data.answer !== 'string' || !data.answer.trim()) {
            throw new Error('Empty response from ChatGPT backend');
        }

        return data.answer.trim();
    } catch (error) {
        console.error('ChatGPT API error:', error);
        console.warn('Falling back to local search');
        return getChatbotAnswer(question);
    }
}

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
        
        // For headings, always use English text, but translate planet names
        const headingTextsPlanet = {
            inHouse: "in the",
            house: "House"
        };
        const ordinalHousePlanet = getOrdinal(houseNum, 'en'); // Always English ordinal
        
htmlOutput += `
    <div class="ascendant-lord-section ${highlightClass}" style="margin-top: 60px;">
    <h2>
      ${planetName} ${headingTextsPlanet.inHouse} ${ordinalHousePlanet} ${headingTextsPlanet.house} ${badgeHTML}
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

// Function to fetch Shadbala data
async function fetchShadbalaData(apiData) {
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
        
        console.log('Fetching Shadbala data with:', requestBody);
        console.log('API URL:', API_CONFIG.shadbalaUrl);
        
        const headers = {
            'Content-Type': 'application/json',
            'x-api-key': API_CONFIG.key
        };
        
        const response = await fetch(API_CONFIG.shadbalaUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        console.log('Shadbala API response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Shadbala API error response:', errorText);
            
            let errorMessage = errorText;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorText;
            } catch (e) {
                // Not JSON, use as is
            }
            
            throw new Error(`Shadbala API request failed: ${response.status} - ${errorMessage}`);
        }
        
        const data = await response.json();
        console.log('Shadbala data received:', data);
        
        // Return the output data
        if (data && data.output) {
            return data.output;
        }
        
        return data;
    } catch (error) {
        console.error('Error fetching Shadbala data:', error);
        console.error('Error details:', error.message);
        return null;
    }
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

// Function to fetch Dasa Information for a given date
async function fetchDasaInformation(apiData, eventDate) {
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
            },
            event_data: {
                year: eventDate.year,
                month: eventDate.month,
                date: eventDate.date,
                hours: eventDate.hours || 12,
                minutes: eventDate.minutes || 0,
                seconds: eventDate.seconds || 0
            }
        };
        
        console.log('Fetching Dasa Information with:', requestBody);
        console.log('API URL:', API_CONFIG.dasaInformationUrl);
        
        const headers = {
            'Content-Type': 'application/json',
            'x-api-key': API_CONFIG.key
        };
        
        const response = await fetch(API_CONFIG.dasaInformationUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        console.log('Dasa Information API response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Dasa Information API error response:', errorText);
            
            let errorMessage = errorText;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorText;
            } catch (e) {
                // Not JSON, use as is
            }
            
            throw new Error(`Dasa Information API request failed: ${response.status} - ${errorMessage}`);
        }
        
        const data = await response.json();
        console.log('Dasa Information data received:', data);
        
        // Parse the output string if it's a JSON string
        if (data && data.output) {
            if (typeof data.output === 'string') {
                try {
                    const parsedOutput = JSON.parse(data.output);
                    return parsedOutput;
                } catch (e) {
                    console.error('Error parsing Dasa Information output:', e);
                    return data.output; // Return as-is if parsing fails
                }
            }
            // If output is already an object, return it directly
            return data.output;
        }
        
        // If no output field, return the whole response
        return data;
    } catch (error) {
        console.error('Error fetching Dasa Information:', error);
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

// Global storage for tab data and generated content
window.kundliTabData = {
    planetsData: null,
    ascendantSign: null,
    mahaDashaData: null,
    shadbalaApiData: null,
    apiResult: null,
    language: 'en',
    generatedContent: {} // Cache for generated tab content
};

// Generate Tabs Interface for organizing sections (with lazy loading)
function generateTabsInterface(sections, language = 'en') {
    const tabLabels = language === 'hi' ? {
        strengthAssessment: 'कुंडली शक्ति',
        jobTiming: 'नौकरी/करियर',
        money: 'धन/वित्त',
        health: 'स्वास्थ्य',
        relationship: 'संबंध/विवाह',
        yogas: 'योग'
    } : {
        strengthAssessment: 'Chart Strength',
        jobTiming: 'Job/Career',
        money: 'Money/Finance',
        health: 'Health',
        relationship: 'Relationships',
        yogas: 'Yogas'
    };
    
    // Define which tabs should be available based on available data
    const availableTabs = [];
    const tabs = ['strengthAssessment', 'jobTiming', 'money', 'health', 'relationship', 'yogas'];
    
    tabs.forEach(tabKey => {
        // Always show tabs if we have the basic data, even if content not generated yet
        // Don't require mahaDashaData upfront - we'll fetch it on demand
        let shouldShow = false;
        if (tabKey === 'yogas' || tabKey === 'strengthAssessment') {
            shouldShow = window.kundliTabData.planetsData && window.kundliTabData.ascendantSign;
        } else {
            // For tabs requiring mahaDasha, show them if we have basic data (we'll fetch mahaDasha on click)
            shouldShow = window.kundliTabData.planetsData && window.kundliTabData.ascendantSign;
        }
        
        if (shouldShow) {
            availableTabs.push({
                key: tabKey,
                label: tabLabels[tabKey],
                hasContent: !!(sections[tabKey] && sections[tabKey].trim() !== ''),
                preGeneratedContent: sections[tabKey] || ''
            });
        }
    });
    
    if (availableTabs.length === 0) {
        return ''; // No tabs to show
    }
    
    // Generate tab buttons
    const tabButtons = availableTabs.map((tab, index) => {
        const activeClass = index === 0 ? 'active' : '';
        return `
            <button class="tab-button ${activeClass}" data-tab="${tab.key}" type="button" role="tab" aria-selected="${index === 0 ? 'true' : 'false'}" aria-controls="tab-${tab.key}">
                ${tab.label}
            </button>
        `;
    }).join('');
    
    // Generate tab content - only first tab gets content, others are placeholders
    const tabContents = availableTabs.map((tab, index) => {
        const activeClass = index === 0 ? 'active' : '';
        let content = '';
        
        // Only the first tab gets pre-generated content on homepage
        if (index === 0 && tab.hasContent && tab.preGeneratedContent) {
            content = tab.preGeneratedContent;
            // Cache it
            window.kundliTabData.generatedContent[tab.key] = content;
        } else {
            // Empty placeholder that will be loaded on demand when clicked
            content = `
                <div class="tab-loading-placeholder" data-tab-key="${tab.key}">
                    <!-- Content will be loaded when tab is clicked -->
                </div>
            `;
        }
        
        return `
            <div class="tab-content ${activeClass}" id="tab-${tab.key}" role="tabpanel" aria-labelledby="tab-button-${tab.key}">
                ${content}
            </div>
        `;
    }).join('');
    
    return `
    <div class="tabs-container">
        <div class="tabs-header" role="tablist">
            ${tabButtons}
        </div>
        <div class="tabs-body">
            ${tabContents}
        </div>
    </div>
    `;
}

// Load tab content on demand
async function loadTabContent(tabKey) {
    // Check if already generated and cached
    if (window.kundliTabData.generatedContent[tabKey]) {
        return window.kundliTabData.generatedContent[tabKey];
    }
    
    const { planetsData, ascendantSign, shadbalaApiData, language } = window.kundliTabData;
    
    if (!planetsData || !ascendantSign) {
        return '<div style="padding: 20px; color: #f44336;">Error: Required data not available</div>';
    }
    
    let content = '';
    
    try {
        switch(tabKey) {
            case 'strengthAssessment':
                // Fetch Shadbala API only when user clicks on Planetary Strength section
                if (!window.kundliTabData.shadbalaApiData) {
                    const apiDataForRequests = window.kundliTabData.apiDataForRequests;
                    if (apiDataForRequests) {
                        try {
                            window.kundliTabData.shadbalaApiData = await fetchShadbalaData(apiDataForRequests);
                            console.log('Shadbala data fetched on demand:', window.kundliTabData.shadbalaApiData);
                        } catch (error) {
                            console.error('Error fetching Shadbala data:', error);
                        }
                    }
                }
                content = generateStrengthAssessmentSection(planetsData, ascendantSign, language, window.kundliTabData.shadbalaApiData);
                break;
                
            case 'jobTiming':
                // Always try to fetch if not available
                if (!window.kundliTabData.mahaDashaData) {
                    const apiDataForRequests = window.kundliTabData.apiDataForRequests;
                    if (apiDataForRequests) {
                        try {
                            window.kundliTabData.mahaDashaData = await fetchMahaDashaData(apiDataForRequests);
                        } catch (error) {
                            console.error('Error fetching Mahadasha data:', error);
                        }
                    }
                }
                if (window.kundliTabData.mahaDashaData) {
                    content = generateJobTimingSection(planetsData, ascendantSign, window.kundliTabData.mahaDashaData, language, shadbalaApiData);
                } else {
                    content = '<div style="padding: 20px; color: #666;">Mahadasha data not available. Please try again.</div>';
                }
                break;
                
            case 'money':
                // Always try to fetch if not available
                if (!window.kundliTabData.mahaDashaData) {
                    const apiDataForRequests = window.kundliTabData.apiDataForRequests;
                    if (apiDataForRequests) {
                        try {
                            window.kundliTabData.mahaDashaData = await fetchMahaDashaData(apiDataForRequests);
                        } catch (error) {
                            console.error('Error fetching Mahadasha data:', error);
                        }
                    }
                }
                if (window.kundliTabData.mahaDashaData) {
                    // Fetch Shadbala API if not already fetched
                    if (!window.kundliTabData.shadbalaApiData) {
                        const apiDataForRequests = window.kundliTabData.apiDataForRequests;
                        if (apiDataForRequests) {
                            try {
                                window.kundliTabData.shadbalaApiData = await fetchShadbalaData(apiDataForRequests);
                            } catch (error) {
                                console.error('Error fetching Shadbala data:', error);
                            }
                        }
                    }
                    content = generateMoneyPredictionSection(planetsData, ascendantSign, window.kundliTabData.mahaDashaData, language, window.kundliTabData.shadbalaApiData);
                } else {
                    content = '<div style="padding: 20px; color: #666;">Mahadasha data not available. Please try again.</div>';
                }
                break;
                
            case 'health':
                // Always try to fetch if not available
                if (!window.kundliTabData.mahaDashaData) {
                    const apiDataForRequests = window.kundliTabData.apiDataForRequests;
                    if (apiDataForRequests) {
                        try {
                            window.kundliTabData.mahaDashaData = await fetchMahaDashaData(apiDataForRequests);
                        } catch (error) {
                            console.error('Error fetching Mahadasha data:', error);
                        }
                    }
                }
                if (window.kundliTabData.mahaDashaData) {
                    // Fetch Shadbala API if not already fetched
                    if (!window.kundliTabData.shadbalaApiData) {
                        const apiDataForRequests = window.kundliTabData.apiDataForRequests;
                        if (apiDataForRequests) {
                            try {
                                window.kundliTabData.shadbalaApiData = await fetchShadbalaData(apiDataForRequests);
                            } catch (error) {
                                console.error('Error fetching Shadbala data:', error);
                            }
                            }
                    }
                    content = generateHealthPredictionSection(planetsData, ascendantSign, window.kundliTabData.mahaDashaData, language, window.kundliTabData.shadbalaApiData);
                } else {
                    content = '<div style="padding: 20px; color: #666;">Mahadasha data not available. Please try again.</div>';
                }
                break;
                
            case 'relationship':
                // Always try to fetch if not available
                if (!window.kundliTabData.mahaDashaData) {
                    const apiDataForRequests = window.kundliTabData.apiDataForRequests;
                    if (apiDataForRequests) {
                        try {
                            window.kundliTabData.mahaDashaData = await fetchMahaDashaData(apiDataForRequests);
                        } catch (error) {
                            console.error('Error fetching Mahadasha data:', error);
                        }
                    }
                }
                if (window.kundliTabData.mahaDashaData) {
                    // Fetch Shadbala API if not already fetched
                    if (!window.kundliTabData.shadbalaApiData) {
                        const apiDataForRequests = window.kundliTabData.apiDataForRequests;
                        if (apiDataForRequests) {
                            try {
                                window.kundliTabData.shadbalaApiData = await fetchShadbalaData(apiDataForRequests);
                            } catch (error) {
                                console.error('Error fetching Shadbala data:', error);
                            }
                        }
                    }
                    content = generateRelationshipPredictionSection(planetsData, ascendantSign, window.kundliTabData.mahaDashaData, language, window.kundliTabData.shadbalaApiData);
                } else {
                    content = '<div style="padding: 20px; color: #666;">Mahadasha data not available. Please try again.</div>';
                }
                break;
                
            case 'yogas':
                const yogaResults = computeYogas(planetsData, ascendantSign);
                content = generateYogaSection(yogaResults, language);
                break;
                
            case 'dasaPredictions':
                // Fetch Shadbala API if not already fetched
                if (!window.kundliTabData.shadbalaApiData) {
                    const apiDataForRequests = window.kundliTabData.apiDataForRequests;
                    if (apiDataForRequests) {
                        try {
                            window.kundliTabData.shadbalaApiData = await fetchShadbalaData(apiDataForRequests);
                        } catch (error) {
                            console.error('Error fetching Shadbala data:', error);
                        }
                    }
                }
                content = generateDasaPredictionsSection(planetsData, ascendantSign, language, window.kundliTabData.shadbalaApiData);
                break;
                
            default:
                content = '<div style="padding: 20px; color: #666;">Unknown tab</div>';
        }
        
        // Cache the generated content
        if (content) {
            window.kundliTabData.generatedContent[tabKey] = content;
        }
        
        return content || '<div style="padding: 20px; color: #666;">No content available</div>';
    } catch (error) {
        console.error(`Error loading tab ${tabKey}:`, error);
        return `<div style="padding: 20px; color: #f44336;">Error loading content: ${error.message}</div>`;
    }
}

// Make loadTabContent globally accessible
window.loadTabContent = loadTabContent;

// Function to generate article-style HTML for same-page display
function generateArticleHTML(fullName, birthDate, formattedDate, timeOfBirth, placeOfBirth, apiResult, language = 'en', currentDasha = null, mahaDashaData = null, shadbalaApiData = null) {
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
    let planetsData = null;
    let ascendantSign = null;
    
    if (apiResult.output && Array.isArray(apiResult.output) && apiResult.output.length > 1) {
        planetsData = apiResult.output[1];
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
                
                // For headings, always use English text, but translate planet names
                const headingTexts = {
                    houseLord: "House Lord",
                    inHouse: "in",
                    house: "House"
                };
                const ordinalLord = getOrdinal(lordObj.houseLordNum, 'en'); // Always English ordinal
                const ordinalHouse = getOrdinal(lordObj.house, 'en'); // Always English ordinal
                
                houseLordsHTML += `
                <div class="ascendant-lord-section ${highlightClass}" style="margin-top: 60px;">
<h2>${ordinalLord} ${headingTexts.houseLord} (${translatedPlanetName}) ${headingTexts.inHouse} ${ordinalHouse} ${headingTexts.house} ${highlightNote}</h2>
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

    const yogaResults = ascendantSign ? computeYogas(planetsData, ascendantSign) : { good: [], bad: [] };
    const yogaSection = generateYogaSection(yogaResults, language);
    
    // Calculate Kundli Scores
    const kundliScores = ascendantSign && planetsData 
        ? calculateOverallKundliScore(planetsData, ascendantSign, yogaResults, currentDasha, shadbalaApiData)
        : null;
    
    // Don't generate these sections here - they will be loaded on demand when user clicks
    // All prediction sections will be loaded lazily when user clicks on them
    const strengthAssessmentSection = ''; // Will be loaded when user clicks "Planetary Strength"
    const jobTimingSection = ''; // Will be loaded when user clicks "Job Timing"
    const moneyPredictionSection = ''; // Will be loaded when user clicks "Money"
    const healthPredictionSection = ''; // Will be loaded when user clicks "Health"
    const relationshipPredictionSection = ''; // Will be loaded when user clicks "Relationships"

    // Generate sidebar navigation
    const sidebarNav = generateSidebarNavigation(language, {
        hasStrength: !!strengthAssessmentSection,
        hasJobTiming: !!jobTimingSection,
        hasMoney: !!moneyPredictionSection,
        hasHealth: !!healthPredictionSection,
        hasRelationship: !!relationshipPredictionSection,
        hasYogas: !!yogaSection
    });
    
    // ------------ RENDER THE HTML WITH TABS ------------
   return `
    ${sidebarNav}
    <div id="fixed-buttons-container" style="position: fixed; top: 80px; right: 20px; z-index: 1000; display: flex; gap: 10px; align-items: center;">
        <button onclick="goBackToForm()" class="back-button">${texts.backButton}</button>
        <button onclick="downloadKundliPDF()" class="download-pdf-btn" id="download-pdf-btn" style="background: #2196F3; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.3s ease;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            ${language === 'hi' ? 'PDF डाउनलोड करें' : 'Download PDF'}
        </button>
    </div>
    <div class="article-main-content">
    <div class="article-content">
        <div class="article-header-fixed article-section" id="article-header">
            <h1>${texts.title}</h1>
            <div class="article-meta">${texts.subtitle}</div>
        </div>
                <!-- Birth Details Tab (Default Active) -->
                <div class="kundli-tab-content active" data-tab="birth-details" id="tab-birth-details">
            <div class="article-intro article-section" id="article-intro">
                <p>${texts.intro}</p>
            </div>
                    <div class="birth-details-box article-section">
                <h2>${texts.birthInfo}</h2>
                <p><strong>${texts.name}:</strong> ${fullName}</p>
                <p><strong>${texts.date}:</strong> ${formattedDate}</p>
                ${timeOfBirth ? `<p><strong>${texts.time}:</strong> ${timeOfBirth}</p>` : ''}
                <p><strong>${texts.location}:</strong> ${placeOfBirth}</p>
            </div>
                    <div class="planets-section article-section" style="margin: 40px 0;">
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
                </div>
                
                <!-- House Lords Tab -->
                <div class="kundli-tab-content" data-tab="house-lords" id="tab-house-lords">
                    <div class="planets-section article-section">
                <h2>${texts.houseLordInHouses}</h2>
                ${houseLordsHTML}
            </div>
                </div>
                
                <!-- House Effects Tab -->
                <div class="kundli-tab-content" data-tab="house-effects" id="tab-house-effects">
                    <div class="planets-section article-section">
                <h2>${texts.planetaryHouseEffects}</h2>
                ${planetsHouseEffectsHTML}
            </div>
            </div>
                
                <!-- Dynamic tabs (loaded on demand) -->
                <div class="kundli-tab-content" data-tab="chart-strength" id="tab-chart-strength">
                    <div id="dynamic-content-strength" class="dynamic-content-area"></div>
                </div>
                <div class="kundli-tab-content" data-tab="job-timing" id="tab-job-timing">
                    <div id="dynamic-content-job" class="dynamic-content-area"></div>
                </div>
                <div class="kundli-tab-content" data-tab="money-prediction" id="tab-money-prediction">
                    <div id="dynamic-content-money" class="dynamic-content-area"></div>
                </div>
                <div class="kundli-tab-content" data-tab="health-prediction" id="tab-health-prediction">
                    <div id="dynamic-content-health" class="dynamic-content-area"></div>
                </div>
                <div class="kundli-tab-content" data-tab="relationship-prediction" id="tab-relationship-prediction">
                    <div id="dynamic-content-relationship" class="dynamic-content-area"></div>
                </div>
                <div class="kundli-tab-content" data-tab="yogas" id="tab-yogas">
                    <div id="dynamic-content-yogas" class="dynamic-content-area"></div>
                </div>
                <div class="kundli-tab-content" data-tab="dasa-predictions" id="tab-dasa-predictions">
                    <div id="dynamic-content-dasa" class="dynamic-content-area"></div>
                </div>
    </div>
    `;

}

// Generate sidebar navigation HTML
function generateSidebarNavigation(language, sections) {
    const texts = {
        en: {
            nav: 'Navigation',
            birthDetails: 'Birth Details',
            planetaryPositions: 'Planetary Positions',
            houseLords: 'House Lords',
            houseEffects: 'Planetary House Effects',
            strength: 'Planetary Strength',
            predictions: 'Predictions',
            jobTiming: 'Job/Career',
            money: 'Money/Finance',
            health: 'Health',
            relationships: 'Relationships',
            yogas: 'Yogas',
            dasaPredictions: 'Dasa Predictions'
        },
        hi: {
            nav: 'नेविगेशन',
            birthDetails: 'जन्म विवरण',
            planetaryPositions: 'ग्रह स्थिति',
            houseLords: 'भाव स्वामी',
            houseEffects: 'ग्रह भाव प्रभाव',
            strength: 'ग्रह शक्ति',
            predictions: 'भविष्यवाणी',
            jobTiming: 'नौकरी/करियर',
            money: 'धन/वित्त',
            health: 'स्वास्थ्य',
            relationships: 'रिश्ते',
            yogas: 'योग',
            dasaPredictions: 'दशा भविष्यवाणी'
        }
    };
    
    const t = texts[language] || texts.en;
    
    // Always show all navigation items (similar to main nav)
    let navItems = `
        <li class="sidebar-nav-item">
            <a href="#article-header" class="sidebar-nav-link" data-section="article-header">${language === 'hi' ? 'कुंडली परिचय' : 'Chart Introduction'}</a>
        </li>
        <li class="sidebar-nav-item">
            <a href="#birth-details" class="sidebar-nav-link" data-section="birth-details">${t.birthDetails}</a>
        </li>
        <li class="sidebar-nav-item">
            <a href="#house-lords" class="sidebar-nav-link" data-section="house-lords">${t.houseLords}</a>
        </li>
        <li class="sidebar-nav-item">
            <a href="#house-effects" class="sidebar-nav-link" data-section="house-effects">${t.houseEffects}</a>
        </li>
        <li class="sidebar-nav-item">
            <a href="#chart-strength" class="sidebar-nav-link" data-section="chart-strength" data-tab="strengthAssessment">${t.strength}</a>
        </li>
        <li class="sidebar-nav-item">
            <a href="#job-timing" class="sidebar-nav-link" data-section="job-timing" data-tab="jobTiming">${t.jobTiming}</a>
        </li>
        <li class="sidebar-nav-item">
            <a href="#money-prediction" class="sidebar-nav-link" data-section="money-prediction" data-tab="money">${t.money}</a>
        </li>
        <li class="sidebar-nav-item">
            <a href="#health-prediction" class="sidebar-nav-link" data-section="health-prediction" data-tab="health">${t.health}</a>
        </li>
        <li class="sidebar-nav-item">
            <a href="#relationship-prediction" class="sidebar-nav-link" data-section="relationship-prediction" data-tab="relationship">${t.relationships}</a>
        </li>
        <li class="sidebar-nav-item">
            <a href="#yogas" class="sidebar-nav-link" data-section="yogas" data-tab="yogas">${t.yogas}</a>
        </li>
        <li class="sidebar-nav-item">
            <a href="#dasa-predictions" class="sidebar-nav-link" data-section="dasa-predictions" data-tab="dasaPredictions">${t.dasaPredictions || 'Dasa Predictions'}</a>
        </li>
    `;
    
    return `
        <button id="sidebarToggle" class="sidebar-toggle active" aria-label="Toggle sidebar">☰</button>
        <aside id="articleSidebar" class="article-sidebar">
            <ul class="sidebar-nav">
                ${navItems}
            </ul>
        </aside>
    `;
}

// Global function to go back to form
// Download Kundli PDF (excluding dasha predictions)
window.downloadKundliPDF = function() {
    try {
        // Helper function to check if html2pdf is available
        const checkHtml2Pdf = () => {
            // Try multiple ways to access html2pdf
            if (typeof html2pdf !== 'undefined' && typeof html2pdf === 'function') {
                return html2pdf;
            }
            if (typeof window.html2pdf !== 'undefined' && typeof window.html2pdf === 'function') {
                return window.html2pdf;
            }
            if (window.html2pdf && typeof window.html2pdf === 'function') {
                return window.html2pdf;
            }
            // Check if html2pdf is available as an object with a default export
            if (typeof html2pdf !== 'undefined' && html2pdf && typeof html2pdf.default === 'function') {
                return html2pdf.default;
            }
            if (window.html2pdf && window.html2pdf.default && typeof window.html2pdf.default === 'function') {
                return window.html2pdf.default;
            }
            return null;
        };
        
        // Check if html2pdf is available
        let html2pdfLib = checkHtml2Pdf();
        
        // If still not found, wait a bit and try again (library might still be loading)
        if (!html2pdfLib) {
            // Show loading message
            const downloadBtn = document.querySelector('.download-pdf-btn');
            const originalBtnText = downloadBtn?.innerHTML;
            if (downloadBtn) {
                downloadBtn.disabled = true;
                downloadBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Loading PDF library...';
            }
            
            // Check if script tag exists
            const scriptTag = document.querySelector('script[src*="html2pdf"]');
            if (!scriptTag) {
                // Script tag not found, try to load it dynamically
                const newScript = document.createElement('script');
                newScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                newScript.crossOrigin = 'anonymous';
                newScript.referrerPolicy = 'no-referrer';
                newScript.integrity = 'sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd41JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVidA0PhObZvyo82iQ==';
                newScript.onload = () => {
                    html2pdfLib = checkHtml2Pdf();
                    if (html2pdfLib) {
                        if (downloadBtn && originalBtnText) {
                            downloadBtn.innerHTML = originalBtnText;
                        }
                        proceedWithDownload(html2pdfLib);
                    } else {
                        if (downloadBtn && originalBtnText) {
                            downloadBtn.disabled = false;
                            downloadBtn.innerHTML = originalBtnText;
                        }
                        alert('PDF library loaded but not accessible. Please refresh the page and try again.');
                    }
                };
                newScript.onerror = () => {
                    if (downloadBtn && originalBtnText) {
                        downloadBtn.disabled = false;
                        downloadBtn.innerHTML = originalBtnText;
                    }
                    alert('Failed to load PDF library. Please check your internet connection and refresh the page.');
                };
                document.head.appendChild(newScript);
                return;
            }
            
            // Wait for library to load (check every 100ms for up to 5 seconds)
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds total
            const checkLibrary = () => {
                html2pdfLib = checkHtml2Pdf();
                
                if (html2pdfLib) {
                    // Library loaded, proceed with download
                    if (downloadBtn && originalBtnText) {
                        downloadBtn.innerHTML = originalBtnText;
                    }
                    proceedWithDownload(html2pdfLib);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkLibrary, 100);
                } else {
                    // Restore button
                    if (downloadBtn && originalBtnText) {
                        downloadBtn.disabled = false;
                        downloadBtn.innerHTML = originalBtnText;
                    }
                    // Check if script tag is loaded
                    const scriptTag = document.querySelector('script[src*="html2pdf"]');
                    if (scriptTag && scriptTag.readyState === 'complete') {
                        alert('PDF library script loaded but library not accessible. Please refresh the page and try again.');
                    } else {
                        alert('PDF library not loaded. Please refresh the page and try again. If the problem persists, check your internet connection.');
                    }
                }
            };
            checkLibrary();
            return;
        }
        
        // Library is available, proceed
        proceedWithDownload(html2pdfLib);
        
    } catch (error) {
        console.error('PDF download error:', error);
        alert('Error downloading PDF. Please ensure html2pdf library is loaded. Error: ' + error.message);
        const downloadBtn = document.querySelector('.download-pdf-btn');
        if (downloadBtn) {
            downloadBtn.disabled = false;
        }
    }
};

// Separate function to handle the actual PDF generation
function proceedWithDownload(html2pdfLib) {
    try {
        
        // Get the main article content
        const articleContent = document.querySelector('.article-main-content');
        if (!articleContent) {
            alert('Content not found. Please ensure the Kundli is displayed.');
            return;
        }
        
        // Show loading message
        const originalBtnText = document.querySelector('.download-pdf-btn')?.innerHTML;
        const downloadBtn = document.querySelector('.download-pdf-btn');
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Generating PDF...';
        }
        
        // Clone the content to avoid modifying the original
        const contentClone = articleContent.cloneNode(true);
        
        // Remove prediction sections (health, money, relationship predictions)
        const predictionSections = contentClone.querySelectorAll(
            '#health-prediction, #money-prediction, #relationship-prediction, ' +
            '#tab-health-prediction, #tab-money-prediction, #tab-relationship-prediction, ' +
            '.prediction-section, [id*="prediction"]'
        );
        predictionSections.forEach(section => {
            section.remove();
        });
        
        // Remove sidebar navigation
        const sidebar = contentClone.querySelector('.sidebar-nav');
        if (sidebar) sidebar.remove();
        
        // Remove back button
        const backButton = contentClone.querySelector('.back-button');
        if (backButton) backButton.remove();
        
        // Remove tab navigation if present
        const tabNav = contentClone.querySelector('.kundli-tabs-container');
        if (tabNav) tabNav.remove();
        
        // Remove download button itself
        const downloadBtnClone = contentClone.querySelector('.download-pdf-btn');
        if (downloadBtnClone) downloadBtnClone.remove();
        
        // Show all tab contents (remove tab restrictions)
        const tabContents = contentClone.querySelectorAll('.kundli-tab-content');
        tabContents.forEach(tab => {
            tab.classList.remove('kundli-tab-content');
            tab.style.display = 'block';
            tab.style.visibility = 'visible';
            tab.style.opacity = '1';
        });
        
        // Remove any hidden elements
        const hiddenElements = contentClone.querySelectorAll('[style*="display: none"], .hidden');
        hiddenElements.forEach(el => {
            if (el.classList.contains('hidden')) {
                el.classList.remove('hidden');
            }
        });
        
        // Create a temporary container for PDF generation
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '210mm'; // A4 width
        tempContainer.style.background = 'white';
        tempContainer.style.padding = '20px';
        tempContainer.appendChild(contentClone);
        document.body.appendChild(tempContainer);
        
        // Get user's name for filename
        const nameElement = document.querySelector('.birth-details-box p strong');
        let userName = 'Kundli';
        if (nameElement && nameElement.nextSibling) {
            userName = nameElement.nextSibling.textContent.trim();
        }
        const fileName = `${userName.replace(/[^a-zA-Z0-9]/g, '_')}_Kundli_Report.pdf`;
        
        // Configure PDF options
        const opt = {
            margin: [10, 10, 10, 10],
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true,
                backgroundColor: '#ffffff'
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait',
                compress: true
            },
            pagebreak: { 
                mode: ['avoid-all', 'css', 'legacy'],
                before: '.article-section',
                after: '.article-section'
            }
        };
        
        // Generate and download PDF
        html2pdfLib().set(opt).from(tempContainer).save().then(() => {
            // Clean up temporary container
            if (tempContainer.parentNode) {
                document.body.removeChild(tempContainer);
            }
            // Restore button
            if (downloadBtn && originalBtnText) {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = originalBtnText;
            }
        }).catch((error) => {
            console.error('PDF generation error:', error);
            alert('Error generating PDF. Please try again.');
            if (tempContainer.parentNode) {
                document.body.removeChild(tempContainer);
            }
            // Restore button
            if (downloadBtn && originalBtnText) {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = originalBtnText;
            }
        });
        
    } catch (error) {
        console.error('PDF download error:', error);
        alert('Error downloading PDF. Please ensure html2pdf library is loaded.');
        const downloadBtn = document.querySelector('.download-pdf-btn');
        if (downloadBtn) {
            downloadBtn.disabled = false;
        }
    }
};

// Setup download button visibility based on active tab
function setupDownloadButtonVisibility() {
    const downloadBtn = document.getElementById('download-pdf-btn');
    if (!downloadBtn) return;
    
    // Check if birth-details tab is active
    const birthDetailsTab = document.getElementById('tab-birth-details');
    const isBirthDetailsActive = birthDetailsTab && birthDetailsTab.classList.contains('active');
    
    // Show button only when birth-details tab is active
    if (isBirthDetailsActive) {
        downloadBtn.style.display = 'flex';
    } else {
        downloadBtn.style.display = 'none';
    }
}

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

// Sample report data generator
function generateSampleReport() {
    // Sample data - realistic birth chart data
    // Signs: 1=Aries, 2=Taurus, 3=Gemini, 4=Cancer, 5=Leo, 6=Virgo, 7=Libra, 8=Scorpio, 9=Sagittarius, 10=Capricorn, 11=Aquarius, 12=Pisces
    // Leo Ascendant (sign 5)
    const ascendantSignNum = 5; // Leo
    
    const sampleApiResult = {
        output: [
            {
                // Chart SVG data (simplified)
                chart_svg: '<svg>Sample Chart</svg>'
            },
            {
                // Planetary positions - Leo Ascendant (sign 5)
                // current_sign should be 1-12 (sign number, not name)
                // normDegree is the degree in the sign
                // isRetro should be true/false or 'true'/'false'
                Ascendant: { current_sign: ascendantSignNum, current_sign_num: ascendantSignNum - 1, normDegree: 12.5 },
                Sun: { current_sign: 1, current_sign_num: 0, normDegree: 15.5, isRetro: false }, // Aries in 5th house
                Moon: { current_sign: 3, current_sign_num: 2, normDegree: 22.3, isRetro: false }, // Gemini in 7th house
                Mars: { current_sign: 8, current_sign_num: 7, normDegree: 8.7, isRetro: false }, // Scorpio in 12th house
                Mercury: { current_sign: 12, current_sign_num: 11, normDegree: 18.9, isRetro: false }, // Pisces in 4th house
                Jupiter: { current_sign: 4, current_sign_num: 3, normDegree: 12.4, isRetro: false }, // Cancer in 6th house
                Venus: { current_sign: 11, current_sign_num: 10, normDegree: 25.1, isRetro: false }, // Aquarius in 3rd house
                Saturn: { current_sign: 7, current_sign_num: 6, normDegree: 9.8, isRetro: false }, // Libra in 9th house
                Rahu: { current_sign: 2, current_sign_num: 1, normDegree: 14.2, isRetro: false }, // Taurus in 6th house
                Ketu: { current_sign: 8, current_sign_num: 7, normDegree: 14.2, isRetro: false }, // Scorpio in 12th house
                ayanamsa: 23.85
            },
            {
                // Dasha data
                current_dasha: {
                    major: { planet: 'Jupiter', start_date: '2020-01-15', end_date: '2036-01-15' },
                    minor: { planet: 'Mercury', start_date: '2024-11-01', end_date: '2027-11-01' },
                    sub: { planet: 'Venus', start_date: '2025-10-15', end_date: '2026-08-15' }
                }
            }
        ]
    };
    
    return sampleApiResult;
}

function showSampleReport() {
    const sampleData = generateSampleReport();
    const sampleName = 'Sample User';
    const sampleDate = '1990-05-15';
    const sampleTime = '10:30';
    const samplePlace = 'Mumbai, Maharashtra, India';
    const language = 'en';
    
    // Format date
    const dateObj = new Date(sampleDate + 'T' + sampleTime + ':00');
    const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'Asia/Kolkata'
    });
    
    // Create currentDasha object in the format expected by the code
    const currentDasha = {
        mahaDasha: 'Jupiter',
        antarDasha: 'Mercury',
        startTime: '2024-11-01 00:00:00',
        endTime: '2027-11-01 00:00:00'
    };
    
    // Generate article HTML (sample report doesn't have mahaDashaData for job timing)
    const articleHTML = generateArticleHTML(
        sampleName,
        sampleDate,
        formattedDate,
        sampleTime,
        samplePlace,
        sampleData,
        language,
        currentDasha,
        null  // No mahaDashaData available for sample report
    );
    
    // Hide main container and show article view
    const mainContainer = document.getElementById('mainContainer');
    const articleView = document.getElementById('articleView');
    const articleContent = document.getElementById('articleContent');
    
    mainContainer.classList.add('hidden');
    
    // Add sample report banner - will be inserted into the first tab
    const sampleBanner = `
        <div class="sample-report-banner" style="background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); padding: 15px 20px; margin: 0 auto 30px auto; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 1200px; width: 100%; box-sizing: border-box;">
            <strong style="color: #8b5a00; font-size: 16px;">📊 Sample Report</strong>
            <p style="color: #6b4a00; margin: 8px 0 0 0; font-size: 14px;">This is a sample Kundli analysis. Enter your birth details to generate your personalized report.</p>
        </div>
    `;
    
    articleContent.innerHTML = articleHTML;
    
    // Insert sample banner into the birth-details tab after it's rendered
    setTimeout(() => {
        const birthDetailsTab = document.getElementById('tab-birth-details');
        if (birthDetailsTab) {
            const intro = birthDetailsTab.querySelector('.article-intro');
            if (intro) {
                intro.insertAdjacentHTML('beforebegin', sampleBanner);
            } else {
                birthDetailsTab.insertAdjacentHTML('afterbegin', sampleBanner);
            }
        }
    }, 50);
    articleView.classList.remove('hidden');
    articleView.classList.add('active');
    
    // Store sample data in global kundliTabData for tab system
    if (sampleData.output && Array.isArray(sampleData.output) && sampleData.output.length > 1) {
        window.kundliTabData = {
            planetsData: sampleData.output[1],
            ascendantSign: sampleData.output[1]?.Ascendant?.current_sign || null,
            mahaDashaData: null, // Sample report doesn't have mahaDashaData
            shadbalaApiData: null, // Sample report doesn't have shadbalaApiData
            apiResult: sampleData,
            apiDataForRequests: null, // Sample report doesn't need API requests
            language: language,
            generatedContent: {},
            currentDasha: currentDasha
        };
    }
    
            // Initialize tabs and sidebar after content is loaded
            setTimeout(() => {
                if (typeof window.reinitializeTabs === 'function') {
                    window.reinitializeTabs();
                }
                if (typeof window.reinitializeSidebar === 'function') {
                    window.reinitializeSidebar();
                }
                
                // Setup download button visibility based on active tab
                setupDownloadButtonVisibility();
                
                // Monitor tab changes
                const observer = new MutationObserver(() => {
                    setupDownloadButtonVisibility();
                });
                const tabContainer = document.querySelector('.kundli-tabs-container') || document.querySelector('.article-content');
                if (tabContainer) {
                    observer.observe(tabContainer, { attributes: true, attributeFilter: ['class'], subtree: true });
                }
                
                // Also listen for tab button clicks
                document.querySelectorAll('[data-tab]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        setTimeout(setupDownloadButtonVisibility, 100);
                    });
                });
                
                // Wait a bit more for sidebar to fully initialize, then set default tab
                setTimeout(() => {
                    // Verify tabs exist in DOM
                    const allTabs = document.querySelectorAll('.kundli-tab-content');
                    console.log('Sample report - Found tabs:', allTabs.length);
                    allTabs.forEach(tab => {
                        console.log('Tab ID:', tab.id, 'Active:', tab.classList.contains('active'));
                    });
                    
                    // Set default tab to birth-details and scroll to top
                    if (typeof window.switchKundliTab === 'function') {
                        console.log('Calling switchKundliTab for sample report');
                        window.switchKundliTab('birth-details');
                    } else {
                        console.log('switchKundliTab not available, using fallback');
                        // Fallback: manually show birth-details tab if function not available
                        allTabs.forEach(tab => tab.classList.remove('active'));
                        const birthTab = document.getElementById('tab-birth-details');
                        if (birthTab) {
                            birthTab.classList.add('active');
                            console.log('Birth details tab activated via fallback');
                        } else {
                            console.error('Birth details tab not found!');
                        }
                    }
                    setupDownloadButtonVisibility();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 300);
            }, 100);
            
            // Initialize chatbot
            initializeChatbot(language);
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('kundliForm');
    const loadingMessage = document.getElementById('loadingMessage');
    const result = document.getElementById('result');
    const resultContent = document.querySelector('.result-content');

    setupChatbotUI();
    
    // Sample report button
    const viewSampleBtn = document.getElementById('viewSampleBtn');
    if (viewSampleBtn) {
        viewSampleBtn.addEventListener('click', showSampleReport);
    }
    
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
            let response;
            try {
                response = await fetch(API_CONFIG.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': API_CONFIG.key
                    },
                    body: JSON.stringify(apiData)
                });
            } catch (fetchError) {
                // Handle network errors (connection issues, CORS, etc.)
                console.error('Network error fetching from API:', fetchError);
                if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
                    throw new Error('Network error: Unable to connect to the API. Please check your internet connection and try again.');
                } else if (fetchError.message.includes('CORS')) {
                    throw new Error('CORS error: The API server is not allowing requests from this domain. Please contact the administrator.');
                } else {
                    throw new Error(`Network error: ${fetchError.message}`);
                }
            }
            
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                let errorText = '';
                try {
                    errorText = await response.text();
                    console.error('API error response:', errorText);
                } catch (textError) {
                    console.error('Could not read error response text:', textError);
                }
                
                console.error('API error status:', response.status, response.statusText);
                
                let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
                
                // Try to parse error response for more details
                if (errorText && errorText.trim()) {
                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.message) {
                            errorMessage = errorData.message;
                        } else if (errorData.error) {
                            errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
                        } else if (errorData.statusCode) {
                            errorMessage = `API Error ${errorData.statusCode}: ${errorData.message || errorText}`;
                        } else if (errorData.statusMessage) {
                            errorMessage = `API Error: ${errorData.statusMessage}`;
                        }
                    } catch (e) {
                        // If error response is not JSON, use the text
                        const trimmedError = errorText.trim();
                        if (trimmedError) {
                            errorMessage += ` - ${trimmedError.substring(0, 200)}`;
                        }
                    }
                }
                
                // Add helpful messages for common status codes
                if (response.status === 401 || response.status === 403) {
                    errorMessage += ' Please check if your API key is valid and has the necessary permissions.';
                } else if (response.status === 429) {
                    errorMessage += ' Too many requests. Please try again in a few moments.';
                } else if (response.status === 400) {
                    errorMessage += ' Invalid request. Please check your birth details (date, time, location).';
                } else if (response.status >= 500) {
                    errorMessage += ' Server error. The API service may be temporarily unavailable. Please try again later.';
                }
                
                throw new Error(errorMessage);
            }
            
            const apiResult = await response.json();
            
            // Log the full response for debugging
            console.log('Full API Response:', apiResult);
            console.log('Response keys:', Object.keys(apiResult));
            
            // Store user submission data in Firestore
            // This happens asynchronously and won't block the UI
            const fullName = document.getElementById('fullName').value;
            const language = document.getElementById('language').value || 'en';
            
            const formDataForStorage = {
                fullName: fullName,
                dateOfBirth: dateOfBirth,
                timeOfBirth: timeOfBirth || '00:00',
                placeOfBirth: placeOfBirth,
                language: language,
                latitude: latitude,
                longitude: longitude
            };
            
            // Store data (completely non-blocking - runs in background, never fails user experience)
            storeUserSubmission(formDataForStorage, apiResult)
                .then(result => {
                    if (result.success) {
                        if (result.isDuplicate) {
                            console.log('ℹ️ Duplicate entry detected:', result.message);
                        } else if (result.queued) {
                            console.log('📦', result.message);
                        } else {
                            console.log('✅', result.message, '- Key:', result.uniqueKey);
                        }
                    } else {
                        // Only log if not silent (permission errors are important)
                        if (!result.silent) {
                            console.warn('⚠️ Storage issue:', result.message);
                        } else {
                            // Silent failures - don't log to avoid console spam
                            // console.log('Storage unavailable (silent)');
                        }
                    }
                })
                .catch(error => {
                    // Catch any unexpected errors silently
                    console.log('Storage error handled silently');
                });
            
            // Prepare API data for lazy loading (APIs will be called only when sections are clicked)
            // Don't fetch Mahadasha or Shadbala data here - fetch only when user clicks on those sections
            let currentDasha = null;
            let mahaDashaData = null;
            let shadbalaApiData = null;
            
            const apiDataForRequests = {
                year: parseInt(year),
                month: parseInt(month),
                date: parseInt(day),
                hours: parseInt(hour),
                minutes: parseInt(minute),
                seconds: parseInt(second),
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                timezone: parseFloat(timezone)
            };
            
            // APIs will be called lazily when user clicks on relevant sections
            console.log('API data prepared for lazy loading');
            
            // Final check - ensure we have currentDasha for display
            if (!currentDasha) {
                console.warn('No currentDasha available - Mahadasha features will not be displayed');
            } else {
                console.log('Final currentDasha to use:', currentDasha);
            }
            
            // Hide loading and show article view
            loadingMessage.classList.add('hidden');
            
            // Store data globally for lazy loading tabs
            // APIs (mahaDashaData, shadbalaApiData) will be fetched only when user clicks on relevant sections
            if (apiResult.output && Array.isArray(apiResult.output) && apiResult.output.length > 1) {
                window.kundliTabData = {
                    planetsData: apiResult.output[1],
                    ascendantSign: apiResult.output[1]?.Ascendant?.current_sign || null,
                    mahaDashaData: null, // Will be fetched when prediction sections are clicked
                    shadbalaApiData: null, // Will be fetched when Planetary Strength section is clicked
                    apiResult: apiResult,
                    apiDataForRequests: apiDataForRequests, // Store API request parameters for lazy loading
                    language: language,
                    generatedContent: {}
                };
            }
            
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
            
            // Generate article HTML - pass null for APIs that will be loaded on demand
            let articleHTML = generateArticleHTML(fullName, birthDate, formattedDate, timeOfBirth, placeOfBirth, apiResult, language, null, null, null);
            
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
            
            // Initialize tabs after content is loaded
            setTimeout(() => {
                if (typeof window.reinitializeTabs === 'function') {
                    window.reinitializeTabs();
                }
                if (typeof window.reinitializeSidebar === 'function') {
                    window.reinitializeSidebar();
                }
                
                // Set default tab to birth-details and scroll to top
                // Setup download button visibility
                setupDownloadButtonVisibility();
                
                // Monitor tab changes for download button visibility
                const observer = new MutationObserver(() => {
                    setupDownloadButtonVisibility();
                });
                const tabContainer = document.querySelector('.kundli-tabs-container') || document.querySelector('.article-content');
                if (tabContainer) {
                    observer.observe(tabContainer, { attributes: true, attributeFilter: ['class'], subtree: true });
                }
                
                // Also listen for tab button clicks
                document.querySelectorAll('[data-tab]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        setTimeout(setupDownloadButtonVisibility, 100);
                    });
                });
                
                if (typeof window.switchKundliTab === 'function') {
                    window.switchKundliTab('birth-details');
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
            
            initializeChatbot(language);
            
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
            
            // Determine error type and provide appropriate message
            let errorTitle = 'Error fetching kundli data.';
            let errorMessage = '';
            let errorDetails = error.message;
            let suggestions = '';
            
            if (error.message.includes('not configured')) {
                errorMessage = 'Please configure your FreeAstrologyAPI key in script.js (see API_CONFIG at the top of the file).';
                suggestions = 'Get your API key from https://freeastrologyapi.com';
            } else if (error.message.includes('Limit Exceeded') || error.message.includes('Too many requests') || error.message.includes('429')) {
                errorTitle = 'API Rate Limit Reached';
                errorMessage = 'You have exceeded the API request limit. This usually happens when too many requests are made in a short period.';
                suggestions = 'Please wait a few minutes before trying again. If you need to make many requests, consider upgrading your API plan at https://freeastrologyapi.com';
            } else if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
                errorTitle = 'API Authentication Error';
                errorMessage = 'Your API key may be invalid or expired.';
                suggestions = 'Please verify your API key at https://freeastrologyapi.com and update it in script.js';
            } else if (error.message.includes('Network error') || error.message.includes('Unable to connect')) {
                errorTitle = 'Connection Error';
                errorMessage = 'Unable to connect to the API server.';
                suggestions = 'Please check your internet connection and try again.';
            } else if (error.message.includes('400') || error.message.includes('Invalid request')) {
                errorTitle = 'Invalid Request';
                errorMessage = 'The birth details provided may be invalid.';
                suggestions = 'Please verify your date of birth, time, and location are correct.';
            } else if (error.message.includes('500') || error.message.includes('Server error')) {
                errorTitle = 'Server Error';
                errorMessage = 'The API service is temporarily unavailable.';
                suggestions = 'Please try again in a few moments. If the problem persists, the API service may be down.';
            } else {
                errorMessage = 'Please check your API key and endpoint configuration.';
            }
            
            resultContent.innerHTML = `
                <p><strong>Date of Birth:</strong> ${formattedDate}</p>
                <p><strong>Time of Birth:</strong> ${timeOfBirth || 'Not provided'}</p>
                <p><strong>Place of Birth:</strong> ${placeOfBirth}</p>
                <br>
                <div style="background: #ffebee; border-left: 4px solid #d32f2f; padding: 20px; border-radius: 4px; margin: 20px 0;">
                    <p style="color: #d32f2f; font-weight: 600; font-size: 18px; margin: 0 0 10px 0;">${errorTitle}</p>
                    <p style="margin: 8px 0; color: #666; line-height: 1.6;">
                        ${errorMessage}
                    </p>
                    ${suggestions ? `
                        <p style="margin: 12px 0 0 0; color: #555; font-size: 14px; line-height: 1.6;">
                            <strong>💡 Suggestion:</strong> ${suggestions}
                        </p>
                    ` : ''}
                    <p style="margin: 12px 0 0 0; font-size: 13px; color: #999; font-family: monospace;">
                        <strong>Technical Details:</strong> ${errorDetails}
                    </p>
                </div>
            `;
        }
    });
});
