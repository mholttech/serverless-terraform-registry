const dynamoose = require('dynamoose');
const { TF_APIKEYS_TABLE } = process.env;


const tfAPIKeySchema = new dynamoose.Schema({
  "api_key": {
    "type": String,
    "hashKey": true
  },
  "created_on": {
    "type": String,
    "rangeKey": true
  },
});
const tfAPIKeyModel = dynamoose.model(TF_APIKEYS_TABLE, tfAPIKeySchema)

const checkAPIKey = async (apikey) => {

  try {
    const result = await tfAPIKeyModel.query('api_key').eq(apikey).all().exec();

    if (result.length < 1) {
      const err = "Invalid API Key";
      throw err;
    }
    return true
  } catch (error) {
    console.log(error);

    const err = new Error(error);
    err.statusCode = 401;
    throw err;
  }
}

module.exports = { checkAPIKey };
