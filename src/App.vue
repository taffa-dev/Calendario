<script setup>
import Aphorism from './assets/Aphorism.vue';
import Date from './assets/Date.vue';
</script>

<template>
  <div class="calendar">
    <Date class="date"></Date>
    <Aphorism class="aphorism"></Aphorism>
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
    background-color: rgb(255, 248, 236);
  }
</style>
