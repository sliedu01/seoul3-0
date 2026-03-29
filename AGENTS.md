<!-- BEGIN:nextjs-agent-rules -->
# 서울3.0 프로젝트 가이드

이 프로젝트는 최신 Next.js 및 React 19 환경에서 동작하는 웹 서비스입니다.

### 기술 스택
- **Framework**: Next.js (App Router)
- **Database**: PostgreSQL (Prisma ORM)
- **Styling**: Tailwind CSS 4
- **Deployment**: Vercel

### 작업 규칙
1. **Prisma**: 모델 변경 시 반드시 `prisma generate`를 실행하십시오.
2. **명령어 실행**: Windows 환경에서 PowerShell 보안 정책으로 인해 `npm` 호출이 차단될 수 있습니다. 필요시 `cmd /c npm ...` 형식을 사용하십시오.
3. **환경 변수**: `.env` 파일의 `DATABASE_URL`을 참조하십시오. Vercel 배포 시 동일한 변수를 등록해야 합니다.
4. **Git**: 변경 사항은 정기적으로 Git에 커밋하여 히스토리를 관리하십시오.

### Antigravity 협업
이 파일은 Antigravity가 프로젝트의 맥락을 유지하기 위해 참조합니다. 주요 변경 사항이나 특이 사항이 발생하면 여기에 기록하여 지식을 공유하십시오.
<!-- END:nextjs-agent-rules -->
