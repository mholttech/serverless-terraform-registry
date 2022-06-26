const winston = require('winston');
const logger = new winston.createLogger({
  format: winston.format.json(),
  transports: [
    new (winston.transports.Console)({
      timestamp: true,
      colorize: true,
    })
  ]});

module.exports = logger;
