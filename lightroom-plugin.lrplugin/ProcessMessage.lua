local LrLogger = import 'LrLogger'

local LrSelection = import "LrSelection"

function handleMessage(message)
  if message:find("^rating") ~= nil then
    local ratingValue = message:match("^rating,%s*(.*)")
    LrSelection.setRating(ratingValue)
  end
end