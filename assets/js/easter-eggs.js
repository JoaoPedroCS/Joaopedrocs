'use strict';

(function () {

  // Current-language string (see preferences.js); falls back to English.
  const L = function (en, pt) { return window.I18N ? window.I18N.L(en, pt) : en; };
  const clamp = function (v, min, max) { return Math.min(Math.max(v, min), max); };
  const rand = function (min, max) { return min + Math.random() * (max - min); };
  const pick = function (list) { return list[Math.floor(Math.random() * list.length)]; };
  const own = function (obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); };
  const normalize = function (text) {
    return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  };
  const escapeHTML = function (text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  const reducedMotion = function () {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };
  const canAnimate = function (el) { return !reducedMotion() && typeof el.animate === "function"; };

  const STORE_KEY = "jp-easter-eggs";
  const state = (function () {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { saved = {}; }
    return {
      starwars: saved.starwars === true,
      dino: saved.dino === true,
      dig: false,
      cinema: saved.cinema === true,
      cine: false,
      terminal: saved.terminal === true,
      sky: false
    };
  })();
  const saveState = function () {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { }
  };
  const foundCount = function () {
    return ["starwars", "dino", "cinema", "terminal"].filter(function (k) { return state[k]; }).length;
  };

  const TOAST_MS = 9000;
  let toastBox = null;

  const toast = function (html, options) {
    const opts = options || {};
    if (!toastBox) {
      toastBox = document.createElement("div");
      toastBox.className = "egg-toasts";
      toastBox.setAttribute("aria-live", "polite");
      document.body.appendChild(toastBox);
    }
    if (opts.group) {
      toastBox.querySelectorAll('[data-group="' + opts.group + '"]').forEach(function (old) { old.remove(); });
    }
    const el = document.createElement("div");
    el.className = "egg-toast";
    el.innerHTML =
      '<div class="egg-toast-body">' + html + "</div>" +
      '<button class="egg-toast-close" type="button" aria-label="' + L("Dismiss", "Fechar aviso") + '">×</button>' +
      '<i class="egg-toast-timer" aria-hidden="true"></i>';
    if (opts.group) el.setAttribute("data-group", opts.group);
    const ms = opts.duration || TOAST_MS;
    el.style.setProperty("--toast-ms", ms + "ms");
    toastBox.appendChild(el);
    while (toastBox.children.length > 3) toastBox.firstElementChild.remove();

    let timer = 0;
    let remaining = ms;
    let startedAt = Date.now();
    const close = function () {
      clearTimeout(timer);
      if (!el.isConnected || el.classList.contains("is-leaving")) return;
      el.classList.add("is-leaving");
      setTimeout(function () { el.remove(); }, 300);
    };
    timer = setTimeout(close, remaining);
    const pause = function () {
      el.classList.add("is-paused");
      clearTimeout(timer);
      remaining -= Date.now() - startedAt;
    };
    const resume = function () {
      el.classList.remove("is-paused");
      startedAt = Date.now();
      timer = setTimeout(close, Math.max(remaining, 1500));
    };
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    el.querySelector(".egg-toast-close").addEventListener("click", close);
    return { el: el, close: close };
  };

  // A banner on screen would be in the old language after a switch; just clear it.
  if (window.I18N) window.I18N.onChange(function () { if (toastBox) toastBox.innerHTML = ""; });

  // Every egg shares this single, short banner, shown only the first time it's found.
  const discover = function (key) {
    if (state[key]) return;
    state[key] = true;
    saveState();
    const n = foundCount();
    toast(n === 4
      ? L("🏆 <b>All 4 easter eggs found!</b>", "🏆 <b>Você achou os 4 easter eggs!</b>")
      : L("🥚 <b>Easter egg found</b> · " + n + "/4", "🥚 <b>Easter egg encontrado</b> · " + n + "/4"),
      { group: "found", duration: 4000 });
  };

  let skyUsed = false;
  const sw = (function () {
    let wrap = null;
    let canvas = null;
    let ctx = null;
    let stars = [];
    let meteors = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = false;
    let nextMeteor = 0;
    let tieTimer = 0;
    let jumpAt = -1;
    let busy = false;
    let streaks = [];
    let spin = 0;
    const SEQ = { ship: 950, open: 1500, burn: 2150, flash: 2850, arrive: 3650, settle: 1300 };
    const seg = function (e, a, b) { return clamp((e - a) / (b - a), 0, 1); };
    const smooth = function (x) { return x * x * (3 - 2 * x); };

    const xwingSVG = function () {
      const cx = 160;
      const cy = 108;
      const wing = function (sx, sy, cls) {
        const X = function (v) { return (cx + sx * v).toFixed(1); };
        const Y = function (v) { return (cy + v).toFixed(1); };
        const oy = sy * 6;
        const ey = oy + sy * 12.5;
        const quad = function (x1, t1, x2, t2) {
          return "M" + X(x1) + " " + Y(oy - t1) + "L" + X(x2) + " " + Y(oy - t2) + "L" + X(x2) + " " + Y(oy + t2) + "L" + X(x1) + " " + Y(oy + t1) + "Z";
        };
        const ring = function (r, attrs) {
          return '<circle cx="' + X(33) + '" cy="' + Y(ey) + '" r="' + r + '" ' + attrs + "/>";
        };
        return '<g class="xw-wing ' + cls + '">' +
          ring(17, 'class="xw-glow" fill="url(#egg-xw-glow)"') +
          '<path d="M' + X(24) + " " + Y(oy) + "L" + X(42) + " " + Y(oy) + "L" + X(39) + " " + Y(ey) + "L" + X(27) + " " + Y(ey) + 'Z" fill="#7f8792"/>' +
          '<path d="' + quad(18, 5.5, 137, 2.2) + '" fill="url(#egg-xw-hull)" stroke="#5d6571" stroke-width="1"/>' +
          '<path d="' + quad(100, 2.9, 116, 2.6) + '" fill="#c9473c"/>' +
          '<path d="M' + X(30) + " " + Y(oy) + "L" + X(132) + " " + Y(oy) + '" stroke="#6b7380" stroke-width=".6" opacity=".6"/>' +
          ring(13, 'fill="#4b525d" stroke="#a3aab4" stroke-width="1.3"') +
          ring(9.6, 'fill="#1b1f25"') +
          ring(7.4, 'fill="url(#egg-xw-core)"') +
          '<circle cx="' + X(141) + '" cy="' + Y(oy) + '" r="5.4" fill="#cfd3d9" stroke="#59616d" stroke-width="1.2"/>' +
          '<circle cx="' + X(141) + '" cy="' + Y(oy) + '" r="2.3" fill="#20252c"/>' +
          "</g>";
      };
      return '<svg viewBox="0 0 320 216" focusable="false" aria-hidden="true"><defs>' +
        '<linearGradient id="egg-xw-hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f3f6"/><stop offset="1" stop-color="#a9b0b9"/></linearGradient>' +
        '<radialGradient id="egg-xw-core"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#ffd9cc"/><stop offset=".7" stop-color="#ff6b4f"/><stop offset="1" stop-color="#c73226"/></radialGradient>' +
        '<radialGradient id="egg-xw-glow"><stop offset="0" stop-color="#ff9a80" stop-opacity=".95"/><stop offset=".45" stop-color="#ff5038" stop-opacity=".4"/><stop offset="1" stop-color="#ff3020" stop-opacity="0"/></radialGradient>' +
        "</defs>" +
        wing(-1, 1, "xw-ll") + wing(1, 1, "xw-lr") + wing(-1, -1, "xw-ul") + wing(1, -1, "xw-ur") +
        '<path d="M144 96L176 96L167.5 62L152.5 62Z" fill="url(#egg-xw-hull)" stroke="#5d6571" stroke-width="1"/>' +
        '<path d="M152.5 62L167.5 62L165 55L155 55Z" fill="#b9bfc7" stroke="#5d6571" stroke-width=".8"/>' +
        '<path d="M151.5 81L168.5 81L165.6 67L154.4 67Z" fill="#26303d" stroke="#5d6571" stroke-width=".9"/>' +
        '<path d="M156 70L158.5 70L157.6 78L155 78Z" fill="#7d93b5" opacity=".55"/>' +
        '<path d="M150 92a10 10 0 0 1 20 0z" fill="#eceff3" stroke="#5d6571" stroke-width="1"/>' +
        '<rect x="155" y="85.5" width="5" height="3" rx=".8" fill="#3d6cc0"/><circle cx="164" cy="88" r="1.4" fill="#20252c"/>' +
        '<rect x="141" y="91" width="38" height="34" rx="7" fill="url(#egg-xw-hull)" stroke="#5d6571" stroke-width="1.2"/>' +
        '<rect x="147.5" y="98" width="25" height="19" rx="3" fill="#8d949e" stroke="#5d6571" stroke-width=".8"/>' +
        '<path d="M150 103h20M150 107.5h20M150 112h20" stroke="#5d6571" stroke-width=".9"/>' +
        '<circle cx="160" cy="121" r="1.3" fill="#ff5a4a"/>' +
        "</svg>";
    };

    const TIE_SVG =
      '<svg viewBox="0 0 64 48" focusable="false" aria-hidden="true">' +
      '<path d="M4 2h6v44H4zM54 2h6v44h-6z" fill="#1b2230" stroke="#5b6b85" stroke-width="1.5"/>' +
      '<path d="M10 24h10M44 24h10" stroke="#5b6b85" stroke-width="3"/>' +
      '<circle cx="32" cy="24" r="12" fill="#222b3b" stroke="#7d8da8" stroke-width="2"/>' +
      '<circle cx="32" cy="24" r="5" fill="#0b1018" stroke="#ff4654" stroke-width="1.5"/></svg>';

    const build = function () {
      wrap = document.createElement("div");
      wrap.className = "egg-sky";
      wrap.setAttribute("aria-hidden", "true");
      wrap.innerHTML =
        '<canvas class="egg-sky-canvas"></canvas>' +
        '<i class="egg-sky-flash"></i>' +
        '<div class="egg-tie" hidden>' + TIE_SVG + "</div>";
      document.body.insertBefore(wrap, document.body.firstChild);
      canvas = wrap.querySelector("canvas");
      ctx = canvas.getContext("2d");
      window.addEventListener("resize", resize);
      resize();
    };

    const resize = function () {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = clamp(Math.round((w * h) / 4500), 80, 420);
      stars = [];
      for (let i = 0; i < count; i++) {
        const z = Math.random();
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: z,
          r: 0.4 + z * 1.4,
          phase: Math.random() * 6.28,
          rate: rand(0.6, 2.2),
          tint: Math.random() < 0.18 ? "255,200,190" : (Math.random() < 0.3 ? "190,215,255" : "255,255,255")
        });
      }
      if (!running) drawFrame(performance.now(), 0);
    };

    const spawnMeteor = function () {
      const fromTop = Math.random() < 0.6;
      meteors.push({
        x: fromTop ? rand(w * 0.3, w * 1.1) : w + 20,
        y: fromTop ? -20 : rand(0, h * 0.5),
        vx: -rand(600, 900),
        vy: rand(260, 420),
        life: 0,
        max: rand(0.9, 1.5)
      });
    };

    const drawFrame = function (now, dt) {
      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;
      const cx = w / 2;
      const cy = h / 2;

      let warp = 0;
      let tunnel = 0;
      if (jumpAt >= 0) {
        const e = now - jumpAt;
        if (e >= SEQ.arrive + SEQ.settle) { jumpAt = -1; }
        else {
          warp = e < SEQ.flash
            ? Math.pow(seg(e, SEQ.burn, SEQ.flash), 2.2)
            : 1 - smooth(seg(e, SEQ.arrive - 200, SEQ.arrive + 900));
          tunnel = smooth(seg(e, SEQ.flash - 140, SEQ.flash + 140)) * (1 - smooth(seg(e, SEQ.arrive - 380, SEQ.arrive + 160)));
        }
      }

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if (!reducedMotion() && dt > 0) {
          s.x -= (4 + s.z * 16) * dt;
          if (s.x < -2) { s.x = w + 2; s.y = Math.random() * h; }
        }
        const tw = reducedMotion() ? 0.8 : 0.55 + 0.45 * Math.sin(t * s.rate + s.phase);
        const alpha = clamp(tw * (0.35 + s.z * 0.65), 0.1, 1) * (1 - tunnel * 0.85);
        if (warp > 0.01) {
          const dx = s.x - cx;
          const dy = s.y - cy;
          const push = 1 + warp * (0.6 + s.z * 2.4);
          const x2 = cx + dx * push;
          const y2 = cy + dy * push;
          const tail = 1 + warp * (0.5 + s.z * 1.6);
          ctx.strokeStyle = "rgba(" + s.tint + "," + clamp(alpha + warp * 0.4, 0, 1) + ")";
          ctx.lineWidth = s.r * (0.8 + warp * 0.6);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(cx + dx * (push / tail), cy + dy * (push / tail));
          ctx.lineTo(x2, y2);
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(" + s.tint + "," + alpha + ")";
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, 6.2832);
          ctx.fill();
        }
      }

      if (tunnel > 0.01) drawTunnel(dt, tunnel, cx, cy);

      if (!reducedMotion() && dt > 0 && jumpAt < 0) {
        if (now > nextMeteor && meteors.length < 3) {
          spawnMeteor();
          nextMeteor = now + rand(2500, 6500);
        }
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];
          m.life += dt;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          const fade = Math.sin(clamp(m.life / m.max, 0, 1) * Math.PI);
          const len = 0.14;
          const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * len, m.y - m.vy * len);
          grad.addColorStop(0, "rgba(255,255,255," + fade + ")");
          grad.addColorStop(1, "rgba(160,190,255,0)");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(m.x - m.vx * len, m.y - m.vy * len);
          ctx.stroke();
          if (m.life > m.max) meteors.splice(i, 1);
        }
      }
    };

    const newStreak = function (maxR, anywhere) {
      return {
        a: Math.random() * 6.2832,
        d: (anywhere ? rand(0.03, 1) : rand(0.01, 0.07)) * maxR,
        v: rand(1.7, 3),
        wd: rand(0.5, 1.6),
        tint: pick(["205,225,255", "150,190,255", "255,255,255", "120,160,255", "225,235,255"])
      };
    };

    const seedTunnel = function () {
      const maxR = Math.hypot(w, h) / 2;
      const n = clamp(Math.round((w + h) / 5), 160, 380);
      streaks = [];
      for (let i = 0; i < n; i++) streaks.push(newStreak(maxR, true));
    };

    const drawTunnel = function (dt, k, cx, cy) {
      const maxR = Math.hypot(w, h) / 2;
      spin += dt * 0.3;
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      bg.addColorStop(0, "rgba(190,215,255," + 0.55 * k + ")");
      bg.addColorStop(0.07, "rgba(60,95,200," + 0.45 * k + ")");
      bg.addColorStop(0.45, "rgba(10,18,52," + 0.8 * k + ")");
      bg.addColorStop(1, "rgba(2,4,14," + 0.92 * k + ")");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (let i = 0; i < streaks.length; i++) {
        const s = streaks[i];
        s.d += (s.d * s.v + 30) * dt;
        if (s.d > maxR * 1.15) { streaks[i] = newStreak(maxR, false); continue; }
        const f = s.d / maxR;
        const a = s.a + spin * (0.4 + (1 - f) * 0.6);
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const r0 = s.d * 0.62;
        ctx.strokeStyle = "rgba(" + s.tint + "," + (k * clamp(f * 4, 0, 1) * 0.8) + ")";
        ctx.lineWidth = s.wd * (0.4 + f * 2.6);
        ctx.beginPath();
        ctx.moveTo(cx + ca * r0, cy + sa * r0);
        ctx.lineTo(cx + ca * s.d, cy + sa * s.d);
        ctx.stroke();
      }
      ctx.restore();
    };

    let last = 0;
    const loop = function (now) {
      if (!running) return;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      drawFrame(now, dt);
      raf = requestAnimationFrame(loop);
    };

    const scheduleTie = function () {
      clearTimeout(tieTimer);
      if (!running || reducedMotion()) return;
      tieTimer = setTimeout(function () {
        const tie = wrap && wrap.querySelector(".egg-tie");
        if (tie && !document.hidden && canAnimate(tie)) {
          const y = rand(8, 60);
          const fromLeft = Math.random() < 0.5;
          tie.style.top = y + "%";
          tie.style.transform = "";
          tie.hidden = false;
          const a = fromLeft ? -120 : w + 120;
          const b = fromLeft ? w + 120 : -120;
          const flight = tie.animate(
            [
              { transform: "translate(" + a + "px, 0) scale(.6) rotate(" + (fromLeft ? 8 : -8) + "deg)" },
              { transform: "translate(" + b + "px, " + rand(-60, 60) + "px) scale(1) rotate(" + (fromLeft ? -8 : 8) + "deg)" }
            ],
            { duration: rand(7000, 10000), easing: "ease-in-out", fill: "forwards" }
          );
          flight.onfinish = function () { tie.hidden = true; };
        }
        scheduleTie();
      }, rand(22000, 40000));
    };

    const start = function () {
      if (!wrap) build();
      wrap.hidden = false;
      requestAnimationFrame(function () { wrap.classList.add("is-on"); });
      document.body.classList.add("egg-sky-on");
      if (!running) {
        running = true;
        last = 0;
        nextMeteor = performance.now() + 1500;
        raf = requestAnimationFrame(loop);
        scheduleTie();
      }
    };

    const stop = function () {
      running = false;
      cancelAnimationFrame(raf);
      clearTimeout(tieTimer);
      document.body.classList.remove("egg-sky-on");
      if (wrap) {
        wrap.classList.remove("is-on");
        setTimeout(function () { if (!state.sky && wrap) wrap.hidden = true; }, 700);
      }
    };

    let hyperLayer = null;
    const shipEl = function () {
      if (!hyperLayer) {
        hyperLayer = document.createElement("div");
        hyperLayer.className = "egg-hyper";
        hyperLayer.setAttribute("aria-hidden", "true");
        hyperLayer.innerHTML = '<div class="egg-xwing">' + xwingSVG() + "</div>";
      }
      if (!hyperLayer.isConnected) document.body.appendChild(hyperLayer);
      return hyperLayer.firstElementChild;
    };

    const panels = function () {
      return Array.prototype.filter.call(
        document.querySelectorAll(".sidebar, .navbar, main article.active"),
        function (el) { return el.getClientRects().length > 0; }
      );
    };

    const AWAY = [1, 0.82, 0.45, 0.17, 0.03];
    const stopAnims = function (el) {
      if (typeof el.getAnimations === "function") el.getAnimations().forEach(function (a) { a.cancel(); });
    };

    const jump = function (done) {
      busy = true;
      document.body.classList.add("egg-hyper-busy");
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const later = function (ms, fn) { setTimeout(fn, ms); };

      const flying = panels().map(function (el) {
        const r = el.getBoundingClientRect();
        const o = (vw / 2 - r.left).toFixed(1) + "px " + (vh / 2 - r.top).toFixed(1) + "px";
        const frames = AWAY.map(function (sc, i) {
          return { transform: "scale(" + sc + ")", transformOrigin: o, opacity: i < 3 ? 1 : (i === 3 ? 0.7 : 0) };
        });
        return { el: el, o: o, anim: el.animate(frames, { duration: 1150, easing: "cubic-bezier(.45,0,.75,.5)", fill: "forwards" }) };
      });

      jumpAt = performance.now();
      seedTunnel();

      const ship = shipEl();
      ship.classList.remove("is-open", "is-burn");
      stopAnims(ship);
      const restY = Math.round(vh * 0.16);
      const at = function (y, sc, rot) { return "translate(0px, " + y + "px) scale(" + sc + ") rotate(" + (rot || 0) + "deg)"; };

      later(SEQ.ship, function () {
        ship.animate([
          { transform: at(Math.round(vh * 0.8), 2.1, -8), opacity: 0 },
          { opacity: 1, offset: 0.2 },
          { transform: at(restY, 1, 0), opacity: 1 }
        ], { duration: 1150, easing: "cubic-bezier(.16,.84,.3,1)", fill: "forwards" });
      });
      later(SEQ.open, function () { ship.classList.add("is-open"); });
      later(SEQ.burn, function () {
        ship.classList.add("is-burn");
        ship.animate([
          { transform: at(restY, 1), opacity: 1, filter: "brightness(1) blur(0px)", easing: "cubic-bezier(.3,0,.4,1)" },
          { transform: at(restY + 10, 1.04), opacity: 1, filter: "brightness(1.15) blur(0px)", offset: 0.42, easing: "cubic-bezier(.75,0,1,.7)" },
          { transform: at(Math.round(restY * 0.25), 0.22), opacity: 1, filter: "brightness(1.8) blur(0.6px)", offset: 0.88 },
          { transform: at(0, 0.01), opacity: 0, filter: "brightness(3) blur(2px)" }
        ], { duration: SEQ.flash + 60 - SEQ.burn, fill: "forwards" });
      });
      later(SEQ.flash, function () {
        const flash = wrap && wrap.querySelector(".egg-sky-flash");
        if (flash && canAnimate(flash)) {
          flash.animate([{ opacity: 0 }, { opacity: 0.95, offset: 0.2 }, { opacity: 0 }], { duration: 700, easing: "ease-out" });
        }
      });
      later(SEQ.arrive, function () {
        flying.forEach(function (f, i) {
          f.anim.cancel();
          f.el.animate([
            { transform: "scale(0.03)", transformOrigin: f.o, opacity: 0 },
            { opacity: 1, offset: 0.28 },
            { transform: "scale(1)", transformOrigin: f.o, opacity: 1 }
          ], { duration: SEQ.settle - 100, delay: i * 70, easing: "cubic-bezier(.1,.75,.2,1)", fill: "backwards" });
        });
      });
      later(SEQ.arrive + SEQ.settle + 150, function () {
        stopAnims(ship);
        ship.classList.remove("is-open", "is-burn");
        if (hyperLayer) hyperLayer.remove();
        document.body.classList.remove("egg-hyper-busy");
        busy = false;
        if (done) done();
      });
    };

    return {
      isOn: function () { return state.sky; },
      isBusy: function () { return busy; },
      on: function (withJump, done) {
        skyUsed = true;
        state.sky = true;
        saveState();
        start();
        if (withJump && !busy && !reducedMotion() && typeof document.body.animate === "function") {
          jump(done);
        } else if (done) {
          done();
        }
      },
      off: function () {
        if (busy) return;
        state.sky = false;
        saveState();
        stop();
      },
      toggle: function (done) {
        if (busy) return state.sky;
        if (state.sky) { sw.off(); return false; }
        sw.on(true, done);
        return true;
      }
    };
  })();

  const GROGU_SVG =
    '<svg viewBox="0 0 80 60" focusable="false" aria-hidden="true">' +
    "<defs>" +
      '<radialGradient id="gg-skin" cx=".42" cy=".3" r=".8"><stop offset="0" stop-color="#c3dba2"/><stop offset=".55" stop-color="#a3c183"/><stop offset="1" stop-color="#7d9c60"/></radialGradient>' +
      '<linearGradient id="gg-ear" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9c688"/><stop offset="1" stop-color="#84a366"/></linearGradient>' +
      '<linearGradient id="gg-inner" x1="1" y1="0" x2="0" y2=".6"><stop offset="0" stop-color="#c98f84"/><stop offset="1" stop-color="#ecc1b2"/></linearGradient>' +
      '<radialGradient id="gg-eye" cx=".45" cy=".4" r=".65"><stop offset="0" stop-color="#4a2f1a"/><stop offset=".6" stop-color="#1d120a"/><stop offset="1" stop-color="#0a0604"/></radialGradient>' +
      '<linearGradient id="gg-robe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9ad80"/><stop offset="1" stop-color="#8d7049"/></linearGradient>' +
      '<linearGradient id="gg-collar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1e6c8"/><stop offset="1" stop-color="#cdb88c"/></linearGradient>' +
    "</defs>" +
    '<g class="g-ears">' +
      '<g><path d="M29 24.2C22.5 21.6 12.5 18.8 1.2 20.2C3.6 26.4 12.6 34.2 28 37Z" fill="url(#gg-ear)" stroke="#55703f" stroke-width=".7" stroke-linejoin="round"/><path d="M27 26.6C20.6 24.6 13.4 23 5.6 22.8C8.8 27.2 16 32 27 34.2Z" fill="url(#gg-inner)"/><path d="M25.5 28.4C19.5 26.6 13.5 25.2 8.4 24.6" fill="none" stroke="#b9796f" stroke-width=".5" stroke-linecap="round" opacity=".7"/></g>' +
      '<g transform="matrix(-1 0 0 1 80 0)"><path d="M29 24.2C22.5 21.6 12.5 18.8 1.2 20.2C3.6 26.4 12.6 34.2 28 37Z" fill="url(#gg-ear)" stroke="#55703f" stroke-width=".7" stroke-linejoin="round"/><path d="M27 26.6C20.6 24.6 13.4 23 5.6 22.8C8.8 27.2 16 32 27 34.2Z" fill="url(#gg-inner)"/><path d="M25.5 28.4C19.5 26.6 13.5 25.2 8.4 24.6" fill="none" stroke="#b9796f" stroke-width=".5" stroke-linecap="round" opacity=".7"/></g>' +
    "</g>" +
    '<path d="M21.5 60L24.6 47.4Q40 40.5 55.4 47.4L58.5 60Z" fill="url(#gg-robe)" stroke="#6f5636" stroke-width=".7" stroke-linejoin="round"/>' +
    '<path d="M31 51.5L29.6 60M40 52.4V60M49 51.5L50.4 60" fill="none" stroke="#7a6040" stroke-width=".55" stroke-linecap="round" opacity=".7"/>' +
    '<path d="M23.6 47.6C26.6 42.4 33.6 40.6 40 40.6C46.4 40.6 53.4 42.4 56.4 47.6C52.6 51 46.4 52.2 40 52.2C33.6 52.2 27.4 51 23.6 47.6Z" fill="url(#gg-collar)" stroke="#9c8358" stroke-width=".6" stroke-linejoin="round"/>' +
    '<path d="M27 47.6Q40 51.6 53 47.6" fill="none" stroke="#b39a6c" stroke-width=".55" stroke-linecap="round"/>' +
    '<path d="M26.4 30.2C26.4 21.6 32.4 16.8 40 16.8C47.6 16.8 53.6 21.6 53.6 30.2C53.6 37.6 48 43 40 43C32 43 26.4 37.6 26.4 30.2Z" fill="url(#gg-skin)" stroke="#55703f" stroke-width=".7"/>' +
    '<path d="M33.4 22.4Q40 20 46.6 22.4M35.6 19.8Q40 18.4 44.4 19.8" fill="none" stroke="#7b9a5e" stroke-width=".55" stroke-linecap="round"/>' +
    '<path d="M37.6 17.4Q36.4 13.4 33.6 11.6M40 16.8Q39.8 12.6 41 9.8M42.4 17.4Q43.6 13.2 46.8 11.4M35.4 18.2Q33.4 15.8 31 15.2M44.6 18.2Q46.6 15.8 49 15.4" fill="none" stroke="#f3eee2" stroke-width=".4" stroke-linecap="round" opacity=".8"/>' +
    '<ellipse cx="30.4" cy="36.2" rx="2.6" ry="1.7" fill="#e79c8c" opacity=".3"/><ellipse cx="49.6" cy="36.2" rx="2.6" ry="1.7" fill="#e79c8c" opacity=".3"/>' +
    '<g class="g-eyes">' +
      '<ellipse cx="33.5" cy="30.8" rx="4.5" ry="4.9" fill="url(#gg-eye)"/><ellipse cx="46.5" cy="30.8" rx="4.5" ry="4.9" fill="url(#gg-eye)"/>' +
      '<circle cx="35.1" cy="28.9" r="1.35" fill="#fff"/><circle cx="48.1" cy="28.9" r="1.35" fill="#fff"/>' +
      '<circle cx="32" cy="33" r=".6" fill="#fff" opacity=".6"/><circle cx="45" cy="33" r=".6" fill="#fff" opacity=".6"/>' +
    "</g>" +
    '<path d="M28.8 28.4Q33.4 24 38.2 28.2M41.8 28.2Q46.6 24 51.2 28.4" fill="none" stroke="#6d8a52" stroke-width=".7" stroke-linecap="round"/>' +
    '<path d="M30.4 35.6Q33.6 37.2 36.8 35.8M43.2 35.8Q46.4 37.2 49.6 35.6" fill="none" stroke="#7b9a5e" stroke-width=".4" stroke-linecap="round" opacity=".8"/>' +
    '<path d="M38.9 36.3Q40 37.2 41.1 36.3" fill="none" stroke="#587240" stroke-width=".7" stroke-linecap="round"/>' +
    '<path d="M37 39.3Q40 41 43 39.3" fill="none" stroke="#587240" stroke-width=".7" stroke-linecap="round"/>' +
    '<g class="g-hand">' +
      '<path d="M51.6 50.4L60.4 44.2Q63.6 46 64.6 49.6L56.6 56Z" fill="url(#gg-robe)" stroke="#6f5636" stroke-width=".65" stroke-linejoin="round"/>' +
      '<path d="M60.6 44.4Q63.2 46.2 64.2 49.4" fill="none" stroke="#e6d6b0" stroke-width="1.1" stroke-linecap="round"/>' +
      '<path d="M61.6 42.6L60.6 39.4M63.9 42L64.1 38.6M66 43.2L67.6 40.4" fill="none" stroke="#55703f" stroke-width="2.3" stroke-linecap="round"/>' +
      '<circle cx="63.6" cy="45" r="3" fill="#9fbd7f" stroke="#55703f" stroke-width=".65"/>' +
      '<path d="M61.6 42.6L60.6 39.4M63.9 42L64.1 38.6M66 43.2L67.6 40.4" fill="none" stroke="#a9c688" stroke-width="1.25" stroke-linecap="round"/>' +
    "</g>" +
    "</svg>";

  const GROGU_MS = 50000;
  let groguBusy = false;

  const groguSpot = function () {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const size = vw < 580 ? 62 : 76;
    const fits = function (el) {
      if (!el || !el.getClientRects().length) return null;
      const r = el.getBoundingClientRect();
      if (r.top < 60 || r.top > vh * 0.8 || r.width < 160) return null;
      return { edge: r.top, x: r.left + r.width * rand(0.55, 0.78) - size / 2 };
    };
    const navbar = document.querySelector(".navbar");
    const navFixed = navbar && getComputedStyle(navbar).position === "fixed";
    const spot =
      fits(document.querySelector("main article.active")) ||
      fits(document.querySelector(".sidebar")) ||
      (navFixed ? { edge: navbar.getBoundingClientRect().top, x: vw * rand(0.55, 0.75) - size / 2 } : null) ||
      { edge: vh, x: vw * 0.7 - size / 2 };
    spot.size = size;
    return spot;
  };

  const runGrogu = function () {
    const star = document.querySelector("[data-egg-starwars]");
    if (!star || groguBusy || state.sky || sw.isBusy()) return;
    if (reducedMotion() || typeof star.animate !== "function") { star.click(); return; }
    groguBusy = true;
    document.body.classList.add("egg-grogu-on");

    const spot = groguSpot();
    const h = spot.size * 0.75;
    const shown = h * 0.8;
    const peek = document.createElement("div");
    peek.className = "egg-grogu-peek";
    peek.setAttribute("aria-hidden", "true");
    peek.style.cssText = "left:" + Math.round(spot.x) + "px;top:" + Math.round(spot.edge - shown) + "px;width:" + spot.size + "px;height:" + Math.round(shown) + "px;";
    peek.innerHTML = '<div class="egg-grogu">' + GROGU_SVG + "</div>";
    const force = document.createElement("div");
    force.className = "egg-force";
    force.setAttribute("aria-hidden", "true");
    document.body.appendChild(force);
    document.body.appendChild(peek);
    const body = peek.firstElementChild;
    const later = function (ms, fn) { setTimeout(fn, ms); };

    body.animate([
      { transform: "translateY(" + Math.round(shown + 4) + "px)" },
      { transform: "translateY(-2px) rotate(-4deg)", offset: 0.75 },
      { transform: "translateY(0) rotate(0)" }
    ], { duration: 950, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" });
    later(1150, function () { peek.classList.add("is-blink"); });
    later(1550, function () { peek.classList.add("is-force"); });

    const handAt = function () {
      const r = peek.getBoundingClientRect();
      return { x: r.left + r.width * 0.76, y: r.top + r.height * 0.62 };
    };
    const ripple = function () {
      const p = handAt();
      const ring = document.createElement("i");
      ring.className = "egg-force-ring";
      ring.style.left = p.x + "px";
      ring.style.top = p.y + "px";
      force.appendChild(ring);
      setTimeout(function () { ring.remove(); }, 1000);
    };
    const ripples = [];
    later(1600, function () {
      ripple();
      ripples.push(setInterval(ripple, 420));
    });

    const sr = star.getBoundingClientRect();
    const sx = sr.left + sr.width / 2;
    const sy = sr.top + sr.height / 2;
    const dx = window.innerWidth / 2 - sx;
    const dy = window.innerHeight / 2 - sy;
    const cxp = dx * 0.85;
    const cyp = dy * 0.08;

    later(1700, function () {
      star.classList.add("is-forced");
      const frames = [
        { transform: "translate(0px, 0px) rotate(0deg) scale(1)", offset: 0 },
        { transform: "translate(2px, -3px) rotate(-10deg) scale(1.1)", offset: 0.05 },
        { transform: "translate(-2px, 1px) rotate(9deg) scale(1.15)", offset: 0.1 },
        { transform: "translate(1px, -2px) rotate(-5deg) scale(1.2)", offset: 0.15 }
      ];
      for (let i = 1; i <= 16; i++) {
        const t0 = i / 16;
        const t = t0 * t0 * (3 - 2 * t0);
        const x = 2 * (1 - t) * t * cxp + t * t * dx;
        const y = 2 * (1 - t) * t * cyp + t * t * dy + Math.sin(t0 * Math.PI * 3) * 6 * (1 - t0);
        frames.push({
          transform: "translate(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px) rotate(" + (t0 * 360).toFixed(0) + "deg) scale(" + (1.2 + t * 1.8).toFixed(2) + ")",
          offset: 0.15 + 0.85 * t0
        });
      }
      star.animate(frames, { duration: 2800, easing: "linear", fill: "forwards" });

      const trailStart = performance.now();
      const trail = function (now) {
        if (now - trailStart > 2800 || !force.isConnected) return;
        const r = star.getBoundingClientRect();
        const dot = document.createElement("i");
        dot.className = "egg-force-dot";
        dot.style.left = (r.left + r.width / 2 + rand(-6, 6)) + "px";
        dot.style.top = (r.top + r.height / 2 + rand(-6, 6)) + "px";
        force.appendChild(dot);
        setTimeout(function () { dot.remove(); }, 900);
        setTimeout(function () { requestAnimationFrame(trail); }, 55);
      };
      requestAnimationFrame(trail);
    });

    const center = "translate(" + dx.toFixed(1) + "px, " + dy.toFixed(1) + "px) rotate(360deg)";
    later(4500, function () {
      star.animate([
        { transform: center + " scale(3)" },
        { transform: center + " scale(3.6)", offset: 0.5 },
        { transform: center + " scale(3)" }
      ], { duration: 650, easing: "ease-in-out", fill: "forwards" });
    });
    later(4700, function () {
      ripples.forEach(clearInterval);
      peek.classList.remove("is-force");
      body.animate([
        { transform: "translateY(0)" },
        { transform: "translateY(-3px)", offset: 0.25 },
        { transform: "translateY(" + Math.round(shown + 4) + "px)" }
      ], { duration: 550, easing: "cubic-bezier(.5,0,.8,.4)", fill: "forwards" });
    });
    later(5150, function () {
      star.animate([
        { transform: center + " scale(3)", opacity: 1 },
        { transform: center + " scale(7)", opacity: 0 }
      ], { duration: 380, easing: "ease-out", fill: "forwards" });
    });
    later(5450, function () {
      peek.remove();
      star.getAnimations().forEach(function (a) { a.cancel(); });
      star.classList.remove("is-forced");
      star.animate([{ opacity: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1 }], { duration: 1600, easing: "ease-out" });
      document.body.classList.remove("egg-grogu-on");
      groguBusy = false;
      if (!state.sky) star.click();
      setTimeout(function () { force.remove(); }, 5200);
    });
  };

  const watchGrogu = function () {
    if (skyUsed) return;
    let visible = 0;
    let last = Date.now();
    const timer = setInterval(function () {
      const now = Date.now();
      if (!document.hidden) visible += Math.min(now - last, 2000);
      last = now;
      if (skyUsed) { clearInterval(timer); return; }
      if (visible < GROGU_MS || reducedMotion()) return;
      const blocked = document.body.classList.contains("modal-open") ||
        document.body.classList.contains("egg-term-open") ||
        document.querySelector(".egg-cine, .egg-slate-wrap, .egg-meteor");
      if (blocked || sw.isBusy()) return;
      clearInterval(timer);
      runGrogu();
    }, 1000);
  };

  const setupStarButton = function () {
    const btn = document.querySelector("[data-egg-starwars]");
    if (!btn) return;
    const sync = function () {
      btn.classList.toggle("is-on", state.sky);
      btn.setAttribute("aria-pressed", String(state.sky));
    };
    btn.addEventListener("click", function () {
      if (sw.isBusy()) return;
      sw.toggle(function () { discover("starwars"); });
      sync();
    });
    sync();
  };

  const buildFossils = function () {
    const R = function (v) { return Math.round(v * 10) / 10; };
    const P = function (p) { return R(p[0]) + " " + R(p[1]); };
    const add = function (a, b, k) { return [a[0] + b[0] * k, a[1] + b[1] * k]; };
    const unit = function (a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1; return [dx / m, dy / m]; };
    const perp = function (d) { return [d[1], -d[0]]; };
    const path = function (d, cls) { return '<path ' + (cls ? 'class="' + cls + '" ' : "") + 'd="' + d + '"/>'; };

    const curve = function (ctrl) {
      const pts = [];
      for (let i = 0; i < ctrl.length - 1; i++) {
        const p0 = ctrl[Math.max(i - 1, 0)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(i + 2, ctrl.length - 1)];
        for (let k = 0; k < 16; k++) {
          const t = k / 16, t2 = t * t, t3 = t2 * t;
          const f = function (a, b, c, d) { return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
          pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        }
      }
      pts.push(ctrl[ctrl.length - 1]);
      const acc = [0];
      for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const len = acc[acc.length - 1];
      const at = function (s) {
        s = Math.max(0, Math.min(len, s));
        let i = 1;
        while (i < acc.length - 1 && acc[i] < s) i++;
        const a = pts[i - 1], b = pts[i], seg = acc[i] - acc[i - 1] || 1, u = (s - acc[i - 1]) / seg;
        const d = unit(a, b);
        return { p: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], d: d, n: perp(d) };
      };
      return { at: at, len: len };
    };

    const stadium = function (a, b, r) {
      const d = unit(a, b), n = perp(d);
      return "M" + P(add(a, n, r)) + "L" + P(add(b, n, r)) + "A" + R(r) + " " + R(r) + " 0 0 1 " + P(add(b, n, -r)) +
        "L" + P(add(a, n, -r)) + "A" + R(r) + " " + R(r) + " 0 0 1 " + P(add(a, n, r)) + "Z";
    };
    const bone = function (a, b, w, ka, kb) {
      const d = unit(a, b), n = perp(d), h = w / 2;
      ka = Math.max(ka, h + 0.2); kb = Math.max(kb, h + 0.2);
      const oa = Math.sqrt(ka * ka - h * h), ob = Math.sqrt(kb * kb - h * h);
      const a1 = add(add(a, d, oa), n, h), a2 = add(add(a, d, oa), n, -h);
      const b1 = add(add(b, d, -ob), n, h), b2 = add(add(b, d, -ob), n, -h);
      return "M" + P(a1) + "L" + P(b1) + "A" + R(kb) + " " + R(kb) + " 0 1 1 " + P(b2) + "L" + P(a2) +
        "A" + R(ka) + " " + R(ka) + " 0 1 1 " + P(a1) + "Z";
    };
    const taper = function (p0, c, p1, w0, w1) {
      const L = [], Rr = [], N = 10;
      for (let i = 0; i <= N; i++) {
        const t = i / N, u = 1 - t;
        const p = [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
        const dv = [2 * u * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]), 2 * u * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1])];
        const m = Math.hypot(dv[0], dv[1]) || 1, n = [dv[1] / m, -dv[0] / m];
        const w = (w0 + (w1 - w0) * t) / 2;
        L.push(add(p, n, w)); Rr.push(add(p, n, -w));
      }
      const r0 = w0 / 2;
      return "M" + L.map(P).join("L") + "L" + Rr.reverse().map(P).join("L") +
        "A" + R(r0) + " " + R(r0) + " 0 0 1 " + P(L[0]) + "Z";
    };
    const circle = function (c, r) {
      return "M" + P([c[0] - r, c[1]]) + "a" + R(r) + " " + R(r) + " 0 1 0 " + R(2 * r) + " 0a" + R(r) + " " + R(r) + " 0 1 0 " + R(-2 * r) + " 0Z";
    };
    const ellipse = function (c, rx, ry) {
      return "M" + P([c[0] - rx, c[1]]) + "a" + R(rx) + " " + R(ry) + " 0 1 0 " + R(2 * rx) + " 0a" + R(rx) + " " + R(ry) + " 0 1 0 " + R(-2 * rx) + " 0Z";
    };

    const column = function (sp, regions, out) {
      let s = 0;
      regions.forEach(function (rg) {
        const step = rg.len / rg.n;
        for (let i = 0; i < rg.n; i++) {
          const t = rg.n > 1 ? i / (rg.n - 1) : 0;
          const c = sp.at(s + step * (i + 0.5));
          const r = typeof rg.r === "function" ? rg.r(t) : rg.r;
          const half = step * (rg.fill || 0.4);
          const a = add(c.p, c.d, -half), b = add(c.p, c.d, half);
          out.spine.push(stadium(a, b, r));
          const sh = rg.spine ? rg.spine(t) : 0;
          if (sh > 0.5) {
            const lean = rg.lean || 0;
            const base = add(c.p, c.n, r * 0.6);
            const tip = add(add(base, c.n, sh), c.d, sh * lean);
            const mid = add(add(base, c.n, sh * 0.5), c.d, sh * lean * 0.35);
            const sw = rg.spineW ? rg.spineW(t) : Math.min(step * 0.7, 3.2);
            out.spine.push(taper(base, mid, tip, sw, sw * 0.55));
          }
          const ch = rg.chevron ? rg.chevron(t) : 0;
          if (ch > 0.5) {
            const base = add(c.p, c.n, -r * 0.7);
            const tip = add(add(base, c.n, -ch), c.d, ch * 0.45);
            out.spine.push(taper(base, add(add(base, c.n, -ch * 0.5), c.d, ch * 0.1), tip, Math.min(step * 0.55, 2.4), 0.7));
          }
          const rl = rg.rib ? rg.rib(t, i) : 0;
          if (rl > 0.5) {
            const base = add(c.p, c.n, -r * 0.3);
            const back = rg.ribBack === undefined ? 0.32 : rg.ribBack;
            const tip = add(add(base, c.n, -rl), c.d, rl * back);
            const mid = add(add(base, c.n, -rl * 0.55), c.d, -rl * 0.12 + rl * back * 0.2);
            out.ribs.push(taper(base, mid, tip, rg.ribW || 2.6, 0.8));
          }
          if (rg.cervRib) {
            const base = add(c.p, c.n, -r * 1.1);
            const tip = add(base, c.d, step * rg.cervRib);
            out.ribs.push(taper(add(base, c.d, -step * 0.3), add(add(base, c.d, step * rg.cervRib * 0.5), c.n, -0.8), tip, 1.6, 0.4));
          }
        }
        s += rg.len;
      });
    };

    const teeth = function (from, to, n, len, dir, curl, w) {
      let d = "";
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const x = from[0] + (to[0] - from[0]) * t, y = from[1] + (to[1] - from[1]) * t;
        const l = typeof len === "function" ? len(t) : len;
        d += taper([x, y], [x + curl * 0.3, y + dir * l * 0.55], [x + curl, y + dir * l], w || 2.6, 0.2);
      }
      return d;
    };

    const toe = function (start, dir, segs, claw, w, down) {
      let p = start, d = "";
      const dv = unit([0, 0], dir);
      segs.forEach(function (l) {
        const q = add(p, dv, l);
        d += bone(p, q, w, w * 0.75, w * 0.75);
        p = add(q, dv, 0.6);
      });
      const tip = add(add(p, dv, claw), [0, 1], down || claw * 0.45);
      d += taper(p, add(p, dv, claw * 0.6), tip, w * 1.3, 0.2);
      return d;
    };

    const DEFS = "<defs>" +
      '<linearGradient id="egg-bone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdf5dc"/><stop offset=".5" stop-color="#ecd9ae"/><stop offset="1" stop-color="#c7a672"/></linearGradient>' +
      '<linearGradient id="egg-bone-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b79a6a"/><stop offset="1" stop-color="#8a6b42"/></linearGradient>' +
      "</defs>";
    const svg = function (vb, out, extra) {
      return '<svg viewBox="' + vb + '">' + DEFS + '<g fill="url(#egg-bone)">' +
        (out.far.length ? '<path class="far" fill="url(#egg-bone-far)" d="' + out.far.join("") + '"/>' : "") +
        '<path d="' + out.ribs.join("") + '"/>' +
        '<path d="' + out.spine.join("") + '"/>' +
        '<path d="' + out.near.join("") + '"/>' +
        (extra || "") + "</g></svg>";
    };
    const ilium = function (hx, hy, up, dn) {
      const q = function (x, y) { return P([hx + x, hy + y]); };
      return "M" + q(-31, 2) + "C" + q(-32, -up * 0.7) + " " + q(-16, -up) + " " + q(0, -up) +
        "C" + q(18, -up) + " " + q(34, -up * 0.5) + " " + q(36, 0) +
        "C" + q(28, 4) + " " + q(16, 3) + " " + q(10, dn * 0.8) +
        "C" + q(7, dn) + " " + q(-4, dn) + " " + q(-6, dn * 0.8) +
        "C" + q(-12, 4) + " " + q(-22, 6) + " " + q(-31, 2) + "Z";
    };
    const fresh = function () { return { far: [], ribs: [], spine: [], near: [] }; };

    const trex = function () {
      const o = fresh();
      const sp = curve([[66, 52], [78, 61], [90, 70], [104, 74], [126, 70], [160, 62], [196, 58], [218, 59], [252, 66], [292, 80], [336, 96], [396, 116]]);
      const neck = 46, dors = 98, sac = 32, cau = sp.len - neck - dors - sac;
      column(sp, [
        { n: 10, len: neck, r: 3.2, fill: 0.36, spine: function () { return 4; }, lean: -0.3, cervRib: 0.9 },
        { n: 13, len: dors, r: 3.5, spine: function (t) { return 10 + 3 * Math.sin(t * Math.PI); }, lean: 0.15,
          rib: function (t) { return [24, 33, 40, 44, 46, 46, 45, 42, 38, 33, 27, 20, 12][Math.round(t * 12)]; } },
        { n: 5, len: sac, r: 3.6, spine: function () { return 6; } },
        { n: 36, len: cau, r: function (t) { return 3.4 - 2.6 * t; }, fill: 0.42,
          spine: function (t) { return t < 0.55 ? 10 * (1 - t / 0.55) : 0; }, lean: 0.45,
          chevron: function (t) { return t < 0.7 ? 11 * (1 - t / 0.7) + 1 : 0; } }
      ], o);
      for (let i = 0; i < 11; i++) {
        const x = 112 + i * 7.5, y = 115 - i * 0.6 - Math.sin(i / 10 * Math.PI) * 3;
        o.ribs.push(taper([x - 5, y - 1.5], [x, y + 1.6], [x + 5, y - 1.8], 1.4, 0.6));
      }
      const hip = sp.at(neck + dors + sac * 0.5).p;
      const hx = hip[0], hy = hip[1];
      const A = [hx + 2, hy + 13];
      const Kf = [A[0] + 10, A[1] + 42], Af = [Kf[0] + 4, Kf[1] + 44], Ff = [Af[0] - 12, Af[1] + 22];
      o.far.push(bone(A, Kf, 7, 6, 6.2), bone(Kf, Af, 5.4, 5.6, 4.4), bone(Af, Ff, 4.2, 4, 3.4));
      o.far.push(toe(Ff, [-1, 0.25], [6, 5], 6, 2.8), toe(add(Ff, [0, 1.5], 1), [-0.6, 0.6], [5, 4], 5, 2.4));
      const sh = sp.at(neck + 8).p;
      o.near.push(taper([sh[0] + 20, sh[1] + 4], [sh[0] + 10, sh[1] + 18], [sh[0] + 1, sh[1] + 36], 4.6, 7.4));
      o.near.push(ellipse([sh[0] - 1, sh[1] + 39], 5.4, 4.2));
      const hum0 = [sh[0] - 2, sh[1] + 44], hum1 = [sh[0] + 4, sh[1] + 54], fa1 = [sh[0] - 3, sh[1] + 60];
      o.near.push(bone(hum0, hum1, 3.4, 3.2, 3), bone(hum1, fa1, 2.6, 2.6, 2.2));
      o.near.push(toe(fa1, [-1, 0.4], [3, 2.5], 4, 1.8, 2.5), toe(add(fa1, [0, 1], 1.5), [-0.8, 0.8], [3, 2.2], 3.5, 1.6, 2.5));
      o.near.push(ilium(hx, hy, 9, 8));
      o.near.push(taper([hx - 6, hy + 11], [hx - 12, hy + 32], [hx - 18, hy + 54], 7, 4.4));
      o.near.push("M" + P([hx - 32, hy + 57]) + "C" + P([hx - 32, hy + 51]) + " " + P([hx - 16, hy + 49]) + " " + P([hx - 10, hy + 53]) +
        "C" + P([hx - 6, hy + 57]) + " " + P([hx - 10, hy + 61]) + " " + P([hx - 20, hy + 61]) + "C" + P([hx - 26, hy + 61]) + " " + P([hx - 32, hy + 60]) + " " + P([hx - 32, hy + 57]) + "Z");
      o.near.push(taper([hx + 12, hy + 10], [hx + 20, hy + 26], [hx + 30, hy + 40], 6, 2.4));
      const K = [A[0] - 12, A[1] + 42], An = [K[0] + 16, K[1] + 40], F = [An[0] - 6, An[1] + 25];
      o.near.push(bone(A, K, 8, 6.6, 6.8), bone(K, An, 6, 6.2, 4.8));
      o.near.push(taper([K[0] + 5, K[1] + 5], [K[0] + 10, K[1] + 22], [An[0] + 3, An[1] - 4], 2.8, 1.6));
      o.near.push(bone(An, F, 4.6, 4.4, 3.6));
      o.near.push(toe(F, [-1, 0.15], [7, 6, 4], 7, 3.2), toe(add(F, [0.3, 1], 1.5), [-0.8, 0.55], [6, 5], 6, 2.8));
      const skull =
        "M2 22C2 14 6 9 14 8L40 6C52 4 60 0 66 3C72 1 82 3 90 7C96 10 100 14 101 19C103 25 102 31 98 36L92 40L70 35C55 33 40 34 25 34C14 33 6 30 2 22Z" +
        ellipse([11, 14], 4.2, 2.4) +
        "M34 22C38 14 50 11 59 14C62 19 58 26 50 28C43 29 36 27 34 22Z" +
        "M69 9C74 7 79 9 77 15L73 25C70 22 67 15 69 9Z" +
        "M84 13C90 11 95 16 95 22C95 28 91 32 86 30C82 26 81 18 84 13Z";
      const jaw = "M5 36C4 41 8 45 16 46L60 49C75 51 88 49 96 42L92 38L70 38C50 37 25 37 5 36Z" + ellipse([79, 43.5], 7, 2.2);
      const upperT = teeth([7, 30.5], [66, 33.5], 13, function (t) { return 4 + 4 * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5) - t * 2; }, 1, 1.4, 3);
      const lowerT = teeth([10, 37.5], [60, 38], 12, function (t) { return 3.5 + 2.5 * (1 - Math.abs(t - 0.35)); }, -1, 1.2, 2.6);
      const head = '<g class="skull" transform="translate(-9 29) scale(.78)">' +
        '<g transform="rotate(-12 92 40)"><path d="' + lowerT + '"/><path fill-rule="evenodd" d="' + jaw + '"/></g>' +
        '<path d="' + upperT + '"/><path fill-rule="evenodd" d="' + skull + '"/></g>';
      return svg("-12 0 412 210", o, head);
    };

    const sauro = function () {
      const o = fresh();
      const sp = curve([[58, 46], [66, 62], [80, 90], [98, 116], [122, 138], [150, 150], [184, 152], [216, 156], [236, 160], [266, 168], [302, 186], [338, 208], [366, 232], [394, 262]]);
      const neck = 156, dors = 84, sac = 26, cau = sp.len - neck - dors - sac;
      column(sp, [
        { n: 13, len: neck, r: function (t) { return 2.6 + 1.6 * t; }, fill: 0.43, spine: function (t) { return 2.5 + 3 * t; }, lean: 0.2, cervRib: 1.5 },
        { n: 12, len: dors, r: 4.4, fill: 0.42, spine: function (t) { return 13 - 3 * t; }, lean: 0.1, spineW: function () { return 4; }, ribW: 3.2, ribBack: 0.18,
          rib: function (t) { return [40, 54, 62, 66, 66, 64, 60, 54, 46, 36, 26, 16][Math.round(t * 11)]; } },
        { n: 5, len: sac, r: 4.4, spine: function () { return 8; } },
        { n: 34, len: cau, r: function (t) { return 4 - 3.2 * t; }, fill: 0.42,
          spine: function (t) { return t < 0.5 ? 9 * (1 - t / 0.5) : 0; }, lean: 0.4,
          chevron: function (t) { return t < 0.6 ? 9 * (1 - t / 0.6) + 1 : 0; } }
      ], o);
      const sh = sp.at(neck + 6).p;
      const hip = sp.at(neck + dors + sac * 0.5).p;
      const hx = hip[0], hy = hip[1];
      const Sf = [sh[0] + 10, sh[1] + 30], Ef = [Sf[0] + 6, Sf[1] + 48], Wf = [Ef[0] + 2, Ef[1] + 36];
      o.far.push(bone(Sf, Ef, 8, 7, 6), bone(Ef, Wf, 6, 5.6, 4.6), stadium(Wf, [Wf[0] + 1, Wf[1] + 12], 2.4), stadium([Wf[0] + 5, Wf[1]], [Wf[0] + 6, Wf[1] + 11], 2));
      const Af = [hx + 8, hy + 14], Kf = [Af[0] + 8, Af[1] + 48], Tf = [Kf[0] - 2, Kf[1] + 32];
      o.far.push(bone(Af, Kf, 9, 8, 7), bone(Kf, Tf, 7, 6.4, 5.4), toe(Tf, [-0.7, 1], [5, 3], 4, 3, 2));
      o.near.push(taper([sh[0] + 40, sh[1] - 2], [sh[0] + 20, sh[1] + 10], [sh[0] + 2, sh[1] + 30], 9, 12));
      o.near.push(ellipse([sh[0] + 1, sh[1] + 34], 6.5, 6));
      const S = [sh[0] + 2, sh[1] + 34], E = [S[0] - 4, S[1] + 48], W = [E[0] + 2, E[1] + 36];
      o.near.push(bone(S, E, 9, 7.6, 6.6), bone(E, W, 6.4, 6, 5));
      o.near.push(taper([E[0] + 6, E[1] + 4], [E[0] + 7, E[1] + 18], [W[0] + 5, W[1] - 3], 3, 2.4));
      for (let i = 0; i < 4; i++) o.near.push(stadium([W[0] - 4 + i * 3, W[1] + 3], [W[0] - 4 + i * 3.4, W[1] + 15], 1.5));
      o.near.push(taper([W[0] - 5, W[1] + 15], [W[0] - 9, W[1] + 16], [W[0] - 10, W[1] + 20], 2.6, 0.3));
      o.near.push(ilium(hx, hy, 13, 10));
      o.near.push(taper([hx - 6, hy + 11], [hx - 13, hy + 24], [hx - 20, hy + 36], 8, 6), ellipse([hx - 21, hy + 37], 5, 3.4));
      o.near.push(taper([hx + 9, hy + 11], [hx + 18, hy + 24], [hx + 28, hy + 34], 6.5, 3), circle([hx + 28, hy + 34], 1.9));
      const A = [hx, hy + 14], K = [A[0] - 2, A[1] + 50], T = [K[0] + 4, K[1] + 32];
      o.near.push(bone(A, K, 10, 8.6, 7.6), bone(K, T, 7.4, 7, 5.6));
      o.near.push(taper([K[0] + 7, K[1] + 4], [K[0] + 9, K[1] + 16], [T[0] + 6, T[1] - 3], 3, 2.4));
      o.near.push(stadium([T[0] + 1, T[1] + 3], [T[0] - 2, T[1] + 10], 3.2));
      o.near.push(toe([T[0] - 3, T[1] + 10], [-1, 0.25], [5, 3], 5, 2.8, 2.5), toe([T[0] - 1, T[1] + 12], [-0.6, 0.6], [4, 3], 4, 2.4, 2), toe([T[0] + 2, T[1] + 12], [-0.2, 1], [3], 3, 2.2, 1.5));
      const skull =
        "M2 21C2 17 5 14.6 9 13.6C12 12.6 14 9 17 5C20 1 27 0 31 3C34 5.5 37 8 39 11C43 13 45 17 44 22L41 27.4C36 26.8 30 26.2 24 26.2L8 26.6C4 26.6 2 24 2 21Z" +
        "M18.5 11.6C19.4 8 23 5.2 27 6.4C27.6 9.4 25.4 11.8 21.6 12.6C20 12.9 18.9 12.5 18.5 11.6Z" +
        circle([36, 15.5], 3.3) + ellipse([28.5, 17.5], 2.4, 1.6) + ellipse([41, 21.5], 1.3, 2.6);
      const jaw = "M4 27.6C4 31 8 33 14 33L34 32C39 31.5 42 29.6 41.6 27.8L24 27.3Z";
      const up = teeth([3.5, 25.6], [22, 26], 8, 3.8, 1, -0.5, 2.3);
      const lo = teeth([6, 28.4], [21, 28], 7, 3, -1, -0.4, 2);
      const head = '<g class="skull" transform="translate(6 12) rotate(10) scale(1.3)">' +
        '<g transform="rotate(-9 41 28) translate(0 1.2)"><path d="' + lo + '"/><path d="' + jaw + '"/></g>' +
        '<path d="' + up + '"/><path fill-rule="evenodd" d="' + skull + '"/></g>';
      return svg("0 0 400 290", o, head);
    };

    const spino = function () {
      const o = fresh();
      const sp = curve([[78, 98], [90, 106], [102, 118], [116, 124], [140, 122], [176, 118], [210, 120], [232, 124], [266, 132], [306, 140], [350, 146], [410, 150]]);
      const neck = 54, dors = 102, sac = 28, cau = sp.len - neck - dors - sac;
      column(sp, [
        { n: 10, len: neck, r: 3, fill: 0.4, spine: function () { return 4; }, lean: -0.2, cervRib: 1 },
        { n: 13, len: dors, r: 3.6, lean: 0.03, spineW: function () { return 3.6; },
          spine: function (t) { return [14, 24, 36, 48, 58, 66, 72, 74, 72, 66, 58, 50, 44][Math.round(t * 12)]; },
          rib: function (t) { return [24, 32, 38, 42, 42, 41, 39, 36, 32, 27, 22, 16, 10][Math.round(t * 12)]; } },
        { n: 5, len: sac, r: 3.6, spineW: function () { return 3.4; }, spine: function (t) { return 40 - 6 * t; } },
        { n: 40, len: cau, r: function (t) { return 3.2 - 2.4 * t; }, fill: 0.42, lean: 0.12, spineW: function (t) { return 2.8 - 1.4 * t; },
          spine: function (t) { return t < 0.85 ? 30 * (1 - t / 0.85) + 2 : 0; },
          chevron: function (t) { return t < 0.85 ? 16 * (1 - t / 0.85) + 2 : 0; } }
      ], o);
      const sh = sp.at(neck + 8).p;
      const hip = sp.at(neck + dors + sac * 0.5).p;
      const hx = hip[0], hy = hip[1];
      const Af = [hx + 2, hy + 12], Kf = [Af[0] + 8, Af[1] + 28], Tf = [Kf[0] - 4, Kf[1] + 26], Ff = [Tf[0] - 6, Tf[1] + 10];
      o.far.push(bone(Af, Kf, 6.4, 5.6, 5.4), bone(Kf, Tf, 4.8, 4.8, 4), bone(Tf, Ff, 3.6, 3.4, 3), toe(Ff, [-1, 0.15], [6, 5], 5, 2.6, 1.5));
      o.near.push(taper([sh[0] + 20, sh[1] + 2], [sh[0] + 10, sh[1] + 16], [sh[0] - 1, sh[1] + 32], 6, 5));
      o.near.push(ellipse([sh[0] - 2, sh[1] + 34], 5, 4));
      const H0 = [sh[0] - 2, sh[1] + 36], H1 = [sh[0] + 6, sh[1] + 54], F1 = [sh[0] - 6, sh[1] + 64];
      o.near.push(bone(H0, H1, 4.4, 4, 3.8), bone(H1, F1, 3.6, 3.4, 3));
      o.near.push(toe(F1, [-1, 0.5], [3.5, 3], 7, 2.2, 4), toe(add(F1, [0, 1], 2), [-0.7, 0.9], [3, 2.5], 4.5, 1.8, 2.5));
      o.near.push(ilium(hx, hy, 8, 7));
      o.near.push(taper([hx - 6, hy + 10], [hx - 12, hy + 24], [hx - 18, hy + 38], 6, 4));
      o.near.push(ellipse([hx - 22, hy + 40], 8, 3));
      o.near.push(taper([hx + 10, hy + 9], [hx + 18, hy + 22], [hx + 26, hy + 32], 5.5, 2.6));
      const A = [hx + 1, hy + 11], K = [A[0] - 6, A[1] + 28], T = [K[0] + 8, K[1] + 26], F = [T[0] - 4, T[1] + 11];
      o.near.push(bone(A, K, 7, 6, 5.8), bone(K, T, 5.2, 5.2, 4.2));
      o.near.push(taper([K[0] + 4, K[1] + 4], [K[0] + 7, K[1] + 14], [T[0] + 3, T[1] - 3], 2.2, 1.4));
      o.near.push(bone(T, F, 3.8, 3.8, 3.2), toe(F, [-1, 0.1], [6, 5, 4], 5, 2.8, 1.5), toe(add(F, [0.3, 1], 1.5), [-0.8, 0.5], [5, 4], 4.5, 2.4, 1.5));
      const skull =
        "M0 17C0 12 3 10 8 10C12 10 15 12 20 12C32 11 50 9 66 7C76 3 86 1 94 5C100 8 102 14 100 19L96 24L60 23C40 22 26 21 18 21C12 23 8 23 4 22C1 21 0 19 0 17Z" +
        ellipse([52, 10.5], 6, 1.4) + circle([83, 9], 3.2) + ellipse([70, 14.5], 6.5, 2.6) + ellipse([92, 14.5], 2.8, 4);
      const jaw = "M3 22C2 26 6 27 12 27L60 27C76 28 90 27 97 24L94 22L60 23C40 23 20 22 3 22Z" + ellipse([80, 25], 6, 1);
      const up = teeth([3, 21], [56, 22.5], 14, function (t) { return t < 0.2 ? 5 : 3.6; }, 1, 0.3, 2);
      const lo = teeth([5, 22.5], [52, 23.5], 13, function (t) { return t < 0.2 ? 4.6 : 3.2; }, -1, 0.3, 1.8);
      const head = '<g class="skull" transform="translate(-2 83) scale(.8)">' +
        '<g transform="rotate(-6 96 24)"><path d="' + lo + '"/><path fill-rule="evenodd" d="' + jaw + '"/></g>' +
        '<path d="' + up + '"/><path fill-rule="evenodd" d="' + skull + '"/></g>';
      return svg("0 0 420 200", o, head);
    };

    const ammonite = function () {
      const b = 0.18, a = 2.2, turns = 3.2, N = 140, c = [30, 30];
      const r = function (th) { return a * Math.exp(b * th); };
      const pt = function (th, rr) { return [c[0] + rr * Math.cos(th), c[1] + rr * Math.sin(th)]; };
      const outer = [], inner = [];
      const th1 = turns * 2 * Math.PI;
      for (let i = 0; i <= N; i++) {
        const th = th1 * i / N;
        outer.push(pt(th, r(th)));
        inner.push(pt(th, r(th - 2 * Math.PI) * 1.02));
      }
      const shell = "M" + outer.map(P).join("L") + "L" + inner.reverse().map(P).join("L") + "Z";
      let ribs = "";
      for (let i = 1; i < 96; i++) {
        const th = th1 - i * 0.2;
        const ro = r(th), ri = r(th - 2 * Math.PI) * 1.02;
        if (ro - ri < 1.6) break;
        ribs += "M" + P(pt(th, ri + (ro - ri) * 0.12)) + "Q" + P(pt(th + 0.05, (ro + ri) / 2)) + " " + P(pt(th - 0.06, ro - (ro - ri) * 0.08));
      }
      return '<svg viewBox="0 0 60 60">' + DEFS + '<g fill="url(#egg-bone)"><path d="' + shell + '"/><path class="ln" d="' + ribs + '"/></g></svg>';
    };

    const strata = function () {
      const tones = ["#d1a367", "#3a2311", "#b0683a", "#2c1a0c", "#d8b47a", "#4a2c14", "#96592e", "#24150a"];
      const edge = function (i) {
        const base = 5 + i * 12.5, pts = [];
        for (let x = 0; x <= 100; x += 5) {
          pts.push([x, base + x * (i % 2 ? 0.03 : 0.05) + 1.5 * Math.sin(x * 0.07 + i * 1.9) + 0.6 * Math.sin(x * 0.19 + i * 0.7)]);
        }
        return pts;
      };
      let bands = "", seams = "";
      for (let i = 0; i < 8; i++) {
        const top = edge(i), bottom = edge(i + 1).reverse();
        bands += '<path fill="' + tones[i] + '" opacity="' + (i % 2 ? 0.26 : 0.15) + '" d="M' + top.map(P).join("L") + "L" + bottom.map(P).join("L") + 'Z"/>';
        seams += '<path d="M' + top.map(P).join("L") + '"/>';
      }
      return '<svg class="egg-dig-strata" viewBox="0 0 100 100" preserveAspectRatio="none">' + bands + '<g class="seam">' + seams + "</g></svg>";
    };

    return { trex: trex(), sauro: sauro(), spino: spino(), ammonite: ammonite(), strata: strata() };
  };
  let fossilArt = null;
  const fossils = function () { return fossilArt || (fossilArt = buildFossils()); };

  const dig = (function () {
    let layer = null;
    const syncButtons = function () {
      document.querySelectorAll("[data-egg-dino]").forEach(function (b) {
        b.classList.toggle("is-on", !!layer);
        b.setAttribute("aria-pressed", String(!!layer));
      });
    };
    const on = function (animated, origin) {
      const sidebar = document.querySelector(".sidebar");
      if (!sidebar || layer) return;
      const art = fossils();
      layer = document.createElement("div");
      layer.className = "egg-dig" + (animated && !reducedMotion() ? " is-entering" + (origin ? " is-impact" : "") : "");
      layer.setAttribute("aria-hidden", "true");
      if (origin) {
        layer.style.setProperty("--ox", Math.round(origin.x) + "px");
        layer.style.setProperty("--oy", Math.round(origin.y) + "px");
      }
      layer.innerHTML =
        art.strata + '<i class="egg-dig-grain"></i>' +
        (origin ? '<i class="egg-dig-crater"></i>' : "") +
        '<span class="egg-fossil-bone is-trex">' + art.trex + "</span>" +
        '<span class="egg-fossil-bone is-sauro">' + art.sauro + "</span>" +
        '<span class="egg-fossil-bone is-spino">' + art.spino + "</span>" +
        '<span class="egg-fossil-bone is-ammo is-ammo-1">' + art.ammonite + "</span>" +
        '<span class="egg-fossil-bone is-ammo is-ammo-2">' + art.ammonite + "</span>";
      sidebar.insertBefore(layer, sidebar.firstChild);
      document.body.classList.add("egg-dig-on");
      state.dig = true;
      saveState();
      syncButtons();
    };
    const off = function () {
      if (!layer) return;
      const old = layer;
      layer = null;
      state.dig = false;
      saveState();
      syncButtons();
      const finish = function () {
        old.remove();
        if (!layer) document.body.classList.remove("egg-dig-on");
      };
      if (reducedMotion()) { finish(); return; }
      old.classList.remove("is-entering", "is-impact");
      void old.offsetWidth;
      old.classList.add("is-leaving");
      setTimeout(finish, 1500);
    };
    return { on: on, off: off, isOn: function () { return !!layer; } };
  })();

  let meteorBusy = false;
  const dropMeteor = function (onImpact) {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar || reducedMotion() || typeof window.requestAnimationFrame !== "function") { onImpact(null); return; }
    const probe = document.createElement("canvas");
    if (!probe.getContext || !probe.getContext("2d")) { onImpact(null); return; }
    meteorBusy = true;

    const launch = function () {
      const vw = window.innerWidth, vh = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const box = sidebar.getBoundingClientRect();
      const top = Math.max(box.top, 0), bottom = Math.min(box.bottom, vh);
      const tx = box.left + box.width * 0.5;
      const ty = clamp(top + Math.min((bottom - top) * 0.32, 230), 40, vh - 40);
      const sx = Math.min(vw + 30, tx + vw * 0.8), sy = -40;
      const dist = Math.hypot(tx - sx, ty - sy);
      const cx = (sx + tx) / 2 + dist * 0.06, cy = Math.max((sy + ty) / 2 - dist * 0.12, 12);

      const canvas = document.createElement("canvas");
      canvas.className = "egg-meteor";
      canvas.setAttribute("aria-hidden", "true");
      canvas.width = vw * dpr; canvas.height = vh * dpr;
      document.body.appendChild(canvas);
      const g = canvas.getContext("2d");
      g.scale(dpr, dpr);

      const FALL_MS = clamp(dist * 0.95, 750, 1150);
      const parts = [];
      const rand = function (a, b) { return a + Math.random() * (b - a); };
      const bez = function (t) {
        const u = 1 - t;
        return [u * u * sx + 2 * u * t * cx + t * t * tx, u * u * sy + 2 * u * t * cy + t * t * ty];
      };
      let t0 = 0, last = 0, impactAt = 0, prev = [sx, sy];

      const burst = function () {
        for (let i = 0; i < 38; i++) {
          const a = rand(-Math.PI * 0.95, -Math.PI * 0.05) + (Math.random() < 0.2 ? Math.PI : 0), v = rand(0.12, 0.62);
          parts.push({ k: "rock", x: tx, y: ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rand(1.6, 4.6), rot: rand(0, 6), vr: rand(-0.02, 0.02),
            life: 0, max: rand(900, 1500), c: ["#5a3d22", "#7a5530", "#3d2914", "#a07a4a"][i % 4] });
        }
        for (let i = 0; i < 34; i++) {
          const a = rand(0, Math.PI * 2), v = rand(0.35, 1.05);
          parts.push({ k: "spark", x: tx, y: ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.15, life: 0, max: rand(350, 750) });
        }
        for (let i = 0; i < 16; i++) {
          const a = rand(0, Math.PI * 2), v = rand(0.02, 0.11);
          parts.push({ k: "dust", x: tx + rand(-14, 14), y: ty + rand(-8, 8), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.03, r: rand(10, 20), life: 0, max: rand(1300, 2000) });
        }
        if (typeof sidebar.animate === "function") {
          sidebar.animate([
            { transform: "translate(0,0)" }, { transform: "translate(-6px,4px) rotate(-.6deg)" },
            { transform: "translate(5px,-3px) rotate(.5deg)" }, { transform: "translate(-3px,2px)" },
            { transform: "translate(2px,-1px)" }, { transform: "translate(0,0)" }
          ], { duration: 520, easing: "ease-out" });
        }
      };

      const frame = function (now) {
        if (!t0) { t0 = now; last = now; }
        const dt = Math.min(now - last, 40);
        last = now;
        g.clearRect(0, 0, vw, vh);
        const t = Math.min((now - t0) / FALL_MS, 1);

        if (!impactAt) {
          const e = 0.35 * t + 0.65 * t * t;
          const p = bez(e);
          const dx = p[0] - prev[0], dy = p[1] - prev[1], m = Math.hypot(dx, dy) || 1;
          const ux = dx / m, uy = dy / m;
          for (let i = 0; i < 4; i++) {
            parts.push({ k: "ember", x: p[0] - ux * rand(0, 10), y: p[1] - uy * rand(0, 10), vx: -ux * rand(0.02, 0.09) + rand(-0.03, 0.03),
              vy: -uy * rand(0.02, 0.09) + rand(-0.03, 0.03), r: rand(1.2, 3.4), life: 0, max: rand(300, 650) });
          }
          parts.push({ k: "smoke", x: p[0], y: p[1], vx: rand(-0.02, 0.02), vy: rand(-0.03, 0), r: rand(4, 8), life: 0, max: rand(700, 1000) });
          const len = 90 + 110 * e, size = 5 + 5 * e;
          const tail = g.createLinearGradient(p[0], p[1], p[0] - ux * len, p[1] - uy * len);
          tail.addColorStop(0, "rgba(255,236,190,.95)");
          tail.addColorStop(0.25, "rgba(255,150,60,.55)");
          tail.addColorStop(1, "rgba(255,80,30,0)");
          g.globalCompositeOperation = "lighter";
          g.fillStyle = tail;
          g.beginPath();
          g.moveTo(p[0] + uy * size, p[1] - ux * size);
          g.lineTo(p[0] - ux * len, p[1] - uy * len);
          g.lineTo(p[0] - uy * size, p[1] + ux * size);
          g.closePath();
          g.fill();
          const glow = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], 34 + 18 * e);
          glow.addColorStop(0, "rgba(255,250,235,1)");
          glow.addColorStop(0.18, "rgba(255,200,110,.9)");
          glow.addColorStop(0.5, "rgba(255,110,40,.3)");
          glow.addColorStop(1, "rgba(255,80,30,0)");
          g.fillStyle = glow;
          g.beginPath(); g.arc(p[0], p[1], 34 + 18 * e, 0, Math.PI * 2); g.fill();
          g.globalCompositeOperation = "source-over";
          prev = p;
          if (t >= 1) {
            impactAt = now;
            burst();
            const r = sidebar.getBoundingClientRect();
            onImpact({ x: tx - r.left, y: ty - r.top });
          }
        }

        if (impactAt) {
          const age = now - impactAt;
          if (age < 900) {
            const f = 1 - age / 900;
            const flash = g.createRadialGradient(tx, ty, 0, tx, ty, Math.max(vw, vh));
            flash.addColorStop(0, "rgba(255,244,214," + (0.95 * f) + ")");
            flash.addColorStop(0.12, "rgba(255,170,80," + (0.55 * f) + ")");
            flash.addColorStop(0.5, "rgba(255,110,40," + (0.16 * f) + ")");
            flash.addColorStop(1, "rgba(255,90,30,0)");
            g.fillStyle = flash;
            g.fillRect(0, 0, vw, vh);
          }
          [0, 140].forEach(function (delay, i) {
            const q = (age - delay) / 750;
            if (q <= 0 || q >= 1) return;
            const ease = 1 - Math.pow(1 - q, 3);
            g.strokeStyle = i ? "rgba(255,190,120," + (0.5 * (1 - q)) + ")" : "rgba(255,236,200," + (0.85 * (1 - q)) + ")";
            g.lineWidth = (i ? 3 : 7) * (1 - q) + 0.5;
            g.beginPath(); g.arc(tx, ty, 12 + ease * (i ? 170 : 250), 0, Math.PI * 2); g.stroke();
          });
        }

        for (let i = parts.length - 1; i >= 0; i--) {
          const q = parts[i];
          q.life += dt;
          if (q.life >= q.max) { parts.splice(i, 1); continue; }
          const k = q.life / q.max;
          q.x += q.vx * dt; q.y += q.vy * dt;
          if (q.k === "rock") {
            q.vy += 0.0016 * dt; q.rot += q.vr * dt;
            g.save(); g.translate(q.x, q.y); g.rotate(q.rot);
            g.globalAlpha = 1 - Math.max(0, (k - 0.7) / 0.3);
            g.fillStyle = q.c;
            g.beginPath(); g.moveTo(-q.r, -q.r * 0.6); g.lineTo(q.r * 0.8, -q.r); g.lineTo(q.r, q.r * 0.5); g.lineTo(-q.r * 0.4, q.r); g.closePath(); g.fill();
            g.restore();
          } else if (q.k === "dust" || q.k === "smoke") {
            const rr = q.r * (1 + k * (q.k === "dust" ? 2.6 : 1.6));
            g.fillStyle = q.k === "dust" ? "rgba(150,112,70," + (0.38 * (1 - k)) + ")" : "rgba(90,70,60," + (0.22 * (1 - k)) + ")";
            g.beginPath(); g.arc(q.x, q.y, rr, 0, Math.PI * 2); g.fill();
          } else {
            g.globalCompositeOperation = "lighter";
            const hue = 48 - 38 * k;
            if (q.k === "spark") {
              q.vy += 0.0009 * dt;
              g.strokeStyle = "hsla(" + hue + ",100%,62%," + (1 - k) + ")";
              g.lineWidth = 1.6;
              g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x - q.vx * 22, q.y - q.vy * 22); g.stroke();
            } else {
              g.fillStyle = "hsla(" + hue + ",100%,60%," + (1 - k) + ")";
              g.beginPath(); g.arc(q.x, q.y, q.r * (1 - k * 0.6), 0, Math.PI * 2); g.fill();
            }
            g.globalCompositeOperation = "source-over";
          }
        }

        if (impactAt && !parts.length && now - impactAt > 900) {
          canvas.remove();
          meteorBusy = false;
          return;
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };

    const box = sidebar.getBoundingClientRect();
    const seen = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0);
    if (seen < 110) {
      window.scrollTo({ top: Math.max(0, window.scrollY + box.top - 16), behavior: "smooth" });
      setTimeout(launch, 700);
    } else {
      launch();
    }
  };

  const runDinos = function () {
    if (meteorBusy) return;
    if (dig.isOn()) {
      dig.off();
      return;
    }
    dropMeteor(function (origin) {
      dig.on(true, origin);
      discover("dino");
    });
  };

  let cineEl = null;
  let cineTimers = [];
  let slateEl = null;
  let takeCount = 0;
  let cineBypass = false;

  const stopCinema = function () {
    cineTimers.forEach(clearTimeout);
    cineTimers = [];
    if (!cineEl) return;
    const el = cineEl;
    cineEl = null;
    el.classList.add("is-leaving");
    setTimeout(function () { el.remove(); }, 600);
    document.removeEventListener("keydown", onCinemaKey, true);
  };
  const onCinemaKey = function (event) {
    if (event.key === "Escape") { event.stopPropagation(); stopCinema(); }
  };

  const syncClaps = function () {
    document.querySelectorAll("[data-egg-cinema]").forEach(function (b) {
      b.classList.toggle("is-on", state.cine);
      b.setAttribute("aria-pressed", String(state.cine));
    });
  };

  const goToProjects = function () {
    const page = document.querySelector('[data-page="projects"]');
    if (page && page.classList.contains("active")) return;
    const link = document.querySelector('[data-nav-link="projects"]');
    if (link) link.click();
  };

  const playIntro = function () {
    if (cineEl || reducedMotion()) return;
    cineEl = document.createElement("div");
    cineEl.className = "egg-cine is-intro";
    cineEl.setAttribute("role", "dialog");
    cineEl.setAttribute("aria-label", L("Film countdown (click to skip)", "Contagem do filme (clique para pular)"));
    cineEl.innerHTML =
      '<div class="egg-cine-leader" data-leader>' +
        '<div class="egg-cine-reticle"><span data-count>3</span></div>' +
      "</div>";
    document.body.appendChild(cineEl);
    cineEl.addEventListener("click", stopCinema);
    document.addEventListener("keydown", onCinemaKey, true);

    const counter = cineEl.querySelector("[data-count]");
    [["2", 700], ["1", 1400]].forEach(function (step) {
      cineTimers.push(setTimeout(function () { counter.textContent = step[0]; }, step[1]));
    });
    cineTimers.push(setTimeout(stopCinema, 2100));
  };

  const cinemaOn = function (withIntro) {
    state.cine = true;
    saveState();
    document.body.classList.add("egg-cine-mode");
    syncClaps();
    if (withIntro) {
      goToProjects();
      playIntro();
    }
    discover("cinema");
  };

  const cinemaOff = function () {
    state.cine = false;
    saveState();
    stopCinema();
    document.body.classList.remove("egg-cine-mode");
    syncClaps();
  };

  const runCinema = function () {
    if (state.cine) cinemaOff();
    else cinemaOn(true);
  };

  const today = function () {
    const d = new Date();
    const two = function (n) { return (n < 10 ? "0" : "") + n; };
    const day = two(d.getDate());
    const month = two(d.getMonth() + 1);
    return L(month + "/" + day, day + "/" + month) + "/" + String(d.getFullYear()).slice(2);
  };

  const playSlate = function (title, scene, then) {
    if (slateEl) slateEl.remove();
    takeCount += 1;
    const wrap = document.createElement("div");
    wrap.className = "egg-slate-wrap";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML =
      '<i class="egg-cine-grain"></i><i class="egg-slate-flash"></i>' +
      '<div class="egg-slate">' +
        '<div class="egg-slate-stick egg-slate-arm"></div>' +
        '<div class="egg-slate-stick egg-slate-base"></div>' +
        '<div class="egg-slate-board">' +
          '<div class="egg-slate-head">' + L("Portfolio · JP", "Portfólio · JP") + "</div>" +
          '<div class="egg-slate-row egg-slate-scene"><span>' + L("Scene", "Cena") + "</span><b>" + escapeHTML(title) + "</b></div>" +
          '<div class="egg-slate-grid">' +
            "<div><span>" + L("Roll", "Rolo") + "</span><b>" + escapeHTML(scene) + "</b></div>" +
            "<div><span>Take</span><b>" + takeCount + "</b></div>" +
            "<div><span>" + L("Director", "Direção") + "</span><b>João Pedro</b></div>" +
            "<div><span>" + L("Date", "Data") + "</span><b>" + today() + "</b></div>" +
          "</div>" +
        "</div>" +
      "</div>";
    document.body.appendChild(wrap);
    slateEl = wrap;
    const timers = [];
    const skip = function () {
      timers.forEach(clearTimeout);
      finish();
    };
    let done = false;
    const finish = function () {
      if (done) return;
      done = true;
      wrap.removeEventListener("click", skip);
      wrap.classList.add("is-out");
      setTimeout(function () { wrap.remove(); if (slateEl === wrap) slateEl = null; }, 450);
      then();
    };
    wrap.addEventListener("click", skip);
    requestAnimationFrame(function () { wrap.classList.add("is-in"); });
    timers.push(setTimeout(function () { wrap.classList.add("is-clap"); }, 720));
    timers.push(setTimeout(finish, 1250));
  };

  document.addEventListener("click", function (event) {
    if (!state.cine || cineBypass) return;
    const trigger = event.target && event.target.closest ? event.target.closest("[data-project-trigger]") : null;
    if (!trigger) return;
    const item = trigger.closest("[data-filter-item]");
    const titleEl = item && item.querySelector(".project-title");
    const sceneEl = item && item.querySelector(".project-category");
    if (!titleEl || reducedMotion()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    playSlate(titleEl.textContent.trim(), sceneEl ? sceneEl.textContent.trim() : "", function () {
      cineBypass = true;
      try { trigger.click(); } finally { cineBypass = false; }
    });
  }, true);

  let term = null;
  let termOut = null;
  let termInput = null;
  let termBody = null;
  let termReturnFocus = null;
  const cmdHistory = [];
  let historyIndex = 0;

  const termPrint = function (html) {
    const line = document.createElement("div");
    line.innerHTML = html;
    termOut.appendChild(line);
  };
  const row = function (name, description) {
    return '  <b class="t-accent">' + name.padEnd(12) + "</b> " + description;
  };
  const check = function (done) {
    return done ? '<b class="t-ok">[✓]</b>' : '<b class="t-muted">[ ]</b>';
  };
  const closeThen = function (callback, delay) {
    setTimeout(function () { closeTerminal(); callback(); }, delay);
  };

  const visitor = function () { return L("visitor", "visitante"); };
  const prompt = function () { return visitor() + "@jp:~$"; };

  const printSecrets = function () {
    const rows = [
      [state.starwars, "star wars", L("a star ✦ twinkles in the top corner of the sky", "uma estrela ✦ cintila no canto superior do céu")],
      [state.dino, L("dinosaurs", "dinossauros"), L("something fossilized hides in “About”", "algo fossilizado se esconde em “Sobre mim”")],
      [state.cinema, "cinema", L("a clapperboard waits in the “Projects” title", "uma claquete espera no título de “Projetos”")],
      [state.terminal, "terminal", L("you are here 😉", "você está aqui 😉")]
    ];
    termPrint(
      "<strong>easter eggs · " + foundCount() + "/4 " + L("found", "encontrados") + "</strong>\n" +
      rows.map(function (r) {
        return "  " + check(r[0]) + " " + r[1].padEnd(13) + '<b class="t-muted">' + r[2] + "</b>";
      }).join("\n")
    );
  };

  // Canonical (English) file names; the Portuguese names still work as aliases.
  const FILE_ALIASES = { "interesses.txt": "interests.txt", "segredos.txt": "secrets.txt" };
  const FILES = {
    "readme.md": function () {
      return [
        '<b class="t-muted"># João Pedro · Developer</b>',
        L("Computer Science at UFABC (expected 2027), from Patos de Minas (MG) to Santo André (SP).",
          "Ciência da Computação na UFABC (previsão 2027), de Patos de Minas (MG) a Santo André (SP)."),
        L("Cloud, systems, Linux and low-level code. Curious about everything, from computing to paleontology.",
          "Cloud, sistemas, Linux e código de baixo nível. Curioso por tudo, da computação à paleontologia.")
      ].join("\n");
    },
    "interests.txt": function () {
      return L(
        ["linux · low level · cloud", "paleontology · natural and evolutionary history 🦖", "documentaries · good movies 🎬", "star wars ✨ · mandarin · financial markets"],
        ["linux · baixo nível · cloud", "paleontologia · história natural e evolutiva 🦖", "documentários · bons filmes 🎬", "star wars ✨ · mandarim · mercado financeiro"]
      ).join("\n");
    },
    "kernel.c": function () {
      return [
        '<b class="t-muted">/* ' + L("everyone's first program", "o primeiro programa de todo mundo") + " */</b>",
        '<b class="t-lilac">#include</b> &lt;stdio.h&gt;',
        '<b class="t-lilac">int</b> main(<b class="t-lilac">void</b>) {',
        '    puts(<b class="t-ok">"' + L("hello, world!", "olá, mundo!") + '"</b>);',
        '    <b class="t-lilac">return</b> 0;',
        "}"
      ].join("\n");
    }
  };

  const FORTUNES = {
    en: [
      "“Anything complex can be done in a simple, elegant way.”",
      "“Measure before you optimize.”",
      "“There is no cloud. It's just someone else's computer.”",
      "“It works on my machine.” 🤷",
      "“Talk is cheap. Show me the code.” · Linus Torvalds",
      "“The dinosaurs didn't have a space program. Look where that got them.” ☄️"
    ],
    pt: [
      "“Tudo que é complexo pode ser feito de forma simples e elegante.”",
      "“Antes de otimizar, meça.”",
      "“There is no cloud. It's just someone else's computer.”",
      "“It works on my machine.” 🤷",
      "“Talk is cheap. Show me the code.” · Linus Torvalds",
      "“Os dinossauros não tinham programa espacial. Veja onde isso deu.” ☄️"
    ]
  };

  // Paleontology trivia: shown by `fortune` (it used to pop up as an extra banner).
  const DINO_FACTS = {
    en: [
      "🦴 Birds are living theropod dinosaurs. That chicken in the backyard is a relative of <b>T. rex</b>. 🐔",
      "🦴 <b>T. rex</b> lived ~66 million years ago: it's closer in time to us than to <b>Stegosaurus</b>, which lived ~150 million years ago. 🤯",
      "🦴 Brazil has plenty of dinosaurs. <b>Uberabatitan</b> was found in Uberaba (MG), right near Patos de Minas. 🦕",
      "🦴 <b>Staurikosaurus</b>, from Rio Grande do Sul, is ~233 million years old and among the oldest dinosaurs ever described.",
      "🦴 In 1996, <b>Sinosauropteryx</b> showed the world that dinosaurs could have downy feathers. 🪶",
      "🦴 The Mesozoic Era runs from ~252 to ~66 million years ago: Triassic, Jurassic and Cretaceous. ⏳",
      "🦴 <b>Archaeopteryx</b> (~150 Ma) still had teeth, claws and feathers: a link between dinosaurs and birds."
    ],
    pt: [
      "🦴 Aves são dinossauros terópodes vivos. Aquela galinha no quintal é parente do <b>T. rex</b>. 🐔",
      "🦴 O <b>T. rex</b> viveu há ~66 milhões de anos: está mais perto de nós no tempo do que do <b>Stegosaurus</b>, que viveu há ~150 milhões. 🤯",
      "🦴 O Brasil tem dinossauros de sobra. O <b>Uberabatitan</b> foi encontrado em Uberaba (MG), ali pertinho de Patos de Minas. 🦕",
      "🦴 O <b>Staurikosaurus</b>, do Rio Grande do Sul, tem ~233 milhões de anos e está entre os dinossauros mais antigos já descritos.",
      "🦴 Em 1996 o <b>Sinosauropteryx</b> mostrou ao mundo que dinossauros podiam ter penugem. 🪶",
      "🦴 A Era Mesozoica vai de ~252 a ~66 milhões de anos atrás: Triássico, Jurássico e Cretáceo. ⏳",
      "🦴 O <b>Archaeopteryx</b> (~150 Ma) ainda guarda dentes, garras e penas: um elo entre dinossauros e aves."
    ]
  };

  const closingNote = function () { return ' <b class="t-muted">' + L("closing the terminal", "fechando o terminal") + "</b>"; };

  const TERM_COMMANDS = {
    help: function () {
      termPrint([
        "<strong>" + L("commands", "comandos") + "</strong>",
        row("whoami", L("who am I", "quem sou eu")),
        row("neofetch", L("system info (Linux style)", "informações do sistema (estilo Linux)")),
        row("ls · cat", L("explore the files (try cat readme.md)", "explore os arquivos (tente cat readme.md)")),
        row(L("projects", "projetos"), L("what I've built", "o que eu construí")),
        row("asm", L("a “hello, world” straight in x86-64 assembly", "um “olá, mundo” direto em assembly x86-64")),
        row("fortune", L("a random quote or dino fact", "uma frase ou curiosidade de dinossauro")),
        row("starwars", L("toggle the starry sky ✨", "liga/desliga o céu estrelado ✨")),
        row("dino", L("toggle the dig site 🦴", "liga/desliga a escavação 🦴")),
        row("cinema", L("toggle cinema mode on projects 🎬", "liga/desliga o modo cinema nos projetos 🎬")),
        row(L("secrets", "segredos"), L("easter eggs you've already found", "easter eggs que você já achou")),
        '  <b class="t-accent">clear</b> · <b class="t-accent">exit</b> <b class="t-muted">· ' +
          L("Tab completes, ↑↓ browses history", "Tab completa, ↑↓ navega no histórico") + "</b>"
      ].join("\n"));
    },

    whoami: function () {
      termPrint(
        visitor() + " 👋 (uid=1000)\n" +
        L("but this terminal belongs to <strong>João Pedro</strong>", "mas este terminal é de <strong>João Pedro</strong>") + "\n" +
        '<b class="t-muted">' + L("Computer Science", "Ciência da Computação") + " @ UFABC · Santo André, SP</b>"
      );
    },

    neofetch: function () {
      const logo = [
        "    .--.   ",
        "   |o_o |  ",
        "   |:_/ |  ",
        "  //   \\ \\ ",
        " (|     | )",
        "/'\\_   _/`\\",
        "\\___)=(___/"
      ];
      const field = function (label, value) { return '<b class="t-accent">' + label.padEnd(8) + "</b>" + value; };
      const info = [
        '<b class="t-accent">' + visitor() + '</b>@<b class="t-accent">joaopedrocs</b>',
        "───────────────────",
        field("OS", "Linux (WSL2) 🐧"),
        field("Host", "UFABC, Santo André"),
        field("Shell", "zsh"),
        field("Lang", "C/C++ · Python · JS/TS"),
        field(L("Focus", "Foco"), L("parallel", "paralelo") + " (MPI, OpenMP, CUDA) · cloud"),
        field(L("World", "Mundo"), "dinos 🦖 · cinema 🎬 · star wars ✨")
      ];
      const lines = [];
      for (let i = 0; i < Math.max(logo.length, info.length); i++) {
        lines.push('<b class="t-gold">' + escapeHTML(logo[i] || "           ") + "</b>  " + (info[i] || ""));
      }
      termPrint(lines.join("\n"));
    },

    ls: function () {
      termPrint(L(
        '<b class="t-blue">dinos/</b>  <b class="t-blue">movies/</b>  <b class="t-blue">galaxy/</b>  readme.md  interests.txt  secrets.txt  kernel.c',
        '<b class="t-blue">dinos/</b>  <b class="t-blue">filmes/</b>  <b class="t-blue">galaxia/</b>  readme.md  interesses.txt  segredos.txt  kernel.c'
      ));
    },

    cat: function (args) {
      const typedName = args[0];
      if (!typedName) { termPrint(L("usage: cat &lt;file&gt;", "uso: cat &lt;arquivo&gt;")); return; }
      const file = own(FILE_ALIASES, typedName) ? FILE_ALIASES[typedName] : typedName;
      if (file === "secrets.txt") { printSecrets(); return; }
      if (own(FILES, file)) { termPrint(FILES[file]()); return; }
      if (/^(dinos|filmes|movies|galaxia|galaxy)\/?$/.test(file)) {
        termPrint("cat: " + escapeHTML(typedName) + ": " + L("Is a directory", "É um diretório"));
        return;
      }
      termPrint("cat: " + escapeHTML(typedName) + ": " + L("No such file or directory", "Arquivo ou diretório inexistente"));
    },

    projects: function () {
      termPrint(
        "<strong>" + L("projects", "projetos") + "</strong>\n" +
        '  <b class="t-lilac">▸</b> ' + L(
          'check the site\'s <b class="t-accent">Projects</b> tab, with tag filters and interactive demos.',
          'veja a aba <b class="t-accent">Projetos</b> do site, com filtros por tag e demos interativas.') + "\n" +
        '  <b class="t-muted">' + L("code on GitHub", "código no GitHub") + ": github.com/JoaoPedroCS</b>"
      );
    },

    asm: function () {
      // The byte count in rdx must match the message (+1 for the newline).
      const msg = L("hello, world", "ola, mundo");
      termPrint([
        '<b class="t-muted">; hello.asm · x86-64, NASM, Linux · ' + L("no libc, just syscalls", "sem libc, só syscalls") + "</b>",
        '<b class="t-lilac">section</b> .data',
        '  msg <b class="t-lilac">db</b> <b class="t-ok">"' + msg + '", 10</b>',
        '<b class="t-lilac">section</b> .text',
        '<b class="t-lilac">global</b> _start',
        "_start:",
        '  <b class="t-accent">mov</b> rax, 1      <b class="t-muted">; sys_write</b>',
        '  <b class="t-accent">mov</b> rdi, 1      <b class="t-muted">; stdout</b>',
        '  <b class="t-accent">lea</b> rsi, [msg]',
        '  <b class="t-accent">mov</b> rdx, ' + String(msg.length + 1).padEnd(7) + '<b class="t-muted">; bytes</b>',
        '  <b class="t-accent">syscall</b>',
        '  <b class="t-accent">mov</b> rax, 60     <b class="t-muted">; sys_exit</b>',
        '  <b class="t-accent">xor</b> rdi, rdi',
        '  <b class="t-accent">syscall</b>'
      ].join("\n"));
    },

    fortune: function () {
      const pool = L(FORTUNES.en.concat(DINO_FACTS.en), FORTUNES.pt.concat(DINO_FACTS.pt));
      termPrint(pick(pool));
    },

    grogu: function () {
      termPrint(L("🟢 something very small stirs behind a card…", "🟢 algo bem pequeno se mexe atrás de um card…") + closingNote());
      closeThen(function () {
        if (state.sky) { sw.off(); setTimeout(runGrogu, 900); } else runGrogu();
      }, 700);
    },

    starwars: function () {
      const turnOn = !sw.isOn();
      termPrint(turnOn
        ? L("✨ engaging hyperdrive…", "✨ engatando o hiperespaço…") + closingNote()
        : L("🌌 switching off the stars…", "🌌 apagando as estrelas…"));
      closeThen(function () {
        if (turnOn) {
          sw.on(true, function () { discover("starwars"); });
        } else {
          sw.off();
        }
        const btn = document.querySelector("[data-egg-starwars]");
        if (btn) { btn.classList.toggle("is-on", state.sky); btn.setAttribute("aria-pressed", String(state.sky)); }
      }, 700);
    },

    dino: function () {
      termPrint((dig.isOn()
        ? L("🪨 covering the dig site…", "🪨 cobrindo a escavação…")
        : L("🦴 digging up the sidebar…", "🦴 escavando a sidebar…")) + closingNote());
      closeThen(runDinos, 700);
    },

    cinema: function () {
      termPrint((state.cine
        ? L("💡 turning the house lights on…", "💡 acendendo as luzes da sala…")
        : L("🎬 quiet on set…", "🎬 silêncio no set…")) + closingNote());
      closeThen(runCinema, 700);
    },

    secrets: printSecrets,

    pwd: function () { termPrint("/home/" + visitor() + "/joaopedrocs"); },

    date: function () { termPrint(escapeHTML(new Date().toString())); },

    uname: function (args) {
      termPrint(args[0] === "-a"
        ? "Linux joaopedrocs 6.6.87-microsoft-standard-WSL2 #1 SMP x86_64 GNU/Linux"
        : "Linux");
    },

    echo: function (args) { termPrint(escapeHTML(args.join(" "))); },

    sudo: function () {
      termPrint(L(
        "[sudo] password for visitor: ********\nvisitor is not in the sudoers file. This incident will be reported. 😄",
        "[sudo] senha para visitante: ********\nvisitante não está no arquivo sudoers. Este incidente será reportado. 😄"
      ));
    },

    vim: function () {
      termPrint('<b class="t-muted">~\n~\n~\n~</b>\n' + L(
        'stuck in vim. Hint: <b class="t-accent">:q!</b> 😅 (or type <b class="t-accent">exit</b>)',
        'preso no vim. Dica: <b class="t-accent">:q!</b> 😅 (ou digite <b class="t-accent">exit</b>)'));
    },

    rm: function (args) {
      termPrint(args.join(" ").indexOf("/") >= 0 && args.indexOf("-rf") >= 0
        ? L("rm: not doing that. I like this site. 🛑", "rm: não vou fazer isso. Eu gosto deste site. 🛑")
        : L("rm: nothing removed, this is read-only.", "rm: nada removido, aqui é só leitura."));
    },

    hi: function () {
      termPrint(L(
        'hi! 👋 type <b class="t-accent">help</b> to see what you can do here.',
        'oi! 👋 digite <b class="t-accent">help</b> para ver o que dá pra fazer por aqui.'));
    },

    clear: function () { termOut.innerHTML = ""; },
    exit: function () { closeTerminal(); }
  };

  const TERM_ALIASES = {
    ajuda: "help", "?": "help",
    sobre: "whoami", about: "whoami", id: "whoami",
    fetch: "neofetch", screenfetch: "neofetch",
    dir: "ls", ll: "ls",
    projetos: "projects", project: "projects", projeto: "projects",
    assembly: "asm", nasm: "asm",
    fact: "fortune", facts: "fortune", curiosidade: "fortune",
    yoda: "grogu", "baby-yoda": "grogu", babyyoda: "grogu", mando: "grogu",
    "star-wars": "starwars", force: "starwars", forca: "starwars", sky: "starwars", ceu: "starwars",
    dinos: "dino", dinosaur: "dino", dinosaurs: "dino", dinossauro: "dino", dinossauros: "dino", trex: "dino", "t-rex": "dino", rawr: "dino",
    filme: "cinema", filmes: "cinema", movie: "cinema", movies: "cinema",
    segredos: "secrets", segredo: "secrets", secret: "secrets", eggs: "secrets", easter: "secrets",
    oi: "hi", ola: "hi", hello: "hi", hey: "hi",
    limpar: "clear", cls: "clear",
    sair: "exit", quit: "exit", q: "exit", ":q": "exit", ":q!": "exit",
    nvim: "vim", nano: "vim", emacs: "vim"
  };

  const printBanner = function () {
    termPrint(
      '<b class="t-accent">' +
      "    _  ____\n" +
      "   | ||  _ \\\n" +
      "_  | || |_) |\n" +
      "| |_| ||  __/\n" +
      " \\___/ |_|</b>\n\n" +
      L("<strong>terminal</strong> · welcome to my little corner of Linux and low-level code 🐧\n",
        "<strong>terminal</strong> · bem-vindo ao meu cantinho de Linux e baixo nível 🐧\n") +
      L('type <b class="t-accent">help</b> to see the commands.\n', 'digite <b class="t-accent">help</b> para ver os comandos.\n')
    );
  };

  const runCommand = function (raw) {
    const line = raw.trim();
    termPrint('<b class="t-accent">' + prompt() + "</b> " + escapeHTML(line));
    if (line) {
      cmdHistory.push(line);
      const parts = line.split(/\s+/);
      const key = normalize(parts[0]);
      const name = own(TERM_ALIASES, key) ? TERM_ALIASES[key] : key;
      if (own(TERM_COMMANDS, name)) {
        TERM_COMMANDS[name](parts.slice(1).map(function (p) { return p; }));
      } else {
        termPrint('<b class="t-muted">bash: ' + L("command not found", "comando não encontrado") + ":</b> " + escapeHTML(parts[0]) +
          " · " + L("type", "digite") + ' <b class="t-accent">help</b>');
      }
    }
    historyIndex = cmdHistory.length;
    if (termBody) termBody.scrollTop = termBody.scrollHeight;
  };

  const onTerminalKey = function (event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeTerminal();
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      if (!cmdHistory.length) return;
      event.preventDefault();
      historyIndex = clamp(historyIndex + (event.key === "ArrowUp" ? -1 : 1), 0, cmdHistory.length);
      termInput.value = cmdHistory[historyIndex] || "";
      return;
    }
    if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      termOut.innerHTML = "";
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const typed = normalize(termInput.value);
      if (!typed || /\s/.test(typed)) return;
      const matches = Object.keys(TERM_COMMANDS).filter(function (n) { return n.indexOf(typed) === 0; });
      if (matches.length === 1) {
        termInput.value = matches[0] + " ";
      } else if (matches.length > 1) {
        termPrint('<b class="t-muted">' + matches.join("  ") + "</b>");
        termBody.scrollTop = termBody.scrollHeight;
      }
    }
  };

  const buildTerminal = function () {
    term = document.createElement("div");
    term.className = "egg-term";
    term.hidden = true;
    term.innerHTML =
      '<div class="egg-term-window" role="dialog" aria-modal="true" aria-label="Terminal">' +
        '<div class="egg-term-bar">' +
          "<i></i><i></i><i></i>" +
          '<p class="egg-term-title" data-term-title></p>' +
          '<button class="egg-term-close" type="button" data-term-close>×</button>' +
        "</div>" +
        '<div class="egg-term-body" data-term-body>' +
          '<div class="egg-term-out" data-term-out aria-live="polite"></div>' +
          '<form class="egg-term-line" data-term-form>' +
            '<label for="egg-term-input" data-term-prompt></label>' +
            '<input id="egg-term-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send">' +
          "</form>" +
        "</div>" +
      "</div>";
    document.body.appendChild(term);

    termOut = term.querySelector("[data-term-out]");
    termInput = term.querySelector("#egg-term-input");
    termBody = term.querySelector("[data-term-body]");

    term.querySelector("[data-term-close]").addEventListener("click", closeTerminal);
    term.addEventListener("click", function (event) { if (event.target === term) closeTerminal(); });
    termBody.addEventListener("click", function () {
      if (!String(window.getSelection ? window.getSelection() : "")) termInput.focus();
    });
    term.querySelector("[data-term-form]").addEventListener("submit", function (event) {
      event.preventDefault();
      const value = termInput.value;
      termInput.value = "";
      runCommand(value);
    });
    termInput.addEventListener("keydown", onTerminalKey);
    labelTerminal();
    printBanner();
  };

  // Chrome of the terminal window follows the site language (the scrollback stays as printed).
  const labelTerminal = function () {
    if (!term) return;
    term.querySelector("[data-term-title]").textContent = visitor() + "@jp: ~ · bash";
    term.querySelector("[data-term-prompt]").textContent = prompt();
    term.querySelector("[data-term-close]").setAttribute("aria-label", L("Close terminal", "Fechar terminal"));
  };
  if (window.I18N) window.I18N.onChange(labelTerminal);

  const openTerminal = function () {
    if (!term) buildTerminal();
    if (!term.hidden) { termInput.focus(); return; }
    termReturnFocus = document.activeElement;
    term.hidden = false;
    document.body.classList.add("egg-term-open");
    termInput.focus();
    termBody.scrollTop = termBody.scrollHeight;
    discover("terminal");
  };

  function closeTerminal() {
    if (!term || term.hidden) return;
    term.hidden = true;
    document.body.classList.remove("egg-term-open");
    if (termReturnFocus && typeof termReturnFocus.focus === "function") {
      termReturnFocus.focus({ preventScroll: true });
    }
  }

  const fab = document.querySelector("[data-egg-term-open]");
  if (fab) fab.addEventListener("click", openTerminal);

  const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  const WORDS = ["terminal", "sudo", "linux"];
  let konamiStep = 0;
  let typed = "";
  document.addEventListener("keydown", function (event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest && event.target.closest("input, textarea, select, [contenteditable]")) return;
    const key = (event.key || "").toLowerCase();

    if (key === KONAMI[konamiStep]) {
      konamiStep++;
      if (konamiStep === KONAMI.length) {
        konamiStep = 0;
        event.preventDefault();
        openTerminal();
        return;
      }
    } else {
      konamiStep = key === KONAMI[0] ? 1 : 0;
    }

    if (key.length === 1) {
      typed = (typed + key).slice(-8);
      if (WORDS.some(function (word) { return typed.endsWith(word); })) {
        typed = "";
        event.preventDefault();
        openTerminal();
      }
    }
  });

  setupStarButton();
  watchGrogu();
  document.querySelectorAll("[data-egg-dino]").forEach(function (btn) {
    btn.addEventListener("click", runDinos);
  });
  document.querySelectorAll("[data-egg-cinema]").forEach(function (btn) {
    btn.addEventListener("click", runCinema);
  });

  const syncFound = function () {
    document.querySelectorAll("[data-egg-dino]").forEach(function (b) { b.classList.toggle("is-found", state.dino); });
    document.querySelectorAll("[data-egg-cinema]").forEach(function (b) { b.classList.toggle("is-found", state.cinema); });
  };
  syncFound();
  document.addEventListener("click", function () { setTimeout(syncFound, 50); });

  saveState();

  const pageTitle = document.title;
  const AWAY_TITLES = {
    en: [
      "🦖 Come back before the extinction…",
      "✨ Come back, the Force is still here",
      "🎬 We paused the movie for you",
      "$ fg · back to the portfolio",
      "学无止境 · come back soon",
      "📈 Come back, the market is open"
    ],
    pt: [
      "🦖 Volte antes da extinção…",
      "✨ Volte, a Força ainda está aqui",
      "🎬 Pausamos o filme para você",
      "$ fg · volte para o portfólio",
      "学无止境 · volte logo",
      "📈 Volte, o mercado já abriu"
    ]
  };
  document.addEventListener("visibilitychange", function () {
    document.title = document.hidden ? pick(L(AWAY_TITLES.en, AWAY_TITLES.pt)) : pageTitle;
  });

  const now = new Date();
  if (now.getMonth() === 4 && now.getDate() === 4) {
    let seenToday = false;
    try { seenToday = sessionStorage.getItem("jp-may4") === "1"; sessionStorage.setItem("jp-may4", "1"); } catch (e) { seenToday = false; }
    if (!seenToday) {
      setTimeout(function () {
        toast(L("✨ <b>May the 4th be with you.</b> The star in the corner knows what to do.",
                "✨ <b>Hoje é 4 de maio.</b> Que a Força esteja com você: a estrela no canto sabe o que fazer."), { group: "may4", duration: 8000 });
      }, 2500);
    }
  }

  const HINT_KEY = "jp-egg-hint-seen";
  let hintSeen = false;
  try { hintSeen = localStorage.getItem(HINT_KEY) === "1"; } catch (e) { hintSeen = false; }
  if (!hintSeen) {
    setTimeout(function () {
      toast(L("👀 <b>Psst!</b> This portfolio hides <b>4 easter eggs</b>. Try the ✦ star or the <code>&gt;_</code> button.",
              "👀 <b>Psiu!</b> Este portfólio esconde <b>4 easter eggs</b>. Comece pela estrela ✦ ou pelo botão <code>&gt;_</code>."), { duration: 9000 });
      try { localStorage.setItem(HINT_KEY, "1"); } catch (e) { }
    }, 6000);
  }

  console.log("%c" + L("🦖🎬✨ Hi there, curious person!", "🦖🎬✨ Oi, pessoa curiosa!"), "font: 600 15px Poppins, sans-serif; color: #ff4654;");
  console.log("%c" + L("This portfolio has 4 easter eggs. Type “terminal” on the page (outside a text field) to start.",
                       "Este portfólio tem 4 easter eggs. Digite “terminal” na página (fora de um campo) para começar."), "font: 13px Poppins, sans-serif; color: #7aa2f7;");

})();
