import { parse } from 'dotenv';
import path      from 'path';
import fs        from 'fs';

export async function loadSecretsFromAws(parsedSecrets, options){
    
    const AWSDefault = await import('aws-sdk');    
    const AWS = AWSDefault.default

    const getAwsSecret = async (secretName, options) =>{

        if(!secretName)
            throw new Error('AWS secret name is missing');  
    
        try{
            options = options || {};
            const client = new AWS.SecretsManager(options);

            const data = await client.getSecretValue({SecretId: secretName,}).promise();
            
            // Decrypts secret using the associated KMS CMK.
            // Depending on whether the secret is a string or binary, one of these fields will be populated.
            if ('SecretString' in data) {
                return data.SecretString;
            } 
            else if ('SecretBinary' in data) {
                let buff = new Buffer(data.SecretBinary, 'base64');
                return buff.toString('ascii');
            }

            throw new Error('No secret found')
        }
        catch(err){
            if (err.code === 'DecryptionFailureException')
                // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
                // Deal with the exception here, and/or rethrow at your discretion.
                throw err;
            else if (err.code === 'InternalServiceErrorException')
                // An error occurred on the server side.
                // Deal with the exception here, and/or rethrow at your discretion.
                throw err;
            else if (err.code === 'InvalidParameterException')
                // You provided an invalid value for a parameter.
                // Deal with the exception here, and/or rethrow at your discretion.
                throw err;
            else if (err.code === 'InvalidRequestException')
                // You provided a parameter value that is not valid for the current state of the resource.
                // Deal with the exception here, and/or rethrow at your discretion.
                throw err;
            else if (err.code === 'ResourceNotFoundException')
                // We can't find the resource that you asked for.
                // Deal with the exception here, and/or rethrow at your discretion.
                throw err;
            else
                throw err;
        };
    }

    options = options || {};
    const {accessKeyId, secretAccessKey, region} = options;
    let debug = false
    
    if (options) {
        if (options.debug != null) {
            debug = true
        }
    }

    const secretKeys = Object.keys(parsedSecrets)
    const errors = {};
    const parsed = {};

    for (let i = 0; i < secretKeys.length; i++) {
        const key = secretKeys[i];
        const secretName = parsedSecrets[key];
        try{
            const secretValue = await getAwsSecret(secretName, { accessKeyId, secretAccessKey, region });
            parsed[key]       = secretValue;
        }
        catch(e){
            console.debug(e);
            errors[key] = e;
        }
    }

    return {
        parsed, errors
    };

}

export const loadConfig = (options)=>{

    options = options || {};

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
    try{
        const parsed = parse(fs.readFileSync(dotenvPath, { encoding }), { debug })

        for (const key in parsed) {
            if (Object.hasOwnProperty.call(parsed, key) && process.env[key]) {
                delete parsed[key];
            }
        }

        return parsed;
    }
    catch(e){
        console.debug(e)
        //if error just return empty object
        return {};
    }
}

export const applySecrets=({parsed, errors})=>{
    for (const key in parsed) {
        if (Object.hasOwnProperty.call(parsed, key) && !(errors||{})[key]) {
            process.env[key] = parsed[key];
        }
    }
}