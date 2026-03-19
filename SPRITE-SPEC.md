# Zen Garden Sprite Specification

Style: Japanese zen garden pixel art, 同一风格统一。
Palette: Warm earth tones (browns, greens, stone grays), accent gold/red.
Background: Transparent PNG.
Rendering: `image-rendering: pixelated` (crisp edges, no anti-aliasing).

---

## 1. Monk (和尚) — 32x32 per frame

| Sprite | Filename | Description |
|--------|----------|-------------|
| Idle | `monk-idle.png` | Standing front-facing, orange robe, shaved head |
| Walk Right 1-4 | `monk-walk-r1.png` ~ `monk-walk-r4.png` | 4-frame walk cycle facing right |
| Walk Left 1-4 | `monk-walk-l1.png` ~ `monk-walk-l4.png` | 4-frame walk cycle facing left |
| Sitting | `monk-sit.png` | Cross-legged meditation pose |

**Prompt template:**
> Pixel art sprite, 32x32, Japanese Buddhist monk, orange robe, shaved head, zen garden style, transparent background, no anti-aliasing, retro game aesthetic

---

## 2. NPCs — 48x48

| Sprite | Filename | Description |
|--------|----------|-------------|
| Buddha Statue | `npc-buddha.png` | Stone Buddha statue, sitting on lotus base, serene |
| Muyu Drum | `npc-muyu.png` | Wooden fish drum (木鱼) on stand, mallet beside it |

**Prompt template:**
> Pixel art, 48x48, [item description], Japanese zen garden decoration, stone/wood material, transparent background, retro game style

---

## 3. Garden Items — 32x32, each has 3 growth stages

### Lantern (禅灯)
| Stage | Filename | Description |
|-------|----------|-------------|
| Small | `item-lantern-s.png` | Small stone base, no flame |
| Medium | `item-lantern-m.png` | Stone lantern forming, dim flame |
| Full | `item-lantern-l.png` | Full stone lantern, warm glowing flame |

### Bonsai (盆栽)
| Stage | Filename | Description |
|-------|----------|-------------|
| Small | `item-bonsai-s.png` | Small sprout in pot |
| Medium | `item-bonsai-m.png` | Young tree with few branches |
| Full | `item-bonsai-l.png` | Full bonsai tree, twisted branches, lush |

### Buddha Statue item (佛像)
| Stage | Filename | Description |
|-------|----------|-------------|
| Small | `item-statue-s.png` | Rough stone block |
| Medium | `item-statue-m.png` | Partially carved Buddha |
| Full | `item-statue-l.png` | Complete small Buddha statue |

### Koi Pond (锦鲤池)
| Stage | Filename | Description |
|-------|----------|-------------|
| Small | `item-pond-s.png` | Small puddle with stones |
| Medium | `item-pond-m.png` | Wider pond, lily pads |
| Full | `item-pond-l.png` | Full pond with koi fish visible |

### Incense Burner (香炉)
| Stage | Filename | Description |
|-------|----------|-------------|
| Small | `item-incense-s.png` | Simple clay dish |
| Medium | `item-incense-m.png` | Bronze burner, thin smoke |
| Full | `item-incense-l.png` | Ornate incense burner, rich smoke wisps |

**Prompt template:**
> Pixel art, 32x32, [item at growth stage], Japanese zen garden, transparent background, retro game style, earthy color palette

---

## Summary: 28 sprites total
- Monk: 10 sprites (idle + 8 walk + sit)
- NPCs: 2 sprites
- Items: 15 sprites (5 items × 3 stages)
- Garden background: 1 (optional upgrade of garden-bg.png)
