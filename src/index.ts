#!/usr/bin/env node

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
 *
 * @packageDocumentation
 */

import fs from 'fs';

import cp from 'child_process';

import minimist from 'minimist';

import chokidar from 'chokidar';

export type Arguments = minimist.ParsedArgs;

export type ParseOptions = minimist.Opts;

export type WatchProcessObject = {
	child: chokidar.FSWatcher
	text: string,
	context: string
}

export type OnReadyCallback = (path:string | string[]) => () => void

export type OnAllCallback = (event:WatchEvent, path:string) => void;

export type WatchEvent = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';

export type Repo = 'core' | 'api' | 'trx' | 'adm';

type Resolve = (v?:unknown) => void;
type Reject = (err?:Error) => void;

const watch_child_list:WatchProcessObject[] = [];

const child_list:cp.ChildProcessWithoutNullStreams[] = [];

// const child_outputs:CachedOutput = {};

process.on('SIGINT', function() {
	process.stdout.write("\r--- Caught interrupt signal [watch] ---\n");
	for(let i = 0; i < watch_child_list.length; i++){
		const watch_child_object = watch_child_list[i];
		watch_child_object.child.close().then(() => {
			process.stdout.write(`Stopped ${watch_child_object.text}\n`);
		});
	}
	process.stdout.write("\r--- Caught interrupt signal [spawn] ---\n");
	for(let i = 0; i < child_list.length; i++){
		const child = child_list[i];
		if(child.pid){
			process.kill(child.pid);
		}
	}
});

export function parser(args:string[] | undefined, options?:ParseOptions)
		:Arguments{
	return minimist(args, options);
}

const args = parser(process.argv.slice(2));

if(args._.length < 2){
	console.error(
		`Invalid arguments. Run uranio-sync <path-to-repo> <path-to-uranio-monorepo>`
	);
	process.exit(1);
}

const repo_path = args._[0].replaceAll('~', process.env.HOME as string);
const uranio_monorepo_path = args._[1].replaceAll('~', process.env.HOME as string);

_check_if_repo_has_uranio_init(repo_path);
_check_if_path_is_correct(uranio_monorepo_path);

const selected_uranio = _find_selected_uranio(repo_path);

console.log(`Starting uranio-sync with repository [${repo_path}] ...`);

switch(selected_uranio){
	case 'adm':{
		_sync_repo('core');
		_sync_repo('api');
		_sync_repo('trx');
		_sync_final_repo('adm');
		
		_execute(`cd ${uranio_monorepo_path}/urn-core && yarn dev:sync`);
		_execute(`cd ${uranio_monorepo_path}/urn-api && yarn dev:sync`);
		_execute(`cd ${uranio_monorepo_path}/urn-trx && yarn dev:sync`);
		_execute(`cd ${uranio_monorepo_path}/urn-adm && yarn dev:sync`);
		
		break;
	}
	case 'trx':{
		_sync_repo('core');
		_sync_repo('api');
		_sync_final_repo('trx');
		_execute(`cd ${uranio_monorepo_path}/urn-core && yarn dev:sync`);
		_execute(`cd ${uranio_monorepo_path}/urn-api && yarn dev:sync`);
		_execute(`cd ${uranio_monorepo_path}/urn-trx && yarn dev:sync`);
		break;
	}
	case 'api':{
		_sync_repo('core');
		_sync_final_repo('api');
		_execute(`cd ${uranio_monorepo_path}/urn-core && yarn dev:sync`);
		_execute(`cd ${uranio_monorepo_path}/urn-api && yarn dev:sync`);
		break;
	}
	case 'core':{
		_sync_final_repo('core');
		_execute(`cd ${uranio_monorepo_path}/urn-core && yarn dev:sync`);
		break;
	}
}

function _sync_final_repo(repo:Repo){
	return _sync_repo(repo, true)
}
function _sync_repo(repo:Repo, is_final=false){
	const node_modules_repo_name = (is_final) ? 'uranio' : `uranio-${repo}`;
	_watch(
		[`${uranio_monorepo_path}/urn-${repo}/src`,`${uranio_monorepo_path}/urn-${repo}/dist`],
		`watching ${uranio_monorepo_path}/urn-${repo}/src|dist directories.`,
		_on_ready,
		(_event:WatchEvent, _path:string) => {
			console.log(_event, _path);
			const splitted_path = _path.split(`urn-${repo}`);
			const relative_path = splitted_path[1];
			const to = `${repo_path}/node_modules/${node_modules_repo_name}${relative_path}`;
			fs.copyFileSync(_path, to);
			const print_path = _print_monorepo(_path);
			const print_to = _print_repo(to);
			console.log(`Copied file [${print_path}] to [${print_to}]`);
		}
	);
}

function _on_ready(path:string | string[]){
	return () => {
		const dir_word = (!Array.isArray(path)) ? 'directory' : 'directories';
		let paths = (Array.isArray(path)) ? path.map(p => _print_monorepo(p)) : path;
		console.log(`Started watching [${paths}] ${dir_word}...`);
	}
}
// function _on_all(_event:WatchEvent, _path:string){
// 	console.log(_event, _path);
// }

function _check_if_path_is_correct(_path:string){
	// TODO
	console.log(`Uranio monorepo found [${_path}].`);
}

function _check_if_repo_has_uranio_init(_path:string){
	// TODO
}

function _find_selected_uranio(_path:string):Repo{
	// TODO
	return 'adm';
}

function _watch(
	watch_path: string | string[],
	watch_text: string,
	on_ready: OnReadyCallback,
	on_all: OnAllCallback
):void{
	const watch_child = chokidar.watch(watch_path, {
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

function _print_monorepo(path:string){
	return path.replace(uranio_monorepo_path, '__uranio');
}

function _print_repo(path:string){
	return path.replace(repo_path, '__root');
}

function _spawn(
	command:string,
	resolve?:Resolve,
	reject?:Reject,
	detached=false
){
	console.log(`Command: ${command}`);
	
	const child = cp.spawn(command, {shell: true, detached: detached});
	
	if(child.stdout){
		child.stdout.setEncoding('utf8');
		child.stdout.on('data', (chunk) => {
			const splitted_chunk = chunk.split('\n');
			for(const split of splitted_chunk){
				const plain_text = _clean_chunk(split);
				if(plain_text === ''){
					continue;
				}
				console.log(plain_text);
			}
		});
	}
	
	if(child.stderr){
		child.stderr.setEncoding('utf8');
		child.stderr.on('data', (chunk) => {
			const splitted_chunk = chunk.split('\n');
			for(const split of splitted_chunk){
				const plain_text = _clean_chunk(split);
				if(plain_text === ''){
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
		switch(code){
			case 0:{
				return (resolve) ? resolve(true) : true;
			}
			default:{
				console.error(`Error on: ${command}`);
			}
		}
	});
	
	child_list.push(child);
	
	return child;
	
}

async function _execute(cmd:string){
	return new Promise((resolve, reject) => {
		_spawn(cmd, resolve, reject);
	});
}
function _clean_chunk(chunk:string){
	const plain_text = chunk
		.toString()
		.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, '') // eslint-disable-line no-control-regex
		.replace(/\r?\n|\r/g, ' ');
	return plain_text;
}

