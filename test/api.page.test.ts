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

describe('Test the api hello GET', () => {
  test('It should call api hello GET', done => {
    request(app)
      .get('/api/v1/hello')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res: any) => {
        expect(res.body.message).toBe('Hello World!');
        expect(res.body.timestamp).toBeDefined();
        expect(res.body.sessionKey).toBeDefined();
        done();
      })
      .catch((err: any) => done(err));
  });
});

describe('Test the api hello POST', () => {
  test('It should call api hello POST', done => {
    request(app)
      .post('/api/v1/hello')
      .send({ msg: 'hi' })
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res: any) => {
        expect(res.body.msg).toBe('hi there');
        expect(res.body.youSent).toMatchObject({ msg: 'hi' });
        expect(res.body.uuid).toBeDefined();
        done();
      })
      .catch((err: any) => done(err));
  });
});

describe('Test the api health', () => {
  test('It should call api health', done => {
    request(app)
      .get('/api/v1/health')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res: any) => {
        expect(res.body.status).toBe('healthy');
        expect(res.body.timestamp).toBeDefined();
        expect(res.body.sessionKey).toBeDefined();
        done();
      })
      .catch((err: any) => done(err));
  });
});

describe('Test the api undefined blah', () => {
  test('It should respond with 404', done => {
    request(app)
      .post('/api/v1/blah')
      .send({ msg: 'hi' })
      .set('Accept', 'application/json')
      .expect(404)
      .then((res: any) => {
        expect(res.text).toContain('Error');
        done();
      })
      .catch((err: any) => done(err));
  });
});
