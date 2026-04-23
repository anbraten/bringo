<script setup lang="ts">
const route = useRoute()
const listId = route.params.id as string

const { name: myName, setName } = useLocalName()

const DEFAULT_CATEGORIES = [
  { id: 'drinks',     label: 'Drinks',     emoji: '🥤' },
  { id: 'breakfast',  label: 'Breakfast',  emoji: '🥐' },
  { id: 'activities', label: 'Activities', emoji: '🎮' },
  { id: 'dinner',     label: 'Dinner',     emoji: '🍽️' },
  { id: 'snacks',     label: 'Snacks',     emoji: '🍿' },
  { id: 'gear',       label: 'Gear',       emoji: '🎒' },
]

type Item = { id: string; name: string; category: string; person: string | null; packed: boolean }
type CustomCategory = { id: string; label: string; emoji: string }
type ListData = { id: string; name: string; items: Item[]; categories: CustomCategory[] }

const { data: list, refresh, error } = await useFetch<ListData>(`/api/lists/${listId}`)

useHead(computed(() => ({ title: list.value ? `${list.value.name} · BringO` : 'BringO' })))

const allCategories = computed(() => [
  ...DEFAULT_CATEGORIES,
  ...(list.value?.categories ?? []),
])

function catEmoji(id: string) {
  return allCategories.value.find(c => c.id === id)?.emoji ?? '🏷️'
}
function catLabel(id: string) {
  return allCategories.value.find(c => c.id === id)?.label ?? id
}

// Name editing in header
const renamingMe = ref(false)
const renameInput = ref('')
function startRename() {
  renameInput.value = myName.value
  renamingMe.value = true
}
function saveRename() {
  if (renameInput.value.trim()) setName(renameInput.value)
  renamingMe.value = false
}

// Add item form
const newItem = reactive({ name: '', category: 'drinks' })
const adding = ref(false)
const showForm = ref(false)

// Add category
const showCatForm = ref(false)
const newCatInput = ref('')
const addingCat = ref(false)
const catInputEl = ref<HTMLInputElement | null>(null)

function openCatForm() {
  showCatForm.value = true
  nextTick(() => catInputEl.value?.focus())
}

function parseCatInput(raw: string): { label: string; emoji: string } {
  const trimmed = raw.trim()
  const m = trimmed.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u)
  if (m) return { emoji: m[0].trim(), label: trimmed.slice(m[0].length).trim() || trimmed.trim() }
  return { emoji: '🏷️', label: trimmed }
}

async function addCategory() {
  const raw = newCatInput.value.trim()
  if (!raw) return
  addingCat.value = true
  try {
    const { label, emoji } = parseCatInput(raw)
    const created = await $fetch<CustomCategory>(`/api/lists/${listId}/categories`, {
      method: 'POST',
      body: { label, emoji },
    })
    newCatInput.value = ''
    showCatForm.value = false
    await refresh()
    // Auto-select the new category in the add-item form
    newItem.category = created.id
  } finally {
    addingCat.value = false
  }
}

// Edit / delete custom category popover
type CatPopover = { id: string; label: string; emoji: string; saving: boolean }
const catPopover = ref<CatPopover | null>(null)

function openCatPopover(cat: CustomCategory) {
  catPopover.value = { ...cat, saving: false }
}
function closeCatPopover() {
  catPopover.value = null
}
async function saveCatPopover() {
  const p = catPopover.value
  if (!p || !p.label.trim()) return
  p.saving = true
  try {
    await $fetch(`/api/lists/${listId}/categories/${p.id}`, {
      method: 'PATCH',
      body: { label: p.label.trim(), emoji: p.emoji.trim() || '🏷️' },
    })
    closeCatPopover()
    await refresh()
  } finally {
    if (catPopover.value) catPopover.value.saving = false
  }
}
async function deleteCatPopover() {
  const p = catPopover.value
  if (!p) return
  p.saving = true
  try {
    await $fetch(`/api/lists/${listId}/categories/${p.id}`, { method: 'DELETE' })
    if (filterCategory.value === p.id) filterCategory.value = null
    if (newItem.category === p.id) newItem.category = 'other'
    closeCatPopover()
    await refresh()
  } finally {
    if (catPopover.value) catPopover.value.saving = false
  }
}

// Edit item
type EditState = { name: string; category: string; saving: boolean }
const editing = ref<Record<string, EditState>>({})

function startEdit(item: Item) {
  editing.value[item.id] = { name: item.name, category: item.category, saving: false }
}
function cancelEdit(item: Item) {
  delete editing.value[item.id]
}
async function saveEdit(item: Item) {
  const state = editing.value[item.id]
  if (!state?.name.trim()) return
  state.saving = true
  try {
    await $fetch(`/api/lists/${listId}/items/${item.id}`, {
      method: 'PATCH',
      body: { name: state.name.trim(), category: state.category },
    })
    delete editing.value[item.id]
    await refresh()
  } finally {
    if (editing.value[item.id]) editing.value[item.id]!.saving = false
  }
}

// Claim / unclaim
const claiming = ref<Set<string>>(new Set())
async function claim(item: Item) {
  if (claiming.value.has(item.id)) return
  claiming.value.add(item.id)
  try {
    await $fetch(`/api/lists/${listId}/items/${item.id}`, {
      method: 'PATCH',
      body: { person: myName.value },
    })
    await refresh()
  } finally {
    claiming.value.delete(item.id)
  }
}
async function unclaim(item: Item) {
  if (claiming.value.has(item.id)) return
  claiming.value.add(item.id)
  try {
    await $fetch(`/api/lists/${listId}/items/${item.id}`, {
      method: 'PATCH',
      body: { person: null },
    })
    await refresh()
  } finally {
    claiming.value.delete(item.id)
  }
}

// Filters & grouping
const filterCategory = ref<string | null>(null)
const grouped = computed(() => {
  const items = list.value?.items ?? []
  const filtered = filterCategory.value
    ? items.filter(i => i.category === filterCategory.value)
    : items
  const groups: Record<string, Item[]> = {}
  for (const cat of allCategories.value) {
    const catItems = filtered.filter(i => i.category === cat.id)
    if (catItems.length > 0) groups[cat.id] = catItems
  }
  return groups
})

const packedCount = computed(() => list.value?.items.filter(i => i.packed).length ?? 0)
const totalCount = computed(() => list.value?.items.length ?? 0)

function isMine(item: Item) {
  return !!myName.value && item.person === myName.value
}

// Add item
async function addItem() {
  if (!newItem.name.trim()) return
  adding.value = true
  try {
    await $fetch(`/api/lists/${listId}/items`, {
      method: 'POST',
      body: { name: newItem.name.trim(), category: newItem.category, person: null },
    })
    newItem.name = ''
    newItem.category = 'other'
    showForm.value = false
    await refresh()
  } finally {
    adding.value = false
  }
}

async function togglePacked(item: Item) {
  await $fetch(`/api/lists/${listId}/items/${item.id}`, {
    method: 'PATCH',
    body: { packed: !item.packed },
  })
  await refresh()
}

async function deleteItem(item: Item) {
  await $fetch(`/api/lists/${listId}/items/${item.id}`, { method: 'DELETE' })
  await refresh()
}

const copyDone = ref(false)
async function copyLink() {
  await navigator.clipboard.writeText(window.location.href)
  copyDone.value = true
  setTimeout(() => (copyDone.value = false), 2000)
}
</script>

<template>
  <main class="page">
    <NameGate v-if="!myName" />

    <div v-if="error" class="not-found">
      <p>List not found or something went wrong.</p>
      <NuxtLink to="/">← Back to home</NuxtLink>
    </div>

    <template v-else-if="list">
      <header class="top-bar">
        <div class="top-inner">
          <NuxtLink to="/" class="back">🧳 BringO</NuxtLink>
          <div class="header-right">
            <form v-if="renamingMe" class="rename-form" @submit.prevent="saveRename">
              <input
                v-model="renameInput"
                class="rename-input"
                maxlength="40"
                autofocus
                @blur="saveRename"
                @keydown.escape="renamingMe = false"
              />
            </form>
            <button v-else class="me-badge" @click="startRename" title="Change your name">
              👤 {{ myName }} <span class="rename-hint">✏️</span>
            </button>
            <button class="share-btn" @click="copyLink">
              {{ copyDone ? '✅ Copied!' : '🔗 Share' }}
            </button>
          </div>
        </div>
      </header>

      <div class="content">
        <div class="list-header">
          <h1>{{ list.name }}</h1>
          <p class="progress" v-if="totalCount > 0">
            {{ packedCount }}/{{ totalCount }} packed
            <span class="bar"><span class="fill" :style="{ width: `${(packedCount / totalCount) * 100}%` }" /></span>
          </p>
        </div>

        <!-- Category filters + add category -->
        <div class="filters">
          <button class="filter-btn" :class="{ active: filterCategory === null }" @click="filterCategory = null">All</button>

          <!-- Default categories (filter only) -->
          <button
            v-for="cat in DEFAULT_CATEGORIES" :key="cat.id"
            class="filter-btn" :class="{ active: filterCategory === cat.id }"
            @click="filterCategory = filterCategory === cat.id ? null : cat.id"
          >{{ cat.emoji }} {{ cat.label }}</button>

          <!-- Custom categories (filter + edit popover) -->
          <div
            v-for="cat in list.categories" :key="cat.id"
            class="cat-pill-wrap"
          >
            <button
              class="filter-btn custom-cat"
              :class="{ active: filterCategory === cat.id }"
              @click="filterCategory = filterCategory === cat.id ? null : cat.id"
            >{{ cat.emoji }} {{ cat.label }}</button>
            <button class="cat-edit-trigger" @click.stop="openCatPopover(cat)" title="Edit category">⋯</button>
          </div>

          <!-- Inline add category -->
          <form v-if="showCatForm" class="cat-form" @submit.prevent="addCategory" @keydown.escape="showCatForm = false">
            <input
              ref="catInputEl"
              v-model="newCatInput"
              class="cat-input"
              placeholder="🎸 Music"
              maxlength="40"
              :disabled="addingCat"
              @blur="() => { if (!newCatInput.trim()) showCatForm = false }"
            />
          </form>
          <button v-else class="filter-btn add-cat-btn" @click="openCatForm" title="Add category">+</button>
        </div>

        <!-- Category edit popover -->
        <Teleport to="body">
          <div v-if="catPopover" class="popover-backdrop" @click.self="closeCatPopover">
            <div class="popover" @keydown.escape="closeCatPopover">
              <p class="popover-title">Edit category</p>
              <div class="popover-row">
                <input
                  v-model="catPopover.emoji"
                  class="popover-emoji"
                  maxlength="4"
                  autofocus
                  placeholder="🏷️"
                />
                <input
                  v-model="catPopover.label"
                  class="popover-label"
                  maxlength="40"
                  placeholder="Category name"
                  @keydown.enter.prevent="saveCatPopover"
                />
              </div>
              <div class="popover-actions">
                <button class="popover-delete" :disabled="catPopover.saving" @click="deleteCatPopover">Delete</button>
                <div class="popover-right">
                  <button class="cancel" @click="closeCatPopover">Cancel</button>
                  <button class="popover-save" :disabled="catPopover.saving || !catPopover.label.trim()" @click="saveCatPopover">
                    {{ catPopover.saving ? 'Saving…' : 'Save' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Teleport>

        <div v-if="totalCount === 0" class="empty">
          <p>No items yet. Add the first one!</p>
        </div>

        <div v-for="(items, catId) in grouped" :key="catId" class="group">
          <h2 class="group-title">{{ catEmoji(catId) }} {{ catLabel(catId) }}</h2>
          <ul>
            <li
              v-for="item in items" :key="item.id"
              class="item"
              :class="{ packed: item.packed, editing: !!editing[item.id], mine: isMine(item) }"
            >
              <!-- Edit mode -->
              <template v-if="editing[item.id]">
                <form class="edit-form" @submit.prevent="saveEdit(item)">
                  <input v-model="editing[item.id]!.name" class="edit-input" maxlength="80" required autofocus />
                  <select v-model="editing[item.id]!.category" class="edit-select">
                    <option v-for="cat in allCategories" :key="cat.id" :value="cat.id">
                      {{ cat.emoji }} {{ cat.label }}
                    </option>
                  </select>
                  <div class="edit-actions">
                    <button type="button" class="cancel" @click="cancelEdit(item)">Cancel</button>
                    <button type="submit" :disabled="editing[item.id]!.saving || !editing[item.id]!.name.trim()">
                      {{ editing[item.id]!.saving ? 'Saving…' : 'Save' }}
                    </button>
                  </div>
                </form>
              </template>

              <!-- View mode -->
              <template v-else>
                <button class="check" @click="togglePacked(item)" :title="item.packed ? 'Mark unpacked' : 'Mark packed'">
                  {{ item.packed ? '✅' : '⬜' }}
                </button>
                <div class="item-info">
                  <span class="item-name">{{ item.name }}</span>
                  <span v-if="isMine(item)" class="person-badge mine">
                    You
                    <button class="unclaim-btn" @click="unclaim(item)" title="Unclaim">✕</button>
                  </span>
                  <span v-else-if="item.person" class="person-badge other">{{ item.person }}</span>
                  <button
                    v-else class="claim-btn"
                    :disabled="claiming.has(item.id)"
                    @click="claim(item)"
                  >I'll bring it</button>
                </div>
                <button class="edit-btn" @click="startEdit(item)" title="Edit">✏️</button>
                <button class="del" @click="deleteItem(item)" title="Remove">✕</button>
              </template>
            </li>
          </ul>
        </div>

        <!-- Add item -->
        <div class="add-section">
          <button v-if="!showForm" class="add-toggle" @click="showForm = true">+ Add item</button>
          <form v-else class="add-form" @submit.prevent="addItem">
            <input v-model="newItem.name" placeholder="What to bring?" autofocus maxlength="80" required />
            <select v-model="newItem.category">
              <option v-for="cat in allCategories" :key="cat.id" :value="cat.id">
                {{ cat.emoji }} {{ cat.label }}
              </option>
            </select>
            <div class="form-actions">
              <button type="button" class="cancel" @click="showForm = false">Cancel</button>
              <button type="submit" :disabled="adding || !newItem.name.trim()">
                {{ adding ? 'Adding…' : 'Add' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.page { min-height: 100vh; }

.not-found {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; gap: 1rem; color: #666;
}
.not-found a { color: #4f7efa; }

.top-bar {
  background: #fff; border-bottom: 1px solid #ebebeb;
  position: sticky; top: 0; z-index: 10;
}
.top-inner {
  max-width: 680px; margin: 0 auto; padding: 0.75rem 1.25rem;
  display: flex; align-items: center; justify-content: space-between;
}
.back { font-weight: 700; font-size: 1.05rem; }
.header-right { display: flex; align-items: center; gap: 0.5rem; }

.me-badge {
  background: #f5f3ef; border: 1.5px solid #e0e0e0;
  border-radius: 20px; padding: 0.35rem 0.8rem;
  font-size: 0.85rem; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 0.3rem; transition: border-color 0.15s;
}
.me-badge:hover { border-color: #4f7efa; }
.rename-hint { font-size: 0.75rem; opacity: 0.6; }

.rename-form { display: flex; }
.rename-input {
  border: 1.5px solid #4f7efa; border-radius: 8px;
  padding: 0.3rem 0.6rem; font-size: 0.88rem; outline: none; width: 130px;
}

.share-btn {
  background: #f0f4ff; color: #4f7efa;
  border: 1.5px solid #c7d7fc; border-radius: 8px;
  padding: 0.4rem 0.9rem; font-size: 0.88rem; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.share-btn:hover { background: #e0eaff; }

.content { max-width: 680px; margin: 0 auto; padding: 1.5rem 1.25rem 4rem; }

.list-header { margin-bottom: 1.25rem; }
.list-header h1 { font-size: 1.75rem; font-weight: 800; }
.progress {
  display: flex; align-items: center; gap: 0.6rem;
  color: #888; font-size: 0.9rem; margin-top: 0.4rem;
}
.bar { flex: 1; height: 6px; background: #e8e8e8; border-radius: 99px; overflow: hidden; }
.fill { display: block; height: 100%; background: #4caf82; border-radius: 99px; transition: width 0.3s; }

.filters { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1.25rem; align-items: center; }
.filter-btn {
  background: #fff; border: 1.5px solid #e0e0e0;
  border-radius: 20px; padding: 0.3rem 0.75rem;
  font-size: 0.82rem; cursor: pointer; transition: all 0.15s;
}
.filter-btn.active { background: #4f7efa; color: #fff; border-color: #4f7efa; }
.filter-btn:not(.active):hover { border-color: #4f7efa; color: #4f7efa; }
.add-cat-btn { border-style: dashed; color: #aaa; padding: 0.3rem 0.65rem; font-size: 1rem; }
.add-cat-btn:hover { border-color: #4f7efa; color: #4f7efa; }

.cat-pill-wrap { position: relative; display: flex; align-items: center; gap: 1px; }
.cat-pill-wrap .custom-cat { border-radius: 20px 0 0 20px; border-right: none; }
.cat-pill-wrap .custom-cat.active { border-right: none; }
.cat-edit-trigger {
  background: #fff; border: 1.5px solid #e0e0e0; border-left: none;
  border-radius: 0 20px 20px 0; padding: 0.3rem 0.5rem;
  font-size: 0.85rem; cursor: pointer; color: #aaa;
  transition: all 0.15s; line-height: 1;
}
.cat-edit-trigger:hover { color: #4f7efa; border-color: #4f7efa; background: #f0f4ff; }
.cat-pill-wrap:has(.active) .cat-edit-trigger { border-color: #4f7efa; background: #4f7efa; color: #fff; }
.cat-pill-wrap:has(.active) .cat-edit-trigger:hover { background: #3a6af0; }

.cat-form { display: flex; }
.cat-input {
  border: 1.5px solid #4f7efa; border-radius: 20px;
  padding: 0.3rem 0.75rem; font-size: 0.82rem; outline: none;
  width: 130px; transition: width 0.2s;
}

/* Category edit popover */
.popover-backdrop {
  position: fixed; inset: 0; z-index: 50;
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.popover {
  background: #fff; border-radius: 14px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.15);
  padding: 1.25rem; width: 100%; max-width: 320px;
  display: flex; flex-direction: column; gap: 0.85rem;
}
.popover-title { font-weight: 700; font-size: 0.95rem; }
.popover-row { display: flex; gap: 0.5rem; }
.popover-emoji {
  border: 1.5px solid #e0e0e0; border-radius: 8px;
  padding: 0.5rem; font-size: 1.1rem; outline: none;
  width: 52px; text-align: center; flex-shrink: 0;
  transition: border-color 0.15s;
}
.popover-emoji:focus { border-color: #4f7efa; }
.popover-label {
  flex: 1; border: 1.5px solid #e0e0e0; border-radius: 8px;
  padding: 0.5rem 0.75rem; font-size: 0.92rem; outline: none;
  transition: border-color 0.15s;
}
.popover-label:focus { border-color: #4f7efa; }
.popover-actions { display: flex; align-items: center; justify-content: space-between; }
.popover-right { display: flex; gap: 0.4rem; }
.popover-actions button {
  border: none; border-radius: 8px; padding: 0.45rem 0.9rem;
  font-size: 0.88rem; font-weight: 600; cursor: pointer;
}
.popover-delete { background: #fff0f0; color: #e53e3e; }
.popover-delete:hover:not(:disabled) { background: #ffe0e0; }
.popover-delete:disabled { opacity: 0.5; cursor: not-allowed; }
.popover-save { background: #4f7efa; color: #fff; }
.popover-save:hover:not(:disabled) { background: #3a6af0; }
.popover-save:disabled { background: #a0b4f8; cursor: not-allowed; }
.popover .cancel { background: #f0f0f0; color: #555; }
.popover .cancel:hover { background: #e0e0e0; }

.empty { text-align: center; color: #aaa; padding: 2.5rem 0; }

.group { margin-bottom: 1.5rem; }
.group-title { font-size: 0.95rem; font-weight: 700; color: #555; margin-bottom: 0.5rem; }

ul { list-style: none; display: flex; flex-direction: column; gap: 0.4rem; }

.item {
  display: flex; align-items: center; gap: 0.6rem;
  background: #fff; border-radius: 10px; padding: 0.65rem 0.8rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05); transition: opacity 0.2s;
}
.item.packed { opacity: 0.5; }
.item.packed .item-name { text-decoration: line-through; }
.item.editing { align-items: stretch; }
.item.mine { background: #f0f6ff; }

.check { background: none; border: none; cursor: pointer; font-size: 1.1rem; flex-shrink: 0; padding: 0; }

.item-info { flex: 1; min-width: 0; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.item-name { font-weight: 500; }

.person-badge {
  font-size: 0.78rem; border-radius: 20px; padding: 0.15rem 0.55rem;
  font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem;
}
.person-badge.mine { background: #dbeafe; color: #1d4ed8; }
.person-badge.other { background: #f0f0f0; color: #555; }

.unclaim-btn {
  background: none; border: none; cursor: pointer;
  color: #93c5fd; font-size: 0.7rem; padding: 0; line-height: 1; transition: color 0.15s;
}
.unclaim-btn:hover { color: #1d4ed8; }

.claim-btn {
  background: none; border: 1.5px dashed #c0c0c0;
  border-radius: 20px; padding: 0.15rem 0.6rem;
  font-size: 0.78rem; color: #999; cursor: pointer;
  transition: all 0.15s; white-space: nowrap;
}
.claim-btn:hover:not(:disabled) { border-color: #4f7efa; color: #4f7efa; background: #f0f4ff; }
.claim-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.edit-btn {
  background: none; border: none; cursor: pointer;
  font-size: 0.9rem; flex-shrink: 0; padding: 0.2rem;
  opacity: 0; transition: opacity 0.15s;
}
.item:hover .edit-btn { opacity: 1; }

.del {
  background: none; border: none; cursor: pointer;
  color: #ccc; font-size: 0.85rem; flex-shrink: 0; padding: 0.2rem; transition: color 0.15s;
}
.del:hover { color: #e53e3e; }

.edit-form { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
.edit-input, .edit-select {
  border: 1.5px solid #e0e0e0; border-radius: 8px;
  padding: 0.5rem 0.75rem; font-size: 0.92rem; outline: none;
  transition: border-color 0.15s; width: 100%;
}
.edit-input:focus, .edit-select:focus { border-color: #4f7efa; }
.edit-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
.edit-actions button {
  border: none; border-radius: 8px; padding: 0.45rem 0.9rem;
  font-size: 0.88rem; font-weight: 600; cursor: pointer;
}
.edit-actions button[type="submit"] { background: #4f7efa; color: #fff; }
.edit-actions button[type="submit"]:disabled { background: #a0b4f8; cursor: not-allowed; }
.edit-actions button[type="submit"]:not(:disabled):hover { background: #3a6af0; }
.edit-actions .cancel { background: #f0f0f0; color: #555; }
.edit-actions .cancel:hover { background: #e0e0e0; }

.add-section { margin-top: 1.5rem; }
.add-toggle {
  background: #fff; border: 1.5px dashed #c0c0c0;
  border-radius: 10px; padding: 0.75rem 1rem;
  width: 100%; font-size: 0.95rem; color: #888;
  cursor: pointer; transition: all 0.15s;
}
.add-toggle:hover { border-color: #4f7efa; color: #4f7efa; }

.add-form {
  background: #fff; border-radius: 12px; padding: 1rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  display: flex; flex-direction: column; gap: 0.65rem;
}
.add-form input, .add-form select {
  border: 1.5px solid #e0e0e0; border-radius: 8px;
  padding: 0.6rem 0.85rem; font-size: 0.95rem; outline: none;
  transition: border-color 0.15s; width: 100%;
}
.add-form input:focus, .add-form select:focus { border-color: #4f7efa; }
.form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
.form-actions button {
  border: none; border-radius: 8px; padding: 0.55rem 1.1rem;
  font-size: 0.9rem; font-weight: 600; cursor: pointer;
}
.form-actions button[type="submit"] { background: #4f7efa; color: #fff; }
.form-actions button[type="submit"]:disabled { background: #a0b4f8; cursor: not-allowed; }
.form-actions button[type="submit"]:not(:disabled):hover { background: #3a6af0; }
.form-actions .cancel { background: #f0f0f0; color: #555; }
.form-actions .cancel:hover { background: #e0e0e0; }

@media (max-width: 480px) {
  .edit-btn { opacity: 1; }
}
</style>
