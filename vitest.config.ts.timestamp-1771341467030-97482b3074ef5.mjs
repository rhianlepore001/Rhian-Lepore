// vitest.config.ts
import { defineConfig } from "file:///C:/Users/User/Downloads/Rhian-Lepore-main/node_modules/vitest/dist/config.js";
import react from "file:///C:/Users/User/Downloads/Rhian-Lepore-main/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\User\\Downloads\\Rhian-Lepore-main";
var vitest_config_default = defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "test/",
        "**/*.test.ts",
        "**/*.test.tsx",
        "dist/",
        "clerk-migration/",
        "testsprite_tests/",
        "scripts/",
        "*.config.ts",
        "*.config.js"
      ]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./")
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXFVzZXJcXFxcRG93bmxvYWRzXFxcXFJoaWFuLUxlcG9yZS1tYWluXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxVc2VyXFxcXERvd25sb2Fkc1xcXFxSaGlhbi1MZXBvcmUtbWFpblxcXFx2aXRlc3QuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9Vc2VyL0Rvd25sb2Fkcy9SaGlhbi1MZXBvcmUtbWFpbi92aXRlc3QuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZXN0L2NvbmZpZyc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICAgIHBsdWdpbnM6IFtyZWFjdCgpXSxcclxuICAgIHRlc3Q6IHtcclxuICAgICAgICBnbG9iYWxzOiB0cnVlLFxyXG4gICAgICAgIGVudmlyb25tZW50OiAnanNkb20nLFxyXG4gICAgICAgIHNldHVwRmlsZXM6IFsnLi90ZXN0L3NldHVwLnRzJ10sXHJcbiAgICAgICAgY3NzOiB0cnVlLFxyXG4gICAgICAgIGNvdmVyYWdlOiB7XHJcbiAgICAgICAgICAgIHByb3ZpZGVyOiAndjgnLFxyXG4gICAgICAgICAgICByZXBvcnRlcjogWyd0ZXh0JywgJ2pzb24nLCAnaHRtbCddLFxyXG4gICAgICAgICAgICBleGNsdWRlOiBbXHJcbiAgICAgICAgICAgICAgICAnbm9kZV9tb2R1bGVzLycsXHJcbiAgICAgICAgICAgICAgICAndGVzdC8nLFxyXG4gICAgICAgICAgICAgICAgJyoqLyoudGVzdC50cycsXHJcbiAgICAgICAgICAgICAgICAnKiovKi50ZXN0LnRzeCcsXHJcbiAgICAgICAgICAgICAgICAnZGlzdC8nLFxyXG4gICAgICAgICAgICAgICAgJ2NsZXJrLW1pZ3JhdGlvbi8nLFxyXG4gICAgICAgICAgICAgICAgJ3Rlc3RzcHJpdGVfdGVzdHMvJyxcclxuICAgICAgICAgICAgICAgICdzY3JpcHRzLycsXHJcbiAgICAgICAgICAgICAgICAnKi5jb25maWcudHMnLFxyXG4gICAgICAgICAgICAgICAgJyouY29uZmlnLmpzJyxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICB9LFxyXG4gICAgfSxcclxuICAgIHJlc29sdmU6IHtcclxuICAgICAgICBhbGlhczoge1xyXG4gICAgICAgICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLycpLFxyXG4gICAgICAgIH0sXHJcbiAgICB9LFxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEyVCxTQUFTLG9CQUFvQjtBQUN4VixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sd0JBQVEsYUFBYTtBQUFBLEVBQ3hCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixNQUFNO0FBQUEsSUFDRixTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYixZQUFZLENBQUMsaUJBQWlCO0FBQUEsSUFDOUIsS0FBSztBQUFBLElBQ0wsVUFBVTtBQUFBLE1BQ04sVUFBVTtBQUFBLE1BQ1YsVUFBVSxDQUFDLFFBQVEsUUFBUSxNQUFNO0FBQUEsTUFDakMsU0FBUztBQUFBLFFBQ0w7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNMLE9BQU87QUFBQSxNQUNILEtBQUssS0FBSyxRQUFRLGtDQUFXLElBQUk7QUFBQSxJQUNyQztBQUFBLEVBQ0o7QUFDSixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
