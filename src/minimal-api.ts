/**
 * Minimal API Server for Domain Availability Checker
 * Self-contained with no external dependencies
 */

import * as http from 'http';
import * as url from 'url';
import * as dns from 'dns';

const PORT = 3005;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Simple domain validation
function validateDomain(domain: string): { isValid: boolean; message?: string } {
  if (!domain || domain.length === 0) {
    return { isValid: false, message: 'Domain name is required' };
  }
  
  if (domain.length > 63) {
    return { isValid: false, message: 'Domain name too long (max 63 characters)' };
  }
  
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  if (!domainRegex.test(domain)) {
    return { isValid: false, message: 'Invalid domain format (letters, numbers, and hyphens only)' };
  }
  
  return { isValid: true };
}

// Simple DNS check
async function checkDomainDNS(domain: string): Promise<{ isAvailable: boolean; executionTime: number }> {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    dns.resolve4(domain, (err) => {
      const executionTime = Date.now() - startTime;
      if (err) {
        // If DNS resolution fails, domain might be available
        resolve({ isAvailable: true, executionTime });
      } else {
        // If DNS resolution succeeds, domain is taken
        resolve({ isAvailable: false, executionTime });
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url || '', true);
  const path = parsedUrl.pathname;

  try {
    if (path === '/api/health' && req.method === 'GET') {
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }));
      return;
    }

    if (path === '/api/validate-domain' && req.method === 'POST') {
      const body = await getRequestBody(req);
      const { domain } = JSON.parse(body);
      
      const validation = validateDomain(domain);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(validation));
      return;
    }

    if (path === '/api/check-domain' && req.method === 'POST') {
      const body = await getRequestBody(req);
      const { baseDomain, tlds } = JSON.parse(body);
      
      // Validate input
      const validation = validateDomain(baseDomain);
      if (!validation.isValid) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: validation.message }));
        return;
      }

      const startTime = Date.now();
      const results = [];
      const supportedTlds = tlds || ['.com', '.net', '.org', '.io', '.ai', '.co'];

      // Check each TLD
      for (const tld of supportedTlds) {
        const fullDomain = baseDomain + tld;
        try {
          const dnsResult = await checkDomainDNS(fullDomain);
          results.push({
            domain: fullDomain,
            status: dnsResult.isAvailable ? 'available' : 'taken',
            checkMethod: 'DNS',
            executionTime: dnsResult.executionTime
          });
        } catch (error) {
          results.push({
            domain: fullDomain,
            status: 'error',
            checkMethod: 'DNS',
            executionTime: 0,
            error: 'Check failed'
          });
        }
      }

      const response = {
        baseDomain,
        results,
        executionTime: Date.now() - startTime,
        summary: {
          total: results.length,
          available: results.filter(r => r.status === 'available').length,
          taken: results.filter(r => r.status === 'taken').length,
          errors: results.filter(r => r.status === 'error').length
        }
      };

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(response));
      return;
    }

    // 404 for unknown routes
    res.writeHead(404, corsHeaders);
    res.end(JSON.stringify({ error: 'Not found' }));

  } catch (error) {
    console.error('API Error:', error);
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

function getRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

server.listen(PORT, () => {
  console.log(`🚀 Minimal Domain API running at http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/validate-domain`);
  console.log(`   POST /api/check-domain`);
  console.log(`🌐 Frontend should connect to: http://localhost:${PORT}/api`);
});