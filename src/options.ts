export type Autofill = {
  contextMenu: boolean;
};

export type Options = {
  autofill: Autofill;
};

export const DEFAULT_OPTIONS: Options = {
  autofill: {
    contextMenu: true,
  },
};
