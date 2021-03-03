export { };
let request = require("supertest");
let server = require("../src/server");
let app = server.Server.bootstrap().app;

describe("Test the root path", () => {
  test("It should get root path", done => {
    request(app)
      .get("/")
      .expect(200, done);
  });
});

describe("Test the hello path", () => {
  test("It should get hello path", done => {
    request(app)
      .get("/hello?msg=hello")
      .end((err: any, res: any) => {
        if (err) {
          return done(err);
        }
        expect(res.text).toContain('Hello From Controller');
        return done();
      });

  });
});