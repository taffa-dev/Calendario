<script setup>
import { aphorisms } from './aphorisms';
import { frasi_celebri } from './frasi_celebri';
import { kanye } from './kanye';

// function splitQuote(str) {
//   const start = str.indexOf("«") + 1;
//   const end = str.indexOf("»");
//   const message = str.slice(start, end).trim();
//   const authorStart = str.lastIndexOf(" ") + 1;
//   const author = str.slice(authorStart).trim();
//   return { message, author };
// }

// const random = Math.floor(Math.random() * aphorisms.length);
// const { message, author } = splitQuote(aphorisms[random])

// function getDailyRandomNumber(dataOggi) {
//   const todayStr = dataOggi.toISOString().split('T')[0];
//   let hash = 0;
//   for (let i = 0; i < todayStr.length; i++) {
//     hash = todayStr.charCodeAt(i) + ((hash << 5) - hash);
//   }
//   return Math.abs(hash);
// }

// const today = new Date;
// const random = getDailyRandomNumber(today);
// const message = kanye[random % kanye.length];
// const author = "Kanye West";

function splitFrasi(str) {
  const end = str.indexOf("|");
  const message = "«" + str.slice(0, end).trim() + "»";
  const authorStart = end + 1;
  const author = str.slice(authorStart).trim();
  return { message, author };
}

const random = Math.floor(Math.random() * frasi_celebri.length);
const { message, author } = splitFrasi(frasi_celebri[random])
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
  font-family: "Abhaya Libre", serif;
  font-style: normal;
  text-align: center;
  font-size: larger;
  padding: 1.5% 10%;
}

.author {
  font-style: italic;
  font-weight: bold;
  padding-top: 2%;
}
</style>
