const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');

const app = express();
const port = 3000;

// In-memory storage for users and map data
const users = new Map();
const mapData = new Map();

app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = ['http://localhost:5500', 'http://127.0.0.1:5500'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = 'your-secret-key'; // В продакшене использовать переменную окружения

// Middleware для проверки аутентификации
const authenticateToken = async (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
};

// Регистрация
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Требуется имя пользователя и пароль' });
  }

  if (users.has(username)) {
    return res.status(400).json({ error: 'Пользователь уже существует' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    users.set(username, {
      password: hashedPassword,
      createdAt: new Date(),
      lastLogin: null
    });

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.json({ message: 'Регистрация успешна', username });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = users.get(username);
  if (!user) {
    return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
  }

  try {
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }

    user.lastLogin = new Date();
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.json({ message: 'Вход выполнен успешно', username });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Выход
app.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Выход выполнен успешно' });
});

// Сохранение GeoJSON
app.post('/save', authenticateToken, (req, res) => {
  const { fileName, geojsonData } = req.body;
  const { username } = req.user;

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
      updatedAt: new Date()
    });
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
  try {
    const userMaps = mapData.get(username);
    const files = userMaps ? Array.from(userMaps.keys()) : [];
    res.json(files);
  } catch (error) {
    console.error('Ошибка получения списка файлов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});