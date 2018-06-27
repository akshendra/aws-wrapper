/**
 * SNS
 */

const AWS = require('aws-sdk');
const sns = new AWS.SNS();

/**
 * Push on SNS topic something
 */
exports.push = function push(topic, subject, message) {
  return sns.publish({
    TopicArn: process.env[`TOPIC_${topic}`] || topic,
    Message: JSON.stringify(message),
    Subject: subject,
  }).promise();
};
