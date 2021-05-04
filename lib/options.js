const lOptions = {}

if (process.env.AWS_ACCESS_KEY_ID != null) {
    lOptions.accessKeyId = process.env.AWS_ACCESS_KEY_ID
}

if (process.env.AWS_SECRET_ACCESS_KEY != null) {
    lOptions.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
}

if (process.env.AWS_REGION != null) {
    lOptions.region = process.env.AWS_REGION
}

if (process.env.AWS_SECRET_NAME != null) {
    lOptions.secretName = process.env.AWS_SECRET_NAME
}

if (process.env.DEBUG != null) {
    lOptions.debug = process.env.DEBUG
}

export const options = lOptions;