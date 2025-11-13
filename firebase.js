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
  query,
  getDoc, 
  addDoc 
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
const auth = getAuth(app);
const db = getFirestore(app);


// === 2. DOM ЕЛЕМЕНТИ ===

const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const userAvatar = document.getElementById('userAvatar'); 
const googleForms = document.querySelectorAll('.form-btn'); // Залишаємо для форм у шапці
const productList = document.querySelector('.product-list');

const adminTab = document.getElementById('adminTab'); // Кнопка "Додати товар"
const addProductForm = document.getElementById('addProductForm'); // Форма додавання

// Елементи для модального вікна
const modal = document.getElementById('modal');
const closeBtn = document.getElementById('closeBtn');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');

// === 3. ДОПОМІЖНА ЛОГІКА: АДМІН-СТАТУС ===

/**
 * Перевіряє статус адміністратора користувача у Firestore.
 */
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

/**
 * ОНОВЛЕНО: Функція, яка оновлює видимість усіх елементів, 
 * які вимагають авторизації (.auth-required).
 */
const updateVisibility = () => {
    const isUserLoggedIn = auth.currentUser !== null; 
    
    // Шукаємо всі елементи з класом auth-required (включаючи кнопки "Замовити" з карток)
    const authRequiredElements = document.querySelectorAll('.auth-required');

    authRequiredElements.forEach(btn => {
        btn.style.display = isUserLoggedIn ? "inline-block" : "none";
    });
};


// === 4. ЛОГІКА АДМІН-ПАНЕЛІ (ДОДАВАННЯ ТОВАРУ БЕЗ ФОТО) ===

if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = e.target.productName.value;
        const price = parseFloat(e.target.productPrice.value);
        const description = e.target.productDescription.value;
        
        if (!name || isNaN(price) || !description) {
            alert("Будь ласка, заповніть усі поля (ціна має бути числом).");
            return;
        }

        const user = auth.currentUser;
        if (!user || !(await checkAdminStatus(user))) {
             alert("Помилка доступу: Ви не адміністратор.");
             return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Збереження...';

        try {
            const productsCollection = collection(db, "products");
            await addDoc(productsCollection, {
                name: name,
                price: price,
                description: description,
                createdAt: new Date().toISOString()
            });

            alert("Товар успішно додано! Перенаправлення на головну сторінку.");
            window.location.href = "index.html"; 
        } catch (error) {
            console.error("Помилка додавання товару (МОЖЛИВО, ПРАВИЛА FIRESTORE):", error);
            alert("Помилка: Не вдалося додати товар. Перевірте консоль (F12)!");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Додати товар';
        }
    });
}


// === 5. АВТЕНТИФІКАЦІЯ ===

// Реєстрація користувача (Працює тільки на auth.html)
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    if (password !== confirmPassword) {
        alert("Помилка: Паролі не збігаються!");
        e.target.password.value = '';
        e.target.confirmPassword.value = '';
        return; 
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Збереження додаткових даних у Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        isAdmin: false, // Встановлюємо false для нових користувачів
        createdAt: new Date().toISOString()
      });

      alert("Реєстрація успішна! Ви будете перенаправлені.");
      window.location.href = "index.html"; 
    } catch (err) {
      console.error("Помилка реєстрації:", err.code, err.message);
      const userMessage = err.code === 'auth/email-already-in-use' ? 
        "Помилка: Цей email вже використовується." : 
        "Помилка реєстрації. Перевірте консоль для деталей.";
      alert(userMessage);
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
      console.error("Помилка входу:", err.code, err.message);
      alert("Помилка входу. Перевірте email та пароль.");
    }
  });
}

// Вихід користувача (Працює на обох сторінках)
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      alert("Ви вийшли з акаунта.");
      // Після виходу оновлюємо сторінку, щоб скинути стан
      window.location.reload();
    } catch (error) {
      console.error("Помилка виходу:", error);
      alert("Не вдалося вийти з акаунта.");
    }
  });
}

// ОНОВЛЕНО: Відстеження стану користувача (Оновлює інтерфейс на обох сторінках)
onAuthStateChanged(auth, async (user) => { 
  const authBtn = document.querySelector('.auth-btn');

    // 1. Оновлюємо видимість елементів, що вимагають авторизації (працює для кнопок у шапці)
    updateVisibility();

    // Визначаємо, чи ми знаходимося на сторінці admin.html
    const isAdminPage = window.location.pathname.includes('admin.html');
    let isAdmin = false;

  if (user) {
    // Користувач увійшов
    if (userInfo) userInfo.textContent = user.email;
    if (userInfo) userInfo.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    if (userAvatar) userAvatar.style.display = "flex"; 
    if (authBtn) authBtn.style.display = 'none'; 
    
    // --- ЛОГІКА АДМІНА: Перевірка статусу ---
    isAdmin = await checkAdminStatus(user);
    
    // 2. Керування кнопкою "Додати товар" (у навігації index.html)
    if (adminTab) {
        adminTab.style.display = isAdmin ? "inline-block" : "none";
    }

    // 3. Логіка для сторінки admin.html
    if (isAdminPage) {
        // Елементи для admin.html
        const authMessage = document.getElementById('authMessage');
        
        if (isAdmin) {
            // Показуємо форму адміну
            if (addProductForm) addProductForm.style.display = 'flex';
            if (authMessage) authMessage.style.display = 'none';
        } else {
            // Показуємо повідомлення про відмову, якщо не адмін
            if (authMessage) {
                authMessage.textContent = "Доступ заборонено. Тільки адміністратори можуть додавати товари.";
                authMessage.style.display = 'block';
            }
            if (addProductForm) addProductForm.style.display = 'none';
        }
    }
    
  } else {
    // Користувач вийшов (НЕ авторизований)
    if (userInfo) userInfo.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (userAvatar) userAvatar.style.display = "none";

    if (authBtn) {
        authBtn.style.display = 'inline-block'; 
    }
    
    // Приховуємо кнопку "Додати товар"
    if (adminTab) {
        adminTab.style.display = "none";
    }
    
    // Логіка для admin.html, коли користувач не увійшов
    if (isAdminPage) {
        const authMessage = document.getElementById('authMessage');
        
        if (authMessage) {
            authMessage.textContent = "Будь ласка, увійдіть як адміністратор для доступу.";
            authMessage.style.display = 'block';
        }
        if (addProductForm) addProductForm.style.display = 'none';
    }
  }
});


// === 6. ЛОГІКА ТОВАРІВ (Index.html) ===

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
                <a href="https://forms.gle/replace-with-your-form-id" target="_blank" class="form-btn auth-required" style="display: none;">Замовити</a>
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
 * Виправлено: Додано виклик updateVisibility() після renderProducts.
 */
const loadProducts = async () => {
  const loadingProducts = document.getElementById('loadingProducts');

  // Виходимо, якщо productList не знайдено (не index.html)
  if (!productList) return; 

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
      // КРИТИЧНО: ВИПРАВЛЕНО: Викликаємо оновлення видимості кнопок після рендерингу
      updateVisibility(); 
    }
  } catch (error) {
    console.error("Помилка завантаження товарів:", error.code, error.message);
    // Чітко вказуємо на проблему з правилами доступу
    const errorMessage = error.code === 'permission-denied' ? 
      'Помилка доступу: Перевірте Правила Безпеки Firestore для колекції "products".' :
      'Помилка завантаження. Перевірте консоль для деталей.';
      
    if (loadingProducts) loadingProducts.textContent = errorMessage;
  }
};

// Запуск завантаження товарів при завантаженні головної сторінки
if (productList) {
  loadProducts();
}


// === 7. ЛОГІКА МОДАЛЬНОГО ВІКНА ===

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