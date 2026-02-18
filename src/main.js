import { createApp } from "vue";
import App from "./App.vue";

import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

// IMPORTA L’ICONA
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";

// AGGIUNGILA ALLA LIBRERIA
library.add(faSun);
library.add(faMoon);

const app = createApp(App);

app.component("font-awesome-icon", FontAwesomeIcon);

app.mount("#app");