// Accès à la fonction serveur des scénarios partagés (netlify/functions/scenarios.mjs).
// Le code formateur n'est jamais conservé : le serveur le vérifie et renvoie un jeton valable 2 h.

const URL = '/.netlify/functions/scenarios';
const TOKEN_KEY = 'lp15.token';

async function call(path, options) {
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    const e = new Error('Serveur injoignable');
    e.offline = true;
    throw e;
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* réponse non JSON (ex. développement local sans fonctions) */
  }
  if (!res.ok || !data) {
    const e = new Error(data?.error ?? `Erreur ${res.status}`);
    e.status = res.status;
    e.needLogin = Boolean(data?.needLogin);
    e.offline = !data; // pas de réponse JSON : les fonctions ne sont pas disponibles
    throw e;
  }
  return data;
}

export const fetchServerScenarios = () => call(URL, { cache: 'no-store' });

export function login(code) {
  return call(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'login', code }),
  }).then((r) => {
    saveToken(r);
    return r.token;
  });
}

const authed = (token, body) =>
  call(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

export const saveScenarioOnServer = (token, scenario) => authed(token, { action: 'save', scenario });
export const deleteScenarioOnServer = (token, id) => authed(token, { action: 'delete', id });

// Jeton conservé pour la session du navigateur seulement (jamais le code lui-même)
function saveToken({ token, expiresAt }) {
  try {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt }));
  } catch {
    /* stockage indisponible */
  }
}
export function cachedToken() {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) ?? 'null');
    return t && t.expiresAt > Date.now() + 60_000 ? t.token : null;
  } catch {
    return null;
  }
}
export function forgetToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignoré */
  }
}
