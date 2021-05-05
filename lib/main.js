import { getSecret } from './secret-manager.js'
import { parse } from 'dotenv';
import path from 'path';
import fs from 'fs'


export async function config(options){
    
    let dotenvPath = path.resolve(process.cwd(), '.awsenv')
    let encoding  = 'utf8'
    let debug = false
    
    if (options) {
        if (options.path != null) {
            dotenvPath = options.path
        }
        if (options.encoding != null) {
            encoding = options.encoding
        }
        if (options.debug != null) {
            debug = true
        }
    }

    try {
        options = options || {};
        const {accessKeyId, secretAccessKey, region} = options;

        var parsed = parse(fs.readFileSync(dotenvPath, { encoding }), { debug })
    
        const envVariables = Object.keys(parsed)
        for (let i = 0; i < envVariables.length; i++) {
            const key = envVariables[i];
            const value = parsed[key];
            if (!Object.prototype.hasOwnProperty.call(process.env, key)) {

                const secret = await getSecret(value, { accessKeyId, secretAccessKey, region });

                process.env[key] = secret;
                parsed[key] = secret;

            }
        };
    
        return { parsed };

      } catch (e) {
        console.error(e)
        return { error: e }
      }

}


