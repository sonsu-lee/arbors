import chalk from "chalk";
import { loadConfig } from "../src/config.js";
import { copyExcludedFiles, getExcludePatterns } from "../src/git/exclude.js";
import { validateWorktreeName, canSafelyRemove } from "../src/git/safety.js";
import {
  branchExists,
  checkoutRemoteWorktree,
  checkoutWorktree,
  createWorktree,
  getRepoRoot,
  listWorktrees,
  remoteBranchExists,
  removeWorktree,
} from "../src/git/worktree.js";
import { loadMessages } from "../src/i18n/index.js";
import { getWorktrees, registerProject, registerWorktree, unregisterWorktree } from "../src/project/registry.js";
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
  console.log("  new <branch> [--base <branch>]  Create a new branch worktree");
  console.log("  add <branch>                    Checkout existing branch (local or remote)");
  console.log("  remove <branch>                 Remove a worktree");
  console.log("  list                            List worktrees");
  console.log("  excluded                        Show exclude patterns");
  console.log("  config [--runtime|--lang]       Show or set config");
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
    case "new": {
      if (!name) {
        console.error(chalk.red("✗ Usage: arbor new <branch> [--base <branch>]"));
        process.exitCode = 1;
        return;
      }
      if (!validateWorktreeName(name)) {
        console.error(chalk.red(`✗ ${msg.invalidName}`));
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(chalk.cyan.bold("arbor new"));
      console.log();

      console.log(chalk.gray(msg.creating));
      const newWorktreePath = await createWorktree(adapter, name, flags.base);
      console.log(chalk.green(`✓ ${msg.created}: ${newWorktreePath}`));
      console.log(chalk.gray(`  Branch: ${name} (from ${flags.base ?? "default"})`));

      try {
        if (config.copyExcludes) {
          console.log();
          console.log(chalk.gray(msg.copying));
          const copied = await copyExcludedFiles(adapter, newWorktreePath);
          console.log(chalk.green(`✓ ${msg.copied} (${copied.length} files)`));
        }

        console.log();
        console.log(chalk.gray(msg.installing));
        await runSetup(adapter, newWorktreePath, config.packageManager);
        console.log(chalk.green(`✓ ${msg.installed}`));

        const newRepoRoot = await getRepoRoot(adapter);
        await registerProject(adapter, name, newRepoRoot);
        await registerWorktree(adapter, newWorktreePath, name, newRepoRoot);
      } catch (setupErr) {
        console.error(chalk.red(`✗ ${(setupErr as Error).message}`));
        console.log(chalk.gray("Rolling back worktree..."));
        await adapter
          .exec("git", ["worktree", "remove", "--force", newWorktreePath])
          .catch(() => {});
        await adapter.exec("git", ["branch", "-D", name]).catch(() => {});
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(chalk.gray(`  cd ${newWorktreePath}`));
      break;
    }

    case "add": {
      if (!name) {
        console.error(chalk.red("✗ Usage: arbor add <branch>"));
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

      let addWorktreePath: string;
      let created = false;

      if (await branchExists(adapter, name)) {
        console.log(chalk.gray(`Checking out ${name}...`));
        const result = await checkoutWorktree(adapter, name);
        addWorktreePath = result.path;
        created = result.created;
        console.log(chalk.green(`✓ ${msg.created}: ${addWorktreePath}`));
        console.log(chalk.gray(`  Branch: ${name}`));
      } else if (await remoteBranchExists(adapter, name)) {
        console.log(chalk.gray(`Fetching ${name} from origin...`));
        const result = await checkoutRemoteWorktree(adapter, name);
        addWorktreePath = result.path;
        created = result.created;
        console.log(chalk.green(`✓ ${msg.created}: ${addWorktreePath}`));
        console.log(chalk.gray(`  Branch: ${name} (from origin/${name})`));
      } else {
        console.error(
          chalk.red(`✗ Branch '${name}' not found locally or on origin. Use 'arbor new' to create.`),
        );
        process.exitCode = 1;
        return;
      }

      try {
        if (config.copyExcludes) {
          console.log();
          console.log(chalk.gray(msg.copying));
          const copied = await copyExcludedFiles(adapter, addWorktreePath);
          console.log(chalk.green(`✓ ${msg.copied} (${copied.length} files)`));
        }

        console.log();
        console.log(chalk.gray(msg.installing));
        await runSetup(adapter, addWorktreePath, config.packageManager);
        console.log(chalk.green(`✓ ${msg.installed}`));

        const addRepoRoot = await getRepoRoot(adapter);
        await registerProject(adapter, name, addRepoRoot);
        await registerWorktree(adapter, addWorktreePath, name, addRepoRoot);
      } catch (setupErr) {
        console.error(chalk.red(`✗ ${(setupErr as Error).message}`));
        if (created) {
          console.log(chalk.gray("Rolling back worktree..."));
          await adapter
            .exec("git", ["worktree", "remove", "--force", addWorktreePath])
            .catch(() => {});
        }
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(chalk.gray(`  cd ${addWorktreePath}`));
      break;
    }

    case "remove": {
      if (!name) {
        console.error(chalk.red("✗ Usage: arbor remove <branch>"));
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(chalk.cyan.bold("arbor remove"));
      console.log();

      // Find the worktree by branch name
      const worktrees = await listWorktrees(adapter);
      const target = worktrees.find((wt) => wt.branch === name);

      if (!target) {
        console.error(chalk.red(`✗ No worktree found for branch '${name}'`));
        process.exitCode = 1;
        return;
      }

      const { safe, reason } = await canSafelyRemove(adapter, target.path);
      if (!safe) {
        const errorMsg = reason ? msg[reason as keyof typeof msg] : "Cannot remove";
        console.error(chalk.red(`✗ ${errorMsg}`));
        process.exitCode = 1;
        return;
      }

      console.log(chalk.gray(msg.removing));
      await removeWorktree(adapter, target.path, target.branch);
      await unregisterWorktree(adapter, target.path);
      console.log(chalk.green(`✓ ${msg.removed}: ${name}`));
      break;
    }

    case "list": {
      const repoRootForList = await getRepoRoot(adapter);
      const dbWorktrees = await getWorktrees(adapter, repoRootForList);
      const gitWorktrees = await listWorktrees(adapter);
      const gitPaths = new Set(gitWorktrees.map((wt) => wt.path));

      // Reconcile: remove db entries that no longer exist in git
      const stale = dbWorktrees.filter((w) => !gitPaths.has(w.path));
      for (const w of stale) {
        await unregisterWorktree(adapter, w.path);
      }

      const managedWorktrees = dbWorktrees.filter((w) => gitPaths.has(w.path));

      if (flags.plain) {
        managedWorktrees.forEach((wt) => console.log(`${wt.branch}\t${wt.path}`));
      } else if (managedWorktrees.length === 0) {
        console.log(chalk.gray(msg.noWorktrees));
      } else {
        console.log();
        console.log(chalk.cyan.bold("arbor list"));
        console.log();
        managedWorktrees.forEach((wt) => {
          console.log(chalk.white(wt.branch));
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
