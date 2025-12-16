<script setup>
import Aphorism from './assets/Aphorism.vue';
import Date from './assets/Date.vue';

</script>

<template>
  <div class="calendar">
    <Date></Date>
    <Aphorism></Aphorism>
  </div>
</template>

<style scoped>
.calendar {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>

<style>
  body {
    background-color: rgb(255, 241, 219);
  }
</style>
