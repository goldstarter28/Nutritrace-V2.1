NutriTrace v2.1 — Runtime Food DB auditato + OpenRouter controllato

ARCHITETTURA DATI
- Fonte primaria: NutriTrace RuntimeDB v1.0, derivato dal Master POST-AUDIT a 14 fonti.
- 38.072 alimenti runtime, 105 nutrienti/componenti canonici, 1.341.239 valori numerici e 28.216 N/D espliciti.
- 14 fonti nazionali presenti: Canada, Svizzera, Germania, Danimarca, Estonia, Finlandia, Francia, Italia, Paesi Bassi, Norvegia, Portogallo, Svezia, Regno Unito, USA.
- 64 chunk statici caricati lazy e cacheabili offline.
- N/D non viene mai trasformato in zero. Quarantene e conflitti restano non numerici.
- Ultimo hardening runtime: 771 consensus cross-nutrient incompatibili trasformati in N/D.
- Il ranking favorisce nomi/alias italiani; la preferenza italiana non altera mai i valori numerici.

GRADE / QUALITÀ
- A: evidenza alta.
- B: evidenza media.
- C: valore single-source/low confidence; resta utilizzabile ma richiede adeguata copertura dati per classificare una carenza.
- D: informativo; viene escluso dalla classifica delle carenze.
- N/D: mai conteggiato come zero.
- Distribuzione runtime: A 3.708, B 20.576, C 1.316.193, D 762.

CARENZE SETTIMANALI
- La classifica usa solo micronutrienti eleggibili: Master grade A/B/C e valori non-AI.
- Grade D e stime AI sono esclusi dalla classifica.
- Un nutriente viene classificato solo con copertura degli alimenti registrati >=65%.
- Giorni senza registrazioni non vengono considerati intake zero.
- I target giornalieri sono moltiplicati per i soli giorni registrati; i target settimanali sono prorati allo stesso numero di giorni finché la settimana non è completa.

MIGRAZIONE DA VERSIONI PRECEDENTI
- Diario, profilo, obiettivi e alimenti personali restano nelle stesse chiavi localStorage/IndexedDB.
- Gli alimenti precedentemente importati dal Master vengono rinfrescati dal RuntimeDB v1.0 quando il masterId è ancora disponibile, mantenendo l'ID locale usato dai log storici.
- Se un vecchio masterId non esiste più, il record storico locale viene conservato invece di essere cancellato.

RICERCA E RICETTE
- Ricerca Master-first con nomi italiani, inglesi e alias.
- Input libero/ricette: OpenRouter interpreta ingredienti e quantità; il database fornisce i nutrienti.
- Quantità senza massa esplicita non vengono inventate.
- Ambiguità rilevanti vengono mostrate per conferma.

AI / OPENROUTER
- OPENROUTER_API_KEY resta esclusivamente server-side nelle Vercel Functions.
- OPENROUTER_MODEL configurabile; default openrouter/free.
- /api/parse-food-entry: parsing strutturato, nessun valore nutrizionale generato.
- /api/nutrition-enrich: fallback finale; non sovrascrive il Master e può restituire N/D.
- Stime AI a bassa confidenza, zero AI e nutrienti high-risk vengono scartati/N-D.
- Le stime AI non contribuiscono alla classifica delle carenze.

DEPLOY VERCEL / GITHUB
Struttura root richiesta:
  api/nutrition-enrich.js
  api/parse-food-entry.js
  data/master/manifest.json
  data/master/index.json
  data/master/index.json.gz
  data/master/checksums.json
  data/master/chunks/00.json ... 63.json
  data/master/chunks/00.json.gz ... 63.json.gz
  app.js, index.html, style.css, sw.js, manifest.webmanifest, icone

Environment Variables:
  OPENROUTER_API_KEY=<chiave OpenRouter>
  OPENROUTER_MODEL=openrouter/free
Opzionali:
  OPENROUTER_SITE_URL=https://nutritrace.vercel.app
  OPENROUTER_APP_NAME=NutriTrace

Il Service Worker usa la cache "nutritrace-v21-runtime-audited": il nuovo deploy abbandona automaticamente la cache applicativa v2.0 precedente.
