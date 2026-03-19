import { basename } from "node:path";
import chalk from "chalk";
import { loadConfig } from "../src/config";
import { copyIgnoredFiles } from "../src/git/exclude";
import { validateWorktreeName, hasUncommittedChanges } from "../src/git/safety";
import {
  type WorktreeInfo,
  branchExists,
  checkoutRemoteWorktree,
  checkoutWorktree,
  createWorktree,
  getMainRepoRoot,
  listWorktrees,
  remoteBranchExists,
  removeWorktree,
} from "../src/git/worktree";
import { loadMessages } from "../src/i18n/index";
import { getWorktrees, registerProject, registerWorktree, unregisterWorktree } from "../src/project/registry";
import { runSetup } from "../src/project/setup";
import { createAdapter } from "../src/runtime/index";
import { withSpinner } from "../src/tui/withSpinner";

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

  const names = args.slice(1).filter((a) => !a.startsWith("-") && !Object.values(flags).includes(a));

  return { command, names, flags };
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
  console.log("  remove (-r) <branch...> [-f]    Remove worktree(s)");
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

const getProjectRoot = async (): Promise<string | undefined> => {
  const { spawn } = await import("node:child_process");
  return new Promise((resolve) => {
    const proc = spawn("git", ["rev-parse", "--show-toplevel"], { stdio: ["ignore", "pipe", "ignore"] });
    let stdout = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk;
    });
    proc.on("close", (code) => resolve(code === 0 ? stdout.trimEnd() : undefined));
  });
};

const main = async () => {
  const { command, names, flags } = parseArgs(process.argv);
  const name = names[0];
  const projectRoot = await getProjectRoot();
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
    projectRoot,
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
        worktreePath = await withSpinner(msg.creating, () =>
          createWorktree(adapter, name, config.worktreeDir, flags.base),
        );
        created = true;
        newBranch = true;
        console.log(chalk.green(`✓ ${msg.created}: ${worktreePath}`));
        console.log(chalk.gray(`  Branch: ${name} (from ${flags.base ?? "default"})`));
      } else if (await branchExists(adapter, name)) {
        const result = await withSpinner(`Checking out ${name}...`, () =>
          checkoutWorktree(adapter, name, config.worktreeDir),
        );
        worktreePath = result.path;
        created = result.created;
        console.log(chalk.green(`✓ ${msg.created}: ${worktreePath}`));
        console.log(chalk.gray(`  Branch: ${name}`));
      } else if (await remoteBranchExists(adapter, name)) {
        const result = await withSpinner(`Fetching ${name} from origin...`, () =>
          checkoutRemoteWorktree(adapter, name, config.worktreeDir),
        );
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
        const copied = await withSpinner(msg.copying, () =>
          copyIgnoredFiles(adapter, worktreePath, config.excludeFromCopy),
        );
        console.log(chalk.green(`✓ ${msg.copied} (${copied.length} files)`));

        console.log();
        await withSpinner(msg.installing, () =>
          runSetup(adapter, worktreePath, config.packageManager),
        );
        console.log(chalk.green(`✓ ${msg.installed}`));

        const repoRoot = await getMainRepoRoot(adapter);
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

    case "-r":
    case "remove": {
      const branches = [...new Set(names)];
      if (branches.length === 0) {
        console.error(chalk.red("✗ Usage: arbors remove <branch> [branch...]"));
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(chalk.cyan.bold("arbors remove"));
      console.log();

      const worktrees = await listWorktrees(adapter);
      const repoRoot = await getMainRepoRoot(adapter);
      const dbWorktrees = await getWorktrees(adapter, repoRoot);
      const currentRoot = await adapter.exec("git", ["rev-parse", "--show-toplevel"]);
      const cwd = currentRoot.exitCode === 0 ? currentRoot.stdout : "";

      const findWorktree = (query: string): WorktreeInfo | undefined => {
        // Match by branch name, full path, or directory name from git
        const fromGit = worktrees.find(
          (wt) => wt.branch === query || wt.path === query || basename(wt.path) === query,
        );
        if (fromGit) return fromGit;

        // Fallback: match by branch name in registry (handles detached worktrees)
        const fromDb = dbWorktrees.find((w) => w.branch === query);
        if (fromDb) return worktrees.find((wt) => wt.path === fromDb.path);

        return undefined;
      };

      let removed = 0;
      let failed = 0;

      for (const branch of branches) {
        console.log(chalk.gray(`Removing ${branch}...`));

        const target = findWorktree(branch);
        if (!target) {
          console.error(chalk.red(`✗ No worktree found for branch '${branch}'`));
          failed++;
          console.log();
          continue;
        }

        if (target.path === cwd) {
          console.error(chalk.red(`✗ ${msg.cannotRemoveCurrent}: ${branch}`));
          failed++;
          console.log();
          continue;
        }

        if (target.isMain) {
          console.error(chalk.red(`✗ ${msg.cannotDeleteMain}: ${branch}`));
          failed++;
          console.log();
          continue;
        }

        if (flags.force) {
          console.log(chalk.yellow(`⚠ ${msg.forceRemoving}`));
        } else {
          const hasChanges = await hasUncommittedChanges(adapter, target.path);
          if (hasChanges) {
            console.error(chalk.red(`✗ ${msg.uncommittedChanges}: ${branch}`));
            failed++;
            console.log();
            continue;
          }
        }

        try {
          await withSpinner(msg.removing, async () => {
            await removeWorktree(adapter, target.path, target.branch);
            await unregisterWorktree(adapter, target.path);
          });
          console.log(chalk.green(`✓ ${msg.removed}: ${branch}`));
          removed++;
        } catch (err) {
          console.error(chalk.red(`✗ ${(err as Error).message}`));
          failed++;
        }
        console.log();
      }

      if (branches.length > 1) {
        console.log(msg.removeSummary(removed, failed));
      }

      if (failed > 0) {
        process.exitCode = 1;
      }
      break;
    }

    case "list": {
      const repoRootForList = await getMainRepoRoot(adapter);
      const dbWorktrees = await getWorktrees(adapter, repoRootForList);
      const gitWorktrees = await listWorktrees(adapter);
      const gitByPath = new Map(gitWorktrees.map((wt) => [wt.path, wt.branch]));

      // Reconcile: remove db entries that no longer exist in git
      const stale = dbWorktrees.filter((w) => !gitByPath.has(w.path));
      for (const w of stale) {
        await unregisterWorktree(adapter, w.path);
      }

      const managedWorktrees = dbWorktrees
        .filter((w) => gitByPath.has(w.path))
        .map((wt) => ({ ...wt, branch: gitByPath.get(wt.path) ?? wt.branch }));

      if (flags.plain) {
        managedWorktrees.forEach((wt) => console.log(`${wt.branch ?? "(detached)"}\t${wt.path}`));
      } else if (managedWorktrees.length === 0) {
        console.log(chalk.gray(msg.noWorktrees));
      } else {
        console.log();
        console.log(chalk.cyan.bold("arbors list"));
        console.log();
        managedWorktrees.forEach((wt) => {
          console.log(chalk.white(wt.branch ?? chalk.yellow("(detached)")));
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
