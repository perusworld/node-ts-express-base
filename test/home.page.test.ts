import request from 'supertest';
import { Server } from '../src/server';

let serverInstance = Server.bootstrap();
let app = serverInstance.app;

beforeAll(() => {
  return serverInstance.init();
});

afterAll(() => {
  return serverInstance.cleanup();
});

describe('Test the root path', () => {
  test('It should get root path', done => {
    request(app).get('/').expect(200, done);
  });
});

describe('Test the hello path', () => {
  test('It should get hello path', done => {
    request(app)
      .get('/hello?msg=hello')
      .end((err: any, res: any) => {
        if (err) {
          return done(err);
        }
        expect(res.text).toContain('Hello From Controller');
        return done();
      });
  });
});
