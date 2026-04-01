# Resultado OpenClaw — importação assets PKE + Gen9

## Arquivos copiados por tarefa (robocopy — coluna Copied de "Files :")
- Tarefa 1 — Fontes PKE: 8
- Tarefa 2.1 — Pokemon Front: 1576
- Tarefa 2.2 — Pokemon Front shiny: 1575
- Tarefa 2.3 — Pokemon Back: 1566
- Tarefa 2.4 — Pokemon Back shiny: 1566
- Tarefa 2.5 — Pokemon Icons: 1460
- Tarefa 2.6 — Pokemon Icons shiny: 1433
- Tarefa 2.7 — Pokemon Shadow: N/A
- Tarefa 2.8 — Pokemon Eggs: 4
- Tarefa 2.9 — Pokemon Footprints: 131
- Tarefa 3 — Items Gen9: 807
- Tarefa 4.1 — Followers: 1375
- Tarefa 4.2 — Followers shiny: 1362

## windowskin-refs.txt (primeiras 30 linhas)
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\001_Settings.rb:380:  # Available speech frames. These are graphic files in "Graphics/Windowskins/".
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\001_Settings.rb:381:  SPEECH_WINDOWSKINS = [
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\001_Settings.rb:405:  # Available menu frames. These are graphic files in "Graphics/Windowskins/".
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\001_Settings.rb:406:  MENU_WINDOWSKINS = [
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\003_Game processing\004_Interpreter_Commands.rb:48:    when 131 then return command_131   # Change Windowskin
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\003_Game processing\004_Interpreter_Commands.rb:669:  # * Change Windowskin
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\003_Game processing\004_Interpreter_Commands.rb:672:    Settings::SPEECH_WINDOWSKINS.length.times do |i|
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\003_Game processing\004_Interpreter_Commands.rb:673:      next if Settings::SPEECH_WINDOWSKINS[i] != @parameters[0]
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\003_Game processing\004_Interpreter_Commands.rb:675:      MessageConfig.pbSetSpeechFrame("Graphics/Windowskins/" + Settings::SPEECH_WINDOWSKINS[i])
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\004_Game classes\002_Game_System.rb:267:  def windowskin_name
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\004_Game classes\002_Game_System.rb:268:    return $data_system.windowskin_name if @windowskin_name.nil?
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\004_Game classes\002_Game_System.rb:269:    return @windowskin_name
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\004_Game classes\002_Game_System.rb:272:  attr_writer :windowskin_name
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:37:      return pbResolveBitmap("Graphics/Windowskins/" + Settings::MENU_WINDOWSKINS[$PokemonSystem.frame]) || ""
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:39:      return pbResolveBitmap("Graphics/Windowskins/" + Settings::MENU_WINDOWSKINS[0]) || ""
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:45:      return pbResolveBitmap("Graphics/Windowskins/" + Settings::SPEECH_WINDOWSKINS[$PokemonSystem.textskin]) || ""
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:47:      return pbResolveBitmap("Graphics/Windowskins/" + Settings::SPEECH_WINDOWSKINS[0]) || ""
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:51:  def self.pbDefaultWindowskin
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:52:    skin = ($data_system) ? $data_system.windowskin_name : nil
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:54:      skin = pbResolveBitmap("Graphics/Windowskins/" + skin) || ""
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:57:    skin = pbResolveBitmap("Graphics/Windowskins/001-Blue01") if nil_or_empty?(skin)
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:64:      skin = MessageConfig.pbDefaultWindowskin if nil_or_empty?(skin)
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:73:      skin = MessageConfig.pbDefaultWindowskin if nil_or_empty?(skin)
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:316:def isDarkWindowskin(windowskin)
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:317:  return true if !windowskin || windowskin.disposed?
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:318:  if windowskin.width == 192 && windowskin.height == 128
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:319:    return isDarkBackground(windowskin, Rect.new(0, 0, 128, 128))
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:320:  elsif windowskin.width == 128 && windowskin.height == 128
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:321:    return isDarkBackground(windowskin, Rect.new(0, 0, 64, 64))
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:322:  elsif windowskin.width == 96 && windowskin.height == 48

## font-refs.txt (primeiras 40 linhas)
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:13:  FONT_NAME                = "Power Green"
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:14:  FONT_SIZE                = 27
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:16:  SMALL_FONT_NAME          = "Power Green Small"
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:17:  SMALL_FONT_SIZE          = 21
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:19:  NARROW_FONT_NAME         = "Power Green Narrow"
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:20:  NARROW_FONT_SIZE         = 27
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:117:    return MessageConfig.pbTryFonts(FONT_NAME)
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:121:    return MessageConfig.pbTryFonts(SMALL_FONT_NAME)
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:125:    return MessageConfig.pbTryFonts(NARROW_FONT_NAME)
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:417:  bitmap.font.size = MessageConfig::FONT_SIZE
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:424:  bitmap.font.size = MessageConfig::SMALL_FONT_SIZE
C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\007_Objects and windows\002_MessageConfig.rb:431:  bitmap.font.size = MessageConfig::NARROW_FONT_SIZE
