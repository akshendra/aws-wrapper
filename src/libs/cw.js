/**
 * Helper for cloudwatch
 */

const { moment } = require('moment');
const AWS = require('aws-sdk');
const cw = new AWS.CloudWatch();


function summate(response, stat = 'Sum', period = 60) {
  const sum = response.Datapoints.reduce((start, dp) => {
    return start + dp[stat];
  }, 0);
  return Math.ceil(sum / period / response.Datapoints.length);
}


exports.checkAllLess = function getCheckAllLess(lb, val) {
  const request = {
    EndTime: moment().unix(),
    MetricName: 'RequestCount',
    Namespace: 'AWS/ApplicationELB',
    Period: 60,
    StartTime: moment().subtract('10', 'minute').unix(),
    Dimensions: [
      {
        Name: 'LoadBalancer', /* required */
        Value: lb, /* required */
      },
    ],
    Statistics: [
      'Sum',
    ],
    Unit: 'Count',
  };
  return cw.getMetricStatistics(request).promise()
    .then(response => {
      const allLess = response.Datapoints.reduce((start, dp) => {
        const current = Math.ceil(dp.Sum / 60);
        return start && (val > current);
      }, true);
      return allLess;
    });
};


/**
 * Check rabbit messages
 */
/**
 * Number of messages in rabbitmq decreased -- return true
 */
exports.checkRabbitMessages = function checkRabbitMessages(val, machine, queue) {
  const request = {
    EndTime: moment().unix(),
    MetricName: 'Total',
    Namespace: 'EC2/Rabbit',
    Period: 60,
    StartTime: moment().subtract('5', 'minute').unix(),
    Dimensions: [
      {
        Name: 'Machine', /* required */
        Value: machine, /* required */
      },
      {
        Name: 'Queue', /* required */
        Value: queue, /* required */
      },
    ],
    Statistics: [
      'Sum',
    ],
    Unit: 'Count',
  };
  return cw.getMetricStatistics(request).promise()
    .then(response => {
      const allLess = response.Datapoints.reduce((start, dp) => {
        const current = Math.ceil(dp.Sum / 60);
        return start && (val > current);
      }, true);
      return allLess;
    });
};


/**
 * Return the current connetion
 */
exports.getRequestCount = function getRequestCount(lb) {
  const request = {
    EndTime: moment().unix(),
    MetricName: 'RequestCount',
    Namespace: 'AWS/ApplicationELB',
    Period: 60,
    StartTime: moment().subtract('5', 'minute').unix(),
    Dimensions: [
      {
        Name: 'LoadBalancer', /* required */
        Value: lb, /* required */
      },
    ],
    Statistics: [
      'Sum',
    ],
    Unit: 'Count',
  };
  return cw.getMetricStatistics(request).promise()
    .then(response => summate(response, 'Sum', 60));
};


exports.getRabbitMessageCount = function getRabbitMessageCount(machine, queue) {
  const request = {
    EndTime: moment().unix(),
    MetricName: 'Total',
    Namespace: 'EC2/Rabbit',
    Period: 60,
    StartTime: moment().subtract('5', 'minute').unix(),
    Dimensions: [
      {
        Name: 'Machine', /* required */
        Value: machine, /* required */
      },
      {
        Name: 'Queue', /* required */
        Value: queue, /* required */
      },
    ],
    Statistics: [
      'Sum',
    ],
    Unit: 'Count',
  };
  return cw.getMetricStatistics(request).promise()
    .then(response => summate(response, 'Sum', 60));
};


/**
 * Get the memory status of an ecs service
 */
exports.getMemoryUsageOfService = function getMemoryUsageOfService(serviceName, clusterName) {
  const request = {
    StartTime: moment().subtract('5', 'minute').unix(),
    EndTime: moment().unix(),
    MetricName: 'MemoryUtilization',
    Namespace: 'AWS/ECS',
    Period: 60,
    Dimensions: [
      {
        Name: 'ServiceName', /* required */
        Value: serviceName, /* required */
      },
      {
        Name: 'ClusterName',
        Value: clusterName,
      },
    ],
    Statistics: [
      'Average',
    ],
    Unit: 'Percent',
  };
  return cw.getMetricStatistics(request).promise()
    .then(response => summate(response, 'Average', 60));
};


/**
 * Get the cpu status of an ecs service
 */
exports.getCpuUsageOfService = function getCpuUsageOfService(serviceName, clusterName) {
  const request = {
    StartTime: moment().subtract('5', 'minute').unix(),
    EndTime: moment().unix(),
    MetricName: 'CPUUtilization',
    Namespace: 'AWS/ECS',
    Period: 60,
    Dimensions: [
      {
        Name: 'ServiceName', /* required */
        Value: serviceName, /* required */
      },
      {
        Name: 'ClusterName',
        Value: clusterName,
      },
    ],
    Statistics: [
      'Average',
    ],
    Unit: 'Percent',
  };
  return cw.getMetricStatistics(request).promise()
    .then(response => {
      const sum = response.Datapoints.reduce((start, dp) => {
        return start + dp.Average;
      }, 0);
      return Math.ceil(sum / response.Datapoints.length);
    });
};


exports.getReservedCpuUsage = function getReservedCpuUsage(cluster) {
  const request = {
    StartTime: moment().subtract('20', 'minute').unix(),
    EndTime: moment().unix(),
    MetricName: 'CPUReservation',
    Namespace: 'AWS/ECS',
    Period: 60,
    Dimensions: [
      {
        Name: 'ClusterName', /* required */
        Value: cluster, /* required */
      },
    ],
    Statistics: [
      'Average',
    ],
    Unit: 'Percent',
  };
  return cw.getMetricStatistics(request).promise()
    .then(response => summate(response, 'Average', 60));
};

