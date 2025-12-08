export namespace Presets {
  type Preset = {
    id: string;
    name: string;
    description: string;
    thumbnailUrl: string;
    prompt: string;
  };

  export type ClientPreset = Omit<Preset, "prompt">;

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
        id: "ugc-problem-solution",
        name: "UGC Problem/Solution",
        description:
          "High-converting 'Problem/Agitation/Solution' format. A relatable creator struggles with a common issue, then discovers your product as the hero. Best for direct sales.",
        thumbnailUrl:
          "https://images.unsplash.com/photo-1616803689943-5601631c7fec?q=80&w=1000&auto=format&fit=crop",
        prompt: `Create a high-converting "Problem/Solution" UGC video (15-30s) for TikTok/Reels.
Visual Style:
- Selfie-style, handheld camera or tripod setup.
- Relatable, frustrated expression at the start -> Relief/Joy at the end.
- Authentic setting relevant to the product's use case (e.g., home, office, outdoors).
Structure:
- 0-3s: The Hook (The Problem). Call out a specific pain point relevant to the target audience. Show the struggle visually (e.g., a visual representation of the problem the product solves).
- 3-10s: The Agitation. Elaborate on why this problem is annoying, costly, or time-consuming.
- 10-25s: The Solution (Your Product). Introduce the product as the hero. Show the product being used and solving the problem instantly or effectively.
- 25-30s: The CTA. Strong call to action. "Try it now," "Link in bio," or "Get yours today."
Audio:
- Urgent, enthusiastic voiceover.
- Fast-paced background music.
Technical:
- Vertical 9:16.
- Text overlays emphasizing the "Before" and "After" transformation.`,
      },
      {
        id: "us-vs-them-comparison",
        name: "Us vs. Them Comparison",
        description:
          "Side-by-side comparison that visually proves why your product is superior to generic competitors. Uses 'Green Check' vs 'Red X' psychology. Highly effective for switching customers.",
        thumbnailUrl:
          "https://i.pinimg.com/1200x/59/70/0f/59700fb850b0dae19d1842bd75a9142d.jpg",
        prompt: `Create a split-screen "Us vs. Them" comparison video (15s).
Visual Style:
- Split screen: Left side = "Other Brands/Generic Solutions" (Grey/Dull), Right side = "Our Brand" (Bright/Vibrant).
- "Other Brands": Show the common annoyance, failure, or lack of features. Red "X" graphic.
- "Our Brand": Show the smooth, perfect experience and unique benefits. Green "Check" graphic.
Structure:
- 0-3s: Hook. "Why I switched to [Product Name]" or "Stop wasting money on [Generic Category]".
- 3-12s: The Comparison. Run 3 rapid-fire tests/comparisons based on the product's key differentiators (e.g., Quality, Speed, Taste, Durability).
- 12-15s: Winner Declared. "[Product Name] is the clear winner." CTA: "Upgrade your routine today."
Audio:
- "Ding" sound effects for the green checks. "Buzzer" for red Xs.
- Voiceover listing the benefits rapidly.
Technical:
- Vertical 9:16.
- Clear text labels: "Them" vs "Us".`,
      },
      {
        id: "expert-explainer-mythbuster",
        name: "Expert Mythbuster",
        description:
          "Positions your brand as the authority by debunking a common industry myth. Builds trust and sells by educating. Great for services, supplements, and tech.",
        thumbnailUrl:
          "https://i.pinimg.com/1200x/c6/15/4f/c6154f088cd0a7fc376049bfc01fec9c.jpg",
        prompt: `Create an "Expert Mythbuster" style video (30-45s).
Visual Style:
- Subject (Expert/Founder) talking directly to camera. Professional but accessible.
- Professional background or green screen with relevant industry visuals/charts/headlines.
Structure:
- 0-5s: The Hook (The Myth). "You've been lied to about [Topic]." or "Stop believing this myth about [Industry]."
- 5-25s: The Truth. "Big companies want you to think [X], but actually [Y]." Explain the science/logic simply using the product's unique value proposition.
- 25-35s: The Solution. "That's why we created [Product] with [Unique Feature]."
- 35-45s: CTA. "Read the full study at the link in bio" or "Get the real solution here."
Audio:
- Authoritative, calm, confident voice.
- Minimal music to keep focus on the information.
Technical:
- Vertical 9:16.
- Text overlays for key "Truth Bombs".`,
      },
      {
        id: "founder-story-mission",
        name: "Founder's Story",
        description:
          "Emotional storytelling connecting the founder's personal journey to the product. 'Why I started this'. Builds deep brand loyalty and supports small business narrative.",
        thumbnailUrl:
          "https://i.pinimg.com/736x/8e/60/d6/8e60d6b4a87082ea35386eb78a52853e.jpg",
        prompt: `Create a "Founder's Story" video (30-60s).
Visual Style:
- Montage of clips: Early days (humble beginnings), sketches/prototypes, the "aha" moment, and happy customers.
- Voiceover-led storytelling.
Structure:
- 0-5s: The Hook. "I quit my 9-5 to solve [Problem]" or "Everyone said this wouldn't work."
- 5-30s: The Journey. Show the struggle. "I couldn't find a [Product Category] that actually worked, so I made one." Show the dedication and craft.
- 30-50s: The Success. "Now we've helped thousands of people [Benefit]." Show social proof or the product in action.
- 50-60s: The Ask. "Support our mission and try it today."
Audio:
- Emotional, inspiring background music (building up).
- Sincere voiceover from the founder.
Technical:
- Vertical 9:16.
- Photos/Videos from the "archives" mixed with new high-quality footage.`,
      },
      {
        id: "flash-sale-urgency",
        name: "Flash Sale / Urgency",
        description:
          "High-energy, text-heavy video designed to drive immediate clicks for a sale or limited offer. Uses scarcity and urgency triggers. Best for clearing inventory or holiday sales.",
        thumbnailUrl:
          "https://i.pinimg.com/736x/79/74/40/797440959e51cc604693c0cc41f7f568.jpg",
        prompt: `Create a high-urgency "Flash Sale" video (10-15s).
Visual Style:
- Fast cuts of the product showing its best angles and features.
- LARGE, BOLD text overlays: "50% OFF", "24 HOURS ONLY", "ALMOST GONE".
- Flashing colors (Red/Yellow) to grab attention.
Structure:
- 0-3s: The Alert. Siren sound or "Stop Scrolling". Text: "HUGE ANNOUNCEMENT".
- 3-10s: The Offer. Show the product + The Discount. "Get our best-selling [Product] for half price."
- 10-15s: The Scarcity. "Only [Number] left in stock." CTA: "Shop before it's gone." Arrow pointing to bio.
Audio:
- High-energy, viral beat.
- Sound effects: Cash register, sirens, whooshes.
Technical:
- Vertical 9:16.
- Kinetic typography (moving text).`,
      },
    ];
  }
}
