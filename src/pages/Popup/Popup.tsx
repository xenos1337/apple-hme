import { faFirefoxBrowser } from '@fortawesome/free-brands-svg-icons';
import {
  faBan,
  faCheck,
  faClipboard,
  faExternalLink,
  faInfoCircle,
  faList,
  faPlus,
  faQuestionCircle,
  faRefresh,
  faSearch,
  faSignOut,
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
    <TitledComponent title="Apple Hide My Email" subtitle="Sign in to iCloud">
      <div className="space-y-4">
        <div className="text-sm space-y-2">
          <p>
            To use this extension, sign in to your iCloud account on{' '}
            <Link
              href="https://icloud.com"
              className="font-semibold text-primary-light dark:text-muted-dark"
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
                className="font-semibold text-primary-light dark:text-muted-dark"
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
  const { label, icon, className, ...buttonProps } = props;

  return (
    <button
      className={`w-full min-h-[40px] justify-center px-2 inline-flex items-center text-sm text-primary-light dark:text-muted-dark hover:text-actionHover-light dark:hover:text-white hover:bg-elevated-light dark:hover:bg-elevated-dark focus:outline-none focus:ring-2 focus:ring-primary-light/30 dark:focus:ring-white/20 rounded-lg ${
        className || ''
      }`}
      {...buttonProps}
    >
      <FontAwesomeIcon icon={icon} className="mr-1" />
      {label}
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
    isEmailRefreshSubmitting || hmeEmail == reservedHme?.hme;

  const reservationFormInputClassName =
    'appearance-none rounded-xl relative block w-full min-h-[44px] px-3.5 py-2.5 border border-line-light dark:border-line-dark placeholder-muted-light dark:placeholder-zinc-600 text-text-light dark:text-text-dark bg-control-light dark:bg-control-dark focus:outline-none focus:border-primary-light dark:focus:border-zinc-500 focus:ring-2 focus:ring-primary-light/10 dark:focus:ring-white/10 focus:z-10 sm:text-sm transition-[border-color,box-shadow] duration-150';

  return (
    <main className="space-y-5">
      <div className="space-y-1 pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-light dark:text-muted-dark">
          New address
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-text-light dark:text-text-dark text-balance">
          Create an address for{' '}
          <span className="text-primary-light dark:text-muted-dark">
            {tabHost || 'this site'}
          </span>
        </h1>
      </div>

      <section className="rounded-2xl border border-line-light dark:border-line-dark bg-surface-light dark:bg-surface-dark p-4 shadow-sm dark:shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
        <div className="flex items-start gap-3">
          <button
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary-light dark:text-muted-dark hover:bg-elevated-light dark:hover:bg-elevated-dark hover:text-actionHover-light dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-light/30 dark:focus:ring-white/20"
            onClick={onEmailRefreshClick}
            disabled={isEmailRefreshSubmitting}
            aria-label="Generate another address"
          >
            <FontAwesomeIcon
              icon={faRefresh}
              spin={isEmailRefreshSubmitting}
              className="text-lg"
            />
          </button>
          <div className="min-w-0 flex-1 pt-0.5">
            <p
              className="break-all text-lg font-semibold leading-6 tracking-tight tabular-nums text-text-light dark:text-text-dark"
              aria-live="polite"
            >
              {hmeEmail}
            </p>
            {fwdToEmail !== undefined && (
              <p className="mt-1.5 truncate text-sm text-muted-light dark:text-muted-dark">
                Forwarding to {fwdToEmail}
              </p>
            )}
          </div>
        </div>
        {hmeError && (
          <div className="mt-3">
            <ErrorMessage>{hmeError}</ErrorMessage>
          </div>
        )}
      </section>
      {hmeEmail && (
        <div className="space-y-4">
          <form
            className={`space-y-4 ${
              isReservationFormDisabled ? 'opacity-70' : ''
            }`}
            onSubmit={onUseSubmit}
          >
            <div>
              <label
                htmlFor="label"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-light dark:text-muted-dark"
              >
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
              <label
                htmlFor="note"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-light dark:text-muted-dark"
              >
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
              className="dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Use
            </LoadingButton>
            {reserveError && <ErrorMessage>{reserveError}</ErrorMessage>}
          </form>
          {reservedHme && <ReservationResult hme={reservedHme} />}
        </div>
      )}
      <nav
        className="grid grid-cols-3 gap-1 border-t border-line-light dark:border-line-dark pt-3"
        aria-label="Popup navigation"
      >
        <FooterButton
          onClick={() => props.callback('MANAGE')}
          icon={faList}
          label="Manage emails"
        />
        <a
          href={browser.runtime.getURL('userguide.html')}
          target="_blank"
          rel="noreferrer"
          className="w-full min-h-[40px] justify-center px-2 text-sm text-primary-light dark:text-muted-dark hover:text-actionHover-light dark:hover:text-white hover:bg-elevated-light dark:hover:bg-elevated-dark focus:outline-none focus:ring-2 focus:ring-primary-light/30 dark:focus:ring-white/20 rounded-lg inline-flex items-center"
        >
          <FontAwesomeIcon icon={faQuestionCircle} className="mr-1" />
          Help
        </a>
        <SignOutButton callback={props.signOutCallback} client={props.client} />
      </nav>
    </main>
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

const HmeListLoading = () => (
  <div
    className="grid grid-cols-2 overflow-hidden rounded-xl border border-line-light dark:border-line-dark bg-surface-light dark:bg-surface-dark"
    style={{ height: 359 }}
    role="status"
    aria-label="Loading email addresses"
  >
    <div className="border-r border-line-light dark:border-line-dark">
      <div className="p-2 border-b border-line-light dark:border-line-dark bg-elevated-light dark:bg-elevated-dark">
        <div className="h-[42px] rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
      </div>
      <div className="divide-y divide-line-light dark:divide-line-dark">
        {[72, 58, 81, 64, 76, 52].map((width, index) => (
          <div key={index} className="h-[42px] px-3 flex items-center">
            <div
              className="h-3 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse"
              style={{ width: `${width}%` }}
            />
          </div>
        ))}
      </div>
    </div>
    <div className="p-3 space-y-5">
      {[68, 54, 77, 61].map((width, index) => (
        <div key={index} className="space-y-2">
          <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div
            className="h-3 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse"
            style={{ width: `${width}%` }}
          />
        </div>
      ))}
    </div>
    <span className="sr-only">Loading email addresses</span>
  </div>
);

const HmeManagerLoading = () => (
  <TitledComponent
    title="Apple Hide My Email"
    subtitle="Manage your HideMyEmail addresses"
  >
    <HmeListLoading />
  </TitledComponent>
);

const HmeManager = (props: {
  callback: (action: 'GENERATE' | 'SIGN_OUT') => void;
  signOutCallback: () => void;
  client: ICloudClient;
}) => {
  const [fetchedHmeEmails, setFetchedHmeEmails] = useState<HmeEmail[]>();
  const [hmeEmailsError, setHmeEmailsError] = useState<string>();
  const [isFetching, setIsFetching] = useState(true);
  const [selectedHmeIdx, setSelectedHmeIdx] = useState(0);
  const [searchPrompt, setSearchPrompt] = useState<string>();

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

    if (selectedHmeIdx >= hmeEmails.length) {
      setSelectedHmeIdx(hmeEmails.length - 1);
    }

    const selectedHmeEmail = hmeEmails[selectedHmeIdx];

    const searchBox = (
      <div className="relative p-2 rounded-tl-xl bg-elevated-light dark:bg-elevated-dark">
        <div className="absolute inset-y-0 flex items-center pl-3 pointer-events-none">
          <FontAwesomeIcon
            className="text-muted-light dark:text-zinc-600"
            icon={faSearch}
          />
        </div>
        <input
          type="search"
          className="pl-9 p-2 min-h-[42px] w-full rounded-lg placeholder-muted-light dark:placeholder-zinc-600 bg-control-light dark:bg-control-dark text-text-light dark:text-text-dark border border-line-light dark:border-line-dark focus:outline-none focus:border-primary-light dark:focus:border-zinc-500 focus:ring-2 focus:ring-primary-light/10 dark:focus:ring-white/10"
          placeholder="Search"
          aria-label="Search through your HideMyEmail addresses"
          onChange={(e) => {
            setSearchPrompt(e.target.value);
            setSelectedHmeIdx(0);
          }}
        />
      </div>
    );

    const btnBaseClassName =
      'p-2.5 min-h-[42px] w-full text-left border-b border-line-light dark:border-line-dark last:border-b-0 cursor-pointer truncate focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-light/30 dark:focus:ring-white/20';
    const btnClassName = `${btnBaseClassName} hover:bg-elevated-light dark:hover:bg-elevated-dark`;
    const selectedBtnClassName = `${btnBaseClassName} text-white dark:text-text-dark bg-action-light dark:bg-action-dark font-semibold`;

    const labelList = hmeEmails.map((hme, idx) => (
      <button
        key={idx}
        aria-current={selectedHmeIdx === idx}
        type="button"
        className={idx === selectedHmeIdx ? selectedBtnClassName : btnClassName}
        onClick={() => setSelectedHmeIdx(idx)}
      >
        {hme.isActive ? (
          hme.label
        ) : (
          <div title="Deactivated">
            <FontAwesomeIcon
              icon={faBan}
              className="text-red-500 dark:text-red-400 mr-1"
            />
            {hme.label}
          </div>
        )}
      </button>
    ));

    const noSearchResult = (
      <div className="p-3 break-words text-center text-muted-light dark:text-muted-dark">
        No results for &quot;{searchPrompt}&quot;
      </div>
    );

    return (
      <div className="grid grid-cols-2" style={{ height: 359 }}>
        <div className="overflow-y-auto text-sm rounded-l-xl border border-line-light dark:border-line-dark bg-surface-light dark:bg-surface-dark">
          <div className="sticky top-0 border-b border-line-light dark:border-line-dark">
            {searchBox}
          </div>
          {hmeEmails.length === 0 && searchPrompt ? noSearchResult : labelList}
        </div>
        <div className="overflow-y-auto p-3 rounded-r-xl border border-l-0 border-line-light dark:border-line-dark bg-surface-light dark:bg-surface-dark">
          {selectedHmeEmail && (
            <HmeDetails
              client={props.client}
              hme={selectedHmeEmail}
              activationCallback={activationCallbackFactory(selectedHmeEmail)}
              deletionCallback={deletionCallbackFactory(selectedHmeEmail)}
            />
          )}
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
      return <HmeListLoading />;
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
    >
      {resolveMainChildComponent()}
      <div className="flex justify-evenly items-center">
        <FooterButton
          onClick={() => props.callback('GENERATE')}
          icon={faPlus}
          label="Generate new email"
        />
        <a
          href={browser.runtime.getURL('userguide.html')}
          target="_blank"
          rel="noreferrer"
          className="min-h-[40px] px-2 text-primary-light dark:text-muted-dark hover:text-actionHover-light dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-light/30 dark:focus:ring-white/20 rounded-md inline-flex items-center"
        >
          <FontAwesomeIcon icon={faQuestionCircle} className="mr-1" />
          Help
        </a>
        <SignOutButton callback={props.signOutCallback} client={props.client} />
      </div>
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
    <form className="space-y-3" onSubmit={onSelectedFwdToSubmit}>
      {fwdToEmails?.map((fwdToEmail, key) => (
        <div className="flex items-center mb-3" key={key}>
          <input
            onChange={() => setSelectedFwdToEmail(fwdToEmail)}
            checked={fwdToEmail === selectedFwdToEmail}
            id={`radio-${key}`}
            type="radio"
            disabled={isSubmitting}
            name={`fwdto-radio-${key}`}
            className="cursor-pointer w-4 h-4 accent-action-light dark:accent-zinc-300 focus:ring-primary-light/30 dark:focus:ring-white/20"
          />
          <label
            htmlFor={`radio-${key}`}
            className="cursor-pointer ml-2 text-text-light dark:text-text-dark"
          >
            {fwdToEmail}
          </label>
        </div>
      ))}
      <LoadingButton loading={isSubmitting}>Update</LoadingButton>
      {updateFwdToError && <ErrorMessage>{updateFwdToError}</ErrorMessage>}
    </form>
  );
};

const AutofillForm = () => {
  const [options, setOptions] = useBrowserStorageState(
    'iCloudHmeOptions',
    DEFAULT_STORE.iCloudHmeOptions
  );

  return (
    <form className="space-y-3">
      <div className="flex items-center mb-3">
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
          className="cursor-pointer w-4 h-4 accent-action-light dark:accent-zinc-300 focus:ring-primary-light/30 dark:focus:ring-white/20"
        />
        <label
          htmlFor="checkbox-contextMenu"
          className="cursor-pointer ml-2 text-text-light dark:text-text-dark"
        >
          Context menu
        </label>
      </div>
    </form>
  );
};

// Kept available for integrations that render the settings view directly.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Options = () => {
  return (
    <TitledComponent title="Apple Hide My Email" subtitle="Settings">
      <div>
        <h3 className="font-bold text-lg mb-3">Disclaimer</h3>
        <Disclaimer />
      </div>
      <div>
        <h3 className="font-bold text-lg mb-3">Forward To Address</h3>
        <SelectFwdToForm />
      </div>
      <div>
        <h3 className="font-bold text-lg mb-3">Autofill</h3>
        <AutofillForm />
      </div>
    </TitledComponent>
  );
};

const Popup = () => {
  const [state, setState, isStateLoading] = useBrowserStorageState(
    'popupState',
    PopupState.SignedOut
  );
  const [clientState, setClientState, isClientStateLoading] =
    useBrowserStorageState('clientState', undefined);

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
  }, [setState, setClientState, clientState, isClientStateLoading]);

  if (isStateLoading || isClientStateLoading) {
    return (
      <div className="min-h-full p-5 bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark">
        <HmeManagerLoading />
      </div>
    );
  }

  const currentState =
    clientState !== undefined && state === PopupState.SignedOut
      ? PopupState.AuthenticatedAndManaging
      : (state as PopupState);
  return (
    <div className="min-h-full bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark">
      <div className="p-5">
        {transitionToNextStateElement(currentState, setState, clientState)}
      </div>
    </div>
  );
};

export default Popup;
