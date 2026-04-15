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
  const headerIdx = rows.findIndex(row => row.includes("성명") || row.includes("응답순번"));
  if (headerIdx === -1) return { isValid: false, errors: ["'성명' 또는 '응답순번' 헤더를 찾을 수 없습니다."] };

  const headers = rows[headerIdx];
  const dataRows = rows.slice(headerIdx + 1).filter(row => row.length > 0 && (row[0] || row[1]));
  
  const questions = template.questions || [];
  const previewData: any[] = [];
  const errors: string[] = [];

  // 매핑 로직: 헤더 텍스트와 템플릿 카테고리/내용 매칭
  dataRows.forEach((row, rowIndex) => {
    const respondentName = String(row[headers.indexOf("성명")] || `응답자_${rowIndex + 1}`);
    const answers: any[] = [];

    questions.forEach((q: any) => {
      const cat = q.category?.split('|').pop() || "";
      // 다양한 헤더 패턴 대응 (사전_X, 사후_X, 점수_X 등)
      const possibleHeaders = type === "MATURITY" 
        ? [`사전_${cat}`, `사후_${cat}`, cat] 
        : [`점수_${cat}`, cat, q.content];
      
      let score: number | null = null;
      let preScore: number | null = null;
      let text: string | null = null;

      if (type === "MATURITY") {
        const preIdx = headers.findIndex(h => String(h).includes(`사전_${cat}`));
        const postIdx = headers.findIndex(h => String(h).includes(`사후_${cat}`));
        preScore = preIdx !== -1 ? Number(row[preIdx]) : null;
        score = postIdx !== -1 ? Number(row[postIdx]) : null;
      } else {
        const idx = headers.findIndex(h => possibleHeaders.some(ph => String(h).includes(ph)));
        if (q.type === "ESSAY") {
          text = idx !== -1 ? String(row[idx]) : null;
        } else {
          score = idx !== -1 ? Number(row[idx]) : null;
        }
      }

      answers.push({
        questionId: q.id,
        content: q.content,
        score,
        preScore,
        text
      });
    });

    previewData.push({
      respondentId: respondentName,
      answers
    });
  });

  return { isValid: true, errors, previewData };
}

/**
 * 결과 입력(집계표) 처리
 */
function processResult(rows: any[][], template: any, type: SurveyType): ValidationResult {
  // 결과 입력은 각 문항별로 5점~1점 인원수를 역산하여 Sequential 데이터로 변환
  const headerIdx = rows.findIndex(row => row.includes("설문문항"));
  if (headerIdx === -1) return { isValid: false, errors: ["'설문문항' 헤더를 찾을 수 없습니다."] };

  const headers = rows[headerIdx];
  const dataRows = rows.slice(headerIdx + 1).filter(row => row[headers.indexOf("설문문항")]);
  
  const questions = template.questions || [];
  const simulatedResponses: any[] = [];
  
  // 가상의 응답자 생성 (최대 응답 인원 기준)
  let maxRespondents = 0;
  dataRows.forEach(row => {
    const count = Number(row[headers.indexOf("응답인원(계)")]) || 0;
    if (count > maxRespondents) maxRespondents = count;
  });

  for (let i = 0; i < maxRespondents; i++) {
    simulatedResponses.push({ respondentId: `익명_${i+1}`, answers: [] });
  }

  questions.forEach((q: any) => {
    const matchingRow = dataRows.find(row => String(row[headers.indexOf("설문문항")]).trim() === q.content.trim());
    if (!matchingRow) return;

    if (type === "MATURITY") {
      // 성숙도 집계 처리 (사전/사후 각 점수대별 분배)
      const scoreMaps = [
        { key: "사전", startIdx: headers.findIndex(h => String(h).includes("사전_5점")) },
        { key: "사후", startIdx: headers.findIndex(h => String(h).includes("사후_5점")) }
      ];

      scoreMaps.forEach(map => {
        let currentResponseIdx = 0;
        for (let score = 5; score >= 1; score--) {
          const count = Number(matchingRow[map.startIdx + (5 - score)]) || 0;
          for (let j = 0; j < count; j++) {
            if (currentResponseIdx < simulatedResponses.length) {
              if (map.key === "사전") simulatedResponses[currentResponseIdx].answers.push({ questionId: q.id, preScore: score });
              else {
                const existing = simulatedResponses[currentResponseIdx].answers.find((a:any) => a.questionId === q.id);
                if (existing) existing.score = score;
                else simulatedResponses[currentResponseIdx].answers.push({ questionId: q.id, score });
              }
              currentResponseIdx++;
            }
          }
        }
      });
    } else {
      // 만족도 집계 처리
      if (q.type === "ESSAY") {
        const textVal = String(matchingRow[headers.length - 1] || "");
        const texts = textVal.split(/,|\n/).map(t => t.trim()).filter(t => t);
        texts.forEach((txt, idx) => {
          if (idx < simulatedResponses.length) {
            simulatedResponses[idx].answers.push({ questionId: q.id, text: txt });
          }
        });
      } else {
        const startIdx = headers.findIndex(h => String(h).includes("5점"));
        let currentResponseIdx = 0;
        for (let score = 5; score >= 1; score--) {
          const count = Number(matchingRow[startIdx + (5 - score)]) || 0;
          for (let j = 0; j < count; j++) {
            if (currentResponseIdx < simulatedResponses.length) {
              simulatedResponses[currentResponseIdx].answers.push({ questionId: q.id, score });
              currentResponseIdx++;
            }
          }
        }
      }
    }
  });

  return { isValid: true, errors: [], previewData: simulatedResponses };
}
