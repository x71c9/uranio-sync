#!/usr/bin/env node
"use strict";
/**
 * Uranio Sync
 *
 * This script watches for any changes in Uranio monorepo submodules and
 * overwrite the dependecies of the given repo with the edited files.
 *
 * This allows to develop Uranio whitout using `npm link`.
 * It is important not to use `npm link` because Uranio, when running,
 * overwrites the repositories, making impossible to properly develop them.
 *
 * How to use:
 * ```
 * uranio-sync <path-to-repo> <path-to-uranio-monorepo>
 * ```
 * @packageDocumentation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = __importDefault(require("child_process"));
const dateformat_1 = __importDefault(require("dateformat"));
const minimist_1 = __importDefault(require("minimist"));
const chokidar_1 = __importDefault(require("chokidar"));
const repos = ['core', 'api', 'trx', 'adm'];
const watch_child_list = [];
const child_list = [];
const do_not_transfer = [
    'dist/client/toml.js'
];
// const child_outputs:CachedOutput = {};
process.on('SIGINT', function () {
    process.stdout.write("\r--- Caught interrupt signal [watch] ---\n");
    for (let i = 0; i < watch_child_list.length; i++) {
        const watch_child_object = watch_child_list[i];
        watch_child_object.child.close().then(() => {
            process.stdout.write(`Stopped ${watch_child_object.text}\n`);
        });
    }
    process.stdout.write("\r--- Caught interrupt signal [spawn] ---\n");
    for (let i = 0; i < child_list.length; i++) {
        const child = child_list[i];
        if (child.pid) {
            process.kill(child.pid);
        }
    }
});
const args = parser(process.argv.slice(2));
if (args['h'] === true || args['help'] === true) {
    _print_help();
    process.exit(0);
}
if (args._.length < 2) {
    console.error(`Invalid arguments. Run uranio-sync <path-to-repo> <path-to-uranio-monorepo>`);
    process.exit(1);
}
let repo_path = args._[0].replaceAll('~', process.env.HOME);
let uranio_monorepo_path = args._[1].replaceAll('~', process.env.HOME);
_check_if_repo_has_uranio_init(repo_path);
_check_if_path_is_uranio_monorepo(uranio_monorepo_path);
repo_path = path_1.default.resolve(repo_path);
uranio_monorepo_path = path_1.default.resolve(uranio_monorepo_path);
const selected_uranio = _find_selected_uranio(repo_path);
const binary_to_paths = _get_binary_paths(selected_uranio);
// console.log(`Starting uranio-sync with repository [${path.resolve(repo_path)}] ...`);
switch (selected_uranio) {
    case 'adm': {
        _sync_repo('core');
        _sync_repo('api');
        _sync_repo('trx');
        _sync_final_repo('adm');
        break;
    }
    case 'trx': {
        _sync_repo('core');
        _sync_repo('api');
        _sync_final_repo('trx');
        break;
    }
    case 'api': {
        _sync_repo('core');
        _sync_final_repo('api');
        break;
    }
    case 'core': {
        _sync_final_repo('core');
        break;
    }
}
function parser(args, options) {
    return (0, minimist_1.default)(args, options);
}
function _sync_final_repo(repo) {
    return _sync_repo(repo, true);
}
function _sync_repo(repo, is_final = false) {
    const node_modules_repo_name = (is_final) ? 'uranio' : `uranio-${repo}`;
    _watch([`${uranio_monorepo_path}/urn-${repo}/src`, `${uranio_monorepo_path}/urn-${repo}/dist`], `watching ${uranio_monorepo_path}/urn-${repo}/src|dist directories.`, _on_ready, (_event, _path) => {
        let time = (0, dateformat_1.default)(new Date(), "['T'HH:MM:ss:l]");
        console.log(time, _event, _path);
        const splitted_path = _path.split(`urn-${repo}`);
        const relative_path = splitted_path[1];
        const to = `${repo_path}/node_modules/${node_modules_repo_name}${relative_path}`;
        if (do_not_transfer.includes(relative_path) === false) {
            fs_1.default.copyFileSync(_path, to);
            const print_path = _print_monorepo(_path);
            const print_to = _print_repo(to);
            console.log(time, `Copied file [${print_path}] to [${print_to}]`);
            _chmod(to);
        }
    });
}
function _on_ready(path) {
    return () => {
        const dir_word = (!Array.isArray(path)) ? 'directory' : 'directories';
        let paths = (Array.isArray(path)) ? path.map(p => _print_monorepo(p)) : path;
        console.log(`Started watching [${paths}] ${dir_word} ...`);
    };
}
// function _on_all(_event:WatchEvent, _path:string){
// 	console.log(_event, _path);
// }
function _check_if_path_is_uranio_monorepo(_path) {
    if (fs_1.default.statSync(_path).isDirectory() === false) {
        console.error(`[INAVLID_PATH] Given path for Uranio monorepo does not exist.`);
        process.exit(1);
    }
    const package_path = path_1.default.join(_path, '/package.json');
    if (fs_1.default.existsSync(package_path) === false) {
        console.error(`[INVALID_PATH] Given path for Uranio monorepo is missing package.json.`);
        process.exit(1);
    }
    try {
        const content = fs_1.default.readFileSync(package_path);
        const parsed = JSON.parse(content.toString());
        if (typeof parsed.uranio === 'undefined') {
            console.error(`[NOT_URANIO] Given path for Uranio monorepo is not valid.`);
            process.exit(1);
        }
    }
    catch (err) {
        console.error(`[JSON_PARSE_FAILED] Invalid package.json from Uranio monorepo.`);
        process.exit(1);
    }
    console.log(`Uranio monorepo found .. [${path_1.default.resolve(_path)}]`);
}
function _check_if_repo_has_uranio_init(_path) {
    if (fs_1.default.statSync(_path).isDirectory() === false) {
        console.error(`[INAVLID_PATH] Given path for repo does not exist.`);
        process.exit(1);
    }
    const uranio_folder = path_1.default.join(_path, '/.uranio');
    if (fs_1.default.statSync(uranio_folder).isDirectory() === false) {
        console.error(`[INAVLID_REPO] Given repo is not initialized.`);
        console.error(`Run \`uranio init\` in the root of the repo.`);
        process.exit(1);
    }
    const uranio_json_path = path_1.default.join(uranio_folder, '/.uranio.json');
    if (fs_1.default.existsSync(uranio_json_path) === false) {
        console.error(`[INVALID_REPO] Given repo is broken.`);
        console.error(`Run \`uranio reinit\` in the root of the repo.`);
        process.exit(1);
    }
    console.log(`Repo found ............. [${path_1.default.resolve(_path)}]`);
}
function _find_selected_uranio(_path) {
    const uranio_folder = path_1.default.join(_path, '/.uranio');
    const uranio_json_path = path_1.default.join(uranio_folder, '/.uranio.json');
    try {
        const content = fs_1.default.readFileSync(uranio_json_path);
        const parsed = JSON.parse(content.toString());
        if (typeof parsed.repo === 'undefined') {
            console.error(`[JSON_PARSE_FAILED] Invalid .uranio.json. Repo is broken.`);
            console.error(`Run \`uranio reinit\` in the root of the repo.`);
            process.exit(1);
        }
        return parsed.repo;
    }
    catch (err) {
        console.error(`[JSON_PARSE_FAILED] Invalid .uranio.json. Repo is broken.`);
        console.error(`Run \`uranio reinit\` in the root of the repo.`);
        process.exit(1);
    }
}
function _watch(watch_path, watch_text, on_ready, on_all) {
    const watch_child = chokidar_1.default.watch(watch_path, {
        ignoreInitial: true,
        // ignored: ['./**/*.swp']
        ignored: (p) => path_1.default.extname(p) === '.swp'
    })
        .on('ready', on_ready(watch_path))
        .on('all', on_all);
    watch_child_list.push({
        child: watch_child,
        context: `wtch`,
        text: watch_text
    });
}
function _print_monorepo(path) {
    return path.replace(uranio_monorepo_path, '__uranio');
}
function _print_repo(path) {
    return path.replace(repo_path, '__root');
}
function _spawn(command, resolve, reject, detached = false) {
    console.log(`Command: ${command}`);
    const child = child_process_1.default.spawn(command, { shell: true, detached: detached });
    if (child.stdout) {
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk) => {
            const splitted_chunk = chunk.split('\n');
            for (const split of splitted_chunk) {
                const plain_text = _clean_chunk(split);
                if (plain_text === '') {
                    continue;
                }
                console.log(plain_text);
            }
        });
    }
    if (child.stderr) {
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk) => {
            const splitted_chunk = chunk.split('\n');
            for (const split of splitted_chunk) {
                const plain_text = _clean_chunk(split);
                if (plain_text === '') {
                    continue;
                }
                console.log(plain_text);
            }
        });
    }
    child.on('error', (err) => {
        console.error(err);
        return (reject) ? reject() : false;
    });
    child.on('close', (code) => {
        switch (code) {
            case 0: {
                return (resolve) ? resolve(true) : true;
            }
            default: {
                console.error(`Error on: ${command}`);
            }
        }
    });
    child_list.push(child);
    return child;
}
async function _execute(cmd) {
    return new Promise((resolve, reject) => {
        _spawn(cmd, resolve, reject);
    });
}
function _clean_chunk(chunk) {
    const plain_text = chunk
        .toString()
        .replace(/\x1B[[(?);]{0,2}(;?\d)*./g, '') // eslint-disable-line no-control-regex
        .replace(/\r?\n|\r/g, ' ');
    return plain_text;
}
function _chmod(to_path) {
    if (binary_to_paths.includes(to_path)) {
        _execute(`chmod +x ${to_path}`);
    }
}
function _get_binary_paths(selected_uranio) {
    const binary_to_paths = [];
    for (const repo of repos) {
        const node_modules_repo_name = (selected_uranio === repo) ? 'uranio' : `uranio-${repo}`;
        const json_path = `${uranio_monorepo_path}/urn-${repo}/package.json`;
        const parsed = JSON.parse(fs_1.default.readFileSync(json_path).toString());
        if (parsed.bin) {
            for (const [_bin_name, bin_path] of Object.entries(parsed.bin)) {
                binary_to_paths.push(`${repo_path}/node_modules/${node_modules_repo_name}/${bin_path}`);
            }
        }
    }
    return binary_to_paths;
}
function _print_help() {
    console.log(``);
    console.log(`usage: uranio-sync <options> <path-to-repo> <path-to-uranio-monorepo>`);
    console.log(``);
}
//# sourceMappingURL=index.js.map