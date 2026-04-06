import { NextResponse } from 'next/server';

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

export async function POST(request: Request) {
  try {
    const { inputData } = await request.json();

    if (!inputData || typeof inputData !== 'string') {
      return NextResponse.json({ error: 'Valid input text is required.' }, { status: 400 });
    }

    let textToScan = inputData;
    const ghMatch = inputData.trim().match(/^https:\/\/github\.com\/([^\/]+)\/([^\/\?#\s]+)/);
    
    let ghOwner = '';
    let ghRepo = '';
    let ghBranch = 'main';
    
    if (ghMatch) {
      ghOwner = ghMatch[1];
      ghRepo = ghMatch[2];
      if (ghRepo.endsWith('.git')) ghRepo = ghRepo.slice(0, -4);
      
      const githubToken = process.env.GITHUB_TOKEN;
      const headers: HeadersInit = {
        'User-Agent': 'LeakGuard-Scanner',
        ...(githubToken ? { 'Authorization': `Bearer ${githubToken}` } : {})
      };
      
      try {
        let treeRes = await fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}/git/trees/${ghBranch}?recursive=1`, { headers });
        if (!treeRes.ok) {
            ghBranch = 'master';
            treeRes = await fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}/git/trees/${ghBranch}?recursive=1`, { headers });
        }
        if (treeRes.ok) {
            const treeData = await treeRes.json();
            const textFiles = treeData.tree.filter((f: any) => f.type === 'blob' && /\.(py|js|ts|tsx|jsx|txt|md|env|json|yml|yaml|html|css)$/i.test(f.path)).slice(0, 15);
            let combinedText = '';
            for (const file of textFiles) {
                const rawUrl = `https://raw.githubusercontent.com/${ghOwner}/${ghRepo}/${ghBranch}/${file.path}`;
                const rawRes = await fetch(rawUrl, { headers });
                if (rawRes.ok) combinedText += `\n--- File: ${file.path} ---\n` + await rawRes.text();
            }
            if (combinedText) textToScan = combinedText;
            else return NextResponse.json({ error: 'GitHub Repo empty or no text files found.' }, { status: 400 });
        } else {
            return NextResponse.json({ error: `GitHub fetch failed: ${treeRes.statusText}` }, { status: 400 });
        }
      } catch (e: any) {
        console.error('GitHub fetch failed', e);
        return NextResponse.json({ error: `GitHub fetch error: ${e.message}` }, { status: 500 });
      }
    }

    const vulnerabilities: Array<{ type: string; location: string; link?: string; severity: string; preview: string }> = [];
    let riskScore = 0;

    const lines = textToScan.split('\n');
    let currentFile = 'Raw Input';
    let fileLineOffset = 0;

    lines.forEach((line: string, index: number) => {
      const fileMatch = line.match(/^--- File: (.+) ---$/);
      if (fileMatch) {
         currentFile = fileMatch[1];
         fileLineOffset = index + 1;
      }

      PATTERNS.forEach(patternObj => {
        let match;
        patternObj.regex.lastIndex = 0;
        
        while ((match = patternObj.regex.exec(line)) !== null) {
          const secret = match[0];
          
          if (patternObj.type === 'Generic Password/Secret' && match[2]) {
              const isDummy = /^(test|example)/i.test(match[2]);
              if (isDummy) continue;
          }

          let preview = secret;
          if (secret.length > 20) {
              preview = secret.substring(0, 8) + '...' + secret.substring(secret.length - 4);
          } else if (secret.length > 10) {
              preview = secret.substring(0, 3) + '...' + secret.substring(secret.length - 3);
          }

          const lineNumber = currentFile === 'Raw Input' ? index + 1 : index - fileLineOffset + 1;
          const locationText = currentFile === 'Raw Input' ? `Line ${lineNumber}` : `${currentFile}:${lineNumber}`;
          
          let linkUrl = '';
          if (ghMatch && currentFile !== 'Raw Input') {
              linkUrl = `https://github.com/${ghOwner}/${ghRepo}/blob/${ghBranch}/${currentFile}#L${lineNumber}`;
          }

          vulnerabilities.push({
            type: patternObj.type,
            location: locationText,
            link: linkUrl || undefined,
            severity: patternObj.severity,
            preview: preview
          });

          if (patternObj.severity === 'High') riskScore += 3;
          if (patternObj.severity === 'Medium') riskScore += 1.5;
          if (patternObj.severity === 'Low') riskScore += 0.5;
        }
      });
    });

    const normalizedRiskScore = Math.min(10, Math.max(0, riskScore));

    return NextResponse.json({
      status: 'success',
      vulnerabilities,
      count: vulnerabilities.length,
      riskScore: parseFloat(normalizedRiskScore.toFixed(1))
    });
    
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal server error processing the scan.' }, { status: 500 });
  }
}
