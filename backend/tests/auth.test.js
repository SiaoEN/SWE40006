jest.mock('../config/db', () => ({
  getDb: jest.fn(),
  getClient: jest.fn(),
  getExistingCollection: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../server');
const { jwtSecret } = require('../config/auth');
const dbModule = require('../config/db');
const { createMockCollection, createMockDb } = require('./testHelpers');

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registers a new user', async () => {
    const usersCollection = createMockCollection({
      findOneResult: null,
      insertOneResult: { insertedId: 'user-1' },
    });
    dbModule.getDb.mockReturnValue(createMockDb({ User: usersCollection }));

    const response = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      user: expect.objectContaining({
        name: 'testuser',
        email: 'test@example.com',
        role: 'user',
      }),
    });
    expect(usersCollection.insertOne).toHaveBeenCalledTimes(1);
  });

  test('rejects duplicate registrations', async () => {
    const usersCollection = createMockCollection({
      findOneResult: { _id: 'existing-user' },
    });
    dbModule.getDb.mockReturnValue(createMockDb({ User: usersCollection }));

    const response = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.statusCode).toBe(409);
    expect(response.body.message).toBe('User already exists');
  });

  test('logs in an existing user', async () => {
    const usersCollection = createMockCollection({
      findOneResult: {
        _id: '507f1f77bcf86cd799439011',
        name: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
        createdAt: new Date('2026-05-19T00:00:00.000Z'),
      },
    });
    dbModule.getDb.mockReturnValue(createMockDb({ User: usersCollection }));

    const response = await request(app).post('/api/auth/login').send({
      username: 'testuser',
      password: 'password123',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toMatchObject({
      _id: '507f1f77bcf86cd799439011',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
    });
  });

  test('updates the authenticated profile', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const token = jwt.sign({ userId, username: 'testuser', role: 'user' }, jwtSecret, { expiresIn: '1h' });
    const usersCollection = createMockCollection({
      findOneResult: {
        _id: userId,
        name: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
        createdAt: new Date('2026-05-19T00:00:00.000Z'),
      },
      findOneAndUpdateResult: {
        value: {
          _id: userId,
          name: 'updateduser',
          email: 'updated@example.com',
          avatar: null,
          bio: 'Hello there',
          role: 'user',
          createdAt: new Date('2026-05-19T00:00:00.000Z'),
        },
      },
    });
    const feedbackCollection = createMockCollection({ updateManyResult: { modifiedCount: 1 } });
    dbModule.getDb.mockReturnValue(createMockDb({ User: usersCollection, Feedback: feedbackCollection }));

    const response = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'updateduser',
        email: 'updated@example.com',
        bio: 'Hello there',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.user).toMatchObject({
      _id: userId,
      username: 'updateduser',
      email: 'updated@example.com',
      bio: 'Hello there',
      role: 'user',
    });
    expect(feedbackCollection.updateMany).toHaveBeenCalledTimes(1);
  });

  test('returns the authenticated user favorites', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const token = jwt.sign({ userId, username: 'testuser', role: 'user' }, jwtSecret, { expiresIn: '1h' });
    const usersCollection = createMockCollection({
      findOneResult: {
        _id: userId,
        name: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        favorites: ['rest-1', 'rest-2'],
        role: 'user',
        createdAt: new Date('2026-05-19T00:00:00.000Z'),
      },
    });
    dbModule.getDb.mockReturnValue(createMockDb({ User: usersCollection }));

    const response = await request(app)
      .get('/api/auth/favorites')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      favorites: ['rest-1', 'rest-2'],
    });
  });

  test('updates favorites for the authenticated user', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const token = jwt.sign({ userId, username: 'testuser', role: 'user' }, jwtSecret, { expiresIn: '1h' });
    const usersCollection = createMockCollection({
      findOneAndUpdateResult: {
        value: {
          _id: userId,
          name: 'testuser',
          email: 'test@example.com',
          favorites: ['rest-3', 'rest-4'],
          role: 'user',
          createdAt: new Date('2026-05-19T00:00:00.000Z'),
        },
      },
    });
    dbModule.getDb.mockReturnValue(createMockDb({ User: usersCollection }));

    const response = await request(app)
      .put('/api/auth/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ favorites: ['rest-3', 'rest-4', 'rest-3'] });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      favorites: ['rest-3', 'rest-4'],
    });
    expect(usersCollection.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });
});
