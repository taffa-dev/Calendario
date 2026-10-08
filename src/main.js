import { createApp } from 'vue';
import App from './App.vue';
import './font.css';
import './tema.css';

// Il foglio compare solo a font pronti (al massimo 1,5s di attesa): niente lampo col font di ripiego.
// Lo sfondo sta già su html/body, quindi l'attesa non si vede.
const fontPronti = Promise.all(['400', '700', '800'].map((peso) => document.fonts.load(`${peso} 100px "Abhaya Libre"`))).catch(() => {});
Promise.race([fontPronti, new Promise((ok) => setTimeout(ok, 1500))]).then(() => createApp(App).mount('#app'));

// Non più app installabile: si disattiva il service worker rimasto a chi l'aveva installata
navigator.serviceWorker?.getRegistrations().then((registrazioni) => registrazioni.forEach((r) => r.unregister()));
