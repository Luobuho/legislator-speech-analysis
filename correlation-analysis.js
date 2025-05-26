// correlation-analysis.js - 相關性分析模塊

// 載入相關性計算數據
function loadCorrelationData() {
    if (!correlationData.topicScores.length && !correlationData.comprehensiveStats.length) {
        console.log('相關性數據未載入，嘗試重新載入...');
        return;
    }

    // 載入預設的子tab數據
    const activeSubTab = document.querySelector('.correlation-sub-tab.active');
    if (activeSubTab) {
        loadCorrelationSubTabData(activeSubTab.dataset.subtab);
    }
}

// 載入相關性計算子標籤數據
function loadCorrelationSubTabData(subTabId) {
    switch (subTabId) {
        case 'topic-scores':
            loadTopicScoresData();
            break;
        case 'comprehensive-stats':
            loadComprehensiveStatsData();
            break;
    }
}

// 標準化分數到100分制
function normalizeScore(value, allValues, reverse = false) {
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min;

    if (range === 0) return 50; // 如果所有值相同，返回中間值

    let normalized = ((value - min) / range) * 100;
    return reverse ? 100 - normalized : normalized;
}

// 載入立委主題分數數據
function loadTopicScoresData() {
    if (!correlationData.topicScores.length) {
        console.log('主題分數數據未載入');
        return;
    }

    // 填充立委選擇器
    populateLegislatorSelector();
}

function populateLegislatorSelector() {
    const legislatorSelector = document.getElementById('legislator-selector');

    if (legislatorSelector) {
        legislatorSelector.innerHTML = '<option value="">請選擇立委</option>';

        // 獲取所有唯一的立委名稱，並匹配政黨信息
        const legislators = [...new Set(correlationData.topicScores.map(row => row['委員姓名'] || ''))].filter(name => name);

        legislators.sort().forEach(legislatorName => {
            // 從委員ID對應表或其他數據源獲取政黨信息
            let party = '未知';

            // 嘗試從topicScores數據中獲取政黨
            const legislatorRow = correlationData.topicScores.find(row => row['委員姓名'] === legislatorName);
            if (legislatorRow && legislatorRow['政黨']) {
                party = legislatorRow['政黨'];
            } else {
                // 如果topicScores中沒有政黨信息，從currentData中查找
                const legislatorInfo = currentData.legislators.find(leg => leg.name === legislatorName);
                if (legislatorInfo && legislatorInfo.party) {
                    party = legislatorInfo.party;
                }
            }

            const option = document.createElement('option');
            option.value = legislatorName;
            option.textContent = `${legislatorName} (${party})`;
            option.dataset.party = party;
            legislatorSelector.appendChild(option);
        });
    }

    // 設置立委選擇器的變化事件
    legislatorSelector.addEventListener('change', function () {
        const selectedLegislator = this.value;
        const selectedOption = this.options[this.selectedIndex];

        if (selectedLegislator) {
            const party = selectedOption.dataset.party || '未知';
            populateTopicSelector(selectedLegislator);
            showSelectedLegislatorInfo(selectedLegislator, party);
            document.getElementById('load-topic-data-btn').disabled = false;
        } else {
            resetTopicSelector();
            hideSelectedLegislatorInfo();
            document.getElementById('load-topic-data-btn').disabled = true;
        }
    });
}

function populateTopicSelector(legislatorName) {
    const topicSelector = document.getElementById('topic-selector');
    topicSelector.innerHTML = '<option value="">所有主題</option>';
    topicSelector.disabled = false;

    // 獲取該立委的所有主題
    const legislatorTopics = correlationData.topicScores.filter(row =>
        row['委員姓名'] === legislatorName
    );

    // 按最終關心度評分排序
    legislatorTopics.sort((a, b) => {
        const scoreA = parseFloat(a['最終關心度評分'] || 0);
        const scoreB = parseFloat(b['最終關心度評分'] || 0);
        return scoreB - scoreA;
    });

    legislatorTopics.forEach(row => {
        const topicId = row['主題ID'];
        const score = parseFloat(row['最終關心度評分'] || 0);

        // 獲取主題關鍵詞和名稱
        let keywords = '未知主題';
        let topicName = `主題${topicId}`;
        const topicInfo = currentData.topics.find(t => t.id == topicId);
        if (topicInfo) {
            topicName = topicInfo.name || `主題${topicId}`;
            keywords = topicInfo.keywords.split(',').slice(0, 3).join(', ');
            if (keywords.length > 50) {
                keywords = keywords.substring(0, 50) + '...';
            }
        }

        const option = document.createElement('option');
        option.value = topicId;
        option.textContent = `${topicName} (${score.toFixed(2)}) - ${keywords}`;
        topicSelector.appendChild(option);
    });
}

function resetTopicSelector() {
    const topicSelector = document.getElementById('topic-selector');
    topicSelector.innerHTML = '<option value="">請先選擇立委</option>';
    topicSelector.disabled = true;
}

function showSelectedLegislatorInfo(legislatorName, party) {
    const infoDiv = document.getElementById('selected-legislator-info');
    const nameElement = document.getElementById('selected-legislator-name');
    const partyElement = document.getElementById('selected-legislator-party');

    nameElement.textContent = `👤 ${legislatorName}`;
    partyElement.innerHTML = `<span class="party-tag party-${party}">${party}</span>`;
    infoDiv.style.display = 'block';
}

function hideSelectedLegislatorInfo() {
    const infoDiv = document.getElementById('selected-legislator-info');
    infoDiv.style.display = 'none';
}

function loadSelectedLegislatorTopicData() {
    const selectedLegislator = document.getElementById('legislator-selector').value;
    const selectedTopic = document.getElementById('topic-selector').value;

    if (!selectedLegislator) {
        alert('請先選擇立委');
        return;
    }

    let filteredData;
    if (selectedTopic) {
        // 顯示特定主題數據
        filteredData = correlationData.topicScores.filter(row =>
            row['委員姓名'] === selectedLegislator && row['主題ID'] == selectedTopic
        );
    } else {
        // 顯示該立委的所有主題數據
        filteredData = correlationData.topicScores.filter(row =>
            row['委員姓名'] === selectedLegislator
        );
    }

    renderTopicScoresTable(filteredData, true);
}

function resetTopicScoresSelection() {
    document.getElementById('legislator-selector').value = '';
    resetTopicSelector();
    hideSelectedLegislatorInfo();
    document.getElementById('load-topic-data-btn').disabled = true;

    const tbody = document.getElementById('topic-scores-tbody');
    tbody.innerHTML = '<tr><td colspan="10" class="loading">請選擇立委查看其主題分數</td></tr>';
}

function renderTopicScoresTable(data, isLegislatorSpecific = false) {
    const tbody = document.getElementById('topic-scores-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading">無數據</td></tr>';
        return;
    }

    // 排序數據（按最終關心度評分）
    data.sort((a, b) => {
        const scoreA = parseFloat(a['最終關心度評分'] || 0);
        const scoreB = parseFloat(b['最終關心度評分'] || 0);
        return scoreB - scoreA;
    });

    // 計算需要標準化的指標
    const finalScores = data.map(row => parseFloat(row['最終關心度評分'] || 0));

    data.forEach(row => {
        const tr = document.createElement('tr');

        const topicId = row['主題ID'] || '';
        const directSpeeches = parseInt(row['直接發言次數'] || 0);
        const lowRelevance = parseInt(row['低相關發言次數'] || 0);
        const midRelevance = parseInt(row['中相關發言次數'] || 0);
        const highRelevance = parseInt(row['高相關發言次數'] || 0);
        const avgRelevance = parseFloat(row['平均相關性'] || 0);
        const maxRelevance = parseFloat(row['最大相關性'] || 0);
        const totalRelevance = parseFloat(row['總相關性'] || 0);
        const finalScore = parseFloat(row['最終關心度評分'] || 0);

        // 標準化最終關心度評分
        const normalizedFinalScore = normalizeScore(finalScore, finalScores);

        // 獲取主題關鍵詞和名稱
        let keywords = '未知主題';
        let topicName = `主題${topicId}`;
        const topicInfo = currentData.topics.find(t => t.id == topicId);
        if (topicInfo) {
            topicName = topicInfo.name || `主題${topicId}`;
            keywords = topicInfo.keywords;
            if (keywords.length > 100) {
                keywords = keywords.substring(0, 100) + '...';
            }
        }

        tr.innerHTML = `
                    <td style="text-align: center;"><strong>${topicName}</strong></td>
                    <td style="max-width: 200px; font-size: 18px;" title="${topicInfo ? topicInfo.keywords : ''}">${keywords}</td>
                    <td style="text-align: center;">${directSpeeches}</td>
                    <td style="text-align: center;">${lowRelevance}</td>
                    <td style="text-align: center;">${midRelevance}</td>
                    <td style="text-align: center;">${highRelevance}</td>
                    <td style="text-align: center;">${avgRelevance.toFixed(4)}</td>
                    <td style="text-align: center;">${maxRelevance.toFixed(4)}</td>
                    <td style="text-align: center;">${totalRelevance.toFixed(2)}</td>
                    <td style="text-align: center;" data-sort-value="${finalScore}">
                        <span class="score-normalized">${normalizedFinalScore.toFixed(1)}分</span>
                        <div class="score-original">(原值: ${finalScore.toFixed(2)})</div>
                    </td>
                `;

        tbody.appendChild(tr);
    });
}

// 載入立委綜合統計數據
function loadComprehensiveStatsData() {
    if (!correlationData.comprehensiveStats.length) {
        console.log('綜合統計數據未載入');
        return;
    }

    // 填充篩選器
    populateComprehensiveFilters();

    // 渲染表格
    renderComprehensiveStatsTable(correlationData.comprehensiveStats);
}

function populateComprehensiveFilters() {
    const partyFilter = document.getElementById('comprehensive-party-filter');

    if (partyFilter) {
        partyFilter.innerHTML = '<option value="">所有政黨</option>';

        // 獲取所有政黨，包括從其他數據源匹配的政黨
        const parties = new Set();
        correlationData.comprehensiveStats.forEach(row => {
            let party = row['政黨'] || '';

            // 如果政黨信息為空，嘗試從currentData中獲取
            if (!party || party === '未知' || party === '') {
                const legislatorInfo = currentData.legislators.find(leg => leg.name === row['委員姓名']);
                if (legislatorInfo && legislatorInfo.party) {
                    party = legislatorInfo.party;
                }
            }

            if (party && party !== '未知') {
                parties.add(party);
            }
        });

        // 排序並添加到選擇器
        [...parties].sort().forEach(party => {
            const option = document.createElement('option');
            option.value = party;
            option.textContent = party;
            partyFilter.appendChild(option);
        });
    }
}

function renderComprehensiveStatsTable(data) {
    const tbody = document.getElementById('comprehensive-stats-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading">無數據</td></tr>';
        return;
    }

    // 計算需要標準化的指標
    const totalFinalScores = data.map(row => parseFloat(row['總最終關心度'] || 0));
    const avgFinalScores = data.map(row => parseFloat(row['平均最終關心度'] || 0));
    const specializations = data.map(row => parseFloat(row['專業度'] || 0));
    const efficiencies = data.map(row => parseFloat(row['發言效率'] || 0));

    data.forEach(row => {
        const tr = document.createElement('tr');

        const legislator = row['委員姓名'] || '';
        let party = row['政黨'] || '';

        // 如果政黨信息為空或未知，嘗試從currentData中獲取
        if (!party || party === '未知' || party === '') {
            const legislatorInfo = currentData.legislators.find(leg => leg.name === legislator);
            if (legislatorInfo && legislatorInfo.party) {
                party = legislatorInfo.party;
            } else {
                party = '未知';
            }
        }

        const totalFinalScore = parseFloat(row['總最終關心度'] || 0);
        const avgFinalScore = parseFloat(row['平均最終關心度'] || 0);
        const topicCount = parseInt(row['關注主題數'] || 0);
        const totalSpeeches = parseInt(row['總發言次數'] || 0);
        const specialization = parseFloat(row['專業度'] || 0);
        const efficiency = parseFloat(row['發言效率'] || 0);
        const avgRelevance = parseFloat(row['平均相關性'] || 0);

        // 標準化分數
        const normalizedTotalScore = normalizeScore(totalFinalScore, totalFinalScores);
        const normalizedAvgScore = normalizeScore(avgFinalScore, avgFinalScores);
        const normalizedSpecialization = normalizeScore(specialization, specializations);
        const normalizedEfficiency = normalizeScore(efficiency, efficiencies);

        tr.innerHTML = `
                    <td style="text-align: center;"><strong>${legislator}</strong></td>
                    <td style="text-align: center;"><span class="party-tag party-${party}">${party}</span></td>
                    <td style="text-align: center;" data-sort-value="${totalFinalScore}">
                        <span class="score-normalized">${normalizedTotalScore.toFixed(1)}分</span>
                        <div class="score-original">(原值: ${totalFinalScore.toFixed(2)})</div>
                    </td>
                    <td style="text-align: center;" data-sort-value="${avgFinalScore}">
                        <span class="score-normalized">${normalizedAvgScore.toFixed(1)}分</span>
                        <div class="score-original">(原值: ${avgFinalScore.toFixed(2)})</div>
                    </td>
                    <td style="text-align: center;">${topicCount}</td>
                    <td style="text-align: center;" data-sort-value="${specialization}">
                        <span class="score-normalized">${normalizedSpecialization.toFixed(1)}分</span>
                        <div class="score-original">(原值: ${specialization.toFixed(2)})</div>
                    </td>
                    <td style="text-align: center;" data-sort-value="${efficiency}">
                        <span class="score-normalized">${normalizedEfficiency.toFixed(1)}分</span>
                        <div class="score-original">(原值: ${efficiency.toFixed(4)})</div>
                    </td>
                    <td style="text-align: center;">${totalSpeeches}</td>
                    <td style="text-align: center;">${avgRelevance.toFixed(4)}</td>
                `;

        tbody.appendChild(tr);
    });
}

// 篩選相關性數據的函數
function filterTopicScoresData() {
    // 這個函數現在由loadSelectedLegislatorTopicData()替代
    loadSelectedLegislatorTopicData();
}

function resetTopicScoresFilters() {
    // 這個函數現在由resetTopicScoresSelection()替代
    resetTopicScoresSelection();
}

function filterComprehensiveData() {
    const searchTerm = document.getElementById('comprehensive-search').value.toLowerCase();
    const selectedParty = document.getElementById('comprehensive-party-filter').value;

    let filtered = correlationData.comprehensiveStats.filter(row => {
        const legislator = (row['委員姓名'] || '').toLowerCase();
        let party = row['政黨'] || '';

        // 如果政黨信息為空，嘗試從currentData中獲取
        if (!party || party === '未知' || party === '') {
            const legislatorInfo = currentData.legislators.find(leg => leg.name === row['委員姓名']);
            if (legislatorInfo && legislatorInfo.party) {
                party = legislatorInfo.party;
            }
        }

        const matchesSearch = !searchTerm || legislator.includes(searchTerm);
        const matchesParty = !selectedParty || party === selectedParty;

        return matchesSearch && matchesParty;
    });

    renderComprehensiveStatsTable(filtered);
}

function resetComprehensiveFilters() {
    document.getElementById('comprehensive-search').value = '';
    if (document.getElementById('comprehensive-party-filter')) {
        document.getElementById('comprehensive-party-filter').value = '';
    }
    renderComprehensiveStatsTable(correlationData.comprehensiveStats);
}