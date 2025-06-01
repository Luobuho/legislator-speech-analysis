// community-analysis.js - 改進的社群分析模塊新版

let currentCommunityMethod = 'topic-similarity'; // 預設使用主題相似度方法
let currentAdjacencyMatrix = null;
let currentLegislatorIndexMap = null;

// 改進的Louvain算法實現 - 使用第一個文件的優秀實現
class LouvainCommunityDetection {
    constructor(adjacencyMatrix, nodeNames) {
        this.adjacencyMatrix = adjacencyMatrix;
        this.nodeNames = nodeNames;
        this.nodeCount = adjacencyMatrix.length;
        this.communities = [];
        this.nodeToCommunity = new Array(this.nodeCount);
        this.communityWeights = [];
        this.totalWeight = 0;
        this.nodeWeights = [];

        this.initialize();
    }

    initialize() {
        // 計算節點權重和總權重
        this.nodeWeights = new Array(this.nodeCount).fill(0);
        this.totalWeight = 0;

        for (let i = 0; i < this.nodeCount; i++) {
            for (let j = 0; j < this.nodeCount; j++) {
                this.nodeWeights[i] += this.adjacencyMatrix[i][j];
                if (i <= j) { // 避免重複計算
                    this.totalWeight += this.adjacencyMatrix[i][j];
                }
            }
        }

        // 初始化：每個節點為一個社群
        for (let i = 0; i < this.nodeCount; i++) {
            this.nodeToCommunity[i] = i;
            this.communities.push([i]);
            this.communityWeights.push(this.nodeWeights[i]);
        }
    }

    // 計算模組性
    calculateModularity() {
        let modularity = 0;

        for (let i = 0; i < this.nodeCount; i++) {
            for (let j = 0; j < this.nodeCount; j++) {
                if (this.nodeToCommunity[i] === this.nodeToCommunity[j]) {
                    const expected = (this.nodeWeights[i] * this.nodeWeights[j]) / (2 * this.totalWeight);
                    modularity += this.adjacencyMatrix[i][j] - expected;
                }
            }
        }

        return modularity / (2 * this.totalWeight);
    }

    // 計算將節點移動到新社群的模組性增益
    calculateModularityGain(nodeId, newCommunity) {
        const currentCommunity = this.nodeToCommunity[nodeId];
        if (currentCommunity === newCommunity) return 0;

        let sumIn = 0; // 新社群內部邊權重
        let sumTot = 0; // 新社群總權重
        let sumOldIn = 0; // 原社群內部邊權重
        let sumOldTot = 0; // 原社群總權重

        // 計算與新社群的連接
        for (let i = 0; i < this.nodeCount; i++) {
            if (this.nodeToCommunity[i] === newCommunity) {
                sumIn += this.adjacencyMatrix[nodeId][i];
                sumTot += this.nodeWeights[i];
            }
            if (this.nodeToCommunity[i] === currentCommunity && i !== nodeId) {
                sumOldIn += this.adjacencyMatrix[nodeId][i];
                sumOldTot += this.nodeWeights[i];
            }
        }

        const ki = this.nodeWeights[nodeId];
        const m2 = 2 * this.totalWeight;

        // 計算增益
        const deltaQ = (sumIn / m2) - Math.pow((sumTot + ki) / m2, 2) + Math.pow(sumTot / m2, 2) + Math.pow(ki / m2, 2)
            - (sumOldIn / m2) + Math.pow((sumOldTot + ki) / m2, 2) - Math.pow(sumOldTot / m2, 2) - Math.pow(ki / m2, 2);

        return deltaQ;
    }

    // 執行一輪Louvain算法
    performOnePass() {
        let improvement = false;
        const order = Array.from({ length: this.nodeCount }, (_, i) => i);

        // 隨機打亂順序
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }

        for (const nodeId of order) {
            const currentCommunity = this.nodeToCommunity[nodeId];
            let bestCommunity = currentCommunity;
            let bestGain = 0;

            // 檢查所有鄰居的社群
            const neighborCommunities = new Set();
            for (let j = 0; j < this.nodeCount; j++) {
                if (this.adjacencyMatrix[nodeId][j] > 0 && j !== nodeId) {
                    neighborCommunities.add(this.nodeToCommunity[j]);
                }
            }

            for (const community of neighborCommunities) {
                const gain = this.calculateModularityGain(nodeId, community);
                if (gain > bestGain) {
                    bestGain = gain;
                    bestCommunity = community;
                }
            }

            // 移動到最佳社群
            if (bestCommunity !== currentCommunity) {
                this.nodeToCommunity[nodeId] = bestCommunity;
                improvement = true;
            }
        }

        return improvement;
    }

    // 重新整理社群編號
    consolidateCommunities() {
        const communityMap = new Map();
        let newCommunityId = 0;

        for (let i = 0; i < this.nodeCount; i++) {
            const oldCommunity = this.nodeToCommunity[i];
            if (!communityMap.has(oldCommunity)) {
                communityMap.set(oldCommunity, newCommunityId++);
            }
            this.nodeToCommunity[i] = communityMap.get(oldCommunity);
        }

        // 重建社群結構
        this.communities = [];
        for (let i = 0; i < newCommunityId; i++) {
            this.communities.push([]);
        }

        for (let i = 0; i < this.nodeCount; i++) {
            this.communities[this.nodeToCommunity[i]].push(i);
        }

        return newCommunityId;
    }

    // 執行完整的Louvain算法
    detectCommunities() {
        const maxIterations = 100;
        let iteration = 0;

        while (iteration < maxIterations) {
            const improved = this.performOnePass();
            if (!improved) break;
            iteration++;
        }

        this.consolidateCommunities();

        return {
            communities: this.communities,
            nodeToCommunity: this.nodeToCommunity,
            modularity: this.calculateModularity(),
            iterations: iteration
        };
    }
}

// 計算餘弦相似度
function calculateCosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        throw new Error('向量長度不一致');
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

// 基於主題相似度構建鄰接矩陣 - 使用改進的算法
function buildTopicSimilarityAdjacencyMatrix(legislators, targetCommunities = 8) {
    console.log('構建基於主題相似度的鄰接矩陣 (相似度閾值: 0.673)...');
    
    const n = legislators.length;
    let adjacencyMatrix = Array(n).fill().map(() => Array(n).fill(0));
    const SIMILARITY_THRESHOLD = 0.673; // 使用第一個文件中的有效閾值
    
    // 獲取所有主題ID
    const allTopicIds = [...new Set(legislators.flatMap(leg => 
        leg.allTopics.map(topic => topic.topicId)
    ))].sort((a, b) => a - b);
    
    console.log(`發現 ${allTopicIds.length} 個不重複主題`);
    
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
    
    // 計算餘弦相似度矩陣
    let totalSimilarities = 0;
    let validSimilarities = 0;
    let filteredConnections = 0;
    
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const similarity = calculateCosineSimilarity(legislatorVectors[i], legislatorVectors[j]);
            totalSimilarities++;
            
            if (similarity > 0) {
                validSimilarities++;
                
                // 應用固定閾值過濾
                if (similarity >= SIMILARITY_THRESHOLD) {
                    adjacencyMatrix[i][j] = similarity;
                    adjacencyMatrix[j][i] = similarity;
                    filteredConnections++;
                }
            }
        }
    }
    
    // 統計連接信息
    let edgeCount = 0;
    let totalWeight = 0;
    let maxSimilarity = 0;
    let minSimilarity = 1;
    
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (adjacencyMatrix[i][j] > 0) {
                edgeCount++;
                totalWeight += adjacencyMatrix[i][j];
                maxSimilarity = Math.max(maxSimilarity, adjacencyMatrix[i][j]);
                if (minSimilarity === 1) minSimilarity = adjacencyMatrix[i][j];
                else minSimilarity = Math.min(minSimilarity, adjacencyMatrix[i][j]);
            }
        }
    }
    
    console.log(`主題相似度網絡統計:`);
    console.log(`  節點數: ${n}`);
    console.log(`  總可能連接數: ${totalSimilarities}`);
    console.log(`  有相似度的連接數: ${validSimilarities} (${(validSimilarities/totalSimilarities*100).toFixed(1)}%)`);
    console.log(`  通過閾值的連接數: ${filteredConnections} (${(filteredConnections/validSimilarities*100).toFixed(1)}%)`);
    console.log(`  最終邊數: ${edgeCount}`);
    console.log(`  相似度範圍: ${edgeCount > 0 ? minSimilarity.toFixed(4) : 0} - ${maxSimilarity.toFixed(4)}`);
    console.log(`  平均權重: ${edgeCount > 0 ? (totalWeight / edgeCount).toFixed(4) : 0}`);
    console.log(`  網絡密度: ${(edgeCount / totalSimilarities * 100).toFixed(2)}%`);
    
    return adjacencyMatrix;
}

// 基於共同會議構建鄰接矩陣
function buildCoattendanceAdjacencyMatrix(legislators, documentTopicsData, targetCommunities = 8) {
    console.log('構建基於共同會議的鄰接矩陣 (餘弦相似度閾值: 0.673)...');
    
    const n = legislators.length;
    let adjacencyMatrix = Array(n).fill().map(() => Array(n).fill(0));
    const COSINE_THRESHOLD = 0.673; // 使用改進的閾值
    
    // 建立立委名稱到索引的映射
    const nameToIndex = new Map();
    legislators.forEach((leg, index) => {
        nameToIndex.set(leg.name, index);
    });
    
    // 建立立委-會議映射
    const legislatorMeetings = new Map();
    
    if (documentTopicsData && documentTopicsData.length > 0) {
        documentTopicsData.forEach(row => {
            const name = row.name;
            const meeting = row.file;
            
            if (name && meeting && nameToIndex.has(name)) {
                if (!legislatorMeetings.has(name)) {
                    legislatorMeetings.set(name, new Set());
                }
                legislatorMeetings.get(name).add(meeting);
            }
        });
    } else {
        // 使用調整後的模擬數據
        console.warn('沒有會議數據，使用模擬共同會議關係');
        legislators.forEach((leg, i) => {
            const meetings = new Set();
            // 調整模擬參數以配合0.673閾值
            const numMeetings = Math.floor(Math.random() * 12) + 8;
            for (let j = 0; j < numMeetings; j++) {
                meetings.add(`會議${Math.floor(Math.random() * 20)}`);
            }
            legislatorMeetings.set(leg.name, meetings);
        });
    }
    
    // 獲取所有會議
    const allMeetings = [...new Set(Array.from(legislatorMeetings.values())
        .flatMap(meetings => Array.from(meetings)))].sort();
    
    console.log(`發現 ${allMeetings.length} 個不重複會議`);
    
    // 為每個立委建立會議參與向量
    const legislatorVectors = legislators.map(legislator => {
        const vector = new Array(allMeetings.length).fill(0);
        const meetings = legislatorMeetings.get(legislator.name) || new Set();
        
        allMeetings.forEach((meeting, index) => {
            vector[index] = meetings.has(meeting) ? 1 : 0;
        });
        
        return vector;
    });
    
    // 計算餘弦相似度矩陣
    let totalPairs = 0;
    let validConnections = 0;
    let filteredConnections = 0;
    let maxCosine = 0;
    let minCosine = 1;
    
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            totalPairs++;
            
            // 計算餘弦相似度
            const cosineSimilarity = calculateCosineSimilarity(legislatorVectors[i], legislatorVectors[j]);
            
            if (cosineSimilarity > 0) {
                validConnections++;
                
                // 應用固定閾值過濾
                if (cosineSimilarity >= COSINE_THRESHOLD) {
                    adjacencyMatrix[i][j] = cosineSimilarity;
                    adjacencyMatrix[j][i] = cosineSimilarity;
                    filteredConnections++;
                    
                    maxCosine = Math.max(maxCosine, cosineSimilarity);
                    if (minCosine === 1) minCosine = cosineSimilarity;
                    else minCosine = Math.min(minCosine, cosineSimilarity);
                }
            }
        }
    }
    
    // 統計連接信息
    let edgeCount = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (adjacencyMatrix[i][j] > 0) {
                edgeCount++;
                totalWeight += adjacencyMatrix[i][j];
            }
        }
    }
    
    console.log(`共同會議網絡統計 (餘弦相似度):`);
    console.log(`  節點數: ${n}`);
    console.log(`  會議數: ${allMeetings.length}`);
    console.log(`  總可能連接數: ${totalPairs}`);
    console.log(`  有共同會議的連接數: ${validConnections} (${(validConnections/totalPairs*100).toFixed(1)}%)`);
    console.log(`  通過閾值的連接數: ${filteredConnections} (${(filteredConnections/validConnections*100).toFixed(1)}%)`);
    console.log(`  最終邊數: ${edgeCount}`);
    console.log(`  餘弦相似度範圍: ${edgeCount > 0 ? minCosine.toFixed(4) : 0} - ${maxCosine.toFixed(4)}`);
    console.log(`  平均權重: ${edgeCount > 0 ? (totalWeight / edgeCount).toFixed(4) : 0}`);
    console.log(`  網絡密度: ${(edgeCount / totalPairs * 100).toFixed(2)}%`);
    
    return adjacencyMatrix;
}

// 社群分析主函數 - 使用改進的算法
function analyzeCommunities(method = 'topic-similarity', maxCommunities = 8) {
    console.log(`使用 ${method} 方法進行社群分析，最多 ${maxCommunities} 個社群，相似度閾值: 0.673...`);
    
    if (!currentData || !currentData.legislators || currentData.legislators.length === 0) {
        console.error('立委數據未載入');
        return null;
    }
    
    const legislators = currentData.legislators;
    const legislatorNames = legislators.map(leg => leg.name);
    let adjacencyMatrix;
    
    // 先分析閾值效果
    analyzeThresholdEffect(legislators, 0.673);

    // 建立立委名稱到索引的映射
    currentLegislatorIndexMap = new Map();
    legislators.forEach((leg, index) => {
        currentLegislatorIndexMap.set(leg.name, index);
    });
    
    // 根據方法構建不同的鄰接矩陣
    if (method === 'topic-similarity') {
        adjacencyMatrix = buildTopicSimilarityAdjacencyMatrix(legislators, maxCommunities);
    } else {
        // 需要document_topics_df數據來構建共同會議網絡
        let documentTopicsData = null;
        
        // 嘗試從全域變量獲取會議數據
        if (typeof window !== 'undefined' && window.documentTopicsData) {
            documentTopicsData = window.documentTopicsData;
        }
        
        adjacencyMatrix = buildCoattendanceAdjacencyMatrix(legislators, documentTopicsData, maxCommunities);
    }
    
    // 保存鄰接矩陣到全域變量，供密度計算使用
    currentAdjacencyMatrix = adjacencyMatrix;
    
    // 檢查網絡連通性
    const totalEdges = adjacencyMatrix.reduce((sum, row, i) => 
        sum + row.slice(i+1).reduce((rowSum, val) => rowSum + (val > 0 ? 1 : 0), 0), 0);
    
    if (totalEdges === 0) {
        console.warn('⚠️ 警告: 閾值 0.673 過高，網絡中沒有任何連接！');
        console.log('建議降低閾值或檢查數據質量');
        return null;
    }
    
    console.log(`✅ 網絡構建完成，共 ${totalEdges} 條邊`);
    
    // 使用Louvain算法進行社群檢測
    const louvain = new LouvainCommunityDetection(adjacencyMatrix, legislatorNames);
    const result = louvain.detectCommunities();
    
    console.log(`Louvain算法完成: ${result.communities.length} 個社群, 模組性: ${result.modularity.toFixed(4)}`);
    
    // 將結果轉換為原有格式
    let communities = {};
    
    result.communities.forEach((memberIndices, communityId) => {
        if (memberIndices.length === 0) return;
        
        const members = memberIndices.map(index => legislators[index]);
        
        communities[communityId] = {
            members: members,
            parties: {},
            topics: {},
            method: method === 'topic-similarity' ? '發言內容相似度' : '共同出席會議'
        };
        
        // 統計政黨分布
        members.forEach(legislator => {
            if (!communities[communityId].parties[legislator.party]) {
                communities[communityId].parties[legislator.party] = 0;
            }
            communities[communityId].parties[legislator.party]++;
            
            // 統計主題分布
            legislator.topics.forEach(topic => {
                if (!communities[communityId].topics[topic.topicId]) {
                    communities[communityId].topics[topic.topicId] = 0;
                }
                communities[communityId].topics[topic.topicId] += topic.score;
            });
        });
    });
    
    // 如果社群數量仍然太多，進行合併
    if (Object.keys(communities).length > maxCommunities) {
        console.log(`社群數量 ${Object.keys(communities).length} 超過限制，開始合併...`);
        communities = mergeSmallCommunities(communities, legislators, 3, maxCommunities);
    }
    
    const finalCommunityCount = Object.keys(communities).length;
    const stats = {
        totalCommunities: finalCommunityCount,
        largestCommunity: Math.max(...Object.values(communities).map(c => c.members.length)),
        avgCommunitySize: Object.values(communities).reduce((sum, c) => sum + c.members.length, 0) / finalCommunityCount,
        modularity: result.modularity,
        method: method,
        iterations: result.iterations,
        threshold: 0.673,
        totalEdges: totalEdges
    };
    
    console.log(`最終結果: ${finalCommunityCount} 個社群，閾值: 0.673`);
    
    return {
        communities: communities,
        stats: stats
    };
}

// 合併小社群的函數
function mergeSmallCommunities(communities, legislators, minCommunitySize = 5, maxCommunities = 8) {
    console.log(`開始合併小社群: 原有 ${Object.keys(communities).length} 個社群`);
    
    // 轉換為數組格式便於處理
    let communityArray = Object.entries(communities).map(([id, data]) => ({
        id: parseInt(id),
        ...data,
        size: data.members.length
    }));
    
    // 按大小排序，大社群在前
    communityArray.sort((a, b) => b.size - a.size);
    
    // 如果社群數量已經符合要求且沒有太小的社群，直接返回
    if (communityArray.length <= maxCommunities && 
        communityArray.every(c => c.size >= minCommunitySize)) {
        console.log('社群數量和大小都符合要求，無需合併');
        return communities;
    }
    
    // 保留大社群，合併小社群
    const largeCommunities = [];
    const smallCommunities = [];
    
    for (const community of communityArray) {
        if (community.size >= minCommunitySize && largeCommunities.length < maxCommunities) {
            largeCommunities.push(community);
        } else {
            smallCommunities.push(community);
        }
    }
    
    // 如果大社群數量不足，從小社群中選擇較大的補充
    while (largeCommunities.length < Math.min(maxCommunities, communityArray.length) && smallCommunities.length > 0) {
        const largest = smallCommunities.shift();
        largeCommunities.push(largest);
    }
    
    // 將剩餘的小社群合併到最相似的大社群中
    for (const smallCommunity of smallCommunities) {
        let bestMatch = largeCommunities[0];
        let bestSimilarity = 0;
        
        // 計算與每個大社群的相似度
        for (const largeCommunity of largeCommunities) {
            const similarity = calculateCommunitySimilarity(smallCommunity, largeCommunity);
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = largeCommunity;
            }
        }
        
        // 合併到最相似的大社群
        bestMatch.members = bestMatch.members.concat(smallCommunity.members);
        bestMatch.size = bestMatch.members.length;
        
        // 重新計算政黨和主題分布
        bestMatch.parties = {};
        bestMatch.topics = {};
        
        bestMatch.members.forEach(legislator => {
            if (!bestMatch.parties[legislator.party]) {
                bestMatch.parties[legislator.party] = 0;
            }
            bestMatch.parties[legislator.party]++;
            
            legislator.topics.forEach(topic => {
                if (!bestMatch.topics[topic.topicId]) {
                    bestMatch.topics[topic.topicId] = 0;
                }
                bestMatch.topics[topic.topicId] += topic.score;
            });
        });
    }
    
    // 轉換回原格式
    const mergedCommunities = {};
    largeCommunities.forEach((community, index) => {
        mergedCommunities[index] = {
            members: community.members,
            parties: community.parties,
            topics: community.topics,
            method: community.method
        };
    });
    
    console.log(`合併完成: ${Object.keys(mergedCommunities).length} 個社群`);
    return mergedCommunities;
}

// 計算社群間相似度
function calculateCommunitySimilarity(community1, community2) {
    // 基於政黨分布的相似度
    const parties1 = community1.parties || {};
    const parties2 = community2.parties || {};
    const allParties = new Set([...Object.keys(parties1), ...Object.keys(parties2)]);
    
    let partySimilarity = 0;
    for (const party of allParties) {
        const ratio1 = (parties1[party] || 0) / community1.size;
        const ratio2 = (parties2[party] || 0) / community2.size;
        partySimilarity += Math.min(ratio1, ratio2);
    }
    
    // 基於主題關注的相似度
    const topics1 = community1.topics || {};
    const topics2 = community2.topics || {};
    const allTopics = new Set([...Object.keys(topics1), ...Object.keys(topics2)]);
    
    let topicSimilarity = 0;
    let totalWeight1 = Object.values(topics1).reduce((sum, w) => sum + w, 0) || 1;
    let totalWeight2 = Object.values(topics2).reduce((sum, w) => sum + w, 0) || 1;
    
    for (const topic of allTopics) {
        const weight1 = (topics1[topic] || 0) / totalWeight1;
        const weight2 = (topics2[topic] || 0) / totalWeight2;
        topicSimilarity += Math.min(weight1, weight2);
    }
    
    // 綜合相似度 (政黨40% + 主題60%)
    return partySimilarity * 0.4 + topicSimilarity * 0.6;
}

// 計算社群真實密度的函數
function calculateCommunityDensity(communityMembers, adjacencyMatrix, legislatorIndexMap) {
    const n = communityMembers.length;
    if (n < 2) return 0;
    
    // 獲取社群成員在鄰接矩陣中的索引
    const memberIndices = [];
    communityMembers.forEach(member => {
        const index = legislatorIndexMap.get(member.name);
        if (index !== undefined) {
            memberIndices.push(index);
        }
    });
    
    if (memberIndices.length < 2) return 0;
    
    // 計算實際邊數
    let actualEdges = 0;
    for (let i = 0; i < memberIndices.length; i++) {
        for (let j = i + 1; j < memberIndices.length; j++) {
            const idx1 = memberIndices[i];
            const idx2 = memberIndices[j];
            if (adjacencyMatrix[idx1] && adjacencyMatrix[idx1][idx2] > 0) {
                actualEdges++;
            }
        }
    }
    
    // 計算最大可能邊數
    const maxPossibleEdges = (memberIndices.length * (memberIndices.length - 1)) / 2;
    
    // 返回密度
    return maxPossibleEdges > 0 ? actualEdges / maxPossibleEdges : 0;
}

// 分析閾值效果
function analyzeThresholdEffect(legislators, threshold = 0.673) {
    console.log(`=== 閾值 ${threshold} 效果分析 ===`);
    
    const n = legislators.length;
    
    // 分析主題相似度分布
    const allTopicIds = [...new Set(legislators.flatMap(leg => 
        leg.allTopics.map(topic => topic.topicId)
    ))].sort((a, b) => a - b);
    
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
    
    const similarities = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const similarity = calculateCosineSimilarity(legislatorVectors[i], legislatorVectors[j]);
            if (similarity > 0) {
                similarities.push(similarity);
            }
        }
    }
    
    if (similarities.length > 0) {
        similarities.sort((a, b) => b - a);
        
        const count_above_threshold = similarities.filter(s => s >= threshold).length;
        const percentile_50 = similarities[Math.floor(similarities.length * 0.5)];
        const percentile_25 = similarities[Math.floor(similarities.length * 0.25)];
        const percentile_10 = similarities[Math.floor(similarities.length * 0.1)];
        
        console.log(`相似度統計 (${similarities.length} 個有效連接):`);
        console.log(`  最大值: ${similarities[0].toFixed(4)}`);
        console.log(`  50%分位數: ${percentile_50.toFixed(4)}`);
        console.log(`  25%分位數: ${percentile_25.toFixed(4)}`);
        console.log(`  10%分位數: ${percentile_10.toFixed(4)}`);
        console.log(`  最小值: ${similarities[similarities.length-1].toFixed(4)}`);
        console.log(`  超過閾值 ${threshold} 的連接: ${count_above_threshold} (${(count_above_threshold/similarities.length*100).toFixed(1)}%)`);
        
        // 推薦閾值
        if (count_above_threshold < similarities.length * 0.05) {
            console.log(`⚠️ 警告: 閾值 ${threshold} 可能過高，建議降低到 ${percentile_25.toFixed(3)} 左右`);
        } else if (count_above_threshold > similarities.length * 0.3) {
            console.log(`ℹ️ 提示: 閾值 ${threshold} 較寬鬆，可考慮提高到 ${percentile_10.toFixed(3)} 獲得更緊密的社群`);
        } else {
            console.log(`✅ 閾值 ${threshold} 設定合理`);
        }
    }
}

// 社群分析切換函數
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

// 重新分析社群
function reanalyzeCommunities() {
    showStatus('🔄 重新執行Louvain社群檢測...', 'loading');

    setTimeout(() => {
        try {
            const communityAnalysis = analyzeCommunities(currentCommunityMethod);

            if (communityAnalysis) {
                updateCommunityStats(communityAnalysis);
                renderCommunityTable(communityAnalysis);
                showStatus('✅ 社群重新分析完成！', 'success');
            } else {
                showStatus('❌ 社群重新分析失敗', 'error');
            }
        } catch (error) {
            console.error('社群重新分析錯誤:', error);
            showStatus('❌ 社群重新分析出現錯誤', 'error');
        }

        setTimeout(() => {
            const statusIndicator = document.getElementById('status-indicator');
            if (statusIndicator) {
                statusIndicator.style.display = 'none';
            }
        }, 2000);
    }, 1000);
}

// 載入社群數據
function loadCommunityData() {
    showStatus('🔄 執行Louvain社群檢測...', 'loading');

    setTimeout(() => {
        try {
            const communityAnalysis = analyzeCommunities(currentCommunityMethod);

            if (communityAnalysis) {
                updateCommunityStats(communityAnalysis);
                renderCommunityTable(communityAnalysis);
                showStatus('✅ 社群分析完成！', 'success');
            } else {
                showStatus('❌ 社群分析失敗', 'error');
            }
        } catch (error) {
            console.error('社群分析錯誤:', error);
            showStatus('❌ 社群分析出現錯誤', 'error');
        }

        setTimeout(() => {
            const statusIndicator = document.getElementById('status-indicator');
            if (statusIndicator) {
                statusIndicator.style.display = 'none';
            }
        }, 3000);
    }, 100);
}

// 更新社群統計
function updateCommunityStats(analysis) {
    document.getElementById('total-communities').textContent = analysis.stats.totalCommunities;
    document.getElementById('largest-community').textContent = analysis.stats.largestCommunity;
    document.getElementById('avg-community-size').textContent = analysis.stats.avgCommunitySize.toFixed(1);
    document.getElementById('modularity').textContent = analysis.stats.modularity.toFixed(4);
    
    // 計算並顯示密度統計
    const densityStats = calculateOverallDensityStats(analysis);
    if (densityStats) {
        console.log('整體密度統計:');
        console.log(`  平均密度: ${densityStats.average.toFixed(3)}`);
        console.log(`  最高密度: ${densityStats.maximum.toFixed(3)}`);
        console.log(`  最低密度: ${densityStats.minimum.toFixed(3)}`);
    }
    
    // 添加迭代次數顯示（如果有的話）
    const iterationElement = document.getElementById('iterations');
    if (iterationElement && analysis.stats.iterations !== undefined) {
        iterationElement.textContent = analysis.stats.iterations;
    }
}

// 渲染社群表格
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
                const topicName = topicData ? topicData.name : `主題${topicId}`;
                return `<span class="topic-tag" 
                            style="display: inline-block; background: #f0f8ff; border: 1px solid #3498db; padding: 4px 8px; margin: 2px; border-radius: 12px; font-size: 20px; cursor: pointer;"
                            title="${topicName}: ${keywords}"
                            onmouseover="showTooltip(event, '${topicName}\\n社群關心度: ${score.toFixed(2)}\\n關鍵詞: ${keywords}')"
                            onmouseout="hideTooltip()">
                            ${topicName} (${score.toFixed(1)})
                        </span>`;
            }).join('');

        // 計算真實密度
        let density = 0;
        if (currentAdjacencyMatrix && currentLegislatorIndexMap) {
            density = calculateCommunityDensity(community.members, currentAdjacencyMatrix, currentLegislatorIndexMap);
            console.log(`社群 ${communityId} 密度: ${density.toFixed(3)} (${community.members.length} 個成員)`);
        } else {
            console.warn(`無法計算社群 ${communityId} 的密度：缺少鄰接矩陣數據`);
        }

        const method = currentCommunityMethod === 'coattendance' ? '共同出席會議' : '發言內容相似度';

        row.innerHTML = `
            <td style="text-align: center; width: 80px;" data-sort-value="${communityId}"><strong>社群 ${communityId}</strong></td>
            <td style="text-align: center; width: 120px;">${method}</td>
            <td style="text-align: center; width: 60px;" data-sort-value="${community.members.length}">
                <span class="badge" style="font-size: 20px;">${community.members.length}</span>
            </td>
            <td style="text-align: center; width: 80px;" data-sort-value="${density}" title="密度 = 實際連接數 ÷ 最大可能連接數">
                <strong>${density.toFixed(3)}</strong>
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
    
    // 顯示密度統計摘要
    console.log('社群密度統計摘要:');
    Object.entries(analysis.communities).forEach(([communityId, community]) => {
        if (currentAdjacencyMatrix && currentLegislatorIndexMap) {
            const density = calculateCommunityDensity(community.members, currentAdjacencyMatrix, currentLegislatorIndexMap);
            const densityLevel = density >= 0.7 ? '高密度' : density >= 0.4 ? '中密度' : '低密度';
            console.log(`  社群 ${communityId}: ${density.toFixed(3)} (${densityLevel}) - ${community.members.length} 個成員`);
        }
    });
}

// 計算整體密度統計
function calculateOverallDensityStats(analysis) {
    if (!currentAdjacencyMatrix || !currentLegislatorIndexMap) {
        return null;
    }
    
    const densities = [];
    Object.entries(analysis.communities).forEach(([communityId, community]) => {
        const density = calculateCommunityDensity(community.members, currentAdjacencyMatrix, currentLegislatorIndexMap);
        densities.push({
            communityId: communityId,
            density: density,
            size: community.members.length
        });
    });
    
    if (densities.length === 0) return null;
    
    const avgDensity = densities.reduce((sum, d) => sum + d.density, 0) / densities.length;
    const maxDensity = Math.max(...densities.map(d => d.density));
    const minDensity = Math.min(...densities.map(d => d.density));
    
    return {
        average: avgDensity,
        maximum: maxDensity,
        minimum: minDensity,
        details: densities
    };
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

// 獲取政黨文字顏色
function getPartyTextColor(party) {
    const lightColors = ['未知'];
    return lightColors.includes(party) ? '#2c3e50' : 'white';
}