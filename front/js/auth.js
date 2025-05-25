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
    try {
        const response = await fetch('http://127.0.0.1:3000/register', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        if (!response.ok) {
            if (response.status === 400 && data.error === 'Пользователь уже существует') {
                return await login(username, password);
            }
            throw new Error(data.error || 'Ошибка регистрации');
        }

        // Verify authentication after registration
        const verifyResponse = await fetch('http://127.0.0.1:3000/files', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!verifyResponse.ok) {
            throw new Error('Ошибка аутентификации после регистрации');
        }

        currentUser = { username };
        updateAuthUI();
        dispatchAuthSuccess();
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        throw error;
    }
}

/**
 * Вход пользователя
 */
async function login(username, password) {
    try {
        const response = await fetch('http://127.0.0.1:3000/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        
        // Проверяем наличие cookie после входа
        const cookies = document.cookie;
        console.log('Cookies после входа:', cookies);

        if (!response.ok) {
            if (response.status === 401) {
                currentUser = null;
                document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            }
            throw new Error(data.error || 'Ошибка входа');
        }

        // Сразу устанавливаем currentUser
        currentUser = { username };
        updateAuthUI();
        dispatchAuthSuccess();

        // Проверяем аутентификацию после установки UI
        try {
            const verifyResponse = await fetch('http://127.0.0.1:3000/files', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!verifyResponse.ok) {
                throw new Error('Ошибка аутентификации после входа');
            }
        } catch (error) {
            console.error('Ошибка проверки аутентификации:', error);
            // Не выбрасываем ошибку, так как вход уже выполнен
        }
    } catch (error) {
        console.error('Ошибка при входе:', error);
        throw error;
    }
}

/**
 * Выход пользователя
 */
async function logout() {
    try {
        await fetch('http://127.0.0.1:3000/logout', {
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
        console.log('Проверка статуса аутентификации...');
        console.log('Текущие cookies:', document.cookie);
        
        const token = document.cookie.split('; ').find(row => row.startsWith('token='));
        console.log('Найден токен:', token);
        
        if (token) {
            const username = decodeToken(token.split('=')[1]);
            console.log('Декодированное имя пользователя:', username);
            
            if (username) {
                currentUser = { username };
                updateAuthUI();
                dispatchAuthSuccess();
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Ошибка проверки аутентификации:', error);
        return false;
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
    console.log('Обновление UI, currentUser:', currentUser);
    const authContainer = document.getElementById('auth-container');
    const mapContainer = document.getElementById('map-container');
    const userInfo = document.querySelector('.user-info');
    const usernameDisplay = document.getElementById('username-display');

    if (currentUser) {
        console.log('Показываем интерфейс для авторизованного пользователя');
        authContainer.style.display = 'none';
        mapContainer.style.display = 'block';
        userInfo.style.display = 'block';
        usernameDisplay.textContent = currentUser.username;
    } else {
        console.log('Показываем форму входа');
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