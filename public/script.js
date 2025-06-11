
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ljmqmcxgnblqdlphpxti.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Variables globales
let modoAdmin = false;
let calendario = null;

// Constantes para nombres de clases y elementos
const ELEMENT_IDS = {
  listaPartidos: 'lista-partidos',
  toggleTema: 'toggleTema',
  usuarioNombre: 'usuario-nombre',
  userMenu: 'user-menu',
  registroPartidoJugado: 'registro-partido-jugado',
  jugadoresPartido: 'jugadores-partido',
};

// Esperar a que el contenido del DOM esté completamente cargado antes de ejecutar el script
document.addEventListener('DOMContentLoaded', () => {
  obtenerPartidos();
  document.getElementById(ELEMENT_IDS.toggleTema).addEventListener('click', toggleTema);
});

// Función para obtener y mostrar los partidos
async function obtenerPartidos() {
  try {
    const res = await fetch('/api/partidos');
    const partidos = await res.json();
    const contenedor = document.getElementById(ELEMENT_IDS.listaPartidos);
    contenedor.innerHTML = '';

    for (const partido of partidos) {
      const jugadores = await fetch(`/api/partidos/${partido.id}/jugadores`).then(r => r.json());
      const div = crearElementoPartido(partido, jugadores);
      contenedor.appendChild(div);
    }
  } catch (error) {
    console.error("Error obteniendo partidos:", error);
  }
}

// Función auxiliar para crear un elemento de partido
function crearElementoPartido(partido, jugadores) {
  const div = document.createElement('div');
  div.className = 'partido';

  let jugadoresHTML = jugadores.map(j => `
    <li>- ${j}
      ${modoAdmin ? `<button onclick="desapuntarJugador(${partido.id}, '${j}')">❌</button>` : ''}
    </li>`).join('');

  div.innerHTML = `
    <h3>📍 ${partido.campo} - ${partido.fecha} ${partido.hora}</h3>
    <input type="text" id="jugador-${partido.id}" placeholder="Tu nombre">
    <button onclick="apuntarJugador(${partido.id})">Apuntarse</button>
    ${modoAdmin ? `<button onclick="eliminarPartido(${partido.id})" style="float:right;color:red;">Eliminar partido 🗑️</button>` : ''}
    ${modoAdmin ? `<button onclick="mostrarRegistroPartido(${partido.id})" style="float:right;color:#58f258;">Partido Jugado ✅</button>` : ''}
    <div class="jugadores">
      <strong>Jugadores apuntados:</strong>
      <ul id="lista-jugadores-${partido.id}">
        ${jugadoresHTML}
      </ul>
    </div>
  `;

  return div;
}

// Función para crear un nuevo partido
async function crearPartido() {
  const campo = document.getElementById('campo').value;
  const fecha = document.getElementById('fecha').value;
  const hora = document.getElementById('hora').value;

  if (!campo || !fecha || !hora) {
    alert("Rellena todos los campos");
    return;
  }

  await fetch('/api/partidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campo, fecha, hora })
  });

  await obtenerPartidos();
}

// Función para apuntar un jugador a un partido
async function apuntarJugador(partidoId) {
  const usuario = JSON.parse(localStorage.getItem('usuario'));

  if (!usuario) {
    alert("Debes iniciar sesión para apuntarte a un partido.");
    window.location.href = 'login.html';
    return;
  }

  const input = document.getElementById(`jugador-${partidoId}`);
  const nombre = input.value.trim();

  if (!nombre) return alert("Pon tu nombre");

  await fetch(`/api/partidos/${partidoId}/jugadores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre })
  });

  await obtenerPartidos();
}

// Función para desapuntar un jugador de un partido
async function desapuntarJugador(partidoId, nombre) {
  await fetch(`/api/partidos/${partidoId}/desapuntar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre })
  });

  await obtenerPartidos();
}

// Función para eliminar un partido
async function eliminarPartido(partidoId) {
  if (confirm("¿Seguro que quieres eliminar este partido?")) {
    await fetch(`/api/partidos/${partidoId}`, {
      method: 'DELETE'
    });

    await obtenerPartidos();
  }
}

// Función para activar el modo administrador
function activarModoAdmin() {
  const pass = prompt("Introduce la contraseña de admin:");

  if (pass === "gisela") {
    modoAdmin = true;
    obtenerPartidos();
    alert("Modo admin activado.");
  } else {
    alert("Contraseña incorrecta.");
  }
}

// Función para mostrar diferentes vistas
function mostrarVista(vista) {
  document.getElementById("vista-partidos").style.display = vista === "partidos" ? "block" : "none";
  document.getElementById("vista-calendario").style.display = vista === "calendario" ? "block" : "none";
  document.getElementById("vista-estadisticas").style.display = vista === "estadisticas" ? "block" : "none";

  if (vista === "calendario") {
    mostrarCalendario();
  } else if (vista === "estadisticas") {
    cargarEstadisticas();
  }
}

// Función para mostrar el calendario de partidos
function mostrarCalendario() {
  fetch('/api/partidos')
    .then(res => res.json())
    .then(partidos => {
      const eventos = partidos.map(p => ({
        title: `🏀 ${p.campo}`,
        start: p.fecha,
        extendedProps: { id: p.id }
      }));

      if (calendario) {
        calendario.destroy();
      }

      calendario = new FullCalendar.Calendar(document.getElementById('calendario'), {
        initialView: 'dayGridMonth',
        locale: 'es',
        height: 'auto',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,listWeek'
        },
        events: eventos,
        eventClick: function(info) {
          alert(`Partido ID: ${info.event.extendedProps.id}`);
        }
      });

      calendario.render();
    })
    .catch(error => {
      console.error("Error cargando los partidos:", error);
    });
}

// Función para cambiar el tema de la aplicación
function toggleTema() {
  document.body.classList.toggle('dark-mode');
  const modoActual = document.body.classList.contains('dark-mode') ? 'oscuro' : 'claro';
  localStorage.setItem('tema', modoActual);
  document.getElementById(ELEMENT_IDS.toggleTema).textContent = modoActual === 'oscuro' ? '☀️ Cambiar a claro' : '🌙 Cambiar a oscuro';
}

// Cargar el tema guardado al iniciar la página
const isDark = localStorage.getItem('tema') === 'oscuro';
if (isDark) {
  document.body.classList.add('dark-mode');
  document.getElementById(ELEMENT_IDS.toggleTema).textContent = '☀️ Cambiar a claro';
}

// Mostrar el nombre del usuario si está autenticado
const usuario = JSON.parse(localStorage.getItem('usuario'));
if (usuario) {
  document.getElementById(ELEMENT_IDS.usuarioNombre).textContent = `Bienvenido, ${usuario.nombre}`;
}

// Función para mostrar/ocultar el menú de usuario
function toggleMenu() {
  const menu = document.getElementById(ELEMENT_IDS.userMenu);
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

// Función para cerrar la sesión del usuario
function cerrarSesion() {
  localStorage.removeItem('usuario');
  window.location.href = 'login.html';
}

// Cerrar el menú si se hace clic fuera de él
document.addEventListener('click', function(event) {
  const userInfo = document.querySelector('.user-info');
  const userMenu = document.getElementById(ELEMENT_IDS.userMenu);

  if (!userInfo.contains(event.target)) {
    userMenu.style.display = 'none';
  }
});

// Función para mostrar el formulario de registro de partido jugado
function mostrarRegistroPartido(partidoId) {
  document.getElementById(ELEMENT_IDS.registroPartidoJugado).style.display = 'block';
  const jugadoresContainer = document.getElementById(ELEMENT_IDS.jugadoresPartido);
  jugadoresContainer.innerHTML = '';

  fetch(`/api/partidos/${partidoId}/jugadores`)
    .then(res => res.json())
    .then(jugadores => {
      jugadores.forEach(jugador => {
        const jugadorDiv = crearElementoJugadorEstadisticas(jugador);
        jugadoresContainer.appendChild(jugadorDiv);
      });
    })
    .catch(error => {
      console.error("Error obteniendo jugadores:", error);
    });
}

// Función auxiliar para crear un elemento de jugador con estadísticas
function crearElementoJugadorEstadisticas(jugador) {
  const jugadorDiv = document.createElement('div');
  jugadorDiv.className = 'jugador-estadisticas';
  jugadorDiv.innerHTML = `
    <h3>${jugador}</h3>
    <label>Puntos: <input type="number" id="puntos-${jugador}" value="0"></label>
    <label>Rebotes: <input type="number" id="rebotes-${jugador}" value="0"></label>
    <label>Asistencias: <input type="number" id="asistencias-${jugador}" value="0"></label>
  `;
  return jugadorDiv;
}

// Función para guardar las estadísticas de los jugadores
function guardarEstadisticas() {
  const jugadores = document.querySelectorAll('.jugador-estadisticas');
  const estadisticas = [];

  jugadores.forEach(jugadorDiv => {
    const nombre = jugadorDiv.querySelector('h3').textContent;
    const puntos = jugadorDiv.querySelector(`#puntos-${nombre}`).value;
    const rebotes = jugadorDiv.querySelector(`#rebotes-${nombre}`).value;
    const asistencias = jugadorDiv.querySelector(`#asistencias-${nombre}`).value;

    estadisticas.push({ nombre, puntos, rebotes, asistencias });
  });

  fetch('/api/estadisticas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(estadisticas)
  })
  .then(res => res.json())
  .then(data => {
    alert("Estadísticas guardadas correctamente.");
    document.getElementById(ELEMENT_IDS.registroPartidoJugado).style.display = 'none';
  })
  .catch(error => {
    console.error("Error guardando estadísticas:", error);
  });
}
// Función para cargar y mostrar las estadísticas
async function cargarEstadisticas() {
  try {
    // Obtener las estadísticas desde el servidor
    const res = await fetch('/api/estadisticas');
    const estadisticas = await res.json();
    console.log("Estadísticas obtenidas:", estadisticas); // Verificar los datos recibidos

    // Ordenar las estadísticas por puntos, rebotes, asistencias y partidos jugados
    const maxAnnotadores = estadisticas.sort((a, b) => b.puntos - a.puntos).slice(0, 5);
    const maxAsistentes = estadisticas.sort((a, b) => b.asistencias - a.asistencias).slice(0, 5);
    const maxReboteadores = estadisticas.sort((a, b) => b.rebotes - a.rebotes).slice(0, 5);
    const masPartidos = estadisticas.sort((a, b) => b.partidos_jugados - a.partidos_jugados).slice(0, 5);

    // Función para llenar la tabla con los datos
    function llenarTabla(id, datos, propiedad) {
      const tbody = document.getElementById(id);
      tbody.innerHTML = '';
      datos.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${item.jugador}</td>
          <td>${item[propiedad]}</td>
        `;
        tbody.appendChild(row);
      });
    }

    llenarTabla('max-annotadores', maxAnnotadores, 'puntos');
    llenarTabla('max-asistentes', maxAsistentes, 'asistencias');
    llenarTabla('max-reboteadores', maxReboteadores, 'rebotes');
    llenarTabla('mas-partidos', masPartidos, 'partidos_jugados');
  } catch (error) {
    console.error("Error cargando estadísticas:", error);
  }
}
