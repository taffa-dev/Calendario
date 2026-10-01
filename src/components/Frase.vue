<script setup>
defineProps({
  frase: { type: Object, required: true } // { testo, autore }
});
</script>

<template>
  <figure class="frase">
    <blockquote>«{{ frase.testo }}»</blockquote>
    <figcaption class="autore">{{ frase.autore }}</figcaption>
  </figure>
</template>

<style scoped>
.frase {
  margin: 0;
  color: var(--color-3);
  font-family: "Abhaya Libre", serif;
  text-align: center;
  font-size: larger;
  padding: 1.5% 10%;
  transition: color var(--cambio-tema);
}

blockquote {
  margin: 0;
}

.autore {
  font-style: italic;
  font-weight: bold;
  padding-top: 2%;
}
</style>
