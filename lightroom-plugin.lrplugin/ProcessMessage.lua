local LrLogger = import 'LrLogger'
local logger = LrLogger('GridEditor')
local LrSelection = import "LrSelection"
local LrDevelopController = import "LrDevelopController"

function handleMessage(message)
  local command = message:match("^(.-),")
  if command == nil then
    command = message
  end
  logger:trace('COMMAND ' .. command)
  if command == "rating" then
    local ratingValue = message:match("^rating,%s*(.*)")
    if ratingValue == "+1" then
      LrSelection.increaseRating()
    elseif ratingValue == "-1" then
      LrSelection.decreaseRating()
    else
      LrSelection.setRating(ratingValue)
    end
  elseif command == "flag" then
    local flagValue = message:match("^flag,%s*(.*)")
    if flagValue == "pick" then
      LrSelection.flagAsPick()
    elseif flagValue == "reject" then
      LrSelection.flagAsReject()
    elseif flagValue == "remove" then
      LrSelection.removeFlag()
    end
  elseif command == "color" then
    local colorValue = message:match("^color,%s*(.*)")
    LrSelection.setColorLabel(colorValue)
  elseif command == "next-photo" then
    LrSelection.nextPhoto()
  elseif command == "previous-photo" then
    LrSelection.previousPhoto()
  elseif command == "develop" then
    local parameterName, parameterValue = message:match("^develop,%s*(.*),%s*(.*)")
    LrDevelopController.startTracking(parameterName)
    LrDevelopController.setValue(parameterName, tonumber(parameterValue))
  end
end