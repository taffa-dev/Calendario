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
    </div>
</template>

<style scoped>
/* Tutto il blocco data e' dimensionato a partire da un'unica misura base:
   i figli usano em, quindi le proporzioni fra giorno, mese e anno restano
   identiche a quelle del desktop a qualsiasi larghezza di schermo.
   Base 50px => giorno 300px, mese 78px, anno 96px (valori desktop). */
.date {
    font-family: "Abhaya Libre", serif;
    font-weight: 800;
    font-style: normal;
    font-size: clamp(18px, 7vw, 50px);
    display: flex;
    flex-direction: column;
    align-items: center;
    width: fit-content;
    max-width: 100%;
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
    font-size: 6em;
    padding-right: 0.03333em;
    padding-bottom: 0.02667em;
}

.month {
    color: var(--color-2);
    font-size: 1.56em;
    display: flex;
    justify-content: center;
    white-space: nowrap;
    line-height: 0.8;
    border-bottom: 1px solid var(--color-3);
    padding: 0 0.71em;
    padding-bottom: 0.58em;
}

.year {
    color: var(--color-3);
    writing-mode: vertical-lr;
    font-size: 1.92em;
}

@media (max-width: 700px) {
    .date {
        padding-top: 0;
    }
}
</style>
