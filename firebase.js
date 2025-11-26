import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  getDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === 1. CONFIG FIREBASE ===
const firebaseConfig = {
  apiKey: "AIzaSyAIY0sgeBoMk5Sn_xNTjaFije2Qq-cghuU",
  authDomain: "database1-43592.firebaseapp.com",
  projectId: "database1-43592",
  storageBucket: "database1-43592.firebasestorage.app",
  messagingSenderId: "975312972801",
  appId: "1:975312972801:web:d1129010b60383dce6e400",
  measurementId: "G-ZVBDL6D3VD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// === 2. DOM ELEMENTS ===

// Auth
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const userAvatar = document.getElementById("userAvatar");
const authBtn = document.querySelector(".auth-btn");

// Admin
const adminTab = document.getElementById("adminTab");
const addProductForm = document.getElementById("addProductForm");

// Home products
const homeProductList = document.getElementById("homeProducts");
const loadingHomeProducts = document.getElementById("loadingProducts");

// Catalog page
const catalogPage = document.getElementById("catalogPage");
const catalogProductList = document.getElementById("catalogProducts");
const catalogLoading = document.getElementById("catalogLoading");

// Modal
const modal = document.getElementById("modal");
const closeBtn = document.getElementById("closeBtn");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");

// === 3. GLOBAL STATE ===
let allProducts = [];

// === 4. HELPERS ===

const checkAdminStatus = async (user) => {
  if (!user) return false;
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    return userDoc.exists() && userDoc.data().isAdmin === true;
  } catch (error) {
    console.error("Помилка перевірки статусу адміна:", error);
    return false;
  }
};

const updateVisibility = () => {
  const isUserLoggedIn = auth.currentUser !== null;
  const authRequiredElements = document.querySelectorAll(".auth-required");

  authRequiredElements.forEach((el) => {
    el.style.display = isUserLoggedIn ? "inline-block" : "none";
  });
};

// шаблон картки товару
const productCardTemplate = (product) => `
  <div class="product-card"
       data-name="${product.name}"
       data-price="${product.price}"
       data-desc="${product.description || "Опис відсутній"}">
    <div class="product-visual"></div>
    <div class="product-info">
      <h4>${product.name}</h4>
      <p>Ціна: ${product.price} грн</p>
    </div>
    <div class="actions">
      <button class="preview-btn">Деталі</button>
      <a href="https://forms.gle/replace-with-your-form-id"
         target="_blank"
         class="form-btn auth-required"
         style="display:none;">
         Замовити
      </a>
    </div>
  </div>
`;

// навішування обробників на кнопки "Деталі"
const attachCardEvents = (container) => {
  if (!container || !modal) return;

  const buttons = container.querySelectorAll(".preview-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".product-card");
      if (!card) return;
      modalTitle.textContent = card.dataset.name || "Товар";
      modalDescription.textContent = card.dataset.desc || "Опис відсутній";
      modal.classList.add("show");
    });
  });
};

// === 5. ADMIN: ДОДАВАННЯ ТОВАРУ ===

if (addProductForm) {
  addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = e.target.productName.value.trim();
    const brand = (e.target.productBrand.value || "Nike").trim();
    const gender = (e.target.productGender.value || "unisex").toLowerCase();
    const sizesRaw = e.target.productSizes.value || "";
    const price = parseFloat(e.target.productPrice.value);
    const description = e.target.productDescription.value.trim();

    const sizes = sizesRaw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    if (!name || isNaN(price) || !description || sizes.length === 0) {
      alert("Будь ласка, заповніть всі поля коректно (у т.ч. розміри).");
      return;
    }

    const user = auth.currentUser;
    if (!user || !(await checkAdminStatus(user))) {
      alert("Помилка доступу: Ви не адміністратор.");
      return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Збереження...";

    try {
      const productsCollection = collection(db, "products");
      await addDoc(productsCollection, {
        name,
        brand,
        gender,
        sizes,
        price,
        description,
        createdAt: new Date().toISOString()
      });

      alert("Товар успішно додано! Перенаправлення на головну сторінку.");
      window.location.href = "index.html";
    } catch (error) {
      console.error("Помилка додавання товару:", error);
      alert("Помилка: Не вдалося додати товар. Перевірте консоль (F12)!");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Додати товар";
    }
  });
}

// === 6. AUTH ===

// Реєстрація
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    if (password !== confirmPassword) {
      alert("Помилка: Паролі не збігаються!");
      e.target.password.value = "";
      e.target.confirmPassword.value = "";
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        isAdmin: false,
        createdAt: new Date().toISOString()
      });

      alert("Реєстрація успішна! Ви будете перенаправлені.");
      window.location.href = "index.html";
    } catch (err) {
      console.error("Помилка реєстрації:", err.code, err.message);
      const userMessage =
        err.code === "auth/email-already-in-use"
          ? "Помилка: Цей email вже використовується."
          : "Помилка реєстрації. Перевірте консоль для деталей.";
      alert(userMessage);
    }
  });
}

// Вхід
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Вхід виконано! Ви будете перенаправлені на головну.");
      window.location.href = "index.html";
    } catch (err) {
      console.error("Помилка входу:", err.code, err.message);
      alert("Помилка входу. Перевірте email та пароль.");
    }
  });
}

// Вихід
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      alert("Ви вийшли з акаунта.");
      window.location.reload();
    } catch (error) {
      console.error("Помилка виходу:", error);
      alert("Не вдалося вийти з акаунта.");
    }
  });
}

// === 7. AUTH STATE & UI ===

onAuthStateChanged(auth, async (user) => {
  updateVisibility();

  const isAdminPage =
    window.location.pathname.endsWith("admin.html") ||
    window.location.pathname.includes("/admin.html");

  let isAdmin = false;

  if (user) {
    // логін
    if (userInfo) {
      userInfo.textContent = user.email;
      userInfo.style.display = "inline-block";
    }
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    if (userAvatar) userAvatar.style.display = "flex";
    if (authBtn) authBtn.style.display = "none";

    isAdmin = await checkAdminStatus(user);

    if (adminTab) {
      adminTab.style.display = isAdmin ? "inline-block" : "none";
    }

    if (isAdminPage) {
      const authMessage = document.getElementById("authMessage");
      if (isAdmin) {
        if (addProductForm) addProductForm.style.display = "flex";
        if (authMessage) authMessage.style.display = "none";
      } else {
        if (authMessage) {
          authMessage.textContent =
            "Доступ заборонено. Тільки адміністратори можуть додавати товари.";
          authMessage.style.display = "block";
        }
        if (addProductForm) addProductForm.style.display = "none";
      }
    }
  } else {
    // логаут
    if (userInfo) userInfo.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (userAvatar) userAvatar.style.display = "none";
    if (authBtn) authBtn.style.display = "inline-block";

    if (adminTab) adminTab.style.display = "none";

    if (isAdminPage) {
      const authMessage = document.getElementById("authMessage");
      if (authMessage) {
        authMessage.textContent =
          "Будь ласка, увійдіть як адміністратор для доступу.";
        authMessage.style.display = "block";
      }
      if (addProductForm) addProductForm.style.display = "none";
    }
  }
});

// === 8. PRODUCTS: LOAD FROM FIRESTORE ===

const normalizeProduct = (docSnap) => {
  const data = docSnap.data() || {};
  let createdAt = new Date();

  if (data.createdAt) {
    if (data.createdAt.toDate) {
      createdAt = data.createdAt.toDate();
    } else if (typeof data.createdAt === "string") {
      const d = new Date(data.createdAt);
      if (!isNaN(d.getTime())) createdAt = d;
    }
  }

  let sizes = [];
  if (Array.isArray(data.sizes)) {
    sizes = data.sizes.map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
  } else if (typeof data.sizes === "string") {
    sizes = data.sizes
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  }

  return {
    id: docSnap.id,
    name: data.name || "Без назви",
    brand: (data.brand || "Nike").toLowerCase(),
    gender: (data.gender || "unisex").toLowerCase(),
    sizes,
    price: Number(data.price) || 0,
    description: data.description || "Опис відсутній",
    createdAt
  };
};

const renderHomeProducts = (products) => {
  if (!homeProductList) return;

  if (loadingHomeProducts) loadingHomeProducts.style.display = "none";

  if (!products.length) {
    homeProductList.innerHTML =
      '<p>Товари відсутні. Додайте їх у колекцію "products" у Firestore.</p>';
    return;
  }

  // можна обмежити, наприклад перші 6
  const subset = products.slice(0, 6);

  homeProductList.innerHTML = subset.map(productCardTemplate).join("");
  attachCardEvents(homeProductList);
  updateVisibility();
};

const renderCatalogProducts = (products) => {
  if (!catalogProductList) return;

  if (catalogLoading) catalogLoading.style.display = "none";

  if (!products.length) {
    catalogProductList.innerHTML =
      "<p>За вибраними фільтрами товари не знайдені.</p>";
    return;
  }

  catalogProductList.innerHTML = products.map(productCardTemplate).join("");
  attachCardEvents(catalogProductList);
  updateVisibility();
};

const loadProducts = async () => {
  const hasAnyProductContainer = homeProductList || catalogProductList;
  if (!hasAnyProductContainer) return;

  try {
    const productsRef = collection(db, "products");
    const q = query(productsRef);
    const querySnapshot = await getDocs(q);

    const productsArray = [];
    querySnapshot.forEach((docSnap) => {
      productsArray.push(normalizeProduct(docSnap));
    });

    allProducts = productsArray;

    if (homeProductList) {
      renderHomeProducts(allProducts);
    }

    if (catalogProductList) {
      initCatalogFilters(); // налаштувати фільтри
      applyFiltersAndRender(); // перший рендер
    }
  } catch (error) {
    console.error("Помилка завантаження товарів:", error.code, error.message);

    const msg =
      error.code === "permission-denied"
        ? 'Помилка доступу: Перевірте Правила Безпеки Firestore для колекції "products".'
        : "Помилка завантаження. Перевірте консоль для деталей.";

    if (loadingHomeProducts) loadingHomeProducts.textContent = msg;
    if (catalogLoading) catalogLoading.textContent = msg;
  }
};

// === 9. CATALOG FILTERS & SORT ===

let brandCheckboxes = [];
let genderRadios = [];
let sizeCheckboxes = [];
let priceMinInput = null;
let priceMaxInput = null;
let sortSelect = null;
let applyFiltersBtn = null;
let resetFiltersBtn = null;

const initCatalogFilters = () => {
  if (!catalogPage) return;

  brandCheckboxes = Array.from(
    document.querySelectorAll('input[name="brandFilter"]')
  );
  genderRadios = Array.from(
    document.querySelectorAll('input[name="genderFilter"]')
  );
  sizeCheckboxes = Array.from(
    document.querySelectorAll('input[name="sizeFilter"]')
  );
  priceMinInput = document.getElementById("priceMin");
  priceMaxInput = document.getElementById("priceMax");
  sortSelect = document.getElementById("sortSelect");
  applyFiltersBtn = document.getElementById("applyFiltersBtn");
  resetFiltersBtn = document.getElementById("resetFiltersBtn");

  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener("click", (e) => {
      e.preventDefault();
      applyFiltersAndRender();
    });
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", (e) => {
      e.preventDefault();
      resetFilters();
      applyFiltersAndRender();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      applyFiltersAndRender();
    });
  }
};

const resetFilters = () => {
  // бренди
  brandCheckboxes.forEach((cb) => {
    cb.checked = true; // один бренд — хай буде за замовчуванням увімкнений
  });

  // стать
  genderRadios.forEach((r) => {
    r.checked = r.value === "all";
  });

  // розмір
  sizeCheckboxes.forEach((cb) => {
    cb.checked = false;
  });

  if (priceMinInput) priceMinInput.value = "";
  if (priceMaxInput) priceMaxInput.value = "";
  if (sortSelect) sortSelect.value = "recommended";
};

const getFilteredAndSortedProducts = () => {
  let result = [...allProducts];

  // BRAND
  const selectedBrands = brandCheckboxes
    .filter((cb) => cb.checked)
    .map((cb) => cb.value.toLowerCase());

  if (selectedBrands.length > 0) {
    result = result.filter((p) => selectedBrands.includes(p.brand));
  }

  // GENDER
  const genderSelected =
    genderRadios.find((r) => r.checked)?.value || "all";
  if (genderSelected !== "all") {
    result = result.filter((p) => p.gender === genderSelected);
  }

  // SIZE
  const selectedSizes = sizeCheckboxes
    .filter((cb) => cb.checked)
    .map((cb) => parseInt(cb.value, 10))
    .filter((n) => !isNaN(n));

  if (selectedSizes.length > 0) {
    result = result.filter(
      (p) =>
        Array.isArray(p.sizes) &&
        p.sizes.some((size) => selectedSizes.includes(size))
    );
  }

  // PRICE
  const min = priceMinInput ? parseFloat(priceMinInput.value) : NaN;
  const max = priceMaxInput ? parseFloat(priceMaxInput.value) : NaN;

  if (!isNaN(min)) {
    result = result.filter((p) => p.price >= min);
  }
  if (!isNaN(max)) {
    result = result.filter((p) => p.price <= max);
  }

  // SORT
  const sortMode = sortSelect ? sortSelect.value : "recommended";

  if (sortMode === "priceAsc") {
    result.sort((a, b) => a.price - b.price);
  } else if (sortMode === "priceDesc") {
    result.sort((a, b) => b.price - a.price);
  } else if (sortMode === "newest") {
    result.sort((a, b) => b.createdAt - a.createdAt);
  }

  return result;
};

const applyFiltersAndRender = () => {
  if (!catalogProductList) return;
  const filtered = getFilteredAndSortedProducts();
  renderCatalogProducts(filtered);
};

// === 10. MODAL LOGIC ===

if (modal) {
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.remove("show");
    });
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("show");
  });
}

// === 11. START LOADING PRODUCTS (HOME & CATALOG) ===

loadProducts();
