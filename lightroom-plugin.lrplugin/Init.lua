local LrDialogs = import 'LrDialogs'
local LrTasks = import 'LrTasks'

local LrLogger = import 'LrLogger'
local logger = LrLogger('HelloWorldPlugin')
logger:enable("print")
local log = logger:quickf('info')

log("whaterver")

-- Function to show a dialog box
local function showDialog()
    LrDialogs.message("Hello! The plugin has been loaded or reloaded.")
end

-- Automatically call the function in a background task
LrTasks.startAsyncTask(function()
    showDialog()
end)

