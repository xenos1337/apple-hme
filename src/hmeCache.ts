import ICloudClient, {
  HmeEmail,
  ListHmeResult,
  PremiumMailSettings,
} from './iCloudClient';
import {
  getBrowserStorageValue,
  HmeListCache,
  setBrowserStorageValue,
} from './storage';

// The cache is persisted in extension storage so it survives popup closes and
// browser restarts. The account key prevents a previous iCloud account's
// addresses from being shown after an account switch.
const clientKey = (client: ICloudClient): string =>
  `${client.setupUrl}:${client.dsid || client.clientId}`;

export const getCachedHmeList = async (
  client: ICloudClient
): Promise<ListHmeResult | undefined> => {
  const cache = await getBrowserStorageValue('hmeListCache');
  if (!cache || (cache as HmeListCache).clientKey !== clientKey(client)) {
    return undefined;
  }

  return (cache as HmeListCache).result;
};

export const cacheHmeList = async (
  client: ICloudClient,
  result: ListHmeResult
): Promise<void> => {
  await setBrowserStorageValue('hmeListCache', {
    clientKey: clientKey(client),
    result,
    cachedAt: Date.now(),
  });
};

export const refreshHmeListCache = async (
  client: ICloudClient
): Promise<ListHmeResult> => {
  const result = await new PremiumMailSettings(client).listHme();
  await cacheHmeList(client, result);
  return result;
};

export const updateCachedHmeList = async (
  client: ICloudClient,
  update: (result: ListHmeResult) => ListHmeResult
): Promise<void> => {
  const cache = await getBrowserStorageValue('hmeListCache');
  if (!cache || (cache as HmeListCache).clientKey !== clientKey(client)) {
    return;
  }

  await setBrowserStorageValue('hmeListCache', {
    ...(cache as HmeListCache),
    result: update((cache as HmeListCache).result),
    cachedAt: Date.now(),
  });
};

export const clearHmeListCache = async (): Promise<void> => {
  await setBrowserStorageValue('hmeListCache', undefined);
};

export const updateCachedEmail =
  (hme: HmeEmail, update: (email: HmeEmail) => HmeEmail) =>
  (result: ListHmeResult): ListHmeResult => ({
    ...result,
    hmeEmails: result.hmeEmails.map((email) =>
      email.anonymousId === hme.anonymousId ? update(email) : email
    ),
  });
