const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const app = express();
const port = 3000;

const db = require('./models/db');

// Middleware
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('front'));

// Middleware для проверки JWT
async function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Требуется аутентификация' });

    try {
        const secret = process.env.JWT_SECRET || 'my-secret-key-please-change-me';
        const decoded = jwt.verify(token, secret);
        const user = await db.getUserByUsername(decoded.username);
        if (!user) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }
        req.user = { id: user.id, username: user.username, isAdmin: user.role === 'admin' };
        next();
    } catch (error) {
        console.error('Ошибка проверки токена:', error);
        return res.status(403).json({ error: 'Недействительный токен' });
    }
}

// Middleware для проверки прав администратора
function isAdmin(req, res, next) {
    if (!req.user.isAdmin && req.user.username !== 'admin') {
        console.log('Доступ запрещен для пользователя:', req.user.username);
        return res.status(403).json({ error: 'Требуются права администратора' });
    }
    console.log('Доступ администратора разрешен для:', req.user.username);
    next();
}

// Регистрация
app.post('/register', async (req, res) => {
    console.log('Запрос на регистрацию получен:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
        console.log('Ошибка: отсутствует имя пользователя или пароль');
        return res.status(400).json({ error: 'Требуются имя пользователя и пароль' });
    }

    try {
        console.log('Проверка существующего пользователя...');
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) {
            console.log('Пользователь уже существует:', username);
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }

        console.log('Хеширование пароля...');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Создание нового пользователя...');
        const userId = await db.createUser(username, hashedPassword);
        
        console.log('Генерация JWT токена...');
        const secret = process.env.JWT_SECRET || 'my-secret-key-please-change-me';
        const token = jwt.sign({ username }, secret, { expiresIn: '24h' });
        
        console.log('Установка cookie...');
        res.cookie('token', token, { 
            httpOnly: false,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            path: '/',
            domain: '127.0.0.1'
        });
        console.log('Отправка успешного ответа...');
        res.json({ message: 'Регистрация успешна', username });
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Вход
app.post('/login', async (req, res) => {
    console.log('Запрос на вход получен:', req.body);
    const { username, password } = req.body;

    try {
        console.log('Поиск пользователя...');
        const user = await db.getUserByUsername(username);
        if (!user) {
            console.log('Пользователь не найден:', username);
            return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
        }

        console.log('Проверка пароля...');
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('Неверный пароль для пользователя:', username);
            return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
        }

        console.log('Обновление времени последнего входа...');
        await db.updateUserLastLogin(user.id);

        console.log('Генерация JWT токена...');
        const secret = process.env.JWT_SECRET || 'my-secret-key-please-change-me';
        const token = jwt.sign({ username }, secret, { expiresIn: '24h' });
        
        console.log('Установка cookie...');
        res.cookie('token', token, { 
            httpOnly: false,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            path: '/',
            domain: '127.0.0.1'
        });
        
        console.log('Отправка успешного ответа...');
        res.json({ 
            message: 'Вход выполнен успешно', 
            username,
            isAdmin: user.role === 'admin'
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Сохранение GeoJSON
app.post('/save', authenticateToken, async (req, res) => {
    const { fileName, geojsonData } = req.body;
    const { id: userId } = req.user;

    if (!fileName || !geojsonData) {
        return res.status(400).json({ error: 'Имя файла и данные обязательны' });
    }

    try {
        await db.saveMapObject(
            userId,
            fileName,
            geojsonData.type || 'FeatureCollection',
            geojsonData.features || geojsonData,
            {}
        );
        
        res.json({ message: 'Сохранено успешно' });
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Загрузка GeoJSON
app.get('/load/:fileName', authenticateToken, async (req, res) => {
    const { fileName } = req.params;
    const { id: userId } = req.user;

    try {
        const mapObject = await db.getMapObjectByName(userId, fileName);
        if (!mapObject) {
            return res.status(404).json({ error: 'Файл не найден' });
        }

        const geojsonData = {
            type: mapObject.type,
            features: mapObject.coordinates
        };

        res.json(geojsonData);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Список файлов
app.get('/files', authenticateToken, async (req, res) => {
    const { id: userId } = req.user;
    
    try {
        const mapObjects = await db.getMapObjectsByUser(userId);
        const files = mapObjects.map(obj => obj.name);
        res.json(files);
    } catch (error) {
        console.error('Ошибка получения списка файлов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение списка всех файлов (для админа)
app.get('/admin/files', authenticateToken, isAdmin, async (req, res) => {
    console.log('Запрос списка всех файлов от администратора:', req.user.username);
    try {
        const allFiles = await db.getAllMapObjects();
        const files = allFiles.map(file => ({
            username: file.username,
            fileName: file.name,
            createdAt: file.created_at
        }));
        console.log('Список файлов успешно отправлен администратору');
        res.json(files);
    } catch (error) {
        console.error('Ошибка получения списка файлов для админа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Загрузка файла любого пользователя (для админа)
app.get('/admin/load/:username/:fileName', authenticateToken, isAdmin, async (req, res) => {
    const { username, fileName } = req.params;

    try {
        const user = await db.getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const mapObject = await db.getMapObjectByName(user.id, fileName);
        if (!mapObject) {
            return res.status(404).json({ error: 'Файл не найден' });
        }

        const geojsonData = {
            type: mapObject.type,
            features: mapObject.coordinates
        };

        res.json(geojsonData);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение информации о текущем пользователе
app.get('/user/info', authenticateToken, (req, res) => {
    res.json({
        username: req.user.username,
        isAdmin: req.user.isAdmin
    });
});

// Выход из системы
app.post('/logout', (req, res) => {
    console.log('Запрос на выход из системы получен');
    res.clearCookie('token', {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        path: '/',
        domain: '127.0.0.1'
    });
    res.json({ message: 'Выход выполнен успешно' });
    console.log('Cookie токен очищен, выход выполнен');
});

app.listen(port, async () => {
    console.log(`Сервер запущен на порту ${port}`);
    
    // Проверка подключения к базе данных
    try {
        const { runQuery } = require('./config/database');
        const result = await runQuery('SELECT 1 as test');
        console.log('Успешное подключение к базе данных SQLite!');
    } catch (error) {
        console.error('Ошибка подключения к базе данных при старте сервера:', error);
        console.error('Код ошибки:', error.code);
        if (error.originalError) {
            console.error('Оригинальная ошибка:', error.originalError);
        }
    }
});