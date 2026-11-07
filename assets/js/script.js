'use strict';

// Toggle functionality
const elementToggleFunc = function (elem) { elem.classList.toggle("active"); }

// Sidebar interactions
const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");
sidebarBtn.addEventListener("click", function () { elementToggleFunc(sidebar); });

// Filter & Category selection
const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-selecct-value]");
const filterBtn = document.querySelectorAll("[data-filter-btn]");
const filterItems = document.querySelectorAll("[data-filter-item]");

select.addEventListener("click", function () { elementToggleFunc(this); });

const filterFunc = function (selectedValue) {
  for (let i = 0; i < filterItems.length; i++) {
    if (selectedValue === "todos" || selectedValue === filterItems[i].dataset.category) {
      filterItems[i].classList.add("active");
    } else {
      filterItems[i].classList.remove("active");
    }
  }
}

for (let i = 0; i < selectItems.length; i++) {
  selectItems[i].addEventListener("click", function () {
    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    elementToggleFunc(select);
    filterFunc(selectedValue);
  });
}

let lastClickedBtn = filterBtn[0];
for (let i = 0; i < filterBtn.length; i++) {
  filterBtn[i].addEventListener("click", function () {
    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    filterFunc(selectedValue);

    lastClickedBtn.classList.remove("active");
    this.classList.add("active");
    lastClickedBtn = this;
  });
}

// Page navigation logic
const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");

// add event to all nav link
for (let i = 0; i < navigationLinks.length; i++) {
  navigationLinks[i].addEventListener("click", function () {

    for (let j = 0; j < pages.length; j++) {
      if (this.innerHTML.toLowerCase() === pages[j].dataset.page) {
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

// Form validation & Submission (Unificado)
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

// Envio em segundo plano (AJAX) para não sair da página
form.addEventListener("submit", async function (event) {
  // Impede que o navegador redirecione para a página do Formspree
  event.preventDefault();

  // Coleta os dados que foram preenchidos
  const data = new FormData(event.target);

  try {
    // Envia os dados silenciosamente usando fetch
    const response = await fetch(event.target.action, {
      method: form.method,
      body: data,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      // 1. Limpa os campos magicamente
      form.reset();
      
      // 2. Trava o botão de novo (já que os campos esvaziaram)
      formBtn.setAttribute("disabled", "");
      
      // 3. Muda o texto do botão temporariamente para dar um feedback visual
      const btnText = formBtn.querySelector("span");
      btnText.innerText = "Enviado com sucesso! ✅";
      
      setTimeout(() => {
        btnText.innerText = "Send Message"; // Volta ao normal após 4 segundos
      }, 4000);
      
    } else {
      alert("Ops! Ocorreu um problema ao enviar sua mensagem. Tente novamente.");
    }
  } catch (error) {
    alert("Ops! Ocorreu um problema na sua conexão.");
  }
});

// =========================================
// LÓGICA DO MODAL DE PROJETOS
// =========================================

// 1. Selecionar todos os cards de projetos (elementos com data-filter-item)
// 2. Selecionar os elementos do Modal: container do modal, overlay, botão de fechar, título, imagem, texto e bloco de código
// 3. Criar uma função genérica para alternar (toggle) a classe "active" no modalContainer e no overlay

// 4. Fazer um loop (for) em todos os cards de projetos:
//    - Adicionar um evento de "click" em cada card
//    - Prevenir o comportamento padrão do link (preventDefault)
//    - Atualizar o Título, Imagem e Texto do modal baseado no conteúdo do card clicado
//    - Chamar a função que abre o modal

// 5. Adicionar evento de "click" no botão de fechar para chamar a função de toggle
// 6. Adicionar evento de "click" no overlay para fechar o modal ao clicar fora

const projectTriggers = document.querySelectorAll("[data-project-trigger]");
const projectModal = document.querySelector("[data-project-modal]");
const modalOverlay = document.querySelector("[data-modal-overlay]");
const modalCloseButton = document.querySelector("[data-modal-close]");
const modalTitle = projectModal.querySelector("#modal-title");
const modalImage = projectModal.querySelector("img");
const modalDescription = projectModal.querySelector("[data-modal-description]");
const modalDetails = projectModal.querySelector("[data-modal-details]");

// =========================================
// DEMO INTERATIVA NO MODAL (ex.: Pokédex)
// =========================================
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

const POKE_DEMO_MARKUP = `
  <div class="poke-demo">
    <form class="poke-demo-form" data-poke-form>
      <input class="poke-demo-input" type="text" placeholder="Nome ou ID (ex: pikachu, 6)"
        aria-label="Nome ou ID do Pokémon" autocomplete="off" data-poke-input>
      <button class="poke-demo-btn" type="submit">Buscar</button>
    </form>
    <div class="poke-demo-status" data-poke-status>Digite o nome ou o número de um Pokémon.</div>
    <div class="poke-demo-result" data-poke-result></div>
  </div>`;

// Consulta a PokeAPI e diferencia "não encontrado" de falha de rede
const fetchPokemon = async function (query) {
  const response = await fetch("https://pokeapi.co/api/v2/pokemon/" + encodeURIComponent(query));
  if (response.status === 404) throw new Error("not-found");
  if (!response.ok) throw new Error("api-error");
  return response.json();
};

// Transforma o JSON da API em HTML (peso vem em hectogramas e altura em decímetros)
const buildPokemonCard = function (data) {
  const sprite = data.sprites.front_default || data.sprites.other["official-artwork"].front_default;
  const weightKg = (data.weight / 10).toLocaleString("pt-BR");
  const heightM = (data.height / 10).toLocaleString("pt-BR");

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
        <div class="poke-meta">Peso: ${weightKg} kg · Altura: ${heightM} m</div>
        <div class="poke-types">${typesHTML}</div>
      </div>
    </div>
    <div class="poke-stats-list">${statsHTML}</div>`;
};

const setupPokeDemo = function () {
  modalDemo.innerHTML = POKE_DEMO_MARKUP;

  const form = modalDemo.querySelector("[data-poke-form]");
  const input = modalDemo.querySelector("[data-poke-input]");
  const status = modalDemo.querySelector("[data-poke-status]");
  const result = modalDemo.querySelector("[data-poke-result]");
  let lastRequest = 0; // ignora respostas antigas se o usuário buscar de novo rápido

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const query = input.value.trim().toLowerCase().replace(/\s+/g, "-");
    if (!query) return;

    const requestId = ++lastRequest;
    status.className = "poke-demo-status";
    status.innerText = "Buscando...";

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
        ? "Pokémon não encontrado. Tente outro nome ou ID."
        : "Não foi possível consultar a PokeAPI agora. Tente novamente.";
    }
  });
};

// Cada projeto com data-demo="nome" abre a demo correspondente acima do texto
const PROJECT_DEMOS = { pokesearch: setupPokeDemo };

const openProjectDemo = function (demoName) {
  modalDemo.classList.remove("active");
  modalDemo.innerHTML = "";
  modalImage.style.display = "";

  if (PROJECT_DEMOS[demoName]) {
    PROJECT_DEMOS[demoName]();
    modalDemo.classList.add("active");
    modalImage.style.display = "none"; // a demo já ocupa o lugar da imagem
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
    const image = this.querySelector(".project-img img");

    modalTitle.innerText = title;
    modalImage.src = image.src;
    modalImage.alt = image.alt;
    modalDescription.innerText = projectItem.dataset.description;
    modalDetails.innerText = projectItem.dataset.details;
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