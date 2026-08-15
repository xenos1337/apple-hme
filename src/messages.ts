import browser from 'webextension-polyfill';

export enum MessageType {
  Autofill,
  GenerateRequest,
  GenerateResponse,
  ReservationRequest,
  ReservationResponse,
  ActiveInputElementWrite,
  StoreXPath,
}

export type Message<T> = {
  type: MessageType;
  data: T;
};

export type AutofillData = {
  inputElementXPath?: string;
} & ({ data: string; loading?: false } | { loading: true; data?: never });

export type ReservationRequestData = {
  hme: string;
  label: string;
  elementId: string;
  inputElementXPath: string;
};

export type GenerationResponseData = {
  hme?: string;
  elementId: string;
  error?: string;
};

export type ActiveInputElementWriteData = {
  text: string;
  copyToClipboard: boolean;
  targetElementXPath?: string;
};

export type ReservationResponseData = GenerationResponseData & {
  inputElementXPath?: string;
};

export type StoreXPathData = {
  hme: string;
  xpath: string;
};

type SendMessageToTabOptions = {
  frameId?: number;
};

const injectContentScript = async (
  tabId: number,
  frameId?: number
): Promise<void> => {
  await browser.scripting.executeScript({
    target: {
      tabId,
      ...(frameId === undefined ? {} : { frameIds: [frameId] }),
    },
    files: ['contentScript.bundle.js'],
  });
};

export const sendMessageToTab = async (
  type: MessageType,
  data: unknown,
  tab?: browser.Tabs.Tab,
  options: SendMessageToTabOptions = {}
): Promise<void> => {
  if (tab === undefined) {
    [tab] = await browser.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
  }

  if (tab?.id !== undefined) {
    await injectContentScript(tab.id, options.frameId);
    await browser.tabs.sendMessage(
      tab.id,
      {
        type,
        data,
      },
      options.frameId === undefined ? {} : { frameId: options.frameId }
    );
  }
};
