#!/usr/bin/env node
"use strict";
/**
 * Uranio SYNC
 *
 * This script will watch for any changes in Uranio monorepo submodules and
 * overwrite the dependecies of the repo given with the edited files.
 *
 * This allow to develop Uranio whitout re-importing it every time.
 *
 * Run `uranio-sync` <path-to-repo> <path-to-uranio-monorepo>
 *
 * @packageDocumentation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parser = void 0;
const fs_1 = __importDefault(require("fs"));
const minimist_1 = __importDefault(require("minimist"));
const chokidar_1 = __importDefault(require("chokidar"));
const watch_child_list = [];
process.on('SIGINT', function () {
    process.stdout.write("\r--- Caught interrupt signal [watch] ---\n");
    for (let i = 0; i < watch_child_list.length; i++) {
        const watch_child_object = watch_child_list[i];
        watch_child_object.child.close().then(() => {
            process.stdout.write(`Stopped ${watch_child_object.text}\n`);
        });
    }
});
function parser(args, options) {
    return (0, minimist_1.default)(args, options);
}
exports.parser = parser;
const args = parser(process.argv.slice(2));
if (args._.length < 2) {
    console.error(`Invalid arguments. Run uranio-sync <path-to-repo> <path-to-uranio-monorepo>`);
    process.exit(1);
}
const repo_path = args._[0].replaceAll('~', process.env.HOME);
const uranio_monorepo_path = args._[1].replaceAll('~', process.env.HOME);
_check_if_repo_has_uranio_init(repo_path);
_check_if_path_is_correct(uranio_monorepo_path);
const selected_uranio = _find_selected_uranio(repo_path);
console.log(`Starting uranio-sync with repository [${repo_path}] ...`);
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
function _sync_final_repo(repo) {
    return _sync_repo(repo, true);
}
function _sync_repo(repo, is_final = false) {
    const node_modules_repo_name = (is_final) ? 'uranio' : `uranio-${repo}`;
    _watch([`${uranio_monorepo_path}/urn-${repo}/src`, `${uranio_monorepo_path}/urn-${repo}/dist`], `watching ${uranio_monorepo_path}/urn-${repo}/src|dist directories.`, _on_ready, (_event, _path) => {
        console.log(_event, _path);
        const splitted_path = _path.split(`urn-${repo}`);
        const relative_path = splitted_path[1];
        const to = `${repo_path}/node_modules/${node_modules_repo_name}${relative_path}`;
        fs_1.default.copyFileSync(_path, to);
        const print_path = _path.replace(uranio_monorepo_path, '__uranio');
        const print_to = _path.replace(repo_path, '__root');
        console.log(`Copied file [${print_path}] to [${print_to}]`);
    });
}
function _on_ready(path) {
    return () => {
        const dir_word = (!Array.isArray(path)) ? 'directory' : 'directories';
        console.log(`Started watching [${path}] ${dir_word}...`);
    };
}
// function _on_all(_event:WatchEvent, _path:string){
// 	console.log(_event, _path);
// }
function _check_if_path_is_correct(_path) {
    // TODO
}
function _check_if_repo_has_uranio_init(_path) {
    // TODO
}
function _find_selected_uranio(_path) {
    // TODO
    return 'adm';
}
function _watch(watch_path, watch_text, on_ready, on_all) {
    const watch_child = chokidar_1.default.watch(watch_path, {
        ignoreInitial: true,
        ignored: ['./**/*.swp']
    })
        .on('ready', on_ready(watch_path))
        .on('all', on_all);
    watch_child_list.push({
        child: watch_child,
        context: `wtch`,
        text: watch_text
    });
}
//# sourceMappingURL=sync.js.map