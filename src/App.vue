<script setup></script>

<template>
  <div class="date-container">
    <div class="date">
      <div class="date-numbers">
        <div class="day">
          12
        </div>
        <div class="year">
          2025
        </div>
      </div>
      <div class="month">Dicembre</div>
    </div>
  </div>
</template>

<style scoped>
.date-container {
  margin: auto;
}

.date {
  font-family: "Abhaya Libre", serif;
  font-weight: 800;
  font-style: normal;
  display: flex;
  flex-direction: column;
}

.date-numbers {
  display: flex;
  margin-bottom: -100px;
}

.day {
  font-size: 300px;
}

.month {
  font-size: 78px;
}

.year {
  transform: rotate(90deg);
  font-size: 96px;
  margin-left: -190px;
}
</style>
