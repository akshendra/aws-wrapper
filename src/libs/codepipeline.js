
const AWS = require('aws-sdk');
const codepipeline = new AWS.CodePipeline();


exports.fail = function fail(jobId, message, contextId) {
  const params = {
    jobId: jobId,
    failureDetails: {
      message: JSON.stringify(message),
      type: 'JobFailed',
      externalExecutionId: contextId,
    },
  };
  return codepipeline.putJobFailureResult(params).promise();
};


exports.success = function success(jobId) {
  const params = {
    jobId: jobId,
  };
  return codepipeline.putJobSuccessResult(params).promise();
};

exports.approve = function approve({ actionName, token, pipelineName, approved, stageName }) {
  const params = {
    actionName,
    token,
    result: {
      status: approved === true ? 'Approved' : 'Rejected',
      summary: '',
    },
    stageName,
    pipelineName,
  };

  return codepipeline.putApprovalResult(params).promise();
};
