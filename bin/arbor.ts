import chalk from "chalk";
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
  console.log(chalk.cyan.bold(msg.version));
  console.log();
  console.log(chalk.white(msg.usage));
  console.log();
  console.log(chalk.white(msg.commands));
  console.log("  add <name> [--base <branch>]  Create a new worktree");
  console.log("  remove <name>                 Remove a worktree");
  console.log("  list                          List worktrees");
  console.log("  excluded                      Show exclude patterns");
  console.log("  config [--runtime|--lang]     Show or set config");
  console.log();
  console.log(chalk.white(msg.options));
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
        console.error(chalk.red("✗ Usage: arbor add <name> [--base <branch>]"));
        process.exitCode = 1;
        return;
      }
      if (!validateWorktreeName(name)) {
        console.error(chalk.red(`✗ ${msg.invalidName}`));
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(chalk.cyan.bold("arbor add"));
      console.log();

      console.log(chalk.gray(msg.creating));
      const worktreePath = await createWorktree(adapter, name, config.branchPrefix, flags.base);
      console.log(chalk.green(`✓ ${msg.created}: ${worktreePath}`));
      console.log(chalk.gray(`  Branch: ${config.branchPrefix}/${name}`));

      if (config.copyExcludes) {
        console.log();
        console.log(chalk.gray(msg.copying));
        const copied = await copyExcludedFiles(adapter, worktreePath);
        console.log(chalk.green(`✓ ${msg.copied} (${copied.length} files)`));
      }

      console.log();
      console.log(chalk.gray(msg.installing));
      await runSetup(adapter, worktreePath, config.packageManager);
      console.log(chalk.green(`✓ ${msg.installed}`));

      const repoRoot = await getRepoRoot(adapter);
      await registerProject(adapter, name, repoRoot);

      console.log();
      console.log(chalk.gray(`  cd ${worktreePath}`));
      break;
    }

    case "remove": {
      if (!name) {
        console.error(chalk.red("✗ Usage: arbor remove <name>"));
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(chalk.cyan.bold("arbor remove"));
      console.log();

      const repoRoot = await getRepoRoot(adapter);
      const { basename, dirname, resolve } = await import("node:path");
      const worktreePath = resolve(dirname(repoRoot), `${basename(repoRoot)}-arbor`, name);

      const { safe, reason } = await canSafelyRemove(adapter, worktreePath, config.branchPrefix);
      if (!safe) {
        const errorMsg = reason ? msg[reason as keyof typeof msg] : "Cannot remove";
        console.error(chalk.red(`✗ ${errorMsg}`));
        process.exitCode = 1;
        return;
      }

      console.log(chalk.gray(msg.removing));
      await removeWorktree(adapter, name, config.branchPrefix);
      console.log(chalk.green(`✓ ${msg.removed}: ${name}`));
      break;
    }

    case "list": {
      const worktrees = await listWorktrees(adapter, config.branchPrefix);
      const managedWorktrees = worktrees.filter((wt) => wt.branch.startsWith(`${config.branchPrefix}/`));

      if (flags.plain) {
        managedWorktrees.forEach((wt) => console.log(`${wt.branch}\t${wt.path}`));
      } else if (managedWorktrees.length === 0) {
        console.log(chalk.gray(msg.noWorktrees));
      } else {
        console.log();
        console.log(chalk.cyan.bold("arbor list"));
        console.log();
        managedWorktrees.forEach((wt) => {
          const wtName = wt.branch.replace(`${config.branchPrefix}/`, "");
          console.log(chalk.white(wtName));
          console.log(chalk.gray(`  ${wt.path}`));
        });
      }
      break;
    }

    case "excluded": {
      const patterns = await getExcludePatterns(adapter);
      if (patterns.length === 0) {
        console.log(chalk.gray("No exclude patterns found in .git/info/exclude"));
      } else {
        console.log();
        console.log(chalk.cyan.bold("arbor excluded"));
        console.log();
        patterns.forEach((p) => console.log(`  ${p}`));
      }
      break;
    }

    case "config": {
      console.log();
      console.log(chalk.cyan.bold("arbor config"));
      console.log();
      Object.entries(config).forEach(([key, value]) => {
        console.log(`  ${chalk.white(key)}: ${chalk.gray(String(value))}`);
      });
      break;
    }

    default: {
      console.error(chalk.red(`✗ Unknown command: ${command}`));
      printHelp(msg);
      process.exitCode = 1;
    }
  }
};

main().catch((err: Error) => {
  console.error(chalk.red(`✗ ${err.message}`));
  process.exitCode = 1;
});
