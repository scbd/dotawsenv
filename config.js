import { loadConfig, loadSecretsFromAws, applySecrets } from './lib/main.js'
import { options } from './lib/options.js';
import { cliOptions } from './lib/cli-options.js';
const { forceSync } = require('node-force-sync');

(function () {

    const runOptions = Object.assign({}, options, cliOptions(process.argv));

    const parsedSecrets = loadConfig(runOptions);

    if(Object.keys(parsedSecrets||{}).length){
        
        if(runOptions.async)
        {
            return loadSecretsFromAws(parsedSecrets, runOptions)
            .then(({errors, parsed})=>{

                applySecrets({errors, parsed});
                if(errors)
                    console.error('Error fetching secret value for ', errors)
            });
        }
        else{

            const syncLoadSecretsFromAws = forceSync(loadSecretsFromAws);
            const { errors, parsed } = syncLoadSecretsFromAws(parsedSecrets, runOptions);

            applySecrets({errors, parsed});

            if(errors)
                console.error('Error fetching secret value for ', errors)
        }
    }
})()