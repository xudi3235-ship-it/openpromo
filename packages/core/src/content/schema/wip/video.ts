import z from "zod";

export namespace VideoSchema {
    // Basic object with an ID and optional name, used for related objects.
    const IdNameObject = z.object({
        id: z.string(),
        name: z.string().optional(),
    });

    // Schema for different formats of a video.
    const VideoFormatSchema = z.object({
        embed_html: z.string().optional(),
        filter: z.string().optional(),
        height: z.number().int(),
        picture: z.string().url(),
        width: z.number().int(),
    });

    // Schema for video thumbnails.
    const VideoThumbnailSchema = z.object({
        id: z.string(),
        height: z.number().int(),
        is_preferred: z.boolean(),
        uri: z.string().url(),
        scale: z.number(),
        width: z.number().int(),
    });

    // Schema for the video's status.
    const VideoStatusSchema = z.object({
        processing_progress: z.number().int().optional(),
        video_status: z.enum(["ready", "processing", "error"]).optional(),
    });

    // The main Zod schema for a Facebook Video object.
    export const Schema = z.object({
        id: z.string().describe("The video ID."),
        created_time: z.string().datetime().describe("The time the video was created."),
        description: z.string().optional().describe("The description of the video."),
        embed_html: z.string().optional().describe("HTML to embed the video."),
        format: z.array(VideoFormatSchema).optional().describe("Available formats for the video."),
        from: IdNameObject.optional().describe("The profile that uploaded the video."),
        icon: z.string().url().optional().describe("The icon for the video."),
        length: z.number().optional().describe("The length of the video in seconds."),
        permalink_url: z.string().url().optional().describe("The permanent URL for the video."),
        picture: z.string().url().optional().describe("The URL for the video's thumbnail image."),
        source: z.string().url().optional().describe("A URL to the raw video file."),
        status: VideoStatusSchema.optional().describe("The processing status of the video."),
        updated_time: z.string().datetime().describe("The last time the video was updated."),
        content_category: z.string().optional(),
        content_tags: z.array(z.string()).optional(),
        custom_labels: z.array(z.string()).optional(),
        is_crosspost_video: z.boolean().optional(),
        is_episode: z.boolean().optional(),
        is_instagram_eligible: z.boolean().optional(),
        live_status: z.enum(["LIVE", "LIVE_STOPPED", "VOD"]).optional(),
        post_views: z.number().int().optional(),
        title: z.string().optional().describe("The title of the video."),
        thumbnails: z
            .object({
                data: z.array(VideoThumbnailSchema),
            })
            .optional()
            .describe("Thumbnails for the video."),
        tags: z
            .object({
                data: z.array(IdNameObject),
            })
            .optional()
            .describe("Tags on the video."),
    });
}
