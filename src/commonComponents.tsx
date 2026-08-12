import {
  faDesktop,
  faMoon,
  faSpinner,
  faSun,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  useEffect,
} from 'react';
import { useBrowserStorageState } from './hooks';

export const Spinner = () => {
  return (
    <div className="text-center">
      <FontAwesomeIcon
        icon={faSpinner}
        spin={true}
        className="text-3xl text-primary-light dark:text-muted-dark"
      />
    </div>
  );
};

export const LoadingButton = (
  props: {
    loading: boolean;
  } & DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >
) => {
  const { loading, disabled, className, ...btnHtmlAttrs } = props;

  const defaultClassName =
    'w-full min-h-[42px] justify-center text-white bg-action-light hover:bg-actionHover-light dark:text-text-dark dark:bg-action-dark dark:hover:bg-actionHover-dark focus:ring-2 focus:outline-none focus:ring-primary-light/30 dark:focus:ring-white/20 font-semibold rounded-lg px-5 py-2.5 text-center inline-flex items-center shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]';

  const disabledClassName =
    'w-full min-h-[42px] justify-center text-zinc-500 dark:text-zinc-600 bg-zinc-200 dark:bg-zinc-900 font-semibold rounded-lg px-5 py-2.5 text-center inline-flex items-center';

  const btnClassName = `${disabled ? disabledClassName : defaultClassName} ${
    className || ''
  }`;

  return (
    <button
      type="submit"
      className={btnClassName}
      disabled={loading || disabled}
      {...btnHtmlAttrs}
    >
      {loading && !disabled && (
        <FontAwesomeIcon icon={faSpinner} spin={true} className="mr-1" />
      )}
      {props.children}
    </button>
  );
};

export const ErrorMessage = (props: { children?: React.ReactNode }) => {
  return (
    <div
      className="p-3 text-sm text-red-300 bg-[#181112] border border-[#4A2025] rounded-lg"
      role="alert"
    >
      {props.children}
    </div>
  );
};

export const TitledComponent = (props: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) => {
  const children =
    props.children instanceof Array ? props.children : [props.children];

  return (
    <div className="text-base space-y-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-balance text-text-light dark:text-text-dark">
          {props.title}
        </h1>
        <h2 className="mt-1 font-medium text-sm text-muted-light dark:text-muted-dark text-balance">
          {props.subtitle}
        </h2>
      </div>
      {children?.map((child, key) => {
        return (
          child && (
            <React.Fragment key={key}>
              <hr className="border-line-light dark:border-line-dark" />
              {child}
            </React.Fragment>
          )
        );
      })}
    </div>
  );
};

export const Link = (
  props: React.DetailedHTMLProps<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  >
) => {
  // https://github.com/jsx-eslint/eslint-plugin-react/issues/3284
  // eslint-disable-next-line react/prop-types
  const { className, children, ...restProps } = props;
  return (
    <a
      className={`text-primary-light dark:text-muted-dark hover:text-actionHover-light dark:hover:text-white underline-offset-4 hover:underline ${className}`}
      target="_blank"
      rel="noreferrer"
      {...restProps}
    >
      {children}
    </a>
  );
};

export const ThemeSwitch = () => {
  const [theme, setTheme] = useBrowserStorageState('theme', 'system');

  const updateTheme = (isDark: boolean) => {
    const elements = [
      document.documentElement,
      document.body,
      document.getElementById('app-container'),
    ];
    elements.forEach((el) => el?.classList.toggle('dark', isDark));
  };

  const getSystemTheme = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Initialize theme on mount
  useEffect(() => {
    if (theme === 'system') {
      updateTheme(getSystemTheme());
    } else {
      updateTheme(theme === 'dark');
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateTheme(mediaQuery.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const themeIcons = {
    light: faSun,
    dark: faMoon,
    system: faDesktop,
  } as const;

  const nextTheme = {
    light: 'dark',
    dark: 'system',
    system: 'light',
  } as const;

  const themeLabels = {
    light: 'Light theme',
    dark: 'Dark theme',
    system: 'System theme',
  } as const;

  return (
    <button
      onClick={() => setTheme(nextTheme[theme])}
      className="min-w-[40px] min-h-[40px] p-2 rounded-lg text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark hover:bg-elevated-light dark:hover:bg-elevated-dark focus:outline-none focus:ring-2 focus:ring-primary-light/30 dark:focus:ring-white/20"
      title={themeLabels[theme]}
      aria-label={themeLabels[theme]}
    >
      <FontAwesomeIcon icon={themeIcons[theme]} className="text-lg" />
    </button>
  );
};
