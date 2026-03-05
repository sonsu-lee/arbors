import chalk from "chalk";
import { loadConfig } from "../src/config.js";
import { copyIgnoredFiles } from "../src/git/exclude.js";
import { validateWorktreeName, canSafelyRemove, isMainWorktree } from "../src/git/safety.js";
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

  const flags = args.reduce<Record<string, string>>((acc, arg, i) => {
    if (arg.startsWith("--") && args[i + 1] && !args[i + 1].startsWith("-")) {
      acc[arg.slice(2)] = args[i + 1];
    }
    if (arg === "--plain") acc.plain = "true";
    if (arg === "--create" || arg === "-c") acc.create = "true";
    if (arg === "--force" || arg === "-f") acc.force = "true";
    if (arg === "--help" || arg === "-h") acc.help = "true";
    if (arg === "--version" || arg === "-v") acc.version = "true";
    return acc;
  }, {});

  const name = args.slice(1).find((a) => !a.startsWith("-"));

  return { command, name, flags };
};

const printHelp = (msg: typeof import("../src/i18n/en.js").en) => {
  console.log(chalk.cyan.bold(msg.version));
  console.log();
  console.log(chalk.white(msg.usage));
  console.log();
  console.log(chalk.white(msg.commands));
  console.log("  add <branch>                    Checkout existing branch (local or remote)");
  console.log("  add -c <branch> [--base <br>]   Create a new branch worktree");
  console.log("  switch <branch>                 Switch to existing worktree");
  console.log("  remove <branch> [-f]             Remove a worktree");
  console.log("  list                            List worktrees");
  console.log("  excluded                        Show exclude-from-copy patterns");
  console.log("  config                          Show current config");
  console.log();
  console.log(chalk.white(msg.options));
  console.log("  -f, --force                   Force remove (skip uncommitted changes check)");
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
        console.error(chalk.red("✗ Usage: arbors add [-c] <branch> [--base <branch>]"));
        process.exitCode = 1;
        return;
      }
      if (!validateWorktreeName(name)) {
        console.error(chalk.red(`✗ ${msg.invalidName}`));
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(chalk.cyan.bold("arbors add"));
      console.log();

      let worktreePath: string;
      let created = false;
      let newBranch = false;

      if (flags.create) {
        // arbors add -c <branch> [--base main]
        console.log(chalk.gray(msg.creating));
        worktreePath = await createWorktree(adapter, name, config.worktreeDir, flags.base);
        created = true;
        newBranch = true;
        console.log(chalk.green(`✓ ${msg.created}: ${worktreePath}`));
        console.log(chalk.gray(`  Branch: ${name} (from ${flags.base ?? "default"})`));
      } else if (await branchExists(adapter, name)) {
        console.log(chalk.gray(`Checking out ${name}...`));
        const result = await checkoutWorktree(adapter, name, config.worktreeDir);
        worktreePath = result.path;
        created = result.created;
        console.log(chalk.green(`✓ ${msg.created}: ${worktreePath}`));
        console.log(chalk.gray(`  Branch: ${name}`));
      } else if (await remoteBranchExists(adapter, name)) {
        console.log(chalk.gray(`Fetching ${name} from origin...`));
        const result = await checkoutRemoteWorktree(adapter, name, config.worktreeDir);
        worktreePath = result.path;
        created = result.created;
        newBranch = result.created;
        console.log(chalk.green(`✓ ${msg.created}: ${worktreePath}`));
        console.log(chalk.gray(`  Branch: ${name} (from origin/${name})`));
      } else {
        console.error(
          chalk.red(`✗ Branch '${name}' not found locally or on origin. Use 'arbors add -c' to create.`),
        );
        process.exitCode = 1;
        return;
      }

      try {
        console.log();
        console.log(chalk.gray(msg.copying));
        const copied = await copyIgnoredFiles(adapter, worktreePath, config.excludeFromCopy);
        console.log(chalk.green(`✓ ${msg.copied} (${copied.length} files)`));

        console.log();
        console.log(chalk.gray(msg.installing));
        await runSetup(adapter, worktreePath, config.packageManager);
        console.log(chalk.green(`✓ ${msg.installed}`));

        const repoRoot = await getRepoRoot(adapter);
        await registerProject(adapter, name, repoRoot);
        await registerWorktree(adapter, worktreePath, name, repoRoot);
      } catch (setupErr) {
        console.error(chalk.red(`✗ ${(setupErr as Error).message}`));
        if (created) {
          console.log(chalk.gray("Rolling back worktree..."));
          await adapter
            .exec("git", ["worktree", "remove", "--force", worktreePath])
            .catch(() => {});
          if (newBranch) {
            await adapter.exec("git", ["branch", "-D", name]).catch(() => {});
          }
        }
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(`__ARBORS_CD__:${worktreePath}`);
      break;
    }

    case "switch": {
      if (!name) {
        console.error(chalk.red("✗ Usage: arbors switch <branch>"));
        process.exitCode = 1;
        return;
      }

      const worktrees = await listWorktrees(adapter);
      const target = worktrees.find((wt) => wt.branch === name);

      if (!target) {
        console.error(chalk.red(`✗ ${msg.worktreeNotFound}`));
        process.exitCode = 1;
        return;
      }

      console.log(chalk.gray(msg.switching));
      console.log(chalk.green(`✓ ${msg.switched}: ${target.path}`));
      console.log(`__ARBORS_CD__:${target.path}`);
      break;
    }

    case "remove": {
      if (!name) {
        console.error(chalk.red("✗ Usage: arbors remove <branch>"));
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(chalk.cyan.bold("arbors remove"));
      console.log();

      // Find the worktree by branch name
      const worktrees = await listWorktrees(adapter);
      const target = worktrees.find((wt) => wt.branch === name);

      if (!target) {
        console.error(chalk.red(`✗ No worktree found for branch '${name}'`));
        process.exitCode = 1;
        return;
      }

      if (await isMainWorktree(adapter, target.path)) {
        console.error(chalk.red(`✗ ${msg.cannotDeleteMain}`));
        process.exitCode = 1;
        return;
      }

      if (flags.force) {
        console.log(chalk.yellow(`⚠ ${msg.forceRemoving}`));
      } else {
        const { safe, reason } = await canSafelyRemove(adapter, target.path);
        if (!safe) {
          const errorMsg = reason ? msg[reason as keyof typeof msg] : "Cannot remove";
          console.error(chalk.red(`✗ ${errorMsg}`));
          process.exitCode = 1;
          return;
        }
        console.log(chalk.gray(msg.removing));
      }
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
        console.log(chalk.cyan.bold("arbors list"));
        console.log();
        managedWorktrees.forEach((wt) => {
          console.log(chalk.white(wt.branch));
          console.log(chalk.gray(`  ${wt.path}`));
        });
      }
      break;
    }

    case "excluded": {
      console.log();
      console.log(chalk.cyan.bold("arbors excluded"));
      console.log();
      if (config.excludeFromCopy.length === 0) {
        console.log(chalk.gray("  No exclude patterns (all ignored files will be copied)"));
      } else {
        config.excludeFromCopy.forEach((p: string) => console.log(`  ${p}`));
      }
      break;
    }

    case "config": {
      console.log();
      console.log(chalk.cyan.bold("arbors config"));
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
