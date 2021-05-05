import AWS from 'aws-sdk';

export async function getSecret(secretName, options){

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