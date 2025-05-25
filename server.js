const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// File paths
const USERS_FILE = path.join(process.cwd(), 'users.json');
const MAP_DATA_FILE = path.join(process.cwd(), 'mapData.json');

console.log('Users file path:', USERS_FILE);
console.log('Map data file path:', MAP_DATA_FILE);

// Serve static files from the front directory
app.use('/front', express.static(path.join(__dirname, 'front')));

// Initialize storage
let users = new Map();
let mapData = new Map();

// Load data from files
function loadData() {
    console.log('Загрузка данных...');
    try {
        // Load users
        if (fs.existsSync(USERS_FILE)) {
            console.log('Файл пользователей найден');
            const userData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
            users = new Map(Object.entries(userData.users));
            console.log('Загружены пользователи:', Array.from(users.keys()));
        } else {
            console.log('Файл пользователей не существует, создаем новый');
            fs.writeFileSync(USERS_FILE, JSON.stringify({ users: {} }, null, 2));
        }

        // Load map data
        if (fs.existsSync(MAP_DATA_FILE)) {
            console.log('Файл карт найден');
            const data = JSON.parse(fs.readFileSync(MAP_DATA_FILE, 'utf8'));
            mapData = new Map();
            Object.entries(data).forEach(([username, files]) => {
                mapData.set(username, new Map(Object.entries(files)));
            });
            console.log('Загружены карты для пользователей:', Array.from(mapData.keys()));
        } else {
            console.log('Файл карт не существует, создаем новый');
            fs.writeFileSync(MAP_DATA_FILE, JSON.stringify({}, null, 2));
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        users = new Map();
        mapData = new Map();
    }
}

// Save data to files
function saveData() {
    console.log('Сохранение данных...');
    try {
        // Save users
        const userData = {
            users: Object.fromEntries(users)
        };
        fs.writeFileSync(USERS_FILE, JSON.stringify(userData, null, 2));

        // Save map data
        const mapDataObj = {};
        for (const [username, files] of mapData.entries()) {
            mapDataObj[username] = Object.fromEntries(files);
        }
        fs.writeFileSync(MAP_DATA_FILE, JSON.stringify(mapDataObj, null, 2));
        
        console.log('Данные успешно сохранены');
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
    }
}

// Load initial data
loadData();

app.use(cors({
  origin: 'http://127.0.0.1:5500',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = 'your-secret-key'; // В продакшене использовать переменную окружения

// Middleware для проверки аутентификации
const authenticateToken = async (req, res, next) => {
  console.log('Проверка аутентификации для:', req.path);
  console.log('Все cookies:', req.cookies);
  console.log('Headers:', req.headers);
  console.log('Origin:', req.headers.origin);
  
  const token = req.cookies.token;
  
  if (!token) {
    console.log('Токен отсутствует в cookies');
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    console.log('Проверка токена:', token);
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Токен успешно проверен:', decoded);
    
    // Проверяем, существует ли пользователь
    if (!users.has(decoded.username)) {
      console.log('Пользователь не найден:', decoded.username);
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.log('Ошибка проверки токена:', error.message);
    return res.status(403).json({ error: 'Недействительный токен' });
  }
};

// Регистрация
app.post('/register', async (req, res) => {
    console.log('Получен запрос на регистрацию:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
        console.log('Отклонено: отсутствует имя пользователя или пароль');
        return res.status(400).json({ error: 'Требуется имя пользователя и пароль' });
    }

    console.log('Проверка существующих пользователей...');
    console.log('Текущие пользователи:', Array.from(users.keys()));

    if (users.has(username)) {
        console.log('Отклонено: пользователь уже существует');
        return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    try {
        console.log('Хеширование пароля...');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log('Создание записи пользователя...');
        const userData = {
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            lastLogin: null
        };
        
        users.set(username, userData);
        console.log('Пользователь добавлен в Map');
        
        // Save to file
        saveData();
        
        console.log('Генерация токена...');
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        
        console.log('Отправка ответа...');
        res.cookie('token', token, { 
            httpOnly: false,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            path: '/',
            domain: '127.0.0.1'
        });
        res.json({ message: 'Регистрация успешна', username });
        console.log('Регистрация завершена успешно');
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
    }
});

// Вход
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Попытка входа пользователя:', username);
  console.log('Текущие пользователи:', Array.from(users.keys()));
  console.log('Входящие cookies:', req.cookies);

  const user = users.get(username);
  if (!user) {
    console.log('Отклонено: пользователь не найден');
    return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
  }

  try {
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Отклонено: неверный пароль');
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }

    console.log('Вход успешен');
    user.lastLogin = new Date().toISOString();
    saveData();

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    console.log('Сгенерирован токен:', token);
    
    const cookieOptions = { 
      httpOnly: false,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      path: '/',
      domain: '127.0.0.1'
    };
    console.log('Настройки cookie:', cookieOptions);
    
    res.cookie('token', token, cookieOptions);
    console.log('Cookie установлен');
    
    res.json({ message: 'Вход выполнен успешно', username });
    console.log('Ответ отправлен');
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Выход
app.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });
  res.json({ message: 'Выход выполнен успешно' });
});

// Сохранение GeoJSON
app.post('/save', authenticateToken, (req, res) => {
  const { fileName, geojsonData } = req.body;
  const { username } = req.user;

  console.log('Сохранение файла:', fileName, 'для пользователя:', username);

  if (!fileName || !geojsonData) {
    return res.status(400).json({ error: 'Имя файла и данные обязательны' });
  }

  try {
    if (!mapData.has(username)) {
      mapData.set(username, new Map());
    }
    const userMaps = mapData.get(username);
    userMaps.set(fileName, {
      data: geojsonData,
      updatedAt: new Date().toISOString()
    });
    
    // Save to file
    saveData();
    
    res.json({ message: 'Сохранено успешно' });
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Загрузка GeoJSON
app.get('/load/:fileName', authenticateToken, (req, res) => {
  const { fileName } = req.params;
  const { username } = req.user;

  console.log('Загрузка файла:', fileName, 'для пользователя:', username);

  try {
    const userMaps = mapData.get(username);
    if (!userMaps || !userMaps.has(fileName)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }
    res.json(userMaps.get(fileName).data);
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Список файлов
app.get('/files', authenticateToken, (req, res) => {
  const { username } = req.user;
  console.log('Запрос списка файлов для пользователя:', username);
  
  try {
    const userMaps = mapData.get(username);
    const files = userMaps ? Array.from(userMaps.keys()) : [];
    console.log('Найдены файлы:', files);
    res.json(files);
  } catch (error) {
    console.error('Ошибка получения списка файлов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});