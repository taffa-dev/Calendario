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

// --- GitHub: src/frasi.json del repo di Calendario ---
// Stesso formato del file nel repo: una frase per riga
export const formattaFrasi = (frasi) => `[\n${frasi.map((f) => `  ${JSON.stringify(f)}`).join(',\n')}\n]\n`;

export function creaGitHub({ api, token, repo, ramo, percorso }) {
  const intestazioni = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'calendario-suggerimenti'
  };
  const indirizzo = `${api}/repos/${repo}/contents/${percorso}`;

  return {
    async leggiFrasi() {
      const risposta = await fetch(`${indirizzo}?ref=${encodeURIComponent(ramo)}`, { headers: intestazioni });
      if (!risposta.ok) throw new Error(`GitHub: lettura di ${percorso} non riuscita (${risposta.status})`);
      const { content, sha } = await risposta.json();
      return { frasi: JSON.parse(Buffer.from(content, 'base64').toString('utf8')), sha };
    },
    // Restituisce lo sha del commit creato
    async scriviFrasi(frasi, sha, messaggio) {
      const risposta = await fetch(indirizzo, {
        method: 'PUT',
        headers: { ...intestazioni, 'content-type': 'application/json' },
        body: JSON.stringify({ message: messaggio, content: Buffer.from(formattaFrasi(frasi)).toString('base64'), sha, branch: ramo })
      });
      if (!risposta.ok) throw new Error(`GitHub: scrittura di ${percorso} non riuscita (${risposta.status}: ${await risposta.text()})`);
      return (await risposta.json()).commit.sha;
    }
  };
}
