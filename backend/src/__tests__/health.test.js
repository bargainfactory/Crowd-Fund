const request = require('supertest');
const { app } = require('../app');

describe('Health check', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});

