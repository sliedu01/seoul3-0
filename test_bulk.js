// Native fetch is available in Node.js

async function runTest() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    console.log('--- 설문 벌크 저장 시스템 통합 테스트 시작 ---');
    
    // 1. 필요한 DB 정보 가져오기
    const session = await prisma.programSession.findFirst();
    const template = await prisma.questionTemplate.findFirst({
      include: { questions: true }
    });

    if (!session || !template) {
      console.error('테스트를 위한 세션 또는 템플릿이 DB에 없습니다.');
      return;
    }

    const testCases = [
      {
        name: "정상 대용량 데이터 테스트 (60명)",
        count: 60,
        dataModifier: (ans) => ans,
        expectSuccess: true
      },
      {
        name: "데이터 타입 에러 테스트 (NaN 포함)",
        count: 5,
        dataModifier: (ans) => ({ ...ans, score: "InvalidValue" }),
        expectSuccess: true // 서버에서 null로 정제하므로 성공해야 함
      },
      {
        name: "문항 ID 누락 에스테스트 (에러 리포트 확인)",
        count: 1,
        dataModifier: (ans) => ({ ...ans, questionId: null }),
        expectSuccess: false
      }
    ];

    for (const tc of testCases) {
      console.log(`\n[테스트 실행: ${tc.name}]`);
      
      const responses = Array.from({ length: tc.count }).map((_, i) => ({
        studentName: `테스트학생_${i + 1}`,
        researchTarget: "ELEMENTARY",
        type: "SATISFACTION",
        answers: template.questions.map(q => tc.dataModifier({
          questionId: q.id,
          score: 5,
          textValue: "테스트 답변입니다."
        }))
      }));

      const payload = {
        sessionId: session.id,
        templateId: template.id,
        responses: responses
      };

      const startTime = Date.now();
      const res = await fetch('http://localhost:3000/api/responses/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const duration = Date.now() - startTime;
      const result = await res.json();

      if (res.ok && tc.expectSuccess) {
        console.log(`✅ 성공: ${result.count}건 저장 완료 (소요시간: ${duration}ms)`);
      } else if (!res.ok && !tc.expectSuccess) {
        console.log(`✅ 예상된 실패 발생 (상세 에러 확인):`);
        console.log(`   메시지: ${result.error}`);
      } else {
        console.log(`❌ 테스트 실패! (예상과 다른 결과)`);
        console.log(`   응답:`, result);
      }
    }

  } catch (err) {
    console.error('테스트 실행 중 중명 오류 발생:', err);
  } finally {
    await prisma.$disconnect();
    console.log('\n--- 테스트 종료 ---');
  }
}

runTest();
