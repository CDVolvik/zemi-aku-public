# Zemi-Aku blind evaluation

Entry tested: https://zemi.r21digital.com (app at /app, control page at /compare). Logged out, incognito. No microphone. Six off-script questions after the scripted path. Speech playback pressed once.

## Browser used

T3 Code collaborative browser (Chromium, incognito profile) for the walkthrough. Page text below is quoted from the live DOM after each action.

A full-page accessibility snapshot timed out once, and role-based clicks timed out while the map was moving, so later clicks were coordinate clicks on visible controls. The page text and the URL still updated.

Phone check: the collaborative browser accepted a 390×844 viewport setting, but `window.innerWidth` stayed 1280. I remeasured in Google Chrome headless at 390×844 with device emulation. That is the only phone layout described below.

## Persona A walkthrough

Puerto Rico bakery owner, Spanish first. The scripted bakery path below started in English, because that is how /app opened. I then switched the voice/language control to Español. The shell translated. The button read "ES · Selena" and the ask field placeholder became "Pregunte por un pueblo o busque un lugar".

### Logged out /app, then Bakeries

/app loaded with the title "Zemi-Aku — ask Puerto Rico". No login wall. On screen:

"Where should I open a business in Puerto Rico?"

"Qloo's taste town by town, against the businesses the Census already counts. Pick an industry."

Chips: Cafés, Bakeries, Restaurants, Bars, Hotels, Salons. Artists: Bad Bunny, Vico C, Obie Bermúdez.

I chose Bakeries. The panel became "Where should I open a bakery?" and told me to tap a town. The legend:

"Gap: taste above the median, few businesses"

"Competitive: taste above the median, many businesses"

"Quiet: taste below the median, few businesses"

"Crowded: taste below the median, many businesses"

"Not enough data"

Then: "Taste compared with existing businesses. Not a measure of demand, revenue or profit."

Sources on that screen: businesses from "U.S. Census Bureau, County Business Patterns 2023"; taste as "Qloo heatmap affinity for bakery, averaged over the town's map cells, retrieved 2026-10-11"; people from "Puerto Rico Community Survey 2020–2024". It also said Census counts below 3 are withheld, so a missing count means 0–2 establishments, and "Taste data from the Qloo API (hackathon access)."

The ranked "strongest taste with few businesses" list did not put San Juan first:

- Río Grande, "taste #2 of 76 · 0.7 per 10,000 residents"
- Luquillo, "taste #3 of 76 · up to 1.1 per 10,000 residents"
- Fajardo, "taste #4 of 76 · 1.0 per 10,000 residents"
- San Juan, "taste #5 of 76 · 0.5 per 10,000 residents"

It withheld the top taste town: "Vieques (taste #1), Culebra (taste #8), Maunabo (taste #10) are not here: the Census withholds its count, so few or many cannot be told." "Ranks are among the 76 of 78 towns with Qloo taste data."

For a non-technical owner this is the useful part, and it is also the confusing part. San Juan is on the list, but the app's own ranking says other towns have stronger bakery taste and thin supply. The per-10,000 wording and the "up to" figures need the definitions, which were behind a closed "Definitions" disclosure.

### San Juan, bakeries

I opened San Juan. URL became `/app#town=San+Juan`. Header: "Business research · San Juan". Disclaimer: "Places recorded by Qloo, not confirmed businesses for sale. Affinities, demographics and observed supply are not proof of demand or profitability."

"What the data says": "Gap: taste above the median, few businesses · taste #5 of 76." "16 establishments with employees, 0.5 per 10,000 residents against the median of 1.3". "Qloo lists 37 places of this type; Overture, 64." It named the Census scope as NAICS 311811, retail bakeries with paid employees, and said the Qloo and Overture lists are longer because they include places without employees.

"What it cannot tell you": "Demand, sales, rents, foot traffic, permits or profit. Hours are a snapshot of the catalog on its date."

Next checks named real bakeries: "Visit El Horno de Pane, Panaderia y Reposteria America, Double Cake" and, from Overture, "Panaderia Siglo 21 and Panadería La Nueva Frontera(Julie)". Cards showed hours, for example El Horno de Pane "Today 7:00 am–2:30 pm" and "★ 4.7", and some cards said "hours not listed".

Census context: population 336,160. "Median household income: $27,992 ± $1,036 (90%) · 2024-adjusted dollars."

Qloo tags for the town: "Puerto Rican, Resort Like, Casual, Relaxing, Lively" and music "Bad Bunny, Residente, Tommy Torres, PJ Sin Suela, Pedro Capó".

The spoken line under the map used a different rate than the panel. Panel: "0.5 per 10,000 residents against the median of 1.3". Spoken: "about 5 per hundred thousand residents against a median of 13." Those are the same ratio with the denominator changed. I would not trust myself to notice that.

Evidence, which was already on this answer: "Evidence · business research · sources + live model · 4 sources · 0.4 s". Opened, it listed town_catalog (37 places), Overture release 2026-09-23.1 (64 places), Census PRCS 2020–2024, and the bakery opportunity map. "The verdict sentence is rule-based from these sources; the model wrote the closing sentences from the same data · Model deepseek/deepseek-v4.1-flash via OpenRouter · 2026-10-25 22:27 UTC".

### Spanish shell

After the scripted English path I set Language to Español. The same screen's labels became "¿Dónde abro un negocio en Puerto Rico?", "Panaderías", "Restaurantes", "Dónde abrir una panadería". Two tour buttons were labeled as English-only: "Dónde comen los fans de Bad Bunny (en inglés)" and "Vico C, en lugares reales (en inglés)". "Ponce, en español" was not marked that way. That is an honest label. The industry explanation itself was in Spanish, which is what I needed.

### Off-script, still as the owner

1. "¿Conviene abrir una panadería en Adjuntas?" The map went to Adjuntas. Spanish research panel. "Competido: afinidad sobre la mediana, muchos negocios · gusto #32 de 76." "5 establecimientos con empleados, 2.8 por cada 10,000 residentes frente a la mediana de 1.3". Population "17,960". "Ingreso mediano del hogar: $19,549 ± $1,426 (90%)". Qloo listed 2 bakery places, Overture 4. Named competitors included Robles Bakery and Kamal Bakery, plus Overture names Panaderia Sancho and Panadería La Adjunteña. The spoken line again switched units: "unos 28 por cada cien mil residentes frente a una mediana de 13." Evidence: "sin turno del modelo" and "la nota final del modelo se omitió: sus turnos del modelo de hoy se usaron" at 2026-10-25 22:31 UTC. The numbers still appeared. The model's closing note did not.

2. "¿Y allí se vende bien?" I meant Adjuntas, and whether a bakery would sell. The app searched a business name. On screen: "Busqué Alli Se Vende Bien en Adjuntas y Qloo no tiene nada. No voy a inventar." Evidence: "Evidencia · reglas · sin turno del modelo (sus turnos del modelo de hoy se usaron)". The accent was dropped and the follow-up was treated as a place called "Alli Se Vende Bien".

3. "¿Cuánta ganancia mensual da la mejor panadería de San Juan?" The app opened the San Juan overview, not a refusal about profit. The dock said: "¿Hambre en San Juan? Esto es lo que ya está en el registro. Encabezan la lista La Placita de Santurce y The Cheesecake Factory." It did not say it cannot estimate profit. The earlier bakery panel had said that, in those words. This answer did not.

4. "¿Conviene abrir una panadería en Culebra?" This template still worked without the model. "No hay datos suficientes para panaderías en Culebra: sin cifra publicada, de 0 a 2 establecimientos, y afinidad puesto 8 de 76. Qloo registra uno. Visite antes de decidir." Panel: "hasta 14.4 por cada 10,000 residentes frente a la mediana de 1.3", population "1,387", income "$29,630 ± $7,604 (90%)". Qloo 1 place (Pan Café, "Hoy 5:00 am–4:00 pm", "★ 4.2"), Overture 0. One next step was "Pida al municipio su propio conteo de negocios; el Census no publica el de aquí." Grammar slip on the same page: "1 lugares".

Phone, 390px wide, fresh English load of /app: no horizontal scrolling (`scrollWidth` 390). Industry chips wrap onto two rows. The ask bar sits on screen, but the placeholder is cut to "Ask about any town, or search". The island map shows through the tour chips, and "WATCH A TOUR" is partly covered. 2D / home / 3D sit on the right edge. /compare at 390px is a readable text page, no horizontal overflow. The model-settings paragraph wraps in a small size.

I pressed "Escuchar esta voz" once. `/api/speak` completed in about 2.4 seconds. I did not see an audio element, and the device speech engine was not speaking afterward. I cannot say the voice actually played. The menu does say "Voces de Deepgram. Pasado el límite diario, habla la voz de su dispositivo."

## Persona B walkthrough

Hackathon judge, ten minutes, checking whether the agent is real, whether Qloo changes the answer, and whether anything is faked.

### Restaurants on the same town

From the San Juan bakery screen I changed the industry to Restaurants. The verdict changed. "Competitive: taste above the median, many businesses · taste #4 of 78." "821 establishments with employees, 24.4 per 10,000 residents against the median of 9.6". "Qloo lists 941 places of this type; Overture, 1209." Named visits: La Placita de Santurce, Chocobar Cortés, Barrachina. Census scope shown as NAICS 722511 + 722513. Same town, different industry, different quadrant. That is not one hard-coded "San Juan is a good idea" card. Bakery ranks were "of 76"; restaurant ranks were "of 78", which matches the withheld-count note on the bakery list.

### "Where do Bad Bunny fans eat in San Juan?"

Asked from the San Juan ask box. The answer was on screen within a couple of seconds. Quote:

"Bad Bunny fans in San Juan lean toward places like La Placita de Santurce, the Santurce market turned nightlife hub with food stalls and outdoor dancing, 88 percent affinity. Then La Victoria on Calle Loíza, casual eating and drinking, 87 percent. And Los Kings Lounge in San Juan, cocktails with quick bites, also 87 percent. These are affinity matches from Qloo taste data, not places connected to Bad Bunny."

Cards also included El Techo Rooftop Bar at 86 percent, "Closed today", and Oasis Tapas & Lounge, "Gay bar", 86 percent. A line under the list: "Qloo lists these bars under restaurants, which is why they appear here." Los Kings Lounge was labeled "Fast food restaurant". The app is telling you the category is messy.

La Placita's card on this answer said "Open 24 hours".

Evidence, opened: "Evidence · live model · 1 tool call · 1.2 s". Body: "artist_places San Juan, Bad Bunny, food → Qloo · 5 places · 0.2 s". "Model deepseek/deepseek-v4.1-flash via OpenRouter · 2 rounds · answered 2026-10-25 22:28 UTC". Truncated ids: "FFE3…12E5, 1579…3370, 5B5D…D116, 10E8…3AB7, 55C6…A362".

I later opened La Placita from the San Juan list. The URL was `/app#town=San+Juan&place=FFE3493B-A93E-4D0B-895C-97BBA3B112E5`. The FFE3…12E5 abbreviation matches that id. The ids are not decorative random strings, at least for the first one. They are still not checkable from the evidence line alone, because the middle is hidden.

### Ask again without Qloo

The evidence panel has "Ask again without Qloo". I used it. The replacement answer:

"With Qloo: …" the same three places and percents.

"Without Qloo: The Qloo artist-affinity tool that links an artist's fans to places is off for this run, so I can't name eating spots from Bad Bunny taste data. General knowledge only: his San Juan audience tends to gather along Calle Loíza and La Placita in Santurce, the casual cafés near the Río Piedras university area, and the roadside food kiosks out in Piñones."

"Qloo changed: La Placita de Santurce, La Victoria, Los Kings Lounge"

"The places the with-Qloo answer put on the map and in the list were removed."

Evidence: "live model · without Qloo tools, no history · 0 tool calls · 1.8 s" and "Model deepseek/deepseek-v4.1-flash via OpenRouter · 1 round · answered 2026-10-25 22:28 UTC".

This is a real control, run during this session, not a screenshot. Skeptical note: the without-Qloo paragraph still names La Placita and Calle Loíza from "general knowledge", so the diff is the affinity list and the pins, not a total absence of those names. The page says the pins were removed. I did not get a second map screenshot proving the pins were gone; I am taking that sentence as what the UI claimed.

### /compare

Title: "Zemi-Aku — with and without Qloo." It says the seven pairs were "run 2026-10-24 22:24 UTC" by "scripts/compare-qloo.mjs against a local server", saved in compare-qloo.json. Same model, "1200 max tokens, reasoning low, up to 4 rounds". Six pairs drop Qloo and keep map, weather, Wikidata, and Wikipedia. The last pair keeps the place catalog and drops only taste tools.

The saved San Juan Bad Bunny pair does not match what I just got live. Saved with-Qloo names La Placita, La Victoria, and El Techo Rooftop, and "Qloo's taste signal changed: La Victoria". My live run's third named place was Los Kings Lounge, with El Techo and Oasis also on the cards. The saved catalog-only run still recommends La Placita "for a Bad Bunny kind of night" and names Bebo's Café and Casita Miramar. The footer says a place the second run names from general knowledge is not verified, and that since October 23 every live answer offers Ask again without Qloo.

Other saved pairs show the model refusing when the tool is missing ("I won't invent one", "no le invento nombres") and also show tool failures: "town_weather → refused: Too many tool calls in one round" on Maricao, and "artist_places Trujillo Alto, Calle 13 → refused: dropped to fit the request". The Ponce mofongo pair says `find_places` returned 0 places for mofongo, then the with-Qloo answer still names Viktor Pollo and La Guarina Bakery as criolla stand-ins. That is labeled as not a verified mofongo match. It is also how a demo starts sliding from "no data" into nearby suggestions.

In this browser, /compare's navigation timing was about 49 ms to load (likely cached). A cold Chrome load of the same URL was 824 ms. A later /app navigation in the collaborative browser was 473 ms; cold Chrome at 390px was about 1.5 s. Nothing felt stalled on the happy path.

### After the model turns ran out

The scripted path used live model turns (San Juan bakery closing note, Bad Bunny, without-Qloo). The next questions were marked "sin turno del modelo" / "sus turnos del modelo de hoy se usaron". The structured "should I open a bakery in [town]" path still returned Census, Overture, and Qloo counts. Artist and follow-up questions fell through to a name search:

- "¿Dónde comen los fans de Vico C en Mayagüez?" became "Busqué Comen Vico C en Mayagüez y Qloo no tiene nada. No voy a inventar." The technical record said "GET /search · place · 12 miles around Mayagüez" and "no place whose name or genre matches “Comen Vico C”". The town did change to Mayagüez. The artist tool did not run.
- "¿Hay panaderías en Villa Joviana?" became a search for "Panaderia Villa Joviana" within 12 miles of San Juan, the town already on screen. Same "no voy a inventar" line.

So the agent I saw on Bad Bunny was real. Ten minutes later the same kind of question was a keyword search, and the UI still answered with confidence. The evidence header says the rules router answered from the saved catalog, while the technical record says a Qloo GET /search. Both lines were on screen. I cannot tell which layer actually ran.

### Place page, looking for fabricated detail

La Placita's place page, UI in Spanish: "Bar · San Juan", "$$", "★ 4.7", "Hoy 5:00 pm–3:00 am". The description is English and marked "Qloo · en inglés". "A sus fans también les gusta" then "Qloo no tiene conexiones de gusto para este lugar." Audience block: "Qloo no tiene datos de público para este lugar." It still offers "Brillo violeta: las 20 zonas de la isla donde el gusto por La Placita de Santurce es más fuerte."

Contact, all on one card: address "300 C. dos Hermanos San Juan, 00909", phone "+17873071364" attributed to Qloo, website mardelnyinc.com, and a second phone "+17872006495" attributed to Overture. "OpenStreetMap no tiene este lugar en este punto."

The hours on this page (5:00 pm–3:00 am) contradict the Bad Bunny card from the same session ("Open 24 hours").

The previous Culebra bakery verdict was still sitting in the dock on the La Placita page, including "No hay datos suficientes para panaderías en Culebra" and the Pan Café card. Opening a different place did not clear it.

San Juan's town overview, reached while the profit question was misread, showed "342,259 habitantes · Wikidata" against the business-research figure of 336,160 from PRCS. Both are labeled with a source. They are still two populations for one city with no reconciliation.

### What the front page admits

The front page states the siting verdict is rule-based and the model writes the closing note, that Qloo results are aggregate, that Google image URLs 403 so cards fall back to an aerial, that "Plaza Las Americas" by name returned malls in Mexico so follow-ups use Qloo ids, and that a five-place sample hid most of the island (7,717 places, 7 October 2026). The limits section says it is not a census, affinity is not foot traffic, eleven municipalities have fewer than 25 Qloo places, and hours can be stale. The live bakery panels matched those limits. I did not independently call the Qloo API.

Footer link "Notes for Qloo" is a separate SEO note about qloo.com dated October 21, 2026. It is not judge instructions and it is not the product.

## Defects

**High.** After a few live model answers, this logged-out session was told today's model turns were used. Questions the product advertises then became place-name searches. "¿Dónde comen los fans de Vico C en Mayagüez?" was answered "Busqué Comen Vico C en Mayagüez y Qloo no tiene nada. No voy a inventar." "¿Y allí se vende bien?" searched "Alli Se Vende Bien". "¿Cuánta ganancia mensual da la mejor panadería de San Juan?" opened a generic San Juan popularity list ("¿Hambre en San Juan?") and did not repeat the profit limitation. Repro: run the scripted Bad Bunny question and Ask again without Qloo, then ask any of those three. The structured bakery-in-a-town template still worked.

**Med.** The spoken verdict and the research panel use different denominators for the same ratio. San Juan bakeries: panel "0.5 per 10,000" and median 1.3; spoken line "about 5 per hundred thousand" and median 13. Adjuntas, in Spanish: panel "2.8 por cada 10,000" and median 1.3; spoken "28 por cada cien mil" and median 13. Repro: Bakeries, open San Juan, compare "What the data says" with the Zemi-Aku line under the map.

**Med.** La Placita hours disagree inside one session. The Bad Bunny card said "Open 24 hours". The place page said "Hoy 5:00 pm–3:00 am". Repro: ask the Bad Bunny question, then open La Placita de Santurce from the San Juan list.

**Med.** The answer dock survives navigation. On La Placita's page the dock still showed the Culebra bakery verdict and the Pan Café card. Repro: ask the Culebra bakery question, then open another place.

**Med.** /compare is a saved run from 2026-10-24 22:24 UTC, and its San Juan Bad Bunny answer is not the live one. Live third name was Los Kings Lounge, with El Techo and Oasis also listed. The saved pair names El Techo and says the taste signal changed only La Victoria. The page discloses the timestamp. A judge who treats /compare as "what the button does" will still be wrong about the current answer.

**Med.** La Placita's contact block lists two phone numbers, +17873071364 (Qloo) and +17872006495 (Overture), both under "Teléfono", with no note that they disagree.

**Low.** Spanish UI still shows English Qloo copy, marked "Qloo · en inglés", and evidence lines such as "not enough data" and "release 2026-09-23.1". "1 lugares" on Culebra. At 390px the ask placeholder is clipped and the tour label sits on top of the map.

**Low.** San Juan population is 336,160 on the Census business panel and 342,259 on the Wikidata town overview. Sources are named. Nothing on screen explains the gap.

## Scores

Intelligent and thoughtful use of LLMs and the Qloo API: **4**. The live Bad Bunny run named the tool `artist_places`, returned five places with affinities, named deepseek-v4.1-flash, and a same-session "Ask again without Qloo" removed those pins and refused to invent affinity matches. The quota fallback then treated "fans of Vico C" as a business name, which is the point I will not give a 5 for.

Technical implementation and execution: **4**. Logged-out /app, industry switch, Spanish shell, evidence, and place pages all worked, and loads stayed under about two seconds. The stale dock, the unit switch, the hours conflict, and the name-search fallback are execution bugs, not missing features.

Originality and creativity: **4**. Scoring all 78 towns by Qloo taste against County Business Patterns, then letting an artist question hit the same map, is a specific product. The with/without control is part of the app, not a slide. It is still a tool-calling map with a flash model, and the public comparison page is a recording.

Real-world application and potential impact: **4**. A bakery owner can leave with a town quadrant, a Census count, income with a margin of error, named places to visit, and a written list of what the map cannot tell her. Culebra correctly refused a supply verdict when Census suppressed the count. It will not replace a visit, and the app says so. The follow-up collapse after the model cap is what keeps this from being something she could rely on for a second question.

## Top 3 changes that would raise the score

1. Keep a judge session on the live agent long enough to finish the script plus a handful of follow-ups. When the model cap is hit, say that in the answer and stop. Do not rewrite "dónde comen los fans de Vico C" as a search for "Comen Vico C", and do not answer a profit question with "¿Hambre en San Juan?".
2. Make the number in the spoken line use the same denominator as the panel, and clear the previous answer when the place or town changes. Reconcile La Placita's "Open 24 hours" card with the place page's "Hoy 5:00 pm–3:00 am" before either is shown.
3. Put the live ablation first. Keep /compare, but show it as the 2026-10-24 recording it already admits to be, and surface full Qloo ids from the evidence line so a judge can open the place the tool returned, the way FFE3…12E5 actually opens La Placita.

## What a rival entry would need to beat this

A rival has to beat the ablation, not the map. This entry already shows a same-model, same-prompt pair, names the tools, and on the live button tells you which places disappeared when Qloo was removed. A rival that only chats about Puerto Rico, or that hides the model behind a paragraph of recommendations, loses that comparison.

To win, the rival would need all of this in one logged-out session. A Spanish follow-up that understands "¿y allí se vende bien?" as a question about the town just opened. An artist question that still calls the taste tool after several asks, or a clear stop when it cannot. One hours value and one phone per place, with the source that won. Town math that does not change from "per 10,000" to "per 100,000" between the panel and the sentence. And a next step past "go visit": a sourced rent, permit, or competitor check the owner can open, with the same "this is not profit" restraint this entry already has. Inventing revenue to sound more decisive would not beat it. This entry's refusal to invent demand is one of the reasons it scores.
