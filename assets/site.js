/* Beispielantworten („Frag so, wie du denkst.“): Ein Klick auf ein Beispiel öffnet die echte Antwort aus der App
 * (GET /preview/answers/{id}, ohne Login), aufgebaut wie die AnswerCard im Chat der App (midmind-app chat/Answer.tsx)
 * und Wort für Wort eingeblendet – „Streaming text“ von transitions.dev. Nachfragen gibt es hier nicht.
 */
import { Marked } from './vendor/marked.esm.js';

// Vorerst die lokale App; sobald app.midmind.de die neue App ausliefert: 'https://app.midmind.de'.
const API = 'http://localhost:8080';
const PHASES = { schwangerschaft: ['Schwangerschaft', 'apricot'], geburt: ['Geburt', 'malve'], wochenbett: ['Wochenbett', 'sage'], abrechnung: ['Abrechnung', 'taube'] };
/** Wie lange Skelett und Antwort mindestens bzw. beim Überblenden stehen (MIN_VISIBLE_MS, REVEAL_MS in der App). */
const SKELETON_MS = 700;
const REVEAL_MS = 400;
/** Diese Teile erscheinen als Ganzes statt Wort für Wort, damit nie eine leere Wert-Pille oder ein leerer Chip steht. */
const UNITS = '.mm-value, .mm-ref, .mm-source, .mm-callout, th, td';

const dialog = document.querySelector('.w-modal');
const title = dialog.querySelector('.mm-appbar__title');
const badge = dialog.querySelector('.w-modal__badge');
const question = dialog.querySelector('.mm-question');
const body = dialog.querySelector('.w-modal__body');
const slot = dialog.querySelector('.w-modal__answer');
const answers = new Map();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let opener = null;
let run = 0;
let timer = null;

// Die Texte kommen von außen: rohes HTML wird nur angezeigt, Links nur mit http(s) und in neuem Tab.
const escape = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const renderer = {
  html: ({ text }) => escape(text),
  link({ href, tokens }) {
    const text = this.parser.parseInline(tokens);
    const n = href.match(/^#quelle-(\d+)$/)?.[1];
    if (n) return `<sup class="mm-ref" aria-label="Quelle ${n}">${n}</sup>`;
    return /^https?:\/\//i.test(href) ? `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${text}</a>` : text;
  },
  image: ({ text }) => escape(text),
};
const markdown = new Marked({ gfm: true, renderer });
// In der Kurzantwort sind die fetten Stellen die Werte.
const summaryMarkdown = new Marked({ gfm: true, renderer: { ...renderer, strong({ tokens }) { return `<strong class="mm-value">${this.parser.parseInline(tokens)}</strong>`; } } });

function element(tag, className, html) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html !== undefined) el.innerHTML = html;
  return el;
}

function icon(name, size) {
  return `<svg class="mm-icon mm-callout__icon" width="${size}" height="${size}" aria-hidden="true"><use href="assets/brand.svg#${name}"/></svg>`;
}

function callout(tone, heading, text) {
  const el = element('div', `mm-callout mm-callout--${tone}`, `${icon(tone === 'critical' ? 'alert' : 'info', 24)}<div><strong class="mm-callout__title"></strong><div class="mm-callout__body"></div></div>`);
  el.setAttribute('role', tone === 'critical' ? 'alert' : 'note');
  el.querySelector('.mm-callout__title').textContent = heading;
  el.querySelector('.mm-callout__body').textContent = text;
  return el;
}

/** Wie in der App (chat/Answer.tsx): eine Antwort aus allgemeinem Wissen ist als solche markiert. */
const KNOWLEDGE_TITLE = 'Nicht aus der Fachliteratur beantwortet';
const KNOWLEDGE_TEXT = 'Diese Antwort beruht auf allgemeinem Modellwissen. Bitte fachlich prüfen.';

/** Die Antwort in der festen Reihenfolge der AnswerCard: Notfall → Kurzantwort → Werte → Erklärung → Hinweis → Quellen. */
function answerCard({ basis, alert, summary = '', facts = [], explanation = '', sources = [] }) {
  const card = element('article', 'mm-answer');
  if (alert?.title && (alert.tone === 'critical' || alert.tone === 'warning')) card.append(callout(alert.tone, alert.title, alert.text ?? ''));
  const box = element('div', 'mm-answer__summary');
  box.append(element('p', 'mm-answer__summary-text', summaryMarkdown.parseInline(summary)));
  card.append(box);
  const rows = facts.filter((f) => f?.label);
  if (rows.length) {
    const table = element('table', 'mm-facts', '<tbody></tbody>');
    for (const f of rows) {
      const tr = element('tr');
      const th = element('th');
      th.scope = 'row';
      th.textContent = f.label;
      const td = element('td');
      td.textContent = f.value ?? '';
      tr.append(th, td);
      table.tBodies[0].append(tr);
    }
    card.append(element('h4', 'mm-answer__heading', 'Gut zu wissen'), table);
  }
  if (explanation) {
    // Die App nummeriert die Fußnoten [^n] nach den Quellen.
    const body = markdown.parse(explanation.replace(/\[\^(\d+)\]/g, '[$1](#quelle-$1)'));
    card.append(element('h4', 'mm-answer__heading', 'Erklärung'), element('div', 'mm-answer__body markdown', body));
  }
  if (basis === 'knowledge') card.append(callout('info', KNOWLEDGE_TITLE, KNOWLEDGE_TEXT));
  if (sources.length) {
    const list = element('div', 'mm-sources');
    sources.forEach((s, i) => {
      // Das Kapitel ist der letzte Schritt des Pfads, z. B. „4 Das Neugeborene > 4.2.1 Trinkmenge“.
      const chapter = s.breadcrumb?.split(' > ').at(-1)?.trim();
      const chip = element('span', 'mm-source', `<span class="mm-source__n" aria-hidden="true">${i + 1}</span><span class="mm-source__t"><span></span></span>`);
      chip.querySelector('.mm-source__t > span').textContent = s.title;
      if (chapter) chip.querySelector('.mm-source__t').insertAdjacentHTML('beforeend', `<span class="mm-source__sep" aria-hidden="true">›</span><span>${escape(chapter)}</span>`);
      list.append(chip);
    });
    card.append(list);
  }
  return card;
}

/** Zerlegt die Antwort in Einblend-Einheiten: Wörter, und ganze Werte, Fußnoten, Chips, Zellen und Notfallboxen. */
function units(root) {
  const found = [];
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (!child.textContent.trim()) continue;
        const words = child.textContent.split(/(\s+)/);
        child.replaceWith(...words.map((w) => {
          if (!w.trim()) return document.createTextNode(w);
          const span = element('span', 'w-stream-w');
          span.textContent = w;
          found.push(span);
          return span;
        }));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.matches(UNITS)) {
          child.classList.add('w-stream-w');
          found.push(child);
        } else {
          walk(child);
        }
      }
    }
  };
  walk(root);
  return found;
}

/** Blendet die Einheiten nacheinander ein; ein Block der Antwort erscheint mit seiner ersten Einheit. */
function stream(card, current) {
  const blocks = [...card.children];
  blocks.forEach((b) => b.classList.add('w-stream-block'));
  const spans = units(card);
  const gap = parseFloat(getComputedStyle(dialog).getPropertyValue('--w-stream-gap')) || 60;
  const next = (n) => {
    if (current !== run) return;
    if (n >= spans.length) {
      dialog.removeAttribute('aria-busy');
      return;
    }
    // Wie im Chat der App folgt das Fenster der wachsenden Antwort, solange man nicht selbst hochgescrollt hat.
    const following = body.scrollHeight - body.scrollTop - body.clientHeight < 48;
    spans[n].classList.add('is-in');
    spans[n].closest('.w-stream-block')?.classList.add('is-in');
    if (following) body.scrollTop = body.scrollHeight;
    timer = setTimeout(() => next(n + 1), gap);
  };
  next(0);
}

function skeleton() {
  return element('div', 'w-reveal', `
    <article class="mm-answer w-skeleton" aria-hidden="true">
      <div class="mm-answer__summary"><span class="w-skeleton__bar"></span><span class="w-skeleton__bar w-skeleton__bar--short"></span></div>
      <div class="w-skeleton__body"><span class="w-skeleton__bar w-skeleton__bar--heading"></span><span class="w-skeleton__bar"></span><span class="w-skeleton__bar"></span><span class="w-skeleton__bar w-skeleton__bar--short"></span></div>
      <p class="w-writing" role="status"><span class="w-writing__matrix" aria-hidden="true">${'<i></i>'.repeat(16)}</span>Antwort wird erstellt …</p>
    </article>`);
}

function load(id) {
  if (!answers.has(id)) {
    const request = fetch(`${API}/preview/answers/${encodeURIComponent(id)}`).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
    // Ein Fehler wird nicht gemerkt, damit das nächste Öffnen es noch einmal versucht.
    request.catch(() => answers.delete(id));
    answers.set(id, request);
  }
  return answers.get(id);
}

function setBadge(phase) {
  const [label, tone] = PHASES[phase] ?? [];
  badge.hidden = !label;
  if (label) {
    badge.className = `mm-badge mm-badge--${tone} mm-badge--sm w-modal__badge`;
    badge.textContent = label;
  }
}

async function show(card) {
  const current = ++run;
  const id = card.dataset.preview;
  const fast = reducedMotion.matches;
  title.textContent = card.querySelector('.w-ex__use').textContent;
  question.textContent = card.dataset.question;
  setBadge(card.dataset.phase);
  dialog.setAttribute('aria-busy', 'true');
  const reveal = skeleton();
  slot.replaceChildren(reveal);
  body.scrollTop = 0;
  let content;
  try {
    const [preview] = await Promise.all([load(id), new Promise((r) => setTimeout(r, fast ? 0 : SKELETON_MS))]);
    if (current !== run) return;
    title.textContent = preview.answer.title || title.textContent;
    question.textContent = preview.question;
    setBadge(preview.answer.category);
    content = answerCard(preview.answer);
  } catch {
    if (current !== run) return;
    content = callout('warning', 'Antwort nicht verfügbar', 'Bitte versuch es gleich noch einmal.');
  }
  const wrap = element('div', 'w-reveal__content');
  wrap.append(content);
  reveal.querySelector('.w-skeleton').classList.add('w-skeleton--out');
  reveal.append(wrap);
  setTimeout(() => current === run && reveal.querySelector('.w-skeleton')?.remove(), fast ? 0 : REVEAL_MS);
  if (fast || !content.matches('.mm-answer')) {
    dialog.removeAttribute('aria-busy');
    return;
  }
  stream(content, current);
}

function open(card) {
  opener = card;
  dialog.dataset.state = 'opening';
  dialog.showModal();
  dialog.querySelector('.w-modal__close').focus();
  requestAnimationFrame(() => requestAnimationFrame(() => { dialog.dataset.state = 'open'; }));
  show(card);
}

function close() {
  if (!dialog.open || dialog.dataset.state === 'closing') return;
  run++;
  clearTimeout(timer);
  dialog.dataset.state = 'closing';
  setTimeout(() => {
    dialog.close();
    dialog.dataset.state = 'closed';
    slot.replaceChildren();
    opener?.focus();
  }, reducedMotion.matches ? 0 : 160);
}

document.querySelectorAll('.w-ex[data-preview]').forEach((card) => card.addEventListener('click', () => open(card)));
dialog.querySelector('.w-modal__close').addEventListener('click', close);
dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
// Ein Klick neben das Fenster trifft den Dialog selbst.
dialog.addEventListener('click', (e) => e.target === dialog && close());

// Häufige Fragen: Jede Frage klappt ihre Antwort auf und zu, mehrere dürfen offen sein.
document.querySelectorAll('.w-faq__q').forEach((button) => button.addEventListener('click', () => {
  const item = button.closest('.w-faq__item');
  const expanded = item.toggleAttribute('data-open');
  button.setAttribute('aria-expanded', expanded);
  item.querySelector('.w-faq__panel').inert = !expanded;
}));
