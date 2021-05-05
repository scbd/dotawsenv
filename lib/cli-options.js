const re = /^awsenv_config_?(region|secretName|accessKeyId|secretAccessKey|debug)=(.+)$/

export function cliOptions (args) {
  return args.reduce(function (acc, cur) {
    const matches = cur.match(re)
    if (matches) {
      acc[matches[1]] = matches[2]
    }
    return acc
  }, {})
}