/* Angebots-PDF im TAIFUN-Layout.
   Grundlage ist ein TAIFUN-Angebot als Vorlage (Briefpapier, Vertragsseiten, Anlagen). Kundendaten,
   Datum, Nummern, Ankreuzfelder und Seitenzahlen werden ersetzt, die Angebotsübersicht mit den
   Preistabellen wird neu gesetzt. Alter Text wird dabei aus dem PDF entfernt, nicht nur überdeckt.
   Braucht lib/pdf-lib.min.js, lib/fontkit.umd.min.js, lib/pdf.min.js und die Schriften in fonts/. */
(function () {
  'use strict';

  /* ---------- Text aus Inhaltsströmen entfernen (aus der Unterschriftenmappe übernommen) ---------- */
  function latin1(bytes) {
    var out = '', CH = 8192;
    for (var i = 0; i < bytes.length; i += CH) out += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return out;
  }
  function mulM(m1, m2) {
    return [m1[0] * m2[0] + m1[1] * m2[2], m1[0] * m2[1] + m1[1] * m2[3], m1[2] * m2[0] + m1[3] * m2[2], m1[2] * m2[1] + m1[3] * m2[3],
            m1[4] * m2[0] + m1[5] * m2[2] + m2[4], m1[4] * m2[1] + m1[5] * m2[3] + m2[5]];
  }
  function pdfStrBytes(src, s, e) {
    var out = [];
    if (src[s] === '<') {
      var hx = src.slice(s + 1, e - 1).replace(/[^0-9a-fA-F]/g, '');
      if (hx.length % 2) hx += '0';
      for (var h = 0; h < hx.length; h += 2) out.push(parseInt(hx.substr(h, 2), 16));
      return out;
    }
    for (var i = s + 1; i < e - 1; i++) {
      var c = src.charCodeAt(i);
      if (c !== 92) { out.push(c & 255); continue; }
      var nx = src[++i];
      if (nx === undefined) break;
      var map = { n: 10, r: 13, t: 9, b: 8, f: 12, '(': 40, ')': 41, '\\': 92 };
      if (map[nx] !== undefined) out.push(map[nx]);
      else if (/[0-7]/.test(nx)) { var oc = nx; while (oc.length < 3 && /[0-7]/.test(src[i + 1])) oc += src[++i]; out.push(parseInt(oc, 8) & 255); }
      else if (nx === '\r') { if (src[i + 1] === '\n') i++; }
      else if (nx === '\n') { /* line continuation */ }
      else out.push(nx.charCodeAt(0) & 255);
    }
    return out;
  }
  function hexStr(bytes) { return '<' + bytes.map(function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('') + '>'; }
  function fmtNum(v) { var r = Math.round(v * 1000) / 1000; return String(r === 0 ? 0 : r); }
  // fonts: name -> { first, widths, missing } for simple fonts, or null when glyph widths are unknown
  function scanContent(src, eds, fonts) {
    var n = src.length, i = 0, ops = [], operands = [], opStart = -1;
    var ctm = [1, 0, 0, 1, 0, 0], stack = [], tm = null, tlm = null, known = false, bt = 0;
    var T = { TL: 0, Tc: 0, Tw: 0, Th: 1, Ts: 0, font: null, size: 0 }, tstack = [];
    var WS = ' \n\r\t\f\0', DEL = '()<>[]{}/%';
    function nums() { return operands.filter(function (t) { return t.t === 'num'; }).map(function (t) { return t.v; }); }
    function td(tx, ty) { tlm = mulM([1, 0, 0, 1, tx, ty], tlm || [1, 0, 0, 1, 0, 0]); tm = tlm.slice(); known = true; }
    var cuts = [], hit = new Set(), partial = new Set(), styles = new Map(), fill = '0 g', cs = '';
    function matchGlyph(ux, uy) {
      for (var k = 0; k < eds.length; k++) {
        var d = eds[k], tol = Math.max(1.2, d.size * 0.2);
        if (Math.abs(uy - d.f) < tol && ux >= d.e - 0.6 && ux < d.e + d.width - 0.3) return d;
      }
      return null;
    }
    function showText(word, elems, s0, e0, a) {
      var f = T.font ? fonts[T.font] : null;
      var M = known && tm ? mulM(tm, ctm) : null;
      if (!M) { ops.push({ org: null }); return; }
      if (!f || !T.size) {
        // widths unknown: only whole operators that start inside an edit can go
        var d0 = matchGlyph(M[4] + T.Ts * M[2], M[5] + T.Ts * M[3]);
        ops.push({ org: [M[4], M[5]], s: s0, e: e0, ed: d0, bt: bt, op: word, whole: true });
        known = false; return;
      }
      var x = 0, out = [], removed = false, run = 0, cur = [], hits = [];
      function flushStr() { if (cur.length) { out.push(hexStr(cur)); cur = []; } }
      var spW = f.widths[32 - f.first] || 0;
      function flushRun() {
        if (!run) return;
        if (spW > 0) { var spAdv = (spW / 1000 * T.size + T.Tc + T.Tw) * T.Th; out.push(hexStr([32])); out.push(fmtNum(-(run - spAdv) * 1000 / (T.size * T.Th))); }
        else out.push(fmtNum(-run * 1000 / (T.size * T.Th)));
        run = 0;
      }
      elems.forEach(function (el) {
        if (typeof el === 'number') { var dx = -el / 1000 * T.size * T.Th; if (run) run += dx; else { flushStr(); out.push(fmtNum(el)); } x += dx; return; }
        el.forEach(function (code) {
          var w = code >= f.first && code - f.first < f.widths.length ? f.widths[code - f.first] : f.missing;
          var adv = (w / 1000 * T.size + T.Tc + (code === 32 ? T.Tw : 0)) * T.Th;
          var ux = x * M[0] + T.Ts * M[2] + M[4], uy = x * M[1] + T.Ts * M[3] + M[5];
          var d = matchGlyph(ux, uy);
          if (d) {
            flushStr(); run += adv; removed = true;
            if (hits.indexOf(d.id) < 0) hits.push(d.id);
            if (!styles.has(d.id)) styles.set(d.id, { font: T.font, size: T.size, Th: T.Th, M: mulM([1, 0, 0, 1, x, T.Ts], M), fill: fill });
          }
          else { flushRun(); cur.push(code); }
          x += adv;
        });
      });
      flushStr(); flushRun();
      if (removed) {
        var pre = word === "'" ? 'T* ' : word === '"' ? fmtNum(a[a.length - 2]) + ' Tw ' + fmtNum(a[a.length - 1]) + ' Tc T* ' : '';
        cuts.push({ s: s0, e: e0, rep: ' ' + pre + '[' + out.join(' ') + '] TJ ' });
        hits.forEach(function (id) { hit.add(id); });
      }
      tm = mulM([1, 0, 0, 1, x, 0], tm);
      ops.push({ org: [M[4], M[5]], bt: bt, measured: true });
    }
    while (i < n) {
      var c = src[i];
      if (WS.indexOf(c) >= 0) { i++; continue; }
      var st = i;
      if (c === '%') { while (i < n && src[i] !== '\n' && src[i] !== '\r') i++; continue; }
      if (opStart < 0) opStart = st;
      if (c === '(') {
        var depth = 0;
        for (; i < n; i++) {
          var ch = src[i];
          if (ch === '\\') { i++; continue; }
          if (ch === '(') depth++;
          else if (ch === ')') { depth--; if (depth === 0) { i++; break; } }
        }
        operands.push({ t: 'str', s: st, e: i }); continue;
      }
      if (c === '<') {
        if (src[i + 1] === '<') { i += 2; operands.push({ t: 'dict' }); continue; }
        var close = src.indexOf('>', i); i = close < 0 ? n : close + 1; operands.push({ t: 'str', s: st, e: i }); continue;
      }
      if (c === '>') { i += (src[i + 1] === '>' ? 2 : 1); operands.push({ t: 'dict' }); continue; }
      if (c === '[' || c === ']' || c === '{' || c === '}') { i++; operands.push({ t: c }); continue; }
      if (c === '/') { i++; var ns = i; while (i < n && WS.indexOf(src[i]) < 0 && DEL.indexOf(src[i]) < 0) i++; operands.push({ t: 'name', v: src.slice(ns, i) }); continue; }
      var j = i; while (j < n && WS.indexOf(src[j]) < 0 && DEL.indexOf(src[j]) < 0) j++;
      var word = src.slice(i, j); i = j;
      if (/^[+\-]?(\d+\.?\d*|\.\d+)$/.test(word)) { operands.push({ t: 'num', v: parseFloat(word) }); continue; }
      if (word === 'true' || word === 'false' || word === 'null') { operands.push({ t: 'kw' }); continue; }
      var a = nums(), end = i;
      switch (word) {
        case 'q': stack.push(ctm.slice()); tstack.push(Object.assign({}, T, { _fill: fill, _cs: cs })); break;
        case 'Q': if (stack.length) { ctm = stack.pop(); T = tstack.pop(); fill = T._fill; cs = T._cs; } break;
        case 'cm': if (a.length >= 6) ctm = mulM(a.slice(-6), ctm); break;
        case 'BT': tm = [1, 0, 0, 1, 0, 0]; tlm = tm.slice(); known = true; bt++; break;
        case 'ET': known = false; break;
        case 'Tm': if (a.length >= 6) { tm = a.slice(-6); tlm = tm.slice(); known = true; } break;
        case 'Td': if (a.length >= 2) td(a[a.length - 2], a[a.length - 1]); break;
        case 'TD': if (a.length >= 2) { T.TL = -a[a.length - 1]; td(a[a.length - 2], a[a.length - 1]); } break;
        case 'TL': if (a.length) T.TL = a[a.length - 1]; break;
        case 'Tc': if (a.length) T.Tc = a[a.length - 1]; break;
        case 'Tw': if (a.length) T.Tw = a[a.length - 1]; break;
        case 'Tz': if (a.length) T.Th = a[a.length - 1] / 100; break;
        case 'g': case 'rg': case 'k': fill = src.slice(opStart, end); break;
        case 'cs': cs = src.slice(opStart, end); break;
        case 'sc': case 'scn': fill = (cs ? cs + ' ' : '') + src.slice(opStart, end); break;
        case 'Ts': if (a.length) T.Ts = a[a.length - 1]; break;
        case 'Tf':
          var nm = operands.filter(function (t) { return t.t === 'name'; }).pop();
          T.font = nm ? nm.v : null; T.size = a.length ? a[a.length - 1] : 0; break;
        case 'T*': td(0, -T.TL); break;
        case "'": case '"':
          if (word === '"' && a.length >= 2) { T.Tw = a[a.length - 2]; T.Tc = a[a.length - 1]; }
          td(0, -T.TL); /* falls through */
        case 'Tj': case 'TJ':
          var elems = [];
          operands.forEach(function (t) { if (t.t === 'str') elems.push(pdfStrBytes(src, t.s, t.e)); else if (t.t === 'num' && word === 'TJ') elems.push(t.v); });
          showText(word, elems, opStart, end, a);
          break;
        case 'BI':
          var idp = src.indexOf('ID', i), eip = idp < 0 ? -1 : src.indexOf('EI', idp + 3);
          while (eip > 0 && !(WS.indexOf(src[eip - 1]) >= 0 && (eip + 2 >= n || WS.indexOf(src[eip + 2]) >= 0))) eip = src.indexOf('EI', eip + 2);
          if (eip < 0) throw new Error('Inline-Bild nicht lesbar');
          i = eip + 2; break;
      }
      operands = []; opStart = -1;
    }
    // whole-operator removals (fonts without known widths): only when nothing after it depends on its width
    ops.forEach(function (o, k) {
      if (!o.whole || !o.ed) return;
      var nx = ops[k + 1];
      if (nx && nx.bt === o.bt && (!nx.org || nx.measured)) { partial.add(o.ed.id); return; }
      cuts.push({ s: o.s, e: o.e, rep: o.op === "'" ? ' T* ' : ' ' });
      hit.add(o.ed.id);
    });
    partial.forEach(function (id) { hit.delete(id); });
    return { cuts: cuts, hit: hit, styles: styles };
  }
  function pageFonts(L, doc, pg) {
    var out = {}, ctx = doc.context;
    try {
      var res = pg.node.Resources(), fd = res && res.lookup(L.PDFName.of('Font'));
      if (!(fd instanceof L.PDFDict)) return out;
      fd.entries().forEach(function (kv) {
        var key = kv[0].asString().replace(/^\//, ''), f = ctx.lookup(kv[1]);
        if (!(f instanceof L.PDFDict)) { out[key] = null; return; }
        var sub = f.lookup(L.PDFName.of('Subtype')), subN = sub ? sub.asString() : '';
        var W = f.lookup(L.PDFName.of('Widths')), first = f.lookup(L.PDFName.of('FirstChar'));
        if (!/^\/(TrueType|Type1|MMType1)$/.test(subN) || !(W instanceof L.PDFArray) || !first) { out[key] = null; return; }
        var missing = 0, desc = f.lookup(L.PDFName.of('FontDescriptor'));
        if (desc instanceof L.PDFDict) { var mw = desc.lookup(L.PDFName.of('MissingWidth')); if (mw) missing = mw.asNumber(); }
        var enc = f.lookup(L.PDFName.of('Encoding')), base = f.lookup(L.PDFName.of('BaseFont'));
        out[key] = { first: first.asNumber(), widths: W.asArray().map(function (v) { var o = ctx.lookup(v); return o && o.asNumber ? o.asNumber() : 0; }), missing: missing,
                     enc: enc instanceof L.PDFName ? enc.asString().replace(/^\//, '') : '', bold: base ? /bold|black|heavy/i.test(base.asString()) : false };
      });
    } catch (e) { console.warn('Schriften nicht lesbar', e); }
    return out;
  }
  function stripTextOps(L, doc, pg, eds) {
    try {
      var ctx = doc.context, node = pg.node;
      var raw = node.get(L.PDFName.of('Contents')), cont = ctx.lookup(raw);
      var refs = cont instanceof L.PDFArray ? cont.asArray() : [raw];
      var parts = [], idxs = [];
      refs.forEach(function (ref, i) {
        var stm = ctx.lookup(ref);
        if (stm instanceof L.PDFRawStream) { parts.push(latin1(L.decodePDFRawStream(stm).decode())); idxs.push(i); }
      });
      if (!parts.length) return { hit: new Set() };
      var src = parts.join('\n'), fonts = pageFonts(L, doc, pg);
      var res = scanContent(src, eds, fonts);
      if (!res.cuts.length) return { hit: new Set() };
      var outS = '', pos = 0;
      res.cuts.sort(function (x, y) { return x.s - y.s; }).forEach(function (c) { outS += src.slice(pos, c.s) + c.rep; pos = c.e; });
      outS = 'q\n' + outS + src.slice(pos) + '\nQ\n';
      var bytes = new Uint8Array(outS.length);
      for (var b = 0; b < outS.length; b++) bytes[b] = outS.charCodeAt(b) & 255;
      var nref = ctx.register(ctx.flateStream(bytes));
      var arr = [];
      refs.forEach(function (ref, i) { var k = idxs.indexOf(i); if (k < 0) arr.push(ref); else if (k === 0) arr.push(nref); });
      node.set(L.PDFName.of('Contents'), ctx.obj(arr));
      return { hit: res.hit, styles: res.styles, fonts: fonts };
    } catch (e) { console.warn('Originaltext konnte nicht entfernt werden', e); return { hit: new Set() }; }
  }

  /* ---------- Bibliotheken und Schriften ---------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[data-lib="' + src + '"]')) return res();
      var s = document.createElement('script');
      s.src = src; s.dataset.lib = src;
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error('Die Datei ' + src + ' konnte nicht geladen werden.')); };
      document.head.appendChild(s);
    });
  }
  var libsReady = null;
  function ensureLibs() {
    if (!libsReady) libsReady = (async function () {
      if (!window.PDFLib) await loadScript('lib/pdf-lib.min.js');
      if (!window.fontkit) await loadScript('lib/fontkit.umd.min.js');
      if (!window.pdfjsLib) await loadScript('lib/pdf.min.js');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
    })().catch(function (e) { libsReady = null; throw e; });
    return libsReady;
  }
  // Dieselben Schriften wie in der TAIFUN-Vorlage
  var FONT_FILES = { sans: 'fonts/DejaVuSans.ttf', sansBold: 'fonts/DejaVuSans-Bold.ttf', sansItalic: 'fonts/DejaVuSans-Oblique.ttf',
                     open: 'fonts/OpenSans-Regular.ttf', openBold: 'fonts/OpenSans-Bold.ttf' };
  var fontBytes = null;
  async function loadFontBytes() {
    if (fontBytes) return fontBytes;
    var out = {};
    await Promise.all(Object.keys(FONT_FILES).map(async function (k) {
      var r = await fetch(FONT_FILES[k]);
      if (!r.ok) throw new Error('Die Schrift ' + FONT_FILES[k] + ' fehlt.');
      out[k] = new Uint8Array(await r.arrayBuffer());
    }));
    return (fontBytes = out);
  }

  /* ---------- Vorlage lesen ---------- */
  var HEAD_RE = /^Angebot vom \d{1,2}\.\d{1,2}\.\d{4}$/, FOOT_RE = /^Seite \d+ von \d+$/, DATE_RE = /^\d{1,2}\.\d{1,2}\.\d{4}$/;
  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  function toLines(items) {
    var sorted = items.slice().sort(function (a, b) { return (b.y - a.y) || (a.x - b.x); }), lines = [];
    sorted.forEach(function (it) {
      var l = lines[lines.length - 1];
      if (l && Math.abs(l.y - it.y) < 1.5) l.items.push(it); else lines.push({ y: it.y, items: [it] });
    });
    lines.forEach(function (l) {
      l.items.sort(function (a, b) { return a.x - b.x; });
      l.text = norm(l.items.map(function (i) { return i.str; }).join(' '));
      l.x1 = Math.max.apply(null, l.items.map(function (i) { return i.x + i.w; }));
    });
    return lines;
  }
  async function readTemplate(bytes) {
    await ensureLibs();
    var doc = await window.pdfjsLib.getDocument({ data: bytes.slice(0), isEvalSupported: false }).promise, pages = [];
    try {
      for (var n = 1; n <= doc.numPages; n++) {
        var pg = await doc.getPage(n), tc = await pg.getTextContent(), items = [];
        tc.items.forEach(function (it, i) {
          if (!it.str || !it.str.trim()) return;
          var t = it.transform;
          items.push({ id: n + ':' + i, str: it.str, x: t[4], y: t[5], size: Math.abs(t[3]) || Math.hypot(t[2], t[3]), w: it.width });
        });
        pages.push({ index: n - 1, items: items, lines: toLines(items) });
      }
    } finally { doc.destroy(); }
    classify(pages);
    return pages;
  }
  function classify(pages) {
    var kiStart = -1;
    pages.forEach(function (p) {
      var t = p.lines.map(function (l) { return l.text; }).join('\n');
      p.kind = /Ihr\s+Aboangebot/i.test(t) ? 'cover'
        : /Angebots(ü|ue)bersicht/i.test(t) ? 'overview'
        : /KI-Upgrade-Vertrag/i.test(t) ? 'ki'
        : /Abovertrag TAIFUN/i.test(t) && /nachfolgend/i.test(t) ? 'title'
        : p.lines.every(function (l) { return HEAD_RE.test(l.text) || FOOT_RE.test(l.text); }) ? 'blank' : 'static';
      if (p.kind === 'ki' && kiStart < 0) kiStart = p.index;
    });
    pages.forEach(function (p) { p.ki = kiStart >= 0 && p.index >= kiStart; });
    return pages;
  }
  function findLine(page, re, from) {
    for (var i = from || 0; i < page.lines.length; i++) if (re.test(page.lines[i].text)) return page.lines[i];
    return null;
  }
  function itemsRightOf(page, label, dy) {
    return page.items.filter(function (it) { return it !== label && Math.abs(it.y - label.y) < (dy || 3) && it.x > label.x + label.w - 1; })
      .sort(function (a, b) { return a.x - b.x; });
  }
  function findItem(page, re) {
    for (var i = 0; i < page.items.length; i++) if (re.test(norm(page.items[i].str))) return page.items[i];
    return null;
  }
  // Prüft eine Vorlage und sagt, was darin steckt
  async function inspect(bytes) {
    var pages = await readTemplate(bytes);
    var has = function (k) { return pages.some(function (p) { return p.kind === k; }); };
    return { pages: pages.length, ok: has('cover') && has('overview'), title: has('title'), ki: has('ki') };
  }

  /* ---------- Ankreuzfelder finden (Rechtecke im Inhaltsstrom) ---------- */
  function pageSource(L, doc, pg) {
    var ctx = doc.context, raw = pg.node.get(L.PDFName.of('Contents')), cont = ctx.lookup(raw);
    var refs = cont instanceof L.PDFArray ? cont.asArray() : [raw], parts = [];
    refs.forEach(function (ref) { var stm = ctx.lookup(ref); if (stm instanceof L.PDFRawStream) parts.push(latin1(L.decodePDFRawStream(stm).decode())); });
    return parts.join('\n');
  }
  function findBoxes(L, doc, pg) {
    var src = pageSource(L, doc, pg), n = src.length, i = 0, nums = [], ctm = [1, 0, 0, 1, 0, 0], stack = [], path = [], boxes = [];
    var WS = ' \n\r\t\f\0', DEL = '()<>[]{}/%';
    function pt(x, y) { return [x * ctm[0] + y * ctm[2] + ctm[4], x * ctm[1] + y * ctm[3] + ctm[5]]; }
    function paint(stroke) {
      if (stroke && path.length >= 4) {
        var xs = path.map(function (p) { return p[0]; }), ys = path.map(function (p) { return p[1]; });
        var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
        var w = x1 - x0, h = y1 - y0;
        if (w > 5 && w < 15 && h > 5 && h < 15 && Math.abs(w - h) < 2.5) boxes.push({ x0: x0, y0: y0, x1: x1, y1: y1 });
      }
      path = [];
    }
    while (i < n) {
      var c = src[i];
      if (WS.indexOf(c) >= 0) { i++; continue; }
      if (c === '%') { while (i < n && src[i] !== '\n' && src[i] !== '\r') i++; continue; }
      if (c === '(') {
        var depth = 0;
        for (; i < n; i++) { var ch = src[i]; if (ch === '\\') { i++; continue; } if (ch === '(') depth++; else if (ch === ')') { depth--; if (!depth) { i++; break; } } }
        nums = []; continue;
      }
      if (c === '<') { if (src[i + 1] === '<') { i += 2; continue; } var cl = src.indexOf('>', i); i = cl < 0 ? n : cl + 1; continue; }
      if (c === '>' || c === '[' || c === ']' || c === '{' || c === '}') { i++; continue; }
      if (c === '/') { i++; while (i < n && WS.indexOf(src[i]) < 0 && DEL.indexOf(src[i]) < 0) i++; continue; }
      var j = i; while (j < n && WS.indexOf(src[j]) < 0 && DEL.indexOf(src[j]) < 0) j++;
      var word = src.slice(i, j); i = j;
      if (/^[+\-]?(\d+\.?\d*|\.\d+)$/.test(word)) { nums.push(parseFloat(word)); continue; }
      var a = nums; nums = [];
      switch (word) {
        case 'q': stack.push(ctm.slice()); break;
        case 'Q': if (stack.length) ctm = stack.pop(); break;
        case 'cm': if (a.length >= 6) ctm = mulM(a.slice(-6), ctm); break;
        case 'm': case 'l': if (a.length >= 2) path.push(pt(a[a.length - 2], a[a.length - 1])); break;
        case 're':
          if (a.length >= 4) { var rx = a[a.length - 4], ry = a[a.length - 3], rw = a[a.length - 2], rh = a[a.length - 1]; path.push(pt(rx, ry), pt(rx + rw, ry), pt(rx + rw, ry + rh), pt(rx, ry + rh)); }
          break;
        case 's': case 'S': case 'b': case 'B': case 'b*': case 'B*': paint(true); break;
        case 'f': case 'F': case 'f*': case 'n': paint(false); break;
        case 'BI':
          var eip = src.indexOf('EI', src.indexOf('ID', i));
          i = eip < 0 ? n : eip + 2; break;
      }
    }
    return boxes;
  }
  function boxFor(boxes, label) {
    var best = null, bd = 1e9;
    boxes.forEach(function (b) {
      var cy = (b.y0 + b.y1) / 2, dx = label.x - b.x1;
      if (cy < label.y - 4 || cy > label.y + label.size || dx < -2 || dx > 40) return;
      if (dx < bd) { bd = dx; best = b; }
    });
    return best;
  }

  /* ---------- Zeichnen ---------- */
  function fillColor(L, fill) {
    var m = /([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(rg|sc|scn)\s*$/.exec(fill || '');
    if (m) return L.rgb(+m[1], +m[2], +m[3]);
    m = /([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(k|sc|scn)\s*$/.exec(fill || '');
    if (m) return L.cmyk(+m[1], +m[2], +m[3], +m[4]);
    m = /([\d.]+)\s+(g|sc|scn)\s*$/.exec(fill || '');
    if (m) return L.grayscale(+m[1]);
    return L.rgb(0, 0, 0);
  }
  function wrap(text, font, size, maxW) {
    var words = String(text).split(/\s+/).filter(Boolean), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (cur && font.widthOfTextAtSize(t, size) > maxW) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur || !lines.length) lines.push(cur);
    return lines;
  }
  var NUM = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function eur(v) { return NUM.format(v) + ' €'; }

  /* ---------- Seiten aus der Vorlage füllen ---------- */
  function edit(e, item, text, font, opt) { e.edits.push(Object.assign({ item: item, text: text, font: font }, opt || {})); }
  function centerOf(F, it) { return it.x + F.sans.widthOfTextAtSize(String(it.str).replace(/\s+$/, ''), it.size) / 2; }

  function fillCover(ctx, e) {
    var p = e.tpl, d = ctx.data, F = ctx.F, abo = findLine(p, /Ihr\s+Aboangebot/i);
    if (!abo) return;
    // Anschrift: Zeilen links über „Ihr Aboangebot“
    var addr = p.lines.filter(function (l) { return l.y > abo.y + 20 && l.y < abo.y + 200 && l.items[0].x < 200; });
    if (addr.length) {
      var lh = addr.length >= 2 ? Math.min.apply(null, addr.slice(1).map(function (l, k) { return addr[k].y - l.y; })) : 13.6;
      addr.forEach(function (l) { l.items.forEach(function (it) { edit(e, it, null); }); });
      var first = addr[0].items[0], last = addr[addr.length - 1].items[0], street = addr.length >= 3 ? addr[addr.length - 2].items[0] : null;
      var c = d.customer, out = [{ y: first.y, t: c.name }];
      if (c.contact) out.push({ y: first.y - lh, t: c.contact });
      out.push({ y: street ? street.y : last.y + lh, t: c.street }, { y: last.y, t: [c.zip, c.city].filter(Boolean).join(' ') });
      out.forEach(function (o) { if (o.t) e.after.push(function (pg) { pg.drawText(o.t, { x: first.x, y: o.y, size: first.size, font: F.open, color: ctx.L.rgb(0, 0, 0) }); }); });
    }
    // Angebotsnummer, Datum, Kundennummer
    var label = findItem(p, /^Ihr\s+Aboangebot$/i);
    if (label) itemsRightOf(p, label).filter(function (it) { return it.x < 300; }).slice(0, 1).forEach(function (it) { edit(e, it, d.offerNo, 'open'); });
    p.items.forEach(function (it) { if (it.x > 300 && DATE_RE.test(norm(it.str)) && Math.abs(it.y - abo.y) < 8) edit(e, it, d.date, 'open'); });
    var kdl = findItem(p, /^Kunden\s*Nr\.?$/i);
    if (kdl) itemsRightOf(p, kdl).slice(0, 1).forEach(function (it) { edit(e, it, d.customerNo, 'open'); });
    // „bis zum … garantieren“
    var gl = findLine(p, /garantieren/);
    if (gl) gl.items.forEach(function (it) { if (DATE_RE.test(norm(it.str))) edit(e, it, d.validUntil, 'openBold'); });
    // Ansprechpartner bei TAIFUN, falls in der App hinterlegt
    var s = d.seller || {}, MAIL = /[\w.+\-]+@[\w.\-]+\.[a-z]{2,}/i;
    if (s.email) p.items.forEach(function (it) { if (/Per Mail an/i.test(it.str) && MAIL.test(it.str)) edit(e, it, it.str.replace(MAIL, s.email), 'open'); });
    var sig = findItem(p, /^i\.\s*A\./);
    if (sig) {
      if (s.name) edit(e, sig, 'i. A. ' + s.name, 'openBold');
      var tl = p.lines.filter(function (l) { return l.y < sig.y - 5 && l.y > sig.y - 20; })[0];
      if (tl && s.title) tl.items.forEach(function (it, k) { edit(e, it, k ? null : s.title, 'openBold'); });
      [[/^Mobil\b/, s.mobile], [/^E-?Mail\b/, s.email]].forEach(function (r) {
        var l = findLine(p, r[0]);
        if (!l || !r[1] || l.y > sig.y) return;
        if (l.items.length > 1) edit(e, l.items[l.items.length - 1], r[1], 'openBold');
      });
    }
  }

  function fillTitle(ctx, e) {
    var p = e.tpl, d = ctx.data, F = ctx.F, und = findLine(p, /^-?\s*und\s*-?$/i), kunde = findLine(p, /nachfolgend\s*„?Kunde/i);
    if (!und || !kunde) return;
    var block = p.lines.filter(function (l) { return l.y < und.y - 2 && l.y > kunde.y + 2; });
    if (!block.length) return;
    var c = d.customer, addr = [c.street, [c.zip, c.city].filter(Boolean).join(' ')], ai = 0;
    block.forEach(function (l, k) {
      var it = l.items[0], cx = centerOf(F, it), text;
      if (k === 0) text = c.name;
      else if (/KD-?Nr/i.test(l.text)) text = 'KD-Nr.: ' + d.customerNo;
      else if (/^(Germany|Deutschland|Österreich|Austria)$/i.test(l.text)) return;
      else text = addr[ai++] || '';
      l.items.forEach(function (x, j) { edit(e, x, j ? null : text, k === 0 ? 'sansBold' : 'sans', { align: 'center', cx: cx }); });
    });
  }

  function fillStatic(ctx, e, pg) {
    var p = e.tpl, d = ctx.data, c = d.customer;
    var man = findItem(p, /^Mandatsreferenz/i);
    if (man) itemsRightOf(p, man, 15).slice(0, 1).forEach(function (it) { edit(e, it, d.customerNo, 'sansBold'); });
    var an = findItem(p, /^Anschrift:?$/i);
    if (an) itemsRightOf(p, an, 4).filter(function (it) { return it.x < an.x + 200; }).slice(0, 1)
      .forEach(function (it) { edit(e, it, [c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(' , '), 'sansBold'); });
    var od = findLine(p, /^Ort, Datum/);
    if (od) {
      var above = p.lines.filter(function (l) { return l.y > od.y + 4 && l.y < od.y + 20 && l.items[0].x < od.items[0].x + 30; })[0];
      if (above && !/Hannover/i.test(above.text)) above.items.forEach(function (it, k) { edit(e, it, k ? null : [c.city, d.date].filter(Boolean).join(', '), 'sans'); });
    }
    // Ankreuzfelder
    var marks = [
      [/^Software, die der Kunde lokal/, d.hosting === 'lokal'],
      [/^Software-as-a-Service \(SaaS\)$/, d.hosting === 'cloud'],
      [/^TAIFUN App$/, !!d.app],
      [/^Einzelkämpfer$/, d.ki === 'Einzelkämpfer'],
      [/^Betriebe$/, d.ki === 'Betriebe'],
      [/^Mittelstand$/, d.ki === 'Mittelstand']
    ];
    var boxes = null;
    marks.forEach(function (m) {
      p.items.forEach(function (it) {
        if (!m[0].test(norm(it.str))) return;
        if (/^TAIFUN App$/.test(norm(it.str)) && !findLine(p, /Fernwartung und Support/)) return;
        if (!boxes) boxes = findBoxes(ctx.L, ctx.out, pg);
        var b = boxFor(boxes, it);
        if (b) e.after.push(function (pg2) { drawBox(ctx.L, pg2, b, m[1]); });
      });
    });
  }
  function drawBox(L, pg, b, checked) {
    var w = b.x1 - b.x0, h = b.y1 - b.y0, black = L.rgb(0, 0, 0);
    pg.drawRectangle({ x: b.x0 - 1.2, y: b.y0 - 1.2, width: w + 2.4, height: h + 2.4, color: L.rgb(1, 1, 1) });
    pg.drawRectangle({ x: b.x0, y: b.y0, width: w, height: h, borderColor: black, borderWidth: 0.7 });
    if (checked) {
      pg.drawLine({ start: { x: b.x0, y: b.y0 }, end: { x: b.x1, y: b.y1 }, thickness: 0.5, color: black });
      pg.drawLine({ start: { x: b.x0, y: b.y1 }, end: { x: b.x1, y: b.y0 }, thickness: 0.5, color: black });
    }
  }

  /* ---------- Angebotsübersicht neu setzen ---------- */
  // Nur Briefpapier der Vorlagenseite behalten: alles bis zum ersten Text
  function backgroundOnly(L, doc, pg) {
    var src = pageSource(L, doc, pg), m = /(^|[\s\]>)])BT(?=[\s\/\[(<])/.exec(src);
    var pre = m ? src.slice(0, m.index + m[1].length) : src;
    var open = (pre.match(/(^|\s)q(?=\s)/g) || []).length - (pre.match(/(^|\s)Q(?=\s)/g) || []).length;
    var s = 'q\n' + pre + '\n' + new Array(Math.max(0, open) + 1).join('Q\n') + 'Q\n', bytes = new Uint8Array(s.length);
    for (var k = 0; k < s.length; k++) bytes[k] = s.charCodeAt(k) & 255;
    pg.node.set(L.PDFName.of('Contents'), doc.context.register(doc.context.flateStream(bytes)));
  }
  var GRAY = 0.851, LIGHT = 0.949, TOP_NEXT = 84, BOTTOM = 805, LAST_LINE = 826;
  var COLS = {
    monthly: [63.8, 326.3, 370.05, 442.9, 493.8, 574.15],
    onetime: [63.8, 362.9, 421.1, 493.95, 574.15],
    service: [63.8, 368.7, 425.35, 496.15, 574.15]
  };
  var HEADS = {
    monthly: [null, ['Menge'], ['Einzelpreis', '(zzgl. MwSt)'], ['Rabatt'], ['Gesamtpreis', '(zzgl. MwSt)']],
    onetime: [null, ['Menge'], ['Einzelpreis', '(zzgl. MwSt)'], ['Gesamtpreis', '(zzgl. MwSt)']],
    service: [null, ['Menge'], ['Einzelpreis', '(zzgl. MwSt)'], ['Gesamtpreis', '(zzgl. MwSt)']]
  };
  function layoutOverview(ctx) {
    var L = ctx.L, F = ctx.F, d = ctx.data, pages = [[]], ty = 0;
    var black = L.rgb(0, 0, 0);
    function op(fn) { pages[pages.length - 1].push(fn); }
    function need(h, limit) { if (ty + h > (limit || BOTTOM)) { pages.push([]); ty = TOP_NEXT; return true; } return false; }
    function T(str, x, base, font, size, align) {
      op(function (pg, H) {
        var w = font.widthOfTextAtSize(str, size), xx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
        pg.drawText(str, { x: xx, y: H - base, size: size, font: font, color: black });
      });
    }
    function rect(x, top, w, h, gray) { op(function (pg, H) { pg.drawRectangle({ x: x, y: H - top - h, width: w, height: h, color: L.grayscale(gray) }); }); }
    function hline(x0, x1, top) { op(function (pg, H) { pg.drawLine({ start: { x: x0, y: H - top }, end: { x: x1, y: H - top }, thickness: 0.5, color: black }); }); }
    function vline(x, top, h) { op(function (pg, H) { pg.drawLine({ start: { x: x, y: H - top }, end: { x: x, y: H - top - h }, thickness: 0.5, color: black }); }); }
    function grid(edges, top, h, only) {
      hline(edges[0], edges[edges.length - 1], top); hline(edges[0], edges[edges.length - 1], top + h);
      edges.forEach(function (x, k) { if (!only || only.indexOf(k) >= 0) vline(x, top, h); });
    }
    function table(kind, rows, rowH, total, totalSep) {
      var edges = COLS[kind], heads = HEADS[kind], HH = 27.12, x0 = edges[0], x1 = edges[edges.length - 1], nameW = edges[1] - edges[0] - 9;
      function header() {
        var top = ty;
        rect(x0, top, x1 - x0, HH, GRAY); grid(edges, top, HH);
        // Spaltenköpfe rechtsbündig, Spalte k reicht bis edges[k + 1]
        heads.forEach(function (h, k) { if (h) h.forEach(function (t, i) { T(t, edges[k + 1] - 0.2, top + 11.32 + i * 11.06, F.sans, 9.5, 'right'); }); });
        ty += HH;
      }
      need(HH + rowH * 2); header();
      rows.forEach(function (r) {
        var font = r.group ? F.sansItalic : F.sans, lines = wrap(r.name, font, 9.5, nameW), h = rowH + (lines.length - 1) * 13.06;
        if (need(h)) header();
        var top = ty;
        if (r.group) rect(x0, top, x1 - x0, h, LIGHT);
        grid(edges, top, h);
        lines.forEach(function (ln, i) { T(ln, x0 + 5.4, top + 10.82 + i * 13.06, font, 9.5); });
        (r.cells || []).forEach(function (t, k) { if (t) T(t, edges[k + 2] - 0.2, top + 10.82, F.sans, 9.5, 'right'); });
        ty += h;
      });
      need(15.56);
      var tt = ty;
      grid(edges, tt, 15.56, totalSep ? [0, edges.indexOf(totalSep), edges.length - 1] : [0, edges.length - 1]);
      T(total[0], x0 + 5.4, tt + 10.82, F.sansBold, 9.5);
      T(total[1], x1 + 0.05, tt + 10.82, F.sansBold, 9.5, 'right');
      ty += 15.56;
    }
    function para(text) {
      wrap(text, F.sans, 9.5, 445).forEach(function (ln) { need(11.06); T(ln, 70.9, ty + 8.82, F.sans, 9.5); ty += 11.06; });
    }
    function heading(text, gapAfter) { need(gapAfter + 40); T(text, 70.9, ty + 10.21, F.sansBold, 11); ty += gapAfter; }

    T('Angebotsübersicht', 297.75, 90.66, F.sansBold, 18, 'center');
    ty = 107.71; heading('Leistungsbestandteile', 18.62);
    var m = d.monthly;
    table('monthly', [{ name: 'TAIFUN+', group: true }].concat(m.rows.map(function (r) {
      return { name: r.name, cells: [String(r.qty), r.unit == null ? '' : eur(r.unit), r.pct ? '-' + NUM.format(r.pct) + ' %' : '', r.total == null ? '' : eur(r.total)] };
    })), 15.56, ['Gesamtpreis (pro Monat)', eur(m.total)]);
    var paras = [];
    if (d.kiNote) paras.push('Rechnungshinweis: Der Gesamtpreis (pro Monat) enthält die Vergütung für die Nutzung von HalloPetra gemäß ANLAGE 3.  Angefallene Zusatzminuten werden gesondert berechnet.');
    if (d.discountText) paras.push(d.discountText);
    var afterPara = false;
    if (paras.length) { ty += 17.05; paras.forEach(function (t, i) { if (i) ty += 11.64; para(t); }); afterPara = true; }
    if (d.onetime.rows.length) {
      ty += afterPara ? 0 : 23.28;
      heading('Einmalige Investitionen:', 17.46);
      table('onetime', d.onetime.rows.map(function (r) {
        return { name: r.name, cells: [String(r.qty), eur(r.unit), r.ep ? 'EP' : eur(r.total)] };
      }), 16.73, ['Gesamtpreis', eur(d.onetime.total)]);
      afterPara = false;
    }
    if (d.service.rows.length) {
      ty += afterPara ? 0 : 23.28;
      heading('Dienstleistungen:', 12.8);
      table('service', d.service.rows.map(function (r) {
        return { name: r.name, cells: [NUM.format(r.qty) + ' ' + (r.unitName || 'Stk'), eur(r.unit), r.total == null ? '' : eur(r.total)] };
      }), 16.72, ['Gesamtpreis', eur(d.service.total)], COLS.service[2]);
      if (d.service.rows.some(function (r) { return /\*\s*$/.test(r.name); })) {
        ty += 17.46; need(24);
        T('   *Nach der Installation der Software, erhalten Sie einen Link für die Online-Seminare. ', 70.9, ty + 9.28, F.sans, 10); ty += 11.64;
        T('Dieser berechtigt Sie zur mehrfachen Teilnahme an den Online-Seminaren.', 70.9, ty + 9.28, F.sans, 10); ty += 11.64;
      }
    }
    // Die letzte Zeile darf bis knapp über die Seitenzahl reichen, wie im Original
    ty += ty + 23.96 + 12 <= LAST_LINE ? 23.96 : 12; need(12, LAST_LINE);
    T('Rechnungsversand', 70.9, ty + 9.28, F.sansBold, 10);
    T(' per E-Mail an:' + (d.invoiceEmail ? ' ' + d.invoiceEmail : ''), 70.9 + F.sansBold.widthOfTextAtSize('Rechnungsversand', 10), ty + 9.28, F.sans, 10);
    return pages;
  }

  /* ---------- Seitenkopf, Seitenzahlen und Ersetzungen anwenden ---------- */
  function finishPage(ctx, e, n, N) {
    var L = ctx.L, F = ctx.F, pg = e.pg, p = e.tpl, d = ctx.data, H = pg.getHeight();
    var head = findLine(p, HEAD_RE), foot = findLine(p, FOOT_RE);
    if (e.clean) {
      if (head) { var hi = head.items[0]; pg.drawText('Angebot vom ' + d.date, { x: hi.x, y: hi.y, size: hi.size, font: F.sans, color: L.rgb(0, 0, 0) }); }
      if (foot) { var fi = foot.items[0], ft = 'Seite ' + n + ' von ' + N; pg.drawText(ft, { x: foot.x1 - F.sans.widthOfTextAtSize(ft, fi.size), y: fi.y, size: fi.size, font: F.sans, color: L.rgb(0, 0, 0) }); }
      e.ops.forEach(function (fn) { fn(pg, H); });
      return;
    }
    if (head) head.items.forEach(function (it, k) { edit(e, it, k ? null : 'Angebot vom ' + d.date, 'sans'); });
    if (foot) { var x1 = foot.x1; foot.items.forEach(function (it, k) { edit(e, it, k ? null : 'Seite ' + n + ' von ' + N, 'sans', { align: 'right', right: x1 }); }); }
    var eds = e.edits.map(function (x, k) { return { id: k, e: x.item.x, f: x.item.y, width: x.item.w, size: x.item.size }; });
    var res = eds.length ? stripTextOps(L, ctx.out, pg, eds) : { hit: new Set() };
    e.edits.forEach(function (x, k) {
      var it = x.item, st = res.styles && res.styles.get(k);
      if (!res.hit.has(k)) pg.drawRectangle({ x: it.x - 0.5, y: it.y - it.size * 0.28, width: it.w + 1, height: it.size * 1.25, color: L.rgb(1, 1, 1) });
      if (x.text == null || x.text === '') return;
      var font = F[x.font || 'sans'], w = font.widthOfTextAtSize(x.text, it.size);
      var xx = x.align === 'right' ? (x.right || it.x + it.w) - w : x.align === 'center' ? x.cx - w / 2 : it.x;
      pg.drawText(x.text, { x: xx, y: it.y, size: it.size, font: font, color: fillColor(L, st && st.fill) });
    });
    e.after.forEach(function (fn) { fn(pg); });
  }

  /* ---------- Gesamtablauf ---------- */
  async function build(templateBytes, data) {
    await ensureLibs();
    var L = window.PDFLib, tpl = await readTemplate(templateBytes);
    var cover = tpl.filter(function (p) { return p.kind === 'cover'; })[0], ov = tpl.filter(function (p) { return p.kind === 'overview'; })[0];
    if (!cover || !ov) throw new Error('Die Vorlage sieht nicht wie ein TAIFUN-Aboangebot aus (Anschreiben oder Angebotsübersicht fehlt).');
    var src = await L.PDFDocument.load(templateBytes), out = await L.PDFDocument.create();
    out.registerFontkit(window.fontkit);
    var fb = await loadFontBytes(), F = {};
    for (var k in fb) F[k] = await out.embedFont(fb[k], { subset: true });
    var ctx = { L: L, out: out, F: F, data: data }, list = [];
    var ovPages = layoutOverview(ctx);
    for (var i = 0; i < tpl.length; i++) {
      var p = tpl[i];
      if (p.kind === 'blank' || (p.ki && !data.ki)) continue;
      if (p.kind === 'overview') {
        for (var j = 0; j < ovPages.length; j++) {
          var cp = (await out.copyPages(src, [p.index]))[0];
          out.addPage(cp); backgroundOnly(L, out, cp);
          list.push({ pg: cp, tpl: p, clean: true, ops: ovPages[j] });
        }
        continue;
      }
      var pg = (await out.copyPages(src, [p.index]))[0];
      out.addPage(pg);
      var e = { pg: pg, tpl: p, edits: [], after: [] };
      if (p.kind === 'cover') fillCover(ctx, e);
      else if (p.kind === 'title') fillTitle(ctx, e);
      fillStatic(ctx, e, pg);
      list.push(e);
    }
    list.forEach(function (e, n) { finishPage(ctx, e, n + 1, list.length); });
    out.setTitle('Aboangebot ' + data.offerNo);
    out.setSubject(data.customer.name || '');
    out.setCreator('Angebotsmappe');
    out.setProducer('Angebotsmappe');
    return await out.save();
  }

  window.AngebotPDF = { build: build, inspect: inspect, ensureLibs: ensureLibs };
})();
