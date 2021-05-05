const lOptions = {}

if (process.env.AWSENV_CONFIG_ACCESS_KEY_ID != null) {
    lOptions.accessKeyId = process.env.AWSENV_CONFIG_ACCESS_KEY_ID
}

if (process.env.AWSENV_CONFIG_SECRET_ACCESS_KEY != null) {
    lOptions.secretAccessKey = process.env.AWSENV_CONFIG_SECRET_ACCESS_KEY
}

if (process.env.AWSENV_CONFIG_REGION != null) {
    lOptions.region = process.env.AWSENV_CONFIG_REGION
}

if (process.env.AWSENV_CONFIG_DEBUG != null) {
    lOptions.debug = process.env.AWSENV_CONFIG_DEBUG
}

export const options = lOptions;