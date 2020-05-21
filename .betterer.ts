import { typescriptBetterer } from '@betterer/typescript';

export default {
  'stricter compilation': typescriptBetterer('./tsconfig.json', {
    strict: true,
  }),
};
