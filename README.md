# Deprecated

**This repository is deprecated and no longer maintained.**

Please use the new repository for the latest code and updates:  
[https://github.com/x71c9/uranio](https://github.com/x71c9/uranio)

## Uranio Sync

Command line tool for developing Uranio.

This script watches for any changes in Uranio monorepo submodules and
overwrite the dependecies of the given repo with the edited files.

This allows to develop Uranio *whitout* using `npm link`.
It is important not to use `npm link` because Uranio, when running,
overwrites the repositories, making impossible to properly develop them.

### How to use:
```
uranio-sync <path-to-repo> <path-to-uranio-monorepo>
```
