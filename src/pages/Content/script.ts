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

const LOADING_OVERLAY_ATTRIBUTE = 'data-apple-hme-loading-overlay';
const CONTENT_SCRIPT_VERSION_KEY = '__appleHideMyEmailContentScriptVersion';

type ContentScriptGlobal = typeof globalThis & {
  [CONTENT_SCRIPT_VERSION_KEY]?: string;
};

let loadingOverlay: HTMLSpanElement | undefined;
let loadingOverlayAnimation: Animation | undefined;
let removeLoadingOverlayListeners: (() => void) | undefined;
let autofillTarget: HTMLInputElement | undefined;

const removeLoadingOverlay = (): void => {
  loadingOverlayAnimation?.cancel();
  loadingOverlayAnimation = undefined;
  loadingOverlay?.remove();
  loadingOverlay = undefined;
  removeLoadingOverlayListeners?.();
  removeLoadingOverlayListeners = undefined;
};

const showLoadingOverlay = (targetElement: HTMLInputElement): void => {
  removeLoadingOverlay();

  const overlay = document.createElement('span');
  overlay.setAttribute(LOADING_OVERLAY_ATTRIBUTE, 'true');
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-label', 'Generating Hide My Email address');
  Object.assign(overlay.style, {
    position: 'fixed',
    width: '14px',
    height: '14px',
    boxSizing: 'border-box',
    display: 'block',
    border: '2px solid rgba(128, 128, 128, 0.35)',
    borderTopColor: getComputedStyle(targetElement).color,
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: '2147483647',
  });

  const updatePosition = () => {
    if (!targetElement.isConnected) {
      removeLoadingOverlay();
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    Object.assign(overlay.style, {
      top: `${rect.top + (rect.height - overlay.offsetHeight) / 2}px`,
      left: `${rect.right - overlay.offsetWidth - 8}px`,
    });
  };

  document.body.appendChild(overlay);
  loadingOverlay = overlay;
  loadingOverlayAnimation = overlay.animate(
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
    { duration: 700, iterations: Infinity }
  );
  updatePosition();

  window.addEventListener('scroll', updatePosition, true);
  window.addEventListener('resize', updatePosition);
  removeLoadingOverlayListeners = () => {
    window.removeEventListener('scroll', updatePosition, true);
    window.removeEventListener('resize', updatePosition);
  };
};

const getAutofillTarget = async (
  inputElementXPath?: string
): Promise<HTMLInputElement | null> => {
  if (inputElementXPath) {
    const xpathTarget = getElementByXPath(inputElementXPath);
    if (xpathTarget instanceof HTMLInputElement) {
      autofillTarget = xpathTarget;
      return xpathTarget;
    }
  }

  if (autofillTarget?.isConnected) {
    return autofillTarget;
  }

  const { activeElement } = document;
  if (activeElement instanceof HTMLInputElement) {
    autofillTarget = activeElement;
  } else {
    const storageKey = `hme_target_${browser.runtime.id}`;
    const storedTargetId = await getBrowserStorageValue(storageKey);
    if (typeof storedTargetId === 'string') {
      const storedTarget = document.getElementById(storedTargetId);
      if (storedTarget instanceof HTMLInputElement) {
        autofillTarget = storedTarget;
      }
    }
  }

  if (!autofillTarget) {
    return null;
  }

  const storageKey = `hme_target_${browser.runtime.id}`;
  if (!autofillTarget.id) {
    autofillTarget.id = `hme-input-${uuidv4()}`;
  }
  await setBrowserStorageValue(storageKey, autofillTarget.id);

  return autofillTarget;
};

export default async function main(): Promise<void> {
  const contentScriptGlobal = globalThis as ContentScriptGlobal;
  const extensionVersion = browser.runtime.getManifest().version;
  if (contentScriptGlobal[CONTENT_SCRIPT_VERSION_KEY] === extensionVersion) {
    return;
  }
  contentScriptGlobal[CONTENT_SCRIPT_VERSION_KEY] = extensionVersion;

  // Keep track of the input selected through the context menu.
  document.addEventListener('contextmenu', async (event) => {
    const target = event.target as Element;
    if (target instanceof HTMLInputElement) {
      autofillTarget = target;
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
          const {
            data: text,
            loading,
            inputElementXPath,
          } = message.data as AutofillData;

          (async () => {
            if (!loading) {
              removeLoadingOverlay();
            }

            const targetElement = await getAutofillTarget(inputElementXPath);
            if (!targetElement) return;

            targetElement.focus();

            if (loading) {
              showLoadingOverlay(targetElement);
              return;
            }

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
