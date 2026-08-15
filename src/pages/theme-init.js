/* eslint-env browser, es2020 */

// Initialize the saved theme before React renders to avoid a color flash.
(async function initTheme() {
  try {
    const extensionApi = globalThis.browser || globalThis.chrome;
    const storage = await extensionApi.storage.local.get('theme');
    const theme = storage.theme || 'dark';
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    const elements = [
      document.documentElement,
      document.body,
      document.getElementById('app-container'),
    ];
    elements.forEach((element) => {
      element?.classList.toggle('dark', isDark);
      element?.classList.toggle('light', !isDark);
    });
  } catch (error) {
    console.error('Failed to initialize theme:', error);
  }
})();
