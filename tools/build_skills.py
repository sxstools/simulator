#!/usr/bin/env python3
"""Build skills.js from the lootandwaifus skills.json plus rarities and the class tree.

Usage: python3 tools/build_skills.py [path/to/skills.json]

- Skill names, classes and icons: lootandwaifus.com skills.json (tools/skills.json).
- Rarity ("quality" Blue/Purple/Orange) and the class tree: tools/sxs_overview.json, saved from
  https://0xnobodyyt.github.io/sxs-loadout-builder/data.js (the data behind sxs-skills-overview).
- Monster skills are skipped (they aren't part of class prayers).
- Rarity, labels and icons cut from sage_skill_100.MP4 (VIDEO_SKILLS below) take priority.
- Other skills use assets/skills/skill_<id>.png, downloaded from
  https://lootandwaifus.com/skills/swordxstaff/skill_<id>.png
"""
import json
import sys

QUALITY_TO_RARITY = {'Blue': 'rare', 'Purple': 'epic', 'Orange': 'legendary'}

# Dropdown order: base class, then each line in advancement order.
CLASS_ORDER = [
    'Mage', 'Sorcerer', 'Archmage', 'Destroyer', 'Magister', 'Arcanarch', 'Thaumaturge',
    'Sage', 'Arcanist', 'Dominator', 'Prophet', 'Hierarch', 'Demiurge',
    'Warrior', 'Duelist', 'Berserker', 'Conqueror', 'Ravager', 'Marauder', 'Doomreaver',
    'Knight', 'Paladin', 'Guardian', 'Templar', 'Justicar', 'Vindicator',
]

# From the video: slug -> (rarity or None, full label, shard label, has full crop, has shard crop)
VIDEO_SKILLS = {
    'Weakening Hex': ('weakening_hex', 'rare', 'Weakening\nHex', None),
    'Radiant Restoration': ('radiant_restoration', 'rare', 'Radiant\nRestoration', None),
    'Unstable Aura': ('unstable_aura', 'rare', 'Unstable Aura', 'Unstable Aura\nShard'),
    'Heart of Flame': ('heart_of_flame', 'rare', 'Heart of\nFlame', 'Heart of\nFlame Shard'),
    'Water Shot': ('water_shot', 'rare', 'Water Shot', None),
    'Flame Jet': ('flame_jet', 'rare', 'Flame Jet', 'Flame Jet\nShard'),
    'Healing Mastery': ('healing_mastery', 'rare', 'Healing\nMastery', None),
    'Elemental Mystery': ('elemental_mystery', 'rare', 'Elemental\nMystery', 'Elemental\nMystery Shard'),
    'Iron Thorn': ('iron_thorn', 'rare', 'Iron Thorn', None),
    "Wind's Whisper": ('winds_whisper', 'rare', "Wind's\nWhisper", "Wind's\nWhisper Shard"),
    "Dew's Blessing": ('dews_blessing', 'rare', "Dew's Blessing", "Dew's Blessing\nShard"),
    'Ice Spike': ('ice_spike', 'rare', 'Ice Spike', None),
    'Cyclone': ('cyclone', 'epic', 'Cyclone', 'Cyclone Shard'),
    'Stonechief Summon': ('stonechief_summon', 'epic', 'Stonechief\nSummon', 'Stonechief\nSummon Shard'),
    'Curse Resonance': ('curse_resonance', 'epic', 'Curse\nResonance', 'Curse Resonance\nShard'),
    'Tough Soul': ('tough_soul', 'epic', 'Tough Soul', 'Tough Soul\nShard'),
    'Elemental Body': ('elemental_body', 'epic', 'Elemental\nBody', None),
    'Shadow Erosion': ('shadow_erosion', 'epic', 'Shadow\nErosion', 'Shadow\nErosion Shard'),
    'Soul Spark': ('soul_spark', 'epic', 'Soul Spark', None),
    'Soul Impact': ('soul_impact', 'legendary', 'Soul Impact', None),
    'Water to Ice': ('water_to_ice', 'legendary', 'Water to Ice', 'Water to Ice\nShard'),
    'Blazing Fire Ring': ('blazing_fire_ring', 'legendary', 'Blazing Fire\nRing', 'Blazing Fire\nRing Shard'),
    # Seen only as shards (rarity unknown):
    'Tempest Sphere': ('tempest_sphere', None, None, 'Tempest\nSphere Shard'),
    'Shadow Impact': ('shadow_impact', None, None, 'Shadow\nImpact Shard'),
    'Healing Touch': ('healing_touch', None, None, 'Healing Touch\nShard'),
    'Gale Shield': ('gale_shield', None, None, 'Gale Shield\nShard'),
    'Insight': ('insight', None, None, 'Insight Shard'),
    'Void Blessing': ('void_blessing', None, None, 'Void Blessing\nShard'),
    'Fireball': ('fireball', None, None, 'Fireball Shard'),
    'Treantling Summon': ('treantling_summon', None, None, 'Treantling\nSummon Shard'),
    'Mana Surge': ('mana_surge', None, None, 'Mana Surge\nShard'),
    'Flaming Path': ('flaming_path', None, None, 'Flaming Path\nShard'),
    'Dark Bullet': ('dark_bullet', None, None, 'Dark Bullet\nShard'),
    'Flame Wolf Summon': ('flame_wolf_summon', None, None, 'Flame Wolf\nSummon Shard'),
    'Water Assault': ('water_assault', None, None, 'Water Assault\nShard'),
    'Resurrection': ('resurrection', None, None, 'Resurrection\nShard'),
}


def main(path):
    src = [s for s in json.load(open(path, encoding='utf-8')) if s['class'] != 'Monster']
    overview = json.load(open('tools/sxs_overview.json', encoding='utf-8'))
    CLASS_PARENT = {p['name']: p['previous'] for p in overview['professions']}
    quality = overview['quality']
    missing = sorted({s['class'] for s in src} - set(CLASS_PARENT))
    if missing:
        sys.exit(f'Classes missing from the class tree: {missing}')

    # Sanity checks: each class's pool (own + ancestors) must match the overview's skill list,
    # and video rarities must agree with the overview's.
    for p in overview['professions']:
        path = []
        c = p['name']
        while c:
            path.append(c)
            c = CLASS_PARENT[c]
        mine = {str(s['id']) for s in src if s['class'] in path}
        if mine != {str(x) for x in p['skills']}:
            sys.exit(f"Pool mismatch for {p['name']}")

    skills = []
    for s in sorted(src, key=lambda s: (CLASS_ORDER.index(s['class']), s['name'])):
        v = VIDEO_SKILLS.get(s['name'])
        slug, video_rarity, label, shard_label = v if v else (None, None, None, None)
        rarity = QUALITY_TO_RARITY.get(quality.get(str(s['id'])))
        if video_rarity and video_rarity != rarity:
            sys.exit(f"Rarity mismatch for {s['name']}: video {video_rarity}, overview {rarity}")
        skills.append({
            'id': s['id'],
            'name': s['name'],
            'cls': s['class'],
            'type': s['type'],
            'rarity': rarity,
            'slug': slug,
            # Video crops include the game's ring; downloaded art gets its ring from CSS.
            'icon': f'assets/icons/{slug}.png' if label else f'assets/skills/skill_{s["id"]}.png',
            'framed': bool(label),
            'shardIcon': f'assets/icons/{slug}_shard.png' if shard_label else None,
            'label': label,
            'shardLabel': shard_label,
        })

    out = [
        '// Generated by tools/build_skills.py from lootandwaifus.com skills.json. Do not edit by hand.',
        '// Rarity and class tree from 0xnobodyyt.github.io sxs-skills-overview. Monster skills are excluded.',
        f'window.CLASS_PARENT = {json.dumps(CLASS_PARENT, indent=2)};',
        f'window.CLASS_ORDER = {json.dumps(CLASS_ORDER)};',
        'window.SKILL_DB = [',
        *[f'  {json.dumps(s, ensure_ascii=False)},' for s in skills],
        '];',
        '',
    ]
    replay = open('tools/video_replay.txt', encoding='utf-8').read().split()
    out += [
        '// The exact 100 results from sage_skill_100.MP4 (?replay=video). f: = full skill, s: = shard; slug ids.',
        f'window.VIDEO_REPLAY = {json.dumps(replay)};',
        '',
    ]
    open('skills.js', 'w', encoding='utf-8').write('\n'.join(out))
    counts = {r: sum(1 for s in skills if s['rarity'] == r) for r in QUALITY_TO_RARITY.values()}
    missing_rarity = [s['name'] for s in skills if not s['rarity']]
    print(f'{len(skills)} skills across {len(CLASS_ORDER)} classes; {counts}; missing rarity: {missing_rarity}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'tools/skills.json')
