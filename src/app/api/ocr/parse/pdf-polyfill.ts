// Polyfill for Node.js environments handling Canvas/DOM elements in pdf.js
if (typeof global !== 'undefined') {
  if (!global.DOMMatrix) { (global as any).DOMMatrix = class DOMMatrix { constructor() {} }; }
  if (!global.Path2D) { (global as any).Path2D = class Path2D { constructor() {} }; }
  if (!global.ImageData) { 
    (global as any).ImageData = class ImageData { 
      constructor() { 
        (this as any).width = 0; 
        (this as any).height = 0; 
        (this as any).data = new Uint8ClampedArray(0); 
      } 
    }; 
  }
}
