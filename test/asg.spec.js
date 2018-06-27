/* eslint no-unused-expressions: 0 */

const { expect } = require('chai');
const asg = require('../src/libs/asg');

describe('ASG', function () {
  it('should get an autoscaling group', async function () {
    const name = process.env.TEST_ASG;
    const g = await asg.get(name);
    expect(g.name).to.equal(name);
    expect(g.arn).to.be.a('string');
    expect(g.zones).to.be.an('array');
    expect(g.cooldown).to.be.a('number');
    expect(g.status).to.be.a('string');
    expect(g.tags).to.be.an('object');
    const c = g.capacity;
    expect(c).to.be.an('object');
    expect(c.max).to.be.a('number');
    expect(c.min).to.be.a('number');
    expect(c.desired).to.be.a('number');
    expect(c.running).to.be.a('number');
    const h = g.health;
    expect(h).to.be.an('object');
    expect(h.grace).to.be.a('number');
    expect(h.type).to.be.a('string');
    const ins = g.instances;
    expect(ins).to.be.an('array');
    ins.forEach(i => {
      expect(i.zone).to.be.a('string');
      expect(i.status).to.be.a('string');
      expect(i.state).to.be.a('string');
      expect(i.id).to.be.a('string');
    });
  });
});
