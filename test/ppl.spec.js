
const { codepipeline: ppl } = require('../src/index');

describe('PipeLine', function () {
  it('should get the revsion from executionId', async function () {
    const response = await ppl.getRevision({
      pipelineName: 'ppl-test',
      executionId: '2f52587e-053b-48fc-a1f1-8f29aa57a250',
    });
    console.log(response);
  });
});

