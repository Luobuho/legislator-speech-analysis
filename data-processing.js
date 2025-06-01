// data-processing.js - 數據處理模塊 (移除虛假數據生成)

// 載入真實數據
async function loadRealData() {
    try {
        // 載入各個分析結果文件
        console.log('開始載入分析結果文件...');

        // 1. 首先載入委員ID對應表（最重要）- 修復Big-5編碼問題
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
                memberMappingData = await loadCSVFileWithEncoding(path, 'big5');
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

        // 7. 載入會議出席矩陣（用於社群分析和網路分析）
        let meetingAttendanceData = [];
        try {
            meetingAttendanceData = await loadCSVFile('meeting_attendance_analysis/委員會議出席矩陣.csv');
            console.log('✅ 會議出席矩陣載入完成:', meetingAttendanceData.length);
            
            if (meetingAttendanceData.length > 0) {
                console.log('會議出席矩陣欄位:', Object.keys(meetingAttendanceData[0]));
                console.log('前3條記錄示例:', meetingAttendanceData.slice(0, 3));
                
                // 分析會議數據結構
                const firstRow = meetingAttendanceData[0];
                const meetingColumns = Object.keys(firstRow).filter(col => 
                    col !== '委員姓名' && col !== 'name' && col !== '立委姓名' && 
                    col !== '委員ID' && col !== 'id' && col !== 'ID'
                );
                console.log(`發現 ${meetingColumns.length} 個會議欄位:`, meetingColumns.slice(0, 5));
            }
        } catch (e) {
            console.warn('⚠️ 會議出席矩陣未找到，相關分析功能將不可用');
            console.warn('錯誤詳情:', e.message);
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
            origins: processed.origins,
            eightDistricts: processed.eightDistricts,
            sevenOrigins: processed.sevenOrigins,
            sevenGrowths: processed.sevenGrowths
        };

        const memberNameMap = processed.memberNameMap;
        const memberIdMap = processed.memberIdMap;

        // 處理相關性計算數據，並確保政黨信息正確匹配
        correlationData = {
            topicScores: processTopicScoresWithParty(legislatorInterestData, memberNameMap, memberIdMap),
            comprehensiveStats: processComprehensiveStatsWithParty(legislatorStatsData, memberNameMap, memberIdMap)
        };

        // 設置會議數據供社群分析和網路分析使用
        setupMeetingDataForCommunityAnalysis(legislatorInterestData, meetingAttendanceData);

        console.log('✅ 數據整合完成:', currentData);

    } catch (error) {
        console.error('載入真實數據失敗:', error);
        throw error;
    }
}

// 新增：支持不同編碼的CSV載入函數
async function loadCSVFileWithEncoding(filePath, encoding = 'utf-8') {
    try {
        console.log(`正在載入檔案: ${filePath} (編碼: ${encoding})`);

        let text;
        
        if (typeof window.fs !== 'undefined' && window.fs.readFile) {
            try {
                if (encoding.toLowerCase() === 'big5') {
                    // 以二進制方式讀取文件
                    const buffer = await window.fs.readFile(filePath);
                    // 使用TextDecoder解碼Big-5
                    const decoder = new TextDecoder('big5');
                    text = decoder.decode(buffer);
                } else {
                    text = await window.fs.readFile(filePath, { encoding: 'utf8' });
                }
                console.log(`使用 window.fs.readFile 讀取成功: ${filePath}`);
            } catch (fsError) {
                console.log(`window.fs.readFile 失敗，嘗試使用 fetch: ${fsError.message}`);
                throw fsError;
            }
        }
        
        if (!text) {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }

            if (encoding.toLowerCase() === 'big5') {
                // 獲取ArrayBuffer並用TextDecoder解碼
                const buffer = await response.arrayBuffer();
                const decoder = new TextDecoder('big5');
                text = decoder.decode(buffer);
            } else {
                text = await response.text();
            }
            
            console.log(`使用 fetch 讀取成功: ${filePath}，大小: ${text.length} 字符`);
        }

        return parseCSV(text);

    } catch (error) {
        console.error(`無法讀取 CSV 檔案 ${filePath}:`, error);
        throw error;
    }
}

// 設置會議數據供社群分析使用 - 修改：移除虛假數據生成
function setupMeetingDataForCommunityAnalysis(legislatorInterestData, meetingAttendanceData) {
    console.log('🔄 設置會議數據供社群分析和網路分析使用...');
    
    // 方法1: 使用會議出席矩陣數據（優先選擇）
    if (meetingAttendanceData && meetingAttendanceData.length > 0) {
        console.log('✅ 使用真實會議出席矩陣數據');
        
        // 處理會議出席矩陣並生成文檔主題格式數據
        const documentTopicsData = [];
        const meetingAttendanceMap = new Map();
        
        meetingAttendanceData.forEach(row => {
            const legislatorName = row['委員姓名'] || row['name'] || row['立委姓名'] || row['委員'] || row['legislator'];
            if (!legislatorName || legislatorName.trim() === '') return;
            
            const cleanLegislatorName = legislatorName.trim();
            
            // 獲取所有會議列（除了立委姓名相關的列）
            const meetingColumns = Object.keys(row).filter(col => 
                col !== '委員姓名' && col !== 'name' && col !== '立委姓名' && 
                col !== '委員' && col !== 'legislator' && col !== '委員ID' && 
                col !== 'id' && col !== 'ID' && col !== 'index'
            );
            
            // 建立立委的會議參與列表
            const attendedMeetings = new Set();
            
            meetingColumns.forEach(meeting => {
                const attended = row[meeting];
                // 更寬鬆的出席判定：只要不是0、空值、null、undefined就算出席
                if (attended && attended !== '0' && attended !== 0 && 
                    attended !== '' && attended !== 'null' && attended !== 'undefined') {
                    attendedMeetings.add(meeting);
                    
                    // 同時添加到documentTopicsData格式
                    documentTopicsData.push({
                        name: cleanLegislatorName,
                        file: meeting
                    });
                }
            });
            
            // 保存到會議出席映射
            if (attendedMeetings.size > 0) {
                meetingAttendanceMap.set(cleanLegislatorName, attendedMeetings);
            }
            
            if (meetingColumns.length > 0) {
                console.log(`立委 ${cleanLegislatorName} 參與了 ${attendedMeetings.size}/${meetingColumns.length} 個會議`);
            }
        });
        
        // 設置全域變量
        window.documentTopicsData = documentTopicsData;
        window.meetingAttendanceMap = meetingAttendanceMap;
        
        // 計算統計信息
        const totalLegislators = meetingAttendanceMap.size;
        const totalMeetings = new Set(documentTopicsData.map(d => d.file)).size;
        const totalConnections = documentTopicsData.length;
        
        console.log(`✅ 會議出席數據處理完成:`);
        console.log(`  - 立委數量: ${totalLegislators}`);
        console.log(`  - 會議數量: ${totalMeetings}`);
        console.log(`  - 總出席記錄: ${totalConnections}`);
        console.log(`  - 平均每位立委參與會議數: ${(totalConnections / totalLegislators).toFixed(1)}`);
        
        // 分析會議出席分布
        const attendanceCounts = Array.from(meetingAttendanceMap.values()).map(meetings => meetings.size);
        if (attendanceCounts.length > 0) {
            const maxAttendance = Math.max(...attendanceCounts);
            const minAttendance = Math.min(...attendanceCounts);
            const avgAttendance = attendanceCounts.reduce((sum, count) => sum + count, 0) / attendanceCounts.length;
            
            console.log(`  - 會議參與分布: 最多 ${maxAttendance}, 最少 ${minAttendance}, 平均 ${avgAttendance.toFixed(1)}`);
        }
        
        return;
    }
    
    // 方法2: 嘗試從立委主題關心度數據中提取會議檔案信息
    if (legislatorInterestData && legislatorInterestData.length > 0) {
        console.log('⚠️ 會議出席矩陣不可用，嘗試從主題關心度數據提取會議信息');
        
        const documentTopicsData = [];
        
        legislatorInterestData.forEach(row => {
            const name = row['委員姓名'] || row['name'] || row['立委姓名'];
            const file = row['會議檔案'] || row['file'] || row['文件名'] || row['document'];
            
            if (name && file && file !== '') {
                documentTopicsData.push({
                    name: name.trim(),
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
    
    // 如果所有真實數據都不可用，不生成任何虛假數據
    console.warn('❌ 無法獲取會議出席數據，網路分析和社群分析的共同會議功能將不可用');
    console.warn('請確保以下文件之一存在並可讀取:');
    console.warn('  - meeting_attendance_analysis/委員會議出席矩陣.csv');
    console.warn('  - 主題關心度數據中包含會議檔案信息');
    
    // 設置空的全域變量
    window.documentTopicsData = [];
    window.meetingAttendanceMap = new Map();
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

// 處理真實數據（增強版，支持新欄位）
function processRealData(rawData) {
    console.log('開始處理真實數據...');

    // 建立委員ID映射（支持新的欄位結構）
    const memberIdMap = new Map();
    const memberNameMap = new Map();

    if (rawData.memberMapping && rawData.memberMapping.length > 0) {
        rawData.memberMapping.forEach((row, index) => {
            const memberId = row['委員ID'] || row['member_id'] || row['ID'] || row['立委ID'];
            const realName = row['原始姓名'] || row['real_name'] || row['name'] || row['姓名'] || row['委員姓名'];
            const party = row['政黨'] || row['party'] || row['Party'] || row['政党'];
            const district = row['選區'] || row['district'] || row['District'];
            const eightDistrict = row['八選區'] || row['eight_district'];
            const origin = row['原籍'] || row['origin'] || row['出生地'];
            const sevenOrigin = row['七原籍'] || row['seven_origin'];
            const growth = row['成長'] || row['growth'] || row['成長地'];
            const sevenGrowth = row['七成長'] || row['seven_growth'];
            const university = row['大學學歷'] || row['university'] || row['大學'];
            const highest = row['最高學歷'] || row['highest'] || row['最高'];
            const previousJob = row['前職業'] || row['previous_job'] || row['職業'];
            const termStart = row['任期起'] || row['term_start'];
            const termEnd = row['任期迄'] || row['term_end'];
            const nextTerm = row['下任'] || row['next_term'];
            const gender = row['性別'] || row['gender'];
            const committees = row['委員會'] || row['committees'];
            const englishName = row['英文名'] || row['english_name'];

            if (realName) {
                const memberInfo = {
                    id: memberId || realName,
                    realName: realName,
                    party: party || '未知',
                    district: district || '未知',
                    eightDistrict: eightDistrict || '未知',
                    origin: origin || '未知',
                    sevenOrigin: sevenOrigin || '未知',
                    growth: growth || '未知',
                    sevenGrowth: sevenGrowth || '未知',
                    university: university || '',
                    highest: highest || '',
                    previousJob: previousJob || '',
                    termStart: termStart || '',
                    termEnd: termEnd || '',
                    nextTerm: nextTerm || '',
                    gender: gender || '',
                    committees: committees || '',
                    englishName: englishName || ''
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
                eightDistrict: '未知',
                origin: '未知',
                sevenOrigin: '未知',
                growth: '未知',
                sevenGrowth: '未知',
                university: '',
                highest: '',
                previousJob: '',
                termStart: '',
                termEnd: '',
                nextTerm: '',
                gender: '',
                committees: '',
                englishName: ''
            };

            const legislatorName = memberInfo.realName;

            if (!legislatorMap.has(legislatorName)) {
                legislatorMap.set(legislatorName, {
                    id: memberInfo.id,
                    name: legislatorName,
                    party: memberInfo.party,
                    district: memberInfo.district,
                    eightDistrict: memberInfo.eightDistrict,
                    origin: memberInfo.origin,
                    sevenOrigin: memberInfo.sevenOrigin,
                    growth: memberInfo.growth,
                    sevenGrowth: memberInfo.sevenGrowth,
                    university: memberInfo.university,
                    highest: memberInfo.highest,
                    previousJob: memberInfo.previousJob,
                    termStart: memberInfo.termStart,
                    termEnd: memberInfo.termEnd,
                    nextTerm: memberInfo.nextTerm,
                    gender: memberInfo.gender,
                    committees: memberInfo.committees,
                    englishName: memberInfo.englishName,
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
    const eightDistricts = [...new Set(legislators.map(leg => leg.eightDistrict))].filter(d => d && d !== '未知');
    const sevenOrigins = [...new Set(legislators.map(leg => leg.sevenOrigin))].filter(o => o && o !== '未知');
    const sevenGrowths = [...new Set(legislators.map(leg => leg.sevenGrowth))].filter(g => g && g !== '未知');

    console.log('數據處理統計:');
    console.log('- 立委數量:', legislators.length);
    console.log('- 主題數量:', topics.length);
    console.log('- 政黨數量:', parties.length);
    console.log('- 八選區數量:', eightDistricts.length);
    console.log('- 七原籍數量:', sevenOrigins.length);
    console.log('- 七成長數量:', sevenGrowths.length);

    return {
        legislators: legislators,
        topics: topics,
        parties: parties,
        districts: districts,
        origins: origins,
        eightDistricts: eightDistricts,
        sevenOrigins: sevenOrigins,
        sevenGrowths: sevenGrowths,
        memberNameMap: memberNameMap,
        memberIdMap: memberIdMap
    };
}

// 文件讀取函數（保持不變）
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