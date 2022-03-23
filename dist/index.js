module.exports =
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete installedModules[moduleId];
/******/ 		}
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	__webpack_require__.ab = __dirname + "/";
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(104);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ({

/***/ 82:
/***/ (function(__unusedmodule, exports) {

"use strict";

// We use any as a valid input type
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCommandValue = void 0;
/**
 * Sanitizes an input into a string so it can be passed into issueCommand safely
 * @param input input to sanitize into a string
 */
function toCommandValue(input) {
    if (input === null || input === undefined) {
        return '';
    }
    else if (typeof input === 'string' || input instanceof String) {
        return input;
    }
    return JSON.stringify(input);
}
exports.toCommandValue = toCommandValue;
//# sourceMappingURL=utils.js.map

/***/ }),

/***/ 87:
/***/ (function(module) {

module.exports = require("os");

/***/ }),

/***/ 88:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

let events = __webpack_require__(614)
let fs = __webpack_require__(747)
let path = __webpack_require__(622)

// const environment = process.env['NODE_ENV'] || 'development'

class devNull {
    info() { };
    error() { };
};

class Tail extends events.EventEmitter {

    constructor(filename, options = {}) {
        super();
        this.filename = filename;
        this.absPath = path.dirname(this.filename);
        this.separator = (options.separator !== undefined) ? options.separator : /[\r]{0,1}\n/;// null is a valid param
        this.fsWatchOptions = options.fsWatchOptions || {};
        this.follow = options['follow'] != undefined ? options['follow'] : true;
        this.logger = options.logger || new devNull();
        this.useWatchFile = options.useWatchFile || false;
        this.flushAtEOF = options.flushAtEOF || false;
        this.encoding = options.encoding || 'utf-8';
        const fromBeginning = options.fromBeginning || false;
        this.nLines = options.nLines || undefined;

        this.logger.info(`Tail starting...`)
        this.logger.info(`filename: ${this.filename}`);
        this.logger.info(`encoding: ${this.encoding}`);

        try {
            fs.accessSync(this.filename, fs.constants.F_OK);
        } catch (err) {
            if (err.code == 'ENOENT') {
                throw err
            }
        }

        this.buffer = '';
        this.internalDispatcher = new events.EventEmitter();
        this.queue = [];
        this.isWatching = false;
        this.pos = 0;

        // this.internalDispatcher.on('next',this.readBlock);
        this.internalDispatcher.on('next', () => {
            this.readBlock();
        });

        this.logger.info(`fromBeginning: ${fromBeginning}`);
        let startingCursor;
        if (fromBeginning) {
            startingCursor = 0;
        } else if (this.nLines !== undefined) {
            const data = fs.readFileSync(this.filename, {
                flag: 'r',
                encoding: this.encoding
            });
            const tokens = data.split(this.separator);
            const dropLastToken = (tokens[tokens.length - 1] === '') ? 1 : 0;//if the file ends with empty line ignore line NL
            if (tokens.length - this.nLines - dropLastToken <= 0) {
                //nLines is bigger than avaiable tokens: tail from the begin
                startingCursor = 0;
            } else {
                const match = data.match(new RegExp(`(?:[^\r\n]*[\r]{0,1}\n){${tokens.length - this.nLines - dropLastToken}}`));
                startingCursor = (match && match.length) ? Buffer.byteLength(match[0], this.encoding) : this.latestPosition();
            }
        } else {
            startingCursor = this.latestPosition();
        }
        if (startingCursor === undefined) throw new Error("Tail can't initialize.");
        const flush = fromBeginning || (this.nLines != undefined);
        try {
            this.watch(startingCursor, flush);
        } catch (err) {
            this.logger.error(`watch for ${this.filename} failed: ${err}`);
            this.emit("error", `watch for ${this.filename} failed: ${err}`);

        }

    }

    latestPosition() {
        try {
            return fs.statSync(this.filename).size;
        } catch (err) {
            this.logger.error(`size check for ${this.filename} failed: ${err}`);
            this.emit("error", `size check for ${this.filename} failed: ${err}`);
            throw err;
        }
    }

    readBlock() {
        if (this.queue.length >= 1) {
            const block = this.queue[0];
            if (block.end > block.start) {
                let stream = fs.createReadStream(this.filename, { start: block.start, end: block.end - 1, encoding: this.encoding });
                stream.on('error', (error) => {
                    this.logger.error(`Tail error: ${error}`);
                    this.emit('error', error);
                });
                stream.on('end', () => {
                    let _ = this.queue.shift();
                    if (this.queue.length > 0) {
                        this.internalDispatcher.emit('next');
                    }
                    if (this.flushAtEOF && this.buffer.length > 0) {
                        this.emit('line', this.buffer);
                        this.buffer = "";
                    }
                });
                stream.on('data', (d) => {
                    if (this.separator === null) {
                        this.emit("line", d);
                    } else {
                        this.buffer += d;
                        let parts = this.buffer.split(this.separator);
                        this.buffer = parts.pop();
                        for (const chunk of parts) {
                            this.emit("line", chunk);
                        }
                    }
                });
            }
        }
    }

    change() {
        let p = this.latestPosition()
        if (p < this.currentCursorPos) {//scenario where text is not appended but it's actually a w+
            this.currentCursorPos = p
        } else if (p > this.currentCursorPos) {
            this.queue.push({ start: this.currentCursorPos, end: p });
            this.currentCursorPos = p
            if (this.queue.length == 1) {
                this.internalDispatcher.emit("next");
            }
        }
    }

    watch(startingCursor, flush) {
        if (this.isWatching) return;
        this.logger.info(`filesystem.watch present? ${fs.watch != undefined}`);
        this.logger.info(`useWatchFile: ${this.useWatchFile}`);

        this.isWatching = true;
        this.currentCursorPos = startingCursor;
        //force a file flush is either fromBegining or nLines flags were passed.
        if (flush) this.change();

        if (!this.useWatchFile && fs.watch) {
            this.logger.info(`watch strategy: watch`);
            this.watcher = fs.watch(this.filename, this.fsWatchOptions, (e, filename) => { this.watchEvent(e, filename); });
        } else {
            this.logger.info(`watch strategy: watchFile`);
            fs.watchFile(this.filename, this.fsWatchOptions, (curr, prev) => { this.watchFileEvent(curr, prev) });
        }
    }

    rename(filename) {
        //TODO
        //MacOS sometimes throws a rename event for no reason.
        //Different platforms might behave differently.
        //see https://nodejs.org/api/fs.html#fs_fs_watch_filename_options_listener
        //filename might not be present.
        //https://nodejs.org/api/fs.html#fs_filename_argument
        //Better solution would be check inode but it will require a timeout and
        // a sync file read.
        if (filename === undefined || filename !== this.filename) {
            this.unwatch();
            if (this.follow) {
                this.filename = path.join(this.absPath, filename);
                this.rewatchId = setTimeout((() => {
                    try {
                        this.watch(this.currentCursorPos);
                    } catch (ex) {
                        this.logger.error(`'rename' event for ${this.filename}. File not available anymore.`);
                        this.emit("error", ex);
                    }
                }), 1000);
            } else {
                this.logger.error(`'rename' event for ${this.filename}. File not available anymore.`);
                this.emit("error", `'rename' event for ${this.filename}. File not available anymore.`);
            }
        } else {
            // this.logger.info("rename event but same filename")
        }
    }

    watchEvent(e, evtFilename) {
        try {
            if (e === 'change') {
                this.change();
            } else if (e === 'rename') {
                this.rename(evtFilename);
            }
        } catch (err) {
            this.logger.error(`watchEvent for ${this.filename} failed: ${err}`);
            this.emit("error", `watchEvent for ${this.filename} failed: ${err}`);
        }
    }

    watchFileEvent(curr, prev) {
        if (curr.size > prev.size) {
            this.currentCursorPos = curr.size;    //Update this.currentCursorPos so that a consumer can determine if entire file has been handled
            this.queue.push({ start: prev.size, end: curr.size });
            if (this.queue.length == 1) {
                this.internalDispatcher.emit("next");
            }
        }
    }

    unwatch() {
        if (this.watcher) {
            this.watcher.close();
        } else {
            fs.unwatchFile(this.filename);
        }
        if (this.rewatchId) {
            clearTimeout(this.rewatchId);
            this.rewatchId = undefined;
        }
        this.isWatching = false;
        this.queue = [];// TODO: is this correct behaviour?
        if (this.logger) {
            this.logger.info(`Unwatch ${this.filename}`);
        }
    }

}

exports.Tail = Tail


/***/ }),

/***/ 102:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

// For internal use, subject to change.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueCommand = void 0;
// We use any as a valid input type
/* eslint-disable @typescript-eslint/no-explicit-any */
const fs = __importStar(__webpack_require__(747));
const os = __importStar(__webpack_require__(87));
const utils_1 = __webpack_require__(82);
function issueCommand(command, message) {
    const filePath = process.env[`GITHUB_${command}`];
    if (!filePath) {
        throw new Error(`Unable to find environment variable for file command ${command}`);
    }
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing file at path: ${filePath}`);
    }
    fs.appendFileSync(filePath, `${utils_1.toCommandValue(message)}${os.EOL}`, {
        encoding: 'utf8'
    });
}
exports.issueCommand = issueCommand;
//# sourceMappingURL=file-command.js.map

/***/ }),

/***/ 104:
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

const path = __webpack_require__(622)
const exec = __webpack_require__(137)
const fs = __webpack_require__(747)
const Tail = __webpack_require__(88).Tail

// GITHUB
const core = __webpack_require__(470)

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


/***/ }),

/***/ 129:
/***/ (function(module) {

module.exports = require("child_process");

/***/ }),

/***/ 137:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var cp = __webpack_require__(129)
var normaliseOptions = __webpack_require__(877)

function shelljsExec(command, options) {

  options = normaliseOptions(options)

  var error, stdout, stderr, code, ok

  try {
    error = null
    stdout = cp.execSync(command, options)
    stderr = ''
    code = 0
    ok = true
  } catch (e) {
    error = e
    stdout = e.stdout
    stderr = e.stderr
    code = e.status || /* istanbul ignore next */ 1
    ok = false
  }

  return {
    error: error,
    stdout: stdout,
    stderr: stderr,
    code: code,
    ok: ok
  }
}

module.exports = shelljsExec


/***/ }),

/***/ 431:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issue = exports.issueCommand = void 0;
const os = __importStar(__webpack_require__(87));
const utils_1 = __webpack_require__(82);
/**
 * Commands
 *
 * Command Format:
 *   ::name key=value,key=value::message
 *
 * Examples:
 *   ::warning::This is the message
 *   ::set-env name=MY_VAR::some value
 */
function issueCommand(command, properties, message) {
    const cmd = new Command(command, properties, message);
    process.stdout.write(cmd.toString() + os.EOL);
}
exports.issueCommand = issueCommand;
function issue(name, message = '') {
    issueCommand(name, {}, message);
}
exports.issue = issue;
const CMD_STRING = '::';
class Command {
    constructor(command, properties, message) {
        if (!command) {
            command = 'missing.command';
        }
        this.command = command;
        this.properties = properties;
        this.message = message;
    }
    toString() {
        let cmdStr = CMD_STRING + this.command;
        if (this.properties && Object.keys(this.properties).length > 0) {
            cmdStr += ' ';
            let first = true;
            for (const key in this.properties) {
                if (this.properties.hasOwnProperty(key)) {
                    const val = this.properties[key];
                    if (val) {
                        if (first) {
                            first = false;
                        }
                        else {
                            cmdStr += ',';
                        }
                        cmdStr += `${key}=${escapeProperty(val)}`;
                    }
                }
            }
        }
        cmdStr += `${CMD_STRING}${escapeData(this.message)}`;
        return cmdStr;
    }
}
function escapeData(s) {
    return utils_1.toCommandValue(s)
        .replace(/%/g, '%25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A');
}
function escapeProperty(s) {
    return utils_1.toCommandValue(s)
        .replace(/%/g, '%25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A')
        .replace(/:/g, '%3A')
        .replace(/,/g, '%2C');
}
//# sourceMappingURL=command.js.map

/***/ }),

/***/ 470:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getState = exports.saveState = exports.group = exports.endGroup = exports.startGroup = exports.info = exports.warning = exports.error = exports.debug = exports.isDebug = exports.setFailed = exports.setCommandEcho = exports.setOutput = exports.getBooleanInput = exports.getMultilineInput = exports.getInput = exports.addPath = exports.setSecret = exports.exportVariable = exports.ExitCode = void 0;
const command_1 = __webpack_require__(431);
const file_command_1 = __webpack_require__(102);
const utils_1 = __webpack_require__(82);
const os = __importStar(__webpack_require__(87));
const path = __importStar(__webpack_require__(622));
/**
 * The code to exit an action
 */
var ExitCode;
(function (ExitCode) {
    /**
     * A code indicating that the action was successful
     */
    ExitCode[ExitCode["Success"] = 0] = "Success";
    /**
     * A code indicating that the action was a failure
     */
    ExitCode[ExitCode["Failure"] = 1] = "Failure";
})(ExitCode = exports.ExitCode || (exports.ExitCode = {}));
//-----------------------------------------------------------------------
// Variables
//-----------------------------------------------------------------------
/**
 * Sets env variable for this action and future actions in the job
 * @param name the name of the variable to set
 * @param val the value of the variable. Non-string values will be converted to a string via JSON.stringify
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportVariable(name, val) {
    const convertedVal = utils_1.toCommandValue(val);
    process.env[name] = convertedVal;
    const filePath = process.env['GITHUB_ENV'] || '';
    if (filePath) {
        const delimiter = '_GitHubActionsFileCommandDelimeter_';
        const commandValue = `${name}<<${delimiter}${os.EOL}${convertedVal}${os.EOL}${delimiter}`;
        file_command_1.issueCommand('ENV', commandValue);
    }
    else {
        command_1.issueCommand('set-env', { name }, convertedVal);
    }
}
exports.exportVariable = exportVariable;
/**
 * Registers a secret which will get masked from logs
 * @param secret value of the secret
 */
function setSecret(secret) {
    command_1.issueCommand('add-mask', {}, secret);
}
exports.setSecret = setSecret;
/**
 * Prepends inputPath to the PATH (for this action and future actions)
 * @param inputPath
 */
function addPath(inputPath) {
    const filePath = process.env['GITHUB_PATH'] || '';
    if (filePath) {
        file_command_1.issueCommand('PATH', inputPath);
    }
    else {
        command_1.issueCommand('add-path', {}, inputPath);
    }
    process.env['PATH'] = `${inputPath}${path.delimiter}${process.env['PATH']}`;
}
exports.addPath = addPath;
/**
 * Gets the value of an input.
 * Unless trimWhitespace is set to false in InputOptions, the value is also trimmed.
 * Returns an empty string if the value is not defined.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string
 */
function getInput(name, options) {
    const val = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '';
    if (options && options.required && !val) {
        throw new Error(`Input required and not supplied: ${name}`);
    }
    if (options && options.trimWhitespace === false) {
        return val;
    }
    return val.trim();
}
exports.getInput = getInput;
/**
 * Gets the values of an multiline input.  Each value is also trimmed.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string[]
 *
 */
function getMultilineInput(name, options) {
    const inputs = getInput(name, options)
        .split('\n')
        .filter(x => x !== '');
    return inputs;
}
exports.getMultilineInput = getMultilineInput;
/**
 * Gets the input value of the boolean type in the YAML 1.2 "core schema" specification.
 * Support boolean input list: `true | True | TRUE | false | False | FALSE` .
 * The return value is also in boolean type.
 * ref: https://yaml.org/spec/1.2/spec.html#id2804923
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   boolean
 */
function getBooleanInput(name, options) {
    const trueValue = ['true', 'True', 'TRUE'];
    const falseValue = ['false', 'False', 'FALSE'];
    const val = getInput(name, options);
    if (trueValue.includes(val))
        return true;
    if (falseValue.includes(val))
        return false;
    throw new TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${name}\n` +
        `Support boolean input list: \`true | True | TRUE | false | False | FALSE\``);
}
exports.getBooleanInput = getBooleanInput;
/**
 * Sets the value of an output.
 *
 * @param     name     name of the output to set
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setOutput(name, value) {
    process.stdout.write(os.EOL);
    command_1.issueCommand('set-output', { name }, value);
}
exports.setOutput = setOutput;
/**
 * Enables or disables the echoing of commands into stdout for the rest of the step.
 * Echoing is disabled by default if ACTIONS_STEP_DEBUG is not set.
 *
 */
function setCommandEcho(enabled) {
    command_1.issue('echo', enabled ? 'on' : 'off');
}
exports.setCommandEcho = setCommandEcho;
//-----------------------------------------------------------------------
// Results
//-----------------------------------------------------------------------
/**
 * Sets the action status to failed.
 * When the action exits it will be with an exit code of 1
 * @param message add error issue message
 */
function setFailed(message) {
    process.exitCode = ExitCode.Failure;
    error(message);
}
exports.setFailed = setFailed;
//-----------------------------------------------------------------------
// Logging Commands
//-----------------------------------------------------------------------
/**
 * Gets whether Actions Step Debug is on or not
 */
function isDebug() {
    return process.env['RUNNER_DEBUG'] === '1';
}
exports.isDebug = isDebug;
/**
 * Writes debug message to user log
 * @param message debug message
 */
function debug(message) {
    command_1.issueCommand('debug', {}, message);
}
exports.debug = debug;
/**
 * Adds an error issue
 * @param message error issue message. Errors will be converted to string via toString()
 */
function error(message) {
    command_1.issue('error', message instanceof Error ? message.toString() : message);
}
exports.error = error;
/**
 * Adds an warning issue
 * @param message warning issue message. Errors will be converted to string via toString()
 */
function warning(message) {
    command_1.issue('warning', message instanceof Error ? message.toString() : message);
}
exports.warning = warning;
/**
 * Writes info to log with console.log.
 * @param message info message
 */
function info(message) {
    process.stdout.write(message + os.EOL);
}
exports.info = info;
/**
 * Begin an output group.
 *
 * Output until the next `groupEnd` will be foldable in this group
 *
 * @param name The name of the output group
 */
function startGroup(name) {
    command_1.issue('group', name);
}
exports.startGroup = startGroup;
/**
 * End an output group.
 */
function endGroup() {
    command_1.issue('endgroup');
}
exports.endGroup = endGroup;
/**
 * Wrap an asynchronous function call in a group.
 *
 * Returns the same type as the function itself.
 *
 * @param name The name of the group
 * @param fn The function to wrap in the group
 */
function group(name, fn) {
    return __awaiter(this, void 0, void 0, function* () {
        startGroup(name);
        let result;
        try {
            result = yield fn();
        }
        finally {
            endGroup();
        }
        return result;
    });
}
exports.group = group;
//-----------------------------------------------------------------------
// Wrapper action state
//-----------------------------------------------------------------------
/**
 * Saves state for current action, the state can only be retrieved by this action's post job execution.
 *
 * @param     name     name of the state to store
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saveState(name, value) {
    command_1.issueCommand('save-state', { name }, value);
}
exports.saveState = saveState;
/**
 * Gets the value of an state set by this action's main execution.
 *
 * @param     name     name of the state to get
 * @returns   string
 */
function getState(name) {
    return process.env[`STATE_${name}`] || '';
}
exports.getState = getState;
//# sourceMappingURL=core.js.map

/***/ }),

/***/ 614:
/***/ (function(module) {

module.exports = require("events");

/***/ }),

/***/ 622:
/***/ (function(module) {

module.exports = require("path");

/***/ }),

/***/ 747:
/***/ (function(module) {

module.exports = require("fs");

/***/ }),

/***/ 848:
/***/ (function(module) {

"use strict";


module.exports = Object.freeze({
  encoding: 'utf8',
  silent: false
})


/***/ }),

/***/ 877:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


function isObject(obj) {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj)
}

function toBoolean(bool) {
  if (bool === 'false') bool = false
  return !!bool
}

function normaliseOptions(options) {

  var DEFAULTS = __webpack_require__(848)

  if (!isObject(options)) {
    options = {}
  } else {

    if (typeof options.silent !== 'undefined') {
      options.silent = toBoolean(options.silent)
    }
  }

  options = Object.assign({}, DEFAULTS, options)

  if (options.silent && typeof options.stdio === 'undefined') {
    options.stdio = 'pipe'
  }

  return options
}

module.exports = normaliseOptions


/***/ })

/******/ });