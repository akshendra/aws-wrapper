/**
 * SNS
 */


module.exports = function notification(AWS) {
  const sns = new AWS.SNS();
  return {
    push(topic, subject, message) {
      return sns.publish({
        TopicArn: topic,
        Message: JSON.stringify(message),
        Subject: subject,
      }).promise();
    },
  };
};
