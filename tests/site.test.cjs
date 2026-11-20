const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
function source(name) {
  assert.ok(fs.existsSync(path.join(root, name)), `Required public file: ${name}`);
  return fs.readFileSync(path.join(root, name), 'utf8');
}
for (const page of ['index.html', 'course/index.html']) {
  test(`${page}: Russian semantic page and accessible navigation`, () => {
    const html = source(page);
    assert.match(html, /<html\s+lang="ru"/);
    assert.match(html, /name="viewport"/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /class="skip-link"\s+href="#main"/);
    assert.match(html, /<main\s+id="main"/);
    assert.match(html, /<nav\b[^>]*aria-label=/);
    assert.match(html, /aria-current="page"/);
    assert.match(html, /href="\/style\.css\?v=card-20261120"/);
    assert.match(html, /<meta\s+name="description"\s+content="[^"]{30,}"/);
  });
  test(`${page}: public content has no password form, backend calls or private data`, () => {
    const html = source(page);
    assert.doesNotMatch(html, /<form\b|<script\b|<iframe\b|type="password"|\/api\/|course-lessons\.json|storage_state|TELEGRAM_BOT_TOKEN/i);
    for (const anchor of html.matchAll(/<a\b[^>]*>/g)) {
      if (/target="_blank"/.test(anchor[0])) assert.match(anchor[0], /rel="[^"]*noopener[^\"]*noreferrer/);
    }
  });
}
test('home describes the actual owner and requested fields without invented credentials', () => {
  const html = source('index.html');
  for (const word of ['Илья', 'инженер-самоучка', 'касс', 'компьютер', 'ИИ']) assert.ok(html.toLowerCase().includes(word.toLowerCase()), word);
  assert.match(html, /href="\/course\/"/);
  assert.match(html, /https:\/\/github\.com\/devmapal58/);
  assert.doesNotMatch(html, /сертифицирован|тысяч клиентов|лет опыта|100%|tel:|mailto:|t\.me\//i);
});
test('course is a separate learning page, not a copy of the private archive', () => {
  const html = source('course/index.html');
  assert.match(html, /<h1[^>]*>Курс по ИИ<\/h1>/);
  assert.match(html, /отдельн[а-яё]* парол/i);
  assert.match(html, /после входа/);
  assert.match(html, /https:\/\/dash-31-76-240-137\.sslip\.io:8443\/course\//);
  assert.doesNotMatch(html, /drive\.google\.com|aibasis|Комментарии к уроку|invalid_grant/i);
});
test('course access comes before the long introduction in the DOM and on mobile', () => {
  const html = source('course/index.html');
  assert.ok(html.indexOf('class="course-access"') < html.indexOf('class="course-about"'), 'access must be first');
  assert.ok(source('style.css').includes('grid-template-areas: "access" "about"'), 'mobile access must be first');
});
test('course shows the dedicated non-secret login name', () => {
  assert.ok(source('course/index.html').includes('Логин: <code>course</code>'));
});
test('every local link and fragment resolves', () => {
  for (const page of ['index.html', 'course/index.html']) {
    const html = source(page);
    for (const match of html.matchAll(/href="([^"]+)"/g)) {
      const href = match[1];
      if (href.startsWith('#')) { assert.ok(html.includes(`id="${href.slice(1)}"`), `${page}: ${href}`); continue; }
      if (!href.startsWith('/')) continue;
      let name = href.split('?')[0].slice(1);
      if (!name || name.endsWith('/')) name += 'index.html';
      assert.ok(fs.existsSync(path.join(root, name)), `${page}: ${href}`);
    }
  }
});
test('styles reuse the dashboard font and palette with mobile and keyboard support', () => {
  const raw = source('style.css');
  const face = raw.match(/@font-face\s*\{[^}]*\}/)?.[0] || '';
  assert.equal(crypto.createHash('sha256').update(face).digest('hex'), 'bf27552fbaf0ece01deae5d78eee866e5347dabbcbd474bfeede005eae8a2ded');
  const css = raw.replace(/data:font\/[^)]+/g, '[font omitted]');
  for (const color of ['#050914', '#0b1322', '#2268c2', '#a71949', '#dfbd78']) assert.ok(css.includes(color), color);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media\s*\(max-width:\s*650px\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /font-size:\s*16px/);
  assert.ok(source('FONT-LICENSE.txt').includes('SIL OPEN FONT LICENSE'));
  assert.ok(fs.existsSync(path.join(root, '.nojekyll')));
});
