const NAME_KEY = 'bringo_name'

export function useLocalName() {
  const name = useState<string>('bringo_name', () => '')

  if (import.meta.client) {
    name.value = localStorage.getItem(NAME_KEY) ?? ''
  }

  function setName(n: string) {
    const trimmed = n.trim()
    name.value = trimmed
    if (import.meta.client) {
      localStorage.setItem(NAME_KEY, trimmed)
    }
  }

  return { name: readonly(name), setName }
}
