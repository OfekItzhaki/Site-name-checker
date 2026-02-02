import http from 'http';
import url from 'url';
import { DomainApplicationService } from '../application/DomainApplicationService';
import { CheckDomainAvailabilityCommand } from '../application/commands/CheckDomainAvailabilityCommand';
import { ValidateDomainCommand } from '../application/commands/ValidateDomainCommand';
import { GetDomainPricingQuery } from '../application/queries/GetDomainPricingQuery';
import type { IQueryResponse } from '../models';

/**
 * Lightweight API Server - delegates all business logic to application layer
 * Handles only HTTP concerns: routing, parsing, serialization
 */
export class ApiServer {
  private server: http.Server;
  private applicationService: DomainApplicationService;
  private port: number;

  constructor(port: number = 3001) {
    this.port = port;
    this.applicationService = new DomainApplicationService();
    this.server = this.createServer();
  }

  private createServer(): http.Server {
    return http.createServer((req, res) => {
      this.setCorsHeaders(res);

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      this.handleRequest(req, res);
    });
  }

  private setCorsHeaders(res: http.ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const pathname = parsedUrl.pathname;
      const method = req.method;

      console.log(`${new Date().toISOString()} - ${method} ${pathname}`);

      // Route to appropriate handler
      switch (`${method} ${pathname}`) {
        case 'GET /api/health':
          await this.handleHealthCheck(res);
          break;
        case 'POST /api/check-domain':
          await this.handleDomainCheck(req, res);
          break;
        case 'POST /api/validate-domain':
          await this.handleDomainValidation(req, res);
          break;
        case 'POST /api/domain-pricing':
          await this.handleDomainPricing(req, res);
          break;
        default:
          this.sendError(res, 404, 'Endpoint not found');
      }
    } catch (error) {
      console.error('Server error:', error);
      this.sendError(res, 500, 'Internal server error');
    }
  }

  private async handleHealthCheck(res: http.ServerResponse): Promise<void> {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0'
    };

    this.sendJson(res, 200, health);
  }

  private async handleDomainCheck(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.parseRequestBody(req);
      const request = this.parseJson(body);

      if (!request.baseDomain || typeof request.baseDomain !== 'string') {
        this.sendError(res, 400, 'Invalid request: baseDomain is required');
        return;
      }

      // Delegate to application layer via CQRS
      const command = new CheckDomainAvailabilityCommand(
        request.baseDomain,
        request.tlds || ['.com', '.net', '.org']
      );

      const result = await this.applicationService.getMediator().send(command) as IQueryResponse;
      this.sendJson(res, 200, { 
        ...result, 
        baseDomain: request.baseDomain 
      });
    } catch (error) {
      console.error('Domain check error:', error);
      this.sendError(res, 500, 'Failed to check domain availability');
    }
  }

  private async handleDomainValidation(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.parseRequestBody(req);
      const { domain } = this.parseJson(body);

      if (!domain || typeof domain !== 'string') {
        this.sendError(res, 400, 'Invalid request: domain is required');
        return;
      }

      // Delegate to application layer via CQRS
      const command = new ValidateDomainCommand(domain);
      const isValid = await this.applicationService.getMediator().send(command);
      
      this.sendJson(res, 200, { 
        domain, 
        isValid, 
        message: isValid ? 'Domain is valid' : 'Invalid domain format' 
      });
    } catch (error) {
      console.error('Domain validation error:', error);
      this.sendError(res, 500, 'Failed to validate domain');
    }
  }

  private async handleDomainPricing(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.parseRequestBody(req);
      const { domain } = this.parseJson(body);

      if (!domain || typeof domain !== 'string') {
        this.sendError(res, 400, 'Invalid request: domain is required');
        return;
      }

      // Delegate to application layer via CQRS
      const query = new GetDomainPricingQuery(domain);
      const pricing = await this.applicationService.getMediator().send(query);
      
      if (!pricing) {
        this.sendError(res, 404, 'Pricing information not available for this domain');
        return;
      }

      this.sendJson(res, 200, pricing);
    } catch (error) {
      console.error('Domain pricing error:', error);
      this.sendError(res, 500, 'Failed to get domain pricing');
    }
  }

  // HTTP utility methods
  private parseRequestBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  private parseJson(body: string): any {
    try {
      return JSON.parse(body);
    } catch {
      throw new Error('Invalid JSON format');
    }
  }

  private sendJson(res: http.ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  private sendError(res: http.ServerResponse, statusCode: number, message: string): void {
    const error = {
      error: true,
      message,
      timestamp: new Date().toISOString()
    };
    this.sendJson(res, statusCode, error);
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`🚀 Domain Checker API Server running on http://localhost:${this.port}`);
        console.log(`📡 API Endpoints:`);
        console.log(`   GET  /api/health - Health check`);
        console.log(`   POST /api/check-domain - Check domain availability`);
        console.log(`   POST /api/validate-domain - Validate domain format`);
        console.log(`   POST /api/domain-pricing - Get pricing for specific domain`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('API Server stopped');
        resolve();
      });
    });
  }
}