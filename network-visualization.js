// network-visualization.js - 網路圖可視化模塊

let networkSvg = null;
let networkSimulation = null;
let networkNodes = [];
let networkLinks = [];
let selectedNode = null;
let currentNetworkData = null;

// 政黨顏色映射
const partyColorMap = {
    '民進黨': '#1B9431',
    '國民黨': '#000099',
    '時代力量': '#FBBE01',
    '親民黨': '#FF6310',
    '民眾黨': '#28C8C8',
    '基進黨': '#A73F24',
    '無黨籍': '#95a5a6',
    '未知': '#bdc3c7'
};

// 初始化網路圖容器
function initializeNetworkVisualization() {
    const container = document.getElementById('network-container');
    if (!container) {
        console.error('網路圖容器未找到');
        return;
    }
    
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 清除舊的SVG
    d3.select('#network-container').selectAll('svg').remove();

    // 創建新的SVG
    networkSvg = d3.select('#network-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', '#fafafa')
        .style('border', '1px solid #ddd')
        .style('border-radius', '8px');

    // 添加縮放功能
    const zoom = d3.zoom()
        .scaleExtent([0.1, 3])
        .on('zoom', function(event) {
            networkSvg.select('.network-group').attr('transform', event.transform);
        });

    networkSvg.call(zoom);

    // 創建主要繪圖組
    const g = networkSvg.append('g').attr('class', 'network-group');

    // 添加箭頭標記
    networkSvg.append('defs').selectAll('marker')
        .data(['end'])
        .enter().append('marker')
        .attr('id', String)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#999');

    // 添加點擊空白處的事件監聽器
    networkSvg.on('click', function(event) {
        // 檢查點擊的是否為空白區域（不是節點或連線）
        if (event.target === this || event.target.classList.contains('network-group')) {
            hideNodeDetails();
            clearNodeSelection();
        }
    });

    // 初始化力導向模擬
    networkSimulation = d3.forceSimulation()
        .force('link', d3.forceLink().id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(25));

    // 添加閾值滑桿事件監聽
    const thresholdSlider = document.getElementById('threshold-slider');
    const thresholdValue = document.getElementById('threshold-value');
    
    if (thresholdSlider && thresholdValue) {
        thresholdSlider.addEventListener('input', function() {
            thresholdValue.textContent = this.value;
            if (currentNetworkData) {
                updateNetworkThreshold(parseFloat(this.value));
            }
        });
    }

    console.log('✅ 網路圖容器初始化完成');
}

// 清除節點選擇
function clearNodeSelection() {
    selectedNode = null;
    
    if (window.currentNetworkElements) {
        window.currentNetworkElements.node.classed('selected', false);
        window.currentNetworkElements.link.classed('highlighted', false);
    }
}

// 隱藏節點詳細信息
function hideNodeDetails() {
    const infoPanel = document.getElementById('node-info-panel');
    if (infoPanel) {
        infoPanel.style.display = 'none';
    }
}

// 生成網路圖
function generateNetworkGraph() {
    const networkType = document.getElementById('network-type').value;
    const centralityMeasure = document.getElementById('centrality-measure').value;
    const threshold = parseFloat(document.getElementById('threshold-slider').value);

    console.log('生成網路圖:', { networkType, centralityMeasure, threshold });

    if (!currentData || !currentData.legislators) {
        alert('請先載入數據');
        return;
    }

    showStatus('🔄 正在生成網路圖...', 'loading');

    try {
        // 建立網路數據
        const networkData = buildNetworkData(networkType, threshold);
        
        if (!networkData || networkData.nodes.length === 0) {
            throw new Error('無法生成網路數據，請檢查數據完整性');
        }

        currentNetworkData = networkData;
        
        // 計算中心性指標
        calculateNetworkCentrality(networkData, centralityMeasure);
        
        // 渲染網路圖
        renderNetworkGraph(networkData, centralityMeasure);
        
        // 更新統計信息
        updateNetworkStats(networkData);
        
        showStatus('✅ 網路圖生成完成！', 'success');
        
        setTimeout(() => {
            const statusIndicator = document.getElementById('status-indicator');
            if (statusIndicator) {
                statusIndicator.style.display = 'none';
            }
        }, 2000);

    } catch (error) {
        console.error('生成網路圖失敗:', error);
        showStatus('❌ 網路圖生成失敗: ' + error.message, 'error');
    }
}

// 建立網路數據
function buildNetworkData(networkType, threshold) {
    const legislators = currentData.legislators;
    
    if (networkType === 'coattendance') {
        return buildCoattendanceNetwork(legislators, threshold);
    } else {
        return buildTopicSimilarityNetwork(legislators, threshold);
    }
}

// 建立共同出席會議網路 - 修改：標準化權重並移除虛假數據
function buildCoattendanceNetwork(legislators, threshold) {
    console.log('建立共同出席會議網路, 閾值:', threshold);
    
    const nodes = legislators.map(leg => ({
        id: leg.name,
        name: leg.name,
        party: leg.party,
        topics: leg.topics.length,
        degree: 0,
        betweenness: 0
    }));

    const links = [];
    
    // 只使用真實會議出席矩陣數據
    if (window.meetingAttendanceMap && window.meetingAttendanceMap.size > 0) {
        console.log('✅ 使用真實會議出席矩陣建立網路');
        
        const legislatorNames = Array.from(window.meetingAttendanceMap.keys());
        console.log(`處理 ${legislatorNames.length} 位立委的會議出席數據`);
        
        // 建立立委名稱到索引的映射，處理名稱不一致問題
        const nameMapping = new Map();
        legislators.forEach(leg => {
            nameMapping.set(leg.name, leg.name);
            
            // 尋找會議數據中的匹配名稱
            for (const attendanceName of legislatorNames) {
                if (attendanceName.includes(leg.name) || leg.name.includes(attendanceName) ||
                    attendanceName.trim() === leg.name.trim()) {
                    nameMapping.set(leg.name, attendanceName);
                    break;
                }
            }
        });
        
        let totalComparisons = 0;
        let validConnections = 0;
        let filteredConnections = 0;
        const allWeights = []; // 收集所有權重用於標準化
        
        // 第一遍：計算所有立委對之間的共同會議並收集權重
        for (let i = 0; i < legislators.length; i++) {
            for (let j = i + 1; j < legislators.length; j++) {
                totalComparisons++;
                
                const leg1Name = nameMapping.get(legislators[i].name);
                const leg2Name = nameMapping.get(legislators[j].name);
                
                if (!leg1Name || !leg2Name) continue;
                
                const meetings1 = window.meetingAttendanceMap.get(leg1Name);
                const meetings2 = window.meetingAttendanceMap.get(leg2Name);
                
                if (!meetings1 || !meetings2) continue;
                
                // 計算共同出席的會議
                const commonMeetings = new Set([...meetings1].filter(x => meetings2.has(x)));
                const totalMeetings = new Set([...meetings1, ...meetings2]);
                
                if (commonMeetings.size > 0) {
                    validConnections++;
                    
                    // 計算多種相似度指標
                    const jaccardSimilarity = commonMeetings.size / totalMeetings.size;
                    const commonMeetingCount = commonMeetings.size;
                    const cosineSimilarity = commonMeetings.size / Math.sqrt(meetings1.size * meetings2.size);
                    
                    // 收集權重用於標準化
                    allWeights.push(commonMeetingCount);
                    
                    // 根據閾值類型進行過濾
                    let shouldConnect = false;
                    if (threshold < 1) {
                        // 如果閾值小於1，視為Jaccard相似度閾值
                        shouldConnect = jaccardSimilarity >= threshold;
                    } else {
                        // 如果閾值大於等於1，視為最少共同會議數閾值
                        shouldConnect = commonMeetingCount >= threshold;
                    }
                    
                    if (shouldConnect) {
                        links.push({
                            source: legislators[i].name,
                            target: legislators[j].name,
                            rawWeight: commonMeetingCount, // 原始權重
                            type: 'coattendance',
                            commonMeetings: commonMeetingCount,
                            jaccardSimilarity: jaccardSimilarity,
                            cosineSimilarity: cosineSimilarity,
                            meetingList: Array.from(commonMeetings).slice(0, 5) // 存儲前5個共同會議名稱
                        });
                        filteredConnections++;
                    }
                }
            }
        }
        
        // 標準化權重
        if (allWeights.length > 0 && links.length > 0) {
            const maxWeight = Math.max(...allWeights);
            const minWeight = Math.min(...allWeights);
            console.log(`權重範圍: ${minWeight} - ${maxWeight}`);
            
            // 標準化權重到0.5-3.0範圍，避免線條太粗或太細
            links.forEach(link => {
                if (maxWeight > minWeight) {
                    link.weight = 0.5 + (link.rawWeight - minWeight) / (maxWeight - minWeight) * 2.5;
                } else {
                    link.weight = 1.5; // 如果所有權重相同，使用中等粗細
                }
            });
        }
        
        console.log(`共同會議網路統計:`);
        console.log(`  節點數: ${nodes.length}`);
        console.log(`  總比較次數: ${totalComparisons}`);
        console.log(`  有共同會議的連接: ${validConnections} (${(validConnections/totalComparisons*100).toFixed(1)}%)`);
        console.log(`  通過閾值的連接: ${filteredConnections} (${validConnections > 0 ? (filteredConnections/validConnections*100).toFixed(1) : 0}%)`);
        console.log(`  最終邊數: ${links.length}`);
        console.log(`  網絡密度: ${(links.length / totalComparisons * 100).toFixed(2)}%`);
        
        if (links.length > 0) {
            const normalizedWeights = links.map(l => l.weight);
            const rawWeights = links.map(l => l.rawWeight);
            console.log(`  原始權重範圍: ${Math.min(...rawWeights)} - ${Math.max(...rawWeights)}`);
            console.log(`  標準化權重範圍: ${Math.min(...normalizedWeights).toFixed(2)} - ${Math.max(...normalizedWeights).toFixed(2)}`);
            console.log(`  平均原始權重: ${(rawWeights.reduce((sum, w) => sum + w, 0) / rawWeights.length).toFixed(2)}`);
        }
        
    } else {
        // 如果沒有會議數據，直接顯示錯誤訊息
        console.error('❌ 無會議出席數據，無法建立共同出席會議網路');
        throw new Error('缺少會議出席數據檔案 (meeting_attendance_analysis/委員會議出席矩陣.csv)，無法建立共同出席會議網路。請確保該檔案存在並可讀取。');
    }

    if (links.length === 0) {
        throw new Error(`在閾值 ${threshold} 下沒有找到任何符合條件的連接。建議降低閾值或檢查數據完整性。`);
    }

    console.log(`生成共同會議網路: ${nodes.length} 個節點, ${links.length} 個連接`);
    
    return { nodes, links };
}

// 建立主題相似度網路
function buildTopicSimilarityNetwork(legislators, threshold) {
    console.log('建立主題相似度網路, 閾值:', threshold);
    
    const nodes = legislators.map(leg => ({
        id: leg.name,
        name: leg.name,
        party: leg.party,
        topics: leg.topics.length,
        degree: 0,
        betweenness: 0
    }));

    const links = [];
    
    // 獲取所有主題ID
    const allTopicIds = [...new Set(legislators.flatMap(leg => 
        leg.allTopics.map(topic => topic.topicId)
    ))].sort((a, b) => a - b);
    
    if (allTopicIds.length === 0) {
        throw new Error('沒有找到主題數據，無法建立主題相似度網路');
    }
    
    // 為每個立委建立主題向量
    const legislatorVectors = legislators.map(legislator => {
        const vector = new Array(allTopicIds.length).fill(0);
        
        legislator.allTopics.forEach(topic => {
            const topicIndex = allTopicIds.indexOf(topic.topicId);
            if (topicIndex !== -1) {
                vector[topicIndex] = topic.score;
            }
        });
        
        return vector;
    });
    
    // 計算餘弦相似度
    for (let i = 0; i < legislators.length; i++) {
        for (let j = i + 1; j < legislators.length; j++) {
            const similarity = calculateCosineSimilarity(legislatorVectors[i], legislatorVectors[j]);
            
            if (similarity >= threshold) {
                links.push({
                    source: legislators[i].name,
                    target: legislators[j].name,
                    weight: similarity,
                    type: 'topic-similarity'
                });
            }
        }
    }

    if (links.length === 0) {
        throw new Error(`在閾值 ${threshold} 下沒有找到任何符合條件的主題相似度連接。建議降低閾值。`);
    }

    console.log(`生成主題相似度網路: ${nodes.length} 個節點, ${links.length} 個連接`);
    
    return { nodes, links };
}

// 計算餘弦相似度
function calculateCosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
        dotProduct += vectorA[i] * vectorB[i];
        normA += vectorA[i] * vectorA[i];
        normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (normA * normB);
}

// 計算網路中心性指標
function calculateNetworkCentrality(networkData, measure) {
    const { nodes, links } = networkData;
    
    // 重置中心性值
    nodes.forEach(node => {
        node.degree = 0;
        node.betweenness = 0;
    });
    
    // 建立鄰接表
    const adjacencyList = new Map();
    nodes.forEach(node => {
        adjacencyList.set(node.id, []);
    });
    
    links.forEach(link => {
        adjacencyList.get(link.source).push(link.target);
        adjacencyList.get(link.target).push(link.source);
    });
    
    // 計算度中心性
    nodes.forEach(node => {
        node.degree = adjacencyList.get(node.id).length;
    });
    
    // 計算介數中心性（簡化版本）
    if (measure === 'betweenness') {
        calculateBetweennessCentrality(nodes, adjacencyList);
    }
    
    console.log('中心性計算完成');
}

// 計算介數中心性
function calculateBetweennessCentrality(nodes, adjacencyList) {
    const betweenness = new Map();
    nodes.forEach(node => betweenness.set(node.id, 0));
    
    // 簡化的介數中心性計算
    nodes.forEach(source => {
        const stack = [];
        const predecessors = new Map();
        const distances = new Map();
        const sigma = new Map();
        const delta = new Map();
        
        nodes.forEach(node => {
            predecessors.set(node.id, []);
            distances.set(node.id, -1);
            sigma.set(node.id, 0);
            delta.set(node.id, 0);
        });
        
        distances.set(source.id, 0);
        sigma.set(source.id, 1);
        
        const queue = [source.id];
        
        while (queue.length > 0) {
            const v = queue.shift();
            stack.push(v);
            
            const neighbors = adjacencyList.get(v) || [];
            neighbors.forEach(w => {
                if (distances.get(w) < 0) {
                    queue.push(w);
                    distances.set(w, distances.get(v) + 1);
                }
                
                if (distances.get(w) === distances.get(v) + 1) {
                    sigma.set(w, sigma.get(w) + sigma.get(v));
                    predecessors.get(w).push(v);
                }
            });
        }
        
        while (stack.length > 0) {
            const w = stack.pop();
            const preds = predecessors.get(w);
            preds.forEach(v => {
                const contribution = (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w));
                delta.set(v, delta.get(v) + contribution);
            });
            
            if (w !== source.id) {
                betweenness.set(w, betweenness.get(w) + delta.get(w));
            }
        }
    });
    
    // 正規化並設置到節點
    const n = nodes.length;
    const normalizationFactor = n > 2 ? 2.0 / ((n - 1) * (n - 2)) : 1;
    
    nodes.forEach(node => {
        node.betweenness = betweenness.get(node.id) * normalizationFactor;
    });
}

// 渲染網路圖 - 修改：確保隱藏placeholder並顯示網路圖
function renderNetworkGraph(networkData, centralityMeasure) {
    const { nodes, links } = networkData;
    
    // 隱藏placeholder
    const container = document.getElementById('network-container');
    const placeholder = container.querySelector('.network-placeholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    
    // 初始化可視化
    if (!networkSvg) {
        initializeNetworkVisualization();
    }
    
    const width = parseInt(networkSvg.attr('width'));
    const height = parseInt(networkSvg.attr('height'));
    
    // 確保SVG可見
    networkSvg.style('display', 'block');
    
    // 清除舊的圖形
    networkSvg.select('.network-group').selectAll('*').remove();
    
    const g = networkSvg.select('.network-group');
    
    // 根據中心性設置節點大小
    const centralityValues = nodes.map(d => d[centralityMeasure] || d.degree);
    const maxCentrality = Math.max(...centralityValues);
    const minCentrality = Math.min(...centralityValues);
    
    const sizeScale = d3.scaleLinear()
        .domain([minCentrality, maxCentrality])
        .range([8, 25]);
    
    // 繪製連接線 - 修改：使用標準化後的權重
    const link = g.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('class', 'network-link')
        .attr('stroke', '#999')
        .attr('stroke-width', d => d.weight || 1) // 使用標準化後的權重
        .attr('stroke-opacity', 0.6);
    
    // 繪製節點
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('circle')
        .data(nodes)
        .enter().append('circle')
        .attr('class', 'network-node')
        .attr('r', d => sizeScale(d[centralityMeasure] || d.degree))
        .attr('fill', d => partyColorMap[d.party] || partyColorMap['未知'])
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended))
        .on('click', handleNodeClick)
        .on('mouseover', handleNodeMouseover)
        .on('mouseout', handleNodeMouseout);
    
    // 添加節點標籤
    const labels = g.append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(nodes)
        .enter().append('text')
        .attr('class', 'network-text')
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .text(d => d.name)
        .style('font-size', '10px')
        .style('font-family', 'Arial, sans-serif')
        .style('fill', '#333')
        .style('pointer-events', 'none')
        .style('display', 'block'); // 預設隱藏標籤
    
    // 更新力導向模擬
    networkSimulation
        .nodes(nodes)
        .force('link').links(links);
    
    networkSimulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        labels
            .attr('x', d => d.x)
            .attr('y', d => d.y);
    });
    
    // 重新啟動模擬
    networkSimulation.alpha(1).restart();
    
    // 儲存當前元素供其他函數使用
    window.currentNetworkElements = { node, link, labels };
    
    console.log('✅ 網路圖渲染完成');
}

// 處理節點點擊事件 - 修改：阻止事件冒泡
function handleNodeClick(event, d) {
    event.stopPropagation();
    
    // 重置所有節點樣式
    clearNodeSelection();
    
    // 選中當前節點
    d3.select(this).classed('selected', true);
    selectedNode = d;
    
    // 高亮相關連接
    window.currentNetworkElements.link
        .classed('highlighted', link => 
            (link.source.id === d.id) || (link.target.id === d.id)
        );
    
    // 顯示節點詳細信息
    showNodeDetails(d);
}

// 處理節點滑鼠懸停 - 修改：顯示網路類型相關信息
function handleNodeMouseover(event, d) {
    // 顯示臨時標籤
    window.currentNetworkElements.labels
        .filter(label => label.id === d.id)
        .style('display', 'block');
    
    // 計算該節點的連接統計
    let connectionInfo = '';
    if (currentNetworkData && currentNetworkData.links) {
        const relatedLinks = currentNetworkData.links.filter(link => 
            (link.source.id === d.id) || (link.target.id === d.id) ||
            (link.source === d.id) || (link.target === d.id)
        );
        
        if (relatedLinks.length > 0) {
            const networkType = document.getElementById('network-type').value;
            if (networkType === 'coattendance') {
                const totalCommonMeetings = relatedLinks.reduce((sum, link) => 
                    sum + (link.commonMeetings || 0), 0);
                const avgCommonMeetings = totalCommonMeetings / relatedLinks.length;
                connectionInfo = `<br>總共同會議數: ${totalCommonMeetings}<br>平均共同會議數: ${avgCommonMeetings.toFixed(1)}`;
            } else {
                const avgSimilarity = relatedLinks.reduce((sum, link) => 
                    sum + (link.weight || 0), 0) / relatedLinks.length;
                connectionInfo = `<br>平均主題相似度: ${avgSimilarity.toFixed(4)}`;
            }
        }
    }
    
    // 顯示tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'network-tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', 1000);
    
    tooltip.html(`
        <strong>${d.name}</strong><br>
        政黨: ${d.party}<br>
        度中心性: ${d.degree}<br>
        介數中心性: ${d.betweenness.toFixed(4)}<br>
        關注主題數: ${d.topics}${connectionInfo}
    `)
    .style('left', (event.pageX + 10) + 'px')
    .style('top', (event.pageY - 10) + 'px');
}

// 處理節點滑鼠離開
function handleNodeMouseout(event, d) {
    // 隱藏標籤
    window.currentNetworkElements.labels
        .filter(label => label.id === d.id)
        .style('display', 'none');
    
    // 移除tooltip
    d3.selectAll('.network-tooltip').remove();
}

// 顯示節點詳細信息 - 修改：顯示標準化權重信息
function showNodeDetails(nodeData) {
    const infoPanel = document.getElementById('node-info-panel');
    const detailsDiv = document.getElementById('node-details');
    
    // 獲取立委完整信息
    const legislator = currentData.legislators.find(leg => leg.name === nodeData.name);
    
    if (!legislator) {
        console.error('找不到立委信息:', nodeData.name);
        return;
    }
    
    // 獲取連接的其他立委
    const connections = [];
    if (currentNetworkData && currentNetworkData.links) {
        currentNetworkData.links.forEach(link => {
            if (link.source.id === nodeData.id || link.source === nodeData.id) {
                const targetName = link.target.id || link.target;
                if (targetName !== nodeData.id) {
                    connections.push({
                        name: targetName,
                        weight: link.weight,
                        rawWeight: link.rawWeight,
                        type: link.type,
                        commonMeetings: link.commonMeetings,
                        jaccardSimilarity: link.jaccardSimilarity,
                        meetingList: link.meetingList
                    });
                }
            } else if (link.target.id === nodeData.id || link.target === nodeData.id) {
                const sourceName = link.source.id || link.source;
                if (sourceName !== nodeData.id) {
                    connections.push({
                        name: sourceName,
                        weight: link.weight,
                        rawWeight: link.rawWeight,
                        type: link.type,
                        commonMeetings: link.commonMeetings,
                        jaccardSimilarity: link.jaccardSimilarity,
                        meetingList: link.meetingList
                    });
                }
            }
        });
    }
    
    // 排序連接
    connections.sort((a, b) => (b.rawWeight || b.weight) - (a.rawWeight || a.weight));
    
    let html = `
        <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
            <h5 style="margin: 0;">${legislator.name}</h5>
            <button onclick="hideNodeDetails()" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px;">✕</button>
        </div>
        <p><strong>政黨:</strong> ${legislator.party}</p>
        <p><strong>關注主題數:</strong> ${legislator.topics.length}</p>
        <p><strong>度中心性:</strong> ${nodeData.degree}</p>
        <p><strong>介數中心性:</strong> ${nodeData.betweenness.toFixed(4)}</p>
        
        <h6>主要關注主題:</h6>
        <ul style="max-height: 120px; overflow-y: auto; margin: 0; padding-left: 20px;">
    `;
    
    legislator.topics.slice(0, 5).forEach(topic => {
        const topicInfo = currentData.topics.find(t => t.id === topic.topicId);
        const topicName = topicInfo ? topicInfo.name : `主題${topic.topicId}`;
        html += `<li style="font-size: 12px;">${topicName} (${topic.score.toFixed(2)})</li>`;
    });
    
    html += `</ul>`;
    
    if (connections.length > 0) {
        const networkType = document.getElementById('network-type').value;
        const isCoattendance = networkType === 'coattendance';
        
        html += `
            <h6>網路連接 (前5名):</h6>
            <ul style="max-height: 150px; overflow-y: auto; margin: 0; padding-left: 20px;">
        `;
        
        connections.slice(0, 5).forEach(conn => {
            const connLegislator = currentData.legislators.find(leg => leg.name === conn.name);
            const party = connLegislator ? connLegislator.party : '未知';
            
            let connectionDetail = '';
            if (isCoattendance && conn.commonMeetings) {
                connectionDetail = `共同會議: ${conn.commonMeetings}`;
                if (conn.jaccardSimilarity) {
                    connectionDetail += `, 相似度: ${conn.jaccardSimilarity.toFixed(3)}`;
                }
            } else {
                connectionDetail = `相似度: ${(conn.rawWeight || conn.weight).toFixed(3)}`;
            }
            
            html += `<li style="font-size: 12px;">${conn.name} (${party})<br>${connectionDetail}</li>`;
        });
        
        html += `</ul>`;
    }
    
    detailsDiv.innerHTML = html;
    infoPanel.style.display = 'block';
}

// 更新網路閾值
function updateNetworkThreshold(newThreshold) {
    const networkType = document.getElementById('network-type').value;
    const centralityMeasure = document.getElementById('centrality-measure').value;
    
    console.log('更新網路閾值:', newThreshold);
    
    try {
        const networkData = buildNetworkData(networkType, newThreshold);
        currentNetworkData = networkData;
        
        calculateNetworkCentrality(networkData, centralityMeasure);
        renderNetworkGraph(networkData, centralityMeasure);
        updateNetworkStats(networkData);
        
    } catch (error) {
        console.error('更新網路閾值失敗:', error);
        showStatus('❌ ' + error.message, 'error');
    }
}

// 更新網路統計信息
function updateNetworkStats(networkData) {
    const { nodes, links } = networkData;
    
    document.getElementById('network-nodes').textContent = nodes.length;
    document.getElementById('network-edges').textContent = links.length;
    
    // 計算網路密度
    const maxPossibleEdges = (nodes.length * (nodes.length - 1)) / 2;
    const density = maxPossibleEdges > 0 ? (links.length / maxPossibleEdges).toFixed(3) : '0.000';
    document.getElementById('network-density').textContent = density;
}

// 重置網路視圖
function resetNetworkView() {
    selectedNode = null;
    
    // 隱藏詳細信息面板
    hideNodeDetails();
    
    // 重置所有樣式
    clearNodeSelection();
    
    // 重置控制項
    const thresholdSlider = document.getElementById('threshold-slider');
    const thresholdValue = document.getElementById('threshold-value');
    if (thresholdSlider) thresholdSlider.value = 0.1;
    if (thresholdValue) thresholdValue.textContent = '0.1';
    
    // 清除網路圖並顯示placeholder
    const container = document.getElementById('network-container');
    if (networkSvg) {
        networkSvg.style('display', 'none');
        networkSvg.select('.network-group').selectAll('*').remove();
    }
    
    // 顯示placeholder
    const placeholder = container.querySelector('.network-placeholder');
    if (placeholder) {
        placeholder.style.display = 'block';
    } else {
        // 如果沒有placeholder，創建一個
        const newPlaceholder = document.createElement('div');
        newPlaceholder.className = 'network-placeholder';
        newPlaceholder.innerHTML = `
            <h3>📊 互動式網路圖</h3>
            <p>選擇網路類型和參數，點擊"生成網路圖"開始分析</p>
        `;
        container.appendChild(newPlaceholder);
    }
    
    // 重置統計
    document.getElementById('network-nodes').textContent = '-';
    document.getElementById('network-edges').textContent = '-';
    document.getElementById('network-density').textContent = '-';
    
    console.log('網路視圖已重置');
}

// 拖拽事件處理
function dragstarted(event, d) {
    if (!event.active) networkSimulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) networkSimulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

// 初始化網路可視化模塊
document.addEventListener('DOMContentLoaded', function() {
    // 在頁面載入完成後初始化網路圖容器
    setTimeout(() => {
        if (document.getElementById('network-container')) {
            initializeNetworkVisualization();
        }
    }, 1000);
});