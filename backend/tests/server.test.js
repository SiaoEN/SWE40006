const request = require('supertest');
const app = require('../server');

describe('Basic API Test', () => {

  test('GET / should return 200', async () => {
    const response = await request(app).get('/');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'KCH Bites API is running');
  });

  test('GET /health should return 200', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('OK');
  });

});