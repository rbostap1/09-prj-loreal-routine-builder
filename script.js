/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Array to store selected products */
let selectedProducts = [];

/* Save selected products to localStorage */
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Load selected products from localStorage */
function loadSelectedProducts() {
  const savedProducts = localStorage.getItem("selectedProducts");
  if (savedProducts) {
    selectedProducts = JSON.parse(savedProducts);

    // Update the selected products list in the DOM
    selectedProductsList.innerHTML = selectedProducts
      .map(
        (p) => `
      <div class="product-card">
        <img src="${p.image}" alt="${p.name}">
        <div class="product-info">
          <h3>${p.name}</h3>
          <p>${p.brand}</p>
        </div>
      </div>
    `
      )
      .join("");

    // Update the visual state of product cards
    updateProductCardSelection();
  }
}

/* Add or remove product from the selected products area */
function toggleProductSelection(product) {
  const productIndex = selectedProducts.findIndex((p) => p.id === product.id);

  if (productIndex === -1) {
    // Add product if not already selected
    selectedProducts.push(product);
  } else {
    // Remove product if already selected
    selectedProducts.splice(productIndex, 1);
  }

  // Save updated selected products to localStorage
  saveSelectedProducts();

  // Update the selected products list in the DOM
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (p) => `
      <div class="product-card">
        <img src="${p.image}" alt="${p.name}">
        <div class="product-info">
          <h3>${p.name}</h3>
          <p>${p.brand}</p>
        </div>
      </div>
    `
    )
    .join("");

  // Update the visual state of product cards
  updateProductCardSelection();
}

/* Update product cards to include info icon with hover card */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>
          ${product.name}
          <i class="fa-solid fa-circle-info info-icon" tabindex="0" data-description="${product.description}"></i>
        </h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `
    )
    .join("");

  // Attach click event listeners to product cards
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", () => {
      const productId = parseInt(card.getAttribute("data-id"));
      const product = products.find((p) => p.id === productId);
      toggleProductSelection(product);
    });
  });

  // Attach hover event listeners to info icons
  const infoIcons = document.querySelectorAll(".info-icon");
  infoIcons.forEach((icon) => {
    icon.addEventListener("mouseover", (e) => {
      showDescriptionCard(e, icon.getAttribute("data-description"));
    });
    icon.addEventListener("mouseout", hideDescriptionCard);
  });

  // Update the visual state of product cards
  updateProductCardSelection();
}

/* Show a card with the product description */
function showDescriptionCard(event, description) {
  // Create the description card element
  const descriptionCard = document.createElement("div");
  descriptionCard.className = "description-card";
  descriptionCard.textContent = description;

  // Position the card near the hovered icon
  descriptionCard.style.position = "absolute";
  descriptionCard.style.top = `${event.pageY + 10}px`;
  descriptionCard.style.left = `${event.pageX + 10}px`;

  // Add the card to the document
  document.body.appendChild(descriptionCard);
}

/* Hide the description card */
function hideDescriptionCard() {
  const descriptionCard = document.querySelector(".description-card");
  if (descriptionCard) {
    descriptionCard.remove();
  }
}

/* Highlight selected products in the products grid */
function updateProductCardSelection() {
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    const productId = parseInt(card.getAttribute("data-id"));
    if (selectedProducts.some((p) => p.id === productId)) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });
}

/* Array to store conversation history */
let conversationHistory = [];

/* Generate routine using OpenAI API */
async function generateRoutine() {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML += `<p class="ai-message">Please select products to generate a routine.</p>`;
    return;
  }

  // Create a prompt for the AI based on selected products
  const prompt = `Create a skincare or beauty routine using the following products: ${selectedProducts
    .map((p) => `${p.name} by ${p.brand}`)
    .join(
      ", "
    )}. Format the response with HTML tags for bolding (<b>), underlining (<u>), and hyperlinks (<a href="...">). End the response with a follow-up question to engage the user.`;

  // Add the user's request to the conversation history
  conversationHistory.push({ role: "user", content: prompt });

  try {
    // Display the user's request in a chat bubble
    chatWindow.innerHTML += `<p class="user-message">Generate a routine for the selected products.</p>`;

    // Scroll to the latest message
    scrollToLatestMessage();

    // Show typing indicator
    showTypingIndicator();

    // Send the conversation history to the OpenAI API
    const response = await fetch(
      "https://lorealchatbot.rbostap1.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: conversationHistory,
        }),
      }
    );

    // Check if the response is OK
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    // Parse the response from the API
    const data = await response.json();

    // Remove typing indicator
    removeTypingIndicator();

    // Check if the response contains the expected data
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("Invalid response format from API");
    }

    let routine = data.choices[0].message.content;

    // Normalize excessive line breaks to a single line break
    routine = routine.replace(/\n{2,}/g, "\n");

    // Format the routine with line breaks for better readability
    const formattedRoutine = routine
      .split("\n")
      .map((line) => `<p>${line.trim()}</p>`)
      .join("");

    // Display the AI's response in a chat bubble
    chatWindow.innerHTML += `<div class="ai-message">${formattedRoutine}</div>`;
    scrollToLatestMessage();

    // Add the AI's response to the conversation history
    conversationHistory.push({ role: "assistant", content: routine });
  } catch (error) {
    // Remove typing indicator
    removeTypingIndicator();

    // Log the error to the console for debugging
    console.error("Error generating routine:", error);

    // Display an error message in the chatbox
    chatWindow.innerHTML += `<p class="ai-message">Failed to generate routine. Please try again later.</p>`;
    scrollToLatestMessage();
  }
}

/* Scroll chat window to the latest message */
function scrollToLatestMessage() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Show typing indicator */
function showTypingIndicator() {
  const typingIndicator = document.createElement("p");
  typingIndicator.className = "ai-typing-indicator";
  typingIndicator.textContent = "The AI is working on a response...";
  chatWindow.appendChild(typingIndicator);
  scrollToLatestMessage();
}

/* Remove typing indicator */
function removeTypingIndicator() {
  const typingIndicator = document.querySelector(".ai-typing-indicator");
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

/* Handle routine generation button click */
generateRoutineBtn.addEventListener("click", generateRoutine);

/* Chat form submission handler */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput").value.trim();
  if (!userInput) return;

  // Display the user's message in a chat bubble
  chatWindow.innerHTML += `<p class="user-message">${userInput}</p>`;

  // Add the user's message to the conversation history
  conversationHistory.push({ role: "user", content: userInput });

  // Reset the input field
  document.getElementById("userInput").value = "";

  // Scroll to the latest message
  scrollToLatestMessage();

  // Show typing indicator
  showTypingIndicator();

  // Create a prompt for the AI to include web search in its response
  const prompt = `Answer the user's question: "${userInput}". If relevant, search the web for L'Oréal products, routines, or related topics. Include any links or citations you find in the response. Format the response with HTML tags for bolding (<b>), underlining (<u>), hyperlinks (<a href="...">), and ensure the response is visually structured for better readability. End the response with a follow-up question to engage the user.`;

  try {
    const response = await fetch(
      "https://lorealchatbot.rbostap1.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: conversationHistory,
        }),
      }
    );

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || "I cannot answer that.";

    // Remove typing indicator
    removeTypingIndicator();

    // Format the AI's reply for better readability
    const formattedReply = reply
      .split("\n")
      .map((line) => `<p>${line.trim()}</p>`)
      .join("");

    // Display the AI's reply in a chat bubble
    chatWindow.innerHTML += `<div class="ai-message">${formattedReply}</div>`;

    // Scroll to the latest message
    scrollToLatestMessage();

    // Add the AI's reply to the conversation history
    conversationHistory.push({ role: "assistant", content: reply });
  } catch (error) {
    // Remove typing indicator
    removeTypingIndicator();

    chatWindow.innerHTML += `<p class="ai-message">Failed to fetch a response. Please try again later.</p>`;
    scrollToLatestMessage();
  }
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Add search functionality for products */
const searchInput = document.getElementById("productSearch");

searchInput.addEventListener("input", async (e) => {
  const searchTerm = e.target.value.toLowerCase().trim();

  // Load all products
  const products = await loadProducts();

  // Filter products by name or category matching the search term
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm)
  );

  // Display the filtered products if there's a search term
  if (searchTerm) {
    displayProducts(filteredProducts);
  } else {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Select a category or search for products
      </div>
    `;
  }
});

// Hide product list when search field is not focused and empty
searchInput.addEventListener("blur", () => {
  if (!searchInput.value.trim()) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Select a category or search for products
      </div>
    `;
  }
});

// Show product list when search field is focused and has a value
searchInput.addEventListener("focus", async () => {
  const searchTerm = searchInput.value.toLowerCase().trim();
  if (searchTerm) {
    const products = await loadProducts();
    const filteredProducts = products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
    );
    displayProducts(filteredProducts);
  }
});

/* Detect if the language is RTL and adjust the page direction */
function applyRTLSupport() {
  const rtlLanguages = ["ar", "he", "fa", "ur"]; // List of RTL languages
  const userLang = navigator.language || navigator.userLanguage; // Get browser language
  const htmlElement = document.documentElement;

  // Check if the language is RTL
  if (rtlLanguages.some((lang) => userLang.startsWith(lang))) {
    htmlElement.setAttribute("dir", "rtl"); // Set direction to RTL
    htmlElement.classList.add("rtl"); // Add a class for additional styling
  } else {
    htmlElement.setAttribute("dir", "ltr"); // Set direction to LTR
    htmlElement.classList.remove("rtl"); // Remove RTL class if present
  }
}

// Apply RTL support on page load
window.addEventListener("load", () => {
  applyRTLSupport();
  loadSelectedProducts();
  loadRoutine();
});
