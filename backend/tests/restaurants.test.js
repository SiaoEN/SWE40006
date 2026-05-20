jest.mock('../config/db', () => ({
  getDb: jest.fn(),
  getClient: jest.fn(),
  getExistingCollection: jest.fn(),
}));

const request = require('supertest');
const app = require('../server');
const dbModule = require('../config/db');
const { createMockCollection, createMockDb } = require('./testHelpers');

describe('Restaurant API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lists restaurants', async () => {
    const restaurantsCollection = createMockCollection({
      findResults: [
        { _id: 'restaurant-1', name: 'KCH Cafe', address: '123 Kuching Street' },
      ],
    });
    const mockDb = createMockDb({ Restaurant: restaurantsCollection });
    dbModule.getExistingCollection.mockResolvedValue(restaurantsCollection);
    dbModule.getClient.mockReturnValue({ db: () => mockDb });
    dbModule.getDb.mockReturnValue(mockDb);

    const response = await request(app).get('/api/restaurants');

    expect(response.statusCode).toBe(200);
    expect(response.body.restaurants).toHaveLength(1);
    expect(response.body.restaurants[0]).toMatchObject({ name: 'KCH Cafe' });
  });

  test('creates a restaurant', async () => {
    const restaurantsCollection = createMockCollection({ insertedId: 'restaurant-2' });
    const mockDb = createMockDb({ Restaurant: restaurantsCollection });
    dbModule.getExistingCollection.mockResolvedValue(restaurantsCollection);
    dbModule.getClient.mockReturnValue({ db: () => mockDb });
    dbModule.getDb.mockReturnValue(mockDb);

    const response = await request(app).post('/api/restaurants').send({
      name: 'KCH Cafe',
      address: '123 Kuching Street',
      description: 'Local favorites',
      tags: ['noodle'],
      photos: ['photo.jpg'],
      lat: 1.55,
      lng: 110.35,
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.restaurant).toMatchObject({
      name: 'KCH Cafe',
      address: '123 Kuching Street',
      description: 'Local favorites',
    });
  });

  test('retrieves, updates, and deletes a restaurant', async () => {
    const restaurantsCollection = createMockCollection({
      findOneResult: { _id: '507f1f77bcf86cd799439011', name: 'KCH Cafe' },
      updateOneResult: { matchedCount: 1, modifiedCount: 1 },
      deleteOneResult: { deletedCount: 1 },
    });
    const mockDb = createMockDb({ Restaurant: restaurantsCollection });
    dbModule.getExistingCollection.mockResolvedValue(restaurantsCollection);
    dbModule.getClient.mockReturnValue({ db: () => mockDb });
    dbModule.getDb.mockReturnValue(mockDb);

    const getResponse = await request(app).get('/api/restaurants/507f1f77bcf86cd799439011');
    const updateResponse = await request(app)
      .put('/api/restaurants/507f1f77bcf86cd799439011')
      .send({ name: 'Updated Cafe' });
    const deleteResponse = await request(app).delete('/api/restaurants/507f1f77bcf86cd799439011');

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body.restaurant).toMatchObject({ name: 'KCH Cafe' });
    expect(updateResponse.statusCode).toBe(200);
    expect(deleteResponse.statusCode).toBe(200);
  });
});
