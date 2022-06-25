/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const logger = require('./helpers/logger');
const { response, unimplemented } = require('./helpers/response');
const { TF_REGISTRY_TABLE } = process.env;
const dynamoose = require('dynamoose');
dynamoose.logger.providers.set(console);
const tfmoduleSchema = new dynamoose.Schema({
  "id": {
    "type": String,
    "hashKey": true
  },
  "version": {
    "type": String,
    "rangeKey": true
  },
  "published_at": String,
  "published": Number,
  "beta": Number,
  "internal": Number,
  "download_count": Number
});
const tfmoduleModel = dynamoose.model(TF_REGISTRY_TABLE, tfmoduleSchema)

exports.handler = async (event) => {
  logger.log('info', "It Works", { data: event, success: true, tags: 'event' });


  let body;
  let statusCode = '200';
  const headers = {
    'Content-Type': 'application/json',
  };

  body = JSON.stringify(event);
  try {
    switch (event.routeKey) {
      case "GET /.well-known/terraform.json":
        body = JSON.stringify({
          "modules.v1": "/modules/"
        })
        break;
      case "GET /modules/{namespace}/{name}/{provider}/versions":
        body = await listAvailableVersionsForSpecificModule(event.pathParameters.namespace, event.pathParameters.name, event.pathParameters.provider);
        break;
      case "GET /modules/{namespace}/{name}/{provider}/{version}/create":
        // unimplemented("CreateModule", event.pathParameters, event.queryStringParameters, event.routeKey);
        body = await createModuleVersion(event.pathParameters, event.queryStringParameters);
        break;
      default:
        unimplemented(event.routeKey, event.pathParameters, event.queryStringParameters);
    }
  } catch (err) {
    logger.log('error', "Bad Route " + event.routeKey, { err, success: false, tags: 'error' });
    body = err.toString();
    statusCode = err.statusCode || 500;
  }

  resp = response(statusCode, body, headers);

  return resp;
}



async function listAvailableVersionsForSpecificModule(namespace, name, provider) {
  try {
    const source = `${namespace}/${name}/${provider}`;
    const result = await tfmoduleModel.query('id').eq(source).sort("descending").all().exec();
    const count = result.length

    if (count < 1) {
      const err = "Module Not Found";
      throw err;
    }

    const versions = result.map(i => { return { version: i.version }; });

      return JSON.stringify({
        modules: [{ source, versions }]
    });

  } catch (error) {
    console.log(error);

    const err = new Error(error);
    err.statusCode = 404;
    throw err;
  }
}

async function createModuleVersion(pathParameters, queryStringParameters) {
  try {

    const result = await tfmoduleModel.create({
      id: [pathParameters.namespace, pathParameters.name, pathParameters.provider].join('/'),
      version: pathParameters.version,
      published_at: new Date().toISOString(),
      published: 1,
      beta: 0,
      internal: 0
    });

    return JSON.stringify({
      message: "Success",
      result,
    });
  } catch (error) {
    console.log(error);

    return JSON.stringify({
      message: "Error",
      error,
    });
  }
}
