import * as XLSX from "xlsx";

export type SurveyInputFormat = "SEQUENTIAL" | "RESULT";
export type SurveyType = "SATISFACTION" | "MATURITY";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  previewData?: any;
}

/**
 * 설문 엑셀 데이터를 파싱하고 템플릿과 매칭합니다.
 */
export async function parseSurveyExcel(
  file: File,
  template: any,
  type: SurveyType,
  format: SurveyInputFormat
): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 2) {
          return resolve({ isValid: false, errors: ["엑셀 파일에 데이터가 부족합니다."] });
        }

        if (format === "SEQUENTIAL") {
          return resolve(processSequential(rows, template, type));
        } else {
          return resolve(processResult(rows, template, type));
        }
      } catch (error) {
        console.error("Parse error:", error);
        resolve({ isValid: false, errors: ["파일을 읽는 중 오류가 발생했습니다."] });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 순차 입력(학생별 행) 처리
 */
function processSequential(rows: any[][], template: any, type: SurveyType): ValidationResult {
  // 헤더 탐색: '페이지' 또는 '문항 1'이 포함된 행 찾기 (실제 데이터 그리드 헤더)
  const headerIdx = rows.findIndex(row => row.some(cell => {
    const s = String(cell || "").trim();
    return s === "페이지" || s === "번호" || s === "응답순번" || s.startsWith("문항 1");
  }));

  if (headerIdx === -1) return { isValid: false, errors: ["설문 데이터의 시작점(페이지, 문항 1 등 헤더)을 찾을 수 없습니다."] };

  const headers = rows[headerIdx].map(h => String(h || "").trim());
  const pageIdx = headers.findIndex(h => h === "페이지" || h === "번호" || h === "응답순번");
  const nameIdx = headers.findIndex(h => h === "성명");
  
  // 데이터 행 추출 (헤더 이후부터, 첫 번째 컬럼(페이지/번호)에 유효한 값이 있는 경우)
  const dataRows = rows.slice(headerIdx + 1).filter(row => {
    const firstCell = String(row[pageIdx] || "").trim();
    // 숫자가 있거나 내용이 있는 행만 추출
    return firstCell !== "" && !isNaN(Number(firstCell)) || row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== "");
  });
  
  const questions = template.questions || [];
  const previewData: any[] = [];
  const errors: string[] = [];

  // 문항 유형 분리
  const mcqs = questions.filter((q: any) => q.type === "MCQ");
  const essays = questions.filter((q: any) => q.type === "ESSAY");

  dataRows.forEach((row, rowIndex) => {
    const pageVal = pageIdx !== -1 ? row[pageIdx] : null;
    const nameVal = nameIdx !== -1 ? row[nameIdx] : null;
    // 성명이 있으면 성명 우선, 없으면 페이지(번호) 사용
    const respondentName = nameVal ? String(nameVal).trim() : (pageVal ? `응답자_${pageVal}` : `응답자_${rowIndex + 1}`);

    const answers: any[] = [];

    questions.forEach((q: any, qIdx: number) => {
      const cat = q.category?.split('|').pop() || "";
      let score: number | null = null;
      let preScore: number | null = null;
      let text: string | null = null;

      if (type === "MATURITY") {
        // 성숙도: 사전/사후 분리 매핑
        const mcqIdx = mcqs.findIndex((mq: any) => mq.id === q.id);
        if (mcqIdx !== -1) {
          const preSearch = `문항 ${mcqIdx + 1} (사전)`;
          const postSearch = `문항 ${mcqIdx + 1} (사후)`;
          const preCol = headers.findIndex(h => h.includes(preSearch));
          const postCol = headers.findIndex(h => h.includes(postSearch));
          
          preScore = preCol !== -1 ? (Number(row[preCol]) || null) : null;
          score = postCol !== -1 ? (Number(row[postCol]) || null) : null;
        }
      } else {
        // 만족도/만족도 이외: 일반 문항 매핑
        const allQIdx = questions.findIndex((aq: any) => aq.id === q.id);
        const searchLabel = `문항 ${allQIdx + 1}`;
        const colIdx = headers.findIndex(h => h.startsWith(searchLabel));
        
        if (colIdx !== -1) {
          if (q.type === "ESSAY") {
            text = String(row[colIdx] || "").trim() || null;
          } else {
            score = row[colIdx] !== undefined && row[colIdx] !== "" ? Number(row[colIdx]) : null;
          }
        }
      }
      
      if (score !== null || preScore !== null || text !== null) {
        answers.push({ questionId: q.id, content: q.content, score, preScore, text });
      }
    });

    if (answers.length > 0) {
      previewData.push({
        respondentId: respondentName,
        answers
      });
    }
  });

  if (previewData.length === 0) {
    return { isValid: false, errors: ["유효한 설문 응답 데이터를 찾을 수 없습니다. 양식에 맞춰 데이터를 입력했는지 확인해주세요."] };
  }

  return { isValid: true, errors, previewData };
}

/**
 * 결과 입력(집계표) 처리
 */
function processResult(rows: any[][], template: any, type: SurveyType): ValidationResult {
  const headerIdx = rows.findIndex(row => row.includes("설문문항") || row.includes("문항"));
  if (headerIdx === -1) return { isValid: false, errors: ["'설문문항' 또는 '문항' 헤더를 찾을 수 없습니다."] };

  const headers = rows[headerIdx].map(h => String(h || "").trim());
  
  // 데이터 행과 하단 추가 데이터(주관식 등) 분리
  const rawDataRows = rows.slice(headerIdx + 1);
  const dataRows: any[][] = [];
  const bottomRows: any[][] = [];
  let isTableEnded = false;

  for (const row of rawDataRows) {
    const qCell = String(row[headers.indexOf("설문문항")] || row[headers.indexOf("문항")] || "").trim();
    if (!qCell || qCell.includes("합계") || isTableEnded) {
      if (qCell.includes("합계")) isTableEnded = true;
      if (row.some(cell => cell)) bottomRows.push(row);
      continue;
    }
    dataRows.push(row);
  }

  // 하단 데이터에서 주관식 응답 추출 (비어있지 않은 긴 텍스트 위주)
  const extractedEssays = bottomRows
    .flatMap(row => row.map(cell => String(cell || "").trim()))
    .filter(text => text.length > 5 && !text.includes("합계") && !text.includes("계") && !text.includes("비고"));

  const questions = template.questions || [];
  const simulatedResponses: any[] = [];
  
  // 가상의 응답자 생성 (최대 응답 인원 기준)
  let maxRespondents = 0;
  const countIdx = headers.findIndex(h => h.includes("응답인원") || h.includes("합계") || h.includes("계"));
  
  dataRows.forEach(row => {
    const count = Number(row[countIdx]) || 0;
    if (count > maxRespondents) maxRespondents = count;
  });

  if (maxRespondents === 0) maxRespondents = 1; // 최소 1명

  for (let i = 0; i < maxRespondents; i++) {
    simulatedResponses.push({ respondentId: `익명_${i+1}`, answers: [] });
  }

  // 점수 컬럼 인덱스 찾기 함수
  const findScoreIdx = (score: number) => {
    // 1. 숫자 포함 매칭 (예: "5점", "(5)", "1")
    let idx = headers.findIndex(h => h.includes(String(score)) && !h.includes("사전") && !h.includes("사후"));
    if (idx !== -1) return idx;

    // 2. 텍스트 매칭 (만족도 등)
    const labels: Record<number, string[]> = {
      5: ["매우만족", "매우우수", "보통이상", "우수"],
      4: ["만족", "우수"],
      3: ["보통"],
      2: ["불만족", "미흡"],
      1: ["매우불만족", "매우미흡", "보통미만"]
    };
    return headers.findIndex(h => labels[score]?.some(l => h.includes(l)));
  };

  questions.forEach((q: any) => {
    const qColIdx = headers.indexOf("설문문항") !== -1 ? headers.indexOf("설문문항") : headers.indexOf("문항");
    const matchingRow = dataRows.find(row => String(row[qColIdx] || "").trim() === q.content.trim());
    
    if (!matchingRow) return;

    if (type === "MATURITY") {
      // 성숙도 집계 처리
      for (const mode of ["사전", "사후"]) {
        let currentResponseIdx = 0;
        for (let score = 5; score >= 1; score--) {
          const sIdx = headers.findIndex(h => h.includes(mode) && h.includes(String(score)));
          if (sIdx === -1) continue;
          
          const count = Number(matchingRow[sIdx]) || 0;
          for (let j = 0; j < count; j++) {
            if (currentResponseIdx < simulatedResponses.length) {
              const ans = simulatedResponses[currentResponseIdx].answers;
              let existing = ans.find((a:any) => a.questionId === q.id);
              if (!existing) {
                existing = { questionId: q.id, content: q.content, score: null, preScore: null };
                ans.push(existing);
              }
              if (mode === "사전") existing.preScore = score;
              else existing.score = score;
              currentResponseIdx++;
            }
          }
        }
      }
    } else {
      // 만족도 집계 처리
      if (q.type === "ESSAY") {
        // 이미 추출된 주관식 데이터가 있으면 배분
        extractedEssays.forEach((txt, idx) => {
          if (idx < simulatedResponses.length) {
            simulatedResponses[idx].answers.push({ 
              questionId: q.id, 
              content: q.content,
              text: txt 
            });
          }
        });
      } else {
        let currentResponseIdx = 0;
        for (let score = 5; score >= 1; score--) {
          const sIdx = findScoreIdx(score);
          if (sIdx === -1) continue;

          const count = Number(matchingRow[sIdx]) || 0;
          for (let j = 0; j < count; j++) {
            if (currentResponseIdx < simulatedResponses.length) {
              simulatedResponses[currentResponseIdx].answers.push({ 
                questionId: q.id, 
                content: q.content,
                score 
              });
              currentResponseIdx++;
            }
          }
        }
      }
    }
  });

  return { isValid: true, errors: [], previewData: simulatedResponses };
}
