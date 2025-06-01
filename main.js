// main.js - 主要控制檔案
(function() {
    'use strict';

    // 使用立即執行函數避免全域變量衝突
    window.AppData = window.AppData || {
        currentData: {},
        currentSort: { column: null, direction: 'asc' },
        correlationData: {
            topicScores: [],
            comprehensiveStats: []
        },
        currentCommunityMethod: 'coattendance',
        currentAdjacencyMatrix: null,
        currentLegislatorIndexMap: null,
        isDataLoaded: false
    };

    // 為了兼容性，將變量暴露到全域
    window.currentData = window.AppData.currentData;
    window.currentSort = window.AppData.currentSort;
    window.correlationData = window.AppData.correlationData;

    // 初始化
    document.addEventListener('DOMContentLoaded', function () {
        console.log('🚀 系統初始化開始...');
        
        try {
            initializeTabs();
            initializeCorrelationTabs();
            initializeAnalysisTabs();
            setupEventListeners();
            
            // 載入數據（非阻塞）
            loadDataAsync();
            
            // 初始化網路圖可視化
            if (typeof initializeNetworkVisualization === 'function') {
                setTimeout(initializeNetworkVisualization, 1000);
            }
            
            console.log('✅ 系統初始化完成');
        } catch (error) {
            console.error('❌ 系統初始化失敗:', error);
            showStatus('❌ 系統初始化失敗', 'error');
        }
    });

    // 非阻塞載入數據 - 移除虛假數據生成
    async function loadDataAsync() {
        try {
            showStatus('⏳ 正在載入分析結果...', 'loading');
            
            // 設置超時保護
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('載入超時')), 15000); // 增加超時時間
            });
            
            // 嘗試載入真實數據
            const loadPromise = loadRealDataSafely();
            
            await Promise.race([loadPromise, timeoutPromise]);
            
            // 載入成功後設置標記
            window.AppData.isDataLoaded = true;
            
            // 使用setTimeout將載入標籤數據的操作推遲到下一個事件循環
            setTimeout(() => {
                loadTabDataSafely('analysis-hub');
            }, 100);
            
            showStatus('✅ 數據載入完成！', 'success');
            
            setTimeout(() => {
                const statusIndicator = document.getElementById('status-indicator');
                if (statusIndicator) {
                    statusIndicator.style.display = 'none';
                }
            }, 3000);
            
        } catch (error) {
            console.error('載入數據失敗:', error);
            handleDataLoadFailure(error);
        }
    }

    // 修改：只嘗試載入真實數據，不生成虛假數據
    async function loadRealDataSafely() {
        try {
            // 檢查loadRealData函數是否存在
            if (typeof loadRealData === 'function') {
                // 分批載入，每次載入後讓出控制權
                await new Promise(resolve => {
                    setTimeout(async () => {
                        await loadRealData();
                        resolve();
                    }, 10);
                });
                
                // 確保全域變量同步
                window.currentData = currentData;
                window.correlationData = correlationData;
                window.AppData.currentData = currentData;
                window.AppData.correlationData = correlationData;
                
                console.log('✅ 真實數據載入成功');
            } else {
                throw new Error('loadRealData函數未定義');
            }
        } catch (error) {
            console.error('❌ 真實數據載入失敗:', error.message);
            throw error; // 重新拋出錯誤，不生成虛假數據
        }
    }

    // 處理數據載入失敗 - 修改：不生成虛假數據
    function handleDataLoadFailure(error) {
        console.error('數據載入完全失敗:', error);
        
        showStatus('❌ 數據載入失敗，請檢查數據文件', 'error');
        
        // 設置失敗狀態
        window.AppData.isDataLoaded = false;
        
        // 生成空的基礎數據結構，但明確標示為無數據狀態
        window.AppData.currentData = {
            legislators: [],
            topics: [],
            parties: [],
            districts: [],
            origins: [],
            eightDistricts: [],
            sevenOrigins: [],
            sevenGrowths: []
        };
        
        window.AppData.correlationData = {
            topicScores: [],
            comprehensiveStats: []
        };
        
        // 同步到全域變數
        window.currentData = window.AppData.currentData;
        window.correlationData = window.AppData.correlationData;
        
        // 顯示詳細的錯誤信息
        displayDataLoadError(error);
        
        // 允許用戶切換到其他功能
        enableBasicFunctionality();
        
        setTimeout(() => {
            const statusIndicator = document.getElementById('status-indicator');
            if (statusIndicator) {
                statusIndicator.style.display = 'none';
            }
        }, 10000); // 延長顯示時間讓用戶看到錯誤信息
    }

    // 顯示數據載入錯誤詳情
    function displayDataLoadError(error) {
        const panels = document.querySelectorAll('.content-panel');
        panels.forEach(panel => {
            const tbody = panel.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" style="text-align: center; padding: 40px; color: #d32f2f;">
                            <h3>❌ 數據載入失敗</h3>
                            <p style="margin: 15px 0; font-size: 16px;">
                                無法載入必要的數據檔案，請檢查以下檔案是否存在並可讀取：
                            </p>
                            <ul style="text-align: left; margin: 10px auto; display: inline-block; max-width: 600px;">
                                <li><code>bertopic_analysis_optimized/legislator_topic_interest.csv</code></li>
                                <li><code>bertopic_analysis_optimized/legislator_comprehensive_stats.csv</code></li>
                                <li><code>topic_info_20250526.csv</code></li>
                                <li><code>委員ID對應表.csv</code> (Big-5 編碼)</li>
                                <li><code>meeting_attendance_analysis/委員會議出席矩陣.csv</code> (可選)</li>
                            </ul>
                            <p style="color: #666; font-size: 14px; margin-top: 20px;">
                                錯誤詳情: ${error.message}
                            </p>
                            <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; color: #856404;">
                                <h4>🔍 解決方案：</h4>
                                <ul style="text-align: left; margin: 10px 0;">
                                    <li>確認所有必要的 CSV 檔案都在正確的位置</li>
                                    <li>檢查檔案權限是否允許讀取</li>
                                    <li>使用本地服務器運行：<code>python -m http.server 8000</code></li>
                                    <li>確認 <code>委員ID對應表.csv</code> 使用 Big-5 編碼</li>
                                </ul>
                            </div>
                        </td>
                    </tr>
                `;
            }
        });
    }

    // 啟用基本功能
    function enableBasicFunctionality() {
        // 確保標籤切換功能可用
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(tab => {
            tab.style.pointerEvents = 'auto';
            tab.style.opacity = '1';
        });
        
        console.log('✅ 基本功能已啟用，用戶可以切換標籤查看錯誤信息');
    }

    // 安全載入標籤數據
    async function loadTabDataSafely(tabId) {
        try {
            console.log(`🔄 載入標籤數據: ${tabId}`);
            
            // 如果數據載入失敗，顯示錯誤信息而不是嘗試載入
            if (!window.AppData.isDataLoaded) {
                console.warn('數據未載入，跳過標籤數據載入');
                return;
            }
            
            switch (tabId) {
                case 'analysis-hub':
                    if (typeof loadAnalysisSubTabData === 'function') {
                        loadAnalysisSubTabData('legislator-topic');
                    }
                    break;
                case 'basic-info':
                    if (typeof loadBasicInfoData === 'function') {
                        loadBasicInfoData();
                    }
                    break;
                case 'correlation':
                    loadCorrelationDataSafely();
                    break;
                case 'influence':
                    if (typeof loadInfluenceData === 'function') {
                        loadInfluenceData();
                    }
                    break;
                case 'community':
                    await loadCommunityDataSafely();
                    break;
                case 'network-viz':
                    loadNetworkVizDataSafely();
                    break;
                case 'visualization':
                    if (typeof loadVisualizationTab === 'function') {
                        loadVisualizationTab();
                    }
                    break;
                default:
                    console.warn(`未知的標籤ID: ${tabId}`);
            }
        } catch (error) {
            console.error(`載入標籤數據失敗 (${tabId}):`, error);
            showStatus(`載入 ${tabId} 數據時出錯`, 'error');
        }
    }

    // 安全載入相關性數據 - 修改為預設載入綜合評分
    function loadCorrelationDataSafely() {
        try {
            // 如果數據載入失敗，不執行後續操作
            if (!window.AppData.isDataLoaded) {
                return;
            }
            
            // 確保correlationData已初始化
            if (!window.AppData.correlationData) {
                window.AppData.correlationData = {
                    topicScores: [],
                    comprehensiveStats: []
                };
            }
            
            // 確保全域變量同步
            window.correlationData = window.AppData.correlationData;
            
            if (!window.AppData.correlationData.topicScores || 
                !window.AppData.correlationData.comprehensiveStats ||
                window.AppData.correlationData.comprehensiveStats.length === 0) {
                console.warn('相關性計算數據未載入，顯示空狀態');
                showEmptyCorrelationState();
                return;
            }
            
            // 載入預設的相關性子標籤數據 - 修改為綜合評分
            loadCorrelationSubTabDataSafely('comprehensive-stats');
        } catch (error) {
            console.error('載入相關性數據失敗:', error);
            showEmptyCorrelationState();
        }
    }

    // 顯示空的相關性狀態
    function showEmptyCorrelationState() {
        const tbody = document.getElementById('topic-scores-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px; color: #999;">相關性數據載入中或不可用</td></tr>';
        }
        
        const comprehensiveTbody = document.getElementById('comprehensive-stats-tbody');
        if (comprehensiveTbody) {
            comprehensiveTbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #999;">綜合統計數據載入中或不可用</td></tr>';
        }
    }

    // 安全載入相關性子標籤數據
    function loadCorrelationSubTabDataSafely(subTabId) {
        try {
            if (!window.AppData.isDataLoaded) {
                return;
            }
            
            switch (subTabId) {
                case 'topic-scores':
                    populateLegislatorSelectorSafely();
                    clearTopicScoresTable();
                    break;
                case 'comprehensive-stats':
                    loadComprehensiveStatsDataSafely();
                    break;
            }
        } catch (error) {
            console.error(`載入相關性子標籤數據失敗 (${subTabId}):`, error);
        }
    }

    // 安全填充立委選擇器 - 延遲載入版本
    function populateLegislatorSelectorSafely() {
        const selector = document.getElementById('legislator-selector');
        const comprehensivePartyFilter = document.getElementById('comprehensive-party-filter');
        
        if (!selector) return;
        
        selector.innerHTML = '<option value="">請選擇立委</option>';
        
        try {
            // 檢查數據是否已載入
            if (!window.AppData.correlationData || 
                !window.AppData.correlationData.comprehensiveStats || 
                window.AppData.correlationData.comprehensiveStats.length === 0) {
                
                console.log('📋 相關性數據尚未載入，等待數據...');
                
                // 設置重試機制
                let retryCount = 0;
                const maxRetries = 10;
                const retryInterval = 1000; // 1秒
                
                const retryPopulate = () => {
                    retryCount++;
                    
                    if (window.AppData.correlationData?.comprehensiveStats?.length > 0) {
                        console.log(`✅ 數據已載入，填充立委選擇器 (重試 ${retryCount} 次)`);
                        populateLegislatorSelectorSafely();
                        return;
                    }
                    
                    if (retryCount < maxRetries) {
                        setTimeout(retryPopulate, retryInterval);
                    } else {
                        console.warn('⚠️ 重試次數已達上限，無法載入相關性數據');
                        selector.innerHTML = '<option value="">無法載入立委數據</option>';
                    }
                };
                
                setTimeout(retryPopulate, retryInterval);
                return;
            }
            
            const uniqueLegislators = [...new Set(window.AppData.correlationData.comprehensiveStats.map(row => 
                row['委員姓名'] || row['name'] || row['立委姓名']
            ))].filter(name => name && name !== 'undefined').sort();
            
            const uniqueParties = [...new Set(window.AppData.correlationData.comprehensiveStats.map(row => 
                row['政黨'] || row['party']
            ))].filter(party => party && party !== 'undefined' && party !== '未知').sort();
            
            // 填充立委選擇器
            uniqueLegislators.forEach(legislator => {
                const option = document.createElement('option');
                option.value = legislator;
                option.textContent = legislator;
                selector.appendChild(option);
            });
            
            // 填充政黨篩選器
            if (comprehensivePartyFilter) {
                comprehensivePartyFilter.innerHTML = '<option value="">所有政黨</option>';
                uniqueParties.forEach(party => {
                    const option = document.createElement('option');
                    option.value = party;
                    option.textContent = party;
                    comprehensivePartyFilter.appendChild(option);
                });
            }
            
            console.log(`✅ 立委選擇器已填充: ${uniqueLegislators.length} 位立委`);
        } catch (error) {
            console.error('填充立委選擇器時發生錯誤:', error);
            selector.innerHTML = '<option value="">載入錯誤</option>';
        }
    }

    // 安全載入社群數據 - 修改：加強錯誤處理
    async function loadCommunityDataSafely() {
        try {
            if (!window.AppData.isDataLoaded) {
                showEmptyCommunityState();
                return;
            }
            
            showStatus('🔄 執行Louvain社群檢測...', 'loading');
            
            // 檢查社群分析函數是否存在
            if (typeof analyzeCommunities !== 'function') {
                throw new Error('社群分析函數不可用');
            }
            
            const communityAnalysis = await analyzeCommunities(window.AppData.currentCommunityMethod);
            
            if (communityAnalysis && communityAnalysis.communities) {
                updateCommunityStatsSafely(communityAnalysis);
                renderCommunityTableSafely(communityAnalysis);
                showStatus('✅ 社群分析完成！', 'success');
            } else {
                throw new Error('社群分析未返回有效結果');
            }
        } catch (error) {
            console.error('載入社群數據失敗:', error);
            showStatus('❌ 社群數據載入失敗: ' + error.message, 'error');
            showEmptyCommunityState();
        } finally {
            setTimeout(() => {
                const statusIndicator = document.getElementById('status-indicator');
                if (statusIndicator) {
                    statusIndicator.style.display = 'none';
                }
            }, 3000);
        }
    }

    // 顯示空的社群狀態
    function showEmptyCommunityState() {
        const tbody = document.getElementById('community-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">
                社群分析功能暫時不可用<br>
                <small>請檢查數據完整性或稍後重試</small>
            </td></tr>`;
        }
    }

    // 安全載入網路圖數據 - 修改：加強錯誤提示
    function loadNetworkVizDataSafely() {
        try {
            console.log('🔄 初始化網路圖分析...');
            
            // 重置網路圖視圖
            if (typeof resetNetworkView === 'function') {
                resetNetworkView();
            }
            
            // 確保網路圖容器存在並初始化
            const networkContainer = document.getElementById('network-container');
            if (networkContainer) {
                // 如果網路圖初始化函數存在，呼叫它
                if (typeof initializeNetworkVisualization === 'function') {
                    setTimeout(() => {
                        initializeNetworkVisualization();
                        console.log('✅ 網路圖初始化完成');
                    }, 500);
                }
                
                // 顯示說明文字
                const placeholder = networkContainer.querySelector('.network-placeholder');
                if (placeholder) {
                    let statusMessage = '';
                    if (!window.AppData.isDataLoaded) {
                        statusMessage = `
                            <div style="color: #d32f2f; margin: 15px 0;">
                                <strong>❌ 數據載入失敗</strong><br>
                                網路圖分析需要數據檔案支持
                            </div>
                        `;
                    } else {
                        statusMessage = `
                            <div style="color: #2e7d32; margin: 15px 0;">
                                <strong>✅ 數據已載入</strong><br>
                                可以開始網路圖分析
                            </div>
                        `;
                    }
                    
                    placeholder.innerHTML = `
                        <h3>📊 互動式網路圖</h3>
                        <p>選擇網路類型和參數，點擊"生成網路圖"開始分析</p>
                        ${statusMessage}
                        <div style="margin-top: 20px; color: #666; font-size: 16px;">
                            <p><strong>使用說明：</strong></p>
                            <ul style="text-align: left; margin: 10px 0; padding-left: 20px;">
                                <li>選擇網路類型：共同出席會議或關注主題相似度</li>
                                <li>選擇中心性指標：度中心性或介數中心性</li>
                                <li>調整連接閾值避免過度連接</li>
                                <li>點擊節點查看立委詳細資訊和連接關係</li>
                                <li>點擊空白處關閉詳細資訊面板</li>
                            </ul>
                            <div style="margin-top: 15px; padding: 10px; background: #e3f2fd; border-radius: 5px;">
                                <strong>🔧 系統狀態：</strong><br>
                                數據載入狀態: ${window.AppData.isDataLoaded ? '✅ 已載入' : '❌ 載入失敗'}<br>
                                立委數量: ${window.AppData.currentData?.legislators?.length || 0}<br>
                                網路圖函數: ${typeof generateNetworkGraph === 'function' ? '✅ 可用' : '❌ 未載入'}<br>
                                會議數據: ${window.meetingAttendanceMap && window.meetingAttendanceMap.size > 0 ? '✅ 可用' : '❌ 不可用'}
                            </div>
                        </div>
                    `;
                }
                
                // 確保控制元素有事件監聽器
                const generateButton = document.querySelector('#network-container').closest('.content-panel').querySelector('button[onclick*="generateNetworkGraph"]');
                if (generateButton && typeof generateNetworkGraph === 'function') {
                    console.log('✅ 網路圖生成按鈕已就緒');
                } else {
                    console.warn('⚠️ 網路圖生成功能不可用');
                }
            } else {
                console.error('❌ 網路圖容器未找到');
            }
        } catch (error) {
            console.error('載入網路圖數據失敗:', error);
        }
    }

    // 安全更新社群統計
    function updateCommunityStatsSafely(analysis) {
        try {
            const totalCommunities = document.getElementById('total-communities');
            const largestCommunity = document.getElementById('largest-community');
            const avgCommunitySize = document.getElementById('avg-community-size');
            const modularity = document.getElementById('modularity');
            
            if (totalCommunities) totalCommunities.textContent = analysis.stats?.totalCommunities || 0;
            if (largestCommunity) largestCommunity.textContent = analysis.stats?.largestCommunity || 0;
            if (avgCommunitySize) avgCommunitySize.textContent = (analysis.stats?.avgCommunitySize || 0).toFixed(1);
            if (modularity) modularity.textContent = (analysis.stats?.modularity || 0).toFixed(4);
        } catch (error) {
            console.error('更新社群統計失敗:', error);
        }
    }

    // 安全渲染社群表格
    function renderCommunityTableSafely(analysis) {
        const tbody = document.getElementById('community-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (!analysis || !analysis.communities) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">無社群數據</td></tr>';
            return;
        }

        try {
            Object.entries(analysis.communities).forEach(([communityId, community]) => {
                if (!community || !community.members) return;

                const row = document.createElement('tr');
                const method = window.AppData.currentCommunityMethod === 'coattendance' ? '共同出席會議' : '發言內容相似度';

                // 計算政黨分布
                const partyEntries = Object.entries(community.parties || {}).sort(([, a], [, b]) => b - a);
                const mainParty = partyEntries[0] ? partyEntries[0][0] : '未知';

                // 生成成員列表
                const allMembers = community.members.map(member => {
                    const memberName = typeof member === 'string' ? member : (member.name || member);
                    const memberParty = typeof member === 'object' ? member.party : '未知';
                    const memberDistrict = typeof member === 'object' ? (member.district || '未知') : '未知';
                    const memberOrigin = typeof member === 'object' ? (member.origin || '未知') : '未知';
                    
                    return `<span class="member-item" 
                                style="background-color: ${getPartyBackgroundColor(memberParty)}; color: white; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 16px; font-weight: 500; display: inline-block; cursor: pointer;"
                                title="政黨: ${memberParty}&#10;選區: ${memberDistrict}&#10;原籍: ${memberOrigin}"
                                onmouseover="showTooltip && showTooltip(event, '立委: ${memberName}\\n政黨: ${memberParty}\\n選區: ${memberDistrict}\\n原籍: ${memberOrigin}')"
                                onmouseout="hideTooltip && hideTooltip()">
                                ${memberName}
                            </span>`;
                }).join('');

                // 生成主題列表
                const topTopics = Object.entries(community.topics || {})
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([topicId, score]) => {
                        const topicData = window.AppData.currentData?.topics?.find(t => t.id == topicId);
                        const keywords = topicData ? topicData.keywords.split(',').slice(0, 2).join(',') : '';
                        const topicName = topicData ? topicData.name : `主題${topicId}`;
                        return `<span class="topic-tag" 
                                    style="display: inline-block; background: #f0f8ff; border: 1px solid #3498db; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 16px; cursor: pointer;"
                                    title="${topicName}: ${keywords}"
                                    onmouseover="showTooltip && showTooltip(event, '${topicName}\\n社群關心度: ${score.toFixed(2)}\\n關鍵詞: ${keywords}')"
                                    onmouseout="hideTooltip && hideTooltip()">
                                    ${topicName} (${score.toFixed(1)})
                                </span>`;
                    }).join('');

                // 計算密度
                let density = 0;
                let densityDisplay = 'N/A';
                try {
                    const memberCount = community.members.length;
                    if (memberCount >= 2) {
                        density = Math.min(1, 2 / (memberCount - 1));
                        densityDisplay = density.toFixed(3);
                    } else {
                        densityDisplay = '0.000';
                    }
                } catch (error) {
                    console.warn(`計算社群 ${communityId} 密度時出錯:`, error);
                }

                row.innerHTML = `
                    <td style="text-align: center; width: 80px;" data-sort-value="${communityId}"><strong>社群 ${communityId}</strong></td>
                    <td style="text-align: center; width: 120px;">${method}</td>
                    <td style="text-align: center; width: 60px;" data-sort-value="${community.members.length}">
                        <span class="badge" style="font-size: 16px;">${community.members.length}</span>
                    </td>
                    <td style="text-align: center; width: 80px;" data-sort-value="${density}" title="密度 = 實際連接數 ÷ 最大可能連接數">
                        <strong>${densityDisplay}</strong>
                        <div style="font-size: 12px; color: #666; margin-top: 2px;">
                            ${density >= 0.7 ? '高密度' : density >= 0.4 ? '中密度' : '低密度'}
                        </div>
                    </td>
                    <td style="text-align: center; width: 80px;"><span class="party-tag party-${mainParty}" style="font-size: 16px; padding: 6px 10px;">${mainParty}</span></td>
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
            
            console.log(`✅ 社群表格渲染完成: ${Object.keys(analysis.communities).length} 個社群`);
        } catch (error) {
            console.error('渲染社群表格失敗:', error);
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #d32f2f;">渲染社群表格時發生錯誤</td></tr>';
        }
    }

    // 安全載入綜合統計數據
    function loadComprehensiveStatsDataSafely() {
        try {
            if (!window.AppData.correlationData.comprehensiveStats || 
                window.AppData.correlationData.comprehensiveStats.length === 0) {
                console.warn('綜合統計數據未載入');
                const tbody = document.getElementById('comprehensive-stats-tbody');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #999;">綜合統計數據載入中或不可用</td></tr>';
                }
                return;
            }
            
            renderComprehensiveStatsTableSafely(window.AppData.correlationData.comprehensiveStats);
        } catch (error) {
            console.error('載入綜合統計數據失敗:', error);
        }
    }

    // 安全渲染綜合統計表格
    function renderComprehensiveStatsTableSafely(data) {
        const tbody = document.getElementById('comprehensive-stats-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #999;">無綜合統計數據</td></tr>';
            return;
        }
        
        try {
            data.forEach(row => {
                const tr = document.createElement('tr');
                
                const legislator = row['委員姓名'] || row['name'] || row['立委姓名'] || '';
                const party = row['政黨'] || row['party'] || '未知';
                const totalFinalScore = parseFloat(row['總最終關心度'] || 0);
                const avgFinalScore = parseFloat(row['平均最終關心度'] || 0);
                const topicCount = parseInt(row['關注主題數'] || 0);
                const specialization = parseFloat(row['專業度'] || 0);
                const efficiency = parseFloat(row['發言效率'] || 0);
                const totalSpeeches = parseInt(row['總發言次數'] || 0);
                const avgRelevance = parseFloat(row['平均相關性'] || 0);
                
                tr.innerHTML = `
                    <td style="text-align: center;"><strong>${legislator}</strong></td>
                    <td style="text-align: center;"><span class="party-tag party-${party}">${party}</span></td>
                    <td style="text-align: center;"><strong>${totalFinalScore.toFixed(2)}</strong></td>
                    <td style="text-align: center;"><strong>${avgFinalScore.toFixed(2)}</strong></td>
                    <td style="text-align: center;"><span class="badge">${topicCount}</span></td>
                    <td style="text-align: center;">${specialization.toFixed(2)}</td>
                    <td style="text-align: center;">${efficiency.toFixed(4)}</td>
                    <td style="text-align: center;"><span class="badge">${totalSpeeches}</span></td>
                    <td style="text-align: center;">${avgRelevance.toFixed(4)}</td>
                `;
                
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('渲染綜合統計表格失敗:', error);
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #d32f2f;">渲染表格時發生錯誤</td></tr>';
        }
    }

    // 清空主題分數表格
    function clearTopicScoresTable() {
        const tbody = document.getElementById('topic-scores-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="10" class="loading">請選擇立委查看其主題分數</td></tr>';
        }
    }

    // 社群分析方法切換 - 修改：自動觸發重新分析
    window.toggleCommunityMethod = function() {
        const button = document.getElementById('community-method-toggle');
        const statusDiv = document.getElementById('community-method-status');
        
        if (!button || !statusDiv) return;
        
        if (window.AppData.currentCommunityMethod === 'coattendance') {
            window.AppData.currentCommunityMethod = 'topic-similarity';
            button.textContent = '切換到：共同出席會議分群';
            statusDiv.innerHTML = '<strong>當前方法：</strong>發言內容相似度分群';
        } else {
            window.AppData.currentCommunityMethod = 'coattendance';
            button.textContent = '切換到：發言內容分群';
            statusDiv.innerHTML = '<strong>當前方法：</strong>基於共同出席會議分群';
        }
        
        console.log('社群分析方法已切換至:', window.AppData.currentCommunityMethod);
        
        // 自動觸發重新分析
        setTimeout(() => {
            reanalyzeCommunities();
        }, 100);
    };

    // 重新分析社群
    window.reanalyzeCommunities = async function() {
        await loadCommunityDataSafely();
    };

    // 載入Tab數據的全域函數
    window.loadTabData = loadTabDataSafely;

    // 狀態顯示函數
    function showStatus(message, type) {
        try {
            const statusIndicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');

            if (!statusIndicator || !statusText) return;

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
        } catch (error) {
            console.error('顯示狀態失敗:', error);
        }
    }

    // 暴露必要的全域函數
    window.showStatus = showStatus;
    window.getPartyBackgroundColor = getPartyBackgroundColor;
    
    // 添加基本的tooltip函數（如果不存在）
    if (typeof window.showTooltip === 'undefined') {
        window.showTooltip = function(event, text) {
            // 基本的tooltip實現
            console.log('Tooltip:', text);
        };
    }
    
    if (typeof window.hideTooltip === 'undefined') {
        window.hideTooltip = function() {
            // 基本的隱藏tooltip實現
        };
    }
    
    console.log('📦 Main.js 模塊載入完成 (不包含虛假數據生成)');

})();