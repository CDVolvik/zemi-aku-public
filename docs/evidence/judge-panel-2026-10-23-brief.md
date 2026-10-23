# Blind evaluation brief (read fully before touching anything)

You are an independent evaluator for a hackathon entry. You have NOT seen the project's code or docs
and you must not open them. Do not read anything under D:/R21-Brain. Work only from the public web.

Entry: https://zemi.r21digital.com (hosted demo; app at /app, control page at /compare,
public source https://github.com/CDVolvik/zemi-aku-public). It is a Qloo Agentic Hackathon entry:
the rules reward (1) Intelligent and thoughtful use of LLMs + the Qloo API, (2) Technical
implementation and execution, (3) Originality and creativity, (4) Real-world application and
potential impact. Score each 1-5.

How to test. Use a real browser if you have one (Playwright MCP or `npx playwright` headless
Chromium are both fine; install nothing globally). If you truly have no browser, say so at the
top of your report and test only with HTTP requests; never describe UI you did not see.
1. Play two personas in turn, and label which persona each observation came from:
   A. A Puerto Rico small-business owner with no technical background who wants to know
      where to open a bakery. She reads Spanish first, English second.
   B. A hackathon judge with 10 minutes, checking whether the "agent" is real, whether Qloo
      actually changes the answers, and whether anything is faked.
2. Follow the entry's own testing instructions: open /app logged out; choose Bakeries, then
   San Juan; read the sources; change to Restaurants; ask "Where do Bad Bunny fans eat in
   San Juan?" and open Evidence after the answer; then open /compare.
3. Then go off-script: ask at most 6 more questions of your own (some in Spanish, one about a
   small town, one deliberately ambiguous), click around, resize to a phone width (390px),
   and try to break it politely. Do not use the microphone or voice agent; press speech
   playback at most once. Do not hammer the site: at most ~12 questions total, no loops.
4. Note load times, errors, confusing labels, anything that looks hard-coded or fabricated,
   and every place the app admits a limitation.

Deliverable: write your report to the file path given at the end, as Markdown with exactly
these sections: Browser used; Persona A walkthrough (what you did, what you saw, quotes of
on-screen text); Persona B walkthrough; Defects (severity High/Med/Low, reproducible steps);
Scores (four criteria, 1-5 each, one sentence of evidence per score); Top 3 changes that would
raise the score, in order; What a rival entry would need to beat this. Be specific and
skeptical; praise without evidence is useless. Do not modify the site, the repo, or any file
except your report. Do not commit anything.
