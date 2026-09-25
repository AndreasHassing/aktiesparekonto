# Aktiesparekonto

Dansk, responsiv informationsside og læringsberegner til GitHub Pages.

Siden forklarer aktiesparekonto og illustrerer indbetaling, afkast, ETF-omkostninger og beskatning med kildehenvisninger til Skattestyrelsen.

## GitHub Pages

Siden er statisk og kræver hverken installation, byggetrin eller eksterne biblioteker.

1. Åbn repositoryets **Settings → Pages**.
2. Vælg **Deploy from a branch**, den branch siden skal udgives fra, og **/ (root)**.
3. Gem. Siden bliver tilgængelig på <https://andreashassing.github.io/aktiesparekonto/>.

Alle lokale ressourcer bruger relative stier, så siden også virker under repositoryets undermappe.

## Lokal visning og test

Kør fra repositoryets rod:

```sh
python -m http.server 8000
```

Åbn <http://localhost:8000>. Brug en webserver frem for at åbne HTML-filen direkte, da beregneren bruger JavaScript-moduler.

Med Node.js 22 eller nyere kan beregningernes tests køres uden installation:

```sh
npm test
```

Der er ingen separat build- eller lintopsætning.

## Beregningsmodel

- Én indbetaling på en ny, tom konto; indskudsloftet for 2026 er 174.200 kr.
- Konstant årligt bruttoafkast med geninvesterede udbytter; 7 % er kun et eksempel.
- ETF-omkostning (standard 0,2 %) trækkes fra værdien efter årets afkast.
- 17 % lagerbeskatning af nettoafkastet. Negativ skat fremføres til modregning på samme konto, ikke til kontant udbetaling.
- Skatten trækkes fra kontoen ved årets slutning som en forenkling. Ekstra indskud til skattebetaling indgår ikke.
- Ingen inflation, kurtage, depotgebyrer, valutaveksling eller udenlandsk udbytteskat.

Skattemodellen findes i `calculator.js`; visning og interaktion i `app.js`. Testene dækker bl.a. renters rente, omkostninger, tabsmodregning, totalt tab og ugyldige input.

Skatteregler og kildehenvisning: [Skattestyrelsen om aktiesparekonto](https://skat.dk/borger/aktier-og-andre-vaerdipapirer/aktiesparekonto). Ved opdatering af indskudsloftet skal både `calculator.js`, HTML-felter og -tekst, valideringsbeskeden i `app.js` og denne beskrivelse opdateres. Kildedatoen på siden skal afspejle den seneste faktakontrol.

Brugerens input behandles udelukkende i browseren. Siden bruger ikke cookies, analyseværktøjer eller eksterne skrifttyper.
