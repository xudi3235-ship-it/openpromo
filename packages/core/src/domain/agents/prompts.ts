/**
 * Static prompts and documentation for video generation agent.
 * Ported from Python: src/openai_agent/tools/docs.py
 *
 * These guides are bundled as static constants rather than fetched at runtime.
 * Sources:
 *   - https://ai.google.dev/gemini-api/docs/video.md.txt
 *   - https://ai.google.dev/gemini-api/docs/image-generation.md.txt
 *   - https://replicate.com/blog/how-to-prompt-nano-banana-pro
 */

// =============================================================================
// VEO 3.1 COMPREHENSIVE GUIDE
// =============================================================================
export const VEO31_GUIDE = `
# VEO 3.1 Prompt Guide

Veo 3.1 is Google's state-of-the-art model for generating high-fidelity, 8-second 720p or 1080p videos with native audio.

## Generation Types

### 1. Text-to-Video
Generate videos from text prompts. Supports dialogue, sound effects, and ambient audio.

### 2. Image-to-Video
Use an image as the starting frame. Great for animating:
- Generated images (from Nano Banana)
- Photos you want to bring to life

### 3. Reference Images (up to 3)
Provide reference images to guide content. Use for:
- Character consistency
- Product placement
- Style direction
- Each reference needs: image + reference_type ("asset")

### 4. Frame Interpolation (First + Last Frame)
Specify both starting and ending frames. Veo generates the transition between them.

### 5. Video Extension
Extend existing Veo-generated videos by 7 seconds.
- Input: Previously generated Veo video (720p, up to 141 seconds)
- Can extend up to 20 times (max 148 seconds total)
- Resolution must be 720p for extension

## Prompt Writing Basics

Include these elements:
- **Subject**: Object, person, animal, or scenery
- **Action**: What the subject is doing (walking, running, turning)
- **Style**: Creative direction (sci-fi, horror film, film noir, cartoon)
- **Camera positioning**: aerial view, eye-level, top-down, dolly shot, worm's eye
- **Composition**: wide shot, close-up, single-shot, two-shot
- **Focus/lens effects**: shallow focus, deep focus, soft focus, macro lens, wide-angle
- **Ambiance**: blue tones, night, warm tones, natural light

## Prompting for Audio

Veo 3.1 generates synchronized audio. Use these patterns:

- **Dialogue**: Use quotes for speech
  Example: A man murmurs, 'This must be it. That's the secret code.'

- **Sound Effects**: Explicitly describe sounds
  Example: tires screeching loudly, engine roaring

- **Ambient Noise**: Describe the soundscape
  Example: A faint, eerie hum resonates in the background

## API Parameters

| Parameter | Description |
|-----------|-------------|
| prompt | Text description (supports audio cues) |
| negativePrompt | What NOT to include (describe plainly, avoid "no" or "don't") |
| image | Initial image to animate |
| lastFrame | Final image for interpolation (use with image) |
| referenceImages | Up to 3 style/content reference images |
| video | Video for extension (Veo-generated only) |
| aspectRatio | "16:9" (default) or "9:16" |
| resolution | "720p" (default) or "1080p" (8s only, no extension) |
| durationSeconds | "4", "6", or "8" (8 required for extension/interpolation/references) |
| personGeneration | "allow_all" (text-to-video), "allow_adult" (image-based) |

## Model Versions

- **veo-3.1-generate-preview**: Full quality, slower
- **veo-3.1-fast-generate-preview**: Optimized for speed

## Negative Prompts

Describe what you DON'T want plainly:
- ✅ "cartoon, drawing, low quality, urban background"
- ❌ "no cartoon, don't show walls"

## Aspect Ratios

- **16:9**: Landscape (widescreen) - 720p & 1080p
- **9:16**: Portrait (vertical) - 720p & 1080p

## Limitations

- Request latency: 11 seconds to 6 minutes
- Videos stored for 2 days, then deleted
- All videos watermarked with SynthID
- Extension requires 720p input
`;

// =============================================================================
// NANO BANANA (IMAGE GENERATION) GUIDE
// =============================================================================
export const NANO_BANANA_GUIDE = `
# Nano Banana Pro Image Generation Guide

Nano Banana Pro (gemini-2.5-flash-image) is an advanced image generation model with exceptional capabilities.

## Core Capabilities

### 1. Logic & Interpretation
- Can read and interpret text IN images
- Solves homework problems with work shown
- Converts papers/articles to infographics
- Renders code as images correctly

### 2. Best-in-Class Text Adherence
- Pixel-perfect text rendering
- Maintains accuracy across different styles
- No text hallucination issues

### 3. Character Consistency
- Handles up to 14 reference images
- Maintains character appearance across scenes
- Perfect for storyboarding and narratives

### 4. World Knowledge
- Deduces landmarks from coordinates
- Built-in knowledge of places, objects, styles

## Prompt Patterns That Work

### Infographics & Diagrams
\`\`\`
Turn this [document/paper] into a detailed whiteboard photo infographic
Create a grid of annotated diagrams explaining [topic]
\`\`\`

### Magazine/Editorial Layout
\`\`\`
Put this whole text, verbatim, into a photo of a glossy magazine article on a desk, with photos, beautiful typography design, pull quotes
\`\`\`

### App/Product Mockups
\`\`\`
Generate an app design mockup for [app type]
Create a product shot of [product] with [setting/lighting]
\`\`\`

### Style Transfer
\`\`\`
Transform this image [Image1] into the artistic style of [Image2]. Keep the main subject, composition, and details from [Image1], but apply the colors, textures, and overall aesthetic of [Image2].
\`\`\`

### Character Preservation
\`\`\`
Keep his [character] style, but make the surroundings realistic
Make him [insert scenario here]
\`\`\`

### Object Extraction
\`\`\`
Extract the clothing from [Image1] and present it as a clean e-commerce product photo. Remove the model's body completely. Keep the outfit in natural 3D shape.
\`\`\`

### Virtual Try-On
Combine multiple reference images (person + clothing items) to synthesize new images.

## Key Tips

1. **Describe scenes, don't just list keywords**
2. **Text accuracy maintained even with style changes**
3. **Use reference images for character consistency**
4. **Can process dense information (papers, earnings reports)**
5. **Works with non-English text accurately**

## Model Versions

- **gemini-2.5-flash-image** (Nano Banana): Fast, high quality
- **gemini-3-pro-image-preview**: Highest quality, slower

## Common Use Cases

- Magazine covers and editorial spreads
- Infographics from dense data
- App and product mockups
- Comics and storyboards
- Virtual try-on
- Style transfer
- Map to satellite view
- Paper/PDF to visual summary
`;

export const IMAGE_PROMPT_GUIDE_GENERAL = `
### image prompt guide
    Here are additional prompt guide
    PROMPT GUIDE for images
    Image text: A sketch (style) of a modern apartment building (subject) surrounded by skyscrapers (context and background).
    Subject: The first thing to think about with any prompt is the subject: the object, person, animal, or scenery you want an image of.

    Context and background: Just as important is the background or context in which the subject will be placed. Try placing your subject in a variety of backgrounds. For example, a studio with a white background, outdoors, or indoor environments.

    Style: Finally, add the style of image you want. Styles can be general (painting, photograph, sketches) or very specific (pastel painting, charcoal drawing, isometric 3D).

    Additional advice for Imagen 3 prompt writing:

    Use descriptive language: Employ detailed adjectives and adverbs to paint a clear picture for Imagen 3.
    Provide context: If necessary, include background information to aid the AI's understanding.
    Reference specific artists or styles: If you have a particular aesthetic in mind, referencing specific artists or art movements can be helpful.
    Use prompt engineering tools: Consider exploring prompt engineering tools or resources to help you refine your prompts and achieve optimal results.
    Enhancing the facial details in your personal and group images:
    Specify facial details as a focus of the photo (for example, use the word "portrait" in the prompt).
    Consider using a larger model like Imagen 4 instead of Imagen 4 Fast to improve detail.

    Photography modifiers
    In the following examples, you can see several photography-specific modifiers and parameters.

    Camera Proximity - Close up, taken from far away

    Camera Position - aerial, from below

    Lighting - natural, dramatic, warm, cold

    Camera Settings - motion blur, soft focus, bokeh, portrait

    Lens types - 35mm, 50mm, fisheye, wide angle, macro

    Film types - black and white, polaroid

    Shapes and materials
    Prompt includes: "...made of...", "...in the shape of..."

    Negative prompts
    The previous examples focus on writing prompts for what you want Imagen to create, but you can also provide a negative prompt along with the original prompt to help the product generate or edit images. These negative prompts can be a powerful tool that helps specify what elements to omit from the image. Simply describe what you don't want.

    Recommended — Plainly describe what you don't want to see. For example "wall, frame".

    Not recommended — Avoid instructive language or words like "no" or "don't". For example, avoid phrases like "no walls" or "don't show walls".

    Photorealistic images:

    Use case	Lens type	Focal lengths	Additional details
    People (portraits)	Prime, zoom	24-35mm	black and white film, Film noir, Depth of field, duotone (mention two colors)
    Food, insects, plants (objects, still life)	Macro	60-105mm	High detail, precise focusing, controlled lighting
    Sports, wildlife (motion)	Telephoto zoom	100-400mm	Fast shutter speed, Action or movement tracking
    Astronomical, landscape (wide-angle)	Wide-angle	10-24mm	Long exposure times, sharp focus, long exposure, smooth water or clouds
`;

export const GOOD_VEO31_PROMPT_EXAMPLES = `
    <style_references/>
    Style References That Work Consistently:
    Camera/Equipment References:

    "Shot on Arri Alexa" - Produces professional digital cinema look
    "Shot on RED Dragon" - Crisp, detailed, slightly cooler tones
    "Shot on 35mm film" - Film grain, warmer colors, organic feel
    "iPhone 15 Pro cinematography" - Modern mobile aesthetic

    Director Style References:

    "Wes Anderson style" - Symmetrical, pastel colors, precise framing
    "David Fincher style" - Dark, precise, clinical lighting
    "Christopher Nolan style" - Epic scope, practical effects feel
    "Denis Villeneuve style" - Atmospheric, moody, wide shots

    Movie Cinematography References:

    "Blade Runner 2049 cinematography" - Neon, atmospheric, futuristic
    "Mad Max Fury Road style" - Saturated, gritty, high contrast
    "Her (2013) cinematography" - Soft, warm, intimate lighting
    "Interstellar visual style" - Epic, cosmic, natural lighting

    Color Grading Terms:

    "Teal and orange grade" - Popular Hollywood color scheme
    "Film noir lighting" - High contrast, dramatic shadows
    "Golden hour cinematography" - Warm, natural backlighting
    "Cyberpunk color palette" - Neon blues, magentas, purples

    /// some custom good rules below ///

    What I learned:
    Front-load the important stuff - Veo 3 weights early words more heavily
    Lock down the "what" then iterate on the "How"
    One action per prompt - Multiple actions = chaos (one action per scene)
    Specific > Creative - "Walking sadly" < "shuffling with hunched shoulders"
    Audio cues are OP - Most people ignore these, huge mistake (give the video a realistic feel)
    
    Camera movements that actually work:
    Slow push/pull (dolly in/out)
    Orbit around subject
    Handheld follow
    Static with subject movement
    
    Avoid:
    Complex combinations ("pan while zooming during a dolly")
    Unmotivated movements
    Multiple focal points
    
    Style references that consistently deliver:
    "Shot on [specific camera]"
    "[Director name] style"
    "[Movie] cinematography"
    Specific color grading terms

    The 6-Element Viral Prompt Formula:
    1. Subject: Who or what is the main focus
    2. Action: What's happening in the scene
    3. Setting: Where it's taking place
    4. Style: Visual aesthetic and camera work
    5. Audio: Dialogue, music, or sound effects
    6. Mood: The emotional tone you're targeting

    Quick Win Template:
    [Camera angle] shot of [subject] [action] in [setting]. [Lighting description]. [Subject] says: "[exact dialogue]." [Background audio]. [Mood/style] aesthetic.
`;

export const NANO_BANANA_GOOD_PROMPT_EXAMPLES = `
    Key Nano Banana Prompt Patterns:

    1. 3D Action Figure:
    "create a 1/7 scale commercialized figure of the character in the illustration, in a realistic style and environment. Place the figure on a computer desk, using a circular transparent acrylic base without any text."

    2. Chibi Knitted Doll:
    "A close-up, professionally composed photograph showcasing a hand-crocheted yarn doll gently cradled by two hands. The doll has a rounded shape, featuring the cute chibi image of the [character], with vivid contrasting colors and rich details."

    3. Character Capsules:
    "A detailed, transparent gashapon capsule diorama, held between fingers, featuring [NAME] in their [ICONIC POSE / STYLE]. Lighting should be dramatic and cinematic, matching their theme."

    4. iPhone Selfie Style:
    "Please draw an extremely ordinary and unremarkable iPhone selfie, with no clear subject or sense of composition — just like a random snapshot taken casually. The photo should include slight motion blur, with uneven lighting."

    5. Ghibli Style:
    "Redraw this photo in Ghibli style"

    6. Style Fusion:
    "Transform this image [Image1] into the artistic style of [Image2]. Keep the main subject, composition, and details from [Image1], but apply the colors, textures, and overall aesthetic of [Image2]."

    7. Background Change:
    "Replace the background of [Image1] with [desired background description, e.g., a beach, a forest, a city skyline]. Keep the main subject unchanged, maintaining original proportions, lighting, and details."

    8. Object Extraction:
    "Extract the clothing from [Image1] and present it as a clean e-commerce product photo. Remove the model's body completely. Keep the outfit in natural 3D shape."
`;

/**
 * Static prompts namespace - provides access to documentation and guides.
 * All content is bundled as static constants for zero-latency access.
 */
export const StaticPrompts = {
  generalImagePromptGuide: (): string => {
    return IMAGE_PROMPT_GUIDE_GENERAL;
  },

  goodVeo31PromptExamples: (): string => {
    return GOOD_VEO31_PROMPT_EXAMPLES;
  },

  goodNanoBananaPromptExamples: (): string => {
    return NANO_BANANA_GOOD_PROMPT_EXAMPLES;
  },

  /**
   * Comprehensive VEO 3.1 guide.
   * Source: https://ai.google.dev/gemini-api/docs/video.md.txt
   */
  veo31Guide: (): string => {
    return VEO31_GUIDE;
  },

  /**
   * Comprehensive Nano Banana image generation guide.
   * Sources:
   *   - https://ai.google.dev/gemini-api/docs/image-generation.md.txt
   *   - https://replicate.com/blog/how-to-prompt-nano-banana-pro
   */
  nanoBananaGuide: (): string => {
    return NANO_BANANA_GUIDE;
  },

  /**
   * Combined guide for video generation agent system prompt.
   */
  combinedVideoGenGuide: (): string => {
    return `${VEO31_GUIDE}\n\n---\n\n${NANO_BANANA_GUIDE}\n\n---\n\n${GOOD_VEO31_PROMPT_EXAMPLES}\n\n---\n\n${NANO_BANANA_GOOD_PROMPT_EXAMPLES}`;
  },
} as const;
