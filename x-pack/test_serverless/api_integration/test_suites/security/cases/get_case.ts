/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const svlCases = getService('svlCases');

  describe('get_case', () => {
    afterEach(async () => {
      await svlCases.api.deleteCasesByESQuery();
    });

    it('should return a case', async () => {
      const postedCase = await svlCases.api.createCase(
        svlCases.api.getPostCaseRequest('securitySolution')
      );
      const theCase = await svlCases.api.getCase({
        caseId: postedCase.id,
        includeComments: true,
      });

      const data = svlCases.omit.removeServerGeneratedPropertiesFromCase(theCase);
      expect(data).to.eql(svlCases.api.postCaseResp('securitySolution'));
      expect(data.comments?.length).to.eql(0);
    });
  });
};
