
const asg = require('./libs/asg');
const cw = require('./libs/cw');
const ecs = require('./libs/ecs');
const lb = require('./libs/lb');
const sns = require('./libs/sns');
const s3 = require('./libs/s3');
const codepipeline = require('./libs/codepipeline');

module.exports = {
  asg, cw, ecs, lb, sns, codepipeline, s3,
};
