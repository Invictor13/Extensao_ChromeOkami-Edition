/**
 * Utilitários para validação, classificação e normalização de URLs e termos de busca.
 * Compatível tanto com ES Modules (Background/NewTab/Tests) quanto com Classic Scripts (Content Scripts).
 */

export const DEFAULT_SEARCH_ENGINE_URL = 'https://www.google.com/search?q=';

export const NAVIGATION_STATUS = {
  IDLE: 'idle',
  FOCUSED: 'focused',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

// Expressão regular para validar formato de domínio (ex: example.com, sub.domain.org:8080/path)
const DOMAIN_REGEX =
  /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d{1,5})?(\/.*)?$/;

const IPV4_REGEX =
  /^(\d{1,3}\.){3}\d{1,3}(:\d{1,5})?(\/.*)?$/;

const LOCALHOST_REGEX =
  /^localhost(:\d{1,5})?(\/.*)?$/i;

/**
 * Verifica se uma string de protocolo é segura e permitida (apenas http e https).
 */
export function isAllowedProtocol(protocol) {
  if (!protocol || typeof protocol !== 'string') return false;
  const p = protocol.trim().toLowerCase();
  return p === 'http:' || p === 'https:';
}

/**
 * Verifica se a entrada parece ser uma URL ou se deve ser tratada como busca.
 * Retorna true se for URL (com protocolo explícito ou domínio válido), false para termos de busca.
 */
export function isLikelyUrl(input) {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (!trimmed) return false;

  // Se tiver espaços internos, muito provavelmente é uma consulta de busca
  if (/\s/.test(trimmed)) return false;

  // Se já tiver protocolo explícito
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    return true;
  }

  // Verifica se é localhost, IPv4 ou padrão de domínio (ex: github.com)
  if (LOCALHOST_REGEX.test(trimmed)) return true;
  if (IPV4_REGEX.test(trimmed)) return true;
  if (DOMAIN_REGEX.test(trimmed)) return true;

  return false;
}

/**
 * Normaliza e resolve o destino de navegação a partir de uma entrada textual.
 *
 * Retorna um objeto com a forma:
 * {
 *   type: 'url' | 'search' | 'empty' | 'blocked',
 *   destinationUrl: string | null,
 *   rawInput: string,
 *   error?: string
 * }
 */
export function resolveNavigationTarget(input, searchEngineUrl = DEFAULT_SEARCH_ENGINE_URL) {
  if (input === null || input === undefined) {
    return { type: 'empty', destinationUrl: null, rawInput: '' };
  }

  const trimmed = String(input).trim();
  if (!trimmed) {
    return { type: 'empty', destinationUrl: null, rawInput: '' };
  }

  // Detecta protocolos perigosos ou bloqueados explicitamente
  const lower = trimmed.toLowerCase();
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'file:',
    'chrome:',
    'chrome-extension:',
    'devtools:',
    'view-source:',
    'about:',
    'blob:',
    'vbscript:',
  ];

  for (const proto of dangerousProtocols) {
    if (lower.startsWith(proto)) {
      return {
        type: 'blocked',
        destinationUrl: null,
        rawInput: trimmed,
        error: `Protocolo não permitido: ${proto}`,
      };
    }
  }

  // Se tiver protocolo com scheme (ex: http://, https://, ftp://)
  // Nota: localhost:3000 possui dois pontos seguido de porta, e não de barra dupla ://
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
  if (schemeMatch) {
    const protocol = schemeMatch[1].toLowerCase();
    if (protocol !== 'http' && protocol !== 'https') {
      return {
        type: 'blocked',
        destinationUrl: null,
        rawInput: trimmed,
        error: `Protocolo '${protocol}:' não autorizado para navegação direta`,
      };
    }

    try {
      const parsed = new URL(trimmed);
      if (!isAllowedProtocol(parsed.protocol)) {
        return {
          type: 'blocked',
          destinationUrl: null,
          rawInput: trimmed,
          error: `Protocolo ${parsed.protocol} não permitido`,
        };
      }
      return {
        type: 'url',
        destinationUrl: parsed.href,
        rawInput: trimmed,
      };
    } catch (_err) {
      return {
        type: 'blocked',
        destinationUrl: null,
        rawInput: trimmed,
        error: 'URL malformatada',
      };
    }
  }

  // Se não tem protocolo explícito, verificar se é URL sem protocolo ou busca
  if (isLikelyUrl(trimmed)) {
    try {
      const parsed = new URL(`https://${trimmed}`);
      return {
        type: 'url',
        destinationUrl: parsed.href,
        rawInput: trimmed,
      };
    } catch (_err) {
      // Falha ao parsear como URL: cai para busca
    }
  }

  // Caso contrário, trata como pesquisa na web
  const query = encodeURIComponent(trimmed);
  const searchUrl = `${searchEngineUrl}${query}`;
  return {
    type: 'search',
    destinationUrl: searchUrl,
    rawInput: trimmed,
  };
}
