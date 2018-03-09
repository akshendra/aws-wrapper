/**
 * Helpers for Auto Scaling Groups
 */

const AWS = require('aws-sdk');
const asg = new AWS.AutoScaling();
const ec2 = new AWS.EC2();


exports.getGroupOfInstance = function getGroupOfInstance(instanceId) {
  const params = {
    Filters: [{
      Name: 'resource-id',
      Values: [instanceId],
    }, {
      Name: 'key',
      Values: ['aws:autoscaling:groupName'],
    }],
  };
  return ec2.describeTags(params).promise()
    .then(response => response.Tags[0].Value);
};


/**
 * Get the current number
 * of running instances in an Auto Scaling Group
 */
exports.getCurrentCount = function getCurrentCount(name) {
  return asg.describeAutoScalingGroups({
    AutoScalingGroupNames: [
      name,
    ],
  }).promise()
    .then(response => {
      const group = response.AutoScalingGroups[0];
      return {
        desired: group.DesiredCapacity,
        min: group.MinSize,
        max: group.MaxSize,
        running: group.Instances.length,
      };
    });
};


/**
 * Scale an Auto Scaling Group
 */
exports.scale = function scale(name, desired = 1) {
  return asg.updateAutoScalingGroup({
    AutoScalingGroupName: name,
    DesiredCapacity: desired,
  }).promise();
};
