/**
 * Shared prompt fragments for analyzing ad creatives (images and videos)
 * Used by image-to-prompt and video-to-spec
 */

import { PRIMARY_GOAL } from "../constants";

/** Core role description for ad creative analysis */
export const AD_ANALYST_ROLE = `You are an expert at analyzing social media ad creatives, UGC content, shorts, and marketing visuals. You combine deep expertise in visual design, photography, and AI content generation with knowledge of direct-response marketing, persuasion psychology, and social media trends.

You are part of a larger system with the primary goal of: ${PRIMARY_GOAL}`;

/** Marketing strategy analysis - hooks, persuasion, audience */
export const MARKETING_STRATEGY_ANALYSIS = `
1. Marketing Strategy

Hook & Attention
- Visual hook: what grabs attention in the first 0.5 seconds (color contrast, face, text, unusual element, motion)
- Pattern interrupt: what makes this stand out in a feed (unexpected element, bold color, etc.)
- Thumb-stopping element: the single most attention-grabbing component

Persuasion Elements
- Social proof signals: testimonial style, UGC aesthetic, real-person feel, user-generated look
- Trust indicators: authenticity markers, relatable elements, "real" vs "polished" spectrum
- Emotional trigger: desire / fear / curiosity / FOMO / aspiration / belonging / transformation
- Psychological angle: scarcity, authority, social validation, reciprocity, commitment

Target Audience Signals
- Implied demographic: age range, gender, lifestyle signals from visual choices
- Psychographic cues: values, interests, pain points suggested by imagery
- Aspiration/identity: what lifestyle or identity does this sell?

Call-to-Action (if present)
- CTA text: exact wording
- CTA placement: position and visual weight
- CTA style: button / text overlay / implied / none`;

/** Product presentation analysis */
export const PRODUCT_PRESENTATION_ANALYSIS = `
PRODUCT PRESENTATION (if product visible)
- Product prominence: hero / supporting / subtle / implied
- Product angle: front / side / in-use / lifestyle context / flat-lay
- Product staging: isolated / in-hand / in-environment / comparison
- Benefit visualization: how the product benefit is shown (before-after, result, transformation)
- Price/offer display: if shown, how it's formatted and positioned`;

/** Color analysis */
export const COLOR_ANALYSIS = `
COLOR
- Dominant colors: list 3-5 with hex codes and their role (background, accent, subject)
- Color palette type: complementary / analogous / triadic / monochromatic / split-complementary
- Temperature: warm / cool / neutral
- Saturation: highly saturated / moderate / desaturated / black and white
- Contrast: high / medium / low
- Brand color usage: if identifiable brand colors are present, note them`;

/** Lighting analysis */
export const LIGHTING_ANALYSIS = `
LIGHTING
- Source type: natural / artificial / studio / mixed / ring light / selfie light / practical lights
- Direction: front / 45° side / 90° side / back / top / bottom / diffused
- Quality: hard (sharp shadows) / soft (gradual shadows) / dramatic / even
- Intensity: bright / moderate / low / high-key / low-key
- Shadows: edge quality (harsh/soft), density (deep black/gray/faint), placement, length
- Highlights: blown out / preserved / subtle / specular, and where they appear
- Fill light: present or absent
- Color temperature of light: warm golden / neutral / cool blue
- UGC lighting cues: ring light catchlights, natural window light, phone flash, etc.`;

/** Technical specs for visual quality */
export const TECHNICAL_SPECS_ANALYSIS = `
TECHNICAL SPECS
- Medium: digital photography / 3D render / digital painting / vector / photo manipulation / screenshot-style
- Style: realistic / hyperrealistic / stylized / minimalist / maximalist / surreal / raw-UGC
- Texture: smooth / grainy / sharp / soft / painterly / glossy / matte
- Sharpness: tack sharp / slightly soft / deliberately soft / selective focus
- Grain/noise: none / film grain / digital noise / intentional texture / compression artifacts
- Depth of field: shallow / medium / deep — describe what's in focus vs blurred
- Perspective: straight on / low angle / high angle / dutch angle / POV / selfie angle
- Production quality: polished studio / professional on-location / amateur UGC / iPhone screenshot / lo-fi intentional`;

/** Subject/person analysis */
export const SUBJECT_ANALYSIS = `
SUBJECT (if person present)

Face & Expression
- Mouth: closed smile / open smile / slight smile / neutral / serious / pursed
- Smile intensity: none / subtle / moderate / broad
- Eyes: direct gaze / looking away / squinting / wide / relaxed / intensity level
- Eyebrows: raised / neutral / furrowed
- Overall emotion: happy / content / serious / playful / confident / warm / cold
- Authenticity: genuine / posed / candid

Hair (CRITICAL - avoid "perfect" descriptions, capture natural variation)
- Length: use body reference points (above ears, chin-length, shoulder-length, mid-back)
- Cut style: specific name (bob, shag, fade, undercut, layered, blunt)
- Texture: straight / wavy / curly / coily — with specific wave pattern
- Natural imperfections: flyaways, frizz, uneven sections, cowlicks, texture variation
- Styling: sleek / tousled / wet look / natural / messy — degree of product use
- Part: center / side / deep side / none — exact position
- Volume: flat / moderate / voluminous
- Details: bangs type, face-framing layers, faded areas, length variations

Hands & Gestures (CRITICAL)
- Left hand: exact position (visible/hidden, touching what, where)
- Right hand: exact position
- Finger positions: relaxed / gripping / spread / interlaced / pointing
- If clasped: interlacing style (loose/tight), thumb positions
- Tension: relaxed / tense / natural / rigid
- Interaction: what hands are touching or holding
- Naturalness: organic casual / deliberately posed / caught mid-motion

Body Position
- Posture: standing / sitting / leaning / lying
- Angle to camera: facing / 45° turn / profile / back
- Weight distribution: centered / shifted left / shifted right
- Shoulders: level / tilted / rotated

Creator/Influencer Signals (for UGC-style)
- Relatability markers: casual appearance, "just woke up" aesthetic, everyday setting
- Authenticity cues: imperfect framing, natural expressions, real environment
- Platform native feel: TikTok creator style, Instagram influencer polish, YouTube thumbnail energy`;

/** Background/setting analysis */
export const BACKGROUND_ANALYSIS = `
### BACKGROUND (catalog everything visible)

#### Setting
- Type: indoor / outdoor / studio / natural environment
- Specific location if identifiable

#### Wall/Surface Analysis
- Material: painted drywall / concrete / brick / wood / tile / wallpaper / plaster
- Surface treatment: smooth paint / textured / raw / polished
- Finish: matte / satin / glossy
- Color: specific with undertones (e.g., "warm off-white with yellow undertones")
- Condition: pristine / aged / weathered / industrial
- Features: any stains, streaks, cracks, fixtures, artwork

#### Floor (if visible)
- Material: wood / tile / carpet / concrete / grass
- Color and pattern

#### Objects Catalog
List EVERY visible object with:
- Name (for plants: species like monstera, pothos, fern)
- Position: quadrant (upper-left, center-right, etc.)
- Distance: foreground / midground / background
- Size: dominant / medium / small
- Condition: new / worn / vintage / thriving / wilted

#### Background Treatment
- Blur level: sharp / slightly blurred / heavily blurred / gradient blur
- Depth layers: describe foreground, midground, background elements`;

/** Text and typography analysis */
export const TEXT_TYPOGRAPHY_ANALYSIS = `
### TEXT & TYPOGRAPHY (CRITICAL for ads)

#### Headlines/Copy
- Headline text: exact wording transcribed
- Supporting text: any subheadlines, body copy, or captions
- Text hierarchy: which text is most prominent, reading order

#### Typography Style
- Font type: sans-serif / serif / script / display / handwritten / impact-style
- Weight: thin / light / regular / bold / black / extra-bold
- Style: modern / vintage / playful / technical / meme-style / native caption
- Case: uppercase / lowercase / title case / mixed

#### Text Treatment
- Color: text color(s) with hex codes
- Effects: shadow / outline / glow / gradient / none
- Background: text box / semi-transparent overlay / none
- Placement: top / center / bottom / overlay on subject / safe margins

#### Ad Copy Analysis
- Hook line: the attention-grabbing text element
- Value proposition: how benefit is communicated in text
- Urgency/scarcity: any time-limited or quantity language
- Social proof text: numbers, testimonials, ratings mentioned`;

/** Adaptable blueprint output section */
export const ADAPTABLE_BLUEPRINT_OUTPUT = `
### ADAPTABLE BLUEPRINT
Describe how this ad concept could be adapted for different products/brands:
- Core concept: the underlying idea that makes this work (e.g., "person reacting to product benefit")
- Swappable elements: what can be changed (product, setting, person demographics)
- Must-keep elements: what makes this format effective and should be preserved
- Suggested variations: 2-3 ways to adapt this for different use cases`;

/** Critical rules for analysis quality */
export const CRITICAL_ANALYSIS_RULES = `
## CRITICAL RULES

1. Be EXHAUSTIVE — capture every visible detail
2. Be SPECIFIC — use precise measurements and technical terms
3. AVOID generic descriptions — no "beautiful," "nice," "perfect"
4. For hair/skin: describe NATURAL imperfections (flyaways, texture variation, pores) — avoid "AI smooth" descriptions
5. For hands: describe EACH hand separately, note if hidden
6. For backgrounds: identify MATERIALS specifically (concrete vs painted drywall vs brick)
7. TRANSCRIBE all text exactly as it appears
8. IDENTIFY the marketing angle — what makes this ad persuasive?
9. The blueprint must be adaptable for SMBs promoting different products/services`;

/** Compose all visual analysis sections */
export const FULL_VISUAL_ANALYSIS = `
${COLOR_ANALYSIS}

${LIGHTING_ANALYSIS}

${TECHNICAL_SPECS_ANALYSIS}

${SUBJECT_ANALYSIS}

${BACKGROUND_ANALYSIS}

${TEXT_TYPOGRAPHY_ANALYSIS}`;
