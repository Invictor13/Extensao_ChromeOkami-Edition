export type OkamiHUDState = 'uninitialized' | 'ready' | 'active';

export interface OkamiHUDConfig {
  version: string;
  debug: boolean;
}

export interface ExtensionMessage<T = unknown> {
  type: string;
  payload?: T;
}
