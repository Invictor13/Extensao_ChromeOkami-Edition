import {
  COMMAND_TOGGLE_IMMERSIVE,
  MESSAGE_ACTIONS,
  STORAGE_KEYS,
} from '../../shared/constants/index.js';
import { logInfo, logError } from '../../shared/utils/logger.js';

/**
 * Retorna a API de storage apropriada (session se disponível com fallback para local).
 * Decisão técnica: chrome.storage.session é ideal para armazenar estados transitórios
 * de janelas e abas durante a sessão de navegação, sendo limpo automaticamente quando
 * o navegador fecha, impedindo que janelas iniciem falsamente em modo imersivo.
 */
export function getStorageArea() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return chrome.storage.session || chrome.storage.local;
  }
  return null;
}

/**
 * Lê o estado armazenado para todas as janelas.
 * Retorna um objeto mapeando windowId -> { isImmersive: boolean, previousState: string }.
 */
export async function getAllWindowState() {
  try {
    const storage = getStorageArea();
    if (!storage) return {};
    const result = await storage.get(STORAGE_KEYS.IMMERSIVE_STATE);
    return result?.[STORAGE_KEYS.IMMERSIVE_STATE] || {};
  } catch (err) {
    logError('Erro ao ler estado de janelas do storage:', err);
    return {};
  }
}

/**
 * Salva o estado consolidado das janelas.
 */
export async function setAllWindowState(state) {
  try {
    const storage = getStorageArea();
    if (!storage) return;
    await storage.set({ [STORAGE_KEYS.IMMERSIVE_STATE]: state });
  } catch (err) {
    logError('Erro ao persistir estado de janelas no storage:', err);
  }
}

/**
 * Lê o estado de uma janela específica.
 */
export async function getWindowState(windowId) {
  const all = await getAllWindowState();
  return all[windowId] || { isImmersive: false, previousState: 'normal' };
}

/**
 * Remove o estado de uma janela fechada.
 */
export async function removeWindowState(windowId) {
  const all = await getAllWindowState();
  if (all[windowId]) {
    delete all[windowId];
    await setAllWindowState(all);
  }
}

/**
 * Notifica com segurança uma aba sobre a alteração do modo imersivo.
 */
export async function notifyTab(tabId, isImmersive) {
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.sendMessage) {
      await chrome.tabs.sendMessage(tabId, {
        action: MESSAGE_ACTIONS.IMMERSIVE_STATE_CHANGED,
        isImmersive,
      });
    }
  } catch (_err) {
    // Falha silenciosa e esperada em abas onde content script não executa (chrome://, webstore, etc)
  }
}

/**
 * Notifica todas as abas de uma janela sobre a alteração de estado.
 */
export async function broadcastWindowImmersiveState(windowId, isImmersive) {
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      const tabs = await chrome.tabs.query({ windowId });
      for (const tab of tabs) {
        if (tab.id) {
          notifyTab(tab.id, isImmersive);
        }
      }
    }
  } catch (err) {
    logError(`Erro ao propagar estado para abas da janela ${windowId}:`, err);
  }
}

/**
 * Entra no modo imersivo para a janela especificada.
 */
export async function enterImmersiveMode(windowId) {
  try {
    if (typeof chrome === 'undefined' || !chrome.windows) {
      throw new Error('API chrome.windows não disponível');
    }

    const win = await chrome.windows.get(windowId);
    if (!win) {
      throw new Error(`Janela ${windowId} não encontrada`);
    }

    // Se já estiver em fullscreen na janela, apenas sincroniza
    if (win.state === 'fullscreen') {
      const current = await getWindowState(windowId);
      const all = await getAllWindowState();
      all[windowId] = {
        isImmersive: true,
        previousState: current.previousState || 'normal',
      };
      await setAllWindowState(all);
      await broadcastWindowImmersiveState(windowId, true);
      return true;
    }

    const previousState = win.state || 'normal';

    // Aplica fullscreen à janela
    const updatedWin = await chrome.windows.update(windowId, {
      state: 'fullscreen',
    });

    if (updatedWin.state !== 'fullscreen') {
      throw new Error('Falha ao atualizar janela para fullscreen');
    }

    const all = await getAllWindowState();
    all[windowId] = {
      isImmersive: true,
      previousState: previousState === 'fullscreen' ? 'normal' : previousState,
    };
    await setAllWindowState(all);

    logInfo(`Modo imersivo ativado na janela ${windowId}. Estado anterior: ${previousState}`);
    await broadcastWindowImmersiveState(windowId, true);
    return true;
  } catch (err) {
    logError(`Falha ao entrar no modo imersivo na janela ${windowId}:`, err);
    return false;
  }
}

/**
 * Sai do modo imersivo para a janela especificada.
 */
export async function exitImmersiveMode(windowId) {
  try {
    if (typeof chrome === 'undefined' || !chrome.windows) {
      throw new Error('API chrome.windows não disponível');
    }

    const current = await getWindowState(windowId);
    const targetState =
      current.previousState && current.previousState !== 'fullscreen'
        ? current.previousState
        : 'normal';

    const win = await chrome.windows.get(windowId);
    if (!win) {
      await removeWindowState(windowId);
      return true;
    }

    if (win.state === 'fullscreen') {
      await chrome.windows.update(windowId, {
        state: targetState,
      });
    }

    const all = await getAllWindowState();
    all[windowId] = {
      isImmersive: false,
      previousState: targetState,
    };
    await setAllWindowState(all);

    logInfo(`Modo imersivo desativado na janela ${windowId}. Restaurado para: ${targetState}`);
    await broadcastWindowImmersiveState(windowId, false);
    return true;
  } catch (err) {
    logError(`Falha ao sair do modo imersivo na janela ${windowId}:`, err);
    return false;
  }
}

/**
 * Alterna (toggle) o modo imersivo para a janela especificada.
 */
export async function toggleImmersiveMode(windowId) {
  try {
    if (!windowId && typeof chrome !== 'undefined' && chrome.windows) {
      const currentWin = await chrome.windows.getCurrent();
      windowId = currentWin?.id;
    }

    if (!windowId) {
      logError('Nenhuma janela ativa identificada para alternar modo imersivo.');
      return false;
    }

    const win = await chrome.windows.get(windowId);
    const isCurrentlyFullscreen = win?.state === 'fullscreen';
    const state = await getWindowState(windowId);

    // Se estiver em fullscreen (seja pelo estado salvo ou pelo estado real da janela)
    if (isCurrentlyFullscreen || state.isImmersive) {
      return await exitImmersiveMode(windowId);
    } else {
      return await enterImmersiveMode(windowId);
    }
  } catch (err) {
    logError('Erro ao alternar modo imersivo:', err);
    return false;
  }
}

/**
 * Registra todos os listeners e integrações do ImmersiveModeManager.
 */
export function setupImmersiveModeManager() {
  if (typeof chrome === 'undefined') return;

  // 1. Clique no ícone da extensão
  if (chrome.action?.onClicked) {
    chrome.action.onClicked.addListener(async (tab) => {
      try {
        const windowId = tab.windowId;
        await toggleImmersiveMode(windowId);
      } catch (err) {
        logError('Erro no listener de clique do action:', err);
      }
    });
  }

  // 2. Atalho de teclado registrado no manifesto
  if (chrome.commands?.onCommand) {
    chrome.commands.onCommand.addListener(async (command) => {
      try {
        if (command === COMMAND_TOGGLE_IMMERSIVE) {
          const currentWin = await chrome.windows.getCurrent();
          if (currentWin?.id) {
            await toggleImmersiveMode(currentWin.id);
          }
        }
      } catch (err) {
        logError(`Erro ao processar comando '${command}':`, err);
      }
    });
  }

  // 3. Mensagens de content scripts ou interfaces internas
  if (chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        const windowId = sender.tab?.windowId;

        if (message?.action === MESSAGE_ACTIONS.TOGGLE_IMMERSIVE) {
          (async () => {
            const winId = windowId || (await chrome.windows.getCurrent())?.id;
            const success = await toggleImmersiveMode(winId);
            sendResponse({ success });
          })();
          return true; // Resposta assíncrona
        }

        if (message?.action === MESSAGE_ACTIONS.EXIT_IMMERSIVE) {
          (async () => {
            const winId = windowId || (await chrome.windows.getCurrent())?.id;
            const success = await exitImmersiveMode(winId);
            sendResponse({ success });
          })();
          return true;
        }

        if (message?.action === MESSAGE_ACTIONS.GET_IMMERSIVE_STATE) {
          (async () => {
            const winId = windowId || (await chrome.windows.getCurrent())?.id;
            const state = await getWindowState(winId);
            sendResponse({ isImmersive: Boolean(state.isImmersive) });
          })();
          return true;
        }
      } catch (err) {
        logError('Erro no listener de mensagens:', err);
      }
      return false;
    });
  }

  // 4. Detecção de alteração de limites/fullscreen nativo (ex: usuário pressionou F11 ou Esc)
  if (chrome.windows?.onBoundsChanged) {
    chrome.windows.onBoundsChanged.addListener(async (window) => {
      try {
        const windowId = window.id;
        const current = await getWindowState(windowId);
        const isFullscreen = window.state === 'fullscreen';

        if (current.isImmersive && !isFullscreen) {
          // O usuário saiu de fullscreen por meios externos (ex: tecla Esc ou F11)
          const all = await getAllWindowState();
          all[windowId] = {
            isImmersive: false,
            previousState: window.state || 'normal',
          };
          await setAllWindowState(all);
          await broadcastWindowImmersiveState(windowId, false);
          logInfo(`Sincronização: Usuário saiu do modo imersivo externamente na janela ${windowId}.`);
        }
      } catch (err) {
        logError('Erro no listener de onBoundsChanged:', err);
      }
    });
  }

  // 5. Limpeza de estado quando a janela for fechada
  if (chrome.windows?.onRemoved) {
    chrome.windows.onRemoved.addListener(async (windowId) => {
      try {
        await removeWindowState(windowId);
      } catch (err) {
        logError(`Erro ao limpar estado da janela removida ${windowId}:`, err);
      }
    });
  }

  // 6. Sincronização quando o usuário troca de aba ativa
  if (chrome.tabs?.onActivated) {
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const state = await getWindowState(activeInfo.windowId);
        await notifyTab(activeInfo.tabId, Boolean(state.isImmersive));
      } catch (err) {
        logError('Erro ao sincronizar aba ativada:', err);
      }
    });
  }
}
