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
        isAuthorized = await checkAPIKey(event.headers.authorization)
        if (isAuthorized === true) {
          statusCode = 204;
          headers["X-Terraform-Get"] = await downloadSourceCodeForSpecificModuleVersion(event.pathParameters.namespace, event.pathParameters.name, event.pathParameters.provider, event.pathParameters.version);
          body = "";
        }
        break;
      case "GET /modules/{namespace}/{name}/{provider}/download":
        isAuthorized = await checkAPIKey(event.headers.authorization)
        if (isAuthorized === true) {
          latestVersion = await getLatestAvailableVersionForSpecificModule(event.pathParameters.namespace, event.pathParameters.name, event.pathParameters.provider);
          statusCode = 302;
          headers["Location"] = `/modules/${latestVersion}/download`
          body = `<a href="/modules/${latestVersion}/download">Found</a>.`;
        }
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



async function getLatestAvailableVersionForSpecificModule(namespace, name, provider) {
  try {
    const source = `${namespace}/${name}/${provider}`;
    const result = await tfmoduleModel.query('id').eq(source).sort("descending").limit(1).exec();
    const count = result.length

    if (count < 1) {
      const err = "Module Not Found";
      throw err;
    }

    // const versions = result.map(i => { return { version: i.version }; });

    return `${namespace}/${name}/${provider}/${result[0].version}`

  } catch (error) {
    console.log(error);

    const err = new Error(error);
    err.statusCode = 404;
    throw err;
  }
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
