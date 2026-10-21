/** Pull concatenated <style> bodies out of an HTML document. */
export function styleText(html) {
  return [...String(html).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
}

/**
 * Split a selector list on top-level commas only, so commas inside
 * functional pseudo-classes like `:is(a, b)` stay with their selector.
 */
function splitSelectorList(selector) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of selector) {
    if (ch === "(") depth++;
    else if (ch === ")" && depth > 0) depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim().replace(/\s+/g, " ")).filter(Boolean);
}

/**
 * Parse CSS into flat rules `{ selector, declarations }`.
 * Grouped selectors become one rule per selector. @media / @supports blocks
 * are flattened (nested selectors kept as written).
 */
export function parseCssRules(css) {
  const src = String(css).replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  let i = 0;
  while (i < src.length) {
    const start = src.indexOf("{", i);
    if (start < 0) break;
    const selector = src.slice(i, start).trim().replace(/\s+/g, " ");
    let depth = 1;
    let j = start + 1;
    while (j < src.length && depth) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}") depth--;
      j++;
    }
    const body = src.slice(start + 1, j - 1);
    if (selector.startsWith("@")) {
      rules.push(...parseCssRules(body));
    } else {
      const declarations = {};
      for (const part of body.split(";")) {
        const colon = part.indexOf(":");
        if (colon < 0) continue;
        const prop = part.slice(0, colon).trim();
        const value = part.slice(colon + 1).trim();
        if (prop) declarations[prop] = value;
      }
      for (const part of splitSelectorList(selector)) {
        rules.push({ selector: part, declarations: { ...declarations } });
      }
    }
    i = j;
  }
  return rules;
}

/** First rule whose selector equals `selector` (after whitespace normalize). */
export function ruleFor(rules, selector) {
  const want = String(selector).trim().replace(/\s+/g, " ");
  return rules.find((rule) => rule.selector === want) || null;
}

/** True when any matching rule has `property` set to `value` (or any value if omitted). */
export function hasDeclaration(rules, selector, property, value) {
  const want = String(selector).trim().replace(/\s+/g, " ");
  return rules.some((rule) => {
    if (rule.selector !== want) return false;
    if (!(property in rule.declarations)) return false;
    return value === undefined || rule.declarations[property] === value;
  });
}
