<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <h1>404</h1>
      <p>页面不存在</p>
      <button class="btn-back" @click="$router.push('/dashboard').catch(() => {})">返回首页</button>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
.not-found-content {
  text-align: center;
}
.not-found-content h1 {
  font-size: 72px;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: var(--space-2);
}
.not-found-content p {
  font-size: 18px;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: var(--space-6);
}
.btn-back {
  padding: var(--space-2) var(--space-6);
  background: var(--color-accent, #3b82f6);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.btn-back:hover {
  opacity: 0.9;
}
</style>
