const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  server: 'DESKTOP-RF71AEO',
  database: 'MapDataDB',
  user: 'sa',
  password: 'SecurePass123!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  port: 1433,
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('Подключено к SQL Server');
    return pool;
  })
  .catch(err => {
    console.error('Ошибка подключения к SQL Server:', err);
    process.exit(1);
  });

// Сохранение GeoJSON
app.post('/save', async (req, res) => {
  const { fileName, geojsonData } = req.body;
  if (!fileName || !geojsonData) {
    return res.status(400).json({ error: 'Имя файла и данные обязательны' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('FileName', sql.NVarChar, fileName)
      .input('GeoJsonData', sql.NVarChar, JSON.stringify(geojsonData))
      .query(`
        MERGE INTO MapObjects AS target
        USING (SELECT @FileName AS FileName, @GeoJsonData AS GeoJsonData) AS source
        ON target.FileName = source.FileName
        WHEN MATCHED THEN
          UPDATE SET GeoJsonData = source.GeoJsonData, UpdatedAt = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (FileName, GeoJsonData) VALUES (source.FileName, source.GeoJsonData);
      `);
    res.json({ message: 'Сохранено успешно' });
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Загрузка GeoJSON
app.get('/load/:fileName', async (req, res) => {
  const { fileName } = req.params;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('FileName', sql.NVarChar, fileName)
      .query('SELECT GeoJsonData FROM MapObjects WHERE FileName = @FileName');
    
    if (result.recordset.length > 0) {
      res.json(JSON.parse(result.recordset[0].GeoJsonData));
    } else {
      res.status(404).json({ error: 'Файл не найден' });
    }
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Список файлов
app.get('/files', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT FileName FROM MapObjects ORDER BY CreatedAt DESC');
    res.json(result.recordset.map(row => row.FileName));
  } catch (error) {
    console.error('Ошибка получения списка файлов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.listen(3000, () => {
  console.log('Сервер запущен на http://localhost:3000');
});