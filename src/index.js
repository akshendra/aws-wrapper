
const asg = require('./libs/asg');
const cw = require('./libs/cw');
const ecs = require('./libs/ecs');
const lb = require('./libs/lb');
const sns = require('./libs/sns');

module.exports = function wrapper(AWS) {
  return {
    asg: asg(AWS),
    cw: cw(AWS),
    ecs: ecs(AWS),
    lb: lb(AWS),
    sns: sns(AWS),
  };
};
