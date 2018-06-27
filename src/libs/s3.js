
const AWS = require('aws-sdk'); // eslint-disable-line
const unzipper = require('unzipper');
const { safeJSON } = require('@akshendra/misc');

function getClient(key, secret) {
  if (key && secret) {
    return new AWS.S3({
      accessKeyId: key,
      secretAccessKey: secret,
    });
  }
  return new AWS.S3();
}

function unzip(s3Client, bucket, key) {
  return unzipper.Open.s3(s3Client, { Bucket: bucket, Key: key })
    .then(function (d) {
      return d.files[0].buffer().then(data => data.toString());
    });
}

async function meta(bucket, key) {
  const s3 = getClient();
  return s3.getObject({
    Bucket: bucket,
    Key: key,
  }).promise();
}

async function read(bucket, key) {
  const s3 = getClient();
  const { ContentType } = await meta(bucket, key);

  if (ContentType === 'application/zip') {
    const data = await unzip(s3, bucket, key);
    return safeJSON(data);
  }

  const response = await s3.getObject({
    Key: key,
    Bucket: bucket,
  }).promise();
  const body = response.Body;
  if (body.toString) {
    return safeJSON(body.toString());
  }
  return safeJSON(body);
}

module.exports = {
  read,
};
