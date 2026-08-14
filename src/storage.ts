import browser from 'webextension-polyfill';
import ICloudClient, {
  ICloudClientContext,
  ListHmeResult,
} from './iCloudClient';
import { PopupState } from './pages/Popup/stateMachine';

export type Autofill = {
  contextMenu: boolean;
};

export type Options = {
  autofill: Autofill;
  theme?: 'light' | 'dark' | 'system';
};

export type HmeListCache = {
  clientKey: string;
  result: ListHmeResult;
  cachedAt: number;
};

export type Store = {
  popupState: PopupState;
  clientState?: {
    setupUrl: ICloudClient['setupUrl'];
    webservices?: ICloudClient['webservices'];
  } & ICloudClientContext;
  iCloudHmeOptions: Options;
  theme: 'light' | 'dark' | 'system';
  hmeListCache?: HmeListCache;
} & {
  [K in `hme_xpath_${string}`]?: string;
} & {
  [K in `hme_target_${string}`]?: string;
} & {
  [key: string]: unknown;
};

export const DEFAULT_STORE = {
  popupState: PopupState.SignedOut,
  iCloudHmeOptions: {
    autofill: {
      contextMenu: true,
    },
  },
  theme: 'dark',
  clientState: undefined,
};

export async function getBrowserStorageValue<K extends keyof Store>(
  key: K
): Promise<Store[K]>;
export async function getBrowserStorageValue(key: string): Promise<unknown>;
export async function getBrowserStorageValue(key: string): Promise<unknown> {
  const store = await browser.storage.local.get(key);
  return store[key];
}

export async function setBrowserStorageValue<K extends keyof Store>(
  key: K,
  value: Store[K]
): Promise<void>;
export async function setBrowserStorageValue(
  key: string,
  value: unknown
): Promise<void>;
export async function setBrowserStorageValue(
  key: string,
  value: unknown
): Promise<void> {
  if (value === undefined) {
    await browser.storage.local.remove(key);
  } else {
    await browser.storage.local.set({ [key]: value });
  }
}
