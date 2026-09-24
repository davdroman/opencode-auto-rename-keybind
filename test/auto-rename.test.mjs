import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

// OpenCode supplies the TUI runtime. Only its identity wrapper is needed here.
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@opencode/plugin/tui") {
      return {
        url: "data:text/javascript,export const Plugin = { define: value => value };",
        shortCircuit: true,
      };
    }
    return next(specifier, context);
  },
});
const { default: plugin } = await import("opencode-auto-rename-keybind/tui");
hooks.deregister();

function setup(options = {}) {
  let route = { type: "session", sessionID: "ses_first" };
  let layer;
  let slot;
  let rendering = false;
  const calls = [];
  plugin.setup({
    options,
    keymap: {
      layer: (factory) => {
        assert.equal(rendering, true, "keymap registration requires the app provider");
        layer = factory();
      },
      dispatch: (...args) => calls.push(args),
    },
    ui: {
      router: { current: () => route },
      slot: (value) => { slot = value; },
    },
  });
  assert.equal(layer, undefined, "setup must defer keymap registration");
  assert.equal(slot.append, "app");
  rendering = true;
  assert.equal(slot.render(), null);
  rendering = false;
  return { action: layer.commands[0], layer, calls, navigate: (next) => { route = next; } };
}

test("does not claim a shortcut or add a palette entry by default", () => {
  const { action, layer, calls } = setup();
  assert.equal(action.bind, false);
  assert.equal(action.palette, undefined);
  assert.notEqual(layer.mode, "global");
  assert.equal(action.enabled(), true);
  action.run();
  assert.deepEqual(calls, [["session.rename", ""]]);
});

test("accepts a custom shortcut without changing the rename action", () => {
  for (const keybind of ["ctrl+r", "<leader>a", "ctrl+shift+r"]) {
    const { action, calls } = setup({ keybind });
    assert.equal(action.bind, keybind);
    action.run();
    assert.deepEqual(calls, [["session.rename", ""]]);
  }
});

test("allows the shortcut to be explicitly disabled", () => {
  const { action } = setup({ keybind: false });
  assert.equal(action.bind, false);
  assert.equal(action.palette, undefined);
});

test("rejects unsupported keybind option values", () => {
  for (const keybind of [true, 42, null, [], {}, "", "   "]) {
    assert.throws(() => setup({ keybind }), /keybind must be a non-empty shortcut string or false/);
  }
});

test("does nothing outside a session", () => {
  const { action, calls, navigate } = setup();
  navigate({ type: "home" });
  assert.equal(action.enabled(), false);
  action.run();
  assert.equal(calls.length, 0);
});

test("checks the current route rather than the route at plugin setup", () => {
  const { action, calls, navigate } = setup();
  navigate({ type: "home" });
  navigate({ type: "session", sessionID: "ses_second" });
  assert.equal(action.enabled(), true);
  action.run();
  assert.deepEqual(calls, [["session.rename", ""]]);
});
