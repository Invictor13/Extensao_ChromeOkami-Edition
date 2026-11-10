import {
  COMMAND_TOGGLE_IMMERSIVE,
  COMMAND_TOGGLE_HUD_VISIBILITY,
  MESSAGE_ACTIONS,
  READINESS_STATUS,
  STORAGE_KEYS,
  DEFAULT_SEARCH_ENGINE_URL,
} from '../../shared/constants/index.js';
import { resolveNavigationTarget } from '../../shared/utils/navigation.js';
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
 * Verifica se a URL de uma aba é suportada para injeção e comunicação de Content Scripts.
 * Bloqueia páginas internas do navegador (chrome://, devtools://, about:, chrome-extension://)
 * e o Chrome Web Store onde injeção não é permitida por segurança.
 */
export function isSupportedUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();

  if (
    trimmed.startsWith('chrome://') ||
    trimmed.startsWith('chrome-extension://') ||
    trimmed.startsWith('devtools://') ||
    trimmed.startsWith('about:') ||
    trimmed.startsWith('view-source:') ||
    trimmed.includes('chromewebstore.google.com') ||
    trimmed.includes('chrome.google.com/webstore')
  ) {
    return false;
  }

  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * Envia um ping para o Content Script de uma aba para testar se ele está ativo e respondendo.
 */
export async function pingContentScript(tabId) {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs?.sendMessage) return false;
    const response = await chrome.tabs.sendMessage(tabId, { action: MESSAGE_ACTIONS.PING });
    // Aceita tanto status 'ready' com controllerAvailable quanto retrocompatibilidade com 'ok'
    if (!response) return false;
    if (response.status === READINESS_STATUS.READY || response.readiness?.controllerAvailable) {
      return true;
    }
    if (response.status === 'ok' && (!response.readiness || response.readiness.controllerAvailable !== false)) {
      return true;
    }
    return false;
  } catch (_err) {
    return false;
  }
}

/**
 * Garante que o Content Script esteja carregado e pronto na aba especificada.
 * Caso não esteja ativo e a aba seja elegível (HTTP/HTTPS), realiza injeção programática
 * de recuperação utilizando a API chrome.scripting.
 */
export async function ensureContentScript(tabId) {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs?.get) return false;

    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url || !isSupportedUrl(tab.url)) {
      return false;
    }

    // Testa se o Content Script já está ativo e respondendo
    const isAlive = await pingContentScript(tabId);
    if (isAlive) {
      return true;
    }

    // Se a API chrome.scripting estiver disponível, injeta os scripts na mesma ordem do manifesto
    if (chrome.scripting?.executeScript) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: [
            'src/content/components/OkamiHUDRoot.js',
            'src/content/index.js',
          ],
        });

        // Aguarda breve confirmação de inicialização com retentativas limitadas
        for (let attempt = 0; attempt < 3; attempt++) {
          const confirmed = await pingContentScript(tabId);
          if (confirmed) {
            logInfo(`Content Script recuperado com sucesso na aba ${tabId} (${tab.url})`);
            return true;
          }
          await new Promise((resolve) => setTimeout(resolve, 60));
        }
      } catch (injectionError) {
        // Registra se for um erro inesperado de permissão ou execução
        logError(`Falha na injeção programática de recuperação na aba ${tabId}:`, injectionError);
        return false;
      }
    }

    return false;
  } catch (err) {
    logError(`Erro ao verificar ou recuperar Content Script na aba ${tabId}:`, err);
    return false;
  }
}

/**
 * Notifica com segurança uma aba sobre a alteração do modo imersivo com recuperação programática se necessário.
 */
export async function notifyTab(tabId, isImmersive) {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs?.sendMessage) return;

    // Tenta envio direto
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: MESSAGE_ACTIONS.IMMERSIVE_STATE_CHANGED,
        isImmersive,
      });
      return;
    } catch (_sendErr) {
      // Falha direta: tenta recuperar se for uma aba suportada
      const ready = await ensureContentScript(tabId);
      if (ready) {
        await chrome.tabs.sendMessage(tabId, {
          action: MESSAGE_ACTIONS.IMMERSIVE_STATE_CHANGED,
          isImmersive,
        });
      }
    }
  } catch (_err) {
    // Falha silenciosa e controlada em abas onde content script não executa
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
          await notifyTab(tab.id, isImmersive);
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

  // 2. Atalhos de teclado registrados no manifesto
  if (chrome.commands?.onCommand) {
    chrome.commands.onCommand.addListener(async (command) => {
      try {
        if (command === COMMAND_TOGGLE_IMMERSIVE) {
          const currentWin = await chrome.windows.getCurrent();
          if (currentWin?.id) {
            await toggleImmersiveMode(currentWin.id);
          }
        } else if (command === COMMAND_TOGGLE_HUD_VISIBILITY) {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            if (activeTab.url && !isSupportedUrl(activeTab.url)) {
              // Em páginas restritas, não polui log com falhas esperadas
              return;
            }

            try {
              await chrome.tabs.sendMessage(activeTab.id, {
                action: MESSAGE_ACTIONS.TOGGLE_HUD_VISIBILITY,
              });
            } catch (_err) {
              // Recupera content script se ausente e tenta reenviar
              const ready = await ensureContentScript(activeTab.id);
              if (ready) {
                try {
                  await chrome.tabs.sendMessage(activeTab.id, {
                    action: MESSAGE_ACTIONS.TOGGLE_HUD_VISIBILITY,
                  });
                } catch (retryErr) {
                  logError(`Erro ao enviar '${COMMAND_TOGGLE_HUD_VISIBILITY}' após recuperação:`, retryErr);
                }
              }
            }
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

        // Navegação funcional na aba atual requisitada pelo Okami HUD
        if (message?.action === MESSAGE_ACTIONS.NAVIGATE_TAB) {
          (async () => {
            try {
              const tabId = sender.tab?.id;
              if (!tabId) {
                sendResponse({
                  success: false,
                  error: 'Aba de origem não identificada.',
                });
                return;
              }

              // Valida se a aba atual está em uma URL HTTP/HTTPS suportada
              if (sender.tab?.url && !isSupportedUrl(sender.tab.url)) {
                sendResponse({
                  success: false,
                  error: 'Navegação não permitida a partir desta página.',
                });
                return;
              }

              const rawQuery = message.query;
              const result = resolveNavigationTarget(rawQuery, DEFAULT_SEARCH_ENGINE_URL);

              if (result.type === 'empty') {
                sendResponse({
                  success: false,
                  error: 'Entrada vazia.',
                  target: null,
                });
                return;
              }

              if (result.type === 'blocked' || !result.destinationUrl) {
                sendResponse({
                  success: false,
                  error: result.error || 'Protocolo ou endereço bloqueado por segurança.',
                  target: null,
                });
                return;
              }

              // Validação adicional de protocolo de destino: apenas http e https
              const dest = result.destinationUrl.toLowerCase();
              if (!dest.startsWith('http://') && !dest.startsWith('https://')) {
                sendResponse({
                  success: false,
                  error: 'Apenas protocolos HTTP e HTTPS são autorizados.',
                  target: null,
                });
                return;
              }

              logInfo(`Navegando aba ${tabId} para: ${result.destinationUrl}`);
              await chrome.tabs.update(tabId, { url: result.destinationUrl });

              sendResponse({
                success: true,
                destinationUrl: result.destinationUrl,
                type: result.type,
              });
            } catch (navErr) {
              logError('Falha ao executar navegação na aba:', navErr);
              sendResponse({
                success: false,
                error: navErr.message || 'Falha ao atualizar aba.',
              });
            }
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
