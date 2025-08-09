export {};
let request = require('supertest');
let server = require('../src/server');
let serverInstance = server.Server.bootstrap();
let app = serverInstance.app;

// Sample model interface
interface TestModel {
  id?: string;
  createdDate?: number;
  name: string;
  value: number;
}

beforeAll(() => {
  return serverInstance.init();
});

afterAll(() => {
  return serverInstance.cleanup();
});

describe('Test CMS APIs', () => {
  const testModel: TestModel = {
    name: 'test item',
    value: 42,
  };

  let savedId: string;

  test('It should save an item', done => {
    request(app)
      .post('/api/v1/cms/save/test-items')
      .send(testModel)
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res: any) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe(testModel.name);
        expect(res.body.value).toBe(testModel.value);
        expect(res.body.createdDate).toBeDefined();
        savedId = res.body.id;
        done();
      })
      .catch((err: any) => done(err));
  });

  test('It should get item by id', done => {
    request(app)
      .get(`/api/v1/cms/test-items/${savedId}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res: any) => {
        expect(res.body.id).toBe(savedId);
        expect(res.body.name).toBe(testModel.name);
        expect(res.body.value).toBe(testModel.value);
        done();
      })
      .catch((err: any) => done(err));
  });

  test('It should list all items', done => {
    request(app)
      .get('/api/v1/cms/test-items')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res: any) => {
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].name).toBe(testModel.name);
        done();
      })
      .catch((err: any) => done(err));
  });

  test('It should delete item by id', done => {
    request(app)
      .delete(`/api/v1/cms/test-items/${savedId}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res: any) => {
        expect(res.body.id).toBe(savedId);
        done();
      })
      .catch((err: any) => done(err));
  });

  test('It should reset all items in a table', done => {
    request(app)
      .delete('/api/v1/cms/test-items')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res: any) => {
        expect(typeof res.body).toBe('number');
        done();
      })
      .catch((err: any) => done(err));
  });
});

describe('Test CMS Database Persistence', () => {
  const testModels: TestModel[] = [
    { name: 'persist item 1', value: 100 },
    { name: 'persist item 2', value: 200 },
  ];

  let savedIds: string[] = [];

  beforeEach(async () => {
    // Clear any existing data
    await request(app).delete('/api/v1/cms/test-items').expect(200);
  });

  test('It should persist data through saveDB and loadDB', async () => {
    // 1. Save some test items
    for (const model of testModels) {
      const res = await request(app).post('/api/v1/cms/save/test-items').send(model).expect(200);

      savedIds.push(res.body.id);
    }

    // 2. Call saveDB to persist to disk
    await request(app)
      .post('/api/v1/cms/save-db')
      .expect(200)
      .expect((res: any) => {
        expect(res.body.success).toBeTruthy();
      });

    // 3. Clear the in-memory database
    await request(app).delete('/api/v1/cms').expect(200);

    // 4. Verify data is cleared
    const emptyRes = await request(app).get('/api/v1/cms/test-items').expect(200);
    expect(emptyRes.body).toHaveLength(0);

    // 5. Load data back from disk
    await request(app)
      .post('/api/v1/cms/load-db')
      .expect(200)
      .expect((res: any) => {
        expect(res.body.success).toBeTruthy();
      });

    // 6. Verify all data is restored
    const loadedRes = await request(app).get('/api/v1/cms/test-items').expect(200);

    expect(loadedRes.body).toHaveLength(testModels.length);

    // Verify each item was restored correctly
    for (let i = 0; i < testModels.length; i++) {
      const loadedItem = loadedRes.body.find((item: TestModel) => item.id === savedIds[i]);
      expect(loadedItem).toBeDefined();
      expect(loadedItem.name).toBe(testModels[i].name);
      expect(loadedItem.value).toBe(testModels[i].value);
    }
  });

  test('It should handle loadDB when no saved data exists', async () => {
    // 1. Clear any existing saved data
    await request(app).delete('/api/v1/cms').expect(200);

    await request(app).post('/api/v1/cms/save-db').expect(200);

    // 2. Try to load data
    await request(app)
      .post('/api/v1/cms/load-db')
      .expect(200)
      .expect((res: any) => {
        expect(res.body.success).toBeTruthy();
      });

    // 3. Verify database is empty
    const res = await request(app).get('/api/v1/cms/test-items').expect(200);

    expect(res.body).toHaveLength(0);
  });

  afterAll(async () => {
    // Clean up any saved database files
    await request(app).delete('/api/v1/cms').expect(200);

    await request(app).post('/api/v1/cms/save-db').expect(200);
  });
});
