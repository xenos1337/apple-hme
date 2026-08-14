import { faFirefoxBrowser } from '@fortawesome/free-brands-svg-icons';
import {
  faBan,
  faCheck,
  faClipboard,
  faCog,
  faExternalLink,
  faInfoCircle,
  faList,
  faPlus,
  faQuestionCircle,
  faRefresh,
  faSearch,
  faSignOut,
  faSpinner,
  faTrashAlt,
  IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  ReactElement,
  ReactNode,
  useEffect,
  useState,
} from 'react';
import {
  ErrorMessage,
  Link,
  LoadingButton,
  Spinner,
  ThemeSwitch,
  TitledComponent,
} from '../../commonComponents';
import ICloudClient, {
  HmeEmail,
  PremiumMailSettings,
} from '../../iCloudClient';
import { MessageType, sendMessageToTab } from '../../messages';
import {
  DEFAULT_STORE,
  getBrowserStorageValue,
  setBrowserStorageValue,
  Store,
} from '../../storage';
import './Popup.css';

import Fuse from 'fuse.js';
import isEqual from 'lodash.isequal';
import browser from 'webextension-polyfill';
import { isFirefox } from '../../browserUtils';
import { useBrowserStorageState } from '../../hooks';
import {
  CONTEXT_MENU_ITEM_ID,
  SIGNED_OUT_CTA_COPY,
} from '../Background/constants';
import { PopupState, STATE_MACHINE_TRANSITIONS } from './stateMachine';
import {
  clearHmeListCache,
  getCachedHmeList,
  refreshHmeListCache,
  updateCachedHmeList,
  updateCachedEmail,
} from '../../hmeCache';

const SignInInstructions = () => {
  const userguideUrl = browser.runtime.getURL('userguide.html');

  return (
    <TitledComponent
      title="Apple Hide My Email"
      subtitle="Sign in to iCloud"
      hideHeader
    >
      <div className="space-y-4">
        <div className="text-sm space-y-2">
          <p>
            To use this extension, sign in to your iCloud account on{' '}
            <Link
              href="https://icloud.com"
              className="font-semibold text-primary-light dark:text-blue-400"
              aria-label="Go to iCloud.com"
            >
              icloud.com
            </Link>
            .
          </p>
          <p>
            Complete the full sign-in process, including{' '}
            <span className="font-semibold">two-factor authentication</span> and{' '}
            <span className="font-semibold">Trust This Browser</span>.
          </p>
        </div>
        <div
          className="flex p-3 text-sm border border-line-light dark:border-line-dark rounded-xl bg-surface-light dark:bg-surface-dark shadow-sm dark:shadow-none"
          role="alert"
        >
          <FontAwesomeIcon icon={faInfoCircle} className="mr-2 mt-1" />
          <span className="sr-only">Info</span>
          <div>
            <span className="font-semibold">Pro-tip:</span> Tick the{' '}
            <span className="font-semibold">Keep me signed in</span> box
          </div>
        </div>
        {isFirefox && (
          <div
            className="flex p-3 text-sm border border-line-light dark:border-line-dark rounded-xl bg-surface-light dark:bg-surface-dark shadow-sm dark:shadow-none"
            role="alert"
          >
            <FontAwesomeIcon icon={faFirefoxBrowser} className="mr-2 mt-1" />
            <span className="sr-only">Info</span>
            <div>
              If using{' '}
              <Link
                href="https://support.mozilla.org/en-US/kb/containers"
                className="font-semibold text-primary-light dark:text-blue-400"
                aria-label="Firefox Multi-Account Containers docs"
              >
                Firefox Containers
              </Link>
              , sign in to iCloud from a tab outside of a container.
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={userguideUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full min-h-[42px] justify-center text-white bg-action-light hover:bg-actionHover-light dark:text-text-dark dark:bg-action-dark dark:hover:bg-actionHover-dark focus:ring-2 focus:outline-none focus:ring-primary-light/30 dark:focus:ring-white/20 font-semibold rounded-lg px-5 py-2.5 text-center inline-flex items-center shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
            aria-label="Help"
          >
            <FontAwesomeIcon icon={faQuestionCircle} className="mr-1" />
            Help
          </a>
          <a
            href="https://icloud.com"
            target="_blank"
            rel="noreferrer"
            className="w-full min-h-[42px] justify-center text-white bg-action-light hover:bg-actionHover-light dark:text-text-dark dark:bg-action-dark dark:hover:bg-actionHover-dark focus:ring-2 focus:outline-none focus:ring-primary-light/30 dark:focus:ring-white/20 font-semibold rounded-lg px-5 py-2.5 text-center inline-flex items-center shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
            aria-label="Go to iCloud.com"
          >
            <FontAwesomeIcon icon={faExternalLink} className="mr-1" /> Go to
            icloud.com
          </a>
        </div>
      </div>
    </TitledComponent>
  );
};

const ReservationResult = (props: { hme: HmeEmail }) => {
  const onCopyToClipboardClick = async () => {
    await navigator.clipboard.writeText(props.hme.hme);
  };

  const onAutofillClick = async () => {
    await sendMessageToTab(MessageType.Autofill, {
      data: props.hme.hme,
      inputElementXPath: props.hme.inputElementXPath,
    });
  };

  const btnClassName =
    'min-h-[42px] focus:outline-none text-white bg-action-light hover:bg-actionHover-light dark:text-text-dark dark:bg-action-dark dark:hover:bg-actionHover-dark focus:ring-2 focus:ring-primary-light/30 dark:focus:ring-white/20 font-semibold rounded-lg text-sm px-5 py-2.5 block w-full shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]';

  return (
    <div
      className="space-y-2 p-3 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/70 rounded-xl"
      role="alert"
    >
      <p>
        <strong>{props.hme.hme}</strong> has successfully been reserved!
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={btnClassName}
          onClick={onCopyToClipboardClick}
        >
          <FontAwesomeIcon icon={faClipboard} className="mr-1" />
          Copy to clipboard
        </button>
        <button
          type="button"
          className={btnClassName}
          onClick={onAutofillClick}
        >
          <FontAwesomeIcon icon={faCheck} className="mr-1" />
          Autofill
        </button>
      </div>
    </div>
  );
};

const FooterButton = (
  props: { label: string; icon: IconDefinition } & DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >
) => {
  return (
    <button
      className="min-h-[40px] px-2 inline-flex items-center text-primary-light dark:text-blue-400 hover:text-actionHover-light dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-primary-light/30 dark:focus:ring-white/20 rounded-md"
      {...props}
    >
      <FontAwesomeIcon icon={props.icon} className="mr-1" />
      {props.label}
    </button>
  );
};

async function performDeauthSideEffects(): Promise<void> {
  await browser.contextMenus
    .update(CONTEXT_MENU_ITEM_ID, {
      title: SIGNED_OUT_CTA_COPY,
      enabled: false,
    })
    .catch(console.debug);
}

const SignOutButton = (props: {
  callback: () => void;
  client: ICloudClient;
}) => {
  return (
    <FooterButton
      className="w-full min-h-[48px] justify-start rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500/30 dark:text-red-300 dark:hover:bg-red-950/30 dark:hover:text-red-200 dark:focus:ring-red-400/30"
      onClick={async () => {
        await props.client.signOut();
        setBrowserStorageValue('clientState', undefined);
        clearHmeListCache().catch(console.debug);
        performDeauthSideEffects();
        props.callback();
      }}
      label="Sign out"
      icon={faSignOut}
    />
  );
};

const HmeGenerator = (props: {
  callback: (action: 'MANAGE' | 'SIGN_OUT') => void;
  signOutCallback: () => void;
  client: ICloudClient;
}) => {
  const [hmeEmail, setHmeEmail] = useState<string>();
  const [hmeError, setHmeError] = useState<string>();

  const [reservedHme, setReservedHme] = useState<HmeEmail>();
  const [reserveError, setReserveError] = useState<string>();

  const [isEmailRefreshSubmitting, setIsEmailRefreshSubmitting] =
    useState(false);
  const [isUseSubmitting, setIsUseSubmitting] = useState(false);
  const [tabHost, setTabHost] = useState('');
  const [fwdToEmail, setFwdToEmail] = useState<string>();

  const [note, setNote] = useState<string>();
  const [label, setLabel] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    const fetchHmeList = async () => {
      setHmeError(undefined);
      const cached = await getCachedHmeList(props.client);
      if (cached && isMounted) {
        setFwdToEmail(cached.selectedForwardTo);
      }

      try {
        const result = await refreshHmeListCache(props.client);
        if (isMounted) setFwdToEmail(result.selectedForwardTo);
      } catch (e) {
        // Keep displaying cached data when the background refresh fails.
        if (!cached && isMounted) setHmeError(e.toString());
      }
    };

    fetchHmeList().catch(console.error);
    return () => {
      isMounted = false;
    };
  }, [props.client]);

  useEffect(() => {
    const fetchHmeEmail = async () => {
      setHmeError(undefined);
      setIsEmailRefreshSubmitting(true);
      try {
        const pms = new PremiumMailSettings(props.client);
        setHmeEmail(await pms.generateHme());
      } catch (e) {
        setHmeError(e.toString());
      } finally {
        setIsEmailRefreshSubmitting(false);
      }
    };

    fetchHmeEmail();
  }, [props.client]);

  useEffect(() => {
    const getTabHost = async () => {
      const [tab] = await browser.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      const tabUrl = tab?.url;
      if (tabUrl !== undefined) {
        const { hostname } = new URL(tabUrl);
        setTabHost(hostname);
        setLabel(hostname);
      }
    };

    getTabHost().catch(console.error);
  }, []);

  const onEmailRefreshClick = async () => {
    setIsEmailRefreshSubmitting(true);
    setReservedHme(undefined);
    setHmeError(undefined);
    setReserveError(undefined);
    try {
      const pms = new PremiumMailSettings(props.client);
      setHmeEmail(await pms.generateHme());
    } catch (e) {
      setHmeError(e.toString());
    }
    setIsEmailRefreshSubmitting(false);
  };

  const onUseSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsUseSubmitting(true);
    setReservedHme(undefined);
    setReserveError(undefined);

    if (hmeEmail !== undefined) {
      try {
        const pms = new PremiumMailSettings(props.client);
        const reservedHme = await pms.reserveHme(
          hmeEmail,
          label || tabHost,
          note || undefined
        );
        setReservedHme(reservedHme);
        await updateCachedHmeList(props.client, (result) => ({
          ...result,
          hmeEmails: [reservedHme, ...result.hmeEmails],
        }));
        setLabel(undefined);
        setNote(undefined);
      } catch (e) {
        setReserveError(e.toString());
      }
    }
    setIsUseSubmitting(false);
  };

  const isReservationFormDisabled =
    !hmeEmail || isEmailRefreshSubmitting || hmeEmail === reservedHme?.hme;

  const reservationFormInputClassName =
    'appearance-none rounded-lg relative block w-full min-h-[42px] px-3 py-2 border border-line-light dark:border-line-dark placeholder-muted-light dark:placeholder-zinc-600 text-text-light dark:text-text-dark bg-control-light dark:bg-control-dark focus:outline-none focus:border-primary-light dark:focus:border-zinc-500 focus:ring-2 focus:ring-primary-light/10 dark:focus:ring-white/10 focus:z-10 sm:text-sm';

  return (
    <div className="flex w-full items-center justify-center py-8">
      <TitledComponent
        title="Apple Hide My Email"
        subtitle={`Create an address for '${tabHost}'`}
        hideHeader
      >
        <div className="text-center space-y-1">
          <div>
            <span className="inline-flex min-h-[40px] items-center text-2xl font-semibold tracking-tight tabular-nums">
              <button
                className="mr-2 min-h-[40px] min-w-[40px] shrink-0 rounded-lg text-primary-light dark:text-muted-dark hover:bg-elevated-light dark:hover:bg-elevated-dark hover:text-actionHover-light dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-light/30 dark:focus:ring-white/20"
                onClick={onEmailRefreshClick}
                disabled={isEmailRefreshSubmitting}
                aria-label="Generate another address"
              >
                <FontAwesomeIcon
                  className="align-text-bottom"
                  icon={faRefresh}
                  spin={isEmailRefreshSubmitting}
                />
              </button>
              <span
                className="inline-flex min-w-[220px] items-center justify-start gap-2"
                aria-live="polite"
                aria-busy={isEmailRefreshSubmitting}
              >
                {isEmailRefreshSubmitting ? (
                  <>
                    <FontAwesomeIcon
                      icon={faSpinner}
                      spin
                      className="text-primary-light dark:text-blue-400"
                      aria-hidden="true"
                    />
                    <span className="sr-only">Generating an address</span>
                  </>
                ) : (
                  hmeEmail || (
                    <span className="text-base text-muted-light dark:text-muted-dark">
                      Address unavailable
                    </span>
                  )
                )}
              </span>
            </span>
            {fwdToEmail !== undefined && (
              <p className="mt-1 text-sm text-muted-light dark:text-muted-dark">
                Forward to: {fwdToEmail}
              </p>
            )}
          </div>
          {hmeError && <ErrorMessage>{hmeError}</ErrorMessage>}
        </div>
        <div className="space-y-3">
          <form
            className={`space-y-3 ${
              isReservationFormDisabled ? 'opacity-70' : ''
            }`}
            onSubmit={onUseSubmit}
          >
            <div>
              <label htmlFor="label" className="block font-medium">
                Label
              </label>
              <input
                id="label"
                placeholder={tabHost}
                required
                value={label || ''}
                onChange={(e) => setLabel(e.target.value)}
                className={reservationFormInputClassName}
                disabled={isReservationFormDisabled}
              />
            </div>
            <div>
              <label htmlFor="note" className="block font-medium">
                Note
              </label>
              <textarea
                id="note"
                rows={1}
                className={reservationFormInputClassName}
                placeholder="Make a note (optional)"
                value={note || ''}
                onChange={(e) => setNote(e.target.value)}
                disabled={isReservationFormDisabled}
              ></textarea>
            </div>
            <LoadingButton
              loading={isUseSubmitting}
              disabled={isReservationFormDisabled}
            >
              Use
            </LoadingButton>
            {reserveError && <ErrorMessage>{reserveError}</ErrorMessage>}
          </form>
          {reservedHme && <ReservationResult hme={reservedHme} />}
        </div>
      </TitledComponent>
    </div>
  );
};

const HmeDetails = (props: {
  hme: HmeEmail;
  client: ICloudClient;
  activationCallback: () => void;
  deletionCallback: () => void;
}) => {
  const [isActivateSubmitting, setIsActivateSubmitting] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [storedXPath, setStoredXPath] = useState<string>();
  const [error, setError] = useState<string>();

  // Reset the error and the loaders when a new HME prop is passed to this component
  useEffect(() => {
    setError(undefined);
    setIsActivateSubmitting(false);
    setIsDeleteSubmitting(false);
    getBrowserStorageValue(`hme_xpath_${props.hme.hme}`).then(setStoredXPath);
  }, [props.hme]);

  const onActivationClick = async () => {
    setIsActivateSubmitting(true);
    try {
      const pms = new PremiumMailSettings(props.client);
      if (props.hme.isActive) {
        await pms.deactivateHme(props.hme.anonymousId);
      } else {
        await pms.reactivateHme(props.hme.anonymousId);
      }
      props.activationCallback();
    } catch (e) {
      setError(e.toString());
    } finally {
      setIsActivateSubmitting(false);
    }
  };

  const onDeletionClick = async () => {
    setIsDeleteSubmitting(true);
    try {
      const pms = new PremiumMailSettings(props.client);
      await pms.deleteHme(props.hme.anonymousId);
      props.deletionCallback();
    } catch (e) {
      setError(e.toString());
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  const onCopyClick = async () => {
    await navigator.clipboard.writeText(props.hme.hme);
  };

  const onAutofillClick = async () => {
    await sendMessageToTab(MessageType.Autofill, {
      data: props.hme.hme,
      inputElementXPath: storedXPath,
    });
  };

  const btnClassName =
    'w-full min-h-[42px] justify-center text-white dark:text-text-dark focus:ring-2 focus:outline-none font-semibold rounded-lg px-2 py-3 text-center inline-flex items-center';
  const labelClassName = 'font-bold text-text-light dark:text-text-dark';
  const valueClassName =
    'text-muted-light dark:text-muted-dark truncate tabular-nums';

  return (
    <div className="space-y-2">
      <div>
        <p className={labelClassName}>Email</p>
        <p title={props.hme.hme} className={valueClassName}>
          {props.hme.isActive || (
            <FontAwesomeIcon
              title="Deactivated"
              icon={faBan}
              className="text-red-500 dark:text-red-400 mr-1"
            />
          )}
          {props.hme.hme}
        </p>
      </div>
      <div>
        <p className={labelClassName}>Label</p>
        <p title={props.hme.label} className={valueClassName}>
          {props.hme.label}
        </p>
      </div>
      <div>
        <p className={labelClassName}>Forward To</p>
        <p title={props.hme.forwardToEmail} className={valueClassName}>
          {props.hme.forwardToEmail}
        </p>
      </div>
      <div>
        <p className={labelClassName}>Created at</p>
        <p className={valueClassName}>
          {new Date(props.hme.createTimestamp).toLocaleString()}
        </p>
      </div>
      {props.hme.note && (
        <div>
          <p className={labelClassName}>Note</p>
          <p title={props.hme.note} className={valueClassName}>
            {props.hme.note}
          </p>
        </div>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <div className="grid grid-cols-3 gap-2">
        <button
          title="Copy"
          className={`${btnClassName} bg-action-light hover:bg-actionHover-light dark:bg-action-dark dark:hover:bg-actionHover-dark focus:ring-primary-light/30 dark:focus:ring-white/20 shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]`}
          onClick={onCopyClick}
        >
          <FontAwesomeIcon icon={faClipboard} />
        </button>
        <button
          title="Autofill"
          className={`${btnClassName} bg-action-light hover:bg-actionHover-light dark:bg-action-dark dark:hover:bg-actionHover-dark focus:ring-primary-light/30 dark:focus:ring-white/20 shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]`}
          onClick={onAutofillClick}
        >
          <FontAwesomeIcon icon={faCheck} />
        </button>
        <LoadingButton
          title={props.hme.isActive ? 'Deactivate' : 'Reactivate'}
          className={`${btnClassName} ${
            props.hme.isActive
              ? 'bg-red-600 hover:bg-red-700 dark:bg-red-950 dark:hover:bg-red-900 focus:ring-red-500/30 dark:focus:ring-red-500/20'
              : 'bg-action-light hover:bg-actionHover-light dark:bg-action-dark dark:hover:bg-actionHover-dark focus:ring-primary-light/30 dark:focus:ring-white/20'
          }`}
          onClick={onActivationClick}
          loading={isActivateSubmitting}
        >
          <FontAwesomeIcon icon={props.hme.isActive ? faBan : faRefresh} />
        </LoadingButton>
        {!props.hme.isActive && (
          <LoadingButton
            title="Delete"
            className={`${btnClassName} bg-red-600 hover:bg-red-700 dark:bg-red-950 dark:hover:bg-red-900 focus:ring-red-500/30 dark:focus:ring-red-500/20 col-span-3`}
            onClick={onDeletionClick}
            loading={isDeleteSubmitting}
          >
            <FontAwesomeIcon icon={faTrashAlt} className="mr-1" /> Delete
          </LoadingButton>
        )}
      </div>
    </div>
  );
};

const searchHmeEmails = (
  searchPrompt: string,
  hmeEmails: HmeEmail[]
): HmeEmail[] | undefined => {
  if (!searchPrompt) {
    return undefined;
  }

  const searchEngine = new Fuse(hmeEmails, {
    keys: ['label', 'hme'],
    threshold: 0.4,
  });
  const searchResults = searchEngine.search(searchPrompt);
  return searchResults.map((result) => result.item);
};

const HmeListItem = (props: {
  hme: HmeEmail;
  client: ICloudClient;
  isExpanded: boolean;
  onToggleSettings: () => void;
  activationCallback: () => void;
  deletionCallback: () => void;
}) => {
  const [storedXPath, setStoredXPath] = useState<string>();
  const [isCopied, setIsCopied] = useState(false);
  const [isAutofillSubmitting, setIsAutofillSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsCopied(false);
    setStoredXPath(props.hme.inputElementXPath);
    getBrowserStorageValue(`hme_xpath_${props.hme.hme}`)
      .then((value) => {
        if (isMounted && typeof value === 'string') setStoredXPath(value);
      })
      .catch(console.debug);

    return () => {
      isMounted = false;
    };
  }, [props.hme.hme, props.hme.inputElementXPath]);

  const onCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(props.hme.hme);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1600);
    } catch (e) {
      console.debug(e);
    }
  };

  const onAutofillClick = async () => {
    setIsAutofillSubmitting(true);
    try {
      await sendMessageToTab(MessageType.Autofill, {
        data: props.hme.hme,
        inputElementXPath: storedXPath,
      });
    } catch (e) {
      console.debug(e);
    } finally {
      setIsAutofillSubmitting(false);
    }
  };

  const iconButtonClassName =
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-light dark:text-muted-dark hover:bg-surface-light dark:hover:bg-surface-dark hover:text-primary-light dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-light/30 dark:focus:ring-white/20';
  const labelInitial = props.hme.label.trim().charAt(0).toUpperCase() || '@';

  return (
    <article
      className={`overflow-hidden rounded-xl border border-line-light dark:border-line-dark bg-elevated-light dark:bg-elevated-dark transition-colors ${
        props.isExpanded
          ? 'shadow-sm dark:shadow-[0_0_0_1px_rgba(96,165,250,0.18)]'
          : ''
      }`}
    >
      <div className="flex min-h-[68px] items-center gap-2 px-3 py-2 transition-colors hover:bg-surface-light dark:hover:bg-surface-dark">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-light/30 dark:focus:ring-white/20"
          onClick={props.onToggleSettings}
          aria-expanded={props.isExpanded}
          aria-label={`View settings for ${props.hme.label}`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
              props.hme.isActive
                ? 'bg-blue-100 text-blue-700 dark:bg-[#172554] dark:text-blue-300'
                : 'bg-red-100 text-red-700 dark:bg-[#450a0a] dark:text-red-300'
            }`}
          >
            {props.hme.isActive ? (
              labelInitial
            ) : (
              <FontAwesomeIcon icon={faBan} title="Deactivated" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold text-text-light dark:text-text-dark">
                {props.hme.label}
              </span>
              {!props.hme.isActive && (
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-red-600 dark:text-red-300">
                  Paused
                </span>
              )}
            </span>
            <span className="block truncate text-xs text-muted-light dark:text-muted-dark">
              {props.hme.hme}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className={iconButtonClassName}
            onClick={onCopyClick}
            title={isCopied ? 'Copied' : 'Copy address'}
            aria-label={isCopied ? 'Copied' : 'Copy address'}
          >
            <FontAwesomeIcon icon={isCopied ? faCheck : faClipboard} />
          </button>
          <button
            type="button"
            className={iconButtonClassName}
            onClick={onAutofillClick}
            disabled={isAutofillSubmitting}
            title="Autofill address"
            aria-label="Autofill address"
          >
            <FontAwesomeIcon icon={faCheck} spin={isAutofillSubmitting} />
          </button>
          <button
            type="button"
            className={iconButtonClassName}
            onClick={props.onToggleSettings}
            aria-expanded={props.isExpanded}
            aria-label={
              props.isExpanded ? 'Close address settings' : 'Address settings'
            }
            title={props.isExpanded ? 'Close settings' : 'Address settings'}
          >
            <FontAwesomeIcon icon={faCog} />
          </button>
        </div>
      </div>
      {props.isExpanded && (
        <div className="border-t border-line-light dark:border-line-dark bg-surface-light dark:bg-surface-dark p-3">
          <HmeDetails
            client={props.client}
            hme={props.hme}
            activationCallback={props.activationCallback}
            deletionCallback={props.deletionCallback}
          />
        </div>
      )}
    </article>
  );
};

const HmeManager = (props: {
  callback: (action: 'GENERATE' | 'SIGN_OUT') => void;
  signOutCallback: () => void;
  client: ICloudClient;
}) => {
  const [fetchedHmeEmails, setFetchedHmeEmails] = useState<HmeEmail[]>();
  const [hmeEmailsError, setHmeEmailsError] = useState<string>();
  const [isFetching, setIsFetching] = useState(true);
  const [searchPrompt, setSearchPrompt] = useState<string>();
  const [expandedHmeId, setExpandedHmeId] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    const fetchHmeList = async () => {
      setHmeEmailsError(undefined);
      const cached = await getCachedHmeList(props.client);
      if (cached && isMounted) {
        setFetchedHmeEmails(
          [...cached.hmeEmails].sort(
            (a, b) => b.createTimestamp - a.createTimestamp
          )
        );
        setIsFetching(false);
      }

      try {
        const result = await refreshHmeListCache(props.client);
        if (isMounted) {
          setFetchedHmeEmails(
            [...result.hmeEmails].sort(
              (a, b) => b.createTimestamp - a.createTimestamp
            )
          );
        }
      } catch (e) {
        if (!cached && isMounted) setHmeEmailsError(e.toString());
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    fetchHmeList().catch(console.error);
    return () => {
      isMounted = false;
    };
  }, [props.client]);

  const activationCallbackFactory = (hmeEmail: HmeEmail) => () => {
    const newHmeEmail = { ...hmeEmail, isActive: !hmeEmail.isActive };
    setFetchedHmeEmails((prevFetchedHmeEmails) =>
      prevFetchedHmeEmails?.map((item) =>
        isEqual(item, hmeEmail) ? newHmeEmail : item
      )
    );
    updateCachedHmeList(
      props.client,
      updateCachedEmail(hmeEmail, () => newHmeEmail)
    ).catch(console.debug);
  };

  const deletionCallbackFactory = (hmeEmail: HmeEmail) => () => {
    setExpandedHmeId((currentId) =>
      currentId === hmeEmail.anonymousId ? undefined : currentId
    );
    setFetchedHmeEmails((prevFetchedHmeEmails) =>
      prevFetchedHmeEmails?.filter((item) => !isEqual(item, hmeEmail))
    );
    updateCachedHmeList(props.client, (result) => ({
      ...result,
      hmeEmails: result.hmeEmails.filter(
        (item) => item.anonymousId !== hmeEmail.anonymousId
      ),
    })).catch(console.debug);
  };

  const hmeListGrid = (fetchedHmeEmails: HmeEmail[]) => {
    const hmeEmails =
      searchHmeEmails(searchPrompt || '', fetchedHmeEmails) || fetchedHmeEmails;

    const searchBox = (
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <FontAwesomeIcon className="text-blue-500" icon={faSearch} />
        </div>
        <input
          type="search"
          value={searchPrompt || ''}
          className="min-h-[42px] w-full rounded-xl border border-line-light bg-control-light pl-10 pr-3 text-sm text-text-light placeholder-muted-light focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/10 dark:border-line-dark dark:bg-control-dark dark:text-text-dark dark:placeholder-zinc-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
          placeholder="Search addresses"
          aria-label="Search through your HideMyEmail addresses"
          onChange={(e) => {
            setSearchPrompt(e.target.value);
          }}
        />
      </div>
    );

    const noSearchResult = (
      <div className="rounded-xl border border-dashed border-line-light p-6 text-center text-sm text-muted-light dark:border-line-dark dark:text-muted-dark">
        No addresses match &quot;{searchPrompt}&quot;
      </div>
    );

    return (
      <div
        className="min-w-0 overflow-hidden"
        style={{ height: 409 }}
      >
        <div className="h-full min-w-0 overflow-y-auto">
          <div className="sticky top-0 z-10 border-b border-line-light bg-background-light p-3 dark:border-line-dark dark:bg-background-dark">
            {searchBox}
          </div>
          <div className="space-y-2 px-3 pb-3">
            {hmeEmails.length === 0 && searchPrompt
              ? noSearchResult
              : hmeEmails.map((hme) => (
                  <HmeListItem
                    key={hme.anonymousId}
                    client={props.client}
                    hme={hme}
                    isExpanded={expandedHmeId === hme.anonymousId}
                    onToggleSettings={() =>
                      setExpandedHmeId((currentId) =>
                        currentId === hme.anonymousId
                          ? undefined
                          : hme.anonymousId
                      )
                    }
                    activationCallback={activationCallbackFactory(hme)}
                    deletionCallback={deletionCallbackFactory(hme)}
                  />
                ))}
          </div>
        </div>
      </div>
    );
  };

  const emptyState = (
    <div className="p-6 text-center text-lg text-muted-light dark:text-muted-dark rounded-xl bg-surface-light dark:bg-surface-dark border border-line-light dark:border-line-dark">
      There are no emails to list
    </div>
  );

  const resolveMainChildComponent = (): ReactNode => {
    if (isFetching) {
      return <Spinner />;
    }

    if (hmeEmailsError) {
      return <ErrorMessage>{hmeEmailsError}</ErrorMessage>;
    }

    if (!fetchedHmeEmails || fetchedHmeEmails.length === 0) {
      return emptyState;
    }

    return hmeListGrid(fetchedHmeEmails);
  };

  return (
    <TitledComponent
      title="Apple Hide My Email"
      subtitle="Manage your HideMyEmail addresses"
      hideHeader
    >
      {resolveMainChildComponent()}
    </TitledComponent>
  );
};

const constructClient = (clientState: Store['clientState']): ICloudClient => {
  if (clientState === undefined) {
    throw new Error('Cannot construct client when client state is undefined');
  }

  return new ICloudClient(
    clientState.setupUrl,
    clientState.webservices,
    clientState
  );
};

const transitionToNextStateElement = (
  state: PopupState,
  setState: (state: PopupState) => void,
  clientState: Store['clientState']
): ReactElement => {
  switch (state) {
    case PopupState.SignedOut: {
      return <SignInInstructions />;
    }
    case PopupState.Authenticated: {
      const handleAuthenticatedAction = (action: 'MANAGE' | 'SIGN_OUT') => {
        setState(STATE_MACHINE_TRANSITIONS[state][action]);
      };
      const handleSignOut = () => handleAuthenticatedAction('SIGN_OUT');
      return (
        <HmeGenerator
          callback={handleAuthenticatedAction}
          signOutCallback={handleSignOut}
          client={constructClient(clientState)}
        />
      );
    }
    case PopupState.AuthenticatedAndManaging: {
      const handleManagingAction = (action: 'GENERATE' | 'SIGN_OUT') => {
        setState(STATE_MACHINE_TRANSITIONS[state][action]);
      };
      const handleSignOut = () => handleManagingAction('SIGN_OUT');
      return (
        <HmeManager
          callback={handleManagingAction}
          signOutCallback={handleSignOut}
          client={constructClient(clientState)}
        />
      );
    }
    default: {
      const exhaustivenessCheck: never = state;
      throw new Error(`Unhandled PopupState case: ${exhaustivenessCheck}`);
    }
  }
};

const Disclaimer = () => {
  return (
    <div className="text-text-light dark:text-text-dark text-sm space-y-2">
      <p>
        Independent open-source software by{' '}
        <Link href="https://axvant.com/">Axvant UG (haftungsbeschränkt)</Link>.
        Not affiliated with, endorsed by, or sponsored by Apple Inc.
      </p>
      <p>Provided as-is, without warranty. Use at your own risk.</p>
      <p>
        <Link href="https://github.com/xenos1337/apple-hme">Source</Link>
        {' · '}
        <Link href="https://axvant.com/imprint">Imprint</Link>
        {' · '}
        <Link href="https://github.com/xenos1337/apple-hme/blob/main/LICENSE">
          MIT license
        </Link>
      </p>
    </div>
  );
};

const SELECT_FWD_TO_SIGNED_OUT_CTA_COPY =
  'To select a new Forward-To address, you first need to sign-in by following the instructions on the extension pop-up.';

const SelectFwdToForm = () => {
  const [selectedFwdToEmail, setSelectedFwdToEmail] = useState<string>();
  const [fwdToEmails, setFwdToEmails] = useState<string[]>();
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listHmeError, setListHmeError] = useState<string>();
  const [updateFwdToError, setUpdateFwdToError] = useState<string>();
  const [clientState, setClientState, isClientStateLoading] =
    useBrowserStorageState('clientState', undefined);

  useEffect(() => {
    let isMounted = true;
    const fetchHmeList = async () => {
      setListHmeError(undefined);
      setIsFetching(true);

      if (clientState?.setupUrl === undefined) {
        setListHmeError(SELECT_FWD_TO_SIGNED_OUT_CTA_COPY);
        setIsFetching(false);
        return;
      }

      const client = new ICloudClient(
        clientState.setupUrl,
        clientState.webservices,
        clientState
      );
      const cached = await getCachedHmeList(client);
      if (cached && isMounted) {
        setFwdToEmails(cached.forwardToEmails);
        setSelectedFwdToEmail(cached.selectedForwardTo);
        setIsFetching(false);
      }
      const isClientAuthenticated = await client.isAuthenticated();
      if (!isClientAuthenticated) {
        if (!cached && isMounted) {
          setListHmeError(SELECT_FWD_TO_SIGNED_OUT_CTA_COPY);
          setIsFetching(false);
        }
        return;
      }

      const nextClientState = {
        ...clientState,
        webservices: client.webservices,
        ...client.context(),
      };
      if (!isEqual(clientState, nextClientState)) {
        setClientState(nextClientState);
      }

      try {
        const result = await refreshHmeListCache(client);
        if (isMounted) {
          setFwdToEmails((prevState) =>
            isEqual(prevState, result.forwardToEmails)
              ? prevState
              : result.forwardToEmails
          );
          setSelectedFwdToEmail(result.selectedForwardTo);
        }
      } catch (e) {
        if (!cached && isMounted) setListHmeError(e.toString());
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    !isClientStateLoading && fetchHmeList().catch(console.error);
    return () => {
      isMounted = false;
    };
  }, [clientState, isClientStateLoading, setClientState]);

  const onSelectedFwdToSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setIsSubmitting(true);
    if (clientState === undefined) {
      console.error('onSelectedFwdToSubmit: clientState is undefined');
      setUpdateFwdToError(SELECT_FWD_TO_SIGNED_OUT_CTA_COPY);
    } else if (selectedFwdToEmail) {
      try {
        const client = new ICloudClient(
          clientState.setupUrl,
          clientState.webservices,
          clientState
        );
        const pms = new PremiumMailSettings(client);
        await pms.updateForwardToHme(selectedFwdToEmail);
        await updateCachedHmeList(client, (result) => ({
          ...result,
          selectedForwardTo: selectedFwdToEmail,
        }));
      } catch (e) {
        setUpdateFwdToError(e.toString());
      }
    } else {
      setUpdateFwdToError('No Forward To address has been selected.');
    }
    setIsSubmitting(false);
  };

  if (isFetching) {
    return <Spinner />;
  }

  if (listHmeError !== undefined) {
    return <ErrorMessage>{listHmeError}</ErrorMessage>;
  }

  return (
    <form className="space-y-2" onSubmit={onSelectedFwdToSubmit}>
      {fwdToEmails?.map((fwdToEmail, key) => (
        <label
          htmlFor={`radio-${key}`}
          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
            fwdToEmail === selectedFwdToEmail
              ? 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100'
              : 'border-transparent hover:bg-elevated-light dark:hover:bg-elevated-dark'
          }`}
          key={fwdToEmail}
        >
          <input
            onChange={() => setSelectedFwdToEmail(fwdToEmail)}
            checked={fwdToEmail === selectedFwdToEmail}
            id={`radio-${key}`}
            type="radio"
            disabled={isSubmitting}
            name="forward-to-email"
            className="h-4 w-4 cursor-pointer accent-blue-600 focus:ring-primary-light/30 dark:accent-blue-400 dark:focus:ring-white/20"
          />
          <span className="min-w-0 truncate text-text-light dark:text-text-dark">
            {fwdToEmail}
          </span>
        </label>
      ))}
      <LoadingButton
        loading={isSubmitting}
        className="mt-2 min-h-[40px] rounded-lg px-4 py-2 text-sm"
      >
        Save changes
      </LoadingButton>
      {updateFwdToError && <ErrorMessage>{updateFwdToError}</ErrorMessage>}
    </form>
  );
};

const AutofillForm = () => {
  const [options, setOptions, isOptionsLoading] = useBrowserStorageState(
    'iCloudHmeOptions',
    DEFAULT_STORE.iCloudHmeOptions
  );

  return (
    <form>
      <label
        htmlFor="checkbox-contextMenu"
        className="flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-elevated-light dark:hover:bg-elevated-dark"
      >
        <input
          onChange={() =>
            setOptions({
              ...options,
              autofill: {
                contextMenu: !options.autofill.contextMenu,
              },
            })
          }
          checked={options.autofill.contextMenu}
          id="checkbox-contextMenu"
          type="checkbox"
          name="checkbox-contextMenu"
          disabled={isOptionsLoading}
          className="mt-0.5 h-5 w-5 cursor-pointer rounded accent-blue-600 focus:ring-primary-light/30 dark:accent-blue-400 dark:focus:ring-white/20"
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-text-light dark:text-text-dark">
            Context menu autofill
          </span>
          <span className="text-xs leading-5 text-muted-light dark:text-muted-dark">
            Offer Hide My Email addresses from the browser context menu.
          </span>
        </span>
      </label>
    </form>
  );
};

const SettingsSection = (props: {
  title: string;
  description?: string;
  children: ReactNode;
}) => {
  return (
    <section className="mb-5 last:mb-0">
      <div className="flex items-end justify-between gap-2 px-1 pb-1">
        <div>
          <h2 className="mb-1 text-sm font-medium text-text-light dark:text-text-dark">
            {props.title}
          </h2>
          {props.description && (
            <p className="mb-0 text-xs leading-5 text-muted-light dark:text-muted-dark">
              {props.description}
            </p>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-line-light bg-surface-light shadow-sm dark:border-line-dark dark:bg-surface-dark dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
        {props.children}
      </div>
    </section>
  );
};

const Options = (props: {
  client?: ICloudClient;
  signOutCallback?: () => void;
}) => {
  return (
    <TitledComponent
      title="Apple Hide My Email"
      subtitle="Settings"
      hideHeader
    >
      <div className="space-y-5 px-3 py-3">
        <SettingsSection
          title="Forward-to address"
          description="Choose where new Hide My Email messages are delivered."
        >
          <div className="p-3">
            <SelectFwdToForm />
          </div>
        </SettingsSection>
        <SettingsSection
          title="Autofill"
          description="Control how addresses are offered while browsing."
        >
          <div className="p-2">
            <AutofillForm />
          </div>
        </SettingsSection>
        <SettingsSection
          title="About"
          description="Apple Hide My Email is independent open-source software."
        >
          <div className="p-3 text-sm">
            <Disclaimer />
          </div>
        </SettingsSection>
        {props.client && props.signOutCallback && (
          <SettingsSection title="Account">
            <div className="p-2">
              <SignOutButton
                callback={props.signOutCallback}
                client={props.client}
              />
            </div>
          </SettingsSection>
        )}
      </div>
    </TitledComponent>
  );
};

type PopupView = 'vault' | 'generator' | 'settings';

const BottomNavigation = (props: {
  activeView: PopupView;
  onNavigate: (view: PopupView) => void;
}) => {
  const items: Array<{ view: PopupView; label: string; icon: IconDefinition }> =
    [
      { view: 'vault', label: 'Addresses', icon: faList },
      { view: 'generator', label: 'New', icon: faPlus },
      { view: 'settings', label: 'Settings', icon: faCog },
    ];

  return (
    <nav className="popup-nav border-t border-line-light dark:border-line-dark bg-surface-light dark:bg-surface-dark p-1">
      <ul className="flex m-0 p-0 list-none">
        {items.map((item) => {
          const isActive = props.activeView === item.view;
          return (
            <li className="flex-1" key={item.view}>
              <button
                type="button"
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => props.onNavigate(item.view)}
                className={`w-full min-h-[56px] rounded-lg flex flex-col gap-0.5 items-center justify-center px-2 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-light/30 dark:focus:ring-white/20 ${
                  isActive
                    ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                    : 'text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-blue-300 hover:bg-elevated-light dark:hover:bg-elevated-dark'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="text-lg" />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

const Popup = () => {
  const [state, setState, isStateLoading] = useBrowserStorageState(
    'popupState',
    PopupState.SignedOut
  );
  const [clientState, setClientState, isClientStateLoading] =
    useBrowserStorageState('clientState', undefined);
  const [hmeListCache] = useBrowserStorageState('hmeListCache', undefined);
  const [activeView, setActiveView] = useState<PopupView>('vault');

  useEffect(() => {
    if (isClientStateLoading || clientState?.setupUrl === undefined) return;

    let isMounted = true;
    const validatePersistedSession = async () => {
      const client = constructClient(clientState);
      const isAuthenticated = await client.isAuthenticated();
      if (!isMounted) return;

      if (!isAuthenticated) {
        setState(PopupState.SignedOut);
        setClientState(undefined);
        performDeauthSideEffects();
        return;
      }

      const nextClientState = {
        ...clientState,
        webservices: client.webservices,
        ...client.context(),
      };
      if (!isEqual(clientState, nextClientState)) {
        setClientState(nextClientState);
      }
    };

    validatePersistedSession().catch(console.error);
    return () => {
      isMounted = false;
    };
  }, [
    setState,
    setClientState,
    clientState,
    isClientStateLoading,
  ]);

  useEffect(() => {
    if (state === PopupState.Authenticated) {
      setActiveView('generator');
    } else if (
      state === PopupState.AuthenticatedAndManaging ||
      (state === PopupState.SignedOut && clientState !== undefined)
    ) {
      setActiveView('vault');
    }
  }, [state, clientState]);

  if (isStateLoading || isClientStateLoading) {
    return (
      <div className="w-full min-h-[180px] flex items-center justify-center p-4 bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark">
        <Spinner />
      </div>
    );
  }

  const currentState =
    clientState !== undefined && state === PopupState.SignedOut
      ? PopupState.AuthenticatedAndManaging
      : (state as PopupState);

  const isAuthenticated =
    clientState !== undefined && currentState !== PopupState.SignedOut;
  const forwardToEmail = hmeListCache?.result.selectedForwardTo;
  const forwardToInitial =
    forwardToEmail?.trim().charAt(0).toUpperCase() || '?';
  const optionsClient =
    clientState?.setupUrl !== undefined
      ? constructClient(clientState)
      : undefined;

  const onNavigate = (view: PopupView) => {
    setActiveView(view);
    if (view === 'vault') {
      setState(PopupState.AuthenticatedAndManaging);
    } else if (view === 'generator') {
      setState(PopupState.Authenticated);
    }
  };

  const onSignOut = () => {
    setActiveView('generator');
    setState(PopupState.SignedOut);
    setClientState(undefined);
  };

  const renderActiveView = () => {
    if (!isAuthenticated) {
      return transitionToNextStateElement(
        PopupState.SignedOut,
        setState,
        clientState
      );
    }

    if (activeView === 'settings') {
      return <Options client={optionsClient} signOutCallback={onSignOut} />;
    }

    return transitionToNextStateElement(
      activeView === 'generator'
        ? PopupState.Authenticated
        : PopupState.AuthenticatedAndManaging,
      setState,
      clientState
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark">
      <header className="flex items-center justify-between gap-3 border-b border-line-light dark:border-line-dark bg-surface-light/90 dark:bg-surface-dark/90 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <h1 className="text-xl font-semibold tracking-tight">Hide My Email</h1>
          <a
            href={browser.runtime.getURL('userguide.html')}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-muted-light dark:text-muted-dark hover:bg-elevated-light dark:hover:bg-elevated-dark hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-primary-light/30 dark:focus:ring-white/20"
            title="Help"
            aria-label="Help"
          >
            <FontAwesomeIcon icon={faQuestionCircle} />
          </a>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => onNavigate('generator')}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-blue-500 px-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              title="Create a new address"
              aria-label="Create a new address"
            >
              <FontAwesomeIcon icon={faPlus} />
              New
            </button>
          )}
          <ThemeSwitch />
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="min-h-[40px] min-w-[40px] rounded-full bg-blue-500 px-2 text-sm font-bold text-white hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              title={forwardToEmail || 'Forward To settings'}
              aria-label={forwardToEmail || 'Forward To settings'}
            >
              {forwardToInitial}
            </button>
          )}
        </div>
      </header>
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        {renderActiveView()}
      </main>
      {isAuthenticated && (
        <BottomNavigation activeView={activeView} onNavigate={onNavigate} />
      )}
    </div>
  );
};

export default Popup;
