/**
 * Helper for cloudwatch
 */

const moment = require('moment');

function summate(response, stat = 'Sum', period = 1) {
  const sum = response.Datapoints.reduce((start, dp) => {
    return start + dp[stat];
  }, 0);
  return Math.ceil(sum / period / response.Datapoints.length);
}

function check(response, val, period = 1) {
  return response.Datapoints.reduce((start, dp) => {
    const current = Math.ceil(dp.Sum / period);
    return {
      more: start.more && (val > current),
      less: start.less && (val <= current),
    };
  }, {
    less: true,
    more: true,
  });
}

function dim(obj) {
  return Object.keys(obj).map(key => {
    return {
      Name: key,
      Value: obj[key],
    };
  });
}


module.exports = function cloudwatch(AWS) {
  const cw = new AWS.CloudWatch();

  return {
    get(opts) {
      const { metric, namespace, period, interval, dimensions, stat, unit } = Object.assign({
        period: 60,
        interval: 5,
        stat: 'Sum',
        unit: 'Count',
      }, opts);
      const request = {
        EndTime: moment().unix(),
        MetricName: metric,
        Namespace: namespace,
        Period: period,
        StartTime: moment().subtract(interval, 'minute').unix(),
        Dimensions: dim(dimensions),
        Statistics: [
          stat,
        ],
        Unit: unit,
      };
      return cw.getMetricStatistics(request).promise();
    },

    checkRequests(lb, tg, val) {
      return this.get({
        metric: 'RequestCount',
        namespace: 'AWS/ApplicationELB',
        interval: '10',
        dimensions: {
          LoadBalancer: lb,
          TargetGroup: tg,
        },
      }).then(response => check(response, val, 60));
    },


    /**
     * Check rabbit messages
     */
    checkRabbitPublishRate(machine, queue, val) {
      return this.get({
        metric: 'PublishRate',
        namespace: 'EC2/Rabbit',
        dimensions: {
          Machine: machine,
          Queue: queue,
        },
      }).then(response => check(response, val, 60));
    },

    /**
     * Return the current connetion
     */
    getRequestCount(lb, tg) {
      return this.get({
        metric: 'RequestCount',
        namespace: 'AWS/ApplicationELB',
        dimensions: {
          LoadBalancer: lb,
          TargetGroup: tg,
        },
      }).then(response => summate(response, 'Sum', 60));
    },

    getRabbitMessageCount(machine, queue) {
      return this.get({
        metric: 'Total',
        namespace: 'EC2/Rabbit',
        dimensions: {
          Machine: machine,
          Queue: queue,
        },
      }).then(response => summate(response, 'Sum', 60));
    },

    getRabbitPublishRate(machine, queue) {
      return this.get({
        metric: 'PublishRate',
        namespace: 'EC2/Rabbit',
        dimensions: {
          Machine: machine,
          Queue: queue,
        },
      }).then(response => summate(response, 'Sum', 60));
    },


    /**
     * Get the memory status of an ecs service
     */
    getMemoryUsageOfService(serviceName, clusterName) {
      return this.get({
        metric: 'MemoryUtilization',
        namespace: 'AWS/ECS',
        dimensions: {
          ServiceName: serviceName,
          ClusterName: clusterName,
        },
        stat: 'Average',
        unit: 'Percent',
      }).then(response => summate(response, 'Average'));
    },

    /**
     * Get the cpu status of an ecs service
     */
    getCpuUsageOfService(serviceName, clusterName) {
      return this.get({
        metric: 'CPUUtilization',
        namespace: 'AWS/ECS',
        dimensions: {
          ServiceName: serviceName,
          ClusterName: clusterName,
        },
        stat: 'Average',
        unit: 'Percent',
      }).then(response => summate(response, 'Average'));
    },

    getReservedCpuUsage(cluster) {
      return this.get({
        interval: 20,
        metric: 'CPUReservation',
        namespace: 'AWS/ECS',
        dimensions: {
          ClusterName: cluster,
        },
        stat: 'Average',
        unit: 'Percent',
      }).then(response => summate(response, 'Average', 60));
    },
  };
};
