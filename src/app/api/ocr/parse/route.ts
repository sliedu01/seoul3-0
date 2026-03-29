import "./pdf-polyfill";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Extreme Isolation Extraction (Using Child Process to bypass Next.js Bundler issues)
    // Use eval-based require to prevent Turbopack from tracing these as module dependencies
    const _require = eval('require') as typeof require;
    const { spawnSync } = _require('child_process');
    const fs = _require('fs');
    const path = _require('path');
    const os = _require('os');

    // Create a temporary file to pass to the worker
    const tmpDir = os.tmpdir();
    const tmpFilePath = path.join(tmpDir, `ocr_tmp_${Date.now()}.pdf`);
    fs.writeFileSync(tmpFilePath, buffer);

    let rawText = "";
    try {
      // Execute the standalone worker script (No bundler interferance)
      const cwd = process.cwd();
      const workerPath = [cwd, 'src', 'app', 'api', 'ocr', 'parse', 'extract-worker.js'].join(path.sep);
      const result = spawnSync('node', [workerPath, tmpFilePath]);
      
      // Cleanup the temporary file promptly
      fs.unlinkSync(tmpFilePath);

      if (result.status === 0) {
        const output = JSON.parse(result.stdout.toString());
        rawText = output.text;
      } else {
        const errorOutput = result.stderr.toString();
        console.error("Worker process failed:", errorOutput);
        
        // Final Fallback: If even the worker fails (e.g. Node version issue), 
        // return a clear message for debugging
        return NextResponse.json({ 
            error: "PDF Extraction Worker failed", 
            details: errorOutput
        }, { status: 500 });
      }
    } catch (workerError) {
      console.error("Worker Execution Error:", workerError);
      return NextResponse.json({ error: "Failed to spawn extraction process" }, { status: 500 });
    }

    // 2. SLI Professional Admin Agent: Intelligence Parsing Logic
    const parseMetadata = (text: string) => {
      // Step A: Clean characters and basic normalization
      const cleanText = text.replace(/\t/g, " ").replace(/Ÿ/g, "-").replace(/\r/g, "");
      const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      const metadata: any = {
        title: "", attendees: "", purpose: "", agenda: "", 
        preparation: "", nextSchedule: "", meetingContent: "", others: ""
      };

      // Step B: Smart Line Re-joining (Sentence Reconstruction)
      const joinedLines: string[] = [];
      let currentSectionLine = "";
      
      lines.forEach(line => {
        // Recognize standard bullets and SLI specific 'Ÿ'
        const isBullet = line.match(/^[0-9]\.|\*|[-•Ÿ]/);
        const isSectionHeader = line.match(/[:：]/) || 
                                line.match(/일\s*시|참\s*석\s*자|목\s*적|안\s*건|준\s*비\s*사\s*항|차\s*기\s*일\s*정|내\s*용|기\s*타/);
        
        if (isBullet || isSectionHeader) {
          if (currentSectionLine) joinedLines.push(currentSectionLine);
          currentSectionLine = line;
        } else {
          currentSectionLine += " " + line;
        }
      });
      if (currentSectionLine) joinedLines.push(currentSectionLine);

      let currentKey = "meetingContent";
      let actionItems: string[] = [];

      // Step C: Section Mapping based on SLI Standard Schema
      joinedLines.forEach(line => {
        const cleanLine = line.replace(/\s+/g, "");
        
        // Priority 1: High-level SLI Section Numbers
        if (cleanLine.match(/^1\..*?(논의|내용)/)) {
          currentKey = "meetingContent";
          metadata.meetingContent += (metadata.meetingContent ? "\n" : "") + line;
          return;
        } else if (cleanLine.match(/^2\..*?(운용|행정|관리)/)) {
          currentKey = "meetingContent";
          metadata.meetingContent += (metadata.meetingContent ? "\n" : "") + line;
          return;
        } else if (cleanLine.match(/^3\..*?(Action|할일|To-Do)/i)) {
          currentKey = "actionItems";
          return;
        }

        // Priority 2: Keyword based matching
        if (cleanLine.includes("회의명") || cleanLine.includes("회의제목")) {
          metadata.title = line.split(/[:：]/)[1]?.trim() || line;
        } else if (cleanLine.match(/참\s*석\s*자[:：]?/)) {
          currentKey = "attendees";
          metadata.attendees = line.replace(/^.*?참\s*석\s*자[:：]?\s*/i, "");
        } else if (cleanLine.match(/목\s*적[:：]?/)) {
          currentKey = "purpose";
          metadata.purpose = line.replace(/^.*?(회의목적|목적)[:：]?\s*/i, "");
        } else if (cleanLine.match(/안\s*건[:：]?/)) {
          currentKey = "agenda";
          metadata.agenda = line.replace(/^.*?(주요안건|안건)[:：]?\s*/i, "");
        } else if (cleanLine.match(/준\s*비\s*사\s*항[:：]?/)) {
          currentKey = "preparation";
          metadata.preparation = line.replace(/^.*?준비사항[:：]?\s*/i, "");
        } else if (cleanLine.match(/차\s*기\s*일\s*정[:：]?/)) {
          currentKey = "nextSchedule";
          metadata.nextSchedule = line.replace(/^.*?차기일정[:：]?\s*/i, "");
        } else if (cleanLine.match(/회\s*의\s*내\s*용[:：]?/)) {
          currentKey = "meetingContent";
          metadata.meetingContent = line.replace(/^.*?회의내용[:：]?\s*/i, "");
        } else if (cleanLine.match(/기\s*타\s*사\s*항[:：]?/)) {
          currentKey = "others";
          metadata.others = line.replace(/^.*?기타사항[:：]?\s*/i, "");
        } else {
          // Continuous mapping for current active key
          if (currentKey === "actionItems") {
            actionItems.push(line);
          } else if (metadata[currentKey] !== undefined) {
             metadata[currentKey] += (metadata[currentKey] ? "\n" : "") + line;
          }
        }
      });

      // Step D: Action Item Formatting
      if (actionItems.length > 0) {
        const formattedActionItems = "\n\n### 📋 Action Items (To-Do)\n" + actionItems.join("\n");
        metadata.others = (metadata.others || "") + formattedActionItems;
      }

      // Cleanup trailing/leading spaces in all fields
      Object.keys(metadata).forEach(k => { if(typeof metadata[k] === 'string') metadata[k] = metadata[k].trim(); });

      return metadata;
    };

    const extractedData = parseMetadata(rawText);

    return NextResponse.json({ 
      success: true, 
      text: rawText,
      metadata: extractedData
    });
  } catch (error) {
    console.error("OCR Error:", error);
    return NextResponse.json({ error: "Failed to parse PDF" }, { status: 500 });
  }
}
