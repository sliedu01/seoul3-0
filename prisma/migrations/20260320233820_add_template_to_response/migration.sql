/*
  Warnings:

  - Added the required column `name` to the `QuestionTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuestionTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "programId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuestionTemplate_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_QuestionTemplate" ("createdAt", "id", "programId", "scope", "type", "updatedAt") SELECT "createdAt", "id", "programId", "scope", "type", "updatedAt" FROM "QuestionTemplate";
DROP TABLE "QuestionTemplate";
ALTER TABLE "new_QuestionTemplate" RENAME TO "QuestionTemplate";
CREATE TABLE "new_SurveyResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programSessionId" TEXT NOT NULL,
    "templateId" TEXT,
    "respondentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurveyResponse_programSessionId_fkey" FOREIGN KEY ("programSessionId") REFERENCES "ProgramSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SurveyResponse_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuestionTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SurveyResponse" ("createdAt", "id", "programSessionId", "respondentId", "type") SELECT "createdAt", "id", "programSessionId", "respondentId", "type" FROM "SurveyResponse";
DROP TABLE "SurveyResponse";
ALTER TABLE "new_SurveyResponse" RENAME TO "SurveyResponse";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
