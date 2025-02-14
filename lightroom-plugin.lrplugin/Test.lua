local LrApplication = import "LrApplication"
local LrTasks = import "LrTasks"
local LrDialogs = import "LrDialogs"
local LrFunctionContext = import "LrFunctionContext"

local function setRating()
    local catalog = LrApplication.activeCatalog()
    local activePhoto = catalog:getTargetPhoto()

    if not activePhoto then
        LrDialogs.message("No active photo selected.", "Please select a photo and try again.", "info")
        return
    end

    -- Run in the main thread using a function context
    LrFunctionContext.callWithContext("Set Photo Rating", function(context)
        catalog:withWriteAccessDo("Set Rating", function()
            activePhoto:setRawMetadata("rating", 3) -- Set rating to 3 stars
        end)
    end)

    LrDialogs.message("Rating Updated!", "The rating has been set to 3 stars.", "info")
end

LrTasks.startAsyncTask(function()
    setRating()
end)