/**
 * Модуль аутентификации
 */

let currentUser = null;

/**
 * Инициализация формы аутентификации
 */
function initAuth() {
    setupAuthListeners();
    checkAuthStatus();
}

/**
 * Настройка обработчиков событий для формы аутентификации
 */
function setupAuthListeners() {
    const authSubmit = document.getElementById('auth-submit');
    const switchAuth = document.getElementById('switch-auth');
    const logoutBtn = document.getElementById('logout-btn');
    let isLoginMode = true;

    switchAuth.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        document.querySelector('.auth-form h2').textContent = isLoginMode ? 'Вход' : 'Регистрация';
        authSubmit.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
        switchAuth.textContent = isLoginMode ? 'Зарегистрироваться' : 'Войти';
        hideError();
    });

    authSubmit.addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            showError('Заполните все поля');
            return;
        }

        try {
            if (isLoginMode) {
                await login(username, password);
            } else {
                await register(username, password);
            }
        } catch (error) {
            showError(error.message);
        }
    });

    logoutBtn.addEventListener('click', logout);
}

/**
 * Показать сообщение об ошибке
 */
function showError(message) {
    const errorDiv = document.querySelector('.auth-form .error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

/**
 * Скрыть сообщение об ошибке
 */
function hideError() {
    const errorDiv = document.querySelector('.auth-form .error');
    errorDiv.style.display = 'none';
}

/**
 * Регистрация нового пользователя
 */
async function register(username, password) {
    const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Ошибка регистрации');
    }

    currentUser = { username };
    updateAuthUI();
    dispatchAuthSuccess();
}

/**
 * Вход пользователя
 */
async function login(username, password) {
    const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
    }

    currentUser = { username };
    updateAuthUI();
    dispatchAuthSuccess();
}

/**
 * Выход пользователя
 */
async function logout() {
    try {
        await fetch('http://localhost:3000/logout', {
            method: 'POST',
            credentials: 'include',
        });
    } catch (error) {
        console.error('Ошибка при выходе:', error);
    }

    currentUser = null;
    updateAuthUI();
    window.location.reload();
}

/**
 * Проверка статуса аутентификации при загрузке
 */
async function checkAuthStatus() {
    try {
        const token = document.cookie.split('; ').find(row => row.startsWith('token='));
        if (token) {
            // Если есть токен, пытаемся получить информацию о пользователе
            const username = decodeToken(token.split('=')[1]);
            if (username) {
                currentUser = { username };
                updateAuthUI();
                dispatchAuthSuccess();
            }
        }
    } catch (error) {
        console.error('Ошибка проверки аутентификации:', error);
    }
}

/**
 * Декодирование JWT токена
 */
function decodeToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        return payload.username;
    } catch (error) {
        return null;
    }
}

/**
 * Обновление UI в зависимости от состояния аутентификации
 */
function updateAuthUI() {
    const authContainer = document.getElementById('auth-container');
    const mapContainer = document.getElementById('map-container');
    const userInfo = document.querySelector('.user-info');
    const usernameDisplay = document.getElementById('username-display');

    if (currentUser) {
        authContainer.style.display = 'none';
        mapContainer.style.display = 'block';
        userInfo.style.display = 'block';
        usernameDisplay.textContent = currentUser.username;
    } else {
        authContainer.style.display = 'flex';
        mapContainer.style.display = 'none';
        userInfo.style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }
}

/**
 * Отправка события успешной аутентификации
 */
function dispatchAuthSuccess() {
    const event = new Event('authSuccess');
    document.dispatchEvent(event);
}

/**
 * Проверка аутентификации пользователя
 */
function isAuthenticated() {
    return currentUser !== null;
}

/**
 * Получение текущего пользователя
 */
function getCurrentUser() {
    return currentUser;
}

export { initAuth, isAuthenticated, getCurrentUser }; 