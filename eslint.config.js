import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(js.configs.recommended,...tseslint.configs.recommended,{files:['Mydei/src/**/*.ts'],languageOptions:{globals:{document:'readonly',window:'readonly',HTMLElement:'readonly',HTMLButtonElement:'readonly',HTMLImageElement:'readonly',HTMLDialogElement:'readonly',HTMLOListElement:'readonly',Element:'readonly'}}},{files:['services/**/*.mjs','tests/**/*.mjs','scripts/**/*.mjs'],languageOptions:{globals:{process:'readonly',Buffer:'readonly',console:'readonly',setTimeout:'readonly',clearTimeout:'readonly',setInterval:'readonly',clearInterval:'readonly',URL:'readonly',fetch:'readonly'}}});
