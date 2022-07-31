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
