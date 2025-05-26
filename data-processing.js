// data-processing.js - 數據處理模塊

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
        const topicInfoData = await loadCSVFile('topic_info_20250526.csv');
        console.log('✅ 主題信息載入完成:', topicInfoData.length);

        // 6. 嘗試載入主題立委映射
        let topicLegislatorData = [];
        try {
            topicLegislatorData = await loadCSVFile('legislator_network_analysis_bertopic/主題立法委員映射.csv');
            console.log('✅ 主題立委映射載入完成:', topicLegislatorData.length);
        } catch (e) {
            console.warn('⚠️ 主題立委映射文件未找到，將從基礎數據生成');
        }

        // 7. 嘗試載入會議出席矩陣（用於社群分析）
        let meetingAttendanceData = [];
        try {
            meetingAttendanceData = await loadCSVFile('meeting_attendance_analysis/委員會議出席矩陣.csv');
            console.log('✅ 會議出席矩陣載入完成:', meetingAttendanceData.length);
        } catch (e) {
            console.warn('⚠️ 會議出席矩陣未找到，社群分析將使用主題相似度方法');
        }

        // 8. 嘗試載入立委主題矩陣（用於主題相似度社群分析）
        let legislatorTopicMatrixData = [];
        try {
            legislatorTopicMatrixData = await loadCSVFile('bertopic_analysis_optimized/legislator_topic_matrix.csv');
            console.log('✅ 立委主題矩陣載入完成:', legislatorTopicMatrixData.length);
        } catch (e) {
            console.warn('⚠️ 立委主題矩陣未找到，將從基礎數據生成');
        }

        // 轉換和整合數據
        console.log('🔄 開始整合數據...');
        const processed = processRealData({
            memberMapping: memberMappingData,
            legislatorInterest: legislatorInterestData,
            legislatorStats: legislatorStatsData,
            networkAnalysis: networkAnalysisData,
            topicInfo: topicInfoData,
            topicLegislator: topicLegislatorData,
            meetingAttendance: meetingAttendanceData,
            legislatorTopicMatrix: legislatorTopicMatrixData
        });

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

        // 設置會議數據供社群分析使用 - 這是關鍵修復
        setupMeetingDataForCommunityAnalysis(legislatorInterestData, meetingAttendanceData);

        console.log('✅ 數據整合完成:', currentData);

    } catch (error) {
        console.error('載入真實數據失敗:', error);
        throw error;
    }
}

// 設置會議數據供社群分析使用 - 新增函數
function setupMeetingDataForCommunityAnalysis(legislatorInterestData, meetingAttendanceData) {
    console.log('🔄 設置會議數據供社群分析使用...');
    
    // 方法1: 嘗試從立委主題關心度數據中提取會議檔案信息
    if (legislatorInterestData && legislatorInterestData.length > 0) {
        const documentTopicsData = [];
        
        legislatorInterestData.forEach(row => {
            const name = row['委員姓名'] || row['name'] || row['立委姓名'];
            const file = row['會議檔案'] || row['file'] || row['文件名'] || row['document'];
            
            if (name && file && file !== '') {
                documentTopicsData.push({
                    name: name,
                    file: file
                });
            }
        });
        
        if (documentTopicsData.length > 0) {
            window.documentTopicsData = documentTopicsData;
            console.log('✅ 從立委主題數據中提取會議信息:', documentTopicsData.length, '條記錄');
            return;
        }
    }
    
    // 方法2: 如果有會議出席矩陣，轉換為文檔主題格式
    if (meetingAttendanceData && meetingAttendanceData.length > 0) {
        const documentTopicsData = [];
        
        meetingAttendanceData.forEach(row => {
            const legislatorName = row['委員姓名'] || row['name'] || row['立委姓名'];
            if (!legislatorName) return;
            
            // 獲取所有會議列（除了委員姓名列）
            const meetingColumns = Object.keys(row).filter(col => 
                col !== '委員姓名' && col !== 'name' && col !== '立委姓名'
            );
            
            // 為每個立委添加其參與的會議
            meetingColumns.forEach(meeting => {
                const attended = parseInt(row[meeting]) || 0;
                if (attended > 0) {
                    documentTopicsData.push({
                        name: legislatorName,
                        file: meeting
                    });
                }
            });
        });
        
        if (documentTopicsData.length > 0) {
            window.documentTopicsData = documentTopicsData;
            console.log('✅ 從會議出席矩陣中提取會議信息:', documentTopicsData.length, '條記錄');
            return;
        }
    }
    
    // 方法3: 生成基於立委名稱的模擬會議數據（更有意義的模擬）
    if (currentData && currentData.legislators) {
        const documentTopicsData = [];
        
        currentData.legislators.forEach(legislator => {
            // 基於立委的政黨和主題生成相關會議
            const partyMeetings = [`${legislator.party}黨團會議`, `${legislator.party}政策討論會`];
            const topicMeetings = legislator.topics.slice(0, 5).map((topic, index) => {
                const topicData = currentData.topics.find(t => t.id === topic.topicId);
                const topicName = topicData ? topicData.name : `主題${topic.topicId}`;
                return `${topicName}相關會議`;
            });
            
            const allMeetings = [...partyMeetings, ...topicMeetings];
            
            allMeetings.forEach(meeting => {
                documentTopicsData.push({
                    name: legislator.name,
                    file: meeting
                });
            });
        });
        
        window.documentTopicsData = documentTopicsData;
        console.log('✅ 生成基於政黨和主題的模擬會議數據:', documentTopicsData.length, '條記錄');
        return;
    }
    
    console.warn('⚠️ 無法設置會議數據，社群分析將使用完全隨機的模擬數據');
}

// 處理主題分數數據並匹配政黨信息
function processTopicScoresWithParty(topicScoresData, memberNameMap, memberIdMap) {
    return topicScoresData.map(row => {
        const legislatorName = row['委員姓名'] || row['name'] || row['立委姓名'];
        let party = row['政黨'] || '';

        if (!party || party === '未知' || party === '') {
            let memberInfo = memberNameMap.get(legislatorName) || memberIdMap.get(legislatorName);

            if (!memberInfo && legislatorName) {
                const cleanName = legislatorName.trim().replace(/\s+/g, '');
                memberInfo = memberNameMap.get(cleanName);
            }

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

        if (!party || party === '未知' || party === '') {
            let memberInfo = memberNameMap.get(legislatorName) || memberIdMap.get(legislatorName);

            if (!memberInfo && legislatorName) {
                const cleanName = legislatorName.trim().replace(/\s+/g, '');
                memberInfo = memberNameMap.get(cleanName);
            }

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
                    name: name,
                    keywords: cleanKeywords,
                    keywordList: keywordPairs,
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
        memberNameMap: memberNameMap,
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