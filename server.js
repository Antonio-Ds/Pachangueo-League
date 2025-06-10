const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const saltRounds = 10; // Número de rondas para generar el "salt"


const app = express();
const PORT = 3000;

// Middleware para permitir solicitudes de diferentes orígenes y manejar JSON
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Crear base de datos SQLite
const db = new sqlite3.Database('./db.sqlite', (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite.');
  }
});

// Crear tablas si no existen
db.serialize(() => {
  // Tabla para almacenar información de los partidos
  db.run(`
    CREATE TABLE IF NOT EXISTS partidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campo TEXT,
      fecha TEXT,
      hora TEXT
    )
  `);

  // Tabla para almacenar información de los jugadores en cada partido
  db.run(`
    CREATE TABLE IF NOT EXISTS jugadores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      partido_id INTEGER,
      FOREIGN KEY (partido_id) REFERENCES partidos(id)
    )
  `);

  // Tabla para almacenar información de los usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE,
      contrasena TEXT
    )
  `, (err) => {
      if (err) {
        console.error('Error al crear la tabla usuarios:', err.message);
      } else {
        console.log('Tabla usuarios creada o ya existente.');
      }
    });

  // Tabla para almacenar estadísticas de los jugadores
  db.run(`
    CREATE TABLE IF NOT EXISTS estadisticas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jugador TEXT UNIQUE,
      puntos INTEGER DEFAULT 0,
      rebotes INTEGER DEFAULT 0,
      asistencias INTEGER DEFAULT 0,
      partidos_jugados INTEGER DEFAULT 0
    )
  `);
});

// Middleware para verificar la autenticación del usuario
function verificarAutenticacion(req, res, next) {
  const usuario = req.headers['usuario'];
  if (usuario) {
    next();
  } else {
    res.status(401).json({ error: "No autorizado" });
  }
}


// Obtener todos los partidos
app.get('/api/partidos', (req, res) => {
  db.all(`SELECT * FROM partidos`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Crear un nuevo partido
app.post('/api/partidos', (req, res) => {
  const { campo, fecha, hora } = req.body;
  if (!campo || !fecha || !hora) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }
  db.run(`INSERT INTO partidos (campo, fecha, hora) VALUES (?, ?, ?)`,
    [campo, fecha, hora],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    }
  );
});

// Obtener jugadores de un partido específico
app.get('/api/partidos/:id/jugadores', (req, res) => {
  const partidoId = req.params.id;
  db.all(`SELECT nombre FROM jugadores WHERE partido_id = ?`, [partidoId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(r => r.nombre));
  });
});

// Añadir un jugador a un partido
app.post('/api/partidos/:id/jugadores', (req, res) => {
  const partidoId = req.params.id;
  const { nombre } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }
  db.run(`INSERT INTO jugadores (nombre, partido_id) VALUES (?, ?)`,
    [nombre, partidoId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// Eliminar un partido y sus jugadores asociados
app.delete('/api/partidos/:id', (req, res) => {
  const partidoId = req.params.id;
  db.run(`DELETE FROM jugadores WHERE partido_id = ?`, [partidoId], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    db.run(`DELETE FROM partidos WHERE id = ?`, [partidoId], function (err2) {
      if (err2) {
        return res.status(500).json({ error: err2.message });
      }
      res.json({ success: true });
    });
  });
});

// Desapuntar un jugador de un partido
app.post('/api/partidos/:id/desapuntar', (req, res) => {
  const partidoId = req.params.id;
  const { nombre } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }
  db.run(`DELETE FROM jugadores WHERE partido_id = ? AND nombre = ?`, [partidoId, nombre], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// Ruta para el login de usuarios
app.post('/api/login', async (req, res) => {
  const { nombre, contrasena } = req.body;

  db.get(`SELECT * FROM usuarios WHERE nombre = ?`, [nombre], async (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: err.message });
    }

    if (row) {
      // Verificar la contraseña
      const match = await bcrypt.compare(contrasena, row.contrasena);

      if (match) {
        res.json({ success: true, usuario: row });
      } else {
        res.status(401).json({ error: "Credenciales incorrectas" });
      }
    } else {
      res.status(401).json({ error: "Credenciales incorrectas" });
    }
  });
});
// Ruta para el registro de usuarios
app.post('/api/registro', async (req, res) => {
  const { nombre, contrasena } = req.body;

  try {
    // Cifrar la contraseña
    const hash = await bcrypt.hash(contrasena, saltRounds);

    // Guardar el usuario en la base de datos con la contraseña cifrada
    db.run(`INSERT INTO usuarios (nombre, contrasena) VALUES (?, ?)`, [nombre, hash], function (err) {
      if (err) {
        console.error('Error al registrar usuario:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Usuario registrado con éxito:', { id: this.lastID, nombre });
      res.json({ success: true });
    });
  } catch (error) {
    console.error('Error al cifrar la contraseña:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});


// Ruta para guardar estadísticas de los jugadores
app.post('/api/estadisticas', (req, res) => {
  const estadisticas = req.body;

  estadisticas.forEach(estadistica => {
    const { nombre, puntos, rebotes, asistencias } = estadistica;

    // Actualizar las estadísticas en la base de datos
    db.run(`
      INSERT INTO estadisticas (jugador, puntos, rebotes, asistencias, partidos_jugados)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(jugador)
      DO UPDATE SET
        puntos = puntos + ?,
        rebotes = rebotes + ?,
        asistencias = asistencias + ?,
        partidos_jugados = partidos_jugados + 1
    `, [nombre, puntos, rebotes, asistencias, puntos, rebotes, asistencias], function(err) {
      if (err) {
        return console.error('Error al guardar estadísticas:', err.message);
      }
    });
  });

  res.json({ success: true });
});

// Ruta para obtener estadísticas de los jugadores
app.get('/api/estadisticas', (req, res) => {
  db.all(`
    SELECT jugador, puntos, rebotes, asistencias, partidos_jugados
    FROM estadisticas
    ORDER BY puntos DESC, rebotes DESC, asistencias DESC, partidos_jugados DESC
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
