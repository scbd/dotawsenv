
# **dotawsenv**

The project was inspired by [dotenv](https://github.com/motdotla/dotenv) and uses dotenv as dependency to load the config file. The idea is similar to dotenv and but in dotawsenv case the information is loaded from AWS secret manager. if the `.awsenv` file is found and if the environment variable declared do not have value that the lib will fetch the value from AWS Secret Manager.

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

`process.env` now has the ASW Secrets in string format you defined in your `.env` file.

```javascript
const db = require('db')
const dbCredential = process.env.DB_CREDENTIALS;

db.connect({
  host: dbCredential.DB_HOST,
  username: dbCredential.DB_USER,
  password: dbCredential.DB_PASS
})
```