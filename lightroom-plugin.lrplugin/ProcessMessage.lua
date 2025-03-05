local LrLogger = import 'LrLogger'
local logger = LrLogger('GridEditor')
local LrSelection = import "LrSelection"
local LrApplicationView = import "LrApplicationView"
local LrApplication = import "LrApplication"
local LrUndo = import "LrUndo"
local LrDevelopController = import "LrDevelopController"
local LrTasks = import 'LrTasks'

local function photoTableToJsonArray(tbl)
  local jsonStr = "["
  local first = true
  for _, obj in ipairs(tbl) do
      if not first then
          jsonStr = jsonStr .. ","
      end
      first = false
      jsonStr = jsonStr .. string.format('{"id":%d,"name":"%s"}', obj.id, obj.name)
  end
  jsonStr = jsonStr .. "]"
  return jsonStr
end

local function sendCurrentActivePhoto(senderSocket)
  LrTasks.startAsyncTask(function()
    local catalog = LrApplication.activeCatalog()
    local photo = catalog:getTargetPhoto()
    local isoSpeed = photo:getFormattedMetadata("isoSpeedRating") or ""
    local aperture = photo:getFormattedMetadata("aperture") or ""
    local shutterSpeed = photo:getFormattedMetadata("shutterSpeed") or ""
    local focalLength = photo:getFormattedMetadata("focalLength") or ""
    local rating = photo:getFormattedMetadata("rating") or 0
    local flag = photo:getRawMetadata("pickStatus") or 0
    local jsonResult = '{"id":' .. photo.localIdentifier .. ',"isoSpeed":"' .. isoSpeed .. '",' .. '"aperture":"' .. aperture .. '","shutterSpeed":"' .. shutterSpeed .. '","focalLength":"' .. focalLength .. '","rating":"' .. rating .. '","flag":"' .. flag .. '"}'
    senderSocket:send('{"type":"active-photo-result","photo":'.. jsonResult .. '}\n')
  end)
end

function handleMessage(message, senderSocket)
  local command = message:match("^(.-),")
  if command == nil then
    command = message
  end
  logger:trace('COMMAND2 ' .. command)
  if command == "rating" then
    local ratingValue = message:match("^rating,%s*(.*)")
    if ratingValue == "+1" then
      LrSelection.increaseRating()
    elseif ratingValue == "-1" then
      LrSelection.decreaseRating()
    else
      LrSelection.setRating(ratingValue)
    end
    sendCurrentActivePhoto(senderSocket)
  elseif command == "flag" then
    local flagValue = message:match("^flag,%s*(.*)")
    if flagValue == "pick" then
      LrSelection.flagAsPick()
    elseif flagValue == "reject" then
      LrSelection.flagAsReject()
    elseif flagValue == "remove" then
      LrSelection.removeFlag()
    end
    sendCurrentActivePhoto(senderSocket);
  elseif command == "color" then
    local colorValue = message:match("^color,%s*(.*)")
    LrSelection.setColorLabel(colorValue)
    sendCurrentActivePhoto(senderSocket);
  elseif command == "next-photo" then
    LrSelection.nextPhoto()
    sendCurrentActivePhoto(senderSocket);
  elseif command == "previous-photo" then
    LrSelection.previousPhoto()
    sendCurrentActivePhoto(senderSocket);
  elseif command == "develop" then
    local parameterName, parameterValue = message:match("^develop,%s*(.*),%s*(.*)")
    LrDevelopController.startTracking(parameterName)
    LrApplicationView.switchToModule("develop")
    LrDevelopController.setValue(parameterName, tonumber(parameterValue))
  elseif command == "remove" then
    local parameterName, parameterValue = message:match("^remove,%s*(.*),%s*(.*)")
    if parameterName == "size" then
      local params = {
        brushSize = tonumber(parameterValue)
      }
      logger:trace('TABLE ' .. params.brushSize)
      LrTasks.startAsyncTask(function()
      local result, error = LrDevelopController.setRemovePanelPreferences(params)
      end)
    elseif parameterName == "feather" then
      local params = {
        brushFeather = tonumber(parameterValue)
      }
      logger:trace('TABLE2 ' .. params.brushFeather)
      
    LrTasks.startAsyncTask(function()
      LrDevelopController.setRemovePanelPreferences(params)
    end)
    end
  elseif command == "undo" then
    LrUndo.undo()
    sendCurrentActivePhoto(senderSocket);
  elseif command == "redo" then
    LrUndo.redo()
    sendCurrentActivePhoto(senderSocket);
  elseif command == "create-virtual" then
    LrApplication.activeCatalog():createVirtualCopies()
  elseif command == "view" then
    local viewValue = message:match("^view,%s*(.*)")
    LrApplicationView.showView(viewValue)
  elseif command == "zoom-toggle" then
    LrApplicationView.toggleZoom()
  elseif command == "zoom-in" then
    LrApplicationView.zoomIn()
  elseif command == "zoom-out" then
    LrApplicationView.zoomOut()
  elseif command == "zoom-onetoone" then
    LrApplicationView.zoomToOneToOne()
  elseif command == "copy" then
    local catalog = LrApplication.activeCatalog()
    local photo = catalog:getTargetPhoto()
    photo:copySettings()
  elseif command == "paste" then
    local catalog = LrApplication.activeCatalog()
    local photo = catalog:getTargetPhoto()
    photo:pasteSettings()
  elseif command == "reset" then
    LrDevelopController.resetAllDevelopAdjustments()
  elseif command == "selectall" then
    LrSelection.selectAll()
  elseif command == "goto-remove" then
    LrDevelopController.goToRemove()
  elseif command == "goto-mask" then
    LrDevelopController.selectTool("masking")
  elseif command == "goto-crop" then
    LrDevelopController.selectTool("crop")
  elseif command == "photos-name" then
    LrTasks.startAsyncTask(function()
      local catalog = LrApplication.activeCatalog()
      local photos = catalog:getAllPhotos()
      local returnValue = {}
      for _, photo in ipairs(photos) do
        table.insert(returnValue, { id = photo.localIdentifier, name = photo:getFormattedMetadata("fileName") })
      end
      local jsonResult = photoTableToJsonArray(returnValue) 
      senderSocket:send('{"type":"photos-name-result","result":'.. jsonResult .. '}\n')
      sendCurrentActivePhoto(senderSocket);
    end)
  end
end