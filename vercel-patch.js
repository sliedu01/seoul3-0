const os = require('os');
const path = require('path');

// 1. Monkey-patch os.hostname() and os.userInfo()
const originalHostname = os.hostname;
os.hostname = () => 'user-pc';

const originalUserInfo = os.userInfo;
os.userInfo = (options) => {
  const info = originalUserInfo(options);
  if (info) info.username = 'user';
  return info;
};

// 2. Monkey-patch http.ClientRequest to sanitize headers (FIX FOR NODE FETCH/UNDICI)
const http = require('http');
const originalRequest = http.request;
http.request = function(options, callback) {
  if (options && options.headers) {
    for (let h in options.headers) {
      if (typeof options.headers[h] === 'string') {
        const originalValue = options.headers[h];
        // Replace non-ASCII characters with '?'
        const sanitizedValue = originalValue.replace(/[^\x00-\x7F]/g, '?');
        if (originalValue !== sanitizedValue) {
          console.log(`[patch] Sanitizing header ${h}: "${originalValue}" -> "${sanitizedValue}"`);
          options.headers[h] = sanitizedValue;
        }
      }
    }
  }
  return originalRequest.apply(this, arguments);
};

// 3. Also patch https.request just in case
const https = require('https');
const originalHttpsRequest = https.request;
https.request = function(options, callback) {
  if (options && options.headers) {
    for (let h in options.headers) {
      if (typeof options.headers[h] === 'string') {
        const originalValue = options.headers[h];
        const sanitizedValue = originalValue.replace(/[^\x00-\x7F]/g, '?');
        if (originalValue !== sanitizedValue) {
          console.log(`[patch] Sanitizing header ${h}: "${originalValue}" -> "${sanitizedValue}"`);
          options.headers[h] = sanitizedValue;
        }
      }
    }
  }
  return originalHttpsRequest.apply(this, arguments);
};

// 4. Clear ANY environment variable that might contain "조정구"
for (let key in process.env) {
  if (typeof process.env[key] === 'string' && process.env[key].includes('조정구')) {
    delete process.env[key];
  }
}

process.env.USERNAME = 'user';
process.env.HOSTNAME = 'user-pc';
process.env.COMPUTERNAME = 'user-pc';

console.log('--- Vercel CLI Patch Applied (v3: Header Sanitizer) ---');
console.log('Hostname overridden to:', os.hostname());
console.log('--------------------------------');

// 4. Load and run the original Vercel CLI
// Path to global vercel: C:\Users\hinic\AppData\Roaming\npm\node_modules\vercel\dist\index.js
const vercelPath = path.join(
  process.env.APPDATA,
  'npm/node_modules/vercel/dist/index.js'
);

try {
  require(vercelPath);
} catch (err) {
  console.error('Failed to load Vercel CLI at:', vercelPath);
  console.error(err);
  process.exit(1);
}
