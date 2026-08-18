# NutriTrace v2.1 — Final integration report

Build applicativa: 2026-08-18

## Runtime DB

- Runtime schema: `nutritrace-master-runtime-v2-post-audit`
- Runtime version: `1.0`
- Master sorgente: POST-AUDIT v1.0, test suite 66/66.
- 38.072 alimenti.
- 105 nutrienti/componenti canonici.
- 1.341.239 valori numerici.
- 28.216 N/D espliciti.
- 1.237 alimenti multi-fonte.
- 64 chunk.
- Grade: A 3.708; B 20.576; C 1.316.193; D 762.
- 771 quarantene aggiuntive applicate dal runtime builder alle contraddizioni cross-nutrient residue.

## Regole runtime

- `unknown != 0`.
- Quarantene/N-D non sono numeriche.
- A/B/C disponibili nella scheda alimento.
- D rimane informativo ma è escluso dai ranking di carenza.
- AI estimates esclusi dai ranking di carenza.
- Per classificare una carenza serve coverage >=65% sugli alimenti effettivamente registrati.
- Provenance sintetica e range rimangono disponibili; lineage completo resta nel Master auditabile.

## Migrazione

I record locali provenienti dal precedente Master vengono aggiornati al RuntimeDB v1.0 quando il `masterId` è ancora presente. L'`id` locale rimane invariato affinché le registrazioni storiche del diario continuino a risolvere lo stesso alimento.

## OpenRouter

Le Vercel Functions restano server-side e utilizzano `OPENROUTER_API_KEY`; nessuna chiave è incorporata nel bundle client.

## Verifiche richieste prima del deploy

- sintassi JavaScript delle tre unità applicative;
- 64/64 chunk leggibili;
- index -> chunk completo;
- checksum runtime;
- nessun D/AI nel calcolo delle carenze;
- benchmark banana/cioccolato;
- smoke HTTP statico;
- controllo assenza secret nel pacchetto.
