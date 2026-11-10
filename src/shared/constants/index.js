export const EXTENSION_NAME = 'Okami HUD';
export const EXTENSION_VERSION = '0.1.0';

export const OKAMI_HUD_CUSTOM_ELEMENT = 'okami-hud-root';
export const OKAMI_HUD_INDICATOR_ID = 'okami-hud-init-indicator';
export const OKAMI_HUD_TOP_BAR_ID = 'okami-hud-top-bar';
export const OKAMI_HUD_TRIGGER_ZONE_ID = 'okami-hud-top-trigger';
export const OKAMI_HUD_EXIT_BUTTON_ID = 'okami-hud-exit-btn';
export const OKAMI_HUD_TOAST_ID = 'okami-hud-toast-feedback';

// Dimensões e temporizações da barra superior do HUD
export const HUD_TOP_BAR_HEIGHT_PX = 48;
export const HUD_TRIGGER_ZONE_HEIGHT_PX = 8;
export const HUD_AUTOHIDE_DELAY_MS = 380;
export const HUD_INITIAL_REVEAL_DURATION_MS = 1800;

export const COMMAND_TOGGLE_IMMERSIVE = 'toggle-immersive-mode';
export const COMMAND_TOGGLE_HUD_VISIBILITY = 'toggle-hud-visibility';

export const STORAGE_KEYS = {
  IMMERSIVE_STATE: 'okami_immersive_state',
};

export const MESSAGE_ACTIONS = {
  TOGGLE_IMMERSIVE: 'OKAMI_TOGGLE_IMMERSIVE',
  EXIT_IMMERSIVE: 'OKAMI_EXIT_IMMERSIVE',
  GET_IMMERSIVE_STATE: 'OKAMI_GET_IMMERSIVE_STATE',
  IMMERSIVE_STATE_CHANGED: 'OKAMI_IMMERSIVE_STATE_CHANGED',
  TOGGLE_HUD_VISIBILITY: 'OKAMI_TOGGLE_HUD_VISIBILITY',
  PING: 'OKAMI_PING',
};

export const READINESS_STATUS = {
  INITIALIZING: 'initializing',
  READY: 'ready',
  ERROR: 'error',
};
