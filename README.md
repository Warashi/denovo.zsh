# Quick start

First of all, you need to install the latest [Deno][deno].
See [Deno's official manual](https://deno.land/manual/getting_started/installation) for details.

Once you got deno to work, install `Warashi/denovo.zsh` as a general zsh plugin. For example, the following uses [sheldon][sheldon]:

```toml
shell = "zsh"
[plugins]
[plugins.denovo]
github = "Warashi/denovo.zsh"
[plugins.denovo-example]
github = "Warashi/denovo-example"
```

Then you can confirm if denovo is working properly by executing `denovo-dispatch denovo-example echo a b c` command like:
```sh
$ denovo-dispatch example echo a b c
{"jsonrpc":"2.0","result":["a","b","c"],"id":1}
```

Once you've confirmed that denovo is working, you can remove `Warashi/denovo-example`.

[deno]: https://deno.land/
[sheldon]: https://sheldon.cli.rs/

# Inspired by

This ecosystem is strongly inspired by [denops.vim][denops.vim] which allows developers to write Vim/Neovim plugin in [deno][deno].
And also inspired by [zeno.zsh][zeno.zsh] which is zsh plugin written in [deno][deno].

Some code in this repository is borrowed from [denops.vim][denops.vim] and [zeno.zsh][zeno.zsh].

[denops.vim]: https://github.com/vim-denops/denops.vim
[deno]: https://deno.land/
[zeno.zsh]: https://github.com/yuki-yano/zeno.zsh

# License
The code follows MIT license written in [LICENSE](./LICENSE). Contributors need to agree that any modifications sent in this repository follow the license.
