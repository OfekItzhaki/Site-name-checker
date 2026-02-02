/**
 * Simple API Server for Domain Availability Checker
 * Bypasses complex patterns for immediate functionality
 */

import * as http from 'http';
import * as url from 'url';
import { DNSLookupService } from './services/DNSLookupService';
import { WHOISQueryService } from './services/WHOISQueryService';
import { InputValidator } from './validators/InputValidator';

const PORT = 3001;

// Initialize services
const dnsService = new DNSLookupService();
const whoisService = new WHOISQueryService();
const validator = new InputValidator();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

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
      
      const validation = validator.validateDomain(domain);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(validation));
      return;
    }

    if (path === '/api/check-domain' && req.method === 'POST') {
      const body = await getRequestBody(req);
      const { baseDomain, tlds } = JSON.parse(body);
      
      // Validate input
      const validation = validator.validateDomain(baseDomain);
      if (!validation.isValid) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: validation.message }));
        return;
      }

      const startTime = Date.now();
      const results = [];

      // Check each TLD
      for (const tld of tlds || ['.com', '.net', '.org']) {
        const fullDomain = baseDomain + tld;
        try {
          // Try DNS first (faster)
          const dnsResult = await dnsService.checkAvailability(fullDomain);
          results.push({
            domain: fullDomain,
            status: dnsResult.isAvailable ? 'available' : 'taken',
            checkMethod: 'DNS',
            executionTime: dnsResult.executionTime || 0
          });
        } catch (error) {
          // Fallback to WHOIS if DNS fails
          try {
            const whoisResult = await whoisService.checkAvailability(fullDomain);
            results.push({
              domain: fullDomain,
              status: whoisResult.isAvailable ? 'available' : 'taken',
              checkMethod: 'WHOIS',
              executionTime: whoisResult.executionTime || 0
            });
          } catch (whoisError) {
            results.push({
              domain: fullDomain,
              status: 'error',
              checkMethod: 'API',
              executionTime: 0,
              error: 'Check failed'
            });
          }
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
  console.log(`🚀 Simple Domain API running at http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/validate-domain`);
  console.log(`   POST /api/check-domain`);
});