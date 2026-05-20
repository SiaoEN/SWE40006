jest.mock('../src/controllers/notificationController', () => ({
  createNotification: jest.fn().mockResolvedValue({ success: true }),
  getUnreadNotifications: jest.fn(),
  getAllNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
  markAllNotificationsAsRead: jest.fn(),
  deleteNotification: jest.fn(),
  backfillReviewNotificationMessages: jest.fn(),
}));

jest.mock('../config/db', () => ({
  getDb: jest.fn(),
  getClient: jest.fn(),
  getExistingCollection: jest.fn(),
}));

const request = require('supertest');
const app = require('../server');
const dbModule = require('../config/db');
const { createMockCollection, createMockDb } = require('./testHelpers');

describe('Review API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('submits a review', async () => {
    const reviewCollection = createMockCollection({ insertedId: 'review-1' });
    const mockDb = createMockDb({ Review: reviewCollection });
    dbModule.getExistingCollection.mockResolvedValue(reviewCollection);
    dbModule.getClient.mockReturnValue({ db: () => mockDb });
    dbModule.getDb.mockReturnValue(mockDb);

    const response = await request(app).post('/api/reviews').send({
      userId: '123',
      username: 'testuser',
      restaurantId: 'restaurant-1',
      restaurantName: 'KCH Cafe',
      rating: 5,
      comment: 'Excellent food!',
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.review).toMatchObject({
      userId: '123',
      username: 'testuser',
      restaurantId: 'restaurant-1',
      restaurantName: 'KCH Cafe',
      rating: 5,
      comment: 'Excellent food!',
    });
  });

  test('allows likes, reports, and admin report clearing', async () => {
    const reviewId = '507f1f77bcf86cd799439011';
    const reviewCollection = createMockCollection({
      findOneResult: {
        _id: reviewId,
        userId: 'author-user',
        username: 'author',
        restaurantName: 'KCH Cafe',
        reports: [],
      },
      findOneAndUpdateResult: {
        value: {
          _id: reviewId,
          userId: 'author-user',
          username: 'author',
          restaurantName: 'KCH Cafe',
          likes: ['liker-user'],
          dislikes: [],
          reports: [{ userId: 'reporter-user', reason: 'Spam' }],
        },
      },
      deleteOneResult: { deletedCount: 1 },
    });
    const userCollection = createMockCollection({
      findOneResult: { _id: 'liker-user', name: 'liker-user' },
    });
    const mockDb = createMockDb({ Review: reviewCollection, User: userCollection });
    dbModule.getExistingCollection.mockResolvedValue(reviewCollection);
    dbModule.getClient.mockReturnValue({ db: () => mockDb });
    dbModule.getDb.mockReturnValue(mockDb);

    const likeResponse = await request(app).post(`/api/reviews/${reviewId}/like`).send({
      userId: 'liker-user',
      username: 'Liker',
    });

    const reportResponse = await request(app).post(`/api/reviews/${reviewId}/report`).send({
      userId: 'reporter-user',
      reason: 'Spam',
    });

    const clearReportsResponse = await request(app).post(`/api/reviews/${reviewId}/clear-reports`).send({
      isAdmin: true,
    });

    const deleteResponse = await request(app).delete(`/api/reviews/${reviewId}`).send({
      userId: 'author-user',
    });

    expect(likeResponse.statusCode).toBe(200);
    expect(reportResponse.statusCode).toBe(200);
    expect(clearReportsResponse.statusCode).toBe(200);
    expect(deleteResponse.statusCode).toBe(200);
  });
});
