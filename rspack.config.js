import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  // Runtime build - ESM module for browser
  {
    name: 'runtime',
    entry: './src/rnnoise.js',
    mode: 'production',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'rnnoise.mjs',
      library: {
        type: 'module',
      },
    },
    experiments: {
      outputModule: true,
    },
    target: 'web',
    optimization: {
      minimize: true,
    },
  },
  // Processor build - ESM module for audio worklet
  {
    name: 'worklet',
    entry: './src/worklet.js',
    mode: 'production',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'rnnoise.worklet.js',
      library: {
        type: 'module',
      },
    },
    experiments: {
      outputModule: true,
    },
    target: 'webworker',
    optimization: {
      minimize: true,
    },
  },
];