import { loadConfig } from "../src/config.js";
import { copyExcludedFiles, getExcludePatterns } from "../src/git/exclude.js";
import { validateWorktreeName, canSafelyRemove } from "../src/git/safety.js";
import { createWorktree, getRepoRoot, listWorktrees, removeWorktree } from "../src/git/worktree.js";
import { loadMessages } from "../src/i18n/index.js";
import { registerProject } from "../src/project/registry.js";
import { runSetup } from "../src/project/setup.js";
import { createAdapter } from "../src/runtime/index.js";

const parseArgs = (argv: string[]) => {
  const args = argv.slice(2);
  const command = args[0];
  const name = args[1];

  const flags = args.reduce<Record<string, string>>((acc, arg, i) => {
    if (arg.startsWith("--") && args[i + 1] && !args[i + 1].startsWith("--")) {
      acc[arg.slice(2)] = args[i + 1];
    }
    if (arg === "--plain") acc.plain = "true";
    if (arg === "--help" || arg === "-h") acc.help = "true";
    if (arg === "--version" || arg === "-v") acc.version = "true";
    return acc;
  }, {});

  return { command, name, flags };
};

const printHelp = (msg: typeof import("../src/i18n/en.js").en) => {
  console.log(msg.version);
  console.log();
  console.log(msg.usage);
  console.log();
  console.log(msg.commands);
  console.log("  add <name> [--base <branch>]  Create a new worktree");
  console.log("  remove <name>                 Remove a worktree");
  console.log("  list                          List worktrees");
  console.log("  excluded                      Show exclude patterns");
  console.log("  config [--runtime|--lang]     Show or set config");
  console.log();
  console.log(msg.options);
  console.log("  --plain                       Machine-readable output");
  console.log("  -h, --help                    Show help");
  console.log("  -v, --version                 Show version");
};

const main = async () => {
  const { command, name, flags } = parseArgs(process.argv);
  const config = await loadConfig(
    async (p) => {
      const { readFile } = await import("node:fs/promises");
      return readFile(p, "utf-8");
    },
    async (p) => {
      const { stat } = await import("node:fs/promises");
      try {
        await stat(p);
        return true;
      } catch {
        return false;
      }
    },
  );

  const msg = await loadMessages(config.language);
  const adapter = await createAdapter(config.runtime);

  if (flags.version) {
    console.log(msg.version);
    return;
  }

  if (flags.help || !command) {
    printHelp(msg);
    return;
  }

  switch (command) {
    case "add": {
      if (!name) {
        console.error("✗ Usage: arbor add <name> [--base <branch>]");
        process.exitCode = 1;
        return;
      }
      if (!validateWorktreeName(name)) {
        console.error(`✗ ${msg.invalidName}`);
        process.exitCode = 1;
        return;
      }

      console.log(msg.creating);
      const worktreePath = await createWorktree(adapter, name, flags.base);

      if (config.copyExcludes) {
        console.log(msg.copying);
        const copied = await copyExcludedFiles(adapter, worktreePath);
        console.log(`✓ ${msg.copied} (${copied.length} files)`);
      }

      console.log(msg.installing);
      await runSetup(adapter, worktreePath, config.packageManager);
      console.log(`✓ ${msg.installed}`);

      const repoRoot = await getRepoRoot(adapter);
      await registerProject(adapter, name, repoRoot);

      console.log(`✓ ${msg.created}: ${worktreePath}`);
      console.log(`  cd ${worktreePath}`);
      break;
    }

    case "remove": {
      if (!name) {
        console.error("✗ Usage: arbor remove <name>");
        process.exitCode = 1;
        return;
      }

      const repoRoot = await getRepoRoot(adapter);
      const { basename, dirname, resolve } = await import("node:path");
      const worktreePath = resolve(dirname(repoRoot), `${basename(repoRoot)}-arbor`, name);

      const { safe, reason } = await canSafelyRemove(adapter, worktreePath);
      if (!safe) {
        const errorMsg = reason ? msg[reason as keyof typeof msg] : "Cannot remove";
        console.error(`✗ ${errorMsg}`);
        process.exitCode = 1;
        return;
      }

      console.log(msg.removing);
      await removeWorktree(adapter, name);
      console.log(`✓ ${msg.removed}: ${name}`);
      break;
    }

    case "list": {
      const worktrees = await listWorktrees(adapter);
      const arborWorktrees = worktrees.filter((wt) => wt.branch.startsWith("arbor/"));

      if (flags.plain) {
        arborWorktrees.forEach((wt) => console.log(`${wt.branch}\t${wt.path}`));
      } else if (arborWorktrees.length === 0) {
        console.log(msg.noWorktrees);
      } else {
        arborWorktrees.forEach((wt) => {
          console.log(`  ${wt.branch.replace("arbor/", "")} → ${wt.path}`);
        });
      }
      break;
    }

    case "excluded": {
      const patterns = await getExcludePatterns(adapter);
      if (patterns.length === 0) {
        console.log("No exclude patterns found in .git/info/exclude");
      } else {
        patterns.forEach((p) => console.log(`  ${p}`));
      }
      break;
    }

    case "config": {
      console.log(msg.configCurrent);
      Object.entries(config).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      break;
    }

    default: {
      console.error(`✗ Unknown command: ${command}`);
      printHelp(msg);
      process.exitCode = 1;
    }
  }
};

main().catch((err: Error) => {
  console.error(`✗ ${err.message}`);
  process.exitCode = 1;
});
