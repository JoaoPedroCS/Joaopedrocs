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
