// analysis-functions.js - 分析功能模塊

// 載入立委主題數據
function loadLegislatorTopicData() {
    if (!currentData.legislators) return;

    updateStats();
    populatePartyFilter();
    renderLegislatorTable(currentData.legislators);
}

function updateStats() {
    document.getElementById('total-legislators').textContent = currentData.legislators.length;
    document.getElementById('total-topics').textContent = currentData.topics.length;

    const avgTopics = currentData.legislators.reduce((sum, leg) => sum + leg.allTopics.length, 0) / currentData.legislators.length;
    document.getElementById('avg-topics-per-legislator').textContent = avgTopics.toFixed(1);

    const totalInteractions = currentData.legislators.reduce((sum, leg) => sum + leg.allTopics.length, 0);
    document.getElementById('total-interactions').textContent = totalInteractions;
}

function populatePartyFilter() {
    const partyFilter = document.getElementById('party-filter');
    partyFilter.innerHTML = '<option value="">所有政黨</option>';

    currentData.parties.forEach(party => {
        const option = document.createElement('option');
        option.value = party;
        option.textContent = party;
        partyFilter.appendChild(option);
    });
}

function renderLegislatorTable(legislators) {
    const tbody = document.getElementById('legislator-topic-tbody');
    tbody.innerHTML = '';

    legislators.forEach(legislator => {
        const row = document.createElement('tr');

        const totalScore = legislator.allTopics.reduce((sum, topic) => sum + topic.score, 0);
        const avgScore = legislator.allTopics.length > 0 ? totalScore / legislator.allTopics.length : 0;

        // 建立教育資訊顯示 - 移除"大學: "和"最高: "標籤
        let educationInfo = '';
        if (legislator.university) {
            educationInfo += `<div class="education-item university">${legislator.university}</div>`;
        }
        if (legislator.highest) {
            educationInfo += `<div class="education-item highest">${legislator.highest}</div>`;
        }

        const nameWithEducation = educationInfo ? 
            `<div><strong>${legislator.name}</strong></div><div class="education-info">${educationInfo}</div>` : 
            `<strong>${legislator.name}</strong>`;

        const topTopics = legislator.topics.map((topic, index) => {
            const topicData = currentData.topics.find(t => t.id === topic.topicId);
            const fullKeywords = topicData ? topicData.keywords : '';
            const topicName = topicData ? topicData.name : `主題${topic.topicId}`;

            return `<span class="topic-tag" 
                        style="display: inline-block; background: #f0f8ff; border: 1px solid #3498db; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 20px; cursor: pointer;"
                        title="${topicName}"
                        onmouseover="showTopicTooltip(event, ${topic.topicId}, ${topic.score.toFixed(3)}, '${fullKeywords.replace(/'/g, "\\'")}')"
                        onmouseout="hideTooltip()">
                        ${topicName}
                    </span>`;
        }).join('');

        const allTopicsDisplay = legislator.allTopics.map((topic, index) => {
            const topicData = currentData.topics.find(t => t.id === topic.topicId);
            const shortKeywords = topicData ? topicData.keywordList.slice(0, 2).join(', ') : '';

            return `<span class="topic-tag" 
                                style="display: inline-block; background: #f8f9fa; border: 1px solid #6c757d; padding: 3px 6px; margin: 1px; border-radius: 8px; font-size: 20px; cursor: pointer;"
                                title="主題${topic.topicId} - 分數: ${topic.score.toFixed(3)}"
                                onmouseover="showTopicTooltip(event, ${topic.topicId}, ${topic.score.toFixed(3)}, '${topicData ? topicData.keywords.replace(/'/g, "\\'") : ''}')"
                                onmouseout="hideTooltip()">
                                ${topic.topicId}(${topic.score.toFixed(2)})
                            </span>`;
        }).join('');

        row.innerHTML = `
                            <td style="text-align: center; min-width: 140px;">${nameWithEducation}</td>
                            <td style="text-align: center; min-width: 100px;"><span class="party-tag party-${legislator.party}">${legislator.party}</span></td>
                            <td style="text-align: center; min-width: 140px;" data-sort-value="${legislator.allTopics.length}"><span class="badge">${legislator.allTopics.length}</span></td>
                            <td style="text-align: center; min-width: 140px;" data-sort-value="${totalScore}">
                                <strong>${totalScore.toFixed(2)}</strong>
                            </td>
                            <td style="text-align: center; min-width: 140px;" data-sort-value="${avgScore}"><strong>${avgScore.toFixed(2)}</strong></td>
                            <td class="keywords" style="padding: 8px; min-width: 300px;">
                                <div style="line-height: 1.4;">
                                    ${topTopics}
                                </div>
                            </td>
                            <td class="keywords" style="padding: 8px; min-width: 400px;">
                                <div style="line-height: 1.4; max-height: 150px; overflow-y: auto;">
                                    ${allTopicsDisplay}
                                </div>
                            </td>
                        `;

        tbody.appendChild(row);
    });
}

// 載入主題立委數據
function loadTopicLegislatorData() {
    if (!currentData.topics) return;
    renderTopicTable(currentData.topics);
}

function renderTopicTable(topics) {
    const tbody = document.getElementById('topic-legislator-tbody');
    tbody.innerHTML = '';

    topics.forEach(topic => {
        const row = document.createElement('tr');

        const totalScore = topic.legislators.reduce((sum, leg) => sum + leg.score, 0);
        const avgScore = topic.legislators.length > 0 ? totalScore / topic.legislators.length : 0;

        const allLegislators = topic.legislators.map((leg, index) => {
            // 獲取立委完整信息以顯示教育背景
            const legislatorInfo = currentData.legislators.find(l => l.name === leg.legislatorName);
            let educationTooltip = '';
            if (legislatorInfo) {
                if (legislatorInfo.university) educationTooltip += `\\n大學: ${legislatorInfo.university}`;
                if (legislatorInfo.highest) educationTooltip += `\\n最高: ${legislatorInfo.highest}`;
            }

            return `<span class="legislator-tag"
                                style="display: inline-block; background: ${getPartyBackgroundColor(leg.party)}; color: white; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 20px; cursor: pointer; opacity: 0.9;"
                                onmouseover="this.style.opacity='1'; showTooltip(event, '${leg.legislatorName} (${leg.party})\\n關心度: ${leg.score.toFixed(3)}\\n排名: ${index + 1}${educationTooltip}')"
                                onmouseout="this.style.opacity='0.9'; hideTooltip()">
                                ${leg.legislatorName}
                            </span>`;
        }).join('');

        const topTenLegislators = topic.legislators.slice(0, 10).map((leg, index) => {
            const legislatorInfo = currentData.legislators.find(l => l.name === leg.legislatorName);
            let educationTooltip = '';
            if (legislatorInfo) {
                if (legislatorInfo.university) educationTooltip += `\\n大學: ${legislatorInfo.university}`;
                if (legislatorInfo.highest) educationTooltip += `\\n最高: ${legislatorInfo.highest}`;
            }

            return `<span class="legislator-tag"
                                style="display: inline-block; background: ${getPartyBackgroundColor(leg.party)}; color: white; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 20px; cursor: pointer; opacity: 0.9; border: 2px solid #ffd700;"
                                onmouseover="this.style.opacity='1'; showTooltip(event, '${leg.legislatorName} (${leg.party})\\n關心度: ${leg.score.toFixed(3)}\\n排名: ${index + 1}${educationTooltip}')"
                                onmouseout="this.style.opacity='0.9'; hideTooltip()">
                                ${leg.legislatorName}
                            </span>`;
        }).join('');

        const topTenDisplay = topTenLegislators +
            (topic.legislators.length < 10 ?
                `<div style="color: #888; font-style: italic; margin-top: 8px; padding: 4px 8px; background: #f1f1f1; border-radius: 8px; display: inline-block; font-size: 20px;">僅有 ${topic.legislators.length} 位立委關注此主題</div>` : '');

        row.innerHTML = `
                            <td style="text-align: center; min-width: 100px;"><strong>${topic.name}</strong></td>
                            <td class="keywords" style="min-width: 200px; padding: 8px;"
                                title="完整關鍵詞: ${topic.keywords}"
                                onmouseover="showTooltip(event, '${topic.name} 關鍵詞:\\n${topic.keywords}')"
                                onmouseout="hideTooltip()">
                                <div style="max-height: 80px; overflow-y: auto; font-size: 20px; line-height: 1.3;">
                                    ${topic.keywords.length > 150 ? topic.keywords.substring(0, 150) + '...' : topic.keywords}
                                </div>
                            </td>
                            <td style="text-align: center; min-width: 140px;" data-sort-value="${topic.legislators.length}"><span class="badge">${topic.legislators.length}</span></td>
                            <td style="text-align: center; min-width: 140px;" data-sort-value="${totalScore}">
                                <strong>${totalScore.toFixed(2)}</strong>
                            </td>
                            <td style="text-align: center; min-width: 140px;" data-sort-value="${avgScore}"><strong>${avgScore.toFixed(2)}</strong></td>
                            <td class="keywords" style="padding: 8px; min-width: 300px;">
                                <div style="line-height: 1.4; max-height: 150px; overflow-y: auto;">
                                    ${allLegislators}
                                </div>
                            </td>
                            <td class="keywords" style="padding: 8px; min-width: 300px;">
                                <div style="line-height: 1.4;">
                                    ${topTenDisplay}
                                </div>
                            </td>
                        `;

        tbody.appendChild(row);
    });
}

// 獲取政黨背景顏色
function getPartyBackgroundColor(party) {
    const colors = {
        '民進黨': '#1B9431',
        '國民黨': '#000099',
        '時代力量': '#FBBE01',
        '親民黨': '#FF6310',
        '民眾黨': '#28C8C8',
        '基進黨': '#A73F24',
        '無黨籍': '#95a5a6',
        '未知': '#bdc3c7'
    };
    return colors[party] || '#bdc3c7';
}

// 載入黨派主題數據
function loadPartyTopicData() {
    if (!currentData || !currentData.legislators || !currentData.parties) {
        console.error('數據未載入完成');
        return;
    }

    const partyAnalysis = analyzePartyTopicRelations();
    renderPartyTable(partyAnalysis);
}

function analyzePartyTopicRelations() {
    const partyData = {};

    if (!currentData.parties || currentData.parties.length === 0) {
        console.warn('沒有政黨數據，從立委數據中提取');
        currentData.parties = [...new Set(currentData.legislators.map(leg => leg.party))].filter(party => party && party !== '未知');
    }

    currentData.parties.forEach(party => {
        const partyLegislators = currentData.legislators.filter(leg => leg.party === party);

        if (partyLegislators.length === 0) return;

        const topicScores = {};
        let totalEngagement = 0;

        partyLegislators.forEach(legislator => {
            legislator.topics.forEach(topic => {
                if (!topicScores[topic.topicId]) {
                    topicScores[topic.topicId] = 0;
                }
                topicScores[topic.topicId] += topic.score;
                totalEngagement += topic.score;
            });
        });

        const sortedTopics = Object.entries(topicScores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        partyData[party] = {
            memberCount: partyLegislators.length,
            totalEngagement: totalEngagement,
            avgEngagement: totalEngagement / partyLegislators.length,
            topTopics: sortedTopics
        };
    });

    return partyData;
}

function renderPartyTable(partyData) {
    const tbody = document.getElementById('party-topic-tbody');
    tbody.innerHTML = '';

    if (Object.keys(partyData).length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #999;">暫無黨派數據</td></tr>';
        return;
    }

    Object.entries(partyData).forEach(([party, data]) => {
        const row = document.createElement('tr');

        const topTopics = data.topTopics.map(([topicId, score]) => {
            const topicData = currentData.topics.find(t => t.id == topicId);
            const keywords = topicData ? topicData.keywords.split(',').slice(0, 2).join(',') : '';
            const topicName = topicData ? topicData.name : `主題${topicId}`;
            return `<span class="topic-tag" 
                        style="display: inline-block; background: #f0f8ff; border: 1px solid #3498db; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 20px; cursor: pointer;"
                        title="${topicName}: ${keywords}"
                        onmouseover="showTooltip(event, '${topicName}\\n${party}關心度: ${score.toFixed(2)}\\n關鍵詞: ${keywords}')"
                        onmouseout="hideTooltip()">
                        ${topicName} (${score.toFixed(1)})
                    </span>`;
        }).join('');

        row.innerHTML = `
                    <td style="text-align: center; width: 100px;"><span class="party-tag party-${party}" style="font-size: 20px; padding: 8px 12px;">${party}</span></td>
                    <td style="text-align: center; width: 80px;" data-sort-value="${data.memberCount}"><span class="badge" style="font-size: 20px;">${data.memberCount}</span></td>
                    <td style="text-align: center; width: 120px;" data-sort-value="${data.totalEngagement}">
                        <div class="score-bar" style="margin: 0 auto;">
                            <div class="score-fill" style="width: ${Math.min(data.totalEngagement / 200, 100)}%"></div>
                        </div>
                        <strong>${data.totalEngagement.toFixed(1)}</strong>
                    </td>
                    <td style="text-align: center; width: 100px;" data-sort-value="${data.avgEngagement}"><strong>${data.avgEngagement.toFixed(1)}</strong></td>
                    <td class="keywords" style="padding: 8px;">
                        <div style="line-height: 1.4;">
                            ${topTopics}
                        </div>
                    </td>
                `;

        tbody.appendChild(row);
    });
}

// 載入地區主題數據
function loadRegionTopicData() {
    if (!currentData || !currentData.legislators) {
        console.error('數據未載入完成');
        return;
    }

    const analysisType = document.getElementById('region-analysis-type') ? 
        document.getElementById('region-analysis-type').value : 'eight-district';

    let regionAnalysis;
    let regionTypeName;

    switch (analysisType) {
        case 'eight-district':
            regionAnalysis = analyzeEightDistrictTopicRelations();
            regionTypeName = '八選區';
            break;
        case 'seven-origin':
            regionAnalysis = analyzeSevenOriginTopicRelations();
            regionTypeName = '七原籍';
            break;
        case 'seven-growth':
            regionAnalysis = analyzeSevenGrowthTopicRelations();
            regionTypeName = '七成長';
            break;
        default:
            regionAnalysis = analyzeEightDistrictTopicRelations();
            regionTypeName = '八選區';
    }

    renderRegionTable(regionAnalysis, regionTypeName);
}

function analyzeEightDistrictTopicRelations() {
    const regionData = {};

    if (!currentData.eightDistricts || currentData.eightDistricts.length === 0) {
        console.warn('沒有八選區數據，從立委數據中提取');
        currentData.eightDistricts = [...new Set(currentData.legislators.map(leg => leg.eightDistrict))].filter(district => district && district !== '未知' && district !== '');
    }

    currentData.eightDistricts.forEach(region => {
        const regionLegislators = currentData.legislators.filter(leg => leg.eightDistrict === region);
        
        if (regionLegislators.length === 0) return;

        const topicScores = {};
        let totalActivity = 0;

        regionLegislators.forEach(legislator => {
            legislator.topics.forEach(topic => {
                if (!topicScores[topic.topicId]) {
                    topicScores[topic.topicId] = 0;
                }
                topicScores[topic.topicId] += topic.score;
                totalActivity += topic.score;
            });
        });

        const sortedTopics = Object.entries(topicScores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        regionData[region] = {
            legislatorCount: regionLegislators.length,
            topicDiversity: Object.keys(topicScores).length,
            totalActivity: totalActivity,
            topTopics: sortedTopics
        };
    });

    return regionData;
}

function analyzeSevenOriginTopicRelations() {
    const regionData = {};

    if (!currentData.sevenOrigins || currentData.sevenOrigins.length === 0) {
        console.warn('沒有七原籍數據，從立委數據中提取');
        currentData.sevenOrigins = [...new Set(currentData.legislators.map(leg => leg.sevenOrigin))].filter(origin => origin && origin !== '未知' && origin !== '');
    }

    currentData.sevenOrigins.forEach(region => {
        const regionLegislators = currentData.legislators.filter(leg => leg.sevenOrigin === region);
        
        if (regionLegislators.length === 0) return;

        const topicScores = {};
        let totalActivity = 0;

        regionLegislators.forEach(legislator => {
            legislator.topics.forEach(topic => {
                if (!topicScores[topic.topicId]) {
                    topicScores[topic.topicId] = 0;
                }
                topicScores[topic.topicId] += topic.score;
                totalActivity += topic.score;
            });
        });

        const sortedTopics = Object.entries(topicScores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        regionData[region] = {
            legislatorCount: regionLegislators.length,
            topicDiversity: Object.keys(topicScores).length,
            totalActivity: totalActivity,
            topTopics: sortedTopics
        };
    });

    return regionData;
}

function analyzeSevenGrowthTopicRelations() {
    const regionData = {};

    if (!currentData.sevenGrowths || currentData.sevenGrowths.length === 0) {
        console.warn('沒有七成長數據，從立委數據中提取');
        currentData.sevenGrowths = [...new Set(currentData.legislators.map(leg => leg.sevenGrowth))].filter(growth => growth && growth !== '未知' && growth !== '');
    }

    currentData.sevenGrowths.forEach(region => {
        const regionLegislators = currentData.legislators.filter(leg => leg.sevenGrowth === region);
        
        if (regionLegislators.length === 0) return;

        const topicScores = {};
        let totalActivity = 0;

        regionLegislators.forEach(legislator => {
            legislator.topics.forEach(topic => {
                if (!topicScores[topic.topicId]) {
                    topicScores[topic.topicId] = 0;
                }
                topicScores[topic.topicId] += topic.score;
                totalActivity += topic.score;
            });
        });

        const sortedTopics = Object.entries(topicScores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        regionData[region] = {
            legislatorCount: regionLegislators.length,
            topicDiversity: Object.keys(topicScores).length,
            totalActivity: totalActivity,
            topTopics: sortedTopics
        };
    });

    return regionData;
}

function renderRegionTable(regionData, type) {
    const tbody = document.getElementById('region-topic-tbody');
    tbody.innerHTML = '';

    if (Object.keys(regionData).length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #999;">暫無${type}數據</td></tr>`;
        return;
    }

    Object.entries(regionData).forEach(([location, data]) => {
        const row = document.createElement('tr');

        const topTopics = data.topTopics.map(([topicId, score]) => {
            const topicData = currentData.topics.find(t => t.id == topicId);
            const keywords = topicData ? topicData.keywords.split(',').slice(0, 2).join(',') : '';
            const topicName = topicData ? topicData.name : `主題${topicId}`;
            return `<span class="topic-tag" 
                        style="display: inline-block; background: #f0f8ff; border: 1px solid #3498db; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 20px; cursor: pointer;"
                        title="${topicName}: ${keywords}"
                        onmouseover="showTooltip(event, '${topicName}\\n${location}關心度: ${score.toFixed(2)}\\n關鍵詞: ${keywords}')"
                        onmouseout="hideTooltip()">
                        ${topicName} (${score.toFixed(1)})
                    </span>`;
        }).join('');

        row.innerHTML = `
                    <td style="text-align: center; width: 120px;" data-sort-value="${location}"><strong>${location}</strong></td>
                    <td style="text-align: center; width: 80px;">${type}</td>
                    <td style="text-align: center; width: 80px;" data-sort-value="${data.legislatorCount}"><span class="badge" style="font-size: 20px;">${data.legislatorCount}</span></td>
                    <td style="text-align: center; width: 80px;" data-sort-value="${data.topicDiversity}"><span class="badge" style="font-size: 20px;">${data.topicDiversity}</span></td>
                    <td style="text-align: center; width: 120px;" data-sort-value="${data.totalActivity}">
                        <div class="score-bar" style="margin: 0 auto;">
                            <div class="score-fill" style="width: ${Math.min(data.totalActivity / 100, 100)}%"></div>
                        </div>
                        <strong>${data.totalActivity.toFixed(1)}</strong>
                    </td>
                    <td class="keywords" style="padding: 8px;">
                        <div style="line-height: 1.4;">
                            ${topTopics}
                        </div>
                    </td>
                `;

        tbody.appendChild(row);
    });
}

// 載入基本資料
function loadBasicInfoData() {
    if (!currentData.legislators) return;

    populateBasicInfoPartyFilter();
    
    // 預設顯示的欄位
    const defaultFields = ['原始姓名', '政黨', '選區', '原籍'];
    updateBasicInfoTableHeader(defaultFields);
    renderBasicInfoTable(currentData.legislators, defaultFields);
}

function populateBasicInfoPartyFilter() {
    const partyFilter = document.getElementById('basic-info-party-filter');
    if (!partyFilter) return;
    
    partyFilter.innerHTML = '<option value="">所有政黨</option>';

    currentData.parties.forEach(party => {
        const option = document.createElement('option');
        option.value = party;
        option.textContent = party;
        partyFilter.appendChild(option);
    });
}

function renderBasicInfoTable(legislators, selectedFields) {
    const tbody = document.getElementById('basic-info-tbody');
    tbody.innerHTML = '';

    legislators.forEach(legislator => {
        const row = document.createElement('tr');
        
        let rowHtml = '';
        selectedFields.forEach(field => {
            let cellContent = '';
            
            switch (field) {
                case '原始姓名':
                    // 移除學歷顯示文字，只顯示學歷內容
                    let educationInfo = '';
                    if (legislator.university) {
                        educationInfo += `<div class="education-item university">${legislator.university}</div>`;
                    }
                    if (legislator.highest) {
                        educationInfo += `<div class="education-item highest">${legislator.highest}</div>`;
                    }
                    
                    const nameWithEducation = educationInfo ? 
                        `<div><strong>${legislator.name}</strong></div><div class="education-info">${educationInfo}</div>` : 
                        `<strong>${legislator.name}</strong>`;
                    cellContent = nameWithEducation;
                    break;
                case '政黨':
                    cellContent = `<span class="party-tag party-${legislator.party}">${legislator.party}</span>`;
                    break;
                case '選區':
                    // 合併顯示：選區 (八選區)
                    const district = legislator.district || '無資料';
                    const eightDistrict = legislator.eightDistrict;
                    cellContent = eightDistrict && eightDistrict !== '無資料' && eightDistrict !== '未知' ? 
                        `${district} (${eightDistrict})` : district;
                    break;
                case '八選區':
                    cellContent = legislator.eightDistrict || '無資料';
                    break;
                case '原籍':
                    // 合併顯示：原籍 (七原籍)
                    const origin = legislator.origin || '無資料';
                    const sevenOrigin = legislator.sevenOrigin;
                    cellContent = sevenOrigin && sevenOrigin !== '無資料' && sevenOrigin !== '未知' ? 
                        `${origin} (${sevenOrigin})` : origin;
                    break;
                case '七原籍':
                    cellContent = legislator.sevenOrigin || '無資料';
                    break;
                case '成長':
                    // 合併顯示：成長地 (七成長)
                    const growth = legislator.growth || '無資料';
                    const sevenGrowth = legislator.sevenGrowth;
                    cellContent = sevenGrowth && sevenGrowth !== '無資料' && sevenGrowth !== '未知' ? 
                        `${growth} (${sevenGrowth})` : growth;
                    break;
                case '七成長':
                    cellContent = legislator.sevenGrowth || '無資料';
                    break;
                case '大學學歷':
                    cellContent = legislator.university || '';
                    break;
                case '最高學歷':
                    cellContent = legislator.highest || '';
                    break;
                case '前職業':
                    cellContent = legislator.previousJob || '<span style="color: #999; font-style: italic;">多為酬庸職位</span>';
                    break;
                case '任期':
                    const duration = formatTermDuration(legislator.termStart, legislator.termEnd);
                    cellContent = legislator.termStart && legislator.termEnd ? 
                        `${legislator.termStart} - ${legislator.termEnd} ${duration}` : '無資料';
                    break;
                case '下任':
                    cellContent = formatNextTermStatusFixed(legislator.nextTerm, legislator.district);
                    break;
                case '性別':
                    cellContent = legislator.gender || '無資料';
                    break;
                case '委員會':
                    cellContent = formatCommitteeInfo(legislator.committees);
                    break;
                case '英文名':
                    cellContent = legislator.englishName || '無資料';
                    break;
                default:
                    cellContent = '無資料';
            }
            
            // 如果內容為空且該欄位有預設隱藏邏輯，則不顯示
            if ((field === '大學學歷' || field === '最高學歷') && !cellContent) {
                cellContent = ''; // 空白顯示
            }
            
            rowHtml += `<td style="text-align: center; vertical-align: middle;">${cellContent}</td>`;
        });
        
        row.innerHTML = rowHtml;
        tbody.appendChild(row);
    });
}

// 修復下任狀態格式化函數
function formatNextTermStatusFixed(status, district) {
    if (!status || status === '' || status === 'null' || status === 'undefined') {
        // 檢查是否為不分區立委
        if (!district || district === '不分區' || district.includes('不分區')) {
            return '<span class="status-failed">不分區連任失敗</span>';
        } else {
            return '<span class="status-failed">資料不完整</span>';
        }
    }
    
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus === '連任') {
        return '<span class="status-success">連任</span>';
    } else if (lowerStatus === '罷免' || lowerStatus === '辭職' || 
               (lowerStatus !== '連任' && lowerStatus !== '' && lowerStatus !== '未知')) {
        return `<span class="status-failed">${status}</span>`;
    } else {
        return `<span class="status-failed">${status}</span>`;
    }
}

// 載入影響力數據
function loadInfluenceData() {
    if (!currentData || !currentData.legislators) {
        console.error('數據未載入完成');
        return;
    }
    renderInfluenceTable(currentData.legislators);
}

function renderInfluenceTable(legislators) {
    const tbody = document.getElementById('influence-tbody');
    tbody.innerHTML = '';

    legislators.forEach(legislator => {
        const row = document.createElement('tr');
        const influence = legislator.influence || {
            degree: 0,
            weighted_degree: 0,
            betweenness: 0,
            leaderrank: 0,
            eigenvector: 0,
            core: 0,
            meeting_count: 0,
            weighted_betweenness: 0,
            weighted_leaderrank: 0,
            weighted_eigenvector: 0,
            weighted_core: 0
        };

        // 建立教育資訊顯示 - 修改：移除"大學: "和"最高: "標籤
        let educationInfo = '';
        if (legislator.university) {
            educationInfo += `<div class="education-item university">${legislator.university}</div>`;
        }
        if (legislator.highest) {
            educationInfo += `<div class="education-item highest">${legislator.highest}</div>`;
        }

        const nameWithEducation = educationInfo ? 
            `<div><strong>${legislator.name}</strong></div><div class="education-info">${educationInfo}</div>` : 
            `<strong>${legislator.name}</strong>`;

        row.innerHTML = `
            <td style="text-align: center; width: 120px;">${nameWithEducation}</td>
            <td style="text-align: center; width: 80px;"><span class="party-tag party-${legislator.party}" style="font-size: 20px; padding: 6px 10px;">${legislator.party}</span></td>
            <td style="text-align: center; width: 120px;" data-sort-value="${influence.degree}">
                <div class="score-bar" style="margin: 0 auto;">
                    <div class="score-fill" style="width: ${influence.degree * 100}%"></div>
                </div>
                <strong>${influence.degree.toFixed(4)}</strong>
            </td>
            <td style="text-align: center; width: 120px;" data-sort-value="${influence.weighted_degree}"
                title="會議數: ${influence.meeting_count}, 基於共同會議權重">
                <div class="meeting-weighted-score">
                    <strong>${influence.weighted_degree.toFixed(4)}</strong>
                    <div class="meeting-count">會議: ${influence.meeting_count}</div>
                </div>
            </td>
            <td style="text-align: center; width: 120px;" data-sort-value="${influence.weighted_betweenness}" 
                title="會議數: ${influence.meeting_count}, 原始值: ${influence.betweenness.toFixed(4)}">
                <div class="meeting-weighted-score">
                    <strong>${influence.weighted_betweenness.toFixed(4)}</strong>
                    <div class="meeting-count">會議: ${influence.meeting_count}</div>
                </div>
            </td>
            <td style="text-align: center; width: 120px;" data-sort-value="${influence.weighted_leaderrank}"
                title="會議數: ${influence.meeting_count}, 原始值: ${influence.leaderrank.toFixed(4)}">
                <div class="meeting-weighted-score">
                    <strong>${influence.weighted_leaderrank.toFixed(4)}</strong>
                    <div class="meeting-count">會議: ${influence.meeting_count}</div>
                </div>
            </td>
            <td style="text-align: center; width: 120px;" data-sort-value="${influence.weighted_eigenvector}"
                title="會議數: ${influence.meeting_count}, 原始值: ${influence.eigenvector.toFixed(4)}">
                <div class="meeting-weighted-score">
                    <strong>${influence.weighted_eigenvector.toFixed(4)}</strong>
                    <div class="meeting-count">會議: ${influence.meeting_count}</div>
                </div>
            </td>
            <td style="text-align: center; width: 80px;" data-sort-value="${influence.weighted_core}"
                title="會議數: ${influence.meeting_count}, 原始值: ${influence.core}">
                <div class="meeting-weighted-score">
                    <span class="badge" style="font-size: 20px;">${influence.weighted_core.toFixed(1)}</span>
                    <div class="meeting-count">會議: ${influence.meeting_count}</div>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function loadVisualizationTab() {
    const container = document.getElementById('visualization-container');
    if (container) {
        container.innerHTML = `
                    <div class="viz-placeholder">
                        <h3>📈 互動式可視化分析</h3>
                        <p>選擇可視化類型並點擊載入</p>
                        <div style="margin-top: 20px;">
                            <div style="padding: 15px; background: white; border-radius: 8px; margin: 10px 0;">
                                <h4>🎯 立委專業度分析</h4>
                                <p>以氣泡圖顯示立委的專業度與涉獵廣度關係</p>
                            </div>
                            <div style="padding: 15px; background: white; border-radius: 8px; margin: 10px 0;">
                                <h4>🗂️ 主題概覽</h4>
                                <p>主題分布和關聯性的互動式視覺化</p>
                            </div>
                        </div>
                    </div>
                `;
    }
}

async function loadVisualization() {
    const vizType = document.getElementById('viz-type').value;
    const container = document.getElementById('visualization-container');

    showStatus('⏳ 載入可視化分析中...', 'loading');

    try {
        let filename;
        if (vizType === 'specialization') {
            filename = 'bertopic_analysis_optimized/legislator_specialization_analysis.html';
        } else if (vizType === 'topic-overview') {
            filename = 'bertopic_analysis_optimized/topics_overview.html';
        }

        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }

        const htmlContent = await response.text();
        container.innerHTML = htmlContent;

        const scripts = container.querySelectorAll('script');
        for (const script of scripts) {
            const newScript = document.createElement('script');
            if (script.src) {
                newScript.src = script.src;
                await new Promise((resolve) => {
                    newScript.onload = resolve;
                    newScript.onerror = resolve;
                    document.head.appendChild(newScript);
                });
            } else {
                newScript.textContent = script.textContent;
                document.head.appendChild(newScript);
            }
        }

        showStatus('✅ 可視化載入完成！', 'success');
        setTimeout(() => {
            document.getElementById('status-indicator').style.display = 'none';
        }, 2000);

    } catch (error) {
        console.error('載入外部可視化失敗:', error);
        showStatus('❌ 無法載入外部可視化文件，請確認文件存在', 'error');
        container.innerHTML = `
                    <div class="viz-placeholder">
                        <h3>❌ 可視化載入失敗</h3>
                        <p>無法載入 ${vizType === 'specialization' ? '立委專業度分析' : '主題概覽'} 文件</p>
                        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; color: #856404;">
                            <h4>🔍 可能的解決方案：</h4>
                            <ul style="text-align: left; margin: 10px 0;">
                                <li>確認文件 <code>bertopic_analysis_optimized/${vizType === 'specialization' ? 'legislator_specialization_analysis.html' : 'topics_overview.html'}</code> 存在</li>
                                <li>使用本地服務器運行：<code>python -m http.server 8000</code></li>
                                <li>檢查文件路徑和權限</li>
                            </ul>
                        </div>
                    </div>
                `;
    }
}

// 篩選功能
function filterLegislatorData() {
    const searchTerm = document.getElementById('legislator-search').value.toLowerCase();
    const selectedParty = document.getElementById('party-filter').value;

    let filtered = currentData.legislators.filter(legislator => {
        const matchesSearch = !searchTerm || legislator.name.toLowerCase().includes(searchTerm);
        const matchesParty = !selectedParty || legislator.party === selectedParty;
        return matchesSearch && matchesParty;
    });

    renderLegislatorTable(filtered);
}

function resetLegislatorFilters() {
    document.getElementById('legislator-search').value = '';
    document.getElementById('party-filter').value = '';
    renderLegislatorTable(currentData.legislators);
}

function filterTopicData() {
    const searchTerm = document.getElementById('topic-search').value.toLowerCase();

    let filtered = currentData.topics.filter(topic => {
        return topic.keywords.toLowerCase().includes(searchTerm);
    });

    renderTopicTable(filtered);
}

function resetTopicFilters() {
    document.getElementById('topic-search').value = '';
    renderTopicTable(currentData.topics);
}

function filterRegionData() {
    loadRegionTopicData();
}

function resetRegionFilters() {
    const searchInput = document.getElementById('region-search');
    const typeSelect = document.getElementById('region-analysis-type');
    
    if (searchInput) searchInput.value = '';
    if (typeSelect) typeSelect.value = 'eight-district';
    
    loadRegionTopicData();
}

function filterInfluenceData() {
    const searchTerm = document.getElementById('influence-search').value.toLowerCase();

    let filtered = currentData.legislators.filter(legislator => {
        return legislator.name.toLowerCase().includes(searchTerm);
    });

    renderInfluenceTable(filtered);
}

function resetInfluenceFilters() {
    document.getElementById('influence-search').value = '';
    document.getElementById('influence-metric').value = 'degree';
    renderInfluenceTable(currentData.legislators);
}

// 修改：基本資料篩選功能，包含自動觸發更新顯示
function filterBasicInfoData() {
    const searchTerm = document.getElementById('basic-info-search').value.toLowerCase();
    const selectedParty = document.getElementById('basic-info-party-filter').value;

    let filtered = currentData.legislators.filter(legislator => {
        const matchesSearch = !searchTerm || legislator.name.toLowerCase().includes(searchTerm);
        const matchesParty = !selectedParty || legislator.party === selectedParty;
        return matchesSearch && matchesParty;
    });

    // 取得當前選中的欄位
    const selectedFields = [];
    const checkboxes = document.querySelectorAll('.field-checkboxes input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        selectedFields.push(checkbox.value);
    });

    // 如果沒有選中任何欄位，使用預設欄位
    if (selectedFields.length === 0) {
        selectedFields.push('原始姓名', '政黨', '選區', '原籍');
        
        // 同時更新複選框狀態
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectedFields.includes(checkbox.value);
        });
        
        // 更新表頭
        updateBasicInfoTableHeader(selectedFields);
    }

    renderBasicInfoTable(filtered, selectedFields);
}

// 修改：基本資料重置功能，包含自動觸發更新顯示
function resetBasicInfoFilters() {
    document.getElementById('basic-info-search').value = '';
    document.getElementById('basic-info-party-filter').value = '';
    
    // 重置為預設欄位
    const checkboxes = document.querySelectorAll('.field-checkboxes input[type="checkbox"]');
    const defaultFields = ['原始姓名', '政黨', '選區', '原籍'];
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = defaultFields.includes(checkbox.value);
    });
    
    // 自動觸發更新顯示
    updateBasicInfoDisplay();
}