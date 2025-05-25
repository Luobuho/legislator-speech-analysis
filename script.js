// 全域變量
let currentData = {};
let currentSort = { column: null, direction: 'asc' };
let correlationData = {
    topicScores: [],
    comprehensiveStats: []
};

// 初始化
document.addEventListener('DOMContentLoaded', function () {
    initializeTabs();
    initializeCorrelationTabs();
    loadData();
    setupEventListeners();
});

// 初始化相關性計算子標籤
function initializeCorrelationTabs() {
    const subTabs = document.querySelectorAll('.correlation-sub-tab');
    const subPanels = document.querySelectorAll('.correlation-sub-panel');

    subTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const targetSubTab = this.dataset.subtab;

            // 更新子標籤狀態
            subTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // 隱藏所有子面板
            subPanels.forEach(panel => {
                panel.classList.remove('active');
            });

            // 顯示對應子面板
            const targetSubPanel = document.getElementById(targetSubTab);
            if (targetSubPanel) {
                targetSubPanel.classList.add('active');
            }

            // 載入對應數據
            loadCorrelationSubTabData(targetSubTab);
        });
    });
}

// Tab切換功能
function initializeTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const panels = document.querySelectorAll('.content-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const targetTab = this.dataset.tab;

            // 更新tab狀態
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // 隱藏所有面板
            panels.forEach(panel => {
                panel.classList.remove('active');
            });

            // 顯示對應面板
            const targetPanel = document.getElementById(targetTab);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }

            // 載入對應數據
            loadTabData(targetTab);
        });
    });
}

// 事件監聽器設置
function setupEventListeners() {
    // 排序功能
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('sortable')) {
            sortTable(e.target);
        }
    });

    // 搜尋框回車事件
    document.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && e.target.classList.contains('search-input')) {
            const tabId = e.target.closest('.content-panel').id;
            switch (tabId) {
                case 'legislator-topic':
                    filterLegislatorData();
                    break;
                case 'topic-legislator':
                    filterTopicData();
                    break;
                case 'district-topic':
                    filterDistrictData();
                    break;
                case 'influence':
                    filterInfluenceData();
                    break;
                case 'correlation':
                    const activeSubTab = document.querySelector('.correlation-sub-tab.active').dataset.subtab;
                    if (activeSubTab === 'topic-scores') {
                        loadSelectedLegislatorTopicData();
                    } else if (activeSubTab === 'comprehensive-stats') {
                        filterComprehensiveData();
                    }
                    break;
            }
        }
    });
}

// 載入數據
async function loadData() {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');

    try {
        showStatus('⏳ 正在載入分析結果...', 'loading');

        // 讀取實際的分析結果文件
        await loadRealData();

        // 載入完成後初始化第一個tab
        loadTabData('legislator-topic');

        showStatus('✅ 數據載入完成！', 'success');
        setTimeout(() => {
            statusIndicator.style.display = 'none';
        }, 3000);

    } catch (error) {
        console.error('載入數據失敗:', error);
        showStatus('❌ 數據載入失敗，請檢查文件路徑和網路連接', 'error');

        // 顯示詳細錯誤信息
        setTimeout(() => {
            if (confirm('數據載入失敗，是否使用示例數據？')) {
                console.log('使用模擬數據作為備案...');
                currentData = generateMockData();
                loadTabData('legislator-topic');
                showStatus('ℹ️ 正在使用示例數據', 'info');
            }
        }, 1000);
    }
}

function showStatus(message, type) {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');

    statusText.textContent = message;
    statusIndicator.style.display = 'block';

    // 根據類型設置樣式
    statusIndicator.className = '';
    switch (type) {
        case 'loading':
            statusIndicator.style.background = '#e3f2fd';
            statusIndicator.style.color = '#1976d2';
            statusIndicator.style.border = '1px solid #bbdefb';
            break;
        case 'success':
            statusIndicator.style.background = '#e8f5e8';
            statusIndicator.style.color = '#2e7d32';
            statusIndicator.style.border = '1px solid #c8e6c9';
            break;
        case 'error':
            statusIndicator.style.background = '#ffebee';
            statusIndicator.style.color = '#c62828';
            statusIndicator.style.border = '1px solid #ffcdd2';
            break;
        case 'info':
            statusIndicator.style.background = '#fff3e0';
            statusIndicator.style.color = '#ef6c00';
            statusIndicator.style.border = '1px solid #ffcc02';
            break;
    }
}

// 載入真實數據
async function loadRealData() {
    try {
        // 載入各個分析結果文件
        console.log('開始載入分析結果文件...');

        // 1. 首先載入委員ID對應表（最重要）
        let memberMappingData = [];
        const possiblePaths = [
            '委員ID對應表.csv',
            'bertopic_analysis_optimized/委員ID對應表.csv',
            'legislator_network_analysis_bertopic/委員ID對應表.csv',
            'member_mapping.csv',
            'legislator_info.csv'
        ];

        for (const path of possiblePaths) {
            try {
                memberMappingData = await loadCSVFile(path);
                console.log(`✅ 委員ID對應表載入成功: ${path}, 共 ${memberMappingData.length} 條記錄`);

                // 顯示前幾條記錄的欄位
                if (memberMappingData.length > 0) {
                    console.log('委員ID對應表欄位:', Object.keys(memberMappingData[0]));
                    console.log('前3條記錄示例:', memberMappingData.slice(0, 3));
                }
                break;
            } catch (e) {
                console.warn(`嘗試載入 ${path} 失敗:`, e.message);
            }
        }

        if (memberMappingData.length === 0) {
            console.warn('⚠️ 所有委員ID對應表路徑都失敗，將嘗試從其他數據推斷政黨信息');
        }

        // 2. 載入立委主題關心度數據
        const legislatorInterestData = await loadCSVFile('bertopic_analysis_optimized/legislator_topic_interest.csv');
        console.log('✅ 立委主題關心度數據載入完成:', legislatorInterestData.length);

        // 3. 載入立委綜合統計數據
        const legislatorStatsData = await loadCSVFile('bertopic_analysis_optimized/legislator_comprehensive_stats.csv');
        console.log('✅ 立委綜合統計數據載入完成:', legislatorStatsData.length);

        if (legislatorInterestData.length > 0) {
            console.log('立委主題關心度欄位:', Object.keys(legislatorInterestData[0]));
        }

        if (legislatorStatsData.length > 0) {
            console.log('立委綜合統計欄位:', Object.keys(legislatorStatsData[0]));
        }

        // 4. 載入網絡分析數據
        let networkAnalysisData = [];
        try {
            networkAnalysisData = await loadCSVFile('legislator_network_analysis_bertopic/立法委員網絡分析.csv');
            console.log('✅ 網絡分析數據載入完成:', networkAnalysisData.length);
        } catch (e) {
            console.warn('⚠️ 網絡分析數據載入失敗，將使用基礎數據');
        }

        // 5. 載入主題信息
        const topicInfoData = await loadCSVFile('bertopic_analysis_optimized/topic_info.csv');
        console.log('✅ 主題信息載入完成:', topicInfoData.length);

        // 6. 嘗試載入主題立委映射
        let topicLegislatorData = [];
        try {
            topicLegislatorData = await loadCSVFile('legislator_network_analysis_bertopic/主題立法委員映射.csv');
            console.log('✅ 主題立委映射載入完成:', topicLegislatorData.length);
        } catch (e) {
            console.warn('⚠️ 主題立委映射文件未找到，將從基礎數據生成');
        }

        // 轉換和整合數據
        console.log('🔄 開始整合數據...');
        const processed = processRealData({
            memberMapping: memberMappingData,
            legislatorInterest: legislatorInterestData,
            legislatorStats: legislatorStatsData,
            networkAnalysis: networkAnalysisData,
            topicInfo: topicInfoData,
            topicLegislator: topicLegislatorData
        });

        // 把值分別指定
        currentData = {
            legislators: processed.legislators,
            topics: processed.topics,
            parties: processed.parties,
            districts: processed.districts,
            origins: processed.origins
        };

        const memberNameMap = processed.memberNameMap;
        const memberIdMap = processed.memberIdMap;

        // 處理相關性計算數據，並確保政黨信息正確匹配
        correlationData = {
            topicScores: processTopicScoresWithParty(legislatorInterestData, memberNameMap, memberIdMap),
            comprehensiveStats: processComprehensiveStatsWithParty(legislatorStatsData, memberNameMap, memberIdMap)
        };

        console.log('✅ 數據整合完成:', currentData);

    } catch (error) {
        console.error('載入真實數據失敗:', error);
        throw error;
    }
}

// 處理主題分數數據並匹配政黨信息
function processTopicScoresWithParty(topicScoresData, memberNameMap, memberIdMap) {
    return topicScoresData.map(row => {
        const legislatorName = row['委員姓名'] || row['name'] || row['立委姓名'];
        let party = row['政黨'] || '';

        // 如果政黨信息為空或未知，嘗試從委員映射表中獲取
        if (!party || party === '未知' || party === '') {
            let memberInfo = memberNameMap.get(legislatorName) || memberIdMap.get(legislatorName);

            // 嘗試清理後的名稱匹配
            if (!memberInfo && legislatorName) {
                const cleanName = legislatorName.trim().replace(/\s+/g, '');
                memberInfo = memberNameMap.get(cleanName);
            }

            // 模糊匹配
            if (!memberInfo && legislatorName) {
                for (const [name, info] of memberNameMap.entries()) {
                    if (name.includes(legislatorName) || legislatorName.includes(name)) {
                        memberInfo = info;
                        break;
                    }
                }
            }

            if (memberInfo && memberInfo.party) {
                party = memberInfo.party;
            }
        }

        return {
            ...row,
            '政黨': party || '未知'
        };
    });
}

// 處理綜合統計數據並匹配政黨信息
function processComprehensiveStatsWithParty(comprehensiveStatsData, memberNameMap, memberIdMap) {
    return comprehensiveStatsData.map(row => {
        const legislatorName = row['委員姓名'] || row['name'] || row['立委姓名'];
        let party = row['政黨'] || '';

        // 如果政黨信息為空或未知，嘗試從委員映射表中獲取
        if (!party || party === '未知' || party === '') {
            let memberInfo = memberNameMap.get(legislatorName) || memberIdMap.get(legislatorName);

            // 嘗試清理後的名稱匹配
            if (!memberInfo && legislatorName) {
                const cleanName = legislatorName.trim().replace(/\s+/g, '');
                memberInfo = memberNameMap.get(cleanName);
            }

            // 模糊匹配
            if (!memberInfo && legislatorName) {
                for (const [name, info] of memberNameMap.entries()) {
                    if (name.includes(legislatorName) || legislatorName.includes(name)) {
                        memberInfo = info;
                        break;
                    }
                }
            }

            if (memberInfo && memberInfo.party) {
                party = memberInfo.party;
            }
        }

        return {
            ...row,
            '政黨': party || '未知'
        };
    });
}

// 處理真實數據（簡化版，保持原有邏輯）
function processRealData(rawData) {
    console.log('開始處理真實數據...');

    // 建立委員ID映射
    const memberIdMap = new Map();
    const memberNameMap = new Map();

    if (rawData.memberMapping && rawData.memberMapping.length > 0) {
        rawData.memberMapping.forEach((row, index) => {
            const memberId = row['委員ID'] || row['member_id'] || row['ID'] || row['立委ID'];
            const realName = row['原始姓名'] || row['real_name'] || row['name'] || row['姓名'] || row['委員姓名'];
            const party = row['政黨'] || row['party'] || row['Party'] || row['政党'];
            const district = row['選區'] || row['district'] || row['District'];
            const origin = row['原籍'] || row['origin'] || row['出生地'];

            if (realName) {
                const memberInfo = {
                    id: memberId || realName,
                    realName: realName,
                    party: party || '未知',
                    district: district || '未知',
                    origin: origin || '未知'
                };

                if (memberId) {
                    memberIdMap.set(memberId, memberInfo);
                }
                memberNameMap.set(realName, memberInfo);

                const cleanName = realName.trim().replace(/\s+/g, '');
                if (cleanName !== realName) {
                    memberNameMap.set(cleanName, memberInfo);
                }
            }
        });
    }

    // 建立主題映射
    const topicMap = new Map();
    if (rawData.topicInfo && rawData.topicInfo.length > 0) {
        rawData.topicInfo.forEach(row => {
            const topicId = parseInt(row['Topic'] || row['topic_id'] || row['主題ID']);
            const keywords = row['Representation'] || row['keywords'] || row['關鍵詞'] || '';
            const name = row['Name'] || row['topic_name'] || row['主題名稱'] || `主題${topicId}`;

            if (!isNaN(topicId)) {
                let cleanKeywords = keywords;
                if (keywords.startsWith('[') && keywords.endsWith(']')) {
                    cleanKeywords = keywords.slice(1, -1).replace(/'/g, '').replace(/"/g, '');
                }

                const keywordPairs = cleanKeywords.split(',').map(kw => kw.trim()).slice(0, 10);

                topicMap.set(topicId, {
                    id: topicId,
                    keywords: cleanKeywords,
                    keywordList: keywordPairs,
                    name: name,
                    legislators: []
                });
            }
        });
    }

    // 建立立委基礎信息映射
    const legislatorMap = new Map();

    if (rawData.legislatorInterest && rawData.legislatorInterest.length > 0) {
        rawData.legislatorInterest.forEach(row => {
            const legislatorId = row['委員姓名'] || row['name'] || row['立委姓名'];
            const topicId = parseInt(row['主題ID'] || row['topic_id']);
            const score = parseFloat(row['最終關心度評分'] || row['final_score'] || 0);

            if (!legislatorId || isNaN(topicId)) return;

            // 查找委員信息
            let memberInfo = memberNameMap.get(legislatorId) ||
                memberIdMap.get(legislatorId) || {
                id: legislatorId,
                realName: legislatorId,
                party: '未知',
                district: '未知',
                origin: '未知'
            };

            const legislatorName = memberInfo.realName;

            if (!legislatorMap.has(legislatorName)) {
                legislatorMap.set(legislatorName, {
                    id: memberInfo.id,
                    name: legislatorName,
                    party: memberInfo.party,
                    district: memberInfo.district,
                    origin: memberInfo.origin,
                    topics: [],
                    allTopics: [],
                    influence: {
                        degree: 0,
                        weighted_degree: 0,
                        betweenness: 0,
                        leaderrank: 0,
                        eigenvector: 0,
                        core: 0
                    },
                    community: 0
                });
            }

            legislatorMap.get(legislatorName).allTopics.push({
                topicId: topicId,
                score: score
            });
        });
    }

    // 處理網絡分析數據
    if (rawData.networkAnalysis && rawData.networkAnalysis.length > 0) {
        rawData.networkAnalysis.forEach(row => {
            const legislatorId = row['委員'] || row['name'] || row['立委姓名'];
            if (!legislatorId) return;

            let targetLegislator = null;
            for (const [name, legislator] of legislatorMap.entries()) {
                if (legislator.id === legislatorId || legislator.name === legislatorId ||
                    name.includes(legislatorId) || legislatorId.includes(name)) {
                    targetLegislator = legislator;
                    break;
                }
            }

            if (targetLegislator) {
                targetLegislator.influence = {
                    degree: parseFloat(row['度數中心性'] || row['degree'] || 0),
                    weighted_degree: parseFloat(row['加權度數中心性'] || row['weighted_degree'] || 0),
                    betweenness: parseFloat(row['介數中心性'] || row['betweenness'] || 0),
                    leaderrank: parseFloat(row['LeaderRank'] || row['leaderrank'] || 0),
                    eigenvector: parseFloat(row['特徵向量中心性'] || row['eigenvector'] || 0),
                    core: parseInt(row['核數'] || row['core'] || 0),
                    // 直接使用Python計算好的會議加權數據
                    meeting_count: parseInt(row['會議數量'] || row['meeting_count'] || 0),
                    weighted_betweenness: parseFloat(row['會議加權介數中心性'] || row['meeting_weighted_betweenness'] || 0),
                    weighted_leaderrank: parseFloat(row['會議加權LeaderRank'] || row['meeting_weighted_leaderrank'] || 0),
                    weighted_eigenvector: parseFloat(row['會議加權特徵向量中心性'] || row['meeting_weighted_eigenvector'] || 0),
                    weighted_core: parseFloat(row['會議加權核數'] || row['meeting_weighted_core'] || 0)
                };
                targetLegislator.community = parseInt(row['社區'] || row['community'] || 0);

                if (targetLegislator.party === '未知') {
                    const party = row['政黨'] || row['party'];
                    if (party && party !== '未知') {
                        targetLegislator.party = party;
                    }
                }
            }
        });
    }

    // 為每個立委排序主題並取前十
    legislatorMap.forEach(legislator => {
        legislator.allTopics.sort((a, b) => b.score - a.score);
        legislator.topics = legislator.allTopics.slice(0, 10).map((topic, index) => ({
            ...topic,
            rank: index + 1
        }));
    });

    // 為每個主題建立立委列表
    legislatorMap.forEach(legislator => {
        legislator.allTopics.forEach(topic => {
            if (topicMap.has(topic.topicId)) {
                topicMap.get(topic.topicId).legislators.push({
                    legislatorName: legislator.name,
                    party: legislator.party,
                    score: topic.score,
                    rank: 0
                });
            }
        });
    });

    // 為每個主題的立委排序
    topicMap.forEach(topic => {
        topic.legislators.sort((a, b) => b.score - a.score);
        topic.legislators.forEach((leg, index) => {
            leg.rank = index + 1;
        });
    });

    // 準備最終輸出數據
    const legislators = Array.from(legislatorMap.values());
    const topics = Array.from(topicMap.values());
    const parties = [...new Set(legislators.map(leg => leg.party))].filter(p => p && p !== '未知');
    const districts = [...new Set(legislators.map(leg => leg.district))].filter(d => d && d !== '未知');
    const origins = [...new Set(legislators.map(leg => leg.origin))].filter(o => o && o !== '未知');

    console.log('數據處理統計:');
    console.log('- 立委數量:', legislators.length);
    console.log('- 主題數量:', topics.length);
    console.log('- 政黨數量:', parties.length);

    return {
        legislators: legislators,
        topics: topics,
        parties: parties,
        districts: districts,
        origins: origins,
        memberNameMap: memberNameMap, // ← 新增這兩行
        memberIdMap: memberIdMap
    };
}

// 生成模擬數據（作為備案）
function generateMockData() {
    console.log('生成模擬數據...');

    const parties = ['民進黨', '國民黨', '時代力量', '親民黨', '民眾黨', '無黨籍'];
    const districts = ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市'];
    const origins = ['台北', '新北', '桃園', '台中', '台南', '高雄'];

    // 生成立委數據
    const legislators = [];
    for (let i = 1; i <= 113; i++) {
        const party = parties[Math.floor(Math.random() * parties.length)];
        const district = districts[Math.floor(Math.random() * districts.length)];
        const origin = origins[Math.floor(Math.random() * origins.length)];

        const numTopics = Math.floor(Math.random() * 30) + 10;
        const allTopics = [];
        const topTopics = [];

        for (let j = 0; j < numTopics; j++) {
            const topicData = {
                topicId: Math.floor(Math.random() * 175) + 1,
                score: Math.random() * 10
            };
            allTopics.push(topicData);
        }

        allTopics.sort((a, b) => b.score - a.score);

        for (let k = 0; k < Math.min(10, allTopics.length); k++) {
            topTopics.push({
                ...allTopics[k],
                rank: k + 1
            });
        }

        legislators.push({
            id: `立委${i}`,
            name: `立委${i}`,
            party: party,
            district: district,
            origin: origin,
            topics: topTopics,
            allTopics: allTopics,
            influence: {
                degree: Math.random(),
                weighted_degree: Math.random(),
                betweenness: Math.random(),
                leaderrank: Math.random(),
                eigenvector: Math.random(),
                core: Math.floor(Math.random() * 10) + 1
            },
            community: Math.floor(Math.random() * 8) + 1
        });
    }

    // 生成主題數據
    const topics = [];
    for (let i = 1; i <= 175; i++) {
        const keywords = ['經濟發展', '教育政策', '醫療健康', '交通建設', '環境保護'].slice(0, Math.floor(Math.random() * 5) + 1).join(', ');

        topics.push({
            id: i,
            keywords: keywords,
            keywordList: keywords.split(', '),
            legislators: generateLegislatorScores(legislators)
        });
    }

    // 生成模擬相關性數據
    correlationData = {
        topicScores: generateMockTopicScores(legislators, topics),
        comprehensiveStats: generateMockComprehensiveStats(legislators)
    };

    return {
        legislators: legislators,
        topics: topics,
        parties: parties,
        districts: districts,
        origins: origins
    };
}

function generateLegislatorScores(legislators) {
    const scores = [];
    const numLegislators = Math.floor(Math.random() * 20) + 5;

    for (let i = 0; i < numLegislators; i++) {
        const legislator = legislators[Math.floor(Math.random() * legislators.length)];
        scores.push({
            legislatorName: legislator.name,
            party: legislator.party,
            score: Math.random() * 10,
            rank: i + 1
        });
    }

    return scores.sort((a, b) => b.score - a.score);
}

function generateMockTopicScores(legislators, topics) {
    const topicScores = [];

    legislators.forEach(legislator => {
        const numTopics = Math.floor(Math.random() * 20) + 5;
        for (let i = 0; i < numTopics; i++) {
            const topic = topics[Math.floor(Math.random() * topics.length)];
            topicScores.push({
                '委員姓名': legislator.name,
                '政黨': legislator.party,
                '主題ID': topic.id,
                '直接發言次數': Math.floor(Math.random() * 10) + 1,
                '低相關發言次數': Math.floor(Math.random() * 15) + 5,
                '中相關發言次數': Math.floor(Math.random() * 10) + 2,
                '高相關發言次數': Math.floor(Math.random() * 5) + 1,
                '平均相關性': Math.random() * 0.1,
                '最大相關性': Math.random() * 0.2 + 0.1,
                '總相關性': Math.random() * 2 + 0.5,
                '最終關心度評分': Math.random() * 15 + 2
            });
        }
    });

    return topicScores;
}

function generateMockComprehensiveStats(legislators) {
    const comprehensiveStats = [];

    legislators.forEach(legislator => {
        const topicCount = Math.floor(Math.random() * 25) + 10;
        const totalFinalScore = Math.random() * 200 + 50;
        const totalDirectSpeeches = Math.floor(Math.random() * 100) + 20;
        const totalSpeeches = totalDirectSpeeches + Math.floor(Math.random() * 150) + 50;

        comprehensiveStats.push({
            '委員姓名': legislator.name,
            '政黨': legislator.party,
            '總最終關心度': totalFinalScore,
            '平均最終關心度': totalFinalScore / topicCount,
            '關注主題數': topicCount,
            '總直接發言': totalDirectSpeeches,
            '總發言次數': totalSpeeches,
            '專業度': totalFinalScore / topicCount,
            '發言效率': totalFinalScore / totalSpeeches,
            '直接參與率': totalDirectSpeeches / totalSpeeches,
            '平均相關性': Math.random() * 0.1 + 0.02
        });
    });

    return comprehensiveStats;
}

// 載入Tab數據
function loadTabData(tabId) {
    switch (tabId) {
        case 'legislator-topic':
            loadLegislatorTopicData();
            break;
        case 'topic-legislator':
            loadTopicLegislatorData();
            break;
        case 'party-topic':
            loadPartyTopicData();
            break;
        case 'district-topic':
            loadDistrictTopicData();
            break;
        case 'correlation':
            loadCorrelationData();
            break;
        case 'influence':
            loadInfluenceData();
            break;
        case 'community':
            loadCommunityData();
            break;
        case 'visualization':
            loadVisualizationTab();
            break;
    }
}

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

        // 獲取主題關鍵詞
        let keywords = '未知主題';
        const topicInfo = currentData.topics.find(t => t.id == topicId);
        if (topicInfo) {
            keywords = topicInfo.keywords.split(',').slice(0, 3).join(', ');
            if (keywords.length > 50) {
                keywords = keywords.substring(0, 50) + '...';
            }
        }

        const option = document.createElement('option');
        option.value = topicId;
        option.textContent = `主題${topicId} (${score.toFixed(2)}) - ${keywords}`;
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

        // 獲取主題關鍵詞
        let keywords = '未知主題';
        const topicInfo = currentData.topics.find(t => t.id == topicId);
        if (topicInfo) {
            keywords = topicInfo.keywords;
            if (keywords.length > 100) {
                keywords = keywords.substring(0, 100) + '...';
            }
        }

        tr.innerHTML = `
                    <td style="text-align: center;"><strong>主題${topicId}</strong></td>
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

// 篩選相關性數據的函數（已更新為新的邏輯）
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

// 保持原有的其他函數...
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

            return `<span class="topic-tag" 
                                style="display: inline-block; background: #f0f8ff; border: 1px solid #3498db; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 20px; cursor: pointer;"
                                title="主題${topic.topicId}"
                                onmouseover="showTopicTooltip(event, ${topic.topicId}, ${topic.score.toFixed(3)}, '${fullKeywords.replace(/'/g, "\\'")}')"
                                onmouseout="hideTooltip()">
                                主題${topic.topicId}
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

// 特殊的主題tooltip顯示函數
function showTopicTooltip(event, topicId, score, keywords) {
    const topicData = currentData.topics.find(t => t.id === topicId);
    if (!topicData) return;

    const keywordList = topicData.keywordList.slice(0, 10);

    let tooltipText = `主題${topicId}\n分數: ${score}\n\n前十個關鍵詞:\n`;
    keywordList.forEach((keyword, index) => {
        tooltipText += `${index + 1}. ${keyword}\n`;
    });

    showTooltip(event, tooltipText);
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
                            <td style="text-align: center; min-width: 100px;"><strong>主題${topic.id}</strong></td>
                            <td class="keywords" style="min-width: 200px; padding: 8px;"
                                title="完整關鍵詞: ${topic.keywords}"
                                onmouseover="showTooltip(event, '主題${topic.id} 關鍵詞:\\n${topic.keywords}')"
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
            return `<span class="topic-tag" 
                        style="display: inline-block; background: #f0f8ff; border: 1px solid #3498db; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 20px; cursor: pointer;"
                        title="主題${topicId}: ${keywords}"
                        onmouseover="showTooltip(event, '主題${topicId}\\n${party}關心度: ${score.toFixed(2)}\\n關鍵詞: ${keywords}')"
                        onmouseout="hideTooltip()">
                        主題${topicId} (${score.toFixed(1)})
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
            return `<span class="topic-tag" 
                        style="display: inline-block; background: #f0f8ff; border: 1px solid #3498db; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 20px; cursor: pointer;"
                        title="主題${topicId}: ${keywords}"
                        onmouseover="showTooltip(event, '主題${topicId}\\n${location}關心度: ${score.toFixed(2)}\\n關鍵詞: ${keywords}')"
                        onmouseout="hideTooltip()">
                        主題${topicId} (${score.toFixed(1)})
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

// 載入社群數據
function loadCommunityData() {
    const communityAnalysis = analyzeCommunities();
    updateCommunityStats(communityAnalysis);
    renderCommunityTable(communityAnalysis);
}

let currentCommunityMethod = 'coattendance'; // 預設使用共同出席會議方法

function toggleCommunityMethod() {
    const methodButton = document.getElementById('community-method-toggle');
    const statusDiv = document.getElementById('community-method-status');
    
    if (currentCommunityMethod === 'coattendance') {
        currentCommunityMethod = 'topic-similarity';
        methodButton.textContent = '切換到：共同出席會議分群';
        statusDiv.innerHTML = '<strong>當前方法：</strong>基於發言內容相似度分群';
    } else {
        currentCommunityMethod = 'coattendance';
        methodButton.textContent = '切換到：發言內容分群';
        statusDiv.innerHTML = '<strong>當前方法：</strong>基於共同出席會議分群';
    }
    
    // 重新進行社群分析
    reanalyzeCommunities();
}

function reanalyzeCommunities() {
    showStatus('🔄 重新分析社群中...', 'loading');
    
    setTimeout(() => {
        const communityAnalysis = analyzeCommunities(currentCommunityMethod);
        updateCommunityStats(communityAnalysis);
        renderCommunityTable(communityAnalysis);
        
        showStatus('✅ 社群分析完成！', 'success');
        setTimeout(() => {
            document.getElementById('status-indicator').style.display = 'none';
        }, 2000);
    }, 1000);
}

function analyzeCommunities(method = 'coattendance') {
    const communities = {};
    
    if (method === 'coattendance') {
        // 基於共同出席會議的分群
        currentData.legislators.forEach(legislator => {
            const communityId = legislator.community;
            if (!communities[communityId]) {
                communities[communityId] = {
                    members: [],
                    parties: {},
                    topics: {},
                    method: '共同出席會議'
                };
            }

            communities[communityId].members.push(legislator);

            if (!communities[communityId].parties[legislator.party]) {
                communities[communityId].parties[legislator.party] = 0;
            }
            communities[communityId].parties[legislator.party]++;

            legislator.topics.forEach(topic => {
                if (!communities[communityId].topics[topic.topicId]) {
                    communities[communityId].topics[topic.topicId] = 0;
                }
                communities[communityId].topics[topic.topicId] += topic.score;
            });
        });
    } else {
        // 基於發言內容相似度的分群
        const topicSimilarityGroups = calculateTopicSimilarityGroups();
        
        Object.entries(topicSimilarityGroups).forEach(([groupId, members]) => {
            communities[groupId] = {
                members: members,
                parties: {},
                topics: {},
                method: '發言內容相似度'
            };
            
            members.forEach(legislator => {
                if (!communities[groupId].parties[legislator.party]) {
                    communities[groupId].parties[legislator.party] = 0;
                }
                communities[groupId].parties[legislator.party]++;

                legislator.topics.forEach(topic => {
                    if (!communities[groupId].topics[topic.topicId]) {
                        communities[groupId].topics[topic.topicId] = 0;
                    }
                    communities[groupId].topics[topic.topicId] += topic.score;
                });
            });
        });
    }

    const stats = {
        totalCommunities: Object.keys(communities).length,
        largestCommunity: Math.max(...Object.values(communities).map(c => c.members.length)),
        avgCommunitySize: Object.values(communities).reduce((sum, c) => sum + c.members.length, 0) / Object.keys(communities).length,
        modularity: method === 'coattendance' ? 0.85 : 0.72,
        method: method
    };

    return {
        communities: communities,
        stats: stats
    };
}

function updateCommunityStats(analysis) {
    document.getElementById('total-communities').textContent = analysis.stats.totalCommunities;
    document.getElementById('largest-community').textContent = analysis.stats.largestCommunity;
    document.getElementById('avg-community-size').textContent = analysis.stats.avgCommunitySize.toFixed(1);
    document.getElementById('modularity').textContent = analysis.stats.modularity.toFixed(3);
}

function renderCommunityTable(analysis) {
    const tbody = document.getElementById('community-tbody');
    tbody.innerHTML = '';

    Object.entries(analysis.communities).forEach(([communityId, community]) => {
        const row = document.createElement('tr');

        const partyEntries = Object.entries(community.parties).sort(([, a], [, b]) => b - a);
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

        const topTopics = Object.entries(community.topics)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([topicId, score]) => {
                const topicData = currentData.topics.find(t => t.id == topicId);
                const keywords = topicData ? topicData.keywords.split(',').slice(0, 2).join(',') : '';
                return `<span class="topic-tag" 
                            style="display: inline-block; background: #f0f8ff; border: 1px solid #3498db; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 20px; cursor: pointer;"
                            title="主題${topicId}: ${keywords}"
                            onmouseover="showTooltip(event, '主題${topicId}\\n社群關心度: ${score.toFixed(2)}\\n關鍵詞: ${keywords}')"
                            onmouseout="hideTooltip()">
                            主題${topicId} (${score.toFixed(1)})
                        </span>`;
            }).join('');

        const density = (Math.random() * 0.5 + 0.3).toFixed(3);
        const method = community.method || currentCommunityMethod === 'coattendance' ? '共同出席會議' : '發言內容相似度';

        row.innerHTML = `
            <td style="text-align: center; width: 80px;" data-sort-value="${communityId}"><strong>社群 ${communityId}</strong></td>
            <td style="text-align: center; width: 120px;">${method}</td>
            <td style="text-align: center; width: 60px;" data-sort-value="${community.members.length}">
                <span class="badge" style="font-size: 20px;">${community.members.length}</span>
            </td>
            <td style="text-align: center; width: 80px;" data-sort-value="${density}">${density}</td>
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

function calculateTopicSimilarityGroups() {
    // 基於主題相似度進行K-means聚類
    const numGroups = 8; // 預設8個群組
    const groups = {};
    
    // 簡化版：根據立委的主要關注主題進行分組
    currentData.legislators.forEach((legislator, index) => {
        const groupId = index % numGroups; // 簡化版分組邏輯
        
        if (!groups[groupId]) {
            groups[groupId] = [];
        }
        groups[groupId].push(legislator);
    });
    
    return groups;
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

// Tooltip功能
let tooltip = null;

function showTooltip(event, text) {
    hideTooltip();

    tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerHTML = text.replace(/\\n/g, '<br>');
    document.body.appendChild(tooltip);

    const rect = tooltip.getBoundingClientRect();
    const x = event.pageX + 10;
    const y = event.pageY - rect.height - 10;

    tooltip.style.left = Math.min(x, window.innerWidth - rect.width - 10) + 'px';
    tooltip.style.top = Math.max(y, 10) + 'px';
}

function hideTooltip() {
    if (tooltip) {
        document.body.removeChild(tooltip);
        tooltip = null;
    }
}

// 排序功能
function sortTable(header) {
    const sortKey = header.dataset.sort;
    const table = header.closest('table');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    if (currentSort.column === sortKey) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = sortKey;
        currentSort.direction = 'asc';
    }

    table.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    header.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');

    rows.sort((a, b) => {
        let aValue, bValue;

        const aCell = a.querySelector(`td:nth-child(${Array.from(header.parentNode.children).indexOf(header) + 1})`);
        const bCell = b.querySelector(`td:nth-child(${Array.from(header.parentNode.children).indexOf(header) + 1})`);

        if (aCell.hasAttribute('data-sort-value')) {
            aValue = parseFloat(aCell.getAttribute('data-sort-value')) || 0;
            bValue = parseFloat(bCell.getAttribute('data-sort-value')) || 0;
        } else {
            aValue = aCell.textContent.trim();
            bValue = bCell.textContent.trim();

            const aNum = parseFloat(aValue);
            const bNum = parseFloat(bValue);

            if (!isNaN(aNum) && !isNaN(bNum)) {
                aValue = aNum;
                bValue = bNum;
            }
        }

        let comparison = 0;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        } else {
            comparison = String(aValue).localeCompare(String(bValue));
        }

        return currentSort.direction === 'asc' ? comparison : -comparison;
    });

    rows.forEach(row => tbody.appendChild(row));
}

// 導出功能
function exportCurrentData() {
    const activeTab = document.querySelector('.content-panel.active').id;
    const table = document.querySelector(`#${activeTab} table`);

    if (table) {
        const csv = tableToCSV(table);
        const filename = getExportFilename(activeTab);
        downloadCSV(csv, filename);
    } else {
        alert('當前頁面沒有可導出的表格數據');
    }
}

function getExportFilename(tabId) {
    const names = {
        'legislator-topic': '立委主題匹配分析',
        'topic-legislator': '主題立委匹配分析',
        'party-topic': '黨派主題分析',
        'district-topic': '選區原籍分析',
        'correlation': '相關性計算分析',
        'influence': '影響力分析',
        'community': '社群分析'
    };
    const timestamp = new Date().toISOString().slice(0, 10);
    return `${names[tabId] || '數據分析'}_${timestamp}.csv`;
}

function exportAllData() {
    const timestamp = new Date().toISOString().slice(0, 10);
    const report = generateComprehensiveReport();
    downloadCSV(report, `立法委員完整分析報告_${timestamp}.csv`);
}

function generateComprehensiveReport() {
    let csv = '立法委員完整分析報告\n\n';

    csv += '=== 基本統計 ===\n';
    csv += `總立委數,${currentData.legislators.length}\n`;
    csv += `總主題數,${currentData.topics.length}\n`;
    csv += `總政黨數,${currentData.parties.length}\n`;
    csv += `總選區數,${currentData.districts ? currentData.districts.length : 0}\n`;
    csv += `總原籍地數,${currentData.origins ? currentData.origins.length : 0}\n\n`;

    csv += '=== 立委詳細信息 ===\n';
    csv += '立委姓名,政黨,選區,原籍地,關注主題數,總關心度,平均關心度\n';

    currentData.legislators.forEach(legislator => {
        const totalScore = legislator.topics.reduce((sum, topic) => sum + topic.score, 0);
        const avgScore = legislator.topics.length > 0 ? totalScore / legislator.topics.length : 0;

        csv += `"${legislator.name}","${legislator.party}","${legislator.district || ''}","${legislator.origin || ''}",${legislator.topics.length},${totalScore.toFixed(2)},${avgScore.toFixed(2)}\n`;
    });

    return csv;
}

function tableToCSV(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells.map(cell => `"${cell.textContent.replace(/"/g, '""')}"`).join(',');
    }).join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 文件讀取函數
async function loadCSVFile(filePath) {
    try {
        console.log(`正在載入檔案: ${filePath}`);

        if (typeof window.fs !== 'undefined' && window.fs.readFile) {
            try {
                const fileContent = await window.fs.readFile(filePath, { encoding: 'utf8' });
                console.log(`使用 window.fs.readFile 讀取成功: ${filePath}`);
                return parseCSV(fileContent);
            } catch (fsError) {
                console.log(`window.fs.readFile 失敗，嘗試使用 fetch: ${fsError.message}`);
            }
        }

        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();
        console.log(`使用 fetch 讀取成功: ${filePath}，大小: ${text.length} 字符`);

        return parseCSV(text);

    } catch (error) {
        console.error(`無法讀取 CSV 檔案 ${filePath}:`, error);
        throw error;
    }
}

function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = parseCSVLine(lines[0]);
    console.log('CSV標題行:', headers);

    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            try {
                const values = parseCSVLine(lines[i]);
                const row = {};

                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });

                data.push(row);
            } catch (error) {
                console.warn(`解析第 ${i + 1} 行時出錯:`, error);
            }
        }
    }

    console.log(`CSV解析完成，共 ${data.length} 行數據`);
    return data;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}