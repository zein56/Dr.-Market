import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
<<<<<<< HEAD
import { applyTheme, loadSavedTheme } from './game/themes';

applyTheme(loadSavedTheme(), false);
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
