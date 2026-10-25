/** Fixed assets only. Never interpolate report values into executable CSS or JS. */
export const htmlStyle = `
:root {
  color-scheme: light;
  --bg: #f5f7fa;
  --surface: #fff;
  --subtle: #f0f3f7;
  --ink: #17243e;
  --muted: #526079;
  --line: #dce3ed;
  --accent: #087c70;
  --accent-soft: #e3f5f0;
  --red: #b32942;
  --red-soft: #fff0f2;
  --amber: #865400;
  --amber-soft: #fff5d9;
  --blue: #326dde;
  --shadow: 0 12px 40px #17243e08;
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #101827;
  --surface: #182338;
  --subtle: #202d43;
  --ink: #eef3fc;
  --muted: #a6b5ce;
  --line: #34425a;
  --accent: #6ce4ce;
  --accent-soft: #143e3d;
  --red: #ff9aaa;
  --red-soft: #432a39;
  --amber: #f3ce7c;
  --amber-soft: #3c3527;
  --blue: #92b6ff;
  --shadow: none;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --bg: #101827;
    --surface: #182338;
    --subtle: #202d43;
    --ink: #eef3fc;
    --muted: #a6b5ce;
    --line: #34425a;
    --accent: #6ce4ce;
    --accent-soft: #143e3d;
    --red: #ff9aaa;
    --red-soft: #432a39;
    --amber: #f3ce7c;
    --amber-soft: #3c3527;
    --blue: #92b6ff;
    --shadow: none;
  }
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font:
    15px/1.6 system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}
button,
input,
select {
  font: inherit;
  color: inherit;
}
button,
select {
  cursor: pointer;
}
button,
input,
select {
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
  padding: 9px 13px;
}
button:hover {
  border-color: var(--accent);
}
button:focus-visible,
input:focus-visible,
select:focus-visible,
summary:focus-visible {
  outline: 3px solid var(--blue);
  outline-offset: 3px;
}
button[aria-pressed="true"] {
  background: var(--ink);
  color: var(--surface);
  border-color: var(--ink);
}
[hidden] {
  display: none !important;
}
html[lang="en"] .locale-zh,
html[lang="zh-CN"] .locale-en {
  display: none;
}
main {
  max-width: 1240px;
  margin: auto;
  padding: 36px 40px 24px;
}
.topbar,
.toolbar,
.section-head,
.case-title,
.coverage-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 9px;
  font:
    700 15px ui-monospace,
    monospace;
}
.eyebrow {
  font:
    600 10px/1.6 ui-monospace,
    monospace;
  letter-spacing: 1.5px;
  color: var(--muted);
}
.brand strong {
  display: block;
  font-size: 16px;
  letter-spacing: -0.4px;
}
.controls {
  display: flex;
  gap: 8px;
}
.hero {
  padding: 44px 0 24px;
}
.hero h1 {
  font-size: clamp(30px, 4vw, 44px);
  line-height: 1.15;
  letter-spacing: -1.6px;
  margin: 12px 0;
}
.hero p {
  margin: 0;
  color: var(--muted);
}
.offline {
  color: var(--accent);
  font:
    600 11px ui-monospace,
    monospace;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin: 4px 0 22px;
}
.metric {
  padding: 18px 20px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: var(--shadow);
}
.metric-label {
  color: var(--muted);
  font-size: 12px;
}
.metric-value {
  font:
    600 32px/1.6 ui-monospace,
    monospace;
  letter-spacing: -1px;
}
.metric.passed .metric-value {
  color: var(--accent);
}
.metric.failed .metric-value {
  color: var(--red);
}
.metric.blocked .metric-value {
  color: var(--amber);
}
.banner {
  border: 1px solid var(--line);
  border-left: 4px solid var(--accent);
  border-radius: 10px;
  padding: 17px 20px;
  background: var(--accent-soft);
  margin-bottom: 26px;
}
.banner.failure,
.banner.incomplete {
  border-left-color: var(--red);
  background: var(--red-soft);
}
.banner.blocked {
  border-left-color: var(--amber);
  background: var(--amber-soft);
}
.banner strong {
  display: block;
  font-size: 16px;
}
.banner p {
  margin: 5px 0 0;
  font-size: 13px;
  color: var(--muted);
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  align-items: start;
  gap: 24px;
}
.section-head {
  margin-bottom: 15px;
}
.section-head h2,
h2 {
  font-size: 19px;
  letter-spacing: -0.4px;
  margin: 0;
}
.section-kicker {
  color: var(--muted);
  font:
    11px ui-monospace,
    monospace;
}
.search {
  width: 100%;
  margin-bottom: 12px;
}
.filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.filters button {
  font-size: 12px;
  padding: 6px 10px;
}
.case {
  border: 1px solid var(--line);
  border-radius: 11px;
  margin-bottom: 10px;
  background: var(--surface);
  overflow: hidden;
}
.case summary {
  padding: 16px 18px;
  cursor: pointer;
  list-style: none;
}
.case summary::-webkit-details-marker {
  display: none;
}
.case summary:after {
  content: "+";
  float: right;
  color: var(--muted);
}
.case[open] summary:after {
  content: "−";
}
.case-title {
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 10px;
  margin-right: 16px;
}
.case-id {
  font:
    600 13px ui-monospace,
    monospace;
  overflow-wrap: anywhere;
}
.tool {
  display: block;
  font:
    11px ui-monospace,
    monospace;
  color: var(--muted);
  margin-top: 5px;
  overflow-wrap: anywhere;
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 5px;
  font-size: 10px;
  letter-spacing: 0.5px;
  padding: 3px 7px;
  font-weight: 700;
  background: var(--subtle);
  color: var(--muted);
}
.badge:before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.badge.passed {
  color: var(--accent);
  background: var(--accent-soft);
}
.badge.failed {
  color: var(--red);
  background: var(--red-soft);
}
.badge.blocked {
  color: var(--amber);
  background: var(--amber-soft);
}
.case-body {
  border-top: 1px solid var(--line);
  padding: 16px 18px;
}
.detail-label {
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 8px;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  font:
    12px/1.8 ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
  margin: 8px 0;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--subtle);
}
.coverage {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 21px;
}
.coverage h2 {
  font-size: 17px;
  margin-bottom: 14px;
}
.coverage-heading {
  font-size: 11px;
  margin: 20px 0 8px;
}
.coverage-heading strong {
  color: var(--accent);
}
.coverage p,
.coverage li {
  font-size: 12px;
  color: var(--muted);
}
.coverage dl {
  margin: 10px 0 16px;
}
.coverage dt {
  font-size: 11px;
  color: var(--muted);
}
.coverage dd {
  margin: 0 0 10px;
  font:
    12px ui-monospace,
    monospace;
  overflow-wrap: anywhere;
}
.coverage ul {
  padding-left: 18px;
}
.coverage .warning {
  padding-top: 15px;
  border-top: 1px solid var(--line);
}
.enum-row {
  font-size: 11px;
  padding: 10px 0;
  border-top: 1px solid var(--line);
}
code {
  font-family: ui-monospace, monospace;
  overflow-wrap: anywhere;
}
.muted {
  color: var(--muted);
}
.empty {
  border: 1px dashed var(--line);
  border-radius: 11px;
  padding: 32px 20px;
  text-align: center;
  color: var(--muted);
}
.run-errors {
  margin: 0 0 24px;
}
.run-errors h2 {
  font-size: 15px;
}
.example {
  display: inline-block;
  margin-top: 14px;
  padding: 4px 9px;
  border: 1px dashed var(--line);
  border-radius: 5px;
  font-size: 11px;
  color: var(--muted);
}
footer {
  border-top: 1px solid var(--line);
  margin-top: 32px;
  padding: 18px 0 4px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 11px;
  color: var(--muted);
}
noscript {
  display: block;
  margin-top: 16px;
  color: var(--muted);
  font-size: 12px;
}
@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .coverage {
    margin-top: 16px;
  }
}
@media (max-width: 540px) {
  main {
    padding: 22px 18px;
  }
  .topbar {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .hero {
    padding-top: 30px;
  }
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .metric:last-child {
    grid-column: span 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .metric {
    padding: 12px 16px;
  }
  .metric-value {
    font-size: 27px;
  }
  .controls {
    margin-left: auto;
  }
  .controls select {
    max-width: 145px;
  }
  .case summary {
    padding: 14px;
  }
  footer {
    flex-direction: column;
  }
  .eyebrow {
    font-size: 9px;
  }
}
@media print {
  .controls,
  .search,
  .filters {
    display: none;
  }
  .layout {
    display: block;
  }
  .case {
    break-inside: avoid;
  }
  .coverage {
    margin-top: 24px;
  }
  main {
    padding: 0;
    max-width: none;
  }
}
`;

export const htmlScript = `
(() => {
  "use strict";
  const root = document.documentElement;
  const language = document.getElementById("language");
  const theme = document.getElementById("theme");
  const search = document.getElementById("search");
  const cards = Array.from(document.querySelectorAll(".case"));
  const buttons = Array.from(document.querySelectorAll("[data-filter]"));
  let filter = "all";
  function updateLabels() {
    document.querySelectorAll("[data-label-en]").forEach((node) => {
      const label = node.getAttribute(
        root.lang === "zh-CN" ? "data-label-zh" : "data-label-en",
      );
      node.setAttribute("aria-label", label);
      if (node === search) node.setAttribute("placeholder", label);
    });
  }
  function apply() {
    const query = search.value.trim().toLocaleLowerCase(root.lang);
    let visible = 0;
    cards.forEach((card) => {
      const localeClass = root.lang === "zh-CN" ? ".locale-zh" : ".locale-en";
      const opaque = Array.from(card.querySelectorAll("[data-opaque]"))
        .map((node) => node.textContent)
        .join(" ");
      const localized = Array.from(card.querySelectorAll(localeClass))
        .map((node) => node.textContent)
        .join(" ");
      card.hidden =
        (filter !== "all" && card.getAttribute("data-status") !== filter) ||
        !(opaque + " " + localized)
          .toLocaleLowerCase(root.lang)
          .includes(query);
      if (!card.hidden) visible++;
    });
    document.getElementById("empty").hidden = visible > 0 || cards.length === 0;
    document.getElementById("visible-count").textContent =
      visible + " / " + cards.length;
  }
  language.addEventListener("change", () => {
    root.lang = language.value === "zh-CN" ? "zh-CN" : "en";
    updateLabels();
    apply();
  });
  theme.addEventListener("click", () => {
    const dark =
      root.getAttribute("data-theme") === "dark" ||
      (!root.hasAttribute("data-theme") &&
        matchMedia("(prefers-color-scheme: dark)").matches);
    root.setAttribute("data-theme", dark ? "light" : "dark");
    theme.setAttribute("aria-pressed", String(!dark));
  });
  theme.setAttribute(
    "aria-pressed",
    String(matchMedia("(prefers-color-scheme: dark)").matches),
  );
  buttons.forEach((button) =>
    button.addEventListener("click", () => {
      filter = button.getAttribute("data-filter");
      buttons.forEach((other) =>
        other.setAttribute("aria-pressed", String(other === button)),
      );
      apply();
    }),
  );
  search.addEventListener("input", apply);
  updateLabels();
  apply();
})();
`;
