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
const notificationController = require('../src/controllers/notificationController');
const { createMockCollection, createMockDb } = require('./testHelpers');

describe('Notification API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates, reads, and clears notifications for the authenticated user', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const notificationId = '507f1f77bcf86cd799439012';
    const token = jwt.sign({ userId, username: 'testuser', role: 'user' }, jwtSecret, { expiresIn: '1h' });

    const notificationsCollection = createMockCollection({
      findResults: [
        {
          _id: notificationId,
          userId,
          title: 'New News Posted!',
          message: 'Check out the latest update',
          isRead: false,
        },
      ],
      findOneAndUpdateResult: {
        value: {
          _id: notificationId,
          userId,
          title: 'New News Posted!',
          message: 'Check out the latest update',
          isRead: true,
        },
      },
      updateManyResult: { modifiedCount: 1 },
      deleteOneResult: { deletedCount: 1 },
    });
    const mockDb = createMockDb({ Notifications: notificationsCollection });
    dbModule.getClient.mockReturnValue({ db: () => mockDb });
    dbModule.getDb.mockReturnValue(mockDb);

    const unreadResponse = await request(app)
      .get('/api/notifications/unread')
      .set('Authorization', `Bearer ${token}`);

    const markReadResponse = await request(app)
      .put(`/api/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${token}`);

    const markAllResponse = await request(app)
      .put('/api/notifications/read-all/mark')
      .set('Authorization', `Bearer ${token}`);

    const deleteResponse = await request(app)
      .delete(`/api/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(unreadResponse.statusCode).toBe(200);
    expect(unreadResponse.body.notifications).toHaveLength(1);
    expect(markReadResponse.statusCode).toBe(200);
    expect(markAllResponse.statusCode).toBe(200);
    expect(deleteResponse.statusCode).toBe(200);
  });
});