import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeSwitch } from '../../commonComponents';
import contentScript from '../Content/script';
import Userguide from './Userguide';
import './index.css';

const container = document.getElementById('app-container') as HTMLElement;
const root = createRoot(container);
root.render(
  <StrictMode>
    <div className="fixed top-4 right-4 z-10 rounded-xl bg-surface-light/90 dark:bg-surface-dark/90 shadow-lg shadow-zinc-950/5 dark:shadow-black/30">
      <ThemeSwitch />
    </div>
    <Userguide />
  </StrictMode>
);
requestIdleCallback(contentScript);
