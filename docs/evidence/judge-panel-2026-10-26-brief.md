# Blind evaluation brief, ninth round (read fully before touching anything)

You are an independent, critical evaluator for a hackathon entry, and an expert in the field: you know
location intelligence and retail siting, taste/recommendation APIs, LLM agents with tool use, and what wins
hackathon judging. You have NOT seen the project's code or docs and you must not open them locally. Do not read
anything on the machine you run on. Work only from the public web.

Entry: https://zemi.r21digital.com (hosted demo; app at /app, control page at /compare,
public source https://github.com/CDVolvik/zemi-aku-public). It is a Qloo Agentic Hackathon entry
(about 360 public entries; top three go to a live final). Score it twice, 1-5 per criterion:
- Official criteria: (1) Technological Implementation, (2) Design, (3) Potential Impact, (4) Quality of the Idea.
- Legacy criteria, for comparison with earlier rounds: (1) Intelligent and thoughtful use of LLMs + the Qloo API,
  (2) Technical implementation and execution, (3) Originality and creativity, (4) Real-world application and
  potential impact.

How to test. Use a real browser if you have one (Playwright MCP or `npx playwright` headless
Chromium are both fine; install nothing globally). If you truly have no browser, say so at the
top of your report and test only with HTTP requests; never describe UI you did not see.
1. Play three personas in turn, and label which persona each observation came from:
   A. A Puerto Rico small-business owner with no technical background who wants to know
      where to open a bakery. She reads Spanish first, English second.
   B. A hackathon judge with 10 minutes, checking whether the "agent" is real, whether Qloo
      actually changes the answers, and whether anything is faked.
   C. A senior location-intelligence analyst who would decide whether to put this in front of a client:
      is the method sound, are the numbers and sources defensible, where would it mislead?
2. Follow the entry's own testing instructions: open /app logged out; choose Bakeries, then
   San Juan; read the sources; change to Restaurants; ask "Where do Bad Bunny fans eat in
   San Juan?" and open Evidence after the answer; then open /compare.
3. Then go off-script: ask at most 6 more questions of your own (some in Spanish, one about a
   small town, one deliberately ambiguous), click around, resize to a phone width (390px),
   and try to break it politely. Do not use the microphone or voice agent; press speech
   playback at most once. Do not hammer the site: at most ~12 questions total, no loops.
4. Note load times, errors, confusing labels, anything that looks hard-coded or fabricated,
   and every place the app admits a limitation. Read the Evidence line on answers and say which engine answered.
5. Open the public GitHub repository logged out, as a judge would. Judge its first screen as a showcase: does the
   README make the project clear in 30 seconds, is there a visual (screenshot, GIF, diagram), are the Qloo
   endpoints and the agent's design understandable, is it easy to run and to verify? Compare it with what a winning
   entry's repo usually shows.
6. Read three rival public Devpost pages for context, no more: https://devpost.com/software/crowdspawn ,
   https://devpost.com/software/walk-in , https://devpost.com/software/tastecraft-ih58aw . Do not open their apps.

Deliverable: write your report to the file path given at the end, as Markdown with exactly
these sections: Browser used; Persona A walkthrough (what you did, what you saw, quotes of
on-screen text); Persona B walkthrough; Persona C walkthrough (expert critique of the method);
GitHub repository first impression; Defects (severity High/Med/Low, reproducible steps);
Scores (two tables, official and legacy, four criteria each, 1-5, one sentence of evidence per score);
Path to first place (at most 8 changes, ranked by expected score gain, each naming the criterion it raises, by how
much, and what it would take); What a rival entry would need to beat this, with reference to the three rivals read.
Be specific and skeptical; praise without evidence is useless. Do not modify the site, the repo, or any file
except your report. Do not commit anything.
