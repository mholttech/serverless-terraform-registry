const response = async (statusCode, body, headers) => {
  return {
    statusCode,
    body,
    headers
  };
}

const unimplemented = (routeKey, pathParameters, queryStringParameters) => {
  throw new Error(JSON.stringify({
    message: "Not implemented: " + routeKey,
    pathParameters,
    queryStringParameters
}));
}

module.exports = { response, unimplemented };
