import { v4 as uuidv4 } from 'uuid';
import browser from 'webextension-polyfill';
import {
  ActiveInputElementWriteData,
  AutofillData,
  Message,
  MessageType,
} from '../../messages';
import { getBrowserStorageValue, setBrowserStorageValue } from '../../storage';

const getElementByXPath = (xpath: string): Element | null => {
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue as Element;
  } catch (e) {
    console.error('Error finding element by XPath:', e);
    return null;
  }
};

export default async function main(): Promise<void> {
  // Store the last right-clicked input element's XPath
  document.addEventListener('contextmenu', async (event) => {
    const target = event.target as Element;
    if (target instanceof HTMLInputElement) {
      // Generate a unique ID if the element doesn't have one
      if (!target.id) {
        target.id = `hme-input-${uuidv4()}`;
      }
      await setBrowserStorageValue(
        `hme_target_${browser.runtime.id}`,
        target.id as string
      );
    }
  });

  browser.runtime.onMessage.addListener((uncastedMessage: unknown) => {
    const message = uncastedMessage as Message<unknown>;

    switch (message.type) {
      case MessageType.ActiveInputElementWrite:
        {
          const {
            data: { text, copyToClipboard },
          } = message as Message<ActiveInputElementWriteData>;

          (async () => {
            let targetElement: HTMLInputElement | null = null;

            // Try to get the stored XPath
            const storageKey = `hme_xpath_${browser.runtime.id}`;
            const xpath = await getBrowserStorageValue(storageKey);

            if (xpath) {
              const element = getElementByXPath(xpath as string);
              if (element && element instanceof HTMLInputElement) {
                targetElement = element;
              }
              // Clear the stored XPath after using it
              await browser.storage.local.remove(storageKey);
            }

            if (!targetElement) {
              // Fallback to active element if no right-clicked element is found
              const { activeElement } = document;
              if (
                !activeElement ||
                !(activeElement instanceof HTMLInputElement)
              ) {
                return;
              }
              targetElement = activeElement;
            }

            targetElement.value = text;
            targetElement.dispatchEvent(new Event('input', { bubbles: true }));
            targetElement.dispatchEvent(new Event('change', { bubbles: true }));

            if (copyToClipboard) {
              await navigator.clipboard.writeText(text);
            }
          })().catch(console.error);
        }
        break;
      case MessageType.Autofill:
        {
          const { data: text } = message.data as AutofillData;

          (async () => {
            // Get the stored target element ID
            const targetId = await getBrowserStorageValue(
              `hme_target_${browser.runtime.id}`
            );
            if (!targetId) return;

            const targetElement = document.getElementById(targetId);
            if (!targetElement || !(targetElement instanceof HTMLInputElement))
              return;

            targetElement.focus();

            targetElement.value = text;
            targetElement.dispatchEvent(new Event('input', { bubbles: true }));
            targetElement.dispatchEvent(new Event('change', { bubbles: true }));

            // Copy successful generated addresses to the clipboard for convenience.
            if (text.includes('@privaterelay.appleid.com')) {
              // Copy to clipboard for convenience
              navigator.clipboard.writeText(text).catch(console.error);
            }
          })().catch(console.error);
        }
        break;
      default:
        break;
    }

    return undefined;
  });
}
