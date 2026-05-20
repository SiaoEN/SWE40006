jest.mock('../config/db', () => ({
  getDb: jest.fn(),
  getClient: jest.fn(),
  getExistingCollection: jest.fn(),
}));

jest.mock('../src/controllers/notificationController', () => ({
  createNotification: jest.fn().mockResolvedValue({ success: true }),
  getUnreadNotifications: jest.fn(),
  getAllNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
  markAllNotificationsAsRead: jest.fn(),
  deleteNotification: jest.fn(),
  backfillReviewNotificationMessages: jest.fn(),
}));

const request = require('supertest');
const app = require('../server');
const dbModule = require('../config/db');
const { createMockCollection, createMockDb } = require('./testHelpers');

describe('Feedback API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('submits feedback successfully', async () => {
    const feedbackCollection = createMockCollection({ insertedId: 'feedback-1' });
    const mockDb = createMockDb({ Feedback: feedbackCollection });
    dbModule.getClient.mockReturnValue({ db: () => mockDb });
    dbModule.getDb.mockReturnValue(mockDb);
    dbModule.getExistingCollection.mockResolvedValue(feedbackCollection);

    const response = await request(app).post('/api/feedback').send({
      userId: '123',
      username: 'testuser',
      message: 'Great app!',
      rating: 5,
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.feedback).toMatchObject({
      userId: '123',
      username: 'testuser',
      message: 'Great app!',
      rating: 5,
      type: 'feedback',
    });
  });

  test('retrieves a user feedback history', async () => {
    const feedbackCollection = createMockCollection({
      findImpl: () => ({
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([
          { _id: 'feedback-1', userId: '123', message: 'Great app!', rating: 5 },
        ]),
      }),
    });
    const mockDb = createMockDb({ Feedback: feedbackCollection });
    dbModule.getClient.mockReturnValue({ db: () => mockDb });
    dbModule.getDb.mockReturnValue(mockDb);
    dbModule.getExistingCollection.mockResolvedValue(feedbackCollection);

    const response = await request(app).get('/api/feedback/user/123');

    expect(response.statusCode).toBe(200);
    expect(response.body.feedback).toHaveLength(1);
    expect(response.body.feedback[0]).toMatchObject({ userId: '123', message: 'Great app!' });
  });

  test('updates feedback status and notifies the author', async () => {
    const feedbackId = '507f1f77bcf86cd799439013';
    const feedbackCollection = createMockCollection({
      findOneAndUpdateResult: {
        value: {
          _id: feedbackId,
          userId: '123',
          username: 'testuser',
          message: 'Great app!',
          rating: 5,
          status: 'resolved',
        },
      },
    });
    const userCollection = createMockCollection({
      findOneResult: { _id: '123', name: 'testuser' },
    });
    const mockDb = createMockDb({ Feedback: feedbackCollection, User: userCollection });
    dbModule.getClient.mockReturnValue({ db: () => mockDb });
    dbModule.getDb.mockReturnValue(mockDb);
    dbModule.getExistingCollection.mockResolvedValue(feedbackCollection);

    const response = await request(app)
      .put(`/api/feedback/${feedbackId}/status`)
      .send({ status: 'resolved', adminResponse: 'Thanks for the report' });

    expect(response.statusCode).toBe(200);
    expect(response.body.feedback).toMatchObject({ status: 'resolved' });
    expect(feedbackCollection.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });
});
