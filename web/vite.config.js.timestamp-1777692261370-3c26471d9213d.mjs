// vite.config.js
import { defineConfig } from "file:///sessions/wizardly-compassionate-wozniak/mnt/%E7%95%AA%E8%BF%B9/web/node_modules/vite/dist/node/index.js";
import vue from "file:///sessions/wizardly-compassionate-wozniak/mnt/%E7%95%AA%E8%BF%B9/web/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import AutoImport from "file:///sessions/wizardly-compassionate-wozniak/mnt/%E7%95%AA%E8%BF%B9/web/node_modules/unplugin-auto-import/dist/vite.js";
import Components from "file:///sessions/wizardly-compassionate-wozniak/mnt/%E7%95%AA%E8%BF%B9/web/node_modules/unplugin-vue-components/dist/vite.js";
import { ElementPlusResolver } from "file:///sessions/wizardly-compassionate-wozniak/mnt/%E7%95%AA%E8%BF%B9/web/node_modules/unplugin-vue-components/dist/resolvers.js";
import path from "node:path";
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    AutoImport({ resolvers: [ElementPlusResolver()] }),
    Components({ resolvers: [ElementPlusResolver()] })
  ],
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvd2l6YXJkbHktY29tcGFzc2lvbmF0ZS13b3puaWFrL21udC9cdTc1NkFcdThGRjkvd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvc2Vzc2lvbnMvd2l6YXJkbHktY29tcGFzc2lvbmF0ZS13b3puaWFrL21udC9cdTc1NkFcdThGRjkvd2ViL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9zZXNzaW9ucy93aXphcmRseS1jb21wYXNzaW9uYXRlLXdvem5pYWsvbW50LyVFNyU5NSVBQSVFOCVCRiVCOS93ZWIvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJztcbmltcG9ydCBBdXRvSW1wb3J0IGZyb20gJ3VucGx1Z2luLWF1dG8taW1wb3J0L3ZpdGUnO1xuaW1wb3J0IENvbXBvbmVudHMgZnJvbSAndW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvdml0ZSc7XG5pbXBvcnQgeyBFbGVtZW50UGx1c1Jlc29sdmVyIH0gZnJvbSAndW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvcmVzb2x2ZXJzJztcbmltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICB2dWUoKSxcbiAgICBBdXRvSW1wb3J0KHsgcmVzb2x2ZXJzOiBbRWxlbWVudFBsdXNSZXNvbHZlcigpXSB9KSxcbiAgICBDb21wb25lbnRzKHsgcmVzb2x2ZXJzOiBbRWxlbWVudFBsdXNSZXNvbHZlcigpXSB9KSxcbiAgXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7ICdAJzogcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdzcmMnKSB9LFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTczLFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaSc6IHsgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDozMDAxJywgY2hhbmdlT3JpZ2luOiB0cnVlIH0sXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEyVixTQUFTLG9CQUFvQjtBQUN4WCxPQUFPLFNBQVM7QUFDaEIsT0FBTyxnQkFBZ0I7QUFDdkIsT0FBTyxnQkFBZ0I7QUFDdkIsU0FBUywyQkFBMkI7QUFDcEMsT0FBTyxVQUFVO0FBRWpCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLElBQUk7QUFBQSxJQUNKLFdBQVcsRUFBRSxXQUFXLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDO0FBQUEsSUFDakQsV0FBVyxFQUFFLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7QUFBQSxFQUNuRDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTyxFQUFFLEtBQUssS0FBSyxRQUFRLFFBQVEsSUFBSSxHQUFHLEtBQUssRUFBRTtBQUFBLEVBQ25EO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRLEVBQUUsUUFBUSx5QkFBeUIsY0FBYyxLQUFLO0FBQUEsSUFDaEU7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
