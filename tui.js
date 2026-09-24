import { Plugin } from "@opencode/plugin/tui";

export default Plugin.define({
  id: "auto-rename",
  setup(context) {
    const keybind = context.options.keybind === undefined ? false : context.options.keybind;
    if (keybind !== false && (typeof keybind !== "string" || keybind.trim() === "")) {
      throw new TypeError("auto-rename: keybind must be a non-empty shortcut string or false");
    }

    context.ui.slot({
      append: "app",
      render() {
        // Keymap.Provider is available while rendering, not during plugin setup.
        context.keymap.layer(() => ({
          commands: [
            {
              id: "auto-rename.run",
              title: "Generate session name",
              group: "Session",
              bind: keybind,
              enabled: () => context.ui.router.current().type === "session",
              run() {
                const route = context.ui.router.current();
                if (route.type !== "session") return;
                // An omitted argument opens the dialog; empty input generates a title.
                context.keymap.dispatch("session.rename", "");
              },
            },
          ],
        }));
        return null;
      },
    });
  },
});
