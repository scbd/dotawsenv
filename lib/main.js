import { getSecrets } from './secret-manager.js'


export async function config(options){

    if(!options.secretName)
        throw new Error('AWS secret name is missing');    
    
    try {
        options = options || {};

        const secret = await getSecrets(options);
        console.log(secret)
    
        Object.keys(secret).forEach(function (key) {
          if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
            process.env[key] = secret[key]
          }
        })
    
        return { secret };

      } catch (e) {
        console.error(e)
        return { error: e }
      }

}


