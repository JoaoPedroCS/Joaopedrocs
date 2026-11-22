'use strict';

const elementToggleFunc = function (elem) { elem.classList.toggle("active"); }

// Picks the string for the current language (see preferences.js). Falls back to English.
const L = function (en, pt) { return window.I18N ? window.I18N.L(en, pt) : en; };
const onLanguageChange = function (fn) { if (window.I18N) window.I18N.onChange(fn); };

const BIRTH = { year: 2003, month: 11, day: 11 };
const currentAge = function () {
  const today = new Date();
  const hadBirthday = today.getMonth() + 1 > BIRTH.month ||
    (today.getMonth() + 1 === BIRTH.month && today.getDate() >= BIRTH.day);
  return today.getFullYear() - BIRTH.year - (hadBirthday ? 0 : 1);
};
document.querySelectorAll("[data-age]").forEach(function (el) { el.textContent = currentAge(); });

const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");
sidebarBtn.addEventListener("click", function () { elementToggleFunc(sidebar); });

// To add a tag: create an entry here and use its key in data-tags="..." on the project's <li>.
// Projects with data-demo get the "demo" tag automatically. label/description are [en, pt].
const PROJECT_TAGS = {
  ai:        { label: ["AI", "AI"],               icon: "sparkles-outline",    color: "#b794f6", description: ["AI used to speed up development and test the project", "IA usada para agilizar o desenvolvimento e testar o projeto"] },
  github:    { label: ["GitHub", "GitHub"],       icon: "logo-github",         color: "#e6edf3", description: ["Has a GitHub repository", "Tem repositório no GitHub"] },
  demo:      { label: ["Demo", "Demo"],           icon: "play-circle-outline", color: "#4ade80", description: ["Has an interactive demo right here in the portfolio", "Tem demo interativa aqui no portfólio"] },
  paralelo:  { label: ["Parallel", "Paralelo"],   icon: "git-network-outline", color: "#7aa2f7", description: ["Uses parallel programming", "Usa programação paralela"] },
  hackathon: { label: ["Hackathon", "Hackathon"], icon: "trophy-outline",      color: "#f472b6", description: ["Project built at a hackathon", "Projeto feito em hackathon"] },
  dados:     { label: ["Data", "Dados"],          icon: "bar-chart-outline",   color: "#fbbf24", description: ["Analysis or simulation on real data", "Análise ou simulação sobre dados reais"] }
};
const tagLabel = function (key) { return L.apply(null, PROJECT_TAGS[key].label); };
const tagDescription = function (key) { return L.apply(null, PROJECT_TAGS[key].description); };

const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-selecct-value]");
const filterBtn = document.querySelectorAll("[data-filter-btn]");
const filterItems = document.querySelectorAll("[data-filter-item]");

const tagFilter = document.querySelector("[data-tag-filter]");
const tagFilterList = document.querySelector("[data-tag-filter-list]");
const tagClearBtn = document.querySelector("[data-tag-clear]");
const projectsEmpty = document.querySelector("[data-projects-empty]");

select.addEventListener("click", function () { elementToggleFunc(this); });

let activeCategory = "all";
const activeTags = new Set();
const projectTagMap = new Map();

const getProjectTags = function (item) {
  const found = new Set((item.dataset.tags || "").split(/\s+/).filter(Boolean));
  if (item.dataset.demo) found.add("demo");
  return Object.keys(PROJECT_TAGS).filter(function (key) { return found.has(key); });
};

const tagChipHTML = function (key) {
  const tag = PROJECT_TAGS[key];
  return `<span class="tag-chip" data-tag="${key}" style="--tag-color:${tag.color}" title="${tagDescription(key)}"><ion-icon name="${tag.icon}"></ion-icon><span class="tag-label">${tagLabel(key)}</span></span>`;
};

// Re-labels every tag chip (cards + filter bar) in the current language.
const relabelTags = function () {
  document.querySelectorAll("[data-tag]").forEach(function (chip) {
    const key = chip.dataset.tag;
    chip.title = tagDescription(key);
    const label = chip.querySelector(".tag-label");
    if (label) label.textContent = tagLabel(key);
  });
};
onLanguageChange(relabelTags);

const applyFilters = function () {
  let visibleCount = 0;
  for (let i = 0; i < filterItems.length; i++) {
    const item = filterItems[i];
    const projectTags = projectTagMap.get(item);
    const categoryOk = activeCategory === "all" || activeCategory === item.dataset.category;
    const tagsOk = Array.from(activeTags).every(function (key) { return projectTags.has(key); });
    const show = categoryOk && tagsOk;
    item.classList.toggle("active", show);
    if (show) visibleCount++;
  }
  projectsEmpty.hidden = visibleCount !== 0;
  tagClearBtn.hidden = activeTags.size === 0;
};

const filterFunc = function (selectedValue) {
  activeCategory = selectedValue;
  applyFilters();
};

const tagCounts = {};
for (let i = 0; i < filterItems.length; i++) {
  const tags = getProjectTags(filterItems[i]);
  projectTagMap.set(filterItems[i], new Set(tags));
  tags.forEach(function (key) { tagCounts[key] = (tagCounts[key] || 0) + 1; });

  if (tags.length) {
    filterItems[i].querySelector("[data-project-trigger]").insertAdjacentHTML(
      "beforeend",
      `<div class="project-tags">${tags.map(tagChipHTML).join("")}</div>`
    );
  }
}

Object.keys(PROJECT_TAGS).forEach(function (key) {
  if (!tagCounts[key]) return;
  const tag = PROJECT_TAGS[key];
  const li = document.createElement("li");
  li.innerHTML = `<button type="button" class="tag-chip tag-chip-btn" style="--tag-color:${tag.color}" data-tag="${key}" data-tag-key="${key}" aria-pressed="false" title="${tagDescription(key)}"><ion-icon name="${tag.icon}"></ion-icon><span class="tag-label">${tagLabel(key)}</span><span class="tag-count">${tagCounts[key]}</span></button>`;
  tagFilterList.appendChild(li);
});
if (!tagFilterList.children.length) tagFilter.hidden = true;

tagFilterList.addEventListener("click", function (event) {
  const btn = event.target.closest("[data-tag-key]");
  if (!btn) return;
  const key = btn.dataset.tagKey;
  const isOn = !activeTags.has(key);
  if (isOn) { activeTags.add(key); } else { activeTags.delete(key); }
  btn.setAttribute("aria-pressed", String(isOn));
  applyFilters();
});

tagClearBtn.addEventListener("click", function () {
  activeTags.clear();
  const pressed = tagFilterList.querySelectorAll("[aria-pressed='true']");
  for (let i = 0; i < pressed.length; i++) pressed[i].setAttribute("aria-pressed", "false");
  applyFilters();
});

// Filters match on data-filter-btn / data-select-item values (not on the visible,
// translatable text). The mobile select shows the label of the active filter.
const syncSelectValue = function () {
  const activeBtn = document.querySelector(`[data-filter-btn="${activeCategory}"]`);
  if (activeBtn) selectValue.innerText = activeBtn.innerText;
};
onLanguageChange(syncSelectValue);

for (let i = 0; i < selectItems.length; i++) {
  selectItems[i].addEventListener("click", function () {
    elementToggleFunc(select);
    filterFunc(this.dataset.selectItem);
    syncSelectValue();
  });
}

let lastClickedBtn = filterBtn[0];
for (let i = 0; i < filterBtn.length; i++) {
  filterBtn[i].addEventListener("click", function () {
    filterFunc(this.dataset.filterBtn);
    syncSelectValue();

    lastClickedBtn.classList.remove("active");
    this.classList.add("active");
    lastClickedBtn = this;
  });
}

const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");

for (let i = 0; i < navigationLinks.length; i++) {
  navigationLinks[i].addEventListener("click", function () {

    for (let j = 0; j < pages.length; j++) {
      if (this.dataset.navLink === pages[j].dataset.page) {
        pages[j].classList.add("active");
        navigationLinks[j].classList.add("active"); 
        window.scrollTo(0, 0);
      } else {
        pages[j].classList.remove("active");
        navigationLinks[j].classList.remove("active"); 
      }
    }

  });
}

const form = document.querySelector("[data-form]");
const formInputs = document.querySelectorAll("[data-form-input]");
const formBtn = document.querySelector("[data-form-btn]");

for (let i = 0; i < formInputs.length; i++) {
  formInputs[i].addEventListener("input", function () {
    if (form.checkValidity()) {
      formBtn.removeAttribute("disabled");
    } else {
      formBtn.setAttribute("disabled", "");
    }
  });
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const data = new FormData(event.target);

  try {
    const response = await fetch(event.target.action, {
      method: form.method,
      body: data,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      form.reset();
      
      formBtn.setAttribute("disabled", "");
      
      const btnText = formBtn.querySelector("span");
      btnText.innerText = L("Sent successfully! ✅", "Enviado com sucesso! ✅");

      setTimeout(() => {
        btnText.innerText = L("Send message", "Enviar mensagem");
      }, 4000);

    } else {
      alert(L("Oops! Something went wrong while sending your message. Please try again.",
              "Ops! Ocorreu um problema ao enviar sua mensagem. Tente novamente."));
    }
  } catch (error) {
    alert(L("Oops! There was a problem with your connection.", "Ops! Ocorreu um problema na sua conexão."));
  }
});





const projectTriggers = document.querySelectorAll("[data-project-trigger]");
const projectModal = document.querySelector("[data-project-modal]");
const modalOverlay = document.querySelector("[data-modal-overlay]");
const modalCloseButton = document.querySelector("[data-modal-close]");
const modalTitle = projectModal.querySelector("#modal-title");
const modalImage = projectModal.querySelector("[data-modal-img]");
const modalCover = projectModal.querySelector("[data-modal-cover]");

// Foto do projeto (se houver <img> no card) ou a capa ilustrada
const renderModalMedia = function (trigger) {
  const image = trigger.querySelector(".project-img img");
  const cover = trigger.querySelector(".project-cover");

  if (image) {
    modalImage.src = image.src;
    modalImage.alt = image.alt;
    modalImage.hidden = false;
    modalCover.hidden = true;
  } else {
    modalImage.hidden = true;
    modalImage.removeAttribute("src");
    modalCover.className = "modal-cover " + (cover ? cover.className.replace("project-cover", "").trim() : "");
    modalCover.innerHTML = cover ? cover.innerHTML : "";
    modalCover.hidden = !cover;
  }
};
const modalDescription = projectModal.querySelector("[data-modal-description]");
const modalDetails = projectModal.querySelector("[data-modal-details]");
const modalTags = projectModal.querySelector("[data-modal-tags]");
const modalRepo = projectModal.querySelector("[data-modal-repo]");
const modalSite = projectModal.querySelector("[data-modal-site]");

const renderModalTags = function (item) {
  const tags = Array.from(projectTagMap.get(item) || []);
  modalTags.innerHTML = tags.map(function (key) {
    return `<li class="modal-tag-row">${tagChipHTML(key)}<span class="modal-tag-desc">${tagDescription(key)}</span></li>`;
  }).join("");
  modalTags.hidden = tags.length === 0;

  if (item.dataset.repo) {
    modalRepo.href = item.dataset.repo;
    modalRepo.hidden = false;
  } else {
    modalRepo.hidden = true;
  }

  if (item.dataset.site) {
    modalSite.href = item.dataset.site;
    modalSite.hidden = false;
  } else {
    modalSite.hidden = true;
  }
};

const modalDemo = projectModal.querySelector("[data-modal-demo]");

const POKE_TYPE_COLORS = {
  normal: "#a8a878", fire: "#f08030", water: "#6890f0", electric: "#f8d030",
  grass: "#78c850", ice: "#98d8d8", fighting: "#c03028", poison: "#a040a0",
  ground: "#e0c068", flying: "#a890f0", psychic: "#f85888", bug: "#a8b820",
  rock: "#b8a038", ghost: "#705898", dragon: "#7038f8", dark: "#705848",
  steel: "#b8b8d0", fairy: "#ee99ac"
};

const POKE_STAT_LABELS = {
  "hp": "HP", "attack": "Attack", "defense": "Defense",
  "special-attack": "Sp. Atk", "special-defense": "Sp. Def", "speed": "Speed"
};

// Built when the modal opens, so it always uses the current language.
const pokeDemoMarkup = function () {
  return `
  <div class="poke-demo">
    <form class="poke-demo-form" data-poke-form>
      <input class="poke-demo-input" type="text" placeholder="${L("Name or ID (e.g. pikachu, 6)", "Nome ou ID (ex: pikachu, 6)")}"
        aria-label="${L("Pokémon name or ID", "Nome ou ID do Pokémon")}" autocomplete="off" data-poke-input>
      <button class="poke-demo-btn" type="submit">${L("Search", "Buscar")}</button>
    </form>
    <div class="poke-demo-status" data-poke-status>${L("Type a Pokémon's name or number.", "Digite o nome ou o número de um Pokémon.")}</div>
    <div class="poke-demo-result" data-poke-result></div>
  </div>`;
};

const fetchPokemon = async function (query) {
  const response = await fetch("https://pokeapi.co/api/v2/pokemon/" + encodeURIComponent(query));
  if (response.status === 404) throw new Error("not-found");
  if (!response.ok) throw new Error("api-error");
  return response.json();
};

const buildPokemonCard = function (data) {
  const sprite = data.sprites.front_default || data.sprites.other["official-artwork"].front_default;
  const locale = L("en-US", "pt-BR");
  const weightKg = (data.weight / 10).toLocaleString(locale);
  const heightM = (data.height / 10).toLocaleString(locale);

  const typesHTML = data.types.map(function (entry) {
    const typeName = entry.type.name;
    const color = POKE_TYPE_COLORS[typeName] || "#68a090";
    return `<div class="poke-type" style="background:${color}">${typeName}</div>`;
  }).join("");

  const statsHTML = data.stats.map(function (entry) {
    const label = POKE_STAT_LABELS[entry.stat.name] || entry.stat.name;
    const percent = Math.min(100, Math.round((entry.base_stat / 255) * 100));
    return `
      <div class="poke-stat">
        <div class="poke-stat-name">${label}</div>
        <div class="poke-stat-value">${entry.base_stat}</div>
        <div class="poke-stat-bar"><div class="poke-stat-fill" style="width:${percent}%"></div></div>
      </div>`;
  }).join("");

  return `
    <div class="poke-card">
      <img class="poke-sprite" src="${sprite}" alt="${data.name}">
      <div class="poke-info">
        <div class="poke-name">${data.name} <span class="poke-id">#${data.id}</span></div>
        <div class="poke-meta">${L("Weight", "Peso")}: ${weightKg} kg · ${L("Height", "Altura")}: ${heightM} m</div>
        <div class="poke-types">${typesHTML}</div>
      </div>
    </div>
    <div class="poke-stats-list">${statsHTML}</div>`;
};

const setupPokeDemo = function (container) {
  container.innerHTML = pokeDemoMarkup();

  const form = container.querySelector("[data-poke-form]");
  const input = container.querySelector("[data-poke-input]");
  const status = container.querySelector("[data-poke-status]");
  const result = container.querySelector("[data-poke-result]");
  let lastRequest = 0;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const query = input.value.trim().toLowerCase().replace(/\s+/g, "-");
    if (!query) return;

    const requestId = ++lastRequest;
    status.className = "poke-demo-status";
    status.innerText = L("Searching...", "Buscando...");

    try {
      const data = await fetchPokemon(query);
      if (requestId !== lastRequest) return;
      result.innerHTML = buildPokemonCard(data);
      status.innerText = "";
    } catch (error) {
      if (requestId !== lastRequest) return;
      result.innerHTML = "";
      status.classList.add("error");
      status.innerText = error.message === "not-found"
        ? L("Pokémon not found. Try another name or ID.", "Pokémon não encontrado. Tente outro nome ou ID.")
        : L("Couldn't reach PokeAPI right now. Please try again.", "Não foi possível consultar a PokeAPI agora. Tente novamente.");
    }
  });
};

// ---- Calculator (iOS-style) ----
const calcMarkup = function () {
  const keys = [
    ["clear", "AC", "top"], ["negate", "+/-", "top"], ["percent", "%", "top"], ["/", "÷", "op"],
    ["7", "7"], ["8", "8"], ["9", "9"], ["*", "×", "op"],
    ["4", "4"], ["5", "5"], ["6", "6"], ["-", "-", "op"],
    ["1", "1"], ["2", "2"], ["3", "3"], ["+", "+", "op"],
    ["0", "0", "zero"], ["dot", ","], ["equals", "=", "op"]
  ];
  return `
  <div class="calc-demo">
    <output class="calc-display" data-calc-display aria-live="polite">0</output>
    <div class="calc-keys">${keys.map(function (k) {
      return `<button type="button" class="calc-key ${k[2] ? "calc-" + k[2] : ""}" data-calc-key="${k[0]}">${k[1]}</button>`;
    }).join("")}</div>
  </div>`;
};

const setupCalcDemo = function (container) {
  container.innerHTML = calcMarkup();
  const display = container.querySelector("[data-calc-display]");
  const clearKey = container.querySelector('[data-calc-key="clear"]');
  const opKeys = container.querySelectorAll(".calc-op:not([data-calc-key=equals])");

  let current = "0";      // full-precision value behind the display
  let stored = null;      // left operand
  let operator = null;
  let waiting = false;    // true right after picking an operator
  let fresh = false;      // true when the display shows a result (after = or %): typing starts a new number
  let computed = false;   // current came from a calculation (formatted like iOS), not typed by the user
  let lastOp = null;      // for repeated "=" (e.g. 2 + 3 = = =)

  // Keeps 12 significant digits internally: removes float noise (0.1 + 0.2 -> 0.3) without losing precision.
  const clean = function (n) {
    return isFinite(n) ? String(parseFloat(n.toPrecision(12))) : "Error";
  };
  const compute = function (a, op, b) {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b === 0 ? NaN : a / b;
    }
  };

  // iOS-style display: thousands separators, at most 9 digits, scientific notation like "1e12" when it doesn't fit.
  const groupDigits = function (intPart) {
    return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, L(",", "."));
  };
  const scientific = function (value) {
    for (let p = 8; p >= 0; p--) {
      const parts = value.toExponential(p).split("e");
      const mantissa = parts[0].includes(".") ? parts[0].replace(/\.?0+$/, "") : parts[0];
      const exponent = String(Number(parts[1]));
      if (mantissa.replace(/[-.]/g, "").length + exponent.length <= 10 || p === 0) {
        return mantissa.replace(".", L(".", ",")) + "e" + exponent;
      }
    }
  };
  const formatResult = function (value) {
    const abs = Math.abs(value);
    if (abs >= 1e9 || (abs !== 0 && abs < 1e-8)) return scientific(value);
    const intDigits = abs < 1 ? 1 : Math.floor(Math.log10(abs)) + 1;
    let text = value.toFixed(Math.max(0, 9 - intDigits));
    if (text.includes(".")) text = text.replace(/\.?0+$/, "");
    if (text.replace(/[-.]/g, "").length > 9 && !text.includes(".")) return scientific(value);
    if (parseFloat(text) === 0 && value !== 0) return scientific(value);
    if (text === "-0") text = "0";
    return formatTyped(text);
  };
  const formatTyped = function (text) {
    const negative = text.startsWith("-");
    const parts = text.replace("-", "").split(".");
    return (negative ? "-" : "") + groupDigits(parts[0]) + (parts.length > 1 ? L(".", ",") + parts[1] : "");
  };

  const render = function () {
    const text = current === "Error" ? L("Error", "Erro")
      : computed ? formatResult(parseFloat(current)) : formatTyped(current);
    display.textContent = text;
    // Shrink the font as the number grows, like the iPhone does.
    display.style.setProperty("--calc-scale", Math.min(1, 9 / Math.max(text.length, 1)).toFixed(3));
    clearKey.textContent = current !== "0" && !waiting ? "C" : "AC";
    opKeys.forEach(function (k) { k.classList.toggle("selected", waiting && k.dataset.calcKey === operator); });
  };

  const startNewNumber = function () {
    const starting = waiting || fresh;
    waiting = false;
    fresh = false;
    computed = false;
    return starting;
  };

  const press = function (key) {
    if (current === "Error" && key !== "clear") { current = "0"; stored = null; operator = null; computed = false; fresh = false; }

    if (/^\d$/.test(key)) {
      if (startNewNumber()) current = key;
      else if (current.replace(/[-.]/g, "").length < 9) current = current === "0" ? key : current === "-0" ? "-" + key : current + key;
    } else if (key === "dot") {
      if (startNewNumber()) current = "0.";
      else if (!current.includes(".")) current += ".";
    } else if (key === "clear") {
      if (clearKey.textContent === "C") { current = "0"; computed = false; fresh = false; }
      else { current = "0"; stored = null; operator = null; waiting = false; fresh = false; computed = false; lastOp = null; }
    } else if (key === "negate") {
      if (waiting) { current = "0"; waiting = false; computed = false; }
      current = current.startsWith("-") ? current.slice(1) : "-" + current;
    } else if (key === "percent") {
      const value = parseFloat(current);
      current = clean(stored !== null && (operator === "+" || operator === "-") ? stored * value / 100 : value / 100);
      waiting = false;
      fresh = true;
      computed = true;
    } else if (key === "equals") {
      if (operator !== null) {
        const right = waiting ? stored : parseFloat(current);
        lastOp = [operator, right];
        current = clean(compute(stored, operator, right));
        operator = null; stored = null;
      } else if (lastOp) {
        current = clean(compute(parseFloat(current), lastOp[0], lastOp[1]));
      }
      waiting = false;
      fresh = true;
      computed = true;
    } else { // + - * /
      if (operator !== null && !waiting) current = clean(compute(stored, operator, parseFloat(current)));
      if (current === "Error") { render(); return; }
      stored = parseFloat(current);
      operator = key;
      waiting = true;
      fresh = false;
      computed = true;
      lastOp = null;
    }
    render();
  };

  // Swipe left or right on the display to delete the last digit (only while typing a number).
  const backspace = function () {
    if (waiting || fresh || computed || current === "Error") return;
    current = current.slice(0, -1);
    if (current === "" || current === "-") current = "0";
    render();
  };
  let swipeStartX = null;
  display.addEventListener("pointerdown", function (event) { swipeStartX = event.clientX; });
  display.addEventListener("pointerup", function (event) {
    if (swipeStartX !== null && Math.abs(event.clientX - swipeStartX) > 30) backspace();
    swipeStartX = null;
  });
  display.addEventListener("pointercancel", function () { swipeStartX = null; });

  container.querySelector(".calc-keys").addEventListener("click", function (event) {
    const btn = event.target.closest("[data-calc-key]");
    if (btn) press(btn.dataset.calcKey);
  });
  render();
};

// ---- To-do list (saved in localStorage) ----
const TODO_STORAGE_KEY = "portfolio-todos";
const loadTodos = function () {
  try { return JSON.parse(localStorage.getItem(TODO_STORAGE_KEY)) || []; } catch (e) { return []; }
};
const saveTodos = function (todos) {
  try { localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos)); } catch (e) { /* storage blocked: list just won't persist */ }
};

const setupTodoDemo = function (container) {
  container.innerHTML = `
  <div class="todo-demo">
    <form class="poke-demo-form" data-todo-form>
      <input class="poke-demo-input" type="text" maxlength="120" autocomplete="off" data-todo-input
        placeholder="${L("What needs to be done?", "O que precisa ser feito?")}" aria-label="${L("New task", "Nova tarefa")}">
      <button class="poke-demo-btn" type="submit">${L("Add", "Adicionar")}</button>
    </form>
    <ul class="todo-list" data-todo-list></ul>
    <div class="todo-footer" data-todo-footer></div>
  </div>`;

  const form = container.querySelector("[data-todo-form]");
  const input = container.querySelector("[data-todo-input]");
  const list = container.querySelector("[data-todo-list]");
  const footer = container.querySelector("[data-todo-footer]");
  let todos = loadTodos();

  const commit = function () { saveTodos(todos); render(); };

  const render = function () {
    list.innerHTML = "";
    if (!todos.length) {
      list.innerHTML = `<li class="todo-empty">${L("Nothing to do. Enjoy it 🌴", "Nada pra fazer. Aproveite 🌴")}</li>`;
    }
    todos.forEach(function (todo, index) {
      const li = document.createElement("li");
      li.className = "todo-item" + (todo.completed ? " done" : "");
      li.innerHTML = `
        <label class="todo-check"><input type="checkbox" ${todo.completed ? "checked" : ""}><span class="todo-box"><ion-icon name="checkmark-outline"></ion-icon></span></label>
        <span class="todo-text"></span>
        <button type="button" class="todo-btn" data-action="edit" aria-label="${L("Edit", "Editar")}"><ion-icon name="create-outline"></ion-icon></button>
        <button type="button" class="todo-btn" data-action="delete" aria-label="${L("Delete", "Excluir")}"><ion-icon name="trash-outline"></ion-icon></button>`;
      li.querySelector(".todo-text").textContent = todo.text;

      li.querySelector("input").addEventListener("change", function () {
        todo.completed = this.checked;
        commit();
      });
      li.querySelector('[data-action="delete"]').addEventListener("click", function () {
        todos.splice(index, 1);
        commit();
      });
      li.querySelector('[data-action="edit"]').addEventListener("click", function () {
        const field = document.createElement("input");
        field.className = "poke-demo-input todo-edit";
        field.value = todo.text;
        field.maxLength = 120;
        let finished = false;
        const finish = function (save) {
          if (finished) return; // removing the field fires blur; don't commit twice
          finished = true;
          const value = field.value.trim();
          if (save && value) todo.text = value;
          commit();
        };
        field.addEventListener("keydown", function (event) {
          if (event.key === "Enter") finish(true);
          if (event.key === "Escape") { event.stopPropagation(); finish(false); }
        });
        field.addEventListener("blur", function () { finish(true); });
        li.querySelector(".todo-text").replaceWith(field);
        this.hidden = true;
        field.focus();
      });
      list.append(li);
    });

    const doneCount = todos.filter(function (t) { return t.completed; }).length;
    footer.innerHTML = todos.length
      ? `<span>${doneCount}/${todos.length} ${L("done", "concluídas")}</span>` +
        (doneCount ? `<button type="button" class="todo-clear" data-todo-clear>${L("Clear completed", "Limpar concluídas")}</button>` : "")
      : "";
    const clearBtn = footer.querySelector("[data-todo-clear]");
    if (clearBtn) clearBtn.addEventListener("click", function () {
      todos = todos.filter(function (t) { return !t.completed; });
      commit();
    });
  };

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    todos.push({ text: text, completed: false });
    input.value = "";
    commit();
  });

  render();
};

// ---- Mini web projects: one card, tabs switch between the three demos ----
// Each tab's description lives in index.html (<p data-mini-details="key">), so it is in the static HTML.
const MINI_PROJECTS = [
  {
    key: "pokedex", icon: "search-outline", label: ["Pokédex", "Pokédex"], setup: setupPokeDemo
  },
  {
    key: "calc", icon: "calculator-outline", label: ["Calculator", "Calculadora"], setup: setupCalcDemo
  },
  {
    key: "todo", icon: "checkbox-outline", label: ["To-do", "To-do"], setup: setupTodoDemo
  }
];

const setupMiniProjects = function () {
  modalDemo.innerHTML = `
  <div class="mini-tabs" role="tablist">${MINI_PROJECTS.map(function (p) {
    return `<button type="button" class="mini-tab" role="tab" data-mini-tab="${p.key}" aria-selected="false"><ion-icon name="${p.icon}"></ion-icon><span>${L.apply(null, p.label)}</span></button>`;
  }).join("")}</div>
  <div class="mini-panel" role="tabpanel" data-mini-panel></div>`;

  const panel = modalDemo.querySelector("[data-mini-panel]");
  const tabs = modalDemo.querySelectorAll("[data-mini-tab]");

  const show = function (key) {
    const project = MINI_PROJECTS.find(function (p) { return p.key === key; });
    tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.miniTab === key)); });
    project.setup(panel);
    const details = document.querySelector(`[data-mini-details="${key}"]`);
    modalDetails.innerHTML = details ? details.innerHTML : "";
  };

  tabs.forEach(function (t) { t.addEventListener("click", function () { show(t.dataset.miniTab); }); });
  show(MINI_PROJECTS[0].key);
};

const PROJECT_DEMOS = { pokesearch: function () { setupPokeDemo(modalDemo); }, miniprojects: setupMiniProjects };

const openProjectDemo = function (demoName) {
  modalDemo.classList.remove("active");
  modalDemo.innerHTML = "";
  modalImage.style.display = "";
  modalCover.style.display = "";

  if (PROJECT_DEMOS[demoName]) {
    PROJECT_DEMOS[demoName]();
    modalDemo.classList.add("active");
    modalImage.style.display = "none";
    modalCover.style.display = "none";
  }
};


const toggleProjectModal = function (isOpen) {
  projectModal.classList.toggle("active", isOpen);
  projectModal.setAttribute("aria-hidden", String(!isOpen));
  document.body.classList.toggle("modal-open", isOpen);
};

for (let i = 0; i < projectTriggers.length; i++) {
  projectTriggers[i].addEventListener("click", function (event) {
    // Cards with a real URL (repo/site) still open it on ctrl/cmd/shift-click.
    if (this.hasAttribute("href") && (event.ctrlKey || event.metaKey || event.shiftKey)) return;
    event.preventDefault();

    const projectItem = this.closest("[data-filter-item]");
    const title = projectItem.querySelector(".project-title").innerText;

    modalTitle.innerText = title;
    renderModalMedia(this);
    // The text is already in the card's HTML (hidden by CSS), in the current language.
    const description = projectItem.querySelector("[data-project-description]");
    const details = projectItem.querySelector("[data-project-details]");
    modalDescription.innerHTML = description ? description.innerHTML : "";
    modalDetails.innerHTML = details ? details.innerHTML : "";
    renderModalTags(projectItem);
    openProjectDemo(projectItem.dataset.demo);
    toggleProjectModal(true);
  });

  // Cards without a URL are role="button" anchors: make Enter/Space open them too.
  projectTriggers[i].addEventListener("keydown", function (event) {
    if (this.hasAttribute("href")) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.click();
    }
  });
}

modalCloseButton.addEventListener("click", function () {
  toggleProjectModal(false);
});

modalOverlay.addEventListener("click", function () {
  toggleProjectModal(false);
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && projectModal.classList.contains("active")) {
    toggleProjectModal(false);
  }
});
