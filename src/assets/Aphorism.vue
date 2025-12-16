<script setup>
import { ref } from 'vue';
import { aphorisms } from './aphorisms';


function splitQuote(str) {
  const start = str.indexOf("«") + 1;
  const end = str.indexOf("»");
  const message = str.slice(start, end).trim();
  const authorStart = str.lastIndexOf(" ") + 1;
  const author = str.slice(authorStart).trim();
  return { message, author };
}


const random = Math.floor(Math.random() * aphorisms.length);
const { message, author } = splitQuote(aphorisms[random])


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
