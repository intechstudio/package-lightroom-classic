Read the following article to get a general overview:
https://akrabat.com/writing-a-lightroom-classic-plug-in/

1. Created a folder with `.lrplugin` extension, this is required for Lightroom Classic, so plugin can be installed.

> NOTE: In macOS, the suffix .lrplugin creates a package, which looks like a single file. For convenience, you can use the |suffix .lrdevplugin during development, and change the extension to .lrplugin for delivery. The .lrdevplugin suffix is recognized by Lightroom Classic but does not trigger the package behavior in the macOS Finder.

2. DEPRECIATED: LrController -> LrDevelopController & LrSelection (rating)
3. "print" debugging -> Under macOS, use console with filter for Lightroom process to view debug messages
4. Dubug on windows -> page 190 in SDK guide, windbg
5. Automatic plugin load -> page 30 in SDK guide
