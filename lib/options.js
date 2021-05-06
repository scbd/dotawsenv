const lOptions = {}

if (process.env.DOTAWSENV_CONFIG_ACCESS_KEY_ID != null) {
    lOptions.accessKeyId = process.env.DOTAWSENV_CONFIG_ACCESS_KEY_ID
}

if (process.env.DOTAWSENV_CONFIG_SECRET_ACCESS_KEY != null) {
    lOptions.secretAccessKey = process.env.DOTAWSENV_CONFIG_SECRET_ACCESS_KEY
}

if (process.env.DOTAWSENV_CONFIG_REGION != null) {
    lOptions.region = process.env.DOTAWSENV_CONFIG_REGION
}

if (process.env.DOTAWSENV_CONFIG_DEBUG != null) {
    lOptions.debug = process.env.DOTAWSENV_CONFIG_DEBUG
}

if (process.env.DOTAWSENV_CONFIG_ENCODING != null) {
    options.encoding = process.env.DOTAWSENV_CONFIG_ENCODING
}

if (process.env.DOTAWSENV_CONFIG_PATH != null) {
    options.path = process.env.DOTAWSENV_CONFIG_PATH
}

export const options = lOptions;