#===============================================================================
# Gives the current save file a one-time bundle of recent legendary Pokémon.
# This is meant for local testing and personal save customization.
#===============================================================================
class PokemonGlobalMetadata
  attr_accessor :recent_legendary_bundle_claimed
  attr_accessor :recent_legendary_bundle_pending
  attr_accessor :recent_legendary_bundle_version

  alias recent_legendary_bundle_original_initialize initialize unless method_defined?(:recent_legendary_bundle_original_initialize)

  def initialize
    recent_legendary_bundle_original_initialize
    @recent_legendary_bundle_claimed = false
    @recent_legendary_bundle_pending = false
    @recent_legendary_bundle_version = 0
  end
end

module RecentLegendaryBundle
  BUNDLE_VERSION = 6

  PRIMARY_CANDIDATES = [
    [:KORAIDON,     75],
    [:MIRAIDON,     75],
    [:TERAPAGOS,    75]
  ].freeze

  FALLBACK_CANDIDATES = [
    [:MEWTWO,       75],
    [:LUGIA,        75],
    [:RAYQUAZA,     75]
  ].freeze

  def self.claimed?
    return false if !$PokemonGlobal
    $PokemonGlobal.recent_legendary_bundle_claimed = false if $PokemonGlobal.recent_legendary_bundle_claimed.nil?
    if $PokemonGlobal.recent_legendary_bundle_version.nil?
      $PokemonGlobal.recent_legendary_bundle_version = ($PokemonGlobal.recent_legendary_bundle_claimed) ? 1 : 0
    end
    return $PokemonGlobal.recent_legendary_bundle_version >= BUNDLE_VERSION
  end

  def self.pending?
    return false if !$PokemonGlobal
    $PokemonGlobal.recent_legendary_bundle_pending = false if $PokemonGlobal.recent_legendary_bundle_pending.nil?
    return $PokemonGlobal.recent_legendary_bundle_pending && !claimed?
  end

  def self.available_species
    ret = []
    PRIMARY_CANDIDATES.each do |species, level|
      next if !GameData::Species.try_get(species)
      ret << [species, level]
    end
    return ret if ret.length == PRIMARY_CANDIDATES.length
    ret = []
    FALLBACK_CANDIDATES.each do |species, level|
      next if !GameData::Species.try_get(species)
      ret << [species, level]
    end
    return ret
  end

  def self.queue!
    return if !$PokemonGlobal || claimed?
    $PokemonGlobal.recent_legendary_bundle_pending = true
  end

  def self.party_has_species?(species)
    return false if !$player || !$player.party
    return $player.party.any? { |pkmn| pkmn&.isSpecies?(species) }
  end

  def self.grant_to_party_or_storage(pkmn)
    return false if !$player
    if $player.party.length < 6
      $player.party.push(pkmn)
      $player.pokedex&.register(pkmn)
      return true
    end
    return false if pbBoxesFull?
    return pbAddPokemonSilent(pkmn)
  end

  def self.build_pokemon(species, level)
    pkmn = Pokemon.new(species, level)
    pkmn.obtain_text = _INTL("Special Delivery")
    pkmn.calc_stats
    return pkmn
  end

  def self.grant_immediately!(show_messages = false)
    return [] if !$player
    $PokemonGlobal.recent_legendary_bundle_pending = false if $PokemonGlobal
    granted_names = []
    ran_out_of_space = false
    available_species.each do |species, level|
      next if party_has_species?(species)
      if pbBoxesFull? && $player.party.length >= 6
        ran_out_of_space = true
        break
      end
      pkmn = build_pokemon(species, level)
      next if !grant_to_party_or_storage(pkmn)
      granted_names << pkmn.speciesName
    end
    return [] if granted_names.empty?
    if $PokemonGlobal
      $PokemonGlobal.recent_legendary_bundle_claimed = true
      $PokemonGlobal.recent_legendary_bundle_version = BUNDLE_VERSION
    end
    if show_messages
      pbMessage(_INTL("A special delivery reached your save file."))
      pbMessage(_INTL("Three legendary Pokémon were sent to your party and Boxes:\n{1}", granted_names.join(", ")))
      if ran_out_of_space
        pbMessage(_INTL("Some Pokémon could not be delivered because your party and Boxes are full."))
      else
        pbMessage(_INTL("Save the game after checking your party and Boxes so this delivery stays on this save file."))
      end
    end
    return granted_names
  end

  def self.grant!
    grant_immediately!(true)
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
