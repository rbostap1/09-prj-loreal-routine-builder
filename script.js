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
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Add the AI's response to the conversation history
    conversationHistory.push({ role: "assistant", content: routine });
  } catch (error) {
    // Log the error to the console for debugging
    console.error("Error generating routine:", error);

    // Display an error message in the chatbox
    chatWindow.innerHTML += `<p class="ai-message">Failed to generate routine. Please try again later.</p>`;
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

  const prompt = `Answer only questions related to routines, L'Oréal products, or related topics. User asked: "${userInput}". End the response with a follow-up question to engage the user.`;

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

    // Display the AI's reply in a chat bubble
    chatWindow.innerHTML += `<p class="ai-message">${reply}</p>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Add the AI's reply to the conversation history
    conversationHistory.push({ role: "assistant", content: reply });
  } catch (error) {
    chatWindow.innerHTML += `<p class="ai-message">Failed to fetch a response. Please try again later.</p>`;
  }

  chatForm.reset();
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

/* Load user preferences on page load */
window.addEventListener("load", () => {
  loadSelectedProducts();
  loadRoutine();
});
