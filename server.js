const express = require('express');
const pool = require('./db'); // Importamos la conexión a MySQL
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 📂 Ruta de prueba para verificar que el servidor funciona
app.get('/', (req, res) => {
  res.send('✅ API is running...');
});

// 📂 Obtener todas las categorías
app.get('/api/categories', async (req, res) => {  // 🔹 AGREGAMOS "/api" PARA QUE SEA CONSISTENTE
  try {
    const [rows] = await pool.query("SELECT * FROM categories");
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 📂 Obtener subcategorías por ID de categoría
app.get('/api/subcategories/:category_id', async (req, res) => { // 🔹 AGREGAMOS "/api"
  try {
    const { category_id } = req.params;
    const [rows] = await pool.query("SELECT * FROM subcategories WHERE category_id = ?", [category_id]);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 📂 Obtener versículos por ID de subcategoría
app.get('/api/verses/:subcategory_id', async (req, res) => { // 🔹 AGREGAMOS "/api"
  try {
    const { subcategory_id } = req.params;
    const [rows] = await pool.query("SELECT * FROM verses WHERE subcategory_id = ?", [subcategory_id]);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 📂 Obtener un versículo aleatorio
app.get('/api/verse/random', async (req, res) => { // 🔹 AGREGAMOS "/api"
  try {
    const [rows] = await pool.query("SELECT * FROM verses ORDER BY RAND() LIMIT 1");
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 🔹 🔥 NO EJECUTAMOS `app.listen()` en Vercel
module.exports = app;
