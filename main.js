// main.js - 主要控制檔案
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

// 載入數據
async function loadData() {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');

    try {
        showStatus('⏳ 正在載入分析結果...', 'loading');
        await loadRealData();
        loadTabData('legislator-topic');
        showStatus('✅ 數據載入完成！', 'success');
        setTimeout(() => {
            statusIndicator.style.display = 'none';
        }, 3000);
    } catch (error) {
        console.error('載入數據失敗:', error);
        showStatus('❌ 數據載入失敗，請檢查文件路徑和網路連接', 'error');
        setTimeout(async () => {
            if (confirm('數據載入失敗，是否使用示例數據？')) {
                console.log('使用模擬數據作為備案...');
                currentData = generateMockData();
                await loadTabData('legislator-topic');
                showStatus('ℹ️ 正在使用示例數據', 'info');
            }
        }, 1000);
    }
}

// 載入Tab數據
async function loadTabData(tabId) {
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
            await loadCommunityData(); // 異步調用
            break;
        case 'visualization':
            loadVisualizationTab();
            break;
    }
}

function showStatus(message, type) {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');

    statusText.textContent = message;
    statusIndicator.style.display = 'block';

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