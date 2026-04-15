
/**
 * survey-parser.ts의 processResult 로직을 검증하기 위한 테스트 스크립트
 */

// 1. Mock Data 준비 (사용자 제공 이미지 구조 재현)
const mockRows = [
  ["설문문항", "보통미만", "보통", "보통이상", "합계"], // 헤더
  ["교육 내용의 유익성", 0, 5, 20, 25],
  ["강사의 전문성", 1, 4, 20, 25],
  ["환경 만족도", 2, 8, 15, 25],
  ["합계", 3, 17, 55, 75], // 합계 행
  [], // 빈 행
  ["주관식 의견"], // 섹션 구분용 (무시되어야 함)
  ["교육 과정이 매우 체계적이고 실무에 큰 도움이 되었습니다."],
  ["강사님의 설명이 친절해서 이해하기 쉬웠습니다."],
  ["간식이 조금 더 다양했으면 좋겠어요."],
  ["다음 교육도 꼭 참여하고 싶습니다."]
];

const mockTemplate = {
  questions: [
    { id: "q1", content: "교육 내용의 유익성", type: "SCALE" },
    { id: "q2", content: "강사의 전문성", type: "SCALE" },
    { id: "q3", content: "환경 만족도", type: "SCALE" },
    { id: "q4", content: "기타 의견이나 건의사항", type: "ESSAY" }
  ]
};

const labels = {
  5: ["매우만족", "매우우수", "보통이상", "우수"],
  4: ["만족", "우수"],
  3: ["보통"],
  2: ["불만족", "미흡"],
  1: ["매우불만족", "매우미흡", "보통미만"]
};

// 2. 테스트용 processResult 로직 (survey-parser.ts에서 복사/추출)
function testParser(rows, template) {
  const headers = rows[0].map(h => String(h || "").trim());
  const rawDataRows = rows.slice(1);
  const dataRows = [];
  const bottomRows = [];
  let isTableEnded = false;

  for (const row of rawDataRows) {
    const qCell = String(row[headers.indexOf("설문문항")] || "").trim();
    if (!qCell || qCell.includes("합계") || isTableEnded) {
      if (qCell.includes("합계")) isTableEnded = true;
      if (row.some(cell => cell)) bottomRows.push(row);
      continue;
    }
    dataRows.push(row);
  }

  const extractedEssays = bottomRows
    .flatMap(row => row.map(cell => String(cell || "").trim()))
    .filter(text => text.length > 5 && !text.includes("합계") && !text.includes("계") && !text.includes("주관식"));

  console.log("--- Extracted Essays ---");
  console.log(extractedEssays);

  const questions = template.questions;
  let maxRespondents = 0;
  const countIdx = headers.findIndex(h => h.includes("합계") || h.includes("계"));
  
  dataRows.forEach(row => {
    const count = Number(row[countIdx]) || 0;
    if (count > maxRespondents) maxRespondents = count;
  });

  console.log(`\nMax Respondents detected: ${maxRespondents}`);

  const simulatedResponses = Array.from({ length: maxRespondents }, (_, i) => ({
    respondentId: `익명_${i+1}`,
    answers: []
  }));

  const findScoreIdx = (score) => {
    return headers.findIndex(h => labels[score]?.some(l => h.includes(l)));
  };

  questions.forEach(q => {
    const matchingRow = dataRows.find(row => String(row[0] || "").trim() === q.content.trim());
    if (q.type === "ESSAY") {
      extractedEssays.forEach((txt, idx) => {
        if (idx < simulatedResponses.length) {
          simulatedResponses[idx].answers.push({ qId: q.id, text: txt });
        }
      });
    } else if (matchingRow) {
      let currentResponseIdx = 0;
      [5, 4, 3, 2, 1].forEach(score => { // 5점 척도 가상 대응 (보통이상=5, 보통=3, 보통미만=1로 매핑됨)
        const sIdx = findScoreIdx(score);
        if (sIdx !== -1) {
          const count = Number(matchingRow[sIdx]) || 0;
          for (let j = 0; j < count; j++) {
            if (currentResponseIdx < simulatedResponses.length) {
              simulatedResponses[currentResponseIdx].answers.push({ qId: q.id, score });
              currentResponseIdx++;
            }
          }
        }
      });
    }
  });

  return simulatedResponses;
}

const result = testParser(mockRows, mockTemplate);
console.log("\n--- Final Parsing Sample (Respondent 1) ---");
console.log(JSON.stringify(result[0], null, 2));
console.log("\n--- Final Parsing Sample (Respondent 24) ---");
console.log(JSON.stringify(result[23], null, 2));
