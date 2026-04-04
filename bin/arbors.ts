import { basename } from "node:path";
import { createRequire } from "node:module";
import chalk from "chalk";

const pkg = createRequire(import.meta.url)("../package.json") as { version: string };
const VERSION = pkg.version;
import {
  type ArborConfig,
  loadConfig,
  getGlobalConfigPath,
  getProjectConfigPath,
} from "../src/config";
import { runHook } from "../src/hooks";
import { copyIgnoredFiles } from "../src/git/exclude";
import { validateWorktreeName, hasUncommittedChanges } from "../src/git/safety";
import {
  type WorktreeInfo,
  branchExists,
  checkoutRemoteWorktree,
  checkoutWorktree,
  createWorktree,
  getMainRepoRoot,
  getWorktreeRoot,
  listWorktrees,
  remoteBranchExists,
  removeWorktree,
} from "../src/git/worktree";
import { loadMessages } from "../src/i18n/index";
import {
  getWorktrees,
  registerProject,
  registerWorktree,
  unregisterWorktree,
} from "../src/project/registry";
import { runSetup } from "../src/project/setup";
import { createAdapter } from "../src/runtime/index";
import { withSpinner } from "../src/tui/withSpinner";

const matchFlag = (arg: string, flags: Record<string, string>): boolean => {
  if (arg === "--porcelain") {
    flags.porcelain = "true";
    return true;
  }
  if (arg === "--plain") {
    flags.porcelain = "true";
    flags._plainDeprecated = "true";
    return true;
  }
  if (arg === "--create" || arg === "-c") {
    flags.create = "true";
    return true;
  }
  if (arg === "-C") {
    flags.create = "true";
    flags.forceCreate = "true";
    return true;
  }
  if (arg === "--force" || arg === "-f") {
    flags.force = "true";
    return true;
  }
  if (arg === "--help" || arg === "-h") {
    flags.help = "true";
    return true;
  }
  if (arg === "--version" || arg === "-v") {
    flags.version = "true";
    return true;
  }
  if (arg === "--no-copy") {
    flags.noCopy = "true";
    return true;
  }
  if (arg === "--no-install") {
    flags.noInstall = "true";
    return true;
  }
  if (arg === "--dry-run" || arg === "-n") {
    flags.dryRun = "true";
    return true;
  }
  if (arg === "--quiet" || arg === "-q") {
    flags.quiet = "true";
    return true;
  }
  if (arg === "--merged") {
    flags.merged = "true";
    return true;
  }
  if (arg === "--global") {
    flags.global = "true";
    return true;
  }
  if (arg === "--unset") {
    flags.unset = "true";
    return true;
  }
  if (arg === "--no-hooks") {
    flags.noHooks = "true";
    return true;
  }
  return false;
};

const parseArgs = (argv: string[]) => {
  const args = argv.slice(2);

  const flags: Record<string, string> = {};
  const names: string[] = [];
  const rest: string[] = [];
  let command: string | undefined;
  let seenSeparator = false;

  for (const arg of args) {
    // Everything after -- goes to rest (for `run` command)
    if (arg === "--") {
      seenSeparator = true;
      continue;
    }
    if (seenSeparator) {
      rest.push(arg);
      continue;
    }

    if (matchFlag(arg, flags)) continue;

    // Skip unknown flags
    if (arg.startsWith("-")) continue;

    // First positional is the command, rest are names
    if (!command) {
      command = arg;
    } else {
      names.push(arg);
    }
  }

  return { command, names, flags, rest };
};

const error = (message: string) => {
  console.error(chalk.red(`error: ${message}`));
};

const hint = (message: string) => {
  console.error(chalk.gray(`hint: ${message}`));
};

const printHelp = (msg: typeof import("../src/i18n/en.js").en) => {
  console.log(chalk.cyan.bold(msg.version(VERSION)));
  console.log();
  console.log(chalk.white(msg.usage));
  console.log();
  console.log(chalk.white(msg.commands));
  console.log("  add <branch>                    Checkout existing branch (local or remote)");
  console.log("  add -c <branch> [<start-point>] Create a new branch worktree");
  console.log("  add -C <branch> [<start-point>] Force create (reset if branch exists)");
  console.log("  switch <branch>                 Switch to existing worktree");
  console.log("  remove (-r) <branch...> [-f]    Remove worktree(s)");
  console.log("  list [--porcelain]              List worktrees");
  console.log("  run <branch> -- <command...>    Run command in worktree context");
  console.log("  status                          Show current worktree info");
  console.log("  prune [-n] [--merged]           Clean up stale/merged worktrees");
  console.log("  excluded                        Show exclude-from-copy patterns");
  console.log("  config                          Show current config");
  console.log();
  console.log(chalk.white(msg.options));
  console.log("  -c                            Create new branch (git switch -c)");
  console.log("  -C                            Force create (git switch -C)");
  console.log("  -f, --force                   Force remove (skip uncommitted changes check)");
  console.log("  -n, --dry-run                 Preview without making changes");
  console.log("  -q, --quiet                   Minimal output");
  console.log("  --no-copy                     Skip copying ignored files");
  console.log("  --no-install                  Skip dependency installation");
  console.log("  --porcelain                   Machine-readable stable output");
  console.log("  --merged                      Target merged PR worktrees (prune)");
  console.log("  -h, --help                    Show help");
  console.log("  -v, --version                 Show version");
};

const getProjectRoot = async (): Promise<string | undefined> => {
  const { spawn } = await import("node:child_process");
  return new Promise((resolve) => {
    const proc = spawn("git", ["rev-parse", "--show-toplevel"], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    let stdout = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk;
    });
    proc.on("close", (code) => resolve(code === 0 ? stdout.trimEnd() : undefined));
  });
};

const main = async () => {
  const { command, names, flags, rest } = parseArgs(process.argv);
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

  if (flags._plainDeprecated) {
    console.error(chalk.yellow(`warning: ${msg.deprecatedPlain}`));
  }

  if (flags.version) {
    console.log(msg.version(VERSION));
    return;
  }

  if (flags.help) {
    printHelp(msg);
    return;
  }

  if (!command) {
    if (process.stdout.isTTY) {
      // Launch interactive TUI
      const { render } = await import("ink");
      const React = await import("react");
      const { App } = await import("../src/tui/App");
      const { getProjects } = await import("../src/project/registry");

      const projects = await getProjects(adapter);
      const { waitUntilExit } = render(
        React.createElement(App, {
          adapter,
          messages: msg,
          projects,
          listWorktrees,
        }),
      );
      await waitUntilExit();
      return;
    }
    printHelp(msg);
    return;
  }

  switch (command) {
    case "add": {
      if (!name) {
        error("missing branch name");
        console.error();
        console.error("usage: arbors add [-c | -C] <branch> [<start-point>]");
        console.error("   or: arbors add <existing-branch>");
        process.exitCode = 2;
        return;
      }
      if (!validateWorktreeName(name)) {
        error(msg.invalidName);
        hint("Branch names must start with alphanumeric and can contain . _ / -");
        process.exitCode = 1;
        return;
      }

      console.log();
      console.log(chalk.cyan.bold("arbors add"));
      console.log();

      let worktreePath: string;
      let created = false;
      let newBranch = false;

      // start-point is the second positional arg: arbors add -c feature main
      const startPoint = names[1];

      if (flags.create) {
        worktreePath = await withSpinner(msg.creating, () =>
          createWorktree(adapter, name, config.worktreeDir, startPoint),
        );
        created = true;
        newBranch = true;
        console.log(chalk.green(`✓ ${msg.created}: ${worktreePath}`));
        console.log(chalk.gray(`  Branch: ${name} (from ${startPoint ?? "default"})`));
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
        error(`branch '${name}' not found locally or on remote`);
        hint("To create a new branch, use:");
        hint(`    arbors add -c ${name}`);
        hint("To create from a specific base:");
        hint(`    arbors add -c ${name} main`);
        process.exitCode = 1;
        return;
      }

      try {
        if (!flags.noCopy) {
          if (!flags.quiet) console.log();
          const copied = await withSpinner(msg.copying, () =>
            copyIgnoredFiles(adapter, worktreePath, config.excludeFromCopy),
          );
          if (!flags.quiet) console.log(chalk.green(`✓ ${msg.copied} (${copied.length} files)`));
        }

        if (!flags.noInstall) {
          if (!flags.quiet) console.log();
          await withSpinner(msg.installing, () =>
            runSetup(adapter, worktreePath, config.packageManager),
          );
          if (!flags.quiet) console.log(chalk.green(`✓ ${msg.installed}`));
        }

        const repoRoot = await getMainRepoRoot(adapter);
        await registerProject(adapter, name, repoRoot);
        await registerWorktree(adapter, worktreePath, name, repoRoot);

        if (!flags.noHooks) {
          const hookOk = await runHook(
            adapter,
            "postCreate",
            {
              repoRoot,
              worktreePath,
              branch: name,
            },
            config.hooks,
          );
          if (!hookOk && !flags.quiet) {
            console.error(chalk.yellow(msg.hookFailed("postCreate")));
          }
        }
      } catch (setupErr) {
        error((setupErr as Error).message);
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
        error("missing branch name");
        console.error();
        console.error("usage: arbors switch <branch>");
        process.exitCode = 2;
        return;
      }

      const worktrees = await listWorktrees(adapter);
      const target = worktrees.find((wt) => wt.branch === name);

      if (!target) {
        error(`no worktree found for branch '${name}'`);
        hint("To create a worktree for this branch:");
        hint(`    arbors add ${name}`);
        hint("To see available worktrees:");
        hint("    arbors list");
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
        error("missing branch name");
        console.error();
        console.error("usage: arbors remove [-f] <branch> [<branch>...]");
        process.exitCode = 2;
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
          error(`no worktree found for branch '${branch}'`);
          hint(`To see available worktrees: arbors list`);
          failed++;
          console.log();
          continue;
        }

        if (target.path === cwd) {
          error(`${msg.cannotRemoveCurrent}: ${branch}`);
          hint("Switch to another worktree first: arbors switch <branch>");
          failed++;
          console.log();
          continue;
        }

        if (target.isMain) {
          error(`${msg.cannotDeleteMain}: ${branch}`);
          failed++;
          console.log();
          continue;
        }

        if (flags.force) {
          console.log(chalk.yellow(`⚠ ${msg.forceRemoving}`));
        } else {
          const hasChanges = await hasUncommittedChanges(adapter, target.path);
          if (hasChanges) {
            error(`${msg.uncommittedChanges}: ${branch}`);
            hint("Use -f to force removal:");
            hint(`    arbors remove -f ${branch}`);
            failed++;
            console.log();
            continue;
          }
        }

        // preRemove hook — blocks removal on failure unless --force
        if (!flags.noHooks) {
          const preOk = await runHook(
            adapter,
            "preRemove",
            {
              repoRoot,
              worktreePath: target.path,
              branch: target.branch ?? branch,
            },
            config.hooks,
          );
          if (!preOk && !flags.force) {
            error(`preRemove hook failed for ${branch}`);
            hint("Use -f to force removal:");
            hint(`    arbors remove -f ${branch}`);
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

          if (!flags.noHooks) {
            await runHook(
              adapter,
              "postRemove",
              {
                repoRoot,
                worktreePath: target.path,
                branch: target.branch ?? branch,
              },
              config.hooks,
            ).catch(() => {});
          }
        } catch (err) {
          error((err as Error).message);
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

      if (flags.porcelain) {
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

    case "run": {
      if (!name || rest.length === 0) {
        error("missing branch name or command");
        console.error();
        console.error("usage: arbors run <branch> -- <command...>");
        process.exitCode = 2;
        return;
      }

      const allWorktrees = await listWorktrees(adapter);
      const runTarget = allWorktrees.find((wt) => wt.branch === name || basename(wt.path) === name);

      if (!runTarget) {
        error(`no worktree found for branch '${name}'`);
        hint("To see available worktrees:");
        hint("    arbors list");
        process.exitCode = 1;
        return;
      }

      const result = await adapter.exec(rest[0], rest.slice(1), { cwd: runTarget.path });
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      process.exitCode = result.exitCode;
      break;
    }

    case "status": {
      const currentWorktrees = await listWorktrees(adapter);
      let currentPath: string;
      try {
        currentPath = await getWorktreeRoot(adapter);
      } catch {
        error(msg.notInWorktree);
        process.exitCode = 1;
        return;
      }

      const currentWt = currentWorktrees.find((wt) => wt.path === currentPath);

      if (flags.porcelain) {
        console.log(
          `${currentWt?.branch ?? "(detached)"}\t${currentPath}\t${currentWt?.isMain ? "main" : "linked"}`,
        );
      } else {
        console.log();
        console.log(chalk.cyan.bold("arbors status"));
        console.log();
        console.log(`  ${chalk.white("worktree")}: ${chalk.gray(currentPath)}`);
        console.log(
          `  ${chalk.white("branch")}:   ${chalk.gray(currentWt?.branch ?? "(detached)")}`,
        );
        console.log(
          `  ${chalk.white("type")}:     ${chalk.gray(currentWt?.isMain ? "main" : "linked")}`,
        );

        const hasChanges = await hasUncommittedChanges(adapter, currentPath);
        console.log(
          `  ${chalk.white("changes")}:  ${hasChanges ? chalk.yellow("uncommitted changes") : chalk.green("clean")}`,
        );
      }
      break;
    }

    case "prune": {
      const repoRootForPrune = await getMainRepoRoot(adapter);
      const dbEntries = await getWorktrees(adapter, repoRootForPrune);
      const gitEntries = await listWorktrees(adapter);
      const gitPaths = new Set(gitEntries.map((wt) => wt.path));

      if (flags.merged) {
        const mergedBranches: { branch: string; path: string }[] = [];

        for (const wt of gitEntries) {
          if (wt.isMain || !wt.branch) continue;
          const prResult = await adapter.exec("gh", [
            "pr",
            "view",
            wt.branch,
            "--json",
            "state",
            "--jq",
            ".state",
          ]);
          if (prResult.exitCode === 0 && prResult.stdout.trim() === "MERGED") {
            mergedBranches.push({ branch: wt.branch, path: wt.path });
          }
        }

        if (mergedBranches.length === 0) {
          if (!flags.quiet) console.log(chalk.gray(msg.noMergedWorktrees));
          break;
        }

        for (const { branch, path } of mergedBranches) {
          if (flags.dryRun) {
            console.log(msg.wouldRemove(branch, path));
          } else {
            try {
              await removeWorktree(adapter, path, branch);
              await unregisterWorktree(adapter, path);
              if (!flags.quiet) console.log(chalk.green(`✓ ${msg.removed}: ${branch}`));
            } catch (err) {
              error(`failed to remove ${branch}: ${(err as Error).message}`);
            }
          }
        }
      } else {
        const staleEntries = dbEntries.filter((w) => !gitPaths.has(w.path));

        if (staleEntries.length === 0) {
          if (!flags.quiet) console.log(chalk.gray(msg.noStaleWorktrees));
          break;
        }

        for (const entry of staleEntries) {
          if (flags.dryRun) {
            console.log(msg.wouldRemove(entry.branch, entry.path));
          } else {
            await unregisterWorktree(adapter, entry.path);
            if (!flags.quiet) console.log(chalk.green(`✓ ${msg.prunedStale(entry.branch)}`));
          }
        }
      }
      break;
    }

    case "config": {
      const configKey = name as keyof ArborConfig | undefined;
      const configValue = names[1];

      if (flags.unset && configKey) {
        // arbors config --unset <key>
        const configPath = flags.global
          ? getGlobalConfigPath()
          : projectRoot
            ? getProjectConfigPath(projectRoot)
            : getGlobalConfigPath();
        let existing: Record<string, unknown> = {};
        try {
          const content = await adapter.readFile(configPath);
          existing = JSON.parse(content);
        } catch {
          // file doesn't exist or is invalid
        }
        delete existing[configKey];
        await adapter.mkdir(configPath.replace(/\/[^/]+$/, ""));
        await adapter.writeFile(configPath, JSON.stringify(existing, null, 2));
        if (!flags.quiet) console.log(chalk.green(`✓ Unset ${configKey}`));
        break;
      }

      if (configKey && configValue !== undefined) {
        // arbors config <key> <value> [--global]
        const configPath = flags.global
          ? getGlobalConfigPath()
          : projectRoot
            ? getProjectConfigPath(projectRoot)
            : getGlobalConfigPath();
        let existing: Record<string, unknown> = {};
        try {
          const content = await adapter.readFile(configPath);
          existing = JSON.parse(content);
        } catch {
          // file doesn't exist or is invalid
        }
        // Parse arrays (comma-separated) for excludeFromCopy
        if (configKey === "excludeFromCopy") {
          existing[configKey] = configValue.split(",");
        } else {
          existing[configKey] = configValue;
        }
        await adapter.mkdir(configPath.replace(/\/[^/]+$/, ""));
        await adapter.writeFile(configPath, JSON.stringify(existing, null, 2));
        if (!flags.quiet) console.log(chalk.green(`✓ Set ${configKey} = ${configValue}`));
        break;
      }

      if (configKey) {
        // arbors config <key>
        const value = config[configKey];
        if (value === undefined) {
          error(`unknown config key '${configKey}'`);
          hint("Valid keys: runtime, language, packageManager, excludeFromCopy, worktreeDir");
          process.exitCode = 1;
        } else {
          console.log(Array.isArray(value) ? value.join(",") : String(value));
        }
        break;
      }

      // arbors config (no args) — list all
      console.log();
      console.log(chalk.cyan.bold("arbors config"));
      console.log();
      Object.entries(config).forEach(([key, value]) => {
        console.log(
          `  ${chalk.white(key)}: ${chalk.gray(Array.isArray(value) ? value.join(", ") : String(value))}`,
        );
      });
      break;
    }

    case "doctor": {
      console.log();
      console.log(chalk.cyan.bold("arbors doctor"));
      console.log();

      const checks: { label: string; ok: boolean; detail: string }[] = [];

      // Git version
      const gitVer = await adapter.exec("git", ["--version"]);
      const gitVersion = gitVer.stdout.trim().replace("git version ", "");
      checks.push({
        label: "git",
        ok: gitVer.exitCode === 0,
        detail: gitVer.exitCode === 0 ? gitVersion : "not found",
      });

      // Node version
      const nodeVersion = process.version;
      const nodeMajor = Number.parseInt(nodeVersion.slice(1), 10);
      checks.push({ label: "node", ok: nodeMajor >= 20, detail: nodeVersion });

      // Package manager
      const pmCheck = await adapter
        .exec("pnpm", ["--version"])
        .catch(() => ({ exitCode: 1, stdout: "", stderr: "" }));
      const yarnCheck = await adapter
        .exec("yarn", ["--version"])
        .catch(() => ({ exitCode: 1, stdout: "", stderr: "" }));
      const npmCheck = await adapter
        .exec("npm", ["--version"])
        .catch(() => ({ exitCode: 1, stdout: "", stderr: "" }));
      const pmAvailable = [
        pmCheck.exitCode === 0 ? `pnpm ${pmCheck.stdout.trim()}` : null,
        yarnCheck.exitCode === 0 ? `yarn ${yarnCheck.stdout.trim()}` : null,
        npmCheck.exitCode === 0 ? `npm ${npmCheck.stdout.trim()}` : null,
      ].filter(Boolean);
      checks.push({
        label: "package manager",
        ok: pmAvailable.length > 0,
        detail: pmAvailable.join(", ") || "none found",
      });

      // gh CLI
      const ghCheck = await adapter
        .exec("gh", ["--version"])
        .catch(() => ({ exitCode: 1, stdout: "", stderr: "" }));
      checks.push({
        label: "gh cli",
        ok: ghCheck.exitCode === 0,
        detail:
          ghCheck.exitCode === 0
            ? ghCheck.stdout.split("\n")[0].trim()
            : "not found (needed for prune --merged)",
      });

      // Registry
      const home = (await import("node:os")).homedir();
      const dbPath = (await import("node:path")).join(home, ".arbors", "db.json");
      const dbExists = await adapter.exists(dbPath);
      checks.push({
        label: "registry",
        ok: true,
        detail: dbExists ? dbPath : "not yet created (will be created on first use)",
      });

      // Shell wrapper
      const shellWrapperZsh = (await import("node:path")).resolve(
        (await import("node:url")).fileURLToPath(import.meta.url),
        "../../shell/arbors-wrapper.zsh",
      );
      const shellWrapperExists = await adapter.exists(shellWrapperZsh);
      checks.push({
        label: "shell wrapper",
        ok: shellWrapperExists,
        detail: shellWrapperExists ? "found" : "not found (cd after add/switch won't work)",
      });

      for (const { label, ok, detail } of checks) {
        const icon = ok ? chalk.green("✓") : chalk.yellow("!");
        console.log(`  ${icon} ${chalk.white(label)}: ${chalk.gray(detail)}`);
      }
      break;
    }

    case "completion": {
      const shell = name;
      if (shell === "zsh") {
        console.log(`#compdef arbors
_arbors() {
  local -a commands
  commands=(
    'add:Checkout or create a worktree'
    'switch:Switch to existing worktree'
    'remove:Remove worktree(s)'
    'list:List worktrees'
    'run:Run command in worktree context'
    'status:Show current worktree info'
    'prune:Clean up stale/merged worktrees'
    'config:Manage configuration'
    'excluded:Show exclude-from-copy patterns'
    'completion:Generate shell completion'
  )
  if (( CURRENT == 2 )); then
    _describe 'command' commands
  else
    case "\${words[2]}" in
      add|switch|remove|run)
        local -a branches
        branches=(\${(f)"$(git branch --format='%(refname:short)' 2>/dev/null)"})
        _describe 'branch' branches
        ;;
      config)
        local -a keys=(runtime language packageManager excludeFromCopy worktreeDir)
        _describe 'key' keys
        ;;
    esac
  fi
}
compdef _arbors arbors`);
      } else if (shell === "bash") {
        console.log(`_arbors() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  commands="add switch remove list run status prune config excluded completion"
  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
  else
    case "\${COMP_WORDS[1]}" in
      add|switch|remove|run)
        local branches=$(git branch --format='%(refname:short)' 2>/dev/null)
        COMPREPLY=( $(compgen -W "\${branches}" -- "\${cur}") )
        ;;
      config)
        local keys="runtime language packageManager excludeFromCopy worktreeDir"
        COMPREPLY=( $(compgen -W "\${keys}" -- "\${cur}") )
        ;;
    esac
  fi
}
complete -F _arbors arbors`);
      } else {
        error("unsupported shell");
        hint("Usage: arbors completion bash");
        hint("   or: arbors completion zsh");
        process.exitCode = 2;
      }
      break;
    }

    default: {
      error(`unknown command '${command}'`);
      console.error();
      printHelp(msg);
      process.exitCode = 2;
    }
  }
};

main().catch((err: Error) => {
  console.error(chalk.red(`error: ${err.message}`));
  process.exitCode = 1;
});
