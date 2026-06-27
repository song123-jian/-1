<template>
  <div ref="switcherRef" class="language-switcher">
    <button class="lang-trigger" :title="currentLabel" @click="toggleDropdown">
      <Icon name="globe" :size="16" />
      <span class="lang-label">{{ currentLabel }}</span>
    </button>
    <div v-show="isOpen" class="lang-dropdown" @click.stop>
      <button
        v-for="lang in languages"
        :key="lang.value"
        class="lang-option"
        :class="{ active: localeStore.currentLocale === lang.value }"
        @click="switchLocale(lang.value)"
      >
        <span class="lang-option-label">{{ lang.label }}</span>
        <Icon v-if="localeStore.currentLocale === lang.value" name="check" :size="14" class="lang-check" />
      </button>
    </div>
  </div>
</template>

<script>
export default { name: 'LanguageSwitcher' }
</script>
<script setup>
import { ref, computed } from 'vue'
import { useLocaleStore } from '@/stores/locale'
import { useClickOutside } from '@/composables/useClickOutside'

const localeStore = useLocaleStore()
const isOpen = ref(false)
const switcherRef = ref(null)

const languages = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en-US', label: 'English' }
]

const currentLabel = computed(() => {
  const lang = languages.find((l) => l.value === localeStore.currentLocale)
  return lang ? lang.label : '中文'
})

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function switchLocale(locale) {
  localeStore.setLocale(locale)
  isOpen.value = false
}

function handleClickOutside(event) {
  if (switcherRef.value && !switcherRef.value.contains(event.target)) {
    isOpen.value = false
  }
}

useClickOutside(handleClickOutside)
</script>

<style scoped>
.language-switcher {
  position: relative;
  display: flex;
  align-items: center;
}

.lang-trigger {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.lang-trigger:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-subtle);
}

.lang-label {
  font-size: var(--font-size-xs);
  line-height: 1;
}

.lang-dropdown {
  position: absolute;
  top: calc(100% + var(--space-1));
  right: 0;
  min-width: 120px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-sticky);
  overflow: hidden;
  padding: var(--space-1) 0;
}

.lang-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
  text-align: left;
}

.lang-option:hover {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}

.lang-option.active {
  color: var(--color-accent);
  font-weight: 600;
}

.lang-option-label {
  flex: 1;
}

.lang-check {
  color: var(--color-accent);
  flex-shrink: 0;
}

/* 手机端适配 */
@media (max-width: 768px) {
  .lang-label {
    display: none;
  }

  .lang-trigger {
    padding: var(--space-1);
    border: none;
    background: transparent;
  }
}
</style>
