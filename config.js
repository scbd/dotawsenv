import { loadConfig, loadSecretsFromAws, applySecrets } from './lib/main.js'
import { options } from './lib/options.js';
import { cliOptions } from './lib/cli-options.js';
import { forceSync } from 'node-force-sync';

(function () {

    const runOptions = Object.assign({}, options, cliOptions(process.argv));

    const parsedSecrets = loadConfig(runOptions);

    if(Object.keys(parsedSecrets||{}).length){
        if(runOptions.async)
        {
            (async ()=>{
                
                const {errors, parsed} = await loadSecretsFromAws(parsedSecrets, runOptions)
                
                applySecrets({errors, parsed});

                if(Object.keys(errors).length)
                    console.warn('Error fetching secret value for ', errors);


            })();
        }
        else{

            const syncLoadSecretsFromAws = forceSync(loadSecretsFromAws);
            const { errors, parsed } = syncLoadSecretsFromAws(parsedSecrets, runOptions);

            applySecrets({errors, parsed});

            if(Object.keys(errors).length)
                console.warn('Error fetching secret value for ', errors)
        }
    }
})()