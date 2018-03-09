/**
 * SNS
 */

const AWS = require('aws-sdk');
const sns = new AWS.SNS({ region: 'us-east-1' });

const topics = {
  ecs: 'arn:aws:sns:us-east-1:399771530480:ecs',
};


/**
 * Push on SNS topic something
 */
exports.push = function push(topic, subject, message) {
  return sns.publish({
    TopicArn: topics[topic],
    Message: JSON.stringify(message),
    Subject: subject,
  }).promise();
};
