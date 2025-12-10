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

## Negative Prompts

Describe what you DON'T want plainly:
- ✅ "cartoon, drawing, low quality, urban background"
- ❌ "no cartoon, don't show walls"

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

  // creative

  {
  "shot": {
    "composition": "three wide-to-mid cuts; each reveals a different room through glowing portals",
    "lens": "35mm lens with cinematic softness",
    "frame_rate": "30fps",
    "camera_movement": "smooth slider pans between each portal reveal"
  },
  "subject": {
    "description": "neutral adult character flipping a glowing IKEA catalog, choosing a room, and stepping into it",
    "wardrobe": "simple, clean clothing in soft neutral colors",
    "props": "oversized luminous IKEA catalog with ambient glow"
  },
  "scene": {
    "location": "empty white space that transforms through glowing portals",
    "time_of_day": "timeless white light interior",
    "environment": "blank studio morphing into immersive IKEA interiors via portals"
  },
  "visual_details": {
    "action": "each catalog flip opens a room portal; character steps into chosen one at the end",
    "special_effects": "subtle energy ripples and glow from each portal; light and particles shift per room theme",
    "hair_clothing_motion": "gentle breeze interaction from portal pull"
  },
  "cinematography": {
    "lighting": "balanced soft studio light with each room providing its own internal glow",
    "color_palette": "minimal white base with rich, contrasting tones in each room",
    "tone": "elegant, imaginative, clean aesthetic"
  },
  "audio": {
    "music": "soft, ascending ambient pad with light spark textures",
    "ambient": "dimensional air shift when portals open, soft paper flip, subtle room-specific cues",
    "sound_effects": "light shimmer for each portal, a soft hum as the final portal closes",
    "mix_level": "smooth, cinematic with priority on environmental transition sounds"
  },
  "dialogue": {
    "character": "",
    "line": "",
    "subtitles": false
  },
  "timeline": [
    {
      "t": "0-3s",
      "description": "Character opens glowing catalog; first portal opens to a cozy IKEA bedroom with warm light"
    },
    {
      "t": "3-6s",
      "description": "Page flips again; second portal shows modern living room with ambient shelves and pendant light"
    },
    {
      "t": "6-8s",
      "description": "Character steps confidently through the final portal into a vibrant IKEA kitchen; portal glows and fades"
    }
  ],
  "rules": [
    "Three total cuts only, each exactly 3s/3s/2s",
    "No camera shake or handheld motion",
    "No text, no branding visible",
    "Portals must glow and feel immersive, not holographic or flat",
    "Each room should match real IKEA design aesthetics"
  ],
  "negatives": [
    "text overlays",
    "fast cuts",
    "fake-looking portals",
    "handheld shots",
    "mismatched furniture styles",
    "shadows inconsistent with portal lighting"
  ]
}

`;

export const NANO_BANANA_GOOD_PROMPT_EXAMPLES = `
    Key Nano Banana Prompt Patterns: CRITICAL to use json format

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

    9. realism, iphone 17 pro photography prompt example. NOTE: the following is a prompt template for generating ultra-realistic images simulating iPhone 17 Pro photography. Follow the structure and principles outlined to create your own prompts.

    <role>
    You're specialized in computational photography, specifically the optical characteristics of the iPhone 16/17 Pro Max sensor system. You translate human concepts into mathematically precise image generation prompts.
    </role>

    <cognitive_framework>
    <principle name="Context Hunger">
    If the user provides a vague concept (e.g., "girl at a cafe"), you must explicitly invent the missing environmental, lighting, and styling details to ensure a complete image.
    </principle>
    <principle name="The iPhone Aesthetic">
    All outputs must strictly simulate high-end mobile photography.
    - Focal Lengths: 24mm (Main), 13mm (Ultra Wide), or 77mm (Telephoto).
    - Characteristics: "Apple ProRAW" color science, sharp details (Deep Fusion), computational bokeh (Portrait Mode), and Smart HDR dynamic range.
    - Avoid: Anamorphic lens flares, exaggerated "cinema" bokeh, or vintage film grain (unless specified as a filter).
    </principle>
    <principle name="Imperfection is Realism">
    To achieve "ultra-realism," you must inject terms describing unpolished reality: digital noise (not film grain), skin texture, slightly blown-out highlights (common in mobile), and natural "snapshot" framing.
    </principle>
    <principle name="JSON Precision">
    Your output is a strict JSON object designed for programmatic use.
    </principle>
    </cognitive_framework>

    <visual_analysis_reference>
    The "Influencer Aesthetic" is defined by:
    - Vibe: "Plandid" (planned candid), effortlessness, aspirational lifestyle.
    - Lighting: Natural window light, golden hour, or "flash photography" (hard flash) for night shots.
    - Framing: Vertical (9:16) native mobile aspect ratio, often selfies or point-of-view (POV).
    </visual_analysis_reference>

    <instructions>
    1. Analyze the user's request for subject and mood.
    2. Enrich the request using "iPhone Photography" constraints.
    3. Format the output strictly as a JSON object with the following schema.
    </instructions>

    <json_schema>
    {
      "meta_data": {
        "style": "iPhone Pro Max Photography",
        "aspect_ratio": "9:16"
      },
      "prompt_components": {
        "subject": "Detailed description of person, styling, pose (mirror selfie, 0.5x angle, etc.)",
        "environment": "Detailed background, location, social setting",
        "lighting": "Smart HDR lighting, natural source, or direct flash",
        "camera_gear": "iPhone 16 Pro Max, Main Camera 24mm f/1.78, or Ultra Wide 13mm",
        "processing": "Apple ProRAW, Deep Fusion, Shot on iPhone",
        "imperfections": "Digital noise, motion blur, authentic skin texture, screen reflection (if mirror)"
      },
      "full_prompt_string": "The combined, comma-separated string optimized for realistic mobile generation",
      "negative_prompt": "Standard negatives + 'professional camera, DSLR, bokeh balls, anamorphic, cinema lighting, studio lighting'"
    }
    </json_schema>

    <task>
    Await user description of the scene. Generate the JSON output immediately.
    </task>

    10. direct flash photography prompt example
    {
  "label": "direct-flash-gamer-girl",
  "tags": [
    "direct-flash",
    "retro-gamer-room",
    "90s-photography",
    "film-aesthetic",
    "gamer-girl",
    "collectibles-shelf",
    "low-angle",
    "sitting-pose"
  ],
  "CompositionalPortrait": 1,
  "Style": [
    "direct-flash-photography-3",
    "80s-90s-club-photo-2",
    "warm-film-tone-2",
    "documentary-candid-style-2"
  ],
  "Subject": [
    "young woman in her early 20s with fair skin and soft natural features",
    "long dark hair styled in two loose braids with subtle flyaways for realism",
    "wearing a fitted white cotton camisole top with thin straps and matching high-waisted white shorts",
    "minimal natural makeup with a soft pink tint on cheeks and lips",
    "eyes looking directly into the camera with a calm, intimate, slightly teasing expression",
    "seated cross-legged on a couch, holding a game controller naturally in both hands"
  ],
  "MadeOutOf": [
    "white cotton camisole top",
    "white high-waisted shorts",
    "black over-ear gaming headphones",
    "black wireless controller",
    "small plush Pikachu toy placed beside her on the couch",
    "red textured pillow behind her"
  ],
  "Arrangement": "subject sits centered on a worn retro couch in a relaxed cross-leg position, holding the controller naturally with both hands; direct flash highlights her face and the texture of her outfit, while the surrounding collectible shelves create depth and visual clutter in the background.",
  "Accessories": [
    "retro gaming consoles stacked on shelves",
    "boxed action figures and collectible toys in various sizes",
    "soft plush Pikachu next to the subject",
    "gaming headset cable draped naturally across her shoulder"
  ],
  "Background": "a dimly lit retro gamer room filled with densely packed shelves of action figures, boxed toys, handheld consoles, and vintage game cases; warm tungsten floor lamp providing ambient background glow; slight shadow falloff caused by the direct flash illuminating the foreground more prominently.",
  "RoomObjects": [
    "crowded black shelving full of collectible action figures",
    "vintage CRT monitor partially visible on lower shelf",
    "floor lamp with soft warm bulb",
    "stuffed toys in the corner of the couch",
    "assorted retro controllers scattered near the subject"
  ],
  "ColorRestriction": [
    "overall palette grounded in warm tungsten tones",
    "subject outfit remains clean white for contrast",
    "background shelves maintain mixed reds, blacks, and muted neons from toy packaging",
    "flash introduces slightly cooler highlights on skin and fabric"
  ],
  "Lighting": "strong direct on-camera flash aimed straight at the subject, creating bold highlights on the face and clothing; shadows cast sharply behind objects; ambient tungsten lamp in the background adds warm separation light; overall high contrast with slight film-like grain.",
  "Camera": {
    "type": "digital rangefinder or compact mirrorless emulating film aesthetic",
    "lens": "35mm equivalent prime lens",
    "aperture": "f/2.0",
    "iso": "400–800",
    "shutter_speed": "1/125–1/200",
    "flash": "direct on-camera flash, high intensity",
    "angle": "slightly low eye-level perspective",
    "focus": "sharp on face and upper torso, background clearly readable but secondary"
  },
  "OutputStyle": "photorealistic direct-flash snapshot with bold contrast, visible texture on skin and hair, subtle film grain, warm shadows, slightly saturated toy packaging, and a nostalgic 80s–90s indoor photo aesthetic.",
  "Mood": "intimate, playful, nostalgic, confidently casual with a strong gamer-at-home vibe"
}

11. {
  "subject": {
    "type": "woman",
    "pose": "seated, facing camera, hands holding the front edges of her jacket",
    "expression": "neutral to slight confident smile",
    "hair": {
      "length": "long",
      "style": "loose curls",
      "color": "dark brown with lighter highlights"
    },
    "makeup": {
      "eyes": "defined eyeliner and lashes",
      "lips": "matte pink lipstick",
      "skin": "smooth, even-toned"
    },
    "clothing": {
      "top_layer": {
        "type": "black textured jacket",
        "fit": "partially opened at the front",
        "details": "subtle stitched edges"
      },
      "inner_layer": {
        "type": "black bra",
        "material": "sheer mesh sections",
        "visibility": "partially visible beneath jacket"
      },
      "bottom_layer": {
        "type": "black underwear",
        "material": "semi-sheer"
      }
    }
  },
  "scene": {
    "location": "indoor modern living room",
    "lighting": "bright, soft daylight from the left side",
    "background": {
      "elements": [
        "white shuttered windows on the left",
        "large flat-screen TV mounted on the wall",
        "beige textured wall",
        "green indoor plant in a round beige vase",
        "white or cream sofa cushions"
      ]
    }
  },
  "camera": {
    "framing": "medium close-up",
    "angle": "straight-on",
    "focus": "sharp on subject",
    "depth_of_field": "moderate, background slightly softened"
  },
  "aesthetic": {
    "mood": "polished, posed, glamorous",
    "color_palette": "neutral tones with black clothing and warm skin tones"
  }
}

12. {
  "detailed_structured_prompt": {
    "meta_instructions": {
      "reference_adherence": {
        "instruction": "Create a 100% authentic portrait based closely on the provided reference photo."
      }
    },
    "subject_definition": {
      "demographic": "Young woman",
      "anatomy_and_features": {
        "head": {
          "hair": {
            "length": "Mid-back",
            "texture": "Natural loose curls",
            "cut": "Layered bangs",
            "dynamic_state": "Windswept, blowing through face with wisps"
          },
          "eyes": {
            "color": "Burgundy",
            "shape": "Large, round",
            "details": "Long curled eyelashes"
          },
          "mouth": {
            "lip_shape": "Full, plump",
            "lip_makeup": {
              "product": "Lip gloss",
              "color_style": "Gradient pink",
              "finish": "Dewy"
            }
          },
          "skin_and_makeup": {
            "base_finish": "Dewy makeup",
            "blush_details": {
              "color": "Light pink",
              "placement": ["Cheeks", "Tip of the nose"]
            }
          }
        },
        "hands": {
          "nails": {
            "shape": "Coffin-shaped",
            "length": "Long",
            "design": "Pink and silver marble"
          }
        }
      },
      "attire": {
        "upper_body": {
          "garment": "Bodysuit",
          "color": "Black",
          "style_details": ["Strapless", "Low back"]
        },
        "lower_body": {
          "garment": "Denim shorts",
          "color_options": ["Olive-green", "Light-brown"]
        }
      },
      "pose_and_orientation": {
        "placement": "Sitting on a large rock near the base of the waterfall",
        "gaze_direction": "Looking directly at the front (camera)"
      }
    },
    "environment_context": {
      "scene_type": "Beautiful outdoor setting",
      "primary_feature": {
        "type": "Waterfall",
        "description": "Cascading down a dark rocky cliff"
      },
      "atmospheric_elements": ["Foamy water", "Misty air surrounding subject"]
    },
    "photographic_specifications": {
      "genre": "Authentic outdoor portrait",
      "resolution_target": "8k quality",
      "lighting_condition": "Natural outdoor light",
      "aspect_ratio": "9:16"
    }
  }
}

13. {
  "pipeline_configuration": {
    "job_type": "img2img_transformation",
    "meta_tags": ["macro", "beauty", "soft_focus", "realism"],
    
    "input_reference_handling": {
      "preservation_rules": {
        "facial_identity": {
          "strength": 1.0,
          "instruction": "Strict 100% preservation of facial geometry and features.",
          "technique": "FaceID / IP-Adapter Strong"
        },
        "color_palette": {
          "target": "Hair Color",
          "mode": "inherit_from_source",
          "instruction": "Do not hallucinate new hair color. Map source color to new hair texture."
        }
      }
    },

    "generative_parameters": {
      "subject_definition": {
        "hair_morphology": {
          "length": "Short",
          "texture_type": "Wavy",
          "styling_aesthetic": "Intentionally messy, artfully disheveled",
          "micro_details": "Fine strands falling across forehead and near eyes",
          "color_override": null
        },
        "facial_details": {
          "expression": "Serene, gentle",
          "makeup_style": "Natural, soft-beauty approach",
          "surface_texture": "Ultra-clean skin with visible macro pores"
        }
      },

      "scene_composition": {
        "camera_settings": {
          "proximity": "Extreme Close-Up (Macro)",
          "depth_of_field": "Ultra-shallow",
          "focus_target": "Eyes",
          "lens_character": "Soft beauty lens"
        },
        "foreground_layers": {
          "element": "Hand",
          "state": "Partially blurred",
          "purpose": "Framing effect, adding depth and intimacy"
        },
        "background_layers": {
          "state": "Fully out of focus",
          "visuals": "Pastel, soft tones",
          "bokeh_quality": "Strong, smooth, creamy"
        }
      },

      "lighting_and_atmosphere": {
        "style": "Soft-beauty photography",
        "dynamic_range": "High (HDR)",
        "quality": "Airy, bright, diffused",
        "reflections": {
          "eyes": "Crisp, sharp catchlights",
          "lips": "Soft, natural shine"
        }
      }
    },

    "text_prompts": {
      "weighted_positive": {
        "(Masterpiece, Best Quality, 8k, Macro Photo)": 1.5,
        "Extreme close-up of young woman with serene gentle expression": 1.3,
        "Short wavy messy hair with stray wisps over eyes": 1.2,
        "Hand in foreground partially blurred framing the face": 1.2,
        "Macro skin texture, pores visible, individual hair strands": 1.4,
        "Ultra-sharp eyes with crisp reflections": 1.3,
        "Soft pastel bokeh background": 1.1,
        "Soft diffused lighting, airy aesthetic": 1.0
      },
      "weighted_negative": {
        "alteration of face, new hair color, long hair": 1.5,
        "plastic skin, airbrushed, smooth": 1.4,
        "cartoon, 3d render, illustration": 1.3,
        "deep focus, sharp background, clutter": 1.2,
        "deformed hand, bad anatomy": 1.4
      }
    }
  }
}
`;

const SORA2_PROMPT_GUIDE = `
Crafting a successful video prompt
Before you prompt
Think of prompting like briefing a cinematographer who has never seen your storyboard. If you leave out details, they’ll improvise – and you may not get what you envisioned. By being specific about what the “shot” should achieve, you give the model more control and consistency to work with.

But leaving some details open can be just as powerful. Giving the model more creative freedom can lead to surprising variations and unexpected, beautiful interpretations. Both approaches are valid: detailed prompts give you control and consistency, while lighter prompts open space for creative outcomes. The right balance depends on your goals and the result you’re aiming for. Treat your prompt as a creative wish list, not a contract. Like with ChatGPT, using the same prompt multiple times will lead to different results – this is a feature, not a bug. Each generation is a fresh take, and sometimes the second or third option is better.

Most importantly, be prepared to iterate. Small changes to camera, lighting, or action can shift the outcome dramatically. Collaborate with the model: you provide direction, and the model delivers creative variations.

This isn’t an exact science—think of the guidance below as helpful suggestions we’ve learned from working with the model.

API Parameters
The prompt controls the content of the video, but certain attributes are governed only by API parameters. You cannot request them in prose, they must be set explicitly in your API call:

model: sora-2 or sora-2-pro.
size: a string in the form {width}x{height}. Supported resolutions are dependent on the model selection:
sora-2
1280x720, 720x1280
sora-2-pro
1280x720, 720x1280
1024x1792, 1792x1024
seconds: the clip length, supported values: “4”, “8”, “12”. Default value is “4”.
These parameters are the video’s container – resolution, duration, and quality will not change based on prose like “make it longer.” Set them explicitly in the API call; your prompt controls everything else (subject, motion, lighting, style).

Video Resolution
Video resolution directly influences visual fidelity and motion consistency in Sora. Higher resolutions generate detail, texture, and lighting transitions more accurately, while lower resolutions compress visual information, often introducing softness or artifacts.

Video Length
The model generally follows instructions more reliably in shorter clips. For best results, aim for concise shots. If your project allows, you may see better results by stitching together two 4 second clips in editing instead of generating a single 8 second clip.

Prompt anatomy that works
A clear prompt describes a shot as if you were sketching it onto a storyboard. State the camera framing, note depth of field, describe the action in beats, and set the lighting and palette. Anchoring your subject with a few distinctive details keeps it recognizable, while a single, plausible action makes the shot easier to follow.

Describing multiple shots in a single prompt is also valid if you need to cover a sequence. When you do this, keep each shot block distinct: one camera setup, one subject action, and one lighting recipe at a time. This gives you flexibility to generate short standalone clips or longer, continuous moments, depending on your project. Treat each shot as a creative unit, and you can either stitch them together in an edit or let them play out as a sequence in one go.

Shorter prompts give the model more creative freedom. Expect surprising results.
Longer, more detailed prompts restrict the model's creativity. It will try to follow your guidance, but might not always do so reliably.
Here's an example for a short prompt:

In a 90s documentary-style interview, an old Swedish man sits in a study and says, "I still remember when I was young."

This prompt will likely work well:

90s documentary sets the style of the video. The model will choose variables like camera lens, lighting and color grade accordingly.
an old Swedish man sits in a study describes subject and setting in minor detail, letting the model take creative liberties in what the person and setting should look like.
and says, "I still remember when I was young." describes the dialogue. Sora will likely be able to follow this exactly.
This prompt will reliably produce videos that match these requirements. However, it might not match your vision exactly as many details are left open. For example, the prompt does not describe the time of day, weather, outfits, tone, look and age of the character, camera angles, cuts, set design and many other factors. Unless you describe these details, Sora will make them up.

Going Ultra-Detailed
For complex, cinematic shots, you can go beyond the standard prompt structure and specify the look, camera setup, grading, soundscape, and even shot rationale in professional production terms. This is similar to how a director briefs a camera crew or VFX team. Detailed cues for lensing, filtration, lighting, grading, and motion help the model lock onto a very specific aesthetic.

For example, you might describe what the viewer notices first, the camera platform and lens, lighting direction, color palette, texture qualities, diegetic sound, and shot timing. This approach works well when you want to match real cinematography styles (e.g., IMAX aerials, 35mm handheld, vintage 16mm documentary) or maintain strict continuity across shots.

Example
Format & Look
Duration 4s; 180° shutter; digital capture emulating 65 mm photochemical contrast; fine grain; subtle halation on speculars; no gate weave.

Lenses & Filtration
32 mm / 50 mm spherical primes; Black Pro-Mist 1/4; slight CPL rotation to manage glass reflections on train windows.

Grade / Palette
Highlights: clean morning sunlight with amber lift.
Mids: balanced neutrals with slight teal cast in shadows.
Blacks: soft, neutral with mild lift for haze retention.

Lighting & Atmosphere
Natural sunlight from camera left, low angle (07:30 AM).
Bounce: 4×4 ultrabounce silver from trackside.
Negative fill from opposite wall.
Practical: sodium platform lights on dim fade.
Atmos: gentle mist; train exhaust drift through light beam.

Location & Framing
Urban commuter platform, dawn.
Foreground: yellow safety line, coffee cup on bench.
Midground: waiting passengers silhouetted in haze.
Background: arriving train braking to a stop.
Avoid signage or corporate branding.

Wardrobe / Props / Extras
Main subject: mid-30s traveler, navy coat, backpack slung on one shoulder, holding phone loosely at side.
Extras: commuters in muted tones; one cyclist pushing bike.
Props: paper coffee cup, rolling luggage, LED departure board (generic destinations).

Sound
Diegetic only: faint rail screech, train brakes hiss, distant announcement muffled (-20 LUFS), low ambient hum.
Footsteps and paper rustle; no score or added foley.

Optimized Shot List (2 shots / 4 s total)

0.00–2.40 — “Arrival Drift” (32 mm, shoulder-mounted slow dolly left)
Camera slides past platform signage edge; shallow focus reveals traveler mid-frame looking down tracks. Morning light blooms across lens; train headlights flare softly through mist. Purpose: establish setting and tone, hint anticipation.

2.40–4.00 — “Turn and Pause” (50 mm, slow arc in)
Cut to tighter over-shoulder arc as train halts; traveler turns slightly toward camera, catching sunlight rim across cheek and phone screen reflection. Eyes flick up toward something unseen. Purpose: create human focal moment with minimal motion.

Camera Notes (Why It Reads)
Keep eyeline low and close to lens axis for intimacy.
Allow micro flares from train glass as aesthetic texture.
Preserve subtle handheld imperfection for realism.
Do not break silhouette clarity with overexposed flare; retain skin highlight roll-off.

Finishing
Fine-grain overlay with mild chroma noise for realism; restrained halation on practicals; warm-cool LUT for morning split tone.
Mix: prioritize train and ambient detail over footstep transients.
Poster frame: traveler mid-turn, golden rim light, arriving train soft-focus in background haze.

Visual cues that steer the look
When writing prompts, style is one of the most powerful levers for guiding the model toward your desired outcome. Describing the overall aesthetic – for example, “1970s film,” “epic, IMAX-scale scene,” or “16mm black-and-white film” – sets a visual tone that frames all other choices. Establish this style early so the model can carry it through consistently.

The same details will read very differently depending on whether you call for a polished Hollywood drama, a handheld smartphone clip, or a grainy vintage commercial. Once the tone is set, layer in specifics with shot, action, and light.

Clarity wins. Instead of vague cues like “a beautiful street,” write “wet asphalt, zebra crosswalk, neon sign reflection.” Instead of “moves quickly,” specify “jogs three steps and stops at the curb.” Verbs and nouns that point to visible results will always give you a clearer, more consistent output.

Weak prompt	Strong prompt
“A beautiful street at night”	“Wet asphalt, zebra crosswalk, neon signs reflecting in puddles”
“Person moves quickly”	“Cyclist pedals three times, brakes, and stops at crosswalk”
“Cinematic look”	“Anamorphic 2.0x lens, shallow DOF, volumetric light”
Camera direction and framing shape how a shot feels. A wide shot from above will emphasize space and context, while a close-up at eye level will focus attention on emotion. Depth of field adds another layer: shallow focus can make a subject stand out against a blurred background, while deep focus keeps both foreground and background sharp. Lighting sets tone just as strongly. A soft, warm key creates something inviting, while a single hard light with cool edges pushes toward drama.

When introducing characters, expect some unpredictability—small changes in phrasing can alter identity, pose, or the focus of the scene itself. Keep descriptions consistent across shots, reuse phrasing for continuity, and avoid mixing traits that may compete.

Weak

Camera shot: cinematic look

Strong

Camera shot: wide shot, low angle
Depth of field: shallow (sharp on subject, blurred background)
Lighting + palette: warm backlight with soft rim

Some examples for good framing instructions:

wide establishing shot, eye level
wide shot, tracking left to right with the charge
aerial wide shot, slight downward angle
medium close-up shot, slight angle from behind
Some examples for good camera motion instructions:

slowly tilting camera
handheld eng camera
Control motion and timing
Movement is often the hardest part to get right, so keep it simple. Each shot should have one clear camera move and one clear subject action. Actions work best when described in beats or counts – small steps, gestures, or pauses – so they feel grounded in time.

“Actor walks across the room” doesn’t give much to work with. A line like “Actor takes four steps to the window, pauses, and pulls the curtain in the final second” makes the timing precise and achievable.

Weak

Actor walks across the room.

Strong

Actor takes four steps to the window, pauses, and pulls the curtain in the final second.

Lighting and color consistency
Light determines mood as much as action or setting. Diffuse light across the frame feels calm and neutral, while a single strong source creates sharp contrast and tension. When you want to cut multiple clips together, keeping lighting logic consistent is what makes the edit seamless.

Describe both the quality of the light and the color anchors that reinforce it. Instead of a broad note like “brightly lit room,” specify the mix of sources and tones: “soft window light with a warm lamp fill and a cool edge from the hallway.” Naming three to five colors helps keep the palette stable across shots.

Weak

Lighting + palette: brightly lit room

Strong

Lighting + palette: soft window light with warm lamp fill, cool rim from hallway 
Palette anchors: amber, cream, walnut brown

Use image input for more control
For even more fine-grained control over the composition and style of a shot, you can use an image input as a visual reference. You can use photos, digital artwork or AI generated visuals. This locks in elements like character design, wardrobe, set dressing, or overall aesthetic. The model uses the image as an anchor for the first frame, while your text prompt defines what happens next.

How to use it

Include an image file as the input_reference parameter in your POST /videos request.

The image must match the target video’s resolution (size).
Supported file formats are: image/jpeg, image/png, and image/webp.
Input image generated with OpenAI GPT Image	Generated video using Sora 2 (converted to GIF)

Download this image


Prompt: “She turns around and smiles, then slowly walks out of the frame.”


Download this image


Prompt: “The fridge door opens. A cute, chubby purple monster comes out of it.”

Experimentation tip
If you don’t already have visual references, OpenAI’s image generation model is a powerful way to create them. You can quickly produce environments and scene designs and then pass them into Sora as references. This is a great way to test aesthetics and generate beautiful starting points for your videos.

Dialogue and Audio
Dialogue must be described directly in your prompt. Place it in a block below your prose description so the model clearly distinguishes visual description from spoken lines. Keep lines concise and natural, and try to limit exchanges to a handful of sentences so the timing can match your clip length. For multi-character scenes, label speakers consistently and use alternating turns; this helps the model associate each line with the correct character’s gestures and expressions.

You should also think about rhythm and timing: a 4-second shot will usually accommodate one or two short exchanges, while an 8-second clip can support a few more. Long, complex speeches are unlikely to sync well and may break pacing.

If your shot is silent, you can still suggest pacing with one small sound, such as “distant traffic hiss” or “a crisp snap.” Think of it as a rhythm cue rather than a full soundtrack.

Example prompt with dialogue:

A cramped, windowless room with walls the color of old ash. A single bare bulb dangles from the ceiling, its light pooling onto the scarred metal table at the center. Two chairs face each other across it. On one side sits the Detective, trench coat draped across the back of his chair, eyes sharp and unblinking. Across from him, the Suspect slouches, cigarette smoke curling lazily toward the ceiling. The silence presses in, broken only by the faint hum of the overhead light.
Dialogue:
- Detective: "You’re lying. I can hear it in your silence."
- Suspect: "Or maybe I’m just tired of talking."
- Detective: "Either way, you’ll talk before the night’s over."

Example description of background sound:

The hum of espresso machines and the murmur of voices form the background.

Iterate with the remix functionality
Remix is for nudging, not gambling. Use it to make controlled changes – one at a time – and say what you’re changing: “same shot, switch to 85 mm,” or “same lighting, new palette: teal, sand, rust.” When a result is close, pin it as a reference and describe only the tweak. That way, everything that already works stays locked.

If a shot keeps misfiring, strip it back: freeze the camera, simplify the action, clear the background. Once it works, layer additional complexity step by step.

Original Video	Remix Generated Video
Original Video 1
Original Video

Remixed Video 1
Prompt: “Change the color of the monster to orange”

Original Video 1
Original Video

Remixed Video 2
Prompt: “A second monster comes out right after”

Prompt Templates and Examples
Prompt Structure
One effective way to write prompts is to separate the different kinds of information you want the model to use. This is not a one-size-fits-all recipe for success, but it gives you a clear framework and makes it easier to be consistent. Not every detail needs to be included – if something doesn’t matter for the shot, you can leave it out.

In fact, leaving certain elements open-ended will encourage the model to be more creative. The less tightly you specify every visual choice, the more room the model has to interpret and surprise you with unexpected but often beautiful variations. Highly descriptive prompts yield more consistent, controlled results, while lighter prompts can unlock diverse outcomes that feel fresh and imaginative. Descriptive Prompt Template:

[Prose scene description in plain language. Describe characters, costumes, scenery, weather and other details. Be as descriptive to generate a video that matches your vision.]
Cinematography:
Camera shot: [framing and angle, e.g. wide establishing shot, eye level]
Mood: [overall tone, e.g. cinematic and tense, playful and suspenseful, luxurious anticipation]
Actions:
- [Action 1: a clear, specific beat or gesture]
- [Action 2: another distinct beat within the clip]
- [Action 3: another action or dialogue line]
Dialogue:
[If the shot has dialogue, add short natural lines here or as part of the actions list. Keep them brief so they match the clip length.]

Prompt Examples
Example 1
Style: Hand-painted 2D/3D hybrid animation with soft brush textures, warm tungsten lighting, and a tactile, stop-motion feel. The aesthetic evokes mid-2000s storybook animation — cozy, imperfect, full of mechanical charm. Subtle watercolor wash and painterly textures; warm–cool balance in grade; filmic motion blur for animated realism.
Inside a cluttered workshop, shelves overflow with gears, bolts, and yellowing blueprints. At the center, a small round robot sits on a wooden bench, its dented body patched with mismatched plates and old paint layers. Its large glowing eyes flicker pale blue as it fiddles nervously with a humming light bulb. The air hums with quiet mechanical whirs, rain patters on the window, and the clock ticks steadily in the background.
Cinematography:
Camera: medium close-up, slow push-in with gentle parallax from hanging tools
Lens: 35 mm virtual lens; shallow depth of field to soften background clutter
Lighting: warm key from overhead practical; cool spill from window for contrast
Mood: gentle, whimsical, a touch of suspense
Actions:
- The robot taps the bulb; sparks crackle.
- It flinches, dropping the bulb, eyes widening.
- The bulb tumbles in slow motion; it catches it just in time.
- A puff of steam escapes its chest — relief and pride.
- Robot says quietly: "Almost lost it… but I got it!"
Background Sound:
Rain, ticking clock, soft mechanical hum, faint bulb sizzle.

Example 2`;

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
  sora2PromptGuide: (): string => {
    return SORA2_PROMPT_GUIDE;
  },
} as const;
