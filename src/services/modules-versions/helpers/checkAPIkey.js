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
    var parts = apikey.split(' ');
    if (parts.length === 2) {
      var scheme = parts[0];
      var credentials = parts[1];

      if (/^Bearer$/i.test(scheme)) {
        const result = await tfAPIKeyModel.query('api_key').eq(credentials).all().exec();

        if (result.length < 1) {
          const err = "Invalid API Key";
          throw err;
        }
        return true
      }
      return false
    } else {
      const err = "Invalid API Key";
      throw err;
    }
  } catch (error) {
    console.log(error);

    const err = new Error(error);
    err.statusCode = 401;
    throw err;
  }
}

module.exports = { checkAPIKey };
