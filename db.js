const mysql = require('mysql2');
const { URL } = require('url');

// Obtén la URL de la base de datos desde las variables de entorno
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error('La variable de entorno DATABASE_URL no está definida.');
}

// Parsea la URL de la base de datos
const { hostname, port, username, password, pathname } = new URL(dbUrl);

// Configura el pool de conexiones
const pool = mysql.createPool({
  host: hostname,
  port: port,
  user: username,
  password: password,
  database: pathname.replace('/', ''), // Elimina el '/' del nombre de la base de datos
  ssl: {
    rejectUnauthorized: true, // Configura SSL si es necesario
  },
});

module.exports = pool.promise(); // Exporta el pool para usarlo en otros archivos