export { };
let request = require("supertest");
let server = require("../src/server");
let serverInstance = server.Server.bootstrap();
let app = serverInstance.app;

beforeAll(() => {
  return serverInstance.init();
});

afterAll(() => {
  return serverInstance.cleanup();
});

describe("Test the api hello", () => {
  test("It should call api hello", done => {
    request(app)
      .post("/api/v1/hello")
      .send({ msg: 'hi' })
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res: any) => {
        expect(res.body.msg).toBe('hi there v1');
        expect(res.body.youSent).toMatchObject({ msg: 'hi' });
        done();
      })
      .catch((err: any) => done(err))
  });
});

describe("Test the api undefined blah", () => {
  test("It should respond with 404", done => {
    request(app)
      .post("/api/v1/blah")
      .send({ msg: 'hi' })
      .set('Accept', 'application/json')
      .expect(404)
      .then((res: any) => {
        expect(res.text).toContain('Error');
        done();
      })
      .catch((err: any) => done(err))
  });
});