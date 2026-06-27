import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettierConfig from 'eslint-config-prettier'
import pluginPrettier from 'eslint-plugin-prettier'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue', '**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        fetch: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        HTMLCanvasElement: 'readonly',
        screen: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        URL: 'readonly',
        DOMParser: 'readonly',
        performance: 'readonly',
        MutationObserver: 'readonly',
        matchMedia: 'readonly',
        getComputedStyle: 'readonly',
        prompt: 'readonly',
        XLSX: 'readonly',
        location: 'readonly',
        indexedDB: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        crypto: 'readonly',
        require: 'readonly'
      }
    },
    plugins: {
      prettier: pluginPrettier
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': ['warn', {
        html: { void: 'always', normal: 'always', component: 'always' }
      }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'prefer-const': 'warn',
      'no-var': 'error',
      'prettier/prettier': ['warn', {
        semi: false,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'none',
        printWidth: 120,
        bracketSpacing: true,
        arrowParens: 'always',
        endOfLine: 'auto',
        vueIndentScriptAndStyle: false,
        htmlWhitespaceSensitivity: 'ignore'
      }]
    }
  },
  prettierConfig
]