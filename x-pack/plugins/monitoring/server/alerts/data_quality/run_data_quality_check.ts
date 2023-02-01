/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import has from 'lodash/has';
import type { GetUnallowedFieldValuesInputs } from './types';
import { fetchMappings } from './fetch_mappings';
import { getFieldsWithTypes as mappingToFieldTypes } from './field_types';
import { getUnallowedFieldValues } from './get_unallowed';
import { extendFieldsWithAllowedValues } from './extend_fields_with_allowed_values';

interface InvalidFieldsSummary {
  key: string;
  doc_count: number;
}

export type UnallowedFieldCheckResults = Array<[string, InvalidFieldsSummary[]]>;

export const runDataQualityCheck = async (
  es: ElasticsearchClient,
  indexPatterns: string[],
  from: string,
  to: string
) => {
  /*
  TODO check schema types types like that
    isEcsCompliant: type === ecsMetadata[field].type && indexInvalidValues.length === 0
  */

  const mappingRequestResult = await fetchMappings(es, indexPatterns);

  const inputs: GetUnallowedFieldValuesInputs = [];

  for (const indexName in mappingRequestResult) {
    if (has(mappingRequestResult, indexName)) {
      const {
        [indexName]: {
          mappings: { properties },
        },
      } = mappingRequestResult;

      const fieldsTypes = mappingToFieldTypes(properties as Record<string, unknown>);

      const fieldsWithAllowedValuesSpecified = extendFieldsWithAllowedValues(fieldsTypes);

      inputs.push(
        ...(fieldsWithAllowedValuesSpecified.map((field) => ({
          indexName,
          allowedValues: field.allowedValues,
          indexFieldName: field.field,
          from,
          to,
        })) as GetUnallowedFieldValuesInputs)
      );
    }
  }

  const { responses } = await getUnallowedFieldValues(es, inputs);

  const results: UnallowedFieldCheckResults = [];

  (responses as any[]).forEach(({ aggregations: { unallowedValues }, indexName }) => {
    if (!unallowedValues) {
      return;
    }

    const { buckets: values } = unallowedValues;

    if (!values.length) {
      return;
    }

    results.push([indexName, values as InvalidFieldsSummary[]]);
  });

  return results;
};
