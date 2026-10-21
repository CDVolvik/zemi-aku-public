# Tester kit (October 15–17, 2026)

Status October 17: Carlos confirms no tester feedback received yet. The five-person test,
including two Puerto Rico business owners, remains open; automated runs do not count toward it.

Five people try the live site before the freeze on October 18. Two of them should run a
business in Puerto Rico. Carlos forwards the message below; nothing else is needed from the
tester. Their questions and reactions come back by text or voicemail, in whatever language
they use.

What we want from each tester:

- Three questions in their own words, typed into the box on https://zemi.r21digital.com/app,
  on their own phone or laptop, logged out.
- One industry chip tapped on the first screen and one town tapped on the colored map.
- For each answer: did it make sense, did the map move, and did anything look wrong or
  invented. The exact question they typed, copied, is the most useful thing they can send.

## Message to forward (English)

Subject: 10 minutes on a map of Puerto Rico?

Hi [name], I built a map of Puerto Rico that answers questions about towns and businesses
from Qloo's taste data and public records. It is a hackathon entry and judges will try it
blind next week, so I need a few real people to break it first.

Open https://zemi.r21digital.com/app on your phone or laptop. No account.

1. On the first screen, pick an industry and tap any town that lights up. Read what it says.
2. Type three questions you would actually ask, in English or Spanish. Anything: where to
   eat, what a town is like, whether a kind of business makes sense somewhere.
3. Text me the three questions exactly as you typed them, and for each one: did the answer
   make sense, did the map move, and was anything wrong or made up.

Ten minutes. If something fails, a screenshot helps. Thank you.

## Mensaje para reenviar (español)

Asunto: ¿10 minutos con un mapa de Puerto Rico?

[Nombre], hice un mapa de Puerto Rico que contesta preguntas sobre pueblos y negocios con los
datos de gusto de Qloo y récords públicos. Es para un hackathon y los jueces lo van a probar a
ciegas la semana que viene, así que necesito que gente real lo rompa primero.

Abre https://zemi.r21digital.com/app en el celular o la laptop. No hay que registrarse.

1. En la primera pantalla escoge una industria y toca cualquier pueblo que se ilumine. Lee lo
   que dice.
2. Escribe tres preguntas que de verdad harías, en español o inglés. Lo que sea: dónde comer,
   cómo es un pueblo, si cierto negocio tiene sentido en algún sitio.
3. Mándame las tres preguntas tal cual las escribiste y, de cada una: si la respuesta tuvo
   sentido, si el mapa se movió y si algo estaba mal o inventado.

Diez minutos. Si algo falla, un screenshot ayuda. Gracias.

## Extra ask for the two business owners

After the three questions, type the question they actually have about their own business
or a next location, in their words. That answer is the one to read closely: does it compare
taste with supply honestly, does it over-promise, is the Census or Overture line
understandable without explanation.

Plan item 4 quotes them in the description, which needs their written OK. A text reply counts.
Send this after their answers come back:

> One more thing: whether or not the answer about your business helped, can I quote what you
> texted me, with your name and business, in the hackathon write-up? A "yes" by text is enough.
> No problem if you'd rather not.

> Una cosa más: si la contestación sobre tu negocio te sirvió (o no), ¿me dejas citar lo que me
> escribas, con tu nombre y el del negocio, en la descripción del hackathon? Con un "sí" por
> texto basta. Si prefieres que no, no hay problema.

Without that yes, the description can say the test happened but cannot quote or name them.

## Scoring what comes back

Put each tester's questions in a JSON file as `[lang, question]` pairs and replay them
against the live site:

```
node scripts/judge-dryrun.mjs https://zemi.r21digital.com tmp/tester-<name>.json
```

Score each row the way `JUDGE-DRYRUN-2026-10-14.md` does: mode (model, rules, replay),
tools called, verdict. A verdict is one of:

- OK: real places or numbers, labeled sources, map moved when it should.
- Honest miss: the answer says what it could not find, no invention.
- Fail: wrong town, invented place, keyword answer that misreads the question, error, or
  more than 15 seconds.

Only a Fail changes code before the freeze. An Honest miss goes in the walkthrough's limits
list if a judge is likely to hit it. Keep the tester's own words about the answer next to
the row; a tester saying "I would not trust this" on an OK row is a wording problem worth
more than a tool fix.

## Real-phone pass (October 17, Carlos)

On an iPhone and, if available, an Android, logged out:

- Dictation: tap the microphone, say "¿Qué hay para hacer en Maricao?", confirm the text
  lands in the box and the answer plays.
- Answer overlay: a long answer on a town, scroll it, dismiss the spoken caption, confirm
  the readout is readable with the caption up and after it is dismissed.
- First screen: industry chip, colored island, town readout, change the industry, back to
  the map. Nothing should need a pinch-zoom to read.
