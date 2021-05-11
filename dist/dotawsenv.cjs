(function (factory) {
    typeof define === 'function' && define.amd ? define(factory) :
    factory();
}((function () { 'use strict';

    async function loadSecretsFromAws(parsedSecrets, options) {
      const AWS = require('aws-sdk');

      const getAwsSecret = async (secretName, options) => {
        if (!secretName) throw new Error('AWS secret name is missing');

        try {
          options = options || {};
          const client = new AWS.SecretsManager(options);
          const data = await client.getSecretValue({
            SecretId: secretName
          }).promise(); // Decrypts secret using the associated KMS CMK.
          // Depending on whether the secret is a string or binary, one of these fields will be populated.

          if ('SecretString' in data) {
            return data.SecretString;
          } else if ('SecretBinary' in data) {
            let buff = new Buffer(data.SecretBinary, 'base64');
            return buff.toString('ascii');
          }

          throw new Error('No secret found');
        } catch (err) {
          if (err.code === 'DecryptionFailureException') // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;else if (err.code === 'InternalServiceErrorException') // An error occurred on the server side.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;else if (err.code === 'InvalidParameterException') // You provided an invalid value for a parameter.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;else if (err.code === 'InvalidRequestException') // You provided a parameter value that is not valid for the current state of the resource.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;else if (err.code === 'ResourceNotFoundException') // We can't find the resource that you asked for.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;else throw err;
        }
      };

      options = options || {};
      const {
        accessKeyId,
        secretAccessKey,
        region
      } = options;

      if (options) {
        if (options.debug != null) ;
      }

      const secretKeys = Object.keys(parsedSecrets);
      const errors = {};
      const parsed = {};

      for (let i = 0; i < secretKeys.length; i++) {
        const key = secretKeys[i];
        const secretName = parsedSecrets[key];

        try {
          const secretValue = await getAwsSecret(secretName, {
            accessKeyId,
            secretAccessKey,
            region
          });
          parsed[key] = secretValue;
        } catch (e) {
          errors[key] = e;
        }
      }

      return {
        parsed,
        errors
      };
    }
    const loadConfig = options => {
      const {
        parse
      } = require('dotenv');

      const path = require('path');

      const fs = require('fs');

      options = options || {};
      let dotenvPath = path.resolve(process.cwd(), '.awsenv');
      let encoding = 'utf8';
      let debug = false;

      if (options) {
        if (options.path != null) {
          dotenvPath = options.path;
        }

        if (options.encoding != null) {
          encoding = options.encoding;
        }

        if (options.debug != null) {
          debug = true;
        }
      }

      try {
        const parsed = parse(fs.readFileSync(dotenvPath, {
          encoding
        }), {
          debug
        });

        for (const key in parsed) {
          if (Object.hasOwnProperty.call(parsed, key) && process.env[key]) {
            delete parsed[key];
          }
        }

        return parsed;
      } catch (e) {
        console.error(e); //if error just return empty object

        return {};
      }
    };
    const applySecrets = ({
      parsed,
      errors
    }) => {
      for (const key in parsed) {
        if (Object.hasOwnProperty.call(parsed, key) && !(errors || {})[key]) {
          const val = parsed[key];
          process.env[key] = val;
        }
      }
    };

    const lOptions = {};

    if (process.env.DOTAWSENV_CONFIG_ACCESS_KEY_ID != null) {
      lOptions.accessKeyId = process.env.DOTAWSENV_CONFIG_ACCESS_KEY_ID;
    }

    if (process.env.DOTAWSENV_CONFIG_SECRET_ACCESS_KEY != null) {
      lOptions.secretAccessKey = process.env.DOTAWSENV_CONFIG_SECRET_ACCESS_KEY;
    }

    if (process.env.DOTAWSENV_CONFIG_REGION != null) {
      lOptions.region = process.env.DOTAWSENV_CONFIG_REGION;
    }

    if (process.env.DOTAWSENV_CONFIG_DEBUG != null) {
      lOptions.debug = process.env.DOTAWSENV_CONFIG_DEBUG;
    }

    if (process.env.DOTAWSENV_CONFIG_ENCODING != null) {
      options.encoding = process.env.DOTAWSENV_CONFIG_ENCODING;
    }

    if (process.env.DOTAWSENV_CONFIG_PATH != null) {
      options.path = process.env.DOTAWSENV_CONFIG_PATH;
    }

    const options = lOptions;

    const re = /dotawsenv_config_?(region|accessKeyId|secretAccessKey|encoding|path|debug|async)=(.+)$/;
    function cliOptions(args) {
      return args.reduce(function (acc, cur) {
        const matches = cur.match(re);

        if (matches) {
          acc[matches[1]] = matches[2];
        }

        return acc;
      }, {});
    }

    const {
      forceSync
    } = require('node-force-sync');

    (function () {
      const runOptions = Object.assign({}, options, cliOptions(process.argv));
      const parsedSecrets = loadConfig(runOptions);

      if (runOptions.async) {
        return loadSecretsFromAws(parsedSecrets, runOptions).then(({
          errors,
          parsed
        }) => {
          applySecrets({
            errors,
            parsed
          });
          if (errors) console.error('Error fetching secret value for ', errors);
        });
      } else {
        const syncLoadSecretsFromAws = forceSync(loadSecretsFromAws);
        const {
          errors,
          parsed
        } = syncLoadSecretsFromAws(parsedSecrets, runOptions);
        applySecrets({
          errors,
          parsed
        });
        if (errors) console.error('Error fetching secret value for ', errors);
      }
    })();

})));
//# sourceMappingURL=dotawsenv.cjs.map
