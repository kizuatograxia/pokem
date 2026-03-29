#===============================================================================
# Gives the current save file a one-time bundle of recent legendary Pokémon.
# This is meant for local testing and personal save customization.
#===============================================================================
class PokemonGlobalMetadata
  attr_accessor :recent_legendary_bundle_claimed
  attr_accessor :recent_legendary_bundle_pending

  alias recent_legendary_bundle_original_initialize initialize unless method_defined?(:recent_legendary_bundle_original_initialize)

  def initialize
    recent_legendary_bundle_original_initialize
    @recent_legendary_bundle_claimed = false
    @recent_legendary_bundle_pending = false
  end
end

module RecentLegendaryBundle
  CANDIDATES = [
    [:ZACIAN,       70],
    [:ZAMAZENTA,    70],
    [:ETERNATUS,    70],
    [:CALYREX,      70],
    [:REGIELEKI,    70],
    [:REGIDRAGO,    70],
    [:ENAMORUS,     70],
    [:KORAIDON,     75],
    [:MIRAIDON,     75],
    [:WOCHIEN,      70],
    [:CHIENPAO,     70],
    [:TINGLU,       70],
    [:CHIYU,        70],
    [:OGERPON,      70],
    [:OKIDOGI,      70],
    [:MUNKIDORI,    70],
    [:FEZANDIPITI,  70],
    [:TERAPAGOS,    75],
    [:PECHARUNT,    75]
  ].freeze

  def self.claimed?
    return false if !$PokemonGlobal
    $PokemonGlobal.recent_legendary_bundle_claimed = false if $PokemonGlobal.recent_legendary_bundle_claimed.nil?
    return $PokemonGlobal.recent_legendary_bundle_claimed
  end

  def self.pending?
    return false if !$PokemonGlobal
    $PokemonGlobal.recent_legendary_bundle_pending = false if $PokemonGlobal.recent_legendary_bundle_pending.nil?
    return $PokemonGlobal.recent_legendary_bundle_pending && !claimed?
  end

  def self.available_species
    ret = []
    CANDIDATES.each do |species, level|
      next if !GameData::Species.try_get(species)
      ret << [species, level]
    end
    return ret
  end

  def self.queue!
    return if !$PokemonGlobal || claimed?
    $PokemonGlobal.recent_legendary_bundle_pending = true
  end

  def self.grant!
    return if !$player || !$PokemonGlobal || claimed?
    $PokemonGlobal.recent_legendary_bundle_pending = false
    granted_names = []
    ran_out_of_space = false
    available_species.each do |species, level|
      if pbBoxesFull?
        ran_out_of_space = true
        break
      end
      pkmn = Pokemon.new(species, level)
      pkmn.obtain_text = _INTL("Special Delivery")
      pkmn.calc_stats
      next if !pbAddPokemonSilent(pkmn)
      granted_names << pkmn.speciesName
    end
    return if granted_names.empty?
    $PokemonGlobal.recent_legendary_bundle_claimed = true
    pbMessage(_INTL("A special delivery reached your save file."))
    pbMessage(_INTL("Recent legendary Pokémon were sent to your party and Boxes:\n{1}", granted_names.join(", ")))
    if ran_out_of_space
      pbMessage(_INTL("Some Pokémon could not be delivered because your party and Boxes are full."))
    else
      pbMessage(_INTL("Save the game after checking your party and Boxes so this delivery stays on this save file."))
    end
  end
end

EventHandlers.add(:on_enter_map, :queue_recent_legendary_bundle,
  proc { |_old_map_id|
    next if !$player || !$PokemonGlobal || RecentLegendaryBundle.claimed?
    next if !$player.name || $player.name.empty?
    RecentLegendaryBundle.queue!
  }
)

EventHandlers.add(:on_frame_update, :grant_recent_legendary_bundle,
  proc {
    next if !RecentLegendaryBundle.pending?
    next if !$scene.is_a?(Scene_Map)
    next if !$game_map
    next if $game_temp&.message_window_showing
    next if pbMapInterpreterRunning?
    RecentLegendaryBundle.grant!
  }
)
