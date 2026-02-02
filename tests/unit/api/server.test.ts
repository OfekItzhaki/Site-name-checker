// Polyfill for TextEncoder/TextDecoder in test environment
import { TextEncoder, TextDecoder } from 'util';

// Set up global polyfills before any imports that might need them
Object.assign(global, { TextEncoder, TextDecoder });

import request from 'supertest';
import { ApiServer } from '../../../src/api/server';

describe('API Server', () => {
  let apiServer: ApiServer;
  let server: any;

  beforeAll(async () => {
    apiServer = new ApiServer(0); // Use port 0 for testing
    await apiServer.start();
    server = apiServer['server']; // Access private server for supertest
  });

  afterAll(async () => {
    await apiServer.stop();
  });

  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        version: '1.0.0'
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('POST /api/check-domain', () => {
    test('should check domain availability', async () => {
      const response = await request(server)
        .post('/api/check-domain')
        .send({ baseDomain: 'test123' })
        .expect(200);

      expect(response.body).toMatchObject({
        baseDomain: 'test123',
        results: expect.any(Array),
        requestId: expect.any(String)
      });
      
      expect(response.body.results.length).toBeGreaterThan(0);
      expect(response.body.results[0]).toMatchObject({
        domain: expect.stringContaining('test123'),
        status: expect.stringMatching(/available|taken|error/),
        tld: expect.any(String)
      });
    });

    test('should reject invalid domain', async () => {
      const response = await request(server)
        .post('/api/check-domain')
        .send({ baseDomain: '' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: true
      });
    });

    test('should handle missing domain parameter', async () => {
      const response = await request(server)
        .post('/api/check-domain')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('CORS Headers', () => {
    test('should include CORS headers', async () => {
      const response = await request(server)
        .get('/api/health');

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    test('should handle OPTIONS requests', async () => {
      await request(server)
        .options('/api/check-domain')
        .expect(200);
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for unknown routes', async () => {
      await request(server)
        .get('/api/unknown')
        .expect(404);
    });

    test('should handle malformed JSON', async () => {
      const response = await request(server)
        .post('/api/check-domain')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});