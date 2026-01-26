<script setup>
import { ref } from 'vue';
import '../theme.css';

const props = defineProps({
  today: { type: Date }
});

const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const day = ref(props.today.getDate());
const month = ref(monthNames[props.today.getMonth()]);
const year = ref(props.today.getFullYear());
</script>

<template>
    <div class="date">
        <div class="date-numbers">
            <div class="day">
                {{ day }}
            </div>
            <div class="year">
                {{ year }}
            </div>
        </div>
        <div class="month">{{ month }}</div>
        <hr class="separator"/>
    </div>
</template>

<style scoped>
.date {
    font-family: "Abhaya Libre", serif;
    font-weight: 800;
    font-style: normal;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: fit-content;
    padding-top: 20vh;
}

.date-numbers {
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 0.6;
}

.day {
    color: var(--color-1);
    font-size: 300px;
    padding-right: 10px;
    padding-bottom: 8px;
}

.month {
    color: var(--color-2);
    font-size: 78px;
    display: flex;
    justify-content: center;
    line-height: 0.8;
    border-bottom: 1px solid black;
    padding: 0 15%;
    padding-bottom: 10%;
}

.year {
    color: var(--color-3);
    writing-mode: vertical-lr;
    font-size: 96px;
}

.separator{
    color: var(--color-3)
}
</style>
