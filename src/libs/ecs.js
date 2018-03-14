/**
 * ECS helper
 */

function last(arr, back = 1) {
  return arr[arr.length - back];
}

module.exports = function elasticContainer(AWS) {
  const ecs = new AWS.ECS();

  return {
    runningTasks(serviceName, cluster = 'prod') {
      const request = {
        services: [
          serviceName,
        ],
        cluster,
      };

      return ecs.describeServices(request).promise()
        .then(response => {
          return {
            running: response.services[0].deployments[0].runningCount,
            pending: response.services[0].deployments[0].pendingCount,
            desired: response.services[0].deployments[0].desiredCount,
          };
        });
    },


    /**
     * Scale a service
     */
    scale(serviceName, clusterName, desired) {
      const request = {
        service: serviceName,
        desiredCount: desired,
        cluster: clusterName,
      };
      return ecs.updateService(request).promise();
    },


    /**
     * Register task and get the revision
     */
    registerTask(task) {
      return ecs.registerTaskDefinition(task).promise()
        .then(response => response.taskDefinition.revision);
    },


    getService(serviceName, clusterName, check = true) {
      return ecs.describeServices({
        services: [
          serviceName,
        ],
        cluster: clusterName,
      }).promise()
        .then(response => response.services[0])
        .then(service => {
          if (!service && check === true) {
            throw new Error(`Service ${serviceName} not found in cluster ${clusterName}`);
          }

          return service || null;
        });
    },


    /**
     * Get a service with more info and mapped
     */
    getServiceWithTask(serviceName, clusterName, check = true) {
      return this.getService(serviceName, clusterName, check)
        .then(service => {
          if (service) {
            const deployment = service.deployments.filter(dep => dep.status === 'PRIMARY')[0];
            return ecs.describeTaskDefinition({
              taskDefinition: last(service.taskDefinition.split('/')),
            }).promise()
              .then(res => res.taskDefinition)
              .then((t) => {
                return {
                  name: service.serviceName,
                  status: service.status,
                  type: service.launchType,
                  deployment: {
                    desired: deployment.desiredCount,
                    running: deployment.runningCount,
                    pending: deployment.pendingCount,
                    task: deployment.taskDefinition,

                  },
                  desired: service.desiredCount,
                  running: service.runningCount,
                  pending: service.pendingCount,
                  task: {
                    defintionArn: t.taskDefinitionArn,
                    family: t.family,
                    cpu: Number(t.cpu),
                    memory: Number(t.memory),
                  },
                  lb: service.loadBalancers.map(lb => {
                    return last(lb.targetGroupArn.split('/'), 2);
                  }),
                };
              });
          }
          return service;
        });
    },


    /**
     * Create a service
     */
    createService(service) {
      return ecs.createService(service)
        .promise()
        .then(response => response.service);
    },


    /**
     * Get a cluster
     */
    getCluster(name) {
      return ecs.describeClusters({
        clusters: [name],
      }).promise()
        .then(response => {
          return response.clusters;
        })
        .then(clusters => clusters[0])
        .then(cluster => {
          if (!cluster) {
            throw new Error(`Cluster ${name} is not found`);
          }
          return ecs.listContainerInstances({
            cluster: name,
          }).promise()
            .then(res => {
              return res.containerInstanceArns;
            })
            .then(arns => {
              if (arns.length <= 0) {
                return Promise.resolve([]);
              }
              return ecs.describeContainerInstances({
                cluster: name,
                containerInstances: arns,
              }).promise().then(r => r.containerInstances);
            })
            .then(ins => {
              return {
                name: cluster.clusterName,
                arn: cluster.clusterArn,
                runningTasks: cluster.runningTasksCount,
                pendingTasks: cluster.pendingTasksCount,
                runningServices: cluster.activeServicesCount,
                instances: ins.map(i => ({
                  cluster: cluster.clusterName,
                  arn: i.containerInstanceArn,
                  ec2: i.ec2InstanceId,
                  status: i.status,
                  runningTasks: i.runningTasksCount,
                  pendingTasks: i.pendingTasksCount,
                  remaining: i.remainingResources.reduce((start, r) => {
                    if (r.name === 'CPU') {
                      return Object.assign({}, start, {
                        cpu: r.integerValue - 100,
                      });
                    }
                    if (r.name === 'MEMORY') {
                      return Object.assign({}, start, {
                        memory: r.integerValue - 200,
                      });
                    }

                    return Object.assign({}, start, {
                      [r.name.toLowerCase()]: r.integerValue,
                    });
                  }, {}),
                  total: i.registeredResources.reduce((start, r) => {
                    if (r.name === 'CPU') {
                      return Object.assign({}, start, {
                        cpu: r.integerValue - 100,
                      });
                    }
                    if (r.name === 'MEMORY') {
                      return Object.assign({}, start, {
                        memory: r.integerValue - 200,
                      });
                    }
                    return Object.assign({}, start, {
                      [r.name.toLowerCase()]: r.integerValue,
                    });
                  }, {}),
                })),
              };
            });
        });
    },


    /**
     * Update service
     */
    updateService(service) {
      return ecs.updateService(service)
        .promise()
        .then(response => response.service);
    },


    /**
     * Get the deploymetn
     */
    getDeployment(serviceName, clusterName, revision) {
      return this.getService(serviceName, clusterName)
        .then(s => {
          let deployments = null;
          if (revision === 'PRIMARY') {
            deployments = s.deployments.filter(dep => dep.status === 'PRIMARY');
          } else {
            deployments = s.deployments.filter(dep => (dep.taskDefinition.indexOf(revision) !== -1));
          }
          const deploy = deployments.sort((left, right) => left.updatedAt > right.updatedAt)[0];
          return deploy;
        });
    },


    /**
     * All cluster names
     */
    getClusters() {
      return ecs.listClusters().promise()
        .then((response) => {
          return response.clusterArns.map(arn => last(arn.split('/')));
        });
    },


    /**
     * All cluster names
     */
    listServices(cluster) {
      return ecs.listServices({ cluster }).promise()
        .then((response) => {
          return response.serviceArns.map(arn => last(arn.split('/')));
        });
    },


    /**
     * All cluster names
     */
    listTaskArns(cluster) {
      return ecs.listTasks({ cluster }).promise()
        .then((response) => {
          return response.taskArns;
        });
    },

    /**
     * Get all tasks in cluster
     */
    getTasksInCluster(cluster) {
      return this.listTaskArns(cluster)
        .then(arns => {
          return ecs.describeTasks({
            cluster,
            tasks: arns,
          }).promise();
        })
        .then(res => {
          return res.tasks;
        })
        .then(tasks => {
          return tasks.map(task => {
            return {
              taskArn: task.taskArn,
              instance: task.containerInstanceArn,
              status: task.lastStatus,
              defintionArn: task.taskDefinitionArn,
            };
          });
        });
    },


    /**
     * Delete a service
     */
    remove(serviceName, cluster = 'prod') {
      const request = {
        service: serviceName,
        cluster,
      };
      return ecs.deleteService(request).promise();
    },
  };
};
