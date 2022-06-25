/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const logger = require('./helpers/logger');
const { response, unimplemented } = require('./helpers/response');
const { checkAPIKey } = require('./helpers/checkAPIkey');

const { TF_REGISTRY_TABLE, TF_REGISTRY_BUCKET } = process.env;
const dynamoose = require('dynamoose');

const AWS = require('aws-sdk');
const s3 = new AWS.S3();


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
      case "GET /modules/{namespace}/{name}/{provider}/{version}/download":
        var parts = event.headers.authorization.split(' ');
        if (parts.length === 2) {
          var scheme = parts[0];
          var credentials = parts[1];

          if (/^Bearer$/i.test(scheme)) {
            isAuthorized = await checkAPIKey(credentials)
          }
        } else {
          const err = new Error("Invalid API Key");;
          err.statusCode = 401;
          throw err;
        }
        if (isAuthorized === true) {
          statusCode = 204;
          headers["X-Terraform-Get"] = await downloadSourceCodeForSpecificModuleVersion(event.pathParameters.namespace, event.pathParameters.name, event.pathParameters.provider, event.pathParameters.version);
          body = "";
        }
        // body = await downloadSourceCodeForSpecificModuleVersion(event.pathParameters.namespace, event.pathParameters.name, event.pathParameters.provider, event.pathParameters.version);
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



/**
 * Get a signed URL to the S3 object with the module.
 *
 * @param {*} namespace
 * @param {*} name
 * @param {*} provider
 * @param {*} version
 */
async function downloadSourceCodeForSpecificModuleVersion(namespace, name, provider, version) {

  try {
    const source = `${namespace}/${name}/${provider}`;


    const result = await tfmoduleModel.query('id').eq(source).where("version").eq(version).sort("descending").all().exec();
    const count = result.length

    if (count < 1) {
      const err = "Module Not Found";
      throw err;
    }
    return s3.getSignedUrl('getObject', {
      Bucket: TF_REGISTRY_BUCKET,
      Key: `${namespace}/${name}/${provider}/${version}.zip`,
      Expires: 3600 // 1 hour
    });

  } catch (error) {
    console.log(error);

    const err = new Error(error);
    err.statusCode = 404;
    throw err;
  }
}
