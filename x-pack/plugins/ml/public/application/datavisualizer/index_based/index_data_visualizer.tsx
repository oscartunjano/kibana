/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  IndexDataVisualizerSpec,
  ResultLink,
  GetAdditionalLinks,
  GetAdditionalLinksParams,
} from '@kbn/data-visualizer-plugin/public';
import { useTimefilter } from '@kbn/ml-date-picker';
import { useMlKibana, useMlLocator, useIsServerless } from '../../contexts/kibana';
import { HelpMenu } from '../../components/help_menu';
import { ML_PAGES } from '../../../../common/constants/locator';
import { isFullLicense } from '../../license';
import { mlNodesAvailable, getMlNodeCount } from '../../ml_nodes_check/check_ml_nodes';
import { checkPermission } from '../../capabilities/check_capabilities';
import { MlPageHeader } from '../../components/page_header';

export const IndexDataVisualizerPage: FC = () => {
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });
  const {
    services: {
      docLinks,
      dataVisualizer,
      data: {
        dataViews: { get: getDataView },
      },
      mlServices: {
        mlApiServices: { recognizeIndex },
      },
    },
  } = useMlKibana();
  const isServerless = useIsServerless();
  const mlLocator = useMlLocator()!;
  const mlFeaturesDisabled = !isFullLicense();
  getMlNodeCount();

  const [IndexDataVisualizer, setIndexDataVisualizer] = useState<IndexDataVisualizerSpec | null>(
    null
  );

  useEffect(() => {
    if (dataVisualizer !== undefined) {
      const { getIndexDataVisualizerComponent } = dataVisualizer;
      getIndexDataVisualizerComponent().then(setIndexDataVisualizer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAsyncMLCards = async ({
    dataViewId,
    dataViewTitle,
    globalState,
  }: GetAdditionalLinksParams): Promise<ResultLink[]> => {
    return [
      {
        id: 'create_ml_ad_job',
        title: i18n.translate('xpack.ml.indexDatavisualizer.actionsPanel.anomalyDetectionTitle', {
          defaultMessage: 'Advanced anomaly detection',
        }),
        description: i18n.translate(
          'xpack.ml.indexDatavisualizer.actionsPanel.anomalyDetectionDescription',
          {
            defaultMessage:
              'Create a job with the full range of options for more advanced use cases.',
          }
        ),
        icon: 'createAdvancedJob',
        type: 'file',
        getUrl: async () => {
          return await mlLocator.getUrl({
            page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_ADVANCED,
            pageState: {
              index: dataViewId,
              globalState,
            },
          });
        },
        canDisplay: async () => {
          try {
            const { timeFieldName } = await getDataView(dataViewId);
            return (
              isFullLicense() &&
              timeFieldName !== undefined &&
              checkPermission('canCreateJob') &&
              mlNodesAvailable()
            );
          } catch (error) {
            return false;
          }
        },
        'data-test-subj': 'dataVisualizerCreateAdvancedJobCard',
      },
      {
        id: 'create_ml_dfa_job',
        title: i18n.translate('xpack.ml.indexDatavisualizer.actionsPanel.dataframeTitle', {
          defaultMessage: 'Data frame analytics',
        }),
        description: i18n.translate(
          'xpack.ml.indexDatavisualizer.actionsPanel.dataframeDescription',
          {
            defaultMessage: 'Create outlier detection, regression, or classification analytics.',
          }
        ),
        icon: 'classificationJob',
        type: 'file',
        getUrl: async () => {
          return await mlLocator.getUrl({
            page: ML_PAGES.DATA_FRAME_ANALYTICS_CREATE_JOB,
            pageState: {
              index: dataViewId,
              globalState,
            },
          });
        },
        canDisplay: async () => {
          return (
            isFullLicense() && checkPermission('canCreateDataFrameAnalytics') && mlNodesAvailable()
          );
        },
        'data-test-subj': 'dataVisualizerCreateDataFrameAnalyticsCard',
      },
    ];
  };

  const getAsyncRecognizedModuleCards = async (params: GetAdditionalLinksParams) => {
    const { dataViewId, dataViewTitle } = params;
    try {
      const modules = await recognizeIndex({ indexPatternTitle: dataViewTitle! });

      return modules?.map(
        (m): ResultLink => ({
          id: m.id,
          title: m.title,
          description: m.description,
          icon: m.logo?.icon ?? '',
          type: 'index',
          getUrl: async () => {
            return await mlLocator.getUrl({
              page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_RECOGNIZER,
              pageState: {
                id: m.id,
                index: dataViewId,
              },
            });
          },
          canDisplay: async () => {
            try {
              const { timeFieldName } = await getDataView(dataViewId);
              return (
                isFullLicense() &&
                timeFieldName !== undefined &&
                checkPermission('canCreateJob') &&
                mlNodesAvailable()
              );
            } catch (error) {
              return false;
            }
          },
          'data-test-subj': m.id,
        })
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Platinum, Enterprise or trial license needed');
      return [];
    }
  };

  const getAdditionalLinks: GetAdditionalLinks = useMemo(
    () => (mlFeaturesDisabled ? [] : [getAsyncRecognizedModuleCards, getAsyncMLCards]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mlLocator, mlFeaturesDisabled]
  );
  return IndexDataVisualizer ? (
    <Fragment>
      {IndexDataVisualizer !== null ? (
        <>
          <MlPageHeader>
            <FormattedMessage
              id="xpack.ml.dataVisualizer.pageHeader"
              defaultMessage="Data Visualizer"
            />
          </MlPageHeader>
          <IndexDataVisualizer
            getAdditionalLinks={getAdditionalLinks}
            isServerless={isServerless}
          />
        </>
      ) : null}
      <HelpMenu docLink={docLinks.links.ml.guide} />
    </Fragment>
  ) : (
    <Fragment />
  );
};
