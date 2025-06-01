// ui-controls.js - UI控制模塊

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

// 初始化分析子標籤
function initializeAnalysisTabs() {
    const subTabs = document.querySelectorAll('.analysis-sub-tab');
    const subPanels = document.querySelectorAll('.analysis-sub-panel');

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
            loadAnalysisSubTabData(targetSubTab);
        });
    });
}

// 載入分析子標籤數據
function loadAnalysisSubTabData(subTabId) {
    switch (subTabId) {
        case 'legislator-topic':
            loadLegislatorTopicData();
            break;
        case 'topic-legislator':
            loadTopicLegislatorData();
            break;
        case 'party-topic':
            loadPartyTopicData();
            break;
        case 'region-topic':
            loadRegionTopicData();
            break;
    }
}

// Tab切換功能
function initializeTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const panels = document.querySelectorAll('.content-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', async function () {
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

            // 載入對應數據（支持異步）
            try {
                await loadTabData(targetTab);
            } catch (error) {
                console.error('載入Tab數據失敗:', error);
            }
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
                case 'analysis-hub':
                    const activeAnalysisTab = document.querySelector('.analysis-sub-tab.active').dataset.subtab;
                    handleAnalysisSearch(activeAnalysisTab);
                    break;
                case 'basic-info':
                    filterBasicInfoData();
                    break;
                case 'correlation':
                    const activeSubTab = document.querySelector('.correlation-sub-tab.active').dataset.subtab;
                    if (activeSubTab === 'topic-scores') {
                        loadSelectedLegislatorTopicData();
                    } else if (activeSubTab === 'comprehensive-stats') {
                        filterComprehensiveData();
                    }
                    break;
                case 'influence':
                    filterInfluenceData();
                    break;
            }
        }
    });
}

// 處理分析面板搜尋
function handleAnalysisSearch(activeTab) {
    switch (activeTab) {
        case 'legislator-topic':
            filterLegislatorData();
            break;
        case 'topic-legislator':
            filterTopicData();
            break;
        case 'party-topic':
            // 黨派主題分析通常不需要搜尋
            break;
        case 'region-topic':
            filterRegionData();
            break;
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

// 特殊的主題tooltip顯示函數
function showTopicTooltip(event, topicId, score, keywords) {
    const topicData = currentData.topics.find(t => t.id === topicId);
    if (!topicData) return;

    const keywordList = topicData.keywordList.slice(0, 10);
    const topicName = topicData.name || `主題${topicId}`;

    let tooltipText = `${topicName}\n分數: ${score}\n\n前十個關鍵詞:\n`;
    keywordList.forEach((keyword, index) => {
        tooltipText += `${index + 1}. ${keyword}\n`;
    });

    showTooltip(event, tooltipText);
}

// 基本資料欄位更新功能
function updateBasicInfoDisplay() {
    const selectedFields = [];
    const checkboxes = document.querySelectorAll('.field-checkboxes input[type="checkbox"]:checked');
    
    checkboxes.forEach(checkbox => {
        selectedFields.push(checkbox.value);
    });
    
    if (selectedFields.length === 0) {
        alert('請至少選擇一個欄位顯示');
        return;
    }
    
    // 更新表頭
    updateBasicInfoTableHeader(selectedFields);
    
    // 重新渲染數據
    renderBasicInfoTable(currentData.legislators, selectedFields);
}

// 更新基本資料表頭
function updateBasicInfoTableHeader(selectedFields) {
    const thead = document.getElementById('basic-info-thead');
    
    let headerHtml = '<tr>';
    selectedFields.forEach(field => {
        headerHtml += `<th class="sortable" data-sort="${field}">${field}</th>`;
    });
    headerHtml += '</tr>';
    
    thead.innerHTML = headerHtml;
}

// 格式化任期天數
function formatTermDuration(startDate, endDate) {
    if (!startDate || !endDate) return '';
    
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `(${diffDays}天)`;
    } catch (error) {
        return '';
    }
}

// 格式化下任狀態
function formatNextTermStatus(status) {
    if (!status || status === '') return '<span class="status-failed">資料不完整</span>';
    
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

// 格式化委員會信息
function formatCommitteeInfo(committeeText) {
    if (!committeeText) return '無資料';
    
    // 提取不重複的委員會名稱
    const committees = new Set();
    const parts = committeeText.split(';');
    
    parts.forEach(part => {
        const match = part.match(/：(.+?)(?:;|$)/);
        if (match && match[1]) {
            committees.add(match[1]);
        }
    });
    
    return committees.size > 0 ? Array.from(committees).join(', ') : '無資料';
}

// 導出功能
function exportCurrentData() {
    const activePanel = document.querySelector('.content-panel.active');
    const panelId = activePanel.id;
    
    let table = null;
    
    if (panelId === 'analysis-hub') {
        const activeSubTab = document.querySelector('.analysis-sub-tab.active').dataset.subtab;
        table = document.querySelector(`#${activeSubTab} table`);
    } else {
        table = document.querySelector(`#${panelId} table`);
    }

    if (table) {
        const csv = tableToCSV(table);
        const filename = getExportFilename(panelId);
        downloadCSV(csv, filename);
    } else {
        alert('當前頁面沒有可導出的表格數據');
    }
}

function getExportFilename(tabId) {
    const names = {
        'analysis-hub': '立委主題分析',
        'basic-info': '立委基本資料',
        'correlation': '相關性計算分析',
        'influence': '影響力分析',
        'community': '社群分析',
        'network-viz': '網路圖分析'
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
    csv += `總八選區數,${currentData.eightDistricts ? currentData.eightDistricts.length : 0}\n`;
    csv += `總七原籍數,${currentData.sevenOrigins ? currentData.sevenOrigins.length : 0}\n`;
    csv += `總七成長地數,${currentData.sevenGrowths ? currentData.sevenGrowths.length : 0}\n\n`;

    csv += '=== 立委詳細信息 ===\n';
    csv += '立委姓名,政黨,八選區,七原籍,七成長,關注主題數,總關心度,平均關心度\n';

    currentData.legislators.forEach(legislator => {
        const totalScore = legislator.topics.reduce((sum, topic) => sum + topic.score, 0);
        const avgScore = legislator.topics.length > 0 ? totalScore / legislator.topics.length : 0;

        csv += `"${legislator.name}","${legislator.party}","${legislator.eightDistrict || ''}","${legislator.sevenOrigin || ''}","${legislator.sevenGrowth || ''}",${legislator.topics.length},${totalScore.toFixed(2)},${avgScore.toFixed(2)}\n`;
    });

    return csv;
}

function tableToCSV(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells.map(cell => {
            // 移除HTML標籤，只保留文字內容
            const text = cell.textContent || cell.innerText || '';
            return `"${text.replace(/"/g, '""').trim()}"`;
        }).join(',');
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