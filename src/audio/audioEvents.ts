export enum AudioEvent {
  // Music (looping)
  MUSIC_FLOORS_1_3 = 'MUSIC_FLOORS_1_3',
  MUSIC_FLOORS_4_6 = 'MUSIC_FLOORS_4_6',
  MUSIC_FLOORS_7_PLUS = 'MUSIC_FLOORS_7_PLUS',
  MUSIC_MENU = 'MUSIC_MENU',
  MUSIC_COMBAT = 'MUSIC_COMBAT',
  MUSIC_BOSS = 'MUSIC_BOSS',

  // Stingers (one-shot)
  STINGER_FLOOR_CLEAR = 'STINGER_FLOOR_CLEAR',
  STINGER_GAME_OVER = 'STINGER_GAME_OVER',
  STINGER_FLOOR_DESCENT = 'STINGER_FLOOR_DESCENT',

  // Player movement
  FOOTSTEP = 'FOOTSTEP',
  BREATHING_IDLE = 'BREATHING_IDLE',
  BREATHING_ACTIVE = 'BREATHING_ACTIVE',
  BREATHING_LOW_HP = 'BREATHING_LOW_HP',

  // Player combat
  SWORD_SWING = 'SWORD_SWING',
  SWORD_HIT = 'SWORD_HIT',
  SWORD_MISS = 'SWORD_MISS',
  PLAYER_HURT = 'PLAYER_HURT',
  PLAYER_DEATH = 'PLAYER_DEATH',
  HEARTBEAT = 'HEARTBEAT',

  // Skeleton
  SKELETON_FOOTSTEP = 'SKELETON_FOOTSTEP',
  SKELETON_RATTLE_IDLE = 'SKELETON_RATTLE_IDLE',
  SKELETON_AGGRO = 'SKELETON_AGGRO',
  SKELETON_ATTACK = 'SKELETON_ATTACK',
  SKELETON_HIT = 'SKELETON_HIT',
  SKELETON_DEATH = 'SKELETON_DEATH',
  SKELETON_AMBIENT_NEARBY = 'SKELETON_AMBIENT_NEARBY',

  // Environment
  WATER_DRIP = 'WATER_DRIP',
  WIND_DRAFT = 'WIND_DRAFT',
  STONE_CREAK = 'STONE_CREAK',
  DISTANT_RUMBLE = 'DISTANT_RUMBLE',
  CHAINS_RATTLE = 'CHAINS_RATTLE',
  TORCH_CRACKLE = 'TORCH_CRACKLE',
  TORCH_FLARE = 'TORCH_FLARE',

  // UI
  MENU_HOVER = 'MENU_HOVER',
  MENU_SELECT = 'MENU_SELECT',
  MENU_BACK = 'MENU_BACK',
  BLUEPRINT_FOUND = 'BLUEPRINT_FOUND',
  ITEM_PICKUP = 'ITEM_PICKUP',
  STAIRS_FOUND = 'STAIRS_FOUND',
  SCORE_TICK = 'SCORE_TICK',
  HEALTH_WARNING_PULSE = 'HEALTH_WARNING_PULSE',
  FLOOR_TRANSITION = 'FLOOR_TRANSITION',

  // Projectiles
  PROJECTILE_FIRE = 'PROJECTILE_FIRE',
  PROJECTILE_HIT = 'PROJECTILE_HIT',

  // Doors
  DOOR_LOCK = 'DOOR_LOCK',
  DOOR_UNLOCK = 'DOOR_UNLOCK',

  // Boss
  BOSS_ROAR = 'BOSS_ROAR',

  // Forge
  FORGE_COMPLETE = 'FORGE_COMPLETE',
}

export interface SoundDef {
  paths: string[];
  volume: number;
  loop: boolean;
}

export const SOUND_MANIFEST: Record<AudioEvent, SoundDef> = {
  // ── Music (looping, volume 0.4) ────────────────────────────────────
  [AudioEvent.MUSIC_FLOORS_1_3]: {
    paths: ['/audio/wav/music/01_dungeon_ambient_floors1-3.wav'],
    volume: 0.4,
    loop: true,
  },
  [AudioEvent.MUSIC_FLOORS_4_6]: {
    paths: ['/audio/wav/music/02_dungeon_deep_floors4-6.wav'],
    volume: 0.4,
    loop: true,
  },
  [AudioEvent.MUSIC_FLOORS_7_PLUS]: {
    paths: ['/audio/wav/music/03_dungeon_abyss_floors7plus.wav'],
    volume: 0.4,
    loop: true,
  },
  [AudioEvent.MUSIC_MENU]: {
    paths: ['/audio/wav/music/04_menu_theme.wav'],
    volume: 0.4,
    loop: true,
  },
  [AudioEvent.MUSIC_COMBAT]: {
    paths: ['/audio/wav/music/05_combat_tension.wav'],
    volume: 0.4,
    loop: true,
  },
  [AudioEvent.MUSIC_BOSS]: {
    paths: ['/audio/wav/music/06_boss_fight.wav'],
    volume: 0.4,
    loop: true,
  },

  // ── Stingers (one-shot, volume 0.7) ───────────────────────────────
  [AudioEvent.STINGER_FLOOR_CLEAR]: {
    paths: ['/audio/wav/stingers/07_floor_clear.wav'],
    volume: 0.7,
    loop: false,
  },
  [AudioEvent.STINGER_GAME_OVER]: {
    paths: ['/audio/wav/stingers/08_game_over.wav'],
    volume: 0.7,
    loop: false,
  },
  [AudioEvent.STINGER_FLOOR_DESCENT]: {
    paths: ['/audio/wav/stingers/09_floor_descent.wav'],
    volume: 0.7,
    loop: false,
  },

  // ── Player movement ───────────────────────────────────────────────
  [AudioEvent.FOOTSTEP]: {
    paths: [
      '/audio/wav/player/10_footstep_stone_var1.wav',
      '/audio/wav/player/10_footstep_stone_var2.wav',
      '/audio/wav/player/10_footstep_stone_var3.wav',
      '/audio/wav/player/10_footstep_stone_var4.wav',
    ],
    volume: 0.6,
    loop: false,
  },
  [AudioEvent.BREATHING_IDLE]: {
    paths: ['/audio/wav/player/12_breathing_idle.wav'],
    volume: 0.3,
    loop: true,
  },
  [AudioEvent.BREATHING_ACTIVE]: {
    paths: ['/audio/wav/player/13_breathing_active.wav'],
    volume: 0.35,
    loop: true,
  },
  [AudioEvent.BREATHING_LOW_HP]: {
    paths: ['/audio/wav/player/14_breathing_low_hp.wav'],
    volume: 0.5,
    loop: true,
  },

  // ── Player combat ─────────────────────────────────────────────────
  [AudioEvent.SWORD_SWING]: {
    paths: ['/audio/wav/player/15_sword_swing.wav'],
    volume: 0.7,
    loop: false,
  },
  [AudioEvent.SWORD_HIT]: {
    paths: ['/audio/wav/player/16_sword_hit_flesh.wav'],
    volume: 0.8,
    loop: false,
  },
  [AudioEvent.SWORD_MISS]: {
    paths: ['/audio/wav/player/17_sword_miss.wav'],
    volume: 0.6,
    loop: false,
  },
  [AudioEvent.PLAYER_HURT]: {
    paths: [
      '/audio/wav/player/18_player_hurt_var1.wav',
      '/audio/wav/player/18_player_hurt_var2.wav',
      '/audio/wav/player/18_player_hurt_var3.wav',
    ],
    volume: 0.7,
    loop: false,
  },
  [AudioEvent.PLAYER_DEATH]: {
    paths: ['/audio/wav/player/19_player_death.wav'],
    volume: 0.8,
    loop: false,
  },
  [AudioEvent.HEARTBEAT]: {
    paths: ['/audio/wav/player/20_heartbeat_low_hp.wav'],
    volume: 0.5,
    loop: true,
  },

  // ── Skeleton ──────────────────────────────────────────────────────
  [AudioEvent.SKELETON_FOOTSTEP]: {
    paths: [
      '/audio/wav/skeleton/21_bone_footstep_var1.wav',
      '/audio/wav/skeleton/21_bone_footstep_var2.wav',
      '/audio/wav/skeleton/21_bone_footstep_var3.wav',
    ],
    volume: 0.6,
    loop: false,
  },
  [AudioEvent.SKELETON_RATTLE_IDLE]: {
    paths: ['/audio/wav/skeleton/22_bone_rattle_idle.wav'],
    volume: 0.3,
    loop: true,
  },
  [AudioEvent.SKELETON_AGGRO]: {
    paths: ['/audio/wav/skeleton/24_skeleton_aggro.wav'],
    volume: 0.7,
    loop: false,
  },
  [AudioEvent.SKELETON_ATTACK]: {
    paths: ['/audio/wav/skeleton/23_skeleton_attack.wav'],
    volume: 0.7,
    loop: false,
  },
  [AudioEvent.SKELETON_HIT]: {
    paths: [
      '/audio/wav/skeleton/25_skeleton_hit_var1.wav',
      '/audio/wav/skeleton/25_skeleton_hit_var2.wav',
    ],
    volume: 0.7,
    loop: false,
  },
  [AudioEvent.SKELETON_DEATH]: {
    paths: ['/audio/wav/skeleton/26_skeleton_death.wav'],
    volume: 0.8,
    loop: false,
  },
  [AudioEvent.SKELETON_AMBIENT_NEARBY]: {
    paths: ['/audio/wav/skeleton/27_skeleton_ambient_nearby.wav'],
    volume: 0.25,
    loop: true,
  },

  // ── Environment ───────────────────────────────────────────────────
  [AudioEvent.WATER_DRIP]: {
    paths: [
      '/audio/wav/environment/28_water_drip_var1.wav',
      '/audio/wav/environment/28_water_drip_var2.wav',
      '/audio/wav/environment/28_water_drip_var3.wav',
    ],
    volume: 0.4,
    loop: false,
  },
  [AudioEvent.WIND_DRAFT]: {
    paths: ['/audio/wav/environment/29_wind_draft.wav'],
    volume: 0.3,
    loop: true,
  },
  [AudioEvent.STONE_CREAK]: {
    paths: ['/audio/wav/environment/30_stone_creak.wav'],
    volume: 0.4,
    loop: false,
  },
  [AudioEvent.DISTANT_RUMBLE]: {
    paths: ['/audio/wav/environment/31_distant_rumble.wav'],
    volume: 0.35,
    loop: false,
  },
  [AudioEvent.CHAINS_RATTLE]: {
    paths: ['/audio/wav/environment/32_chains_rattle.wav'],
    volume: 0.4,
    loop: false,
  },
  [AudioEvent.TORCH_CRACKLE]: {
    paths: ['/audio/wav/environment/33_torch_crackle.wav'],
    volume: 0.3,
    loop: true,
  },
  [AudioEvent.TORCH_FLARE]: {
    paths: ['/audio/wav/environment/34_torch_flare.wav'],
    volume: 0.5,
    loop: false,
  },

  // ── UI ────────────────────────────────────────────────────────────
  [AudioEvent.MENU_HOVER]: {
    paths: ['/audio/wav/ui/35_menu_hover.wav'],
    volume: 0.5,
    loop: false,
  },
  [AudioEvent.MENU_SELECT]: {
    paths: ['/audio/wav/ui/36_menu_select.wav'],
    volume: 0.5,
    loop: false,
  },
  [AudioEvent.MENU_BACK]: {
    paths: ['/audio/wav/ui/37_menu_back.wav'],
    volume: 0.5,
    loop: false,
  },
  [AudioEvent.BLUEPRINT_FOUND]: {
    paths: ['/audio/wav/ui/38_blueprint_found.wav'],
    volume: 0.7,
    loop: false,
  },
  [AudioEvent.ITEM_PICKUP]: {
    paths: ['/audio/wav/ui/39_item_pickup.wav'],
    volume: 0.5,
    loop: false,
  },
  [AudioEvent.STAIRS_FOUND]: {
    paths: ['/audio/wav/ui/40_stairs_found.wav'],
    volume: 0.6,
    loop: false,
  },
  [AudioEvent.SCORE_TICK]: {
    paths: ['/audio/wav/ui/42_score_tick.wav'],
    volume: 0.4,
    loop: false,
  },
  [AudioEvent.HEALTH_WARNING_PULSE]: {
    paths: ['/audio/wav/ui/43_health_warning_pulse.wav'],
    volume: 0.5,
    loop: true,
  },
  [AudioEvent.FLOOR_TRANSITION]: {
    paths: ['/audio/wav/ui/44_floor_transition_whoosh.wav'],
    volume: 0.6,
    loop: false,
  },

  // ── Projectiles ──────────────────────────────────────────────────
  [AudioEvent.PROJECTILE_FIRE]: {
    paths: ['/audio/wav/player/15_sword_swing.wav'],
    volume: 0.6,
    loop: false,
  },
  [AudioEvent.PROJECTILE_HIT]: {
    paths: ['/audio/wav/player/16_sword_hit_flesh.wav'],
    volume: 0.7,
    loop: false,
  },

  // ── Doors ────────────────────────────────────────────────────────
  [AudioEvent.DOOR_LOCK]: {
    paths: ['/audio/wav/environment/30_stone_creak.wav'],
    volume: 0.5,
    loop: false,
  },
  [AudioEvent.DOOR_UNLOCK]: {
    paths: ['/audio/wav/environment/30_stone_creak.wav'],
    volume: 0.5,
    loop: false,
  },

  // ── Boss ─────────────────────────────────────────────────────────
  [AudioEvent.BOSS_ROAR]: {
    paths: ['/audio/wav/skeleton/24_skeleton_aggro.wav'],
    volume: 0.8,
    loop: false,
  },

  // ── Forge ────────────────────────────────────────────────────────
  [AudioEvent.FORGE_COMPLETE]: {
    paths: ['/audio/wav/ui/38_blueprint_found.wav'],
    volume: 0.8,
    loop: false,
  },
};
