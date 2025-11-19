from typing import Literal

from agents import function_tool


@function_tool
def read_docs_guide(
    category: Literal[
        "veo31",
        "nanobanana",
        "imagen4",
        "image_understanding",
    ],
) -> str:
    """reads available prompts guide. useful for you to learn how to use these different tools / models, their capabiltiies.
    Args:
        category: veo31: reads veo3.1 prompt guide, details on how to craft prompts for veo3.1 model.
                nanobanana: reads nanobanana prompt guide, details on how to craft prompts for
                imagen4: reads imagen 4 prompt guide, details on how to craft prompts for imagen 4 model. Text/image to image gen.
                image_understanding: capabilties like image segmentation, object detection etc.
                ... more models can be added here.


    Returns:
        The content of the prompt guide as a string.

    """
    match category:
        case "veo31":
            return StaticPrompts.veo31_from_url()
        case "nanobanana":
            return StaticPrompts.nano_banana_prompt_guide_from_url()
        case "imagen4":
            return StaticPrompts.imagen_4_from_url()
        case "image_understanding":
            return StaticPrompts.image_understanding_guide_from_url()
        case _:  # pyright: ignore[reportUnnecessaryComparison]
            raise ValueError(f"Unsupported category type: {category}")  # pyright: ignore[reportUnreachable]


class StaticPrompts:
    @staticmethod
    def veo31_from_url():
        url = "https://ai.google.dev/gemini-api/docs/video.md.txt"
        return StaticPrompts.fetch_url_content(url)

    @staticmethod
    def imagen_4_from_url():
        return StaticPrompts.fetch_url_content(
            "https://ai.google.dev/gemini-api/docs/imagen.md.txt"
        )

    @staticmethod
    def nano_banana_prompt_guide_from_url():
        return StaticPrompts.fetch_url_content(
            "https://ai.google.dev/gemini-api/docs/image-generation.md.txt"
        )

    @staticmethod
    def image_understanding_guide_from_url():
        return StaticPrompts.fetch_url_content(
            "https://ai.google.dev/gemini-api/docs/image-understanding.md.txt"
        )

    @staticmethod
    def general_image_prompt_guide():
        return IMAGE_PROMPT_GUIDE_GENERAL

    @staticmethod
    def good_veo31_prompt_examples():
        return GOOD_VEO31_PROMPT_EXAMPLES

    @staticmethod
    def good_nano_banana_prompt_examples():
        return NANO_BANANA_GOOD_PROMPT_EXAMPLES

    @staticmethod
    def fetch_url_content(url: str) -> str:
        import requests

        response = requests.get(url)
        if response.status_code == 200:
            return response.text
        else:
            raise ValueError(
                f"Failed to fetch content from {url}, status code: {response.status_code}"
            )


IMAGE_PROMPT_GUIDE_GENERAL = """
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
    Consider using a larger model like Imagen 3 instead of Imagen 3 Fast to improve detail.

    Photography modifiers
    In the following examples, you can see several photography-specific modifiers and parameters.

    Camera Proximity - Close up, taken from far away

    close up camera sample image
    Prompt: A close-up photo of coffee beans
    zoomed out camera sample image
    Prompt: A zoomed out photo of a small bag of
    coffee beans in a messy kitchen
    Camera Position - aerial, from below

    aerial photo sample image
    Prompt: aerial photo of urban city with skyscrapers
    a view from underneath sample image
    Prompt: A photo of a forest canopy with blue skies from below
    Lighting - natural, dramatic, warm, cold

    natural lighting sample image
    Prompt: studio photo of a modern arm chair, natural lighting
    dramatic lighting sample image
    Prompt: studio photo of a modern arm chair, dramatic lighting
    Camera Settings - motion blur, soft focus, bokeh, portrait

    motion blur sample image
    Prompt: photo of a city with skyscrapers from the inside of a car with motion blur
    soft focus sample image
    Prompt: soft focus photograph of a bridge in an urban city at night
    Lens types - 35mm, 50mm, fisheye, wide angle, macro

    macro lens sample image
    Prompt: photo of a leaf, macro lens
    fisheye lens sample image
    Prompt: street photography, new york city, fisheye lens
    Film types - black and white, polaroid

    polaroid photo sample image
    Prompt: a polaroid portrait of a dog wearing sunglasses
    black and white photo sample image
    Prompt: black and white photo of a dog wearing sunglasses
    Image source: Each image was generated using its corresponding text prompt with the Imagen 3 model.

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

    Use case	Lens type	Focal lengths	Additional details
    People (portraits)	Prime, zoom	24-35mm	black and white film, Film noir, Depth of field, duotone (mention two color

    Objects
    Use case	Lens type	Focal lengths	Additional details
    Food, insects, plants (objects, still life)	Macro	60-105mm	High detail, precise focusing, controlled lighting

    Motion
    Use case	Lens type	Focal lengths	Additional details
    Sports, wildlife (motion)	Telephoto zoom	100-400mm	Fast shutter speed, Action or movement tracking

    Wide-angle
    Use case	Lens type	Focal lengths	Additional details
    Astronomical, landscape (wide-angle)	Wide-angle	10-24mm	Long exposure times, sharp focus, long exposure, smooth water or clouds

"""


GOOD_VEO31_PROMPT_EXAMPLES = """
    Best Veo 3 Prompts That Generated Millions of Views (+ Exact Templates)

    Best Veo 3 Prompts That Generated Millions of Views (+ Exact Templates)
    Last week, I watched a $500K commercial director get humbled—by a 22-year-old college kid with $5 in Veo 3 credits. 

    The kid’s AI-generated ad blew the director’s last three projects out of the water. The difference? Not talent. Not experience. Just the right prompt. 

    Veo 3 isn’t just an AI video tool—it’s a content weapon. It syncs audio, maintains characters, and follows complex directions with insane precision. 

    But only if you know how to speak its language. In this post, I’ll share 20+ battle-tested prompts that consistently go viral—and the exact framework I use to make AI magic on demand.

    ALSO READ: What ChatGPT Model Is Worth Using


    Discover The Biggest AI Prompt Library by God Of Prompt
    Why Most Veo 3 Prompts Suck (And Mine Don’t)
    Most people approach Veo 3 like they’re ordering a Big Mac: “Make me a video of a person talking.”

    Then they wonder why their output looks like a fever dream.

    Here’s what separates viral prompts from trash: specificity breeds virality. 

    The AI needs to know exactly what you want, down to the camera angle, lighting setup, and audio cues.

    The 6-Element Viral Prompt Formula

    The 6-Element Viral Prompt Formula
    Every prompt that goes viral contains these six elements:

    1. Subject: Who or what is the main focus

    1. Action: What’s happening in the scene

    1. Setting: Where it’s taking place

    1. Style: Visual aesthetic and camera work

    1. Audio: Dialogue, music, or sound effects

    1. Mood: The emotional tone you’re targeting

    Generic prompt: 

    “A person giving a presentation”

    Viral prompt: 

    “A confident woman in a navy blazer presents quarterly results to a boardroom of executives. Shot with a professional camera at eye level, warm lighting from tall windows. She says: ‘Revenue is up 300% this quarter.’ Background sounds of shuffling papers and quiet murmurs. Corporate, polished atmosphere.”
    See the difference? The second prompt gives Veo 3 everything it needs to create something specific and engaging.

    Quick Win: The Prompt Template That Never Fails

    Copy this template and fill in the blanks:

    [Camera angle] shot of [subject] [action] in [setting]. [Lighting description]. [Subject] says: “[exact dialogue].” [Background audio]. [Mood/style] aesthetic.

    This template is behind 80% of the viral videos I’ve tracked. Use it, and you’re already ahead of 90% of Veo 3 users.

    Now let’s get into the good stuff—the exact prompts that broke the internet.

    Cinematic Prompts That Look Like Hollywood Budget
    These prompts create videos that look like they cost six figures to produce. Perfect for building authority or just showing off.

    1. The Dramatic Monologue

    Close-up shot of a weathered man in his 50s sitting by a rain-streaked window. Soft, moody lighting from outside creates dramatic shadows across his face. He looks directly into camera and says: "I've built empires and watched them crumble. But the one thing that never fails? The right strategy at the right time." Gentle rain sounds and distant thunder. Cinematic, contemplative atmosphere with shallow depth of field.
    Why it works: The rain, lighting, and philosophical dialogue hit all the viral engagement triggers. People share content that makes them feel something.

    2. The Epic Reveal

    Wide establishing shot slowly dollying toward a massive modern office building at golden hour. The camera pushes through floor-to-ceiling windows to reveal a silhouetted figure at a standing desk. The figure turns—a sharp-dressed woman in her 30s. She smiles confidently and says: "They said it couldn't be done in 90 days. We did it in 30." Ambient city sounds below, soft piano building in background. Triumphant, corporate aesthetic.
    Why it works: The camera movement builds anticipation, and the underdog success story is catnip for business audiences.

    3. The Mysterious Expert

    Medium shot of an elderly professor surrounded by ancient books in a dimly lit library. Warm amber lighting from a desk lamp illuminates his weathered hands as he opens a leather-bound journal. He looks up with knowing eyes and says: "The secret isn't in what you learn. It's in what you unlearn." Pages rustling, clock ticking softly. Academic, mysterious mood with film grain texture.
    Why it works: Wisdom + mystery = engagement gold. This format works for any expertise-based content.

    4. The Time-Pressure Thriller

    Handheld camera following a focused entrepreneur walking quickly through a busy startup office at night. Fluorescent lighting mixed with computer screen glow. She checks her watch and says: "Forty-eight hours to launch. No room for mistakes." Keyboard clicking, phone buzzing, urgent footsteps. High-energy, documentary-style aesthetic.
    Why it works: Urgency is addictive. The behind-the-scenes feel makes viewers feel like insiders.

    5. The Victory Moment

    Slow-motion medium shot of a young CEO standing on a building rooftop at sunset, city skyline behind her. Golden hour lighting with natural lens flares. She raises a champagne glass and says: "To everyone who said we'd never make it—thank you for the motivation." Wind blowing gently, city sounds below. Inspirational, cinematic victory aesthetic.
    Why it works: Success stories are highly shareable, especially when they include gratitude and defiance.

    Viral Social Media Prompts (Copy These Exactly)

    Viral Social Media Prompts (Copy These Exactly)
    These prompts are optimized for TikTok, Instagram, and Twitter. They’re designed to stop the scroll and generate comments.

    6. The POV Confession

    Selfie-style video of a millennial woman in her apartment, holding phone with arm extended. Natural lighting from a large window. She looks directly into camera with a slightly conspiratorial expression and says: "POV: You just realized you've been doing productivity all wrong for 10 years." Background sounds of city traffic, casual apartment ambiance. Relatable, authentic vlog aesthetic. No subtitles.
    Why it works: POV format is TikTok gold, and “you’ve been doing it wrong” is an instant engagement hook.

    7. The Awkward Truth

    Close-up selfie of a Gen Z guy in a coffee shop, slightly shaky handheld camera. Natural cafe lighting with soft shadows. He leans in conspiratorially and says: "Nobody talks about how networking events are just adult playground politics with name tags." Coffee shop ambiance, espresso machine sounds. Casual, observational comedy style.
    Why it works: Uncomfortable truths about common experiences generate massive engagement through relatability.

    8. The Behind-the-Scenes Reality

    Phone camera POV of someone's messy desk covered in notebooks, coffee cups, and laptop cables. Natural desk lamp lighting. The person's hands gesture over the chaos as they say off-camera: "This is what 'having it all together' actually looks like." Keyboard clicking, paper shuffling, honest workspace sounds. Raw, unfiltered authenticity.
    Why it works: The contrast between perception and reality is endlessly shareable content.

    9. The Plot Twist Reveal

    Medium shot of a woman in business attire sitting in what appears to be a corporate meeting room. Professional lighting and clean background. She maintains serious eye contact and says: "So I quit my six-figure job to start a TikTok account about spreadsheets. My parents still don't understand." Office ambiance, subtle air conditioning hum. Deadpan delivery, corporate setting.
    Why it works: Unexpected career pivots + generational humor = viral content formula.

    10. The Generational Callout

    Split-screen style showing a Boomer dad trying to use a smartphone while his millennial daughter watches. Natural home lighting from living room windows. The daughter says: "Dad, you don't need to say 'period' out loud when you text." Father typing hunt-and-peck style, daughter's amused sigh. Family comedy, slice-of-life aesthetic.
    Why it works: Generational differences are universally relatable and highly shareable across age groups.

    Commercial & Marketing Prompts That Convert
    These prompts create professional-looking commercials and product demos without the Hollywood budget.

    11. The Product Hero Shot

    Slow-motion close-up of premium wireless headphones rotating on a minimalist white surface. Professional studio lighting with subtle rim lighting creating elegant reflections. A smooth male voice says: "Sound so clear, you'll forget you're wearing anything at all." Subtle ambient electronic music building. Clean, premium commercial aesthetic with shallow depth of field.
    Why it works: Product-focused content with emotional benefit messaging converts viewers into customers.

    12. The Problem-Solution Story

    Split-screen showing a stressed entrepreneur juggling multiple phones and laptops, then cutting to the same person calmly using a single device. Professional office lighting, clean modern aesthetic. Voiceover says: "Before: chaos. After: control. The difference? The right tools." Transition sound effect, productivity app interface sounds. Problem-solution narrative structure.
    Why it works: Before/after transformations are advertising gold—they make the benefit immediately visual.

    13. The Testimonial That Doesn’t Suck

    Medium shot of a genuine-looking small business owner in her natural work environment—a cozy bakery kitchen. Warm, natural lighting from large windows. She kneads dough while speaking: "I thought AI was going to replace me. Instead, it freed me to focus on what I love—creating." Bakery sounds, gentle background music. Authentic, heartfelt tone.
    Why it works: Real people in real environments talking about real benefits beats corporate testimonials every time.

    14. The Demonstration Reveal

    Over-the-shoulder shot of someone's hands using a design tool on a laptop screen. Clean desk setup with professional lighting. The screen shows a complex design being created in seconds. Person says: "What used to take me 6 hours now takes 6 minutes." Software interface sounds, satisfying completion chimes. Productivity reveal aesthetic.
    Why it works: Time-saving demonstrations appeal directly to the viewer’s desire for efficiency.

    15. The Authority Builder

    Professional headshot-style video of an industry expert in a contemporary office setting. Excellent lighting and sharp focus. She looks confidently into camera and says: "After 15 years in marketing, I can tell you the biggest mistake companies make—they focus on features, not feelings." Subtle office ambiance, authoritative tone. Executive, trustworthy aesthetic.
    Why it works: Industry credentials + contrarian insight = instant authority and shareability.

    Character & Storytelling Prompts
    These prompts excel at creating consistent characters and narrative content that keeps viewers engaged.

    16. The Recurring Character Introduction

    Medium shot of a quirky office worker—thick glasses, colorful cardigan, holding an oversized coffee mug. Fluorescent office lighting with cubicle background. She looks directly at camera with deadpan expression and says: "Hi, I'm Janet from HR, and today we're discussing why your team-building ideas are actually trauma bonding." Office keyboard sounds, copy machine humming. Workplace comedy aesthetic.
    Why it works: Strong character archetypes with specific quirks create memorable content that audiences want to see more of.

    17. The Mini-Documentary Setup

    Handheld documentary-style shot following a food truck owner during lunch rush. Natural outdoor lighting with urban background. Camera captures him expertly assembling orders while he explains: "People think running a food truck is easy money. Let me show you what 'easy' looks like." Sizzling grill sounds, busy street ambiance. Authentic documentary feel.
    Why it works: Documentary-style content feels more authentic and trustworthy than traditional marketing.

    18. The Dialogue-Driven Scene

    Two-shot of a mentor and mentee sitting across from each other in a modern coffee shop. Natural window lighting creating soft shadows. The mentor leans forward and says: "The biggest career mistake I see? Waiting for permission to be excellent." The mentee nods thoughtfully and responds: "So you just... started acting like you belonged?" Coffee shop ambiance, casual conversation tone.
    Why it works: Dialogue reveals character and delivers value simultaneously, doubling the engagement factor.

    19. The Character Arc Moment

    Close-up of a previously defeated-looking entrepreneur, now confident and smiling, standing in front of a 'Grand Opening' sign. Golden hour lighting creating a warm, triumphant glow. She looks at the camera and says: "Six months ago, I was ready to quit. Today, I'm opening my third location." Crowd sounds, celebratory atmosphere. Transformation narrative aesthetic.
    Why it works: Character growth stories tap into viewers’ aspirational desires and hope for their own transformation.

    20. The Ensemble Cast Moment

    Wide shot of a diverse startup team gathered around a conference table, laptops open, working intensely. Natural office lighting with late afternoon sun streaming through windows. One team member looks up and says: "We just hit a million users." The room erupts in cheers and applause. Team celebration sounds, authentic group dynamics. Collaborative success aesthetic.
    Why it works: Group success stories make viewers feel part of something bigger, driving engagement and shares.

    Advanced Prompt Engineering Secrets
    Now for the technical stuff that separates pros from amateurs. These techniques will make your Veo 3 outputs consistently better.

    The Subtitle Elimination Trick

    Veo 3 loves adding unwanted subtitles. Here’s how to stop it:

    - Always add “No subtitles” at the end of every prompt

    - Include “No on-screen text” for extra insurance

    - Use “Clean audio without text overlay” for professional content

    Physics-Aware Prompting

    Veo 3 understands real-world physics, but you need to prompt for it:

    - Use specific materials: “silk fabric flowing” not just “fabric”

    - Describe weight and momentum: “heavy wooden door swinging slowly”

    - Include environmental factors: “hair blowing in strong wind”

    Audio Synchronization Hacks

    Perfect audio sync requires specific language:

    - For dialogue: “She says:” followed by exact words in quotes

    - For timing: “As the music builds” or “When the sound stops”

    - For ambient audio: Describe specific environmental sounds

    Camera Movement Mastery

    Veo 3 responds well to film terminology:

    - “Dolly in” for smooth forward movement

    - “Tracking shot” for following subjects

    - “Handheld” for authentic, shaky footage

    - “Shallow depth of field” for professional blur

    Character Consistency Secrets

    To maintain the same character across multiple videos:

    - Use identical physical descriptions every time

    - Include specific clothing details

    - Mention the same environmental elements

    - Use consistent lighting descriptions

"""


NANO_BANANA_GOOD_PROMPT_EXAMPLES = """
    30+ Hottest Nano Banana Model Prompts (Copy and Paste)
    Marvin
    Discover the hottest Nano Banana AI photo model prompts copy and paste to effortlessly create stunning AI-generated images. From style fusion and pose control to multi-image blending, this Gemini AI photo prompt guide unlocks all the latest trending AI photo prompts.

    Fotor nano banana model prompt blog banner image
    Now, Nano Banana AI﻿ has taken the AI community by storm. Powered by Google’s Gemini 2.5 Flash Image model, it has fueled over 200 million creative edits and attracted millions of new users. Known for its blazing-fast generation, consistent results, and photorealistic output, Nano Banana makes it easy to transform simple photos into 3D figurines, retro artworks, or cinematic posters. While other tools like Flux Kontext AI offer creative flexibility, Google Gemini AI Nano Banana’s speed and accuracy make it the perfect choice for experimenting with fun, viral, and highly detailed Google Gemini AI prompt copy and paste. In this guide, we’ll explore the latest and hottest Nano Banana model prompt text, complete with step-by-step prompts and practical usage tips. All you need to do is make a Gemini prompt, copy and paste it into the tool, so you can create viral-ready AI images.

    Image Effects
    1. Nano Banana 3D Action Figure
    Easily generate lifelike 3D action figures from your images﻿ with Nano Banana prompts, turning your picture into stunning, detailed models. Try to use Google Gemini prompt copy and paste to quickly apply your prompts and streamline the creative process.

    ✅ Nano Banana Prompt:

    create a 1/7 scale commercialized figure of thecharacter in the illustration, in a realistic styie and environment.Place the figure on a computer desk, using a circular transparent acrylic base without any text.On the computer screen, display the ZBrush modeling process of the figure.Next to the computer screen, place a BANDAI-style toy packaging box printedwith the original artwork.

    3d action figure original image
    3d action figure generated image
    2. Chibi Knitted Doll
    Quickly transform your images into cute chibi-style knitted dolls with Gemini AI prompt copy and paste. With Gemini AI prompt copy paste, you can easily apply pre-made prompts to achieve consistent, high-quality results every time.

    ✅ Nano Banana Prompt:

    ﻿A close-up, professionally composed photograph showcasing a hand-crocheted yarn doll gently cradled by two hands. The doll has a rounded shape, featuring the cute chibi image of the [upload image] character, with vivid contrasting colors and rich details. The hands holding the doll are natural and gentle, with clearly visible finger postures, and natural skin texture and light/shadow transitions, conveying a warm and realistic touch. The background is slightly blurred, depicting an indoor environment with a warm wooden tabletop and natural light streaming in from a window, creating a comfortable and intimate atmosphere. The overall image conveys a sense of exquisite craftsmanship and cherished warmth.

    chibi knitted doll original image
    chibi knitted doll after image
    3. Character Capsules
    Create compact, stylized character capsules from your images using Nano Banana prompt example. For convenience, try a Gemini AI photo prompt copy paste to quickly replicate high-quality results.

    ✅ Nano Banana Prompt:

    A detailed, transparent gashapon capsule diorama, held between fingers, featuring [NAME] in their [ICONIC POSE / STYLE]. Inside: [short description of figure’s look, clothing, and accessories], with background elements such as [relevant setting: stadium, stage, lecture hall, etc.]. Lighting should be dramatic and cinematic, matching their theme. The capsule has a transparent top and a colored base [choose fitting color: e.g., royal blue, gold, black, red], decorated with [motifs related to the person]. The base is labeled with [NAME or NICKNAME] in a matching font style. The design should look like a miniature collectible, with photorealistic detail and soft bokeh.

    👀 Note: Replace [NAME], [ICONIC POSE / STYLE], [short description of figure’s look, clothing, and accessories], [relevant setting: stadium, stage, lecture hall, etc.], [choose fitting color: e.g., royal blue, gold, black, red], and [NAME or NICKNAME] in the prompt with specific descriptions.

    character capsules original girl
    character capsules generated girl
    4. Character Plush Toys
    Transform your characters into adorable plush toys instantly with Nano Banana model prompts. You can also try AI prompt copy paste to quickly apply ready-made prompts and achieve consistent, high-quality results.

    ✅ Nano Banana Prompt:

    A soft, high-quality plush toy of [CHARACTER], with an oversized head, small body, and stubby limbs. Made of fuzzy fabric with visible stitching and embroidered facial features. The plush is shown sitting or standing against a neutral background. The expression is cute or expressive, and it wears simple clothes or iconic accessories if relevant. Lighting is soft and even, with a realistic, collectible plush look. Centered, full-body view.

    👀 Note: Replace [CHARACTER] in the prompt with specific descriptions.

    character plush toy original image
    character plush toy generated image
    5. iPhone Selfie
    Generate realistic iPhone-style selfies from your photos using the trending prompt for Nano Banana. Try using Google Gemini AI prompt copy and paste for ready-made prompts that make it easy to generate high-quality, consistent selfies.

    ✅ Nano Banana Prompt:

    Please draw an extremely ordinary and unremarkable iPhone selfie, with no clear subject or sense of composition — just like a random snapshot taken casually. The photo should include slight motion blur, with uneven lighting caused by sunlight or indoor lights resulting in mild overexposure. The angle is awkward, the composition is messy, and the overall aesthetic is deliberately plain — as if it was accidentally taken while pulling the phone out of a pocket. The subjects are [Names], taken at night, next to the [Location].

    👀 Note: Replace [name] and [Location] in the prompt with specific descriptions.

    iphone selfie original boy
    iphone selfie generated boy
    6. Chibi Emoji Sticker
    Copy and paste this trending AI photo prompt to create playful chibi emoji stickers from any image using different poses. Simply use a Gemini prompt copy paste to speed up the process and get fun, shareable results.

    ✅ Nano Banana Prompt:

    Making a playful peace sign with both hands and winking. Tearful eyes and slightly trembling lips, showing a cute crying expression. Arms wide open in a warm, enthusiastic hug pose. Lying on their side asleep, resting on a tiny pillow with a sweet smile. Pointing forward with confidence, surrounded by shining visual effects. Blowing a kiss, with heart symbols floating around. Maintain the chibi aesthetic. Exaggerated, expressive big eyes. Soft facial lines. Background: Vibrant red with star or colorful confetti elements for decoration. Leave some clean white space around each sticker. Aspect ratio: 9:16

    chibi emoji sticker original image
    chibi emoji sticker generated image
    7. Funko Pop Figure
    Quickly turn your photos into collectible Funko Pop-style figures﻿ with Gemini AI photo prompt copy and paste.

    ✅ Nano Banana Prompt:

    Create a detailed 3D render of a chibi Funko Pop figure, strictly based on the provided reference photo. The figure should accurately reflect the person's appearance, hairstyle, attire, and characteristic style from the photo. High detail, studio lighting, photorealistic texture, pure white background.

    👀 Note: Replace [name] in the prompt with specific descriptions.

    funko pop figure original image
    funko pop figure generated image
    8. Ghibli Style
    Transform your images into enchanting scenes inspired by Studio Ghibli image style﻿ with Google Gemini AI prompt copy and paste.

    ✅ Nano Banana Prompt:

    Redraw this photo in Ghibli style

    ⭐ Click here to copy and paste this AI photo prompt text in the Nano Banana model ⭐

    ghibli style original image
    ghibli style generated image
    9. Game UI
    Convert your designs into immersive game UI elements with Nano Banana model prompts. With Google Gemini prompt copy paste, you can quickly apply ready-to-use instructions and keep your interface consistent and visually striking.

    ✅ Nano Banana Prompt:

    A vibrant rhythm dance game screenshot featuring the 3D animated character from the reference photo, keeping its unique style, hat, outfit, and confident dance pose. Immersive cinematic lighting with neon pink and purple glow, glossy reflective dance floor shining under spotlights, and dynamic 3D cartoon style. Rhythm game interface with immersive UI: score meter at the top, colorful music waveform animations synced to the beat, stage timer countdown, and floating combo numbers. Highly detailed, game-like atmosphere with energy bars, neon particle effects, and immersive arcade rhythm game HUD elements. Ultra-detailed, cinematic, immersive, 3D animation.

    game ui original image
    game ui generated image
    10. Image Fusion: Combine Multiple Images
    Seamlessly merge multiple photos into one﻿ cohesive and visually striking image with Nano Banana prompt guide. For faster results, try a Google Gemini AI prompt copy paste to apply pre-set instructions and enhance creativity without extra effort.

    ✅ Nano Banana Prompt:

    Combine multiple images ([Image1], [Image2], [Image3], …) into a single cohesive image. Keep all key subjects recognizable and maintain their proportions and details. Blend the images naturally with consistent lighting, shadows, perspective, and style. Photorealistic, high-resolution, seamless integration.

    combine multiple original images
    combining all images into one
    11. Style Fusion
    Blend the styles of two images to create a unique, harmonious look with the Nano Banana prompt generator. You can also explore Gemini AI photo prompt copy paste options to quickly try trending styles and refine your creative results.

    ✅ Nano Banana Prompt:

    Transform this image [Image1] into the artistic style of [Image2]. Keep the main subject, composition, and details from [Image1], but apply the colors, textures, and overall aesthetic of [Image2]. High-quality, [illustraition] style, consistent details.

    👀 Note: Replace [illustraition] in the prompt with specific descriptions.

    style fusion original images
    style fusion generated image
    12. Virtual Change Clothes
    Instantly use Gemini AI photo prompt copy and paste to change outfits﻿ on your subjects to see them in new styles and looks.

    ✅ Nano Banana Prompt:

    Keep the character in [Image1] unchanged, but replace her pant with the outfit in [Image2]. Maintain the same pose, body proportions, and facial features, while applying the color, texture, and style of the pants in [Image2]. High-quality, realistic, consistent detail.

    virtual change clothes original image
    virtual change clothes generated image
    Portrait Editing
    13. Facial Expression Control
    Adjust facial expressions﻿ to make your subjects smile, frown, or show any emotion using Nano Banana model prompts. For quick edits, use Gemini prompt copy paste to apply ready-made instructions and keep results consistent.

    ✅ Nano Banana Prompt:

    Keep the person from [Image1] unchanged, but change their facial expression to [desired expression, e.g., smiling, surprised, angry]. Preserve the pose, body proportions, hairstyle, and overall appearance. Maintain realistic lighting, shadows, and photorealistic details.

    facial expression control original image
    facial expression control generated image
    14. Pose Control
    Change the posture of your subjects to achieve dynamic or natural poses with the Google Gemini AI prompt copy and paste.

    ✅ Nano Banana Prompt:

    Take the two men and place them in the exact poses of the man in green carrying the man in red. Preserve their identities, body proportions, and clothing details. Ensure the pose is natural and realistic, with consistent lighting, shadows, and perspective. Photorealistic, high-resolution result.

    pose control original image
    pose control generated image
    15. Body Reshape
    Easily transform body shapes, from muscular to slim or fuller, with a few simple Google Gemini AI prompt copy and paste adjustments.

    ✅ Nano Banana Prompt:

    Reshape the body of the person in [Image1] into a [target body type]. Keep the face, identity, hairstyle, and clothing consistent. Ensure realistic anatomy, natural proportions, and photorealistic details.

    body reshape original image
    body reshape generated image
    16. 3x3 Grid Portrait
    Generate a 3x3 grid of portraits showcasing different life experience using Nano Banana model prompts. To simplify the process, try Google Gemini prompt copy paste for quick, consistent results across all portraits.

    ✅ Nano Banana Prompt:

    Using the uploaded photo as a reference, generate a set of 9 vibrant half-length portraits featuring natural life. Each portrait should show a different pose and be placed in a unique setting, with rich, colorful details that highlight the diversity of nature.

    3x3 grid portrait original image
    3x3 grid portrait generated image
    Image Editing
    17. Change Image Background
    Type in prompts for Nano Banana to replace any image background with a new scene while keeping the subject intact. You can also use trending AI photo prompt text to apply pre-built edits and achieve professional results faster.

    ✅ Nano Banana Prompt:

    Replace the background of [Image1] with [desired background description, e.g., a beach, a forest, a city skyline]. Keep the main subject (person/object) unchanged, maintaining original proportions, lighting, and details. Ensure the subject blends naturally with the new environment. Photorealistic, high-resolution, seamless integration.

    change image background original image
    change image background generated image
    18. Add and Remove Object from Image
    Add Object to Image

    Easily insert new objects into your images and make them blend naturally. For faster creative edits, try AI prompt copy paste to apply pre-designed instructions and keep results seamless.

    ✅ Nano Banana Prompt:

    Add [desired element, e.g., a tree, a lamp, a dog] to [Image1]. Place it naturally in the scene, matching the lighting, perspective, and style. Keep the original elements unchanged. Photorealistic, seamless integration.

    add object to image original image
    add object to image generated image
    Remove Object from Image

    Remove unwanted objects from your photos﻿ for a clean, polished result with Nano Banana photo editor. You can also use Google Gemini prompt copy paste to quickly apply editing instructions and keep your images distraction-free.

    ✅ Nano Banana Prompt:

    Remove [element to remove, e.g., a person, a car, a sign] from [Image1]. Fill the background naturally to maintain the scene’s continuity, lighting, and details. Keep all other elements unchanged. Photorealistic, high-resolution.

    remove object from image original image
    remove object from image generated image
    19. Change Camera Angle
    Adjust the camera perspective to capture your subject from any viewpoint with this trending AI photo prompt. You can also try treding AI photo prompt text to quickly apply pre-made instructions and achieve consistent, professional results.

    ✅ Nano Banana Prompt:

    Recreate the person from [Image1] in four different camera perspectives.Keep the subject’s identity, body proportions, and clothing consistent across all four images. Maintain the same background environment as [Image1], with photorealistic lighting, natural shadows, and high-quality details.
    Generate four variations side by side:

    Bird’s-eye view (from above).
    Rear view (from behind).
    Side profile view.
    Close-up portrait view.﻿
    change camera angle original image
    change camera angle generated image
    20. Edit Text in Image
    Modify or replace text within your images﻿ while keeping the design intact. For easier edits, you can use Google Gemini AI photo prompt copy paste to quickly apply ready-made instructions and maintain consistency.

    ✅ Nano Banana Prompt:

    Edit the text in [Image1]. Replace the existing text with “[your new text]” while keeping the background, design, and other elements unchanged. Match the font style, size, and color to look natural and consistent with the image. Photorealistic, seamless integration.

    edit text in image original image
    edit text in image generated image
    21. Time-Based Image Generation
    Generate scenes that reflect specific moments in time, like 10 minutes later or at sunset, controlling time using the Nano Banana prompt example.

    ✅ Nano Banana Prompt:

    Generate an image of the same scene as [Image1], but showing how it looks 10 minutes later. Keep the environment and style consistent, but add natural changes over time such as light, weather, people and so on. Photorealistic, seamless continuity.

    time based image generation original image
    time based image generation generated image
    22. Object Extraction
    Easily isolate and extract specific objects from any image for further editing or reuse.

    ✅ Nano Banana Prompt:

    Extract the clothing from [Image1] and present it as a clean e-commerce product photo. Remove the model’s body completely. Keep the outfit in natural 3D shape, with realistic fabric folds, seams, and textures. Display the garment as if photographed on a mannequin or neatly laid flat, centered on a pure white or transparent background. High-resolution, professional lighting, suitable for online fashion catalog.

    object extraction original image
    object extraction generated image
    23. Enhance Image
    Improve image quality﻿, sharpening details and boosting clarity with minimal effort.

    ✅ Nano Banana Prompt:

    Enhance [Image1] to improve overall quality and detail. Keep the original composition, colors, and style intact. Increase resolution, sharpness, texture clarity, and lighting realism. Output as a photorealistic, high-resolution image.

    enhance image original image
    enhance image generated image
    24. Change the Weath﻿﻿﻿er
    Transform the scene’s weather instantly, from sunny to rainy, snowy, or foggy, with realistic effects.

    ✅ Nano Banana Prompt:

    Change the weather in [Image1] to [desired weather, e.g., rainy, snowy, foggy, sunny]. Keep the main subject and overall scene intact. Adjust lighting, shadows, colors, and environmental effects to match the new weather. Photorealistic, seamless integration, high-resolution.

    change the weath﻿﻿﻿er original image
    change the weath﻿﻿﻿er generated image
    25. Change Image Color
    Easily adjust the colors of your images to match any mood, style, or aesthetic.

    ✅ Nano Banana Prompt:

    Change the colors in [Image1] to [desired color/style, e.g., warm tones, cool blue tones, pastel colors]. Keep the main subject and composition intact. Adjust lighting, shadows, and overall color balance to match the new color scheme. Photorealistic, high-resolution, natural-looking result.

    change the color original image
    change the color generated image
    26. Image Replace
    Swap specific elements or subjects in your image seamlessly with new ones.

    ✅ Nano Banana Prompt:

    Replace [target element or area] in [Image1] with [new element or reference, e.g., a different person, object, or scene]. Keep all other parts of the image unchanged. Ensure the replacement blends naturally with lighting, perspective, and overall style. Photorealistic, high-resolution, seamless integration.

    image replace original image
    image replace generated image
    27. Image Outpainting
    Extend your images beyond the original borders, creating natural and seamless new content.

    ✅ Nano Banana Prompt:

    Extend [Image1] beyond its original borders using outpainting. Keep the main subject and composition intact. Generate new content around the edges that matches the style, colors, lighting, and perspective of the original image. Photorealistic, high-resolution, seamless integration.

    image outpainting original image
    image outpainting generated image
    Nano Banana users have probably run into the issue of not being able to customize image aspect ratios. Simply entering a Nano Banana image prompt with the desired dimensions won’t generate an image in the exact size. However, by using the following method, you can control the aspect ratio when expanding the image:

    First, upload the “original image to be outpainted.”
    Second, upload the “aspect ratio template image.”
    the original image to be outpainted
    the image for ratio referrence
    Input the following the image prompt:
    ✅ Nano Banana Prompt:

    Redraw the content of Figure 1 onto Figure 2, add more detailed content to Figure 1 to fit the aspect ratio of Figure 2, completely clear the content of Figure 2, and only retain the aspect ratio of Figure 2.

    the generated outpainted image
    28. Line to Image
    turn line art or sketches into an image that is fully colored and detailed with realistic or stylized effects.

    ✅ Nano Banana Prompt:

    Convert the line art in [Image1] into a fully colored and detailed image. Preserve all original outlines and compositions. Apply [desired style, e.g., photorealistic, anime, cartoon, digital painting] with realistic lighting, shadows, and textures. High-resolution, natural, seamless rendering.

    line to image original image
    line to image generated image
    29. 3x3 Photo Grid Pose
    Generate a 3x3 photo grid with varied poses, giving your portraits a dynamic and stylish presentation.

    ✅ Nano Banana Prompt:

    Turn the photo into a 3x3 grid of photo strips with different studio-style poses and expressions.

    ⭐ Click here to copy and paste this AI photo prompt text in the Nano Banana model ⭐

    3x3 photo grid pose original image
    3x3 photo grid pose generated image

"""
