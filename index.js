const path = require('path')
const exec = require('shelljs.exec')
const fs = require('fs')
const Tail = require('tail').Tail

// GITHUB
const core = require('@actions/core')

try {
  const fileOVPN = core.getInput('FILE_OVPN').trim()
    ? core.getInput('FILE_OVPN').trim()
    : './.github/vpn/config.ovpn'
  const secret = core.getInput('SECRET').trim()
    ? core.getInput('SECRET').trim()
    : process.env.SECRET_USERNAME_PASSWORD.trim()
  const tlsKey = core.getInput('TLS_KEY').trim()
    ? core.getInput('TLS_KEY').trim()
    : process.env.TLS_KEY.trim()
  const timeout = 15000;

  if (process.env.CA_CRT == null) {
    core.setFailed(`Can't get ca cert please add CA_CRT in secret`)
    process.exit(1)
  }

  if (process.env.USER_CRT == null) {
    core.setFailed(`Can't get user cert please add USER_CRT in secret`)
    process.exit(1)
  }

  if (process.env.USER_KEY == null) {
    core.setFailed(`Can't get user key please add USER_KEY in secret`)
    process.exit(1)
  }

  const finalPath = path.resolve(process.cwd(), fileOVPN)

  const createFile = (filename, data) => {
    if (exec('echo ' + data + ' |base64 -d >> ' + filename).code !== 0) {
      core.setFailed(`Can't create file ${filename}`)
      process.exit(1)
    } else {
      if (exec('sudo chmod 600 ' + filename).code !== 0) {
        core.setFailed(`Can't set permission file ${filename}`)
        process.exit(1)
      }
    }
  }

  if (secret !== '') {
    createFile('secret.txt', secret)
  }
  if (tlsKey !== '') {
    createFile('tls.key', tlsKey)
  }

  createFile('ca.crt', process.env.CA_CRT.trim())
  createFile('user.crt', process.env.USER_CRT.trim())
  createFile('user.key', process.env.USER_KEY.trim())

  fs.writeFileSync('openvpn.log', '');
  const tail = new Tail('openvpn.log');
  tail.on('line', (data) => {
    core.info(data)
    if (data.includes('Initialization Sequence Completed')) {
      tail.unwatch()
      clearTimeout(timer)
    }
  })

  const timer = setTimeout(() => {
    core.setFailed('VPN connection timeout.')
    tail.unwatch()
    process.exit(1)
  }, +timeout)

  core.info('Starting OpenVPN command');
  if (exec(`sudo openvpn --config ${finalPath} --log openvpn.log --daemon`).code !== 0) {
    core.error(fs.readFileSync('openvpn.log', 'utf8'));
    core.setFailed(`Can't setup config ${finalPath}`);
    tail.unwatch();
    process.exit(1)
  }
  core.info('OpenVPN command executed');
} catch (error) {
  core.setFailed(error.message)
  process.exit(1)
}
