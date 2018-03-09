/**
 * Playing with Load Balances etc
 */

const AWS = require('aws-sdk');
const elb2 = new AWS.ELBv2();

const defs = {
  path: '/ready',
  interval: 30,
  timeout: 10,
  healthyThreshold: 2,
  unhealthyThreshold: 5,
  code: '200',
};


exports.getTG = function getTG(arn) {
  return elb2.describeTargetGroups({
    TargetGroupArns: [
      arn,
    ],
  }).promise()
    .then(response => response.TargetGroups[0]);
};

exports.getTGHealth = function getTGHealth(arn) {
  return elb2.describeTargetHealth({
    TargetGroupArn: arn,
  }).promise()
    .then(response => response.TargetHealthDescriptions)
    .then(targets => {
      return targets.reduce((start, tg) => {
        const state = tg.TargetHealth.State;
        return Object.assign({}, start, {
          [tg.TargetHealth.State]: start[state] + 1,
        });
      }, {
        initial: 0,
        healthy: 0,
        unhealthy: 0,
        draining: 0,
      });
    });
};

exports.updateTG = function updateTG(arn, params) {
  const opts = Object.assign({}, defs, params);
  return elb2.modifyTargetGroup({
    TargetGroupArn: arn,
    HealthCheckIntervalSeconds: opts.interval,
    HealthCheckPath: opts.path,
    HealthCheckTimeoutSeconds: opts.timeout,
    HealthyThresholdCount: opts.healthyThreshold,
    UnhealthyThresholdCount: opts.unhealthyThreshold,
    Matcher: {
      HttpCode: opts.code,
    },
  }).promise();
};

exports.putTG = function putTG(arn, params) {
  const opts = Object.assign({}, defs, params);
  return exports.getTG(arn)
    .then(tg => {
      if (tg.HealthCheckPath !== opts.path
        || tg.HealthCheckIntervalSeconds !== opts.interval
        || tg.HealthCheckTimeoutSeconds !== opts.timeout
        || tg.HealthyThresholdCount !== opts.healthyThreshold
        || tg.UnHealthyThresholdCount !== opts.unhealthyThreshold
        || tg.Matcher.HttpCode !== opts.code
      ) {
        return false;
      }
      return true;
    })
    .then(shouldUpdate => {
      if (shouldUpdate === true) {
        return exports.updateTG(arn, params);
      }
      return Promise.resolve(true);
    });
};
