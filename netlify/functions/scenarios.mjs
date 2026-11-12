// Fonction serveur Netlify : scénarios (MSP) partagés par tous les formateurs.
//
//  GET                          -> { scenarios: [...], deleted: [ids] }          (lecture libre)
//  POST { action:'login', code }-> { token, expiresAt }                          (vérification du code formateur)
//  POST { action:'save', scenario }   + en-tête Authorization: Bearer <token>    (créer / modifier)
//  POST { action:'delete', id }       + en-tête Authorization: Bearer <token>    (supprimer)
//
// Le code formateur n'est JAMAIS dans le code ni dans le dépôt : il se règle dans Netlify
// (Site configuration > Environment variables > FORMATEUR_CODE). Après 5 essais ratés depuis une même
// adresse, la connexion est bloquée 15 minutes.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { validateScenario } from '../../src/scenarios/scenarioModel.js';

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 h
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const MAX_BODY = 40 * 1024;

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra } });

const sha = (s) => createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => timingSafeEqual(sha(a), sha(b));

const sign = (code, exp) => createHmac('sha256', String(code)).update(`lp15|${exp}`).digest('hex');
function makeToken(code) {
  const exp = Date.now() + TOKEN_TTL_MS;
  return { token: `${exp}.${sign(code, exp)}`, expiresAt: exp };
}
function checkToken(code, header) {
  const m = /^Bearer\s+(\d+)\.([a-f0-9]{64})$/.exec(header ?? '');
  if (!m) return false;
  const exp = Number(m[1]);
  if (!(exp > Date.now())) return false;
  return safeEqual(sign(code, exp), m[2]);
}

const dataStore = () => getStore({ name: 'lp15-scenarios', consistency: 'strong' });
const securityStore = () => getStore({ name: 'lp15-security', consistency: 'strong' });

async function listAll() {
  const store = dataStore();
  const [sc, del] = await Promise.all([store.list({ prefix: 'sc/' }), store.list({ prefix: 'del/' })]);
  const scenarios = (await Promise.all(sc.blobs.map((b) => store.get(b.key, { type: 'json' })))).filter(Boolean);
  const deleted = del.blobs.map((b) => b.key.slice(4));
  return { scenarios, deleted };
}

export default async (req, context) => {
  const code = process.env.FORMATEUR_CODE;

  if (req.method === 'GET') {
    try {
      return json(await listAll());
    } catch (err) {
      return json({ error: 'Stockage indisponible' }, 503);
    }
  }
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: 'Requête trop volumineuse' }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Requête invalide' }, 400);
  }

  if (!code) return json({ error: 'Le code formateur n\'est pas configuré sur le serveur (variable FORMATEUR_CODE).' }, 503);

  // ---- Connexion : vérification du code avec blocage après plusieurs essais ratés ----
  if (body.action === 'login') {
    const ip = String(context?.ip ?? req.headers.get('x-nf-client-connection-ip') ?? 'inconnue').replace(/[^0-9a-fA-F:.]/g, '_');
    const sec = securityStore();
    const key = `fail/${ip}`;
    const state = (await sec.get(key, { type: 'json' })) ?? { count: 0, until: 0 };
    if (state.until > Date.now()) {
      const wait = Math.ceil((state.until - Date.now()) / 60000);
      return json({ error: `Trop d'essais. Réessayez dans ${wait} min.`, locked: true }, 429);
    }
    if (typeof body.code === 'string' && safeEqual(body.code, code)) {
      if (state.count) await sec.delete(key);
      return json(makeToken(code));
    }
    const count = state.count + 1;
    if (count >= MAX_FAILS) {
      await sec.setJSON(key, { count: 0, until: Date.now() + LOCK_MS });
      return json({ error: 'Code incorrect. Connexion bloquée 15 minutes.', locked: true }, 429);
    }
    await sec.setJSON(key, { count, until: 0 });
    return json({ error: `Code incorrect (${MAX_FAILS - count} essai(s) restant(s)).` }, 401);
  }

  // ---- Actions protégées : code formateur (jeton) obligatoire ----
  if (!checkToken(code, req.headers.get('authorization'))) {
    return json({ error: 'Code formateur requis.', needLogin: true }, 401);
  }
  const store = dataStore();

  if (body.action === 'save') {
    const v = validateScenario(body.scenario);
    if (!v.ok) return json({ error: v.error }, 400);
    const scenario = { ...v.scenario, updatedAt: Date.now() };
    await store.setJSON(`sc/${scenario.id}`, scenario);
    await store.delete(`del/${scenario.id}`);
    return json({ ok: true, scenario });
  }

  if (body.action === 'delete') {
    const id = typeof body.id === 'string' ? body.id : '';
    if (!/^[A-Za-z0-9_-]{3,60}$/.test(id)) return json({ error: 'Identifiant invalide' }, 400);
    await store.delete(`sc/${id}`);
    await store.set(`del/${id}`, '1'); // marqueur : masque aussi les scénarios de départ supprimés
    return json({ ok: true });
  }

  return json({ error: 'Action inconnue' }, 400);
};
