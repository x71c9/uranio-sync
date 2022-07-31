#!/usr/bin/env node
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
import minimist from 'minimist';
import chokidar from 'chokidar';
export declare type Arguments = minimist.ParsedArgs;
export declare type ParseOptions = minimist.Opts;
export declare type WatchProcessObject = {
    child: chokidar.FSWatcher;
    text: string;
    context: string;
};
export declare type OnReadyCallback = (path: string | string[]) => () => void;
export declare type OnAllCallback = (event: WatchEvent, path: string) => void;
export declare type WatchEvent = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
export declare type Repo = 'core' | 'api' | 'trx' | 'adm';
export declare function parser(args: string[] | undefined, options?: ParseOptions): Arguments;
