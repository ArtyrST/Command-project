import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
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
  query
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === 1. КОНФІГУРАЦІЯ FIREBASE ===
// ВАЖЛИВО: Використовуйте свої фактичні ключі
const firebaseConfig = {
  apiKey: "AIzaSyAIY0sgeBoMk5Sn_xNTjaFije2Qq-cghuU",
  authDomain: "database1-43592.firebaseapp.com",
  projectId: "database1-43592",
  storageBucket: "database1-43592.firebasestorage.app",
  messagingSenderId: "975312972801",
  appId: "1:975312972801:web:d1129010b60383dce6e400",
  measurementId: "G-ZVBDL6D3VD"
};

// Ініціалізація Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Аналітика за бажанням
const auth = getAuth(app);
const db = getFirestore(app);


// === 2. DOM ЕЛЕМЕНТИ ===

const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const googleForms = document.querySelectorAll('.form-btn');
const productList = document.querySelector('.product-list');

// Елементи для модального вікна
const modal = document.getElementById('modal');
const closeBtn = document.getElementById('closeBtn');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');


// === 3. АВТЕНТИФІКАЦІЯ ===

// Реєстрація користувача (Працює тільки на auth.html)
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Збереження додаткових даних у Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: new Date().toISOString()
      });

      alert("Реєстрація успішна! Ви будете перенаправлені.");
      window.location.href = "index.html"; 
    } catch (err) {
      console.error("Помилка реєстрації:", err);
      alert("Помилка: " + err.message);
    }
  });
}

// Вхід користувача (Працює тільки на auth.html)
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Вхід виконано! Ви будете перенаправлені на головну.");
      window.location.href = "index.html";
    } catch (err) {
      console.error("Помилка входу:", err);
      alert("Помилка: " + err.message);
    }
  });
}

// Вихід користувача (Працює на обох сторінках)
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    alert("Ви вийшли з акаунта.");
    // Після виходу перенаправляємо на головну, або оновлюємо сторінку auth
    if (window.location.pathname.includes('auth.html')) {
      window.location.reload();
    } else {
      // На index.html, onAuthStateChanged оновиться і приховає елементи
    }
  });
}

// Відстеження стану користувача (Оновлює інтерфейс на обох сторінках)
onAuthStateChanged(auth, (user) => {
  const authBtn = document.querySelector('.auth-btn');

  if (user) {
    // Користувач увійшов
    if (userInfo) userInfo.textContent = "Ви увійшли як: " + user.email;
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    googleForms.forEach(btn => btn.style.display = "inline-block");
    if (authBtn) authBtn.style.display = 'none'; // Приховуємо кнопку "Увійти"
  } else {
    // Користувач вийшов
    if (userInfo) userInfo.textContent = "Ви не авторизовані.";
    if (logoutBtn) logoutBtn.style.display = "none";
    googleForms.forEach(btn => btn.style.display = "none");
    if (authBtn && !window.location.pathname.includes('auth.html')) {
      authBtn.style.display = 'inline-block'; // Показуємо кнопку "Увійти" (якщо не на сторінці auth)
    }
  }
});


// === 4. ЛОГІКА ТОВАРІВ (Index.html) ===

/**
 * Рендерить картки товарів на сторінці.
 * @param {Array<Object>} products - Масив об'єктів товарів.
 */
const renderProducts = (products) => {
  if (!productList) return;

  productList.innerHTML = products.map(product => `
    <div class="product-card" data-name="${product.name}" data-price="${product.price}" data-desc="${product.description || 'Опис відсутній'}">
      <div class="product-visual">
              </div>
      <div class="product-info">
        <h4>${product.name}</h4>
        <p>Ціна: ${product.price} грн</p>
      </div>
      <div class="actions">
        <button class="preview-btn">Деталі</button>
        <a href="https://forms.gle/replace-with-your-form-id" target="_blank" class="form-btn">Замовити</a>
      </div>
    </div>
  `).join('');

  // Додаємо обробники подій для нових кнопок "Деталі"
  document.querySelectorAll('.product-card .preview-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.product-card');
      if (modal) {
        modalTitle.textContent = card.dataset.name;
        modalDescription.textContent = card.dataset.desc;
        modal.classList.add('show');
      }
    });
  });
};

/**
 * Завантажує список товарів з колекції 'products' у Firestore.
 */
const loadProducts = async () => {
  const loadingProducts = document.getElementById('loadingProducts');

  try {
    const productsRef = collection(db, "products");
    const q = query(productsRef);
    const querySnapshot = await getDocs(q);

    const productsArray = [];
    querySnapshot.forEach((doc) => {
      productsArray.push({ id: doc.id, ...doc.data() });
    });

    // Приховуємо індикатор завантаження
    if (loadingProducts) loadingProducts.style.display = 'none'; 
    
    if (productsArray.length === 0) {
      productList.innerHTML = '<p>Товари для презентації відсутні. Додайте їх у колекцію "products" у Firestore.</p>';
    } else {
      renderProducts(productsArray);
    }
  } catch (error) {
    console.error("Помилка завантаження товарів:", error);
    if (loadingProducts) loadingProducts.textContent = 'Помилка завантаження. Перевірте правила доступу Firestore.';
  }
};

// Запуск завантаження товарів при завантаженні головної сторінки
if (productList) {
  loadProducts();
}


// === 5. ЛОГІКА МОДАЛЬНОГО ВІКНА ===

if (modal) {
  // Закриття по кнопці X
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('show'));
  }
  
  // Закриття по кліку поза вікном
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('show');
  });
}