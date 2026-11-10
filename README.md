
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
## Shell wrapper (any language)

`bin/dotawsenv.sh` does the same job for any process (.NET, Node, Python, ...): it loads the secrets listed in
`.awsenv` into the environment, then `exec`s your command.

```bash
dotawsenv.sh <command> [args...]

dotawsenv.sh dotnet App.dll
dotawsenv.sh node app.js
dotawsenv.sh python -m myapp
```

It is a POSIX `sh` script (dash, busybox ash on Alpine, bash) with no dependency other than the
[AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).

### `.awsenv`

```dosini
# NAME=<secret name or full ARN>
DB_CREDENTIALS=prod/app/db
API_KEY=arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/app/api-key-AbCdEf
```

- Blank lines and `#` comments are skipped. An `export ` prefix and quotes around the secret id are allowed.
- `NAME` must match `[A-Za-z_][A-Za-z0-9_]*`.
- The whole secret value goes into `NAME`: the SecretString, or the SecretBinary decoded. JSON secrets are not
  split into keys; the app parses the JSON itself.
- A variable that is already set to a non-empty value is not loaded, so a value can be overridden locally or per
  deployment.
- Values are never logged and are set exactly as stored (spaces, quotes, `$`, newlines). They exist only in the
  environment of the command, not in the container config (`docker inspect`).

### Options

| Variable                | Default     | Description        |
| ----------------------- | ----------- | ------------------ |
| `DOTAWSENV_CONFIG_PATH` | `./.awsenv` | The `.awsenv` file |

When `./.awsenv` does not exist and `DOTAWSENV_CONFIG_PATH` is not set, the script makes no AWS call (the AWS CLI
is not even needed) and runs the command unchanged. When `DOTAWSENV_CONFIG_PATH` is set and the file is missing, it
fails with `dotawsenv: <path> not found`. `DOTAWSENV_CONFIG_PATH` is removed from the environment of the command.

### Credentials

The script uses the normal AWS credential chain, the same credentials as the app: env `AWS_*`, profile, then the
ECS task role or EC2 instance role. Give that role access to the secrets (see [AWS setup](#aws-setup)).

### Errors

The script fails fast. If a secret cannot be loaded, it prints `dotawsenv: NAME (<secret id>): <aws error>` to
stderr and exits 1 without running the command, so the orchestrator marks the task failed instead of starting the
app with missing secrets. A syntax error in `.awsenv` fails the same way, before any AWS call. Nothing is printed
on success. With no command, it prints the usage and exits 2.

### Docker

Pin a tag or commit and its checksum (`sha256sum dotawsenv.sh`):

```dockerfile
# syntax=docker/dockerfile:1
FROM debian:bookworm-slim AS awscli
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip \
 && curl -sSfL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/awscliv2.zip \
 && unzip -q /tmp/awscliv2.zip -d /tmp \
 && /tmp/aws/install --install-dir /usr/local/aws-cli --bin-dir /usr/local/bin

FROM mcr.microsoft.com/dotnet/aspnet:8.0
COPY --from=awscli /usr/local/aws-cli /usr/local/aws-cli
RUN ln -s /usr/local/aws-cli/v2/current/bin/aws /usr/local/bin/aws
ADD --checksum=sha256:<sha256> https://raw.githubusercontent.com/scbd/dotawsenv/sh-v1.0.0/bin/dotawsenv.sh /usr/local/bin/dotawsenv.sh
RUN chmod 755 /usr/local/bin/dotawsenv.sh
WORKDIR /app
COPY . .
ENTRYPOINT ["/usr/local/bin/dotawsenv.sh", "dotnet", "App.dll"]
```

Alpine:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine
RUN apk add --no-cache aws-cli
ADD --checksum=sha256:<sha256> https://raw.githubusercontent.com/scbd/dotawsenv/sh-v1.0.0/bin/dotawsenv.sh /usr/local/bin/dotawsenv.sh
RUN chmod 755 /usr/local/bin/dotawsenv.sh
WORKDIR /app
COPY . .
ENTRYPOINT ["/usr/local/bin/dotawsenv.sh", "node", "app.js"]
```

### AWS setup

- **IAM**: the loader needs `secretsmanager:GetSecretValue` on the secrets it reads, plus `kms:Decrypt` when a secret
  uses a customer-managed KMS key.
- **EC2 + Docker (Swarm, compose)**: set the IMDSv2 hop limit to 2, otherwise containers can't reach the instance
  role credentials:
  `aws ec2 modify-instance-metadata-options --instance-id <id> --http-put-response-hop-limit 2`
- **Swarm**: `.awsenv` holds only secret ids, not values, so it can be delivered as a config:
  `docker config create app-awsenv .awsenv`, mount it in the service (for example at `/run/configs/awsenv`) and set
  `DOTAWSENV_CONFIG_PATH=/run/configs/awsenv`.
