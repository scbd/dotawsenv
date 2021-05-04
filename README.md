
# **dotawsenv**

The project was inspired by [dotenv](https://github.com/motdotla/dotenv) and uses dotenv as dependency to load the config file. The idea is similar to dotenv and but in dotawsenv case the information is loaded from AWS secret manager. if the `.awsenv` file is found and if the environment variable declared do not have value than the lib will fetch the value from AWS Secret Manager.

The seret name is the value of the env variables in `.awsenv` file.

## Install

```bash
# with npm
npm install dotawsenv

# or with Yarn
yarn add dotawsenv
```

## Usage

As early as possible in your application, require and configure dotawsenv.

```javascript
require('dotawsenv').config()
```


Create a `.awsenv` file in the root directory of your project. Add
environment-specific variables on new lines in the form of `NAME=VALUE`.
For example:

```dosini
DB_CREDENTIALS=msSQLCredentials
```
The lib will fetch `msSQLCredentials` from AWS Secret Manager into DB_CREDENTIALS set inside `process.env` in format (string/binary) you have set in AWS Secret Manger.

```javascript
const db = require('db')
const dbCredential = JSON.parse(process.env.DB_CREDENTIALS);

db.connect({
  host: 'hostName',
  username: dbCredential.userName,
  password: dbCredential.password
})
```

### Preload

You can use the `--require` (`-r`) [command line option](https://nodejs.org/api/cli.html#cli_r_require_module) to preload dotawsenv. By doing this, you do not need to require and load dotawsenv in your application code. This is the preferred approach when using `import` instead of `require`.

```bash
$ node -r dotawsenv/config your_script.js
```

You can also chain with dotenv 

```bash
$ node -r dotenv/config -r dotawsenv/config your_script.js
```

The configuration options below are supported as command line arguments in the format `dotawsenv_config_<option>=value`

```bash
$ node -r dotawsenv/config your_script.js dotawsenv_config_path=/custom/path/to/.env dotawsenv_config_accessKeyId=ABSCHDH dotawsenv_config_secretAccessKey=DHYETHJD
```

Additionally, you can use environment variables to set configuration options. Command line arguments will precede these.

```bash
$ dotawsenv_CONFIG_<OPTION>=value node -r dotawsenv/config your_script.js
```

```bash
$ DOTAWSENV_CONFIG_ACCESS_KEY_ID=ABSCHDH DOTAWSENV_CONFIG_SECRET_ACCESS_KEY=DHYETHJD dotawsenv_CONFIG_ENCODING=latin1 node -r dotawsenv/config your_script.js dotawsenv_config_path=/custom/path/to/.awsenv
```

## Config

`config` will read your `.awsenv` file, parse the contents, assign it to
[`process.env`](https://nodejs.org/docs/latest/api/process.html#process_process_env),
and return an Object with a `parsed` key containing the loaded content or an `error` key if it failed.

```js
const result = dotawsenv.config()

if (result.error) {
  throw result.error
}

console.log(result.parsed)
```

You can additionally, pass options to `config`.

### Options

| option            | cli param                          | | description |
| ------            | -----------                        | -- | ----------- |
| path              | dotawsenv_config_path              | `optional`, default: `path.resolve(process.cwd(), '.env')` | You may specify a custom path if your file containing environment variables is located elsewhere.|
| encoding          | dotawsenv_config_encoding          | `optional`| You may specify the encoding of your file containing environment variables. |
| accessKeyId       | dotawsenv_config_accessKeyId       | `required`, default: `AWS SDK will look for .aws file` | AWS Access Key|
| secretAccessKey   | dotawsenv_config_secretAccessKey   | `required`, default: `AWS SDK will look for .aws file` | AWS Secret key |
| region            | dotawsenv_config_region            | `required`, default: `AWS SDK will look for .aws file` | AWS secret region  |
| async             | dotawsenv_config_async             | `optional`, default `false` | To run in async mode. |
| debug             | dotawsenv_config_debug             | `optional`| To turn on debugging. |