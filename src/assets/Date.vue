<script setup></script>

<template>
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
        <hr />
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
    padding-top: 5%;
}

.date-numbers {
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 0.6;
}

.day {
    color: #B54A4A;
    font-size: 300px;
    padding-right: 3%;
}

.month {
    color: #5B0000;
    font-size: 78px;
    display: flex;
    justify-content: center;
    line-height: 0.8;
    border-bottom: 1px solid black;
    padding: 0 25%;
    padding-bottom: 10%;
}

.year {
    color: #280000;
    writing-mode: vertical-lr;
    font-size: 96px;
}
</style>
