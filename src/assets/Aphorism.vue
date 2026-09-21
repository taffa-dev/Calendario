<script setup>
import { frasi_celebri } from './quotes/frasi_celebri';

const props = defineProps({
  today: { type: Date }
});

function getDailyRandomNumber(dataOggi) {
  const todayStr = [dataOggi.getFullYear(), dataOggi.getMonth(), dataOggi.getDate()].join('-');
  let hash = 0;
  for (let i = 0; i < todayStr.length; i++) {
    hash = todayStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function splitFrasi(str) {
  const end = str.indexOf("|");
  const message = "«" + str.slice(0, end).trim() + "»";
  const authorStart = end + 1;
  const author = str.slice(authorStart).trim();
  return { message, author };
}

const random = getDailyRandomNumber(props.today) % frasi_celebri.length;
let frase = "";

if (props.today.getDay() === 4 && random % 2 === 0) {
  frase = "Facciamo che il giovedì pomeriggio non si lavora.|S.T.";
}
else {
  frase = frasi_celebri[random];
}

const { message, author } = splitFrasi(frase)
</script>

<template>
  <div class="aphorism-text">
    <div>{{ message }}</div>
    <div class="author">
      {{ author }}
    </div>
  </div>

</template>

<style scoped>
.aphorism-text {
  color: var(--color-3);
  font-family: "Abhaya Libre", serif;
  font-style: normal;
  text-align: center;
  font-size: clamp(1rem, 3vw, 1.2rem);
  line-height: 1.35;
  padding: 1.5% 10%;
}

.author {
  font-style: italic;
  font-weight: bold;
  padding-top: 2%;
}
</style>
