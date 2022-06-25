/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const logger = require('./helpers/logger');
const { response, unimplemented } = require('./helpers/response');


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
