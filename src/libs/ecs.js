/**
 * ECS helper
 */

const AWS = require('aws-sdk');
const ecs = new AWS.ECS();
const { bindSchema } = require('../helpers/mapper');

function last(arr, back = 1) {
  return arr[arr.length - back];
}

function extractFamily(definition) {
  const [family, revision] = last(definition.split('/')).split(':');
  return {
    family, revision,
  };
}

function extractTask() {
  return {
    key: 'taskDefinition',
    schema: {
      family: {
        key: '.',
        apply: (data) => extractFamily(data).family,
      },
      revision: {
        key: '.',
        apply: (data) => extractFamily(data).revision,
      },
    },
  };
}

const map = bindSchema({
  arn: 'serviceArn',
  name: 'serviceName',
  status: 'status',
  type: 'launchType',
  definition: extractTask(),
  clusterArn: 'clusterArn',
  createdAt: 'createdAt',
  deploymentConfiguration: {
    key: 'deploymentConfiguration',
    schema: {
      maxPercent: 'maximumPercent',
      minHealthyPercent: 'minimumHealthyPercent',
    },
  },
  deployments: ['deployments', {
    createdAt: 'createdAt',
    desired: 'desiredCount',
    id: 'id',
    pending: 'pendingCount',
    running: 'runningCount',
    status: 'status',
    definition: extractTask(),
    updatedAt: 'updatedAt',
  }],
  desired: 'desiredCount',
  pending: 'pendingCount',
  running: 'runningCount',
  events: ['events', (data) => data.slice(0, 10)],
});

const taskMap = bindSchema({
  containerDefinitions: ['containerDefinitions'],
  family: 'family',
  revision: 'revision',
  arn: 'taskDefinitionArn',
  volumes: 'volumes',
  status: 'status',
  cpu: {
    key: 'cpu',
    apply: Number,
  },
  memory: {
    key: 'memory',
    apply: Number,
  },
});

const clusterMap = bindSchema({
  arn: 'clusterArn',
  name: 'clusterName',
  status: 'status',
  totalContainers: 'registeredContainerInstancesCount',
  totalServices: 'activeServicesCount',
  tasks: {
    running: 'runningTasksCount',
    pending: 'pendingTasksCount',
  },
});

const instanceMap = bindSchema({
  connected: 'agentConnected',
  arn: 'containerInstanceArn',
  ec2Id: 'ec2InstanceId',
  status: 'status',
  pending: 'pendingTasksCount',
  running: 'runningTaskCount',
  resources: {
    key: 'registeredResources',
    apply: (data) => {
      return data.reduce((acc, resource) => {
        const key = resource.name.toLowerCase();
        const type = resource.type.toLowerCase();
        const value = resource[`${type}Value`];
        acc[key] = value;
        return acc;
      }, {});
    },
  },
  remaining: {
    key: 'remainingResources',
    apply: (data) => {
      return data.reduce((acc, resource) => {
        const key = resource.name.toLowerCase();
        const type = resource.type.toLowerCase();
        const value = resource[`${type}Value`];
        acc[key] = value;
        return acc;
      }, {});
    },
  },
});


async function getService(clusterName, serviceName, check = true) {
  const response = await ecs.describeServices({
    services: [
      serviceName,
    ],
    cluster: clusterName,
  }).promise();

  const service = response.services[0];

  if (!service && check === true) {
    throw new Error(`Service ${serviceName} not found in cluster ${clusterName}`);
  }

  return map(service) || null;
}


function scale(clusterName, serviceName, desired) {
  if (!desired) {
    throw new Error(`Cannot scale ${serviceName} in ${clusterName} to ${desired} tasks`);
  }
  const request = {
    service: serviceName,
    desiredCount: desired,
    cluster: clusterName,
  };
  return ecs.updateService(request).promise();
}


function registerTask(task) {
  return ecs.registerTaskDefinition(task).promise()
    .then(response => response.taskDefinition.revision);
}


async function getTaskDefinition(definition, check = true) {
  const task = await ecs.describeTaskDefinition({
    taskDefinition: definition,
  }).promise().then(res => res.taskDefinition);

  if (!task && check === true) {
    throw new Error(`Task definition ${definition} not found`);
  }

  return taskMap(task) || null;
}

async function updateImage(definition, container, image, loggroup) {
  const taskDefinition = (await getTaskDefinition(definition))._org;
  const updated = Object.assign({
  }, taskDefinition, {
    containerDefinitions: taskDefinition.containerDefinitions.map((cont) => {
      if (cont.name === container) {
        return Object.assign({}, cont, {
          image,
        });
      }
      return cont;
    }),
    taskDefinitionArn: undefined,
    revision: undefined,
    status: undefined,
    requiresAttributes: undefined,
    compatibilities: undefined,
    logConfiguration: {
      logDriver: 'awslogs',
      options: {
        'awslogs-group': loggroup,
        'awslogs-region': 'us-east-1',
      },
    },
  });
  const updatedTask = JSON.parse(JSON.stringify(updated));
  return registerTask(updatedTask);
}


async function getServiceWithTask(clusterName, serviceName, check = true) {
  const service = await getService(clusterName, serviceName, check);

  if (!service) {
    return service;
  }

  const def = `${service.definition.family}:${service.definition.revision}`;
  const task = await getTaskDefinition(def);

  return Object.assign(service, {
    task,
  });
}


function createService(service) {
  return ecs.createService(service)
    .promise()
    .then(response => response.service);
}


async function getContainerInstances(clusterName) {
  const instanceArns = await ecs.listContainerInstances({
    cluster: clusterName,
  }).promise().then(res => res.containerInstanceArns);
  const instances = await ecs.describeContainerInstances({
    cluster: clusterName,
    containerInstances: instanceArns,
  }).promise().then(r => r.containerInstances);
  return instances.map(instanceMap);
}


async function getCluster(name, check = true) {
  const cluster = await ecs.describeClusters({
    clusters: [name],
  }).promise().then(response => response.clusters[0]);

  if (!cluster && check === true) {
    throw new Error(`Cluster ${name} is not found`);
  }

  if (!cluster) {
    return null;
  }

  const instances = await getContainerInstances(name);

  return Object.assign(clusterMap(cluster), {
    instances,
  });
}


function updateService(service) {
  return ecs.updateService(service)
    .promise()
    .then(response => response.service);
}


async function getDeployment(serviceName, clusterName, revision) {
  const service = await getService(clusterName, serviceName, true);
  const deployment = service.deployments.filter(dep => dep.definition.revision === revision)[0];
  if (!deployment) {
    throw new Error(`No deployment found for ${serviceName} in ${clusterName} with revision ${revision}`);
  }
  return deployment;
}


/**
 * All cluster names
 */
function listClusters() {
  return ecs.listClusters().promise()
    .then((response) => {
      return response.clusterArns.map(arn => last(arn.split('/')));
    });
}


/**
 * All cluster names
 */
function listServices(cluster) {
  return ecs.listServices({ cluster }).promise()
    .then((response) => {
      return response.serviceArns.map(arn => last(arn.split('/')));
    });
}


/**
 * All cluster names
 */
function listTaskArns(cluster) {
  return ecs.listTasks({ cluster }).promise()
    .then((response) => {
      return response.taskArns;
    });
}


/**
 * Get all tasks in cluster
 */
async function getTasksInCluster(cluster) {
  return listTaskArns(cluster)
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
          instanceArn: task.containerInstanceArn,
          status: task.lastStatus,
          defintionArn: task.taskDefinitionArn,
        };
      });
    });
}


/**
 * Delete a service
 */
function remove(serviceName, cluster = 'prod') {
  const request = {
    service: serviceName,
    cluster,
  };
  return ecs.deleteService(request).promise();
}


async function requiredInstances(c, s, more) {
  let service, cluster;
  if (typeof c !== 'string') {
    cluster = c;
  } else {
    cluster = await getCluster(c);
  }

  if (typeof s !== 'string') {
    service = s;
  } else {
    service = await getServiceWithTask(s);
  }

  const extra = more || service.desired;

  if (extra === 0) {
    return 0;
  }

  const canStart = cluster.instances.reduce((start, ins) => {
    const thisHas = Math.min(
      Math.floor(ins.remaining.cpu - 100 / service.task.cpu),
      Math.ceil(ins.remaining.memory - 100 / service.task.memory)
    );
    return start + thisHas;
  }, 0);

  if (canStart > extra) {
    return 0;
  }

  const moreRequired = extra - canStart;
  const moreResources = {
    cpu: service.task.cpu * moreRequired,
    memory: service.task.memory * moreRequired,
  };
  const instance = cluster.instances[0];
  const required = (Math.max(
    Math.ceil(moreResources.cpu / instance.resources.cpu),
    Math.ceil(moreResources.memory / instance.resources.memory),
  )) + 1; // get one more
  return required;
}


async function checkStable(clusterName, serviceName, revision) {
  const service = await getService(clusterName, serviceName);
  const primary = service.deployments.filter(dep => dep.status === 'PRIMARY')[0];

  if (!primary) {
    throw new Error('No primary deployment found');
  }

  const current = primary.definition.revision;
  if (Number(current) !== Number(revision)) {
    return {
      success: false,
      message: `Requried revision ${revision} is not primary yet, current is ${current}`,
    };
  }

  const lastEvent = service.events[0].message;
  if (lastEvent.indexOf('has reached a steady state') < 0) {
    return {
      success: false,
      message: `Current event is - ${lastEvent}`,
    };
  }

  return {
    success: true,
  };
}


module.exports = {
  getService,
  getTaskDefinition,
  getServiceWithTask,
  getCluster,
  scale,
  registerTask,
  createService,
  updateService,
  getDeployment,
  updateImage,
  listClusters,
  listServices,
  checkStable,
  listTaskArns,
  getTasksInCluster,
  remove,
  requiredInstances,
};
