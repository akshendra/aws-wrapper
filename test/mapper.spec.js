
const { expect } = require('chai');
const { bindSchema } = require('../src/helpers/mapper');


describe('Mapper', function () {
  it('should convert data into new props', function () {
    const data = {
      AutoScalingGroupARN: 'arn:aws:autoscaling:us-west-2:123456789012:autoScalingGroup:930d940e-891e-4781-a11a-7b0acd480f03:autoScalingGroupName/my-auto-scaling-group',
      AutoScalingGroupName: 'my-auto-scaling-group',
      AvailabilityZones: [
        'us-west-2c',
      ],
      DefaultCooldown: 300,
      DesiredCapacity: 1,
      EnabledMetrics: [
      ],
      HealthCheckGracePeriod: 300,
      HealthCheckType: 'EC2',
      Instances: [{
        AvailabilityZone: 'us-west-2c',
        HealthStatus: 'Healthy',
        InstanceId: 'i-4ba0837f',
        LaunchConfigurationName: 'my-launch-config',
        LifecycleState: 'InService',
        ProtectedFromScaleIn: false,
      }],
      LaunchConfigurationName: 'my-launch-config',
      LoadBalancerNames: [
      ],
      MaxSize: 1,
      MinSize: 0,
      NewInstancesProtectedFromScaleIn: false,
      SuspendedProcesses: [
      ],
      Tags: [
      ],
      TerminationPolicies: [
        'Default',
      ],
      VPCZoneIdentifier: 'subnet-12345678',
    };
    const schema = {
      arn: 'AutoScalingGroupARN',
      name: 'AutoScalingGroupName',
      zones: ['AvailabilityZones'],
      cooldown: 'DefaultCooldown',
      health: {
        grace: 'HealthCheckGracePeriod',
        type: 'HealthCheckType',
      },
      instances: ['Instances', {
        zone: 'AvailabilityZone',
        status: 'HealthStatus',
        id: 'InstanceId',
      }],
    };
    const mapping = bindSchema(schema);
    expect(mapping(data)).to.deep.equal({
      arn: 'arn:aws:autoscaling:us-west-2:123456789012:autoScalingGroup:930d940e-891e-4781-a11a-7b0acd480f03:autoScalingGroupName/my-auto-scaling-group',
      name: 'my-auto-scaling-group',
      zones: ['us-west-2c'],
      cooldown: 300,
      health: {
        grace: 300,
        type: 'EC2',
      },
      instances: [{
        zone: 'us-west-2c',
        status: 'Healthy',
        id: 'i-4ba0837f',
      }],
    });
  });
});
