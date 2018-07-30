/**
 * Cloudwatch Logs
 */

const AWS = require('aws-sdk');
const cwl = new AWS.CloudWatchLogs({
  region: 'us-east-1',
});

exports.listLogGroups = function listLogGroups(data = [], nextToken = null) {
  const request = {};
  if (nextToken) {
    Object.assign(request, {
      nextToken,
    });
  }
  return cwl.describeLogGroups(request).promise().then(response => {
    data.push(...response.logGroups);
    if (response.nextToken) {
      return listLogGroups(data, response.nextToken);
    }
    return data;
  });
};


exports.listLogStreams = function listLogGroups(group) {
  const request = {
    descending: true,
    logGroupName: group,
    orderBy: 'LastEventTime',
  };
  return cwl.describeLogStreams(request).promise().then(response => {
    console.log('Next', response.nextToken);
    return response.logStreams;
  });
};


exports.searchLogGroup = function searchLogGroup(name) {
  const request = {
    logGroupNamePrefix: name,
  };
  return cwl.describeLogGroups(request).promise().then(response => {
    return response.logGroups.filter((lg) => {
      return lg.logGroupName === name;
    })[0];
  });
};

exports.createLogGroup = function createLogGroup(name) {
  const request = {
    logGroupName: name,
  };
  return cwl.createLogGroup(request).promise().then(() => {
    return true;
  });
};

exports.getLogEvents = function getLogEvents(group, stream, startTime = Date.now()) {
  const request = {
    logGroupName: group,
    logStreamName: stream,
    startTime,
  };
  return cwl.getLogEvents(request).promise().then((response) => {
    return response.events;
  });
};
