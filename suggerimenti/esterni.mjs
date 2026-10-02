import { createRemoteJWKSet, jwtVerify } from 'jose';

// --- Cloudflare Turnstile (il captcha del form pubblico) ---
export async function verificaTurnstile({ url, segreto }, token, ip) {
  if (!token) return false;
  const corpo = new URLSearchParams({ secret: segreto, response: token });
  if (ip) corpo.set('remoteip', ip);
  try {
    const risposta = await fetch(url, { method: 'POST', body: corpo, signal: AbortSignal.timeout(8000) });
    return (await risposta.json()).success === true;
  } catch {
    return false;
  }
}

// --- Cloudflare Access (il cancello di /admin) ---
// L'identità si legge solo dal token firmato da Access (header Cf-Access-Jwt-Assertion o cookie
// CF_Authorization), verificato contro le chiavi pubbliche del team: mai dall'header con l'email in
// chiaro, che chiunque raggiunga il container potrebbe inventarsi. Restituisce l'email o null.
export function creaVerificaAccess({ team, aud, certificati }) {
  const chiavi = createRemoteJWKSet(new URL(certificati ?? `https://${team}/cdn-cgi/access/certs`));
  return async (richiesta) => {
    const cookie = /(?:^|;\s*)CF_Authorization=([^;]+)/.exec(richiesta.headers.cookie ?? '')?.[1];
    const token = richiesta.headers['cf-access-jwt-assertion'] ?? cookie;
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, chiavi, { issuer: `https://${team}`, audience: aud });
      return typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
    } catch {
      return null;
    }
  };
}

// --- GitHub: i file di Calendario (src/frasi.json, src/ricorrenze.json) ---
// Stesso formato dei file nel repo: una voce per riga
export const formattaVoci = (voci) => (voci.length ? `[\n${voci.map((v) => `  ${JSON.stringify(v)}`).join(',\n')}\n]\n` : '[]\n');
export const formattaFrasi = formattaVoci;

export function creaGitHub({ api, token, repo, ramo, percorso }) {
  const intestazioni = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'calendario-suggerimenti'
  };
  const indirizzo = (file) => `${api}/repos/${repo}/contents/${file}`;

  // Una lista JSON del repo, qualunque sia il file, con lo sha che serve a riscriverla
  async function leggiLista(file) {
    const risposta = await fetch(`${indirizzo(file)}?ref=${encodeURIComponent(ramo)}`, { headers: intestazioni });
    if (!risposta.ok) throw Object.assign(new Error(`GitHub: lettura di ${file} non riuscita (${risposta.status})`), { stato: risposta.status });
    const { content, sha } = await risposta.json();
    return { voci: JSON.parse(Buffer.from(content, 'base64').toString('utf8')), sha };
  }

  // Restituisce lo sha del commit creato. Con 409 il file è cambiato dopo la lettura (`stato` sull'errore)
  async function scriviLista(file, voci, sha, messaggio) {
    const risposta = await fetch(indirizzo(file), {
      method: 'PUT',
      headers: { ...intestazioni, 'content-type': 'application/json' },
      body: JSON.stringify({ message: messaggio, content: Buffer.from(formattaVoci(voci)).toString('base64'), sha, branch: ramo })
    });
    if (!risposta.ok) throw Object.assign(new Error(`GitHub: scrittura di ${file} non riuscita (${risposta.status}: ${await risposta.text()})`), { stato: risposta.status });
    return (await risposta.json()).commit.sha;
  }

  return {
    leggiLista,
    scriviLista,
    async leggiFrasi() {
      const { voci, sha } = await leggiLista(percorso);
      return { frasi: voci, sha };
    },
    scriviFrasi: (frasi, sha, messaggio) => scriviLista(percorso, frasi, sha, messaggio)
  };
}
