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

/* Update product cards to allow selection and show selected state */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
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

  // Update the visual state of product cards
  updateProductCardSelection();
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
    )}. Format the response with line breaks and bullet points for clarity.`;

  try {
    // Display the user's request in a chat bubble
    chatWindow.innerHTML += `<p class="user-message">Generate a routine for the selected products.</p>`;

    // Send the prompt to the OpenAI API
    const response = await fetch(
      "https://lorealchatbot.rbostap1.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    // Parse the response from the API
    const data = await response.json();
    let routine = data.choices[0]?.message?.content || "No routine generated.";

    // Normalize excessive line breaks to one or two
    routine = routine.replace(/\n{3,}/g, "\n\n");

    // Format the routine with line breaks for better readability
    const formattedRoutine = routine
      .split("\n")
      .map((line) => `<p>${line}</p>`)
      .join("");

    // Display the AI's response in a chat bubble
    chatWindow.innerHTML += `<div class="ai-message">${formattedRoutine}</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight; // Scroll to the bottom of the chat window
  } catch (error) {
    // Handle errors and display a message in the chatbox
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

  const prompt = `Answer only questions related to routines, L'Oréal products, or related topics. User asked: "${userInput}"`;

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
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || "I cannot answer that.";

    // Display the AI's reply in a chat bubble
    chatWindow.innerHTML += `<p class="ai-message">${reply}</p>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
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
