/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import deepEqual from 'fast-deep-equal';
import useObservable from 'react-use/lib/useObservable';
import { type BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { AppMountParameters } from '@kbn/core-application-browser';
import {
  EuiBetaBadge,
  EuiButton,
  EuiHeader,
  EuiHeaderLink,
  EuiHeaderLinks,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  useEuiTheme,
} from '@elastic/eui';
import { LogExplorerStateContainer } from '@kbn/log-explorer-plugin/public';
import {
  OBSERVABILITY_ONBOARDING_LOCATOR,
  ObservabilityOnboardingLocatorParams,
} from '@kbn/observability-onboarding-plugin/public';
import { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { css } from '@emotion/react';
import { PluginKibanaContextValue } from '../utils/use_kibana';
import {
  betaBadgeDescription,
  betaBadgeTitle,
  discoverLinkTitle,
  onboardingLinkTitle,
} from '../../common/translations';
import { getRouterLinkProps } from '../utils/get_router_link_props';

interface LogExplorerTopNavMenuProps {
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  services: KibanaReactContextValue<PluginKibanaContextValue>['services'];
  state$: BehaviorSubject<LogExplorerStateContainer>;
  theme$: AppMountParameters['theme$'];
}

export const LogExplorerTopNavMenu = ({
  setHeaderActionMenu,
  services,
  state$,
  theme$,
}: LogExplorerTopNavMenuProps) => {
  const { serverless } = services;

  return Boolean(serverless) ? (
    <ServerlessTopNav services={services} state$={state$} />
  ) : (
    <StatefulTopNav
      services={services}
      setHeaderActionMenu={setHeaderActionMenu}
      state$={state$}
      theme$={theme$}
    />
  );
};

const ServerlessTopNav = ({
  services,
  state$,
}: Pick<LogExplorerTopNavMenuProps, 'services' | 'state$'>) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiHeader data-test-subj="logExplorerHeaderMenu">
      <EuiHeaderSection>
        <EuiHeaderSectionItem>
          <EuiHeaderLinks gutterSize="xs">
            <DiscoverLink services={services} state$={state$} />
          </EuiHeaderLinks>
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
      <EuiHeaderSection
        side="right"
        css={css`
          gap: ${euiTheme.size.m};
        `}
      >
        <EuiHeaderSectionItem>
          <EuiBetaBadge
            size="s"
            iconType="beta"
            label={betaBadgeTitle}
            tooltipContent={betaBadgeDescription}
            alignment="middle"
          />
        </EuiHeaderSectionItem>
        <EuiHeaderSectionItem>
          <OnboardingLink services={services} />
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
    </EuiHeader>
  );
};

const StatefulTopNav = ({
  setHeaderActionMenu,
  services,
  state$,
  theme$,
}: LogExplorerTopNavMenuProps) => {
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    const { chrome, i18n, theme } = services;

    if (chrome) {
      chrome.setBreadcrumbsAppendExtension({
        content: toMountPoint(
          <EuiHeaderSection
            data-test-subj="logExplorerHeaderMenu"
            css={css`
              margin-left: ${euiTheme.size.m};
            `}
          >
            <EuiHeaderSectionItem>
              <EuiBetaBadge
                size="s"
                iconType="beta"
                label={betaBadgeTitle}
                tooltipContent={betaBadgeDescription}
                alignment="middle"
              />
            </EuiHeaderSectionItem>
          </EuiHeaderSection>,
          { theme, i18n }
        ),
      });
    }
  }, [euiTheme, services]);

  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
      <EuiHeaderSection data-test-subj="logExplorerHeaderMenu">
        <EuiHeaderSectionItem>
          <EuiHeaderLinks gutterSize="xs">
            <DiscoverLink services={services} state$={state$} />
            <OnboardingLink services={services} />
          </EuiHeaderLinks>
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
    </HeaderMenuPortal>
  );
};

const DiscoverLink = React.memo(
  ({ services, state$ }: Pick<LogExplorerTopNavMenuProps, 'services' | 'state$'>) => {
    const { appState, logExplorerState } = useObservable<LogExplorerStateContainer>(
      state$.pipe(
        distinctUntilChanged<LogExplorerStateContainer>((prev, curr) => {
          if (!prev.appState || !curr.appState) return false;
          return deepEqual(
            [
              prev.appState.columns,
              prev.appState.filters,
              prev.appState.index,
              prev.appState.query,
            ],
            [curr.appState.columns, curr.appState.filters, curr.appState.index, curr.appState.query]
          );
        })
      ),
      { appState: {}, logExplorerState: {} }
    );

    const discoverLinkParams = {
      columns: appState?.columns,
      filters: appState?.filters,
      query: appState?.query,
      dataViewSpec: logExplorerState?.datasetSelection?.selection.dataset.toDataviewSpec(),
    };

    const discoverUrl = services.discover.locator?.getRedirectUrl(discoverLinkParams);

    const navigateToDiscover = () => {
      services.discover.locator?.navigate(discoverLinkParams);
    };

    const discoverLinkProps = getRouterLinkProps({
      href: discoverUrl,
      onClick: navigateToDiscover,
    });

    return (
      <EuiHeaderLink
        {...discoverLinkProps}
        color="primary"
        iconType="discoverApp"
        data-test-subj="logExplorerDiscoverFallbackLink"
      >
        {discoverLinkTitle}
      </EuiHeaderLink>
    );
  }
);

const OnboardingLink = React.memo(({ services }: Pick<LogExplorerTopNavMenuProps, 'services'>) => {
  const locator = services.share.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );

  const onboardingUrl = locator?.useUrl({});

  const navigateToOnboarding = () => {
    locator?.navigate({});
  };

  const onboardingLinkProps = getRouterLinkProps({
    href: onboardingUrl,
    onClick: navigateToOnboarding,
  });

  return (
    <EuiButton
      {...onboardingLinkProps}
      fill
      size="s"
      iconType="indexOpen"
      data-test-subj="logExplorerOnboardingLink"
    >
      {onboardingLinkTitle}
    </EuiButton>
  );
});
