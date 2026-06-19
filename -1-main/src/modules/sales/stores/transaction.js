/**
 * 交易记录 Store
 * 管理手动录入的交易数据
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'gj_erp_manual_transactions'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    /* ignore */
  }
  return []
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    /* ignore */
  }
}

export const useTransactionStore = defineStore('transaction', () => {
  const transactions = ref(loadFromStorage())

  function addTransaction(item) {
    transactions.value.push(item)
    saveToStorage(transactions.value)
  }

  function updateTransaction(id, updates) {
    const idx = transactions.value.findIndex((t) => t.id === id)
    if (idx !== -1) {
      transactions.value[idx] = { ...transactions.value[idx], ...updates }
      saveToStorage(transactions.value)
    }
  }

  function removeTransaction(id) {
    transactions.value = transactions.value.filter((t) => t.id !== id)
    saveToStorage(transactions.value)
  }

  function setAll(data) {
    transactions.value = [...data]
    saveToStorage(transactions.value)
  }

  return {
    transactions,
    addTransaction,
    updateTransaction,
    removeTransaction,
    setAll
  }
})
