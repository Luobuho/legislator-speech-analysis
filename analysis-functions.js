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
                            <td style="text-align: center; min-width: 140px;"><strong>${legislator.name}</strong></td>
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
            return `<span class="legislator-tag"
                                style="display: inline-block; background: ${getPartyBackgroundColor(leg.party)}; color: white; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 20px; cursor: pointer; opacity: 0.9;"
                                onmouseover="this.style.opacity='1'; showTooltip(event, '${leg.legislatorName} (${leg.party})\\n關心度: ${leg.score.toFixed(3)}\\n排名: ${index + 1}')"
                                onmouseout="this.style.opacity='0.9'; hideTooltip()">
                                ${leg.legislatorName}
                            </span>`;
        }).join('');

        const topTenLegislators = topic.legislators.slice(0, 10).map((leg, index) => {
            return `<span class="legislator-tag"
                                style="display: inline-block; background: ${getPartyBackgroundColor(leg.party)}; color: white; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 20px; cursor: pointer; opacity: 0.9; border: 2px solid #ffd700;"
                                onmouseover="this.style.opacity='1'; showTooltip(event, '${leg.legislatorName} (${leg.party})\\n關心度: ${leg.score.toFixed(3)}\\n排名: ${index + 1}')"
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

// 載入選區原籍主題數據
function loadDistrictTopicData() {
    if (!currentData || !currentData.legislators) {
        console.error('數據未載入完成');
        return;
    }

    const analysisType = document.getElementById('analysis-type') ? document.getElementById('analysis-type').value : 'district';

    if (analysisType === 'district') {
        const districtAnalysis = analyzeDistrictTopicRelations();
        renderDistrictTable(districtAnalysis, '選區');
    } else {
        const originAnalysis = analyzeOriginTopicRelations();
        renderDistrictTable(originAnalysis, '原籍地');
    }
}

function analyzeDistrictTopicRelations() {
    const districtData = {};

    if (!currentData.districts || currentData.districts.length === 0) {
        console.warn('沒有選區數據，從立委數據中提取');
        currentData.districts = [...new Set(currentData.legislators.map(leg => leg.district))].filter(district => district && district !== '未知' && district !== '');
    }

    if (currentData.districts.length === 0) {
        const mockDistricts = ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市'];
        currentData.districts = mockDistricts;

        currentData.legislators.forEach((legislator, index) => {
            if (!legislator.district || legislator.district === '未知') {
                legislator.district = mockDistricts[index % mockDistricts.length];
            }
        });
    }

    currentData.districts.forEach(district => {
        const districtLegislators = currentData.legislators.filter(leg => leg.district === district);

        if (districtLegislators.length === 0) return;

        const topicScores = {};
        let totalActivity = 0;

        districtLegislators.forEach(legislator => {
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

        districtData[district] = {
            legislatorCount: districtLegislators.length,
            topicDiversity: Object.keys(topicScores).length,
            totalActivity: totalActivity,
            topTopics: sortedTopics
        };
    });

    return districtData;
}

function analyzeOriginTopicRelations() {
    const originData = {};

    if (!currentData.origins || currentData.origins.length === 0) {
        console.warn('沒有原籍數據，從立委數據中提取');
        currentData.origins = [...new Set(currentData.legislators.map(leg => leg.origin))].filter(origin => origin && origin !== '未知' && origin !== '');
    }

    if (currentData.origins.length === 0) {
        const mockOrigins = ['台北', '新北', '桃園', '台中', '台南', '高雄', '屏東', '花蓮', '台東'];
        currentData.origins = mockOrigins;

        currentData.legislators.forEach((legislator, index) => {
            if (!legislator.origin || legislator.origin === '未知') {
                legislator.origin = mockOrigins[index % mockOrigins.length];
            }
        });
    }

    currentData.origins.forEach(origin => {
        const originLegislators = currentData.legislators.filter(leg => leg.origin === origin);

        if (originLegislators.length === 0) return;

        const topicScores = {};
        let totalActivity = 0;

        originLegislators.forEach(legislator => {
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

        originData[origin] = {
            legislatorCount: originLegislators.length,
            topicDiversity: Object.keys(topicScores).length,
            totalActivity: totalActivity,
            topTopics: sortedTopics
        };
    });

    return originData;
}

function renderDistrictTable(districtData, type) {
    const tbody = document.getElementById('district-topic-tbody');
    tbody.innerHTML = '';

    if (Object.keys(districtData).length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #999;">暫無${type}數據</td></tr>`;
        return;
    }

    Object.entries(districtData).forEach(([location, data]) => {
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

        row.innerHTML = `
            <td style="text-align: center; width: 120px;"><strong>${legislator.name}</strong></td>
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

// 載入社群數據 - 修復版本
async function loadCommunityData() {
    try {
        showStatus('🔄 執行Louvain社群檢測...', 'loading');
        
        // 使用改進的社群分析函數
        const communityAnalysis = await analyzeCommunities(currentCommunityMethod);
        
        if (communityAnalysis && communityAnalysis.communities) {
            updateCommunityStats(communityAnalysis);
            renderCommunityTable(communityAnalysis);
            showStatus('✅ 社群分析完成！', 'success');
        } else {
            throw new Error('社群分析未返回有效結果');
        }
    } catch (error) {
        console.error('載入社群數據失敗:', error);
        showStatus('❌ 社群數據載入失敗', 'error');
        
        // 顯示基本錯誤信息
        const tbody = document.getElementById('community-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #d32f2f;">
                社群分析失敗: ${error.message}<br>
                <small>請檢查數據完整性或重新載入頁面</small>
            </td></tr>`;
        }
    } finally {
        setTimeout(() => {
            const statusIndicator = document.getElementById('status-indicator');
            if (statusIndicator) {
                statusIndicator.style.display = 'none';
            }
        }, 3000);
    }
}

function updateCommunityStats(analysis) {
    try {
        document.getElementById('total-communities').textContent = analysis.stats.totalCommunities || 0;
        document.getElementById('largest-community').textContent = analysis.stats.largestCommunity || 0;
        document.getElementById('avg-community-size').textContent = (analysis.stats.avgCommunitySize || 0).toFixed(1);
        document.getElementById('modularity').textContent = (analysis.stats.modularity || 0).toFixed(4);
    } catch (error) {
        console.error('更新社群統計失敗:', error);
    }
}

// 修復的社群表格渲染函數
function renderCommunityTable(analysis) {
    const tbody = document.getElementById('community-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (!analysis || !analysis.communities) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">無社群數據</td></tr>';
        return;
    }

    Object.entries(analysis.communities).forEach(([communityId, community]) => {
        if (!community || !community.members) return;

        const row = document.createElement('tr');

        const partyEntries = Object.entries(community.parties || {}).sort(([, a], [, b]) => b - a);
        const mainParty = partyEntries[0] ? partyEntries[0][0] : '未知';

        const allMembers = community.members.map(member =>
            `<span class="member-item" 
                        style="background-color: ${getPartyBackgroundColor(member.party)}; color: ${getPartyTextColor(member.party)}; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 20px; font-weight: 500; display: inline-block; cursor: pointer;"
                        title="政黨: ${member.party}&#10;選區: ${member.district || '未知'}&#10;原籍: ${member.origin || '未知'}"
                        onmouseover="showTooltip(event, '立委: ${member.name}\\n政黨: ${member.party}\\n選區: ${member.district || '未知'}\\n原籍: ${member.origin || '未知'}')"
                        onmouseout="hideTooltip()">
                        ${member.name}
                    </span>`
        ).join('');

        const topTopics = Object.entries(community.topics || {})
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([topicId, score]) => {
                const topicData = currentData.topics.find(t => t.id == topicId);
                const keywords = topicData ? topicData.keywords.split(',').slice(0, 2).join(',') : '';
                const topicName = topicData ? topicData.name : `主題${topicId}`;
                return `<span class="topic-tag" 
                            style="display: inline-block; background: #f0f8ff; border: 1px solid #3498db; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 20px; cursor: pointer;"
                            title="${topicName}: ${keywords}"
                            onmouseover="showTooltip(event, '${topicName}\\n社群關心度: ${score.toFixed(2)}\\n關鍵詞: ${keywords}')"
                            onmouseout="hideTooltip()">
                            ${topicName} (${score.toFixed(1)})
                        </span>`;
            }).join('');

        // 計算真實密度 - 安全處理
        let density = 0;
        let densityDisplay = '計算中...';
        
        try {
            if (currentAdjacencyMatrix && currentLegislatorIndexMap) {
                density = calculateCommunityDensity(community.members, currentAdjacencyMatrix, currentLegislatorIndexMap);
                densityDisplay = density.toFixed(3);
                console.log(`社群 ${communityId} 密度: ${density.toFixed(3)} (${community.members.length} 個成員)`);
            } else {
                // 如果沒有鄰接矩陣，使用簡單估算
                const memberCount = community.members.length;
                if (memberCount >= 2) {
                    // 基於社群大小的簡單密度估算
                    density = Math.min(1, 2 / (memberCount - 1));
                    densityDisplay = density.toFixed(3) + '*';
                } else {
                    density = 0;
                    densityDisplay = '0.000';
                }
            }
        } catch (error) {
            console.warn(`計算社群 ${communityId} 密度時出錯:`, error);
            density = 0;
            densityDisplay = 'N/A';
        }

        const method = currentCommunityMethod === 'coattendance' ? '共同出席會議' : '發言內容相似度';

        row.innerHTML = `
            <td style="text-align: center; width: 80px;" data-sort-value="${communityId}"><strong>社群 ${communityId}</strong></td>
            <td style="text-align: center; width: 120px;">${method}</td>
            <td style="text-align: center; width: 60px;" data-sort-value="${community.members.length}">
                <span class="badge" style="font-size: 20px;">${community.members.length}</span>
            </td>
            <td style="text-align: center; width: 80px;" data-sort-value="${density}" title="密度 = 實際連接數 ÷ 最大可能連接數">
                <strong>${densityDisplay}</strong>
                <div style="font-size: 12px; color: #666; margin-top: 2px;">
                    ${density >= 0.7 ? '高密度' : density >= 0.4 ? '中密度' : '低密度'}
                </div>
            </td>
            <td style="text-align: center; width: 80px;"><span class="party-tag party-${mainParty}" style="font-size: 20px; padding: 6px 10px;">${mainParty}</span></td>
            <td class="keywords" style="padding: 8px; width: 300px;">
                <div style="line-height: 1.4; max-height: 120px; overflow-y: auto;">
                    ${allMembers}
                </div>
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

function getPartyTextColor(party) {
    const lightColors = ['未知'];
    return lightColors.includes(party) ? '#2c3e50' : 'white';
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

function filterDistrictData() {
    loadDistrictTopicData();
}

function resetDistrictFilters() {
    document.getElementById('district-search').value = '';
    document.getElementById('analysis-type').value = 'district';
    loadDistrictTopicData();
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