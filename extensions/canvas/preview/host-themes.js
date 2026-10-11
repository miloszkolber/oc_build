// Captured from the running OpenChamber guest-ready theme on 2026-10-11.
// User preferences select Cursor Light/Dark and system UI/monospace fonts.
// These are host snapshots, not a reconstruction from screenshot colors.
const typography = {
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", "Menlo", "Cascadia Mono", "Segoe UI Mono", monospace',
  radius: '.5625rem',
};
export const hostThemes = {
  light: { mode: 'light', tokens: {
    ...typography,
    background: '#FCFCFC', elevated: '#f2f2f2', foreground: '#454a50',
    muted: '#66696f', subtle: '#f6f6f6', border: '#5058601e', hover: '#0000000a',
    selection: '#E1E1E1', focus: '#2567A8B3', primary: '#2567A8',
    mutedSurface: '#f6f6f6', elevatedForeground: '#454a50', active: '#00000014',
    selectionForeground: '#454a50', primaryForeground: '#ffffff',
    primaryText: '#215b95', successText: '#436a34', warningText: '#7a5b14',
    errorText: '#9d3f48', infoText: '#315D9B', success: '#467037',
    warning: '#806015', error: '#A3424B', info: '#315D9B',
    syntaxKeyword: '#126B63', syntaxString: '#894487', syntaxNumber: '#815C22',
    syntaxFunction: '#815C22', syntaxType: '#965528', syntaxComment: '#656B70',
    syntaxVariable: '#265F9E', syntaxOperator: '#4A4E55',
  } },
  dark: { mode: 'dark', tokens: {
    ...typography,
    background: '#1a1a1a', elevated: '#232323', foreground: '#bbbbbb',
    muted: '#919191', subtle: '#141414', border: '#8484841a', hover: '#ffffff0f',
    selection: '#ffffff1d', focus: '#4c9df399', primary: '#4c9df3',
    mutedSurface: '#151515', elevatedForeground: '#bbbbbb', active: '#ffffff1a',
    selectionForeground: '#bbbbbb', primaryForeground: '#191c22',
    primaryText: '#81baf6', successText: '#A3BE8C', warningText: '#EBCB8B',
    errorText: '#d08b92', infoText: '#81A1C1', success: '#A3BE8C',
    warning: '#EBCB8B', error: '#BF616A', info: '#81A1C1',
    syntaxKeyword: '#83d6c5', syntaxString: '#e394dc', syntaxNumber: '#ebc88d',
    syntaxFunction: '#ebc88d', syntaxType: '#efb080', syntaxComment: '#6d6d6d',
    syntaxVariable: '#94C1FA', syntaxOperator: '#d6d6dd',
  } },
};
