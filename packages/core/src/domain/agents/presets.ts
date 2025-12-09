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
          "Relatable creator solves a common problem with your product.",
        thumbnailUrl:
          "https://images.unsplash.com/photo-1616803689943-5601631c7fec?q=80&w=1000&auto=format&fit=crop",
        prompt: `Generate a video concept based on the "Problem-Agitation-Solution" framework.
Style: Authentic User Generated Content (UGC).
Direction: Start by identifying a relatable struggle or pain point relevant to the audience. Amplify the frustration slightly (Agitation), then introduce the product as the ideal solution that resolves the issue effortlessly.
Tone: Relatable, personal, and enthusiastic.`,
      },
      {
        id: "us-vs-them-comparison",
        name: "Us vs. Them Comparison",
        description:
          "Visually compare your product as superior to competitors.",
        thumbnailUrl:
          "https://i.pinimg.com/1200x/59/70/0f/59700fb850b0dae19d1842bd75a9142d.jpg",
        prompt: `Generate a comparison video concept illustrating "Us vs. Them".
Style: Split-screen or direct comparison visuals.
Direction: Contrast the superior features/experience of this product against generic or inferior competitors. Use visual cues (like checks vs. crosses) to highlight the advantages.
Tone: Confident, definitive, and persuasive.`,
      },
      {
        id: "expert-explainer-mythbuster",
        name: "Expert Mythbuster",
        description:
          "Debunk industry myths, positioning your brand as an authority.",
        thumbnailUrl:
          "https://i.pinimg.com/1200x/c6/15/4f/c6154f088cd0a7fc376049bfc01fec9c.jpg",
        prompt: `Generate an educational video concept centered on "Mythbusting".
Style: Expert/Authority figure speaking directly to the audience.
Direction: Address a common misconception or myth in the industry. Debunk it with facts or logic, then present the product as the true, scientifically backed, or logical solution.
Tone: Professional, knowledgeable, and trustworthy.`,
      },
      {
        id: "founder-story-mission",
        name: "Founder's Story",
        description:
          "Emotional story of the founder's journey and product's mission.",
        thumbnailUrl:
          "https://i.pinimg.com/736x/8e/60/d6/8e60d6b4a87082ea35386eb78a52853e.jpg",
        prompt: `Generate a narrative video concept focusing on the "Founder's Story".
Style: Documentary or storytelling montage.
Direction: Share the origin story of the brand. Focus on the personal motivation, the 'why' behind the creation, and the journey from idea to reality. Highlight the mission to help others.
Tone: Emotional, inspiring, and sincere.`,
      },
      {
        id: "flash-sale-urgency",
        name: "Flash Sale / Urgency",
        description: "High-energy video to drive immediate sales with urgency.",
        thumbnailUrl:
          "https://i.pinimg.com/736x/79/74/40/797440959e51cc604693c0cc41f7f568.jpg",
        prompt: `Generate a high-energy promotional video concept for a "Flash Sale".
Style: Fast-paced, dynamic visuals with bold text overlays.
Direction: Focus entirely on the urgency of a limited-time offer or special discount. Emphasize scarcity (limited stock, limited time) to drive immediate action.
Tone: Urgent, exciting, and hype-driven.`,
      },
    ];
  }
}
