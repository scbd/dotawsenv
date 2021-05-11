// rollup.config.js (building more than one bundle)
import { terser } from 'rollup-plugin-terser';
import babel from '@rollup/plugin-babel';

const globals = {
  aws: 'aws',
  dotenv    : 'dotenv'
};

const outputOptionsUmd = {
  format   : 'umd',
  sourcemap: true,
  globals,
};
const outputOptionsEsm = {
  format   : 'esm',
  sourcemap: true,
  globals,
};



export default [{
  input : './config.js',
  output: [{
      ...outputOptionsUmd,
      file: 'dist/dotawsenv.cjs',
    },
    {
      ...outputOptionsUmd,
      file: 'dist/dotawsenv.min.cjs',
      plugins: [ terser() ],
    }, 
    {
      ...outputOptionsEsm,
      file   : 'dist/dotawsenv.js'
    }, 
    {
      ...outputOptionsEsm,
      file   : 'dist/dotawsenv.min.js',
      plugins: [ terser() ],
    }
  ],
  external: [ ...Object.keys(globals) ],
  plugins : [
    babel({ babelHelpers: 'bundled' }),
  ],
}]
