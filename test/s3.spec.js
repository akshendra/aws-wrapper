
const { expect } = require('chai');
const { s3 } = require('../src');

const bucket = process.env.TEST_BUCKET;
const key = `${Date.now()}_test`;
const data = {
  service: 's3',
  boi: 'good',
};

describe('S3', function () {
  it(`should be a write on s3 => ${bucket}/${key}`, async function () {
    await s3.writeJSON(bucket, key, data);
  });

  it(`should read the data from s3 => ${bucket}/${key}`, async function () {
    const response = await s3.read(bucket, key);
    console.log(response);
    expect(response).to.deep.equal(data);
  });
});
