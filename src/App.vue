<script setup>
import Aphorism from './assets/Aphorism.vue';
import DateBox from './assets/DateBox.vue';

const today = new Date;
</script>

<template>
  <div class="calendar">
    <DateBox class="date" :today="today"></DateBox>
    <Aphorism class="aphorism" :today="today"></Aphorism>
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
