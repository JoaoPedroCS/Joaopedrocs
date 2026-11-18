'use strict';

// Display preferences: theme (dark | light) and language (en | pt).
// - English is written in index.html and is the default; Portuguese comes from window.LANG_PT.
// - Static text:  data-i18n="key"              → swaps innerHTML
//   Attributes:   data-i18n-attr="attr:key;…"   → swaps attribute values
// - Strings built in JS call I18N.L(en, pt) at render time and re-render via I18N.onChange.
(function () {
  const root = document.documentElement;
  const PT = window.LANG_PT || {};
  const LANG_KEY = "jp-lang";
  const THEME_KEY = "jp-theme";
  const THEME_COLORS = { dark: "#04070a", light: "#eef1f5" };

  const read = function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } };
  const write = function (key, value) { try { localStorage.setItem(key, value); } catch (e) { } };
  const hasPT = function (key) { return Object.prototype.hasOwnProperty.call(PT, key); };

  let lang = read(LANG_KEY) === "pt" ? "pt" : "en";
  const listeners = [];
  const L = function (en, pt) { return lang === "pt" ? pt : en; };

  // The first time an element is translated, its English original is remembered,
  // so switching back to EN never needs a second copy of the text.
  const originalHTML = new Map();
  const originalAttrs = new Map();

  const translateText = function (el) {
    const key = el.getAttribute("data-i18n");
    if (!originalHTML.has(el)) originalHTML.set(el, el.innerHTML);
    const html = lang === "pt" && hasPT(key) ? PT[key] : originalHTML.get(el);
    if (el.innerHTML !== html) el.innerHTML = html;
  };

  const translateAttrs = function (el) {
    if (!originalAttrs.has(el)) originalAttrs.set(el, {});
    const saved = originalAttrs.get(el);
    el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
      const parts = pair.split(":");
      const attr = parts[0].trim();
      const key = (parts[1] || "").trim();
      if (!attr || !key) return;
      if (!(attr in saved)) saved[attr] = el.getAttribute(attr);
      const value = lang === "pt" && hasPT(key) ? PT[key] : saved[attr];
      if (value !== null) el.setAttribute(attr, value);
    });
  };

  const themeBtn = document.querySelector("[data-theme-toggle]");
  const langBtns = document.querySelectorAll("[data-lang-set]");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const currentTheme = function () { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; };

  const syncControls = function () {
    const theme = currentTheme();
    if (themeBtn) {
      const label = theme === "dark"
        ? L("Switch to light theme", "Mudar para o tema claro")
        : L("Switch to dark theme", "Mudar para o tema escuro");
      themeBtn.setAttribute("aria-label", label);
      themeBtn.setAttribute("title", label);
    }
    langBtns.forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-lang-set") === lang));
    });
    if (themeMeta) themeMeta.setAttribute("content", THEME_COLORS[theme]);
  };

  const applyLanguage = function () {
    root.lang = lang === "pt" ? "pt-BR" : "en";
    document.querySelectorAll("[data-i18n]").forEach(translateText);
    document.querySelectorAll("[data-i18n-attr]").forEach(translateAttrs);
    syncControls();
    root.classList.remove("i18n-pending");
  };

  const setLanguage = function (next) {
    next = next === "pt" ? "pt" : "en";
    if (next === lang) return;
    lang = next;
    write(LANG_KEY, lang);
    applyLanguage();
    listeners.forEach(function (fn) { try { fn(lang); } catch (e) { console.error(e); } });
  };

  const setTheme = function (theme) {
    root.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    write(THEME_KEY, currentTheme());
    syncControls();
  };

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      setTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }
  langBtns.forEach(function (btn) {
    btn.addEventListener("click", function () { setLanguage(btn.getAttribute("data-lang-set")); });
  });

  window.I18N = {
    get lang() { return lang; },
    L: L,
    set: setLanguage,
    onChange: function (fn) { listeners.push(fn); }
  };

  if (!root.hasAttribute("data-theme")) root.setAttribute("data-theme", "dark");
  applyLanguage();
})();
