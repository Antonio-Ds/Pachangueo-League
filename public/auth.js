document.addEventListener('DOMContentLoaded', function() {
  const registroForm = document.getElementById('registroForm');
  const loginForm = document.getElementById('loginForm');

  if (registroForm) {
    registroForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const nombre = document.getElementById('nombre').value;
      const contrasena = document.getElementById('contrasena').value;
      console.log('Enviando datos de registro:', { nombre, contrasena });

      try {
        const res = await fetch('/api/registro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, contrasena })
        });

        const data = await res.json();
        console.log('Respuesta del servidor:', data);

        if (data.success) {
          window.location.href = 'login.html';
        } else {
          alert(data.error);
        }
      } catch (error) {
        console.error('Error al registrar:', error);
        alert('Error al registrar. Por favor, inténtalo de nuevo.');
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const nombre = document.getElementById('nombre').value;
      const contrasena = document.getElementById('contrasena').value;
      console.log('Enviando datos de login:', { nombre, contrasena });

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, contrasena })
        });

        const data = await res.json();
        console.log('Respuesta del servidor:', data);

        if (data.success) {
          localStorage.setItem('usuario', JSON.stringify(data.usuario));
          window.location.href = 'index.html';
        } else {
          alert(data.error);
        }
      } catch (error) {
        console.error('Error al iniciar sesión:', error);
        alert('Error al iniciar sesión. Por favor, inténtalo de nuevo.');
      }
    });
  }
});
