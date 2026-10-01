import { createApp } from 'vue';
import App from './App.vue';
import './font.css';
import './tema.css';

createApp(App).mount('#app');

// App installabile e apribile senza rete (solo nella build: in sviluppo darebbe fastidio)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
}
