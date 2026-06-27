import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '../index'
import { useSessionStore } from '@/stores/session'
import { Roles } from '@/constants/roles'

describe('router auth guard', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    localStorage.clear()
    await router.replace('/role-select')
  })

  it('redirects unauthenticated users to login page', async () => {
    await router.push('/dashboard')

    expect(router.currentRoute.value.name).toBe('RoleSelect')
    expect(router.currentRoute.value.query.redirect).toBe('/dashboard')
  })

  it('redirects authenticated users away from login page', async () => {
    const sessionStore = useSessionStore()
    sessionStore.login('宋建', 'song1230.')

    await router.push('/dashboard')
    await router.push('/role-select')

    expect(router.currentRoute.value.name).toBe('Dashboard')
  })
})
