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

const setupPokeDemo = function () {
  modalDemo.innerHTML = pokeDemoMarkup();

  const form = modalDemo.querySelector("[data-poke-form]");
  const input = modalDemo.querySelector("[data-poke-input]");
  const status = modalDemo.querySelector("[data-poke-status]");
  const result = modalDemo.querySelector("[data-poke-result]");
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

const PROJECT_DEMOS = { pokesearch: setupPokeDemo };

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
    event.preventDefault();

    const projectItem = this.closest("[data-filter-item]");
    const title = projectItem.querySelector(".project-title").innerText;

    modalTitle.innerText = title;
    renderModalMedia(this);
    modalDescription.innerText = projectItem.dataset.description;
    modalDetails.innerText = projectItem.dataset.details;
    renderModalTags(projectItem);
    openProjectDemo(projectItem.dataset.demo);
    toggleProjectModal(true);
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
