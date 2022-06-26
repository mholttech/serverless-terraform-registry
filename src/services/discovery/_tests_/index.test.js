const event1 = require('./event1.json')
const event2 = require('./event2.json')
const { handler } = require('../index');

function callback (error, response) { return error || response }


describe('Testing Lambda', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });
  test('Ensure .well-know/terraform.json returns expected data', async () => {
    const mResponse = { body: JSON.stringify({"modules.v1":"/modules/"}), headers: {'Content-Type': 'application/json'},statusCode: "200", };
    const actualValue = await handler(event1);
    expect(actualValue).toEqual(mResponse);
  });
  test('Ensure .well-know/terraform.json returns expected data', async () => {
    const mResponse = { body: "Error: "+JSON.stringify({"message":"Not implemented: GET /.well-known/terraform123.json","pathParameters":{"name":"label","namespace":"mholt","provider":"null"}}), headers: {'Content-Type': 'application/json'}, statusCode: 500, };
    const actualValue = await handler(event2);
    expect(actualValue).toEqual(mResponse);
  });

});
