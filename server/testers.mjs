// Requests to test the iPhone app through TestFlight: first name, last name, email.
// Checked here, kept by the server, and forwarded to TESTER_WEBHOOK_URL when one is set.

const EMAIL = /^[^\s@<>"(),;:]+@[^\s@<>"(),;:]+\.[a-z]{2,}$/i;
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

// body.website is a field people never see; a bot that fills it is turned away quietly.
export function checkTester(body = {}) {
  if (clean(body.website)) return { ok: false, bot: true };
  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const email = clean(body.email).toLowerCase();
  if (!firstName || firstName.length > 60) return { ok: false, error: "first name" };
  if (!lastName || lastName.length > 60) return { ok: false, error: "last name" };
  if (email.length > 254 || !EMAIL.test(email)) return { ok: false, error: "email" };
  return { ok: true, value: { firstName, lastName, email } };
}

// A cell that starts with = + - @ would run as a formula when the CSV opens in a spreadsheet.
function cell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n']/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function testersCsv(rows) {
  const lines = ["requested_at,first_name,last_name,email"];
  for (const row of rows) lines.push([row.at, row.firstName, row.lastName, row.email].map(cell).join(","));
  return `${lines.join("\n")}\n`;
}
