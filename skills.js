// Skill data, keyed by class. Icons live at assets/icons/<id>.png (full) and
// assets/icons/<id>_shard.png (shard). `label` uses \n where the game wraps.
window.SKILLS = {
  sage: {
    full: [
      { id: 'weakening_hex',       name: 'Weakening Hex',       label: 'Weakening\nHex',        rarity: 'rare' },
      { id: 'radiant_restoration', name: 'Radiant Restoration', label: 'Radiant\nRestoration',  rarity: 'rare' },
      { id: 'unstable_aura',       name: 'Unstable Aura',       label: 'Unstable Aura',         rarity: 'rare' },
      { id: 'heart_of_flame',      name: 'Heart of Flame',      label: 'Heart of\nFlame',       rarity: 'rare' },
      { id: 'water_shot',          name: 'Water Shot',          label: 'Water Shot',            rarity: 'rare' },
      { id: 'flame_jet',           name: 'Flame Jet',           label: 'Flame Jet',             rarity: 'rare' },
      { id: 'healing_mastery',     name: 'Healing Mastery',     label: 'Healing\nMastery',      rarity: 'rare' },
      { id: 'elemental_mystery',   name: 'Elemental Mystery',   label: 'Elemental\nMystery',    rarity: 'rare' },
      { id: 'iron_thorn',          name: 'Iron Thorn',          label: 'Iron Thorn',            rarity: 'rare' },
      { id: 'winds_whisper',       name: "Wind's Whisper",      label: "Wind's\nWhisper",       rarity: 'rare' },
      { id: 'dews_blessing',       name: "Dew's Blessing",      label: "Dew's Blessing",        rarity: 'rare' },
      { id: 'ice_spike',           name: 'Ice Spike',           label: 'Ice Spike',             rarity: 'rare' },
      { id: 'cyclone',             name: 'Cyclone',             label: 'Cyclone',               rarity: 'epic' },
      { id: 'stonechief_summon',   name: 'Stonechief Summon',   label: 'Stonechief\nSummon',    rarity: 'epic' },
      { id: 'curse_resonance',     name: 'Curse Resonance',     label: 'Curse\nResonance',      rarity: 'epic' },
      { id: 'tough_soul',          name: 'Tough Soul',          label: 'Tough Soul',            rarity: 'epic' },
      { id: 'elemental_body',      name: 'Elemental Body',      label: 'Elemental\nBody',       rarity: 'epic' },
      { id: 'shadow_erosion',      name: 'Shadow Erosion',      label: 'Shadow\nErosion',       rarity: 'epic' },
      { id: 'soul_spark',          name: 'Soul Spark',          label: 'Soul Spark',            rarity: 'epic' },
      { id: 'soul_impact',         name: 'Soul Impact',         label: 'Soul Impact',           rarity: 'legendary' },
      { id: 'water_to_ice',        name: 'Water to Ice',        label: 'Water to Ice',          rarity: 'legendary' },
      { id: 'blazing_fire_ring',   name: 'Blazing Fire Ring',   label: 'Blazing Fire\nRing',    rarity: 'legendary' },
    ],
    shards: [
      { id: 'tempest_sphere',    label: 'Tempest\nSphere Shard' },
      { id: 'winds_whisper',     label: "Wind's\nWhisper Shard" },
      { id: 'shadow_impact',     label: 'Shadow\nImpact Shard' },
      { id: 'unstable_aura',     label: 'Unstable Aura\nShard' },
      { id: 'heart_of_flame',    label: 'Heart of\nFlame Shard' },
      { id: 'water_to_ice',      label: 'Water to Ice\nShard' },
      { id: 'healing_touch',     label: 'Healing Touch\nShard' },
      { id: 'elemental_mystery', label: 'Elemental\nMystery Shard' },
      { id: 'gale_shield',       label: 'Gale Shield\nShard' },
      { id: 'insight',           label: 'Insight Shard' },
      { id: 'void_blessing',     label: 'Void Blessing\nShard' },
      { id: 'fireball',          label: 'Fireball Shard' },
      { id: 'treantling_summon', label: 'Treantling\nSummon Shard' },
      { id: 'mana_surge',        label: 'Mana Surge\nShard' },
      { id: 'curse_resonance',   label: 'Curse Resonance\nShard' },
      { id: 'flaming_path',      label: 'Flaming Path\nShard' },
      { id: 'dark_bullet',       label: 'Dark Bullet\nShard' },
      { id: 'flame_jet',         label: 'Flame Jet\nShard' },
      { id: 'flame_wolf_summon', label: 'Flame Wolf\nSummon Shard' },
      { id: 'dews_blessing',     label: "Dew's Blessing\nShard" },
      { id: 'water_assault',     label: 'Water Assault\nShard' },
      { id: 'tough_soul',        label: 'Tough Soul\nShard' },
      { id: 'stonechief_summon', label: 'Stonechief\nSummon Shard' },
      { id: 'cyclone',           label: 'Cyclone Shard' },
      { id: 'shadow_erosion',    label: 'Shadow\nErosion Shard' },
      { id: 'resurrection',      label: 'Resurrection\nShard' },
      { id: 'blazing_fire_ring', label: 'Blazing Fire\nRing Shard' },
    ],
  },
};

// The exact 100 results from sage_skill_100.MP4, in pull order (used by ?replay=video).
// f: = full skill, s: = shard.
window.VIDEO_REPLAY = `
s:tempest_sphere f:weakening_hex s:winds_whisper
s:shadow_impact s:unstable_aura s:heart_of_flame
f:radiant_restoration f:cyclone s:heart_of_flame
s:water_to_ice f:unstable_aura f:heart_of_flame
s:healing_touch f:water_shot s:tempest_sphere
f:flame_jet s:shadow_impact s:elemental_mystery
f:healing_mastery f:heart_of_flame s:tempest_sphere
f:soul_impact s:gale_shield f:stonechief_summon
s:insight f:healing_mastery s:void_blessing
s:water_to_ice f:curse_resonance s:fireball
f:elemental_mystery f:tough_soul s:treantling_summon
s:mana_surge f:iron_thorn s:dews_blessing
s:curse_resonance s:flaming_path f:elemental_mystery
s:dark_bullet f:weakening_hex f:heart_of_flame
s:flame_jet s:water_to_ice s:treantling_summon
s:flame_wolf_summon f:heart_of_flame s:shadow_impact
s:gale_shield s:elemental_mystery f:curse_resonance
s:dark_bullet s:winds_whisper s:dark_bullet
f:winds_whisper f:dews_blessing s:water_assault
s:heart_of_flame f:elemental_body s:tough_soul
s:stonechief_summon f:ice_spike f:weakening_hex
s:stonechief_summon f:stonechief_summon s:cyclone
s:stonechief_summon s:dark_bullet f:water_to_ice
s:shadow_erosion f:ice_spike f:ice_spike
f:flame_jet f:shadow_erosion f:water_shot
f:winds_whisper s:resurrection s:blazing_fire_ring
s:tempest_sphere s:healing_touch f:weakening_hex
f:healing_mastery f:elemental_mystery s:heart_of_flame
s:fireball f:unstable_aura s:flame_jet
f:soul_spark s:flame_wolf_summon s:curse_resonance
f:blazing_fire_ring s:shadow_erosion s:shadow_erosion
s:insight s:flaming_path f:weakening_hex
f:cyclone f:healing_mastery f:iron_thorn
s:flame_jet
`.trim().split(/\s+/);
