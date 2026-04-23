<script setup lang="ts">
const { setName } = useLocalName()
const input = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

onMounted(() => nextTick(() => inputEl.value?.focus()))

function submit() {
  if (!input.value.trim()) return
  setName(input.value)
}
</script>

<template>
  <div class="overlay">
    <div class="card">
      <div class="icon">🧳</div>
      <h1>Welcome to BringO!</h1>
      <p>Before you dive in, what should we call you?<br>Your friends will see this name on the list.</p>
      <form @submit.prevent="submit">
        <input
          ref="inputEl"
          v-model="input"
          placeholder="Your name"
          maxlength="40"
          autocomplete="off"
        />
        <button type="submit" :disabled="!input.trim()">Let's go →</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(245, 243, 239, 0.92);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
}

.card {
  background: #fff;
  border-radius: 20px;
  padding: 2.5rem 2rem;
  max-width: 400px; width: 100%;
  box-shadow: 0 8px 40px rgba(0,0,0,0.12);
  text-align: center;
}

.icon { font-size: 3rem; margin-bottom: 0.75rem; }
h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 0.6rem; }
p { color: #666; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.75rem; }

form { display: flex; flex-direction: column; gap: 0.75rem; }

input {
  border: 1.5px solid #e0e0e0; border-radius: 10px;
  padding: 0.8rem 1rem; font-size: 1.05rem; outline: none;
  text-align: center; transition: border-color 0.15s;
}
input:focus { border-color: #4f7efa; }

button {
  background: #4f7efa; color: #fff;
  border: none; border-radius: 10px;
  padding: 0.8rem 1rem; font-size: 1rem; font-weight: 700;
  cursor: pointer; transition: background 0.15s;
}
button:disabled { background: #a0b4f8; cursor: not-allowed; }
button:not(:disabled):hover { background: #3a6af0; }
</style>
