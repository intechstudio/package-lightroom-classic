local LrDialogs = import 'LrDialogs'
local LrTasks = import 'LrTasks'

local LrSocket = import "LrSocket"
local LrLogger = import 'LrLogger'
local LrFunctionContext = import "LrFunctionContext"
local logger = LrLogger('GridEditor')
logger:enable("logfile")
logger:trace('9')

require 'ProcessMessage'

local receiverSocket
local receiverPort = 23110
local receiverConnected = false
local receiverPortFilePath
local receiverShutdown = false

local function createReceiverSocket(context)
  if receiverSocket ~= nil then
    return
  end
  logger:trace('Creating receiver socket')
  receiverSocket = LrSocket.bind
  {
    functionContext = context,
    address = "127.0.0.1",
    port = receiverPort,
    mode = "receive",
    plugin = _PLUGIN,
    onConnecting = function(socket, port)
      logger:trace('Receiver socket connecting: ' .. port)
    end,
    onConnected = function(socket, port)
      logger:trace('Receiver socket connected: ' .. port)
      receiverConnected = true
      --createSenderSocket(context)
    end,
    onClosed = function(socket)
      logger:trace('Receiver socket closed: ' .. receiverPort)
      receiverConnected = false

      --senderSocket:close()
      if _G.running then
        receiverSocket:reconnect()
      end
    end,
    onError = function(socket, err)
      receiverConnected = false

      logger:trace('Receiver socket %d error: %s', receiverPort, err)

      if _G.running then
        receiverSocket:reconnect()
      end
    end,

    onMessage = function(socket, message)
      handleMessage(message)
    end,
  }
  return
end

local senderSocket
local senderPort = 23111
local senderConnected = false

local function createSenderSocket(context)
  if senderSocket ~= nil then
    return
  end
  logger:trace("Creating sender socket")

  senderSocket = LrSocket.bind
  {
      functionContext = context,
      port = senderPort,
      mode = "send",
      plugin = _PLUGIN,
      onConnecting = function(socket, port)
        logger:trace('Sender socket connecting: ' .. port)
      end,
      onConnected = function(socket, port)
        logger:trace('Sender socket connected: ' .. port)
        senderConnected = true
      end,
      onClosed = function(socket)
        logger:trace('Sender socket closed: ' .. senderPort)
        senderConnected = false
        if _G.running then
          socket:reconnect()
        end
      end,
      onError = function(socket, err)
        logger:trace('Sender socket %d error: %s', senderPort, err)
        senderConnected = false

        if string.sub(err, 1, string.len("failed to open")) == "failed to open" then
          LrDialogs.showError("Plugin cannot connect to Editor!")
          return
        end
        if _G.running then
          socket:reconnect()
        end
      end,
  }
  return senderSocket
end

-- Automatically call the function in a background task
LrTasks.startAsyncTask(function()
  LrFunctionContext.callWithContext('grideditor', function(context)
    _G.running = true
    createReceiverSocket(context)
    createSenderSocket(context)
    while _G.running do 
      if senderConnected then
        senderSocket:send("Hello from Lightroom")
      end
      LrTasks.sleep(0.5)
    end
    _G.shutdown = true
  end)
end)

