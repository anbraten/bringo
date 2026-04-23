<script setup lang="ts">
useHead({ title: 'BringO' })

const listName = ref('')
const error = ref('')
const loading = ref(false)

async function createList() {
  const name = listName.value.trim()
  if (!name) return
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<{ id: string }>('/api/lists', {
      method: 'POST',
      body: { name },
    })
    await navigateTo(`/lists/${data.id}`)
  } catch {
    error.value = 'Something went wrong. Try again.'
    loading.value = false
  }
}
</script>

<template>
  <main class="home">
    <div class="card">
      <div class="logo">🧳</div>
      <h1>BringO</h1>
      <p class="subtitle">Plan who brings what for your next trip.</p>
      <form @submit.prevent="createList">
        <input
          v-model="listName"
          type="text"
          placeholder="e.g. Denmark Weekend 🇩🇰"
          maxlength="80"
          :disabled="loading"
          autofocus
        />
        <button type="submit" :disabled="loading || !listName.trim()">
          {{ loading ? 'Creating…' : 'Create list' }}
        </button>
      </form>
      <p v-if="error" class="err">{{ error }}</p>
      <p class="hint">No account needed — just share the link with your friends.</p>
    </div>
  </main>
</template>

<style scoped>
.home {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 2.5rem 2rem;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 2px 16px rgba(0,0,0,0.07);
  text-align: center;
}

.logo { font-size: 3rem; margin-bottom: 0.5rem; }
h1 { font-size: 2rem; font-weight: 800; margin-bottom: 0.4rem; }
.subtitle { color: #666; margin-bottom: 2rem; }

form { display: flex; flex-direction: column; gap: 0.75rem; }

input {
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.15s;
}
input:focus { border-color: #4f7efa; }

button {
  background: #4f7efa;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
button:disabled { background: #a0b4f8; cursor: not-allowed; }
button:not(:disabled):hover { background: #3a6af0; }

.err { color: #e53e3e; margin-top: 0.5rem; font-size: 0.9rem; }
.hint { color: #999; font-size: 0.82rem; margin-top: 1.5rem; }
</style>
