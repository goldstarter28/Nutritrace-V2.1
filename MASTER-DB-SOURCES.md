# NutriTrace Runtime Food DB v1.0 — sorgenti e policy

Build runtime: 2026-08-18. Base nutrizionale standard: 100 g di parte edibile.

## Sorgenti presenti

Il runtime deriva dal Master POST-AUDIT a **14 fonti**:

- Canada — Canadian Nutrient File (input disponibile 2015, mantenuto come legacy nella provenance).
- Svizzera — Swiss Food Composition Database 7.1.
- Germania — Bundeslebensmittelschlüssel BLS 4.0 (2025).
- Danimarca — Danish Food Composition Database 6.1 (2026).
- Estonia — NutriData export 2026-08-05.
- Finlandia — Fineli Release 20.
- Francia — ANSES-CIQUAL 2025.
- Italia — CREA Food Composition Tables 2019.
- Paesi Bassi — NEVO 2025 v9.0.
- Norvegia — Norwegian Food Composition Table 2026.
- Portogallo — INSA/PortFIR 7.1 (2026).
- Svezia — Livsmedelsverkets livsmedelsdatabas 2026-07-01.
- Regno Unito — McCance and Widdowson CoFID 2021.
- USA — USDA FoodData Central Foundation Foods 2026-04-30.

Le condizioni/licenze originali restano associate alle sorgenti nel manifest. Il runtime conserva un valore NutriTrace derivato separato dai valori originali del Master auditabile.

## Regole qualità runtime

1. **N/D != 0**: assenza, trace, conflitto e quarantena non diventano zero.
2. **Grade A/B**: evidenza alta/media, utilizzabile normalmente.
3. **Grade C**: single-source/low confidence; utilizzabile, ma per la classifica delle carenze serve coverage >=65%.
4. **Grade D**: informativo; escluso dalla classifica delle carenze.
5. **AI**: nessuna stima OpenRouter è incorporata nel runtime; eventuali stime applicative sono separate ed escluse dalle carenze.
6. **Matching conservativo**: alimenti diversi per stato/preparazione/composizione restano separati.
7. **Italian ranking**: CREA/nome italiano può migliorare il ranking, senza modificare il consensus numerico.
8. **Provenance sintetica**: ogni valore conserva reliability, grade, fonti e range quando disponibile. Il lineage completo resta nel Master POST-AUDIT.
9. **Cross-nutrient hardening**: il builder runtime ha trasformato in N/D 771 consensus residui che producevano relazioni interne incompatibili.

## Dati runtime

- 38.072 alimenti.
- 105 nutrienti/componenti canonici.
- 1.341.239 valori numerici.
- 28.216 N/D espliciti.
- 1.237 alimenti multi-fonte.
- 64 chunk statici.
