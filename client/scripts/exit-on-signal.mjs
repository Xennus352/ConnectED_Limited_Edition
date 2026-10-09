// Preloaded via NODE_OPTIONS in the `dev` script.
//
// Vite's dev server only traps SIGTERM, so on Ctrl+C (SIGINT) it dies from the
// default signal disposition. pnpm then reports the script as
// `Failed ... Command failed with signal SIGINT` and the whole recursive run
// exits with ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL. Exiting 0 instead makes Ctrl+C
// shut the dev server down cleanly.
process.on("SIGINT", () => {
  process.exit(0);
});
