function createCursor(results = []) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockResolvedValue(results),
  };
}

function createMockCollection(overrides = {}) {
  const cursor = createCursor(overrides.findResults || []);

  return {
    find: jest.fn(() => {
      if (typeof overrides.findImpl === 'function') {
        return overrides.findImpl();
      }

      return cursor;
    }),
    findOne: jest.fn().mockResolvedValue(
      Object.prototype.hasOwnProperty.call(overrides, 'findOneResult')
        ? overrides.findOneResult
        : null
    ),
    insertOne: jest.fn().mockResolvedValue(
      Object.prototype.hasOwnProperty.call(overrides, 'insertOneResult')
        ? overrides.insertOneResult
        : { insertedId: overrides.insertedId || 'mock-id' }
    ),
    findOneAndUpdate: jest.fn().mockResolvedValue(
      Object.prototype.hasOwnProperty.call(overrides, 'findOneAndUpdateResult')
        ? overrides.findOneAndUpdateResult
        : { value: Object.prototype.hasOwnProperty.call(overrides, 'updatedDoc') ? overrides.updatedDoc : null }
    ),
    updateOne: jest.fn().mockResolvedValue(
      Object.prototype.hasOwnProperty.call(overrides, 'updateOneResult')
        ? overrides.updateOneResult
        : { matchedCount: 1, modifiedCount: 1 }
    ),
    updateMany: jest.fn().mockResolvedValue(
      Object.prototype.hasOwnProperty.call(overrides, 'updateManyResult')
        ? overrides.updateManyResult
        : { modifiedCount: 1 }
    ),
    deleteOne: jest.fn().mockResolvedValue(
      Object.prototype.hasOwnProperty.call(overrides, 'deleteOneResult')
        ? overrides.deleteOneResult
        : { deletedCount: 1 }
    ),
    createIndex: jest.fn().mockResolvedValue(undefined),
    countDocuments: jest.fn().mockResolvedValue(
      Object.prototype.hasOwnProperty.call(overrides, 'countDocumentsResult')
        ? overrides.countDocumentsResult
        : (overrides.findResults || []).length
    ),
  };
}

function createMockDb(collections) {
  return {
    collection: jest.fn((name) => collections[name]),
    listCollections: jest.fn(async () => ({
      toArray: async () => Object.keys(collections).map((name) => ({ name })),
    })),
  };
}

function createMockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.download = jest.fn().mockReturnValue(res);
  return res;
}

module.exports = {
  createCursor,
  createMockCollection,
  createMockDb,
  createMockRes,
};