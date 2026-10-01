import { createApp } from 'vue';
import App from './App.vue';
import './font.css';
import './tema.css';

createApp(App).mount('#app');

// Non più app installabile: si disattiva il service worker rimasto a chi l'aveva installata
navigator.serviceWorker?.getRegistrations().then((registrazioni) => registrazioni.forEach((r) => r.unregister()));
