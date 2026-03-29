
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

// Mock DOM for PDF.js in Node
if (typeof global !== 'undefined') {
  if (!global.DOMMatrix) { global.DOMMatrix = class DOMMatrix { constructor() {} }; }
  if (!global.Path2D) { global.Path2D = class Path2D { constructor() {} }; }
  if (!global.ImageData) { global.ImageData = class ImageData { constructor() { this.width = 0; this.height = 0; this.data = []; } }; }
}

async function extract() {
  try {
    const inputPath = process.argv[2];
    if (!inputPath) throw new Error("No input file path provided");

    const buffer = fs.readFileSync(inputPath);
    const uint8Array = new Uint8Array(buffer);
    
    // Create parser instance with memory-safe options
    const parser = new PDFParse({ 
      data: uint8Array, 
      verbosity: 0,
      disableFontFace: true,
      useSystemFonts: false
    });
    
    const result = await parser.getText();
    
    // Output the result as JSON to stdout
    process.stdout.write(JSON.stringify({
      success: true,
      text: result.text
    }));
    
    process.exit(0);
  } catch (error) {
    process.stderr.write(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }));
    process.exit(1);
  }
}

extract();
