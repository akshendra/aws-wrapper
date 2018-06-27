
const { expect } = require('chai');

const ecs = require('../src/libs/ecs');

describe('ECS', function () {
  it('should get the service', async function () {
    const clusterName = process.env.TEST_ECS_CLUSTER;
    const serviceName = process.env.TEST_ECS_SERVICE;
    const service = await ecs.getService(clusterName, serviceName);
    expect(service.name).to.deep.equal(serviceName);
  });

  it('should get service with task definition', async function () {
    const clusterName = process.env.TEST_ECS_CLUSTER;
    const serviceName = process.env.TEST_ECS_SERVICE;
    const service = await ecs.getServiceWithTask(clusterName, serviceName);
    expect(service.name).to.deep.equal(serviceName);
    // console.log(JSON.stringify(service, null, 2));
  });

  it('should get cluster with all the instances', async function () {
    const clusterName = process.env.TEST_ECS_CLUSTER;
    const cluster = await ecs.getCluster(clusterName);
    expect(cluster.name).to.deep.equal(clusterName);
  });
});
