import { config } from './lib/main.js'
import { options } from './lib/options.js';
import { cliOptions } from './lib/cli-options.js';

(function () {
   config(Object.assign({}, 
        options, 
        cliOptions(process.argv)
    ))
})()