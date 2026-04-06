// Standalone server - no npm install required!
// Serves index.html AND provides /api/scan API endpoint
const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';  // Optional - increases rate limit from 60 to 5000 req/hr
const HTML_FILE = path.join(__dirname, 'index.html');

const PATTERNS = [
  { type: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{48}/g, severity: 'High' },
  { type: 'OpenAI Project Key', regex: /sk-proj-[a-zA-Z0-9-_]{48,}/g, severity: 'High' },
  { type: 'Google/Gemini API Key', regex: /AIza[0-9A-Za-z-_]{35}/g, severity: 'High' },
  { type: 'AWS Access Key ID', regex: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g, severity: 'High' },
  { type: 'AWS Secret Key', regex: /aws_secret_access_key\s*=\s*['"]?([a-zA-Z0-9/+=]{40})['"]?/gi, severity: 'High' },
  { type: 'Stripe Secret Key', regex: /sk_(live|test)_[a-zA-Z0-9]{24}/g, severity: 'High' },
  { type: 'Generic Password/Secret', regex: /(password|secret|pwd)\s*[:=]\s*['"]([^'"]+)['"]/gi, severity: 'Medium' },
  { type: 'Database URL', regex: /(mongodb|postgres|mysql|redis):\/\/[^:\s]+:[^@\s]+@[^\s]+/gi, severity: 'High' },
];

function fetchUrl(urlStr) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'LeakGuard-Scanner',
        'Accept': 'application/json',
        ...(GITHUB_TOKEN ? { 'Authorization': `Bearer ${GITHUB_TOKEN}` } : {})
      }
    };
    const req = lib.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

async function handleScan(inputData) {
  let textToScan = inputData;
  const ghMatch = inputData.trim().match(/^https:\/\/github\.com\/([^\/]+)\/([^\/\?#\s]+)/);

  let ghOwner = '', ghRepo = '', ghBranch = 'main';

  if (ghMatch) {
    ghOwner = ghMatch[1];
    ghRepo = ghMatch[2].replace(/\.git$/, '');

    let treeRes = await fetchUrl(`https://api.github.com/repos/${ghOwner}/${ghRepo}/git/trees/${ghBranch}?recursive=1`);
    if (treeRes.status !== 200) {
      ghBranch = 'master';
      treeRes = await fetchUrl(`https://api.github.com/repos/${ghOwner}/${ghRepo}/git/trees/${ghBranch}?recursive=1`);
    }
    if (treeRes.status !== 200) {
      return { error: `GitHub repo not found or inaccessible (${treeRes.status}). Make sure the repo is public.` };
    }

    const treeData = JSON.parse(treeRes.body);
    const textFiles = treeData.tree
      .filter(f => f.type === 'blob' && /\.(py|js|ts|tsx|jsx|txt|md|env|json|yml|yaml|html|css)$/i.test(f.path))
      .slice(0, 15);

    if (textFiles.length === 0) {
      return { error: 'No scannable text files found in this repository.' };
    }

    let combinedText = '';
    for (const file of textFiles) {
      const rawUrl = `https://raw.githubusercontent.com/${ghOwner}/${ghRepo}/${ghBranch}/${file.path}`;
      const rawRes = await fetchUrl(rawUrl);
      if (rawRes.status === 200) combinedText += `\n--- File: ${file.path} ---\n` + rawRes.body;
    }
    if (combinedText) textToScan = combinedText;
    else return { error: 'Could not fetch file contents from this repository.' };
  }

  const vulnerabilities = [];
  let riskScore = 0;
  const lines = textToScan.split('\n');
  let currentFile = 'Raw Input';
  let fileLineOffset = 0;

  lines.forEach((line, index) => {
    const fileMatch = line.match(/^--- File: (.+) ---$/);
    if (fileMatch) { currentFile = fileMatch[1]; fileLineOffset = index + 1; return; }

    PATTERNS.forEach(patternObj => {
      patternObj.regex.lastIndex = 0;
      let match;
      while ((match = patternObj.regex.exec(line)) !== null) {
        const secret = match[0];
        if (patternObj.type === 'Generic Password/Secret' && match[2]) {
          if (/^(test|example)/i.test(match[2])) continue;
        }
        let preview = secret.length > 20
          ? secret.substring(0, 8) + '...' + secret.substring(secret.length - 4)
          : secret.length > 10 ? secret.substring(0, 3) + '...' + secret.substring(secret.length - 3) : secret;

        const lineNumber = currentFile === 'Raw Input' ? index + 1 : index - fileLineOffset + 1;
        const locationText = currentFile === 'Raw Input' ? `Line ${lineNumber}` : `${currentFile}:${lineNumber}`;
        let linkUrl = '';
        if (ghMatch && currentFile !== 'Raw Input') {
          linkUrl = `https://github.com/${ghOwner}/${ghRepo}/blob/${ghBranch}/${currentFile}#L${lineNumber}`;
        }
        vulnerabilities.push({ type: patternObj.type, location: locationText, link: linkUrl || undefined, severity: patternObj.severity, preview });
        if (patternObj.severity === 'High') riskScore += 3;
        if (patternObj.severity === 'Medium') riskScore += 1.5;
      }
    });
  });

  return {
    status: 'success',
    vulnerabilities,
    count: vulnerabilities.length,
    riskScore: parseFloat(Math.min(10, Math.max(0, riskScore)).toFixed(1))
  };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // API endpoint
  if (parsedUrl.pathname === '/api/scan' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { inputData } = JSON.parse(body);
        if (!inputData || typeof inputData !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Valid input text is required.' }));
        }
        const result = await handleScan(inputData);
        if (result.error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(result));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        console.error('Scan error:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Scan failed: ' + e.message }));
      }
    });
    return;
  }

  // Serve index.html for all other routes
  if (req.method === 'GET' && (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html')) {
    try {
      const html = fs.readFileSync(HTML_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (e) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('index.html not found');
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n✅ LeakGuard AI Server running!`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Scanner: http://localhost:${PORT}/api/scan`);
  console.log(`\n   Open http://localhost:${PORT} in your browser!\n`);
});
