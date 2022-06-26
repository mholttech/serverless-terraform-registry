const event_valid = require('./event_valid.json')
const event_invalid = require('./event_invalid.json')
const { handler } = require('../index');

function callback (error, response) { return error || response }


describe('Testing Lambda', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });
  test('Ensure .well-know/terraform.json returns expected data', async () => {
    const mResponse = { body: JSON.stringify({"modules.v1":"/modules/"}), headers: {'Content-Type': 'application/json'},statusCode: "200", };
    const actualValue = await handler(event_valid);
    expect(actualValue).toEqual(mResponse);
  });
  test('Ensure .well-know/terraform.json returns expected data', async () => {
    const mResponse = { body: "Error: "+JSON.stringify({"message":"Not implemented: GET /.well-known/terraform123.json","pathParameters":{"name":"label","namespace":"mholt","provider":"null"}}), headers: {'Content-Type': 'application/json'}, statusCode: 500, };
    const actualValue = await handler(event_invalid);
    expect(actualValue).toEqual(mResponse);
  });

});
