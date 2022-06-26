const { response, unimplemented } = require('../../helpers/response');


describe('Testing Response Helper', () => {

  test('Should return the expected response', async () => {
    expect.assertions(2);
    // WHEN
    const result = await response(200, "Success");
    // THEN
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("Success");
  });

  test('it should throw an error', () => {
    // expect.assertions(1);
    let response = JSON.stringify({"message":"Not implemented: undefined"});
    let error = unimplemented
    expect(unimplemented).toThrowError(response);
    // expect(() => unimplemented.toThrowError(response));
  });

});
