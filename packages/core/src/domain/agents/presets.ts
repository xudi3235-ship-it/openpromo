export namespace Presets {
  type Preset = {
    id: string;
    name: string;
    description: string;
    thumbnailUrl: string;
    prompt: string;
    assets: {
      type: "image";
      url: string;
    }[];
  };

  // client only for render UI
  export type ClientPreset = Omit<Preset, "prompt" | "assets">;

  /**
   * predefined presets to be loaded in the video-gen-agent. represents common, pre-collected styles and prompts
   * user can select from the UI with image and then generate. the prompt and other assets reference is NOT exposed
   * to user.
   */
  export class Manager {
    constructor() {}

    async loadClientPresets(): Promise<ClientPreset[]> {
      const presets = await this.loadPresets();
      return presets.map((item) => {
        const { prompt: _, ...rest } = item;
        return rest;
      });
    }

    async loadPresets(): Promise<Preset[]> {
      const presets = [...Manager.internalPresets];
      return presets;
    }

    async getByID(id: string): Promise<Preset | null> {
      const presets = await this.loadPresets();
      return presets.find((preset) => preset.id === id) || null;
    }

    // ---------------------------------
    // internal, pre-defined presets, for now hardcoded, will use Workers AI + Vectorize,
    // to dynamically load and search.
    // ---------------------------------
    private static internalPresets: Preset[] = [
      {
        id: "hook-scroll-stop",
        name: "Hook + Scroll-Stop",
        description:
          "Bold text overlay with confident creator holding product—designed to stop the scroll immediately.",
        thumbnailUrl:
          "https://i.pinimg.com/736x/1d/bc/9f/1dbc9f511786fec6bba98d41d6474fc1.jpg",
        prompt: `Generate a scroll-stopping hook video concept with maximum thumb-stopping power.

Visual Style: Clean, minimalist background (neutral gray, white, or solid color). Single creator centered in frame, wearing simple casual clothing (tank top, t-shirt, etc.). Product held naturally at chest/face level.

Text Overlay: Large, bold white sans-serif text at the top of the frame stating the hook (e.g., "THIS IS A HOOK", "WAIT FOR THIS", "STOP SCROLLING"). Text should be impossible to miss.

Direction: 
- Open with creator already in position, product visible
- Immediate eye contact with camera—confident, direct gaze
- Minimal movement in first 0.5 seconds to let text register
- Then transition into product demonstration or claim
- Hook examples: "This changed everything", "I was today years old", "Nobody talks about this"

Creator Direction: Natural, confident energy. Not overly produced. Authentic UGC aesthetic but clean composition.

Tone: Direct, bold, attention-grabbing, conversational yet confident.`,
        assets: [],
      },
      {
        id: "raw-ugc-testimonial",
        name: "Raw UGC Testimonial",
        description:
          "Authentic, unpolished creator sharing real results from their bedroom—the ultimate trust-builder.",
        thumbnailUrl:
          "https://i.pinimg.com/736x/e6/51/b0/e651b0b728d7c7b66d9e219bba8479a2.jpg",
        prompt: `Generate an authentic, raw UGC testimonial video concept that builds maximum trust through realness.

Visual Style: Shot in a real home environment (bedroom, living room, kitchen). Visible background details like doors, furniture, everyday items. Natural lighting from windows. Vertical phone video format. Creator sits or stands casually in their actual space.

Text Overlay: Bold white text with black outline at the top stating a results-driven claim (e.g., "This DOUBLED my average UGC Deal", "I made $X in one week", "This product changed my life"). Optional smaller subtitle text for context.

Direction:
- Creator filmed on phone camera, eye-level or slightly below
- Mid-conversation energy—like they're talking to a friend
- Natural hand gestures and movements while speaking
- No professional lighting or setup—authentic "just grabbed my phone" feel
- Creator shares personal story, results, or transformation
- Unscripted, conversational delivery with natural pauses and "ums"

Creator Direction: Zero polish. Real makeup (or no makeup). Casual everyday clothing. Genuine emotion and excitement. Not rehearsed—just real.

Tone: Authentic, relatable, trustworthy, enthusiastic but not salesy, friend-to-friend energy.`,
        assets: [],
      },
      {
        id: "satisfying-product-demo",
        name: "Satisfying Product Demo",
        description:
          "Hypnotic close-up of product in action—oddly satisfying visuals that keep viewers watching.",
        thumbnailUrl:
          "https://i.pinimg.com/736x/8a/4c/e2/8a4ce2b85649722e8c3c62a46aef958c.jpg",
        prompt: `Generate a visually satisfying product demonstration video concept designed to captivate and mesmerize.

Visual Style: Extreme close-up, macro-style shots. Hyper-focused on the product and its interaction with skin, surfaces, or elements. High-quality production value with crisp detail. Slow-motion or real-time capture of textures, transformations, or effects.

Product Interaction: Show the product doing its thing in an oddly satisfying way:
- Ice/cooling products melting on skin
- Creams blending smoothly into skin
- Before/after texture transformations
- Foam expanding or dissolving
- Smooth application or peeling reveals
- Precision product dispensing

Direction:
- Open with immediate close-up—no setup needed
- Focus on texture, movement, and sensory details
- Minimal to no human face showing (just lips, skin, hands)
- Let the product performance speak for itself
- Optional: subtle text overlay on product or nearby
- 3-7 second loops that people want to rewatch

Camera Work: Stable, focused macro shots. Professional lighting to highlight texture and detail. Shallow depth of field.

Tone: Mesmerizing, premium, ASMR-like, therapeutic to watch, scroll-stopping through visual beauty.`,
        assets: [],
      },
      {
        id: "before-after-split",
        name: "Before/After Split Screen",
        description:
          "Side-by-side transformation proof—visual evidence that your product delivers real results.",
        thumbnailUrl:
          "https://i.pinimg.com/736x/4f/5e/6d/4f5e6d7a8b9c0d1e2f3a4b5c6d7e8f9a.jpg",
        prompt: `Generate a compelling before/after split-screen comparison video concept that showcases undeniable product results.

Visual Style: Vertical split down the center of frame. Left side = "BEFORE", right side = "AFTER". Same subject, same angle, same lighting, same framing on both sides for fair comparison. Clean, professional aesthetic with neutral background.

Visual Elements:
- Clear "BEFORE" and "AFTER" text labels (white boxes with text in bottom corners)
- Optional: Dashed circle or oval overlays highlighting specific transformation areas
- Consistent lighting and color grading across both sides
- Subject positioned identically in both frames

Direction:
- Static shot (no movement) to allow clear comparison
- Focus on the transformation area (face for skincare, body for fitness, etc.)
- 3-5 second hold to let viewers examine the difference
- Optional: Subtle animation revealing the "after" side (wipe effect, fade, or instant cut)
- Can show multiple angles or areas in sequence

Use Cases: Skincare (acne, wrinkles, dark spots), fitness (weight loss, muscle gain), hair care, teeth whitening, organization, cleaning products.

Tone: Credible, clinical, proof-driven, results-focused, professional yet accessible.`,
        assets: [],
      },
      {
        id: "day-in-life-vlog",
        name: "Day-in-Life Vlog Style",
        description:
          "Follow along as the product fits naturally into a real daily routine—authentic lifestyle integration.",
        thumbnailUrl:
          "https://i.pinimg.com/236x/15/a1/a1/15a1a1054a8a49a21d04335eccfe6f6e.jpg",
        prompt: `Generate a day-in-life vlog-style video concept where the product integrates naturally into an authentic daily routine.

Visual Style: First-person POV or handheld vlog camera work. Shot in real locations (bedroom, bathroom, kitchen, car, etc.). Natural lighting. Casual framing. Feels like a friend's Instagram story or TikTok vlog. Vertical video format.

Text Overlay: Simple, clean text describing the moment or routine (e.g., "School morning vlog ❤️", "5am morning routine", "Getting ready with my favorite products"). Can include emojis for personality, etc.

Direction:
- Start with a relatable moment (waking up, getting ready, starting the day)
- Show the product being used naturally within the routine
- Multiple quick cuts through different parts of the day/routine
- Voiceover or text explaining what's happening
- Product appears organic, not forced
- 15-30 second snippets of real life

Camera Work: Handheld, slightly shaky (authentic feel). POV angles. Mirror shots. Overhead shots of products laid out. Natural transitions between scenes.

Content Flow Examples:
- Morning: Wake up → skincare routine → makeup → getting dressed
- Workday: Coffee making → desk setup → product being used
- Evening: Cooking → relaxing → night routine

Tone: Relatable, aspirational yet achievable, cozy, personal, like following a friend's day.`,
        assets: [],
      },
      {
        id: "aesthetic-unboxing",
        name: "Aesthetic Unboxing",
        description:
          "Beautiful hands revealing product with perfect lighting—the excitement of discovering something new.",
        thumbnailUrl:
          "https://i.pinimg.com/236x/da/63/7f/da637f0028094857bd5eab30e0ad7fff.jpg",
        prompt: `Generate an aesthetic unboxing video concept that captures the excitement and satisfaction of revealing a new product.

Visual Style: Clean, minimalist aesthetic. Beautiful natural lighting (often window light creating shadows). Overhead or side angle POV. Focus on hands interacting with product and packaging. Neutral, clean background (white sheets, wood table, marble counter).

Visual Elements:
- Hands-only shot (no face necessary)
- Product and packaging prominently featured
- Beautiful shadow play from window blinds or natural light
- Simple text overlay introducing the product (e.g., "Meet [Product Name]")
- Clean, uncluttered composition

Direction:
- Start with product still in packaging or box
- Slow, intentional hand movements unwrapping or revealing
- Show packaging details, textures, premium feel
- Reveal product gradually to build anticipation
- Optional: Show product from multiple angles after reveal
- ASMR-friendly (consider adding subtle unwrapping sounds)

Camera Work: Stable overhead shot or angled POV. Soft, diffused natural lighting. Shallow depth of field to keep focus on product. Slow, smooth movements.

Pacing: Slower, more deliberate than typical content. Let moments breathe. Build anticipation through the reveal.

Tone: Elegant, premium, satisfying, aspirational, calming, aesthetic-focused, Instagram-worthy.`,
        assets: [],
      },
      {
        id: "premium-lifestyle-editorial",
        name: "Premium Lifestyle Editorial",
        description:
          "High-fashion campaign aesthetic—aspirational, cinematic product showcase with editorial quality.",
        thumbnailUrl:
          "https://i.pinimg.com/474x/47/a7/cc/47a7cc9e317cde0ad33b0a429b3a263c.jpg",
        prompt: `Generate a premium lifestyle editorial video concept with high-fashion campaign aesthetics.

Visual Style: Cinematic, editorial photography quality. Professional model in carefully styled setting. Muted, sophisticated color palette (beiges, whites, earth tones). Clean, minimalist composition. Looks like a luxury brand campaign or high-end magazine spread.

Visual Elements:
- Simple, elegant brand/product text overlay (minimalist typography)
- Model styled in premium, timeless clothing
- Carefully curated setting (modern interior, neutral tones)
- Product integrated naturally into the lifestyle shot
- Professional lighting (soft, diffused, flattering)

Direction:
- Model in relaxed, natural pose (sitting, lounging, casual elegance)
- Subtle movements (turning head, adjusting position, gentle interaction)
- Product visible but not forced (worn, held casually, placed nearby)
- Focus on mood and aspiration over hard sell
- Shots feel like paused moments from a luxury lifestyle
- Optional: slow zoom or subtle camera movement

Camera Work: High production value. Proper lighting setup. Controlled environment. Smooth, cinematic movements. Shot on quality camera with shallow depth of field.

Mood: Aspirational, sophisticated, timeless, calm, confident, premium.

Use Cases: Fashion, beauty, wellness, luxury goods, lifestyle products targeting upscale demographics.

Tone: Elegant, refined, understated luxury, aspirational yet accessible, Instagram feed goals.`,
        assets: [],
      },
    ];
  }
}
