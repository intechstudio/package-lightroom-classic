return {
    VERSION = { major=1, minor=0, revision=0, },
    LrSdkVersion = 6.0, --required!
    LrSdkMinimumVersion = 6.0,
    LrToolkitIdentifier = "com.intechstudio.grideditor",  --required!
    LrPluginName = "Grid Editor",  --required!
    LrInitPlugin="Start.lua",
    LrForceInitPlugin  = true,
    LrShutdownApp = "Shutdown.lua",
    LrHelpMenuItems = { 
      { 
        title = 'About Grid', 
        file = 'MenuItemAbout.lua' 
      }
    },
    LrExportMenuItems = {
      {
        title = "Start",
        file = "Start.lua",
      },
      {
        title = "Stop",
        file = "Stop.lua",
      },
      {
        title = "Test",
        file = "Test.lua",
      },
    }
  }

-- return {
--     LrSdkVersion = 9.0,
--     LrPluginName = "Intech Studio Lightroom Plugin",
--     LrToolkitIdentifier = 'com.intechstudio.plugin',
--     LrPluginInfoUrl="https://intech.studio",
--     LrInitPlugin = "start.lua", -- runs when plug-in initializes (this is the main script) LrForceInitPlugin = true, -- initializes the plug-in automatically at startup.
--     LrShutdownApp = "shutdown.lua", -- tells the main script to exit and waits for it to finish. LrShutdownPlugin = "shutdown.lua",
--     LrDisablePlugin = "stop.lua", -- tells the main script to exit.
--     LrExportMenuItems = {
--         {
--             title = "Start",
--             file = "start.lua"
--         }, 
--         {
--             title = "Stop",
--             file = "stop.lua"
--         }
--     },
--     VERSION = { major=1, minor=0, revision=0 },
-- }