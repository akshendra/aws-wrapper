/**
 * Helpers for Auto Scaling Groups
 */

const { bindSchema, extractTag } = require('../helpers/mapper');
const AWS = require('aws-sdk');
const asg = new AWS.AutoScaling();
const ec2 = new AWS.EC2();

const map = bindSchema({
  arn: 'AutoScalingGroupARN',
  name: 'AutoScalingGroupName',
  zones: ['AvailabilityZones'],
  cooldown: 'DefaultCooldown',
  createdAt: 'CreatedTime',
  status: {
    key: 'Status',
    apply: data => data || 'N/A',
  },
  tags: {
    key: 'Tags',
    apply: extractTag,
  },
  capacity: {
    desired: 'DesiredCapacity',
    min: 'MinSize',
    max: 'MaxSize',
    running: {
      key: '.',
      apply: (data) => data.Instances.length,
    },
  },
  health: {
    grace: 'HealthCheckGracePeriod',
    type: 'HealthCheckType',
  },
  instances: ['Instances', {
    zone: 'AvailabilityZone',
    status: 'HealthStatus',
    state: 'LifecycleState',
    id: 'InstanceId',
  }],
});


function getGroupOfInstance(instanceId) {
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
}


/**
 * Get the current number
 * of running instances in an Auto Scaling Group
 */
function getCurrentCount(name) {
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
}


async function get(name) {
  const response = await asg.describeAutoScalingGroups({
    AutoScalingGroupNames: [
      name,
    ],
  }).promise();

  const group = response.AutoScalingGroups[0];

  if (!group) {
    throw new Error(`AutoScalingGroup with name ${name} not found`);
  }

  return map(group);
}


function scale(name, desired = 1) {
  return asg.updateAutoScalingGroup({
    AutoScalingGroupName: name,
    DesiredCapacity: desired,
  }).promise();
}

module.exports = {
  get, scale, getGroupOfInstance,
  getCurrentCount,
};
