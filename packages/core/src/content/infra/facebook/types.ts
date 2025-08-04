import { z } from "zod";

// very wip schemas, mostly taken from
// official docs: https://developers.facebook.com/docs/graph-api/reference/page/photos/#upload
const UnpublishedContentType = z.enum([
  "ADS_POST",
  "DRAFT",
  "INLINE_CREATED",
  "PUBLISHED",
  "REVIEWABLE_BRANDED_CONTENT",
  "SCHEDULED",
  "SCHEDULED_RECURRING",
]);

const BackdatedTimeGranularity = z.enum([
  "year",
  "month",
  "day",
  "hour",
  "min",
  "none",
]);

export const CreateFeedSchema = z
  .object({
    actions: z
      .record(z.any())
      .optional()
      .describe("Actions that people can take on the post"),
    album_id: z.string().optional().describe("Album ID for photo posts"),
    android_key_hash: z
      .string()
      .optional()
      .describe("Android key hash for app links"),
    application_id: z.string().optional().describe("Application ID"),
    asked_fun_fact_prompt_id: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Asked fun fact prompt ID"),
    asset3d_id: z.string().optional().describe("3D asset ID"),
    associated_id: z.string().optional().describe("Associated ID"),
    attach_place_suggestion: z
      .boolean()
      .optional()
      .describe("Whether to attach place suggestion"),
    attached_media: z
      .array(z.record(z.any()))
      .optional()
      .describe("List of attached media objects"),
    audience_exp: z.boolean().optional().describe("Audience experiment flag"),
    backdated_time: z
      .string()
      .datetime()
      .optional()
      .describe("Backdated time for the post"),
    backdated_time_granularity: BackdatedTimeGranularity.optional().describe(
      "Granularity for backdated time",
    ),
    breaking_news: z
      .boolean()
      .optional()
      .describe("Whether this is breaking news"),
    breaking_news_expiration: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Breaking news expiration time"),
    call_to_action: z
      .record(z.any())
      .optional()
      .describe("Call to action object"),
    caption: z.string().optional().describe("Caption for the post"),
    child_attachments: z
      .array(z.record(z.any()))
      .optional()
      .describe("Child attachments for carousel posts"),
    client_mutation_id: z.string().optional().describe("Client mutation ID"),
    composer_entry_picker: z
      .string()
      .optional()
      .describe("Composer entry picker"),
    composer_entry_point: z
      .string()
      .optional()
      .describe("Composer entry point"),
    composer_entry_time: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Composer entry time"),
    composer_session_events_log: z
      .string()
      .optional()
      .describe("Composer session events log"),
    composer_session_id: z.string().optional().describe("Composer session ID"),
    composer_source_surface: z
      .string()
      .optional()
      .describe("Composer source surface"),
    composer_type: z.string().optional().describe("Composer type"),
    connection_class: z.string().optional().describe("Connection class"),
    content_attachment: z.string().optional().describe("Content attachment ID"),
    coordinates: z
      .record(z.any())
      .optional()
      .describe("Geographic coordinates"),
    cta_link: z.string().optional().describe("Call to action link"),
    cta_type: z.string().optional().describe("Call to action type"),
    description: z.string().optional().describe("Description of the post"),
    direct_share_status: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Direct share status"),
    enforce_link_ownership: z
      .boolean()
      .optional()
      .describe("Whether to enforce link ownership"),
    expanded_height: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Expanded height for media"),
    expanded_width: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Expanded width for media"),
    feed_targeting: z
      .record(z.any())
      .optional()
      .describe("Feed targeting specification"),
    formatting: z.string().optional().describe("Post formatting"),
    fun_fact_prompt_id: z.string().optional().describe("Fun fact prompt ID"),
    fun_fact_toastee_id: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Fun fact toastee ID"),
    height: z.number().int().nonnegative().optional().describe("Media height"),
    home_checkin_city_id: z
      .record(z.any())
      .optional()
      .describe("Home checkin city ID"),
    image_crops: z
      .record(z.any())
      .optional()
      .describe("Image crop specifications"),
    implicit_with_tags: z
      .array(z.number().int())
      .optional()
      .describe("Implicit tags"),
    instant_game_entry_point_data: z
      .string()
      .optional()
      .describe("Instant game entry point data"),
    ios_bundle_id: z
      .string()
      .optional()
      .describe("iOS bundle ID for app links"),
    is_backout_draft: z
      .boolean()
      .optional()
      .describe("Whether this is a backout draft"),
    is_boost_intended: z
      .boolean()
      .optional()
      .describe("Whether boost is intended"),
    is_explicit_location: z
      .boolean()
      .optional()
      .describe("Whether location is explicit"),
    is_explicit_share: z
      .boolean()
      .optional()
      .describe("Whether share is explicit"),
    is_group_linking_post: z
      .boolean()
      .optional()
      .describe("Whether this is a group linking post"),
    is_photo_container: z
      .boolean()
      .optional()
      .describe("Whether this is a photo container"),
    link: z.string().optional().describe("Link URL to attach"),
    location_source_id: z.string().optional().describe("Location source ID"),
    manual_privacy: z.boolean().optional().describe("Manual privacy setting"),
    message: z.string().optional().describe("The main body of the post"),
    multi_share_end_card: z
      .boolean()
      .optional()
      .describe("Multi-share end card flag"),
    multi_share_optimized: z
      .boolean()
      .optional()
      .describe("Multi-share optimization flag"),
    name: z.string().optional().describe("Name of the link"),
    nectar_module: z.string().optional().describe("Nectar module"),
    object_attachment: z.string().optional().describe("Object attachment ID"),
    og_action_type_id: z
      .string()
      .optional()
      .describe("Open Graph action type ID"),
    og_hide_object_attachment: z
      .boolean()
      .optional()
      .describe("Whether to hide OG object attachment"),
    og_icon_id: z.string().optional().describe("Open Graph icon ID"),
    og_object_id: z.string().optional().describe("Open Graph object ID"),
    og_phrase: z.string().optional().describe("Open Graph phrase"),
    og_set_profile_badge: z
      .boolean()
      .optional()
      .describe("Whether to set profile badge"),
    og_suggestion_mechanism: z
      .string()
      .optional()
      .describe("OG suggestion mechanism"),
    page_recommendation: z.string().optional().describe("Page recommendation"),
    picture: z.string().optional().describe("Picture URL"),
    place: z.record(z.any()).optional().describe("Place object for location"),
    place_attachment_setting: z
      .string()
      .optional()
      .describe("Place attachment setting"),
    place_list: z.string().optional().describe("Place list"),
    place_list_data: z.array(z.any()).optional().describe("Place list data"),
    post_surfaces_blacklist: z
      .array(z.string())
      .optional()
      .describe("Post surfaces blacklist"),
    posting_to_redspace: z
      .string()
      .optional()
      .describe("Posting to redspace setting"),
    privacy: z.string().optional().describe("Privacy setting"),
    prompt_id: z.string().optional().describe("Prompt ID"),
    prompt_tracking_string: z
      .string()
      .optional()
      .describe("Prompt tracking string"),
    properties: z.record(z.any()).optional().describe("Additional properties"),
    proxied_app_id: z.string().optional().describe("Proxied app ID"),
    publish_event_id: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Publish event ID"),
    published: z
      .boolean()
      .optional()
      .describe("Whether to publish immediately"),
    quote: z.string().optional().describe("Quote text"),
    ref: z.array(z.string()).optional().describe("Reference list"),
    referenceable_image_ids: z
      .array(z.string())
      .optional()
      .describe("Referenceable image IDs"),
    referral_id: z.string().optional().describe("Referral ID"),
    scheduled_publish_time: z
      .string()
      .datetime()
      .optional()
      .describe("Scheduled publish time"),
    source: z.string().optional().describe("Source of the post"),
    sponsor_id: z.string().optional().describe("Sponsor ID"),
    sponsor_relationship: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Sponsor relationship"),
    suggested_place_id: z
      .record(z.any())
      .optional()
      .describe("Suggested place ID"),
    tags: z
      .array(z.number().int())
      .optional()
      .describe("List of user IDs to tag"),
    target_surface: z.string().optional().describe("Target surface"),
    targeting: z.record(z.any()).optional().describe("Targeting specification"),
    text_format_metadata: z
      .string()
      .optional()
      .describe("Text format metadata"),
    text_format_preset_id: z
      .string()
      .optional()
      .describe("Text format preset ID"),
    text_only_place: z.string().optional().describe("Text only place"),
    thumbnail: z.any().optional().describe("Thumbnail file"),
    time_since_original_post: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Time since original post"),
    title: z.string().optional().describe("Title of the post"),
    tracking_info: z.string().optional().describe("Tracking information"),
    unpublished_content_type: UnpublishedContentType.optional().describe(
      "Unpublished content type",
    ),
    user_selected_tags: z
      .boolean()
      .optional()
      .describe("Whether tags are user selected"),
    video_start_time_ms: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Video start time in milliseconds"),
    viewer_coordinates: z
      .record(z.any())
      .optional()
      .describe("Viewer coordinates"),
    width: z.number().int().nonnegative().optional().describe("Media width"),
  })
  .strict()
  .describe("Parameters for creating a Facebook page feed post");

export type CreateFeedParams = z.infer<typeof CreateFeedSchema>;

export const CreatePhotoSchema = z
  .object({
    // Optional parameters with defaults
    aid: z.string().optional().describe("Legacy album ID. Deprecated"),
    allow_spherical_photo: z
      .boolean()
      .optional()
      .describe("Whether to allow spherical photos"),
    alt_text_custom: z
      .string()
      .optional()
      .describe("Accessible alternative description for an image"),
    android_key_hash: z.string().optional().describe("Android key hash"),
    application_id: z
      .string()
      .optional()
      .describe("iTunes App ID for native Share dialog"),
    attempt: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Number of upload attempts"),
    audience_exp: z.boolean().optional().describe("Audience experiment flag"),
    backdated_time: z
      .string()
      .datetime()
      .optional()
      .describe("User-specified creation time for this photo"),
    backdated_time_granularity: BackdatedTimeGranularity.optional().describe(
      "Granularity for backdated time",
    ),
    caption: z.string().optional().describe("Description of the photo"),
    composer_session_id: z.string().optional().describe("Composer session ID"),
    direct_share_status: z
      .number()
      .int()
      .optional()
      .describe("Status to allow sponsor directly boost the post"),
    feed_targeting: z
      .record(z.any())
      .optional()
      .describe("News Feed targeting for this post"),
    filter_type: z.number().int().optional().describe("Filter type (unused)"),
    full_res_is_coming_later: z
      .boolean()
      .optional()
      .describe("Whether full resolution is coming later"),
    initial_view_heading_override_degrees: z
      .number()
      .int()
      .min(0)
      .max(360)
      .optional()
      .describe("Initial view heading override in degrees (0-360)"),
    initial_view_pitch_override_degrees: z
      .number()
      .int()
      .min(-90)
      .max(90)
      .optional()
      .describe("Initial view pitch override in degrees (-90 to 90)"),
    initial_view_vertical_fov_override_degrees: z
      .number()
      .int()
      .min(60)
      .max(120)
      .optional()
      .describe("Initial view vertical FOV override in degrees (60-120)"),
    ios_bundle_id: z.string().optional().describe("iOS Bundle ID"),
    is_explicit_location: z
      .boolean()
      .optional()
      .describe("Whether location is explicit"),
    is_explicit_place: z
      .boolean()
      .optional()
      .describe("Whether tag is a place, not a person"),
    manual_privacy: z.boolean().optional().describe("Manual privacy setting"),
    message: z
      .string()
      .optional()
      .describe("Deprecated. Use caption param instead"),
    name: z
      .string()
      .optional()
      .describe("Deprecated. Use caption param instead"),
    no_story: z
      .boolean()
      .optional()
      .describe("Whether to suppress News Feed story creation"),
    offline_id: z.number().int().optional().describe("Offline ID"),
    og_action_type_id: z
      .string()
      .optional()
      .describe("Open Graph action type ID"),
    og_icon_id: z.string().optional().describe("Open Graph icon ID"),
    og_object_id: z.string().optional().describe("Open Graph object ID or URL"),
    og_phrase: z.string().optional().describe("Open Graph phrase"),
    og_set_profile_badge: z
      .boolean()
      .optional()
      .describe("Whether to create a profile badge"),
    og_suggestion_mechanism: z
      .string()
      .optional()
      .describe("Open Graph suggestion mechanism"),
    place: z
      .record(z.any())
      .optional()
      .describe("Page ID of a place associated with the photo"),
    privacy: z.string().optional().describe("Privacy settings of the photo"),
    profile_id: z
      .number()
      .int()
      .optional()
      .describe("Deprecated. Use target_id instead"),
    provenance_info: z
      .record(z.any())
      .optional()
      .describe("Provenance information"),
    proxied_app_id: z
      .union([z.string(), z.number().int()])
      .optional()
      .describe("Proxied app ID"),
    published: z
      .boolean()
      .optional()
      .describe("Whether to publish the photo immediately"),
    qn: z.string().optional().describe("Photos waterfall ID"),
    spherical_metadata: z
      .record(z.any())
      .optional()
      .describe("Parameters describing an uploaded spherical photo"),
    sponsor_id: z
      .union([z.string(), z.number().int()])
      .optional()
      .describe("Facebook Page ID tagged as sponsor"),
    sponsor_relationship: z
      .number()
      .int()
      .optional()
      .describe("Sponsor relationship type"),
    tags: z.array(z.record(z.any())).optional().describe("Tags on this photo"),
    target_id: z
      .number()
      .int()
      .optional()
      .describe("Target ID (use edge endpoints instead)"),
    targeting: z
      .record(z.any())
      .optional()
      .describe("Audience targeting for Pages"),
    time_since_original_post: z
      .number()
      .int()
      .optional()
      .describe("Time delta instead of absolute backdated_time"),
    uid: z.number().int().optional().describe("Deprecated"),
    unpublished_content_type: UnpublishedContentType.optional().describe(
      "Content type of unpublished content",
    ),
    // Photo source - at least one of these is required
    url: z.string().optional().describe("URL of photo already on Internet"),
    vault_image_id: z
      .union([z.string(), z.number().int()])
      .optional()
      .describe("Vault image ID to use for photo"),
    user_selected_tags: z
      .boolean()
      .optional()
      .describe("Whether tags are user selected"),
  })
  .strict()
  .describe("Parameters for creating a Facebook page photo");

export type CreatePhotoParams = z.infer<typeof CreatePhotoSchema>;

export const CreateVideoSchema = z
  .object({
    ad_breaks: z.array(z.any()).optional().describe("Ad breaks configuration"),
    application_id: z.string().optional().describe("Application ID"),
    asked_fun_fact_prompt_id: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Asked fun fact prompt ID"),
    audio_story_wave_animation_handle: z
      .string()
      .optional()
      .describe("Audio story wave animation handle"),
    backdated_post: z
      .array(z.any())
      .optional()
      .describe("Backdated post configuration"),
    call_to_action: z
      .record(z.any())
      .optional()
      .describe("Call to action configuration"),
    composer_entry_picker: z
      .string()
      .optional()
      .describe("Composer entry picker"),
    composer_entry_point: z
      .string()
      .optional()
      .describe("Composer entry point"),
    composer_entry_time: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Composer entry time"),
    composer_session_events_log: z
      .string()
      .optional()
      .describe("Composer session events log"),
    composer_session_id: z.string().optional().describe("Composer session ID"),
    composer_source_surface: z
      .string()
      .optional()
      .describe("Composer source surface"),
    composer_type: z.string().optional().describe("Composer type"),
    container_type: z
      .string()
      .optional()
      .describe("Page videos container type"),
    content_category: z
      .string()
      .optional()
      .describe("Page videos content category"),
    content_tags: z.array(z.string()).optional().describe("Content tags"),
    creative_tools: z.string().optional().describe("Creative tools"),
    crossposted_video_id: z
      .string()
      .optional()
      .describe("Crossposted video ID"),
    custom_labels: z.array(z.string()).optional().describe("Custom labels"),
    description: z.string().optional().describe("Video description"),
    direct_share_status: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Direct share status"),
    embeddable: z.boolean().optional().describe("Whether video is embeddable"),
    end_offset: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("End offset"),
    expiration: z.record(z.any()).optional().describe("Expiration settings"),
    fbuploader_video_file_chunk: z
      .string()
      .optional()
      .describe("Facebook uploader video file chunk"),
    feed_targeting: z
      .record(z.any())
      .optional()
      .describe("Feed targeting settings"),
    file_size: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("File size in bytes"),
    file_url: z.string().optional().describe("URL of video file"),
    fisheye_video_cropped: z
      .boolean()
      .optional()
      .describe("Whether fisheye video is cropped"),
    formatting: z.string().optional().describe("Page videos formatting"),
    fov: z.number().int().nonnegative().optional().describe("Field of view"),
    front_z_rotation: z.number().optional().describe("Front Z rotation"),
    fun_fact_prompt_id: z.string().optional().describe("Fun fact prompt ID"),
    fun_fact_toastee_id: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Fun fact toastee ID"),
    guide: z
      .array(z.array(z.number().int().nonnegative()))
      .optional()
      .describe("Guide configuration"),
    guide_enabled: z.boolean().optional().describe("Whether guide is enabled"),
    initial_heading: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Initial heading"),
    initial_pitch: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Initial pitch"),
    instant_game_entry_point_data: z
      .string()
      .optional()
      .describe("Instant game entry point data"),
    is_boost_intended: z
      .boolean()
      .optional()
      .describe("Whether boost is intended"),
    is_explicit_share: z
      .boolean()
      .optional()
      .describe("Whether share is explicit"),
    is_group_linking_post: z
      .boolean()
      .optional()
      .describe("Whether post is group linking"),
    is_partnership_ad: z
      .boolean()
      .optional()
      .describe("Whether it's a partnership ad"),
    is_voice_clip: z.boolean().optional().describe("Whether it's a voice clip"),
    location_source_id: z.string().optional().describe("Location source ID"),
    manual_privacy: z.boolean().optional().describe("Manual privacy setting"),
    multilingual_data: z
      .array(z.record(z.any()))
      .optional()
      .describe("Multilingual data"),
    no_story: z
      .boolean()
      .optional()
      .describe("Whether to suppress story creation"),
    og_action_type_id: z
      .string()
      .optional()
      .describe("Open Graph action type ID"),
    og_icon_id: z.string().optional().describe("Open Graph icon ID"),
    og_object_id: z.string().optional().describe("Open Graph object ID"),
    og_phrase: z.string().optional().describe("Open Graph phrase"),
    og_suggestion_mechanism: z
      .string()
      .optional()
      .describe("Open Graph suggestion mechanism"),
    original_fov: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Original field of view"),
    original_projection_type: z
      .string()
      .optional()
      .describe("Original projection type"),
    partnership_ad_ad_code: z
      .string()
      .optional()
      .describe("Partnership ad code"),
    publish_event_id: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Publish event ID"),
    published: z
      .boolean()
      .optional()
      .describe("Whether to publish immediately"),
    reference_only: z
      .boolean()
      .optional()
      .describe("Whether it's reference only"),
    referenced_sticker_id: z
      .string()
      .optional()
      .describe("Referenced sticker ID"),
    replace_video_id: z.string().optional().describe("Video ID to replace"),
    scheduled_publish_time: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Scheduled publish time"),
    secret: z.boolean().optional().describe("Whether video is secret"),
    slideshow_spec: z
      .record(z.any())
      .optional()
      .describe("Slideshow specification"),
    social_actions: z
      .boolean()
      .optional()
      .describe("Whether social actions are enabled"),
    source: z.string().optional().describe("Video source"),
    source_instagram_media_id: z
      .string()
      .optional()
      .describe("Source Instagram media ID"),
    specified_dialect: z.string().optional().describe("Specified dialect"),
    spherical: z.boolean().optional().describe("Whether video is spherical"),
    sponsor_id: z.string().optional().describe("Sponsor ID"),
    sponsor_relationship: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Sponsor relationship type"),
    start_offset: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Start offset"),
    swap_mode: z.string().optional().describe("Swap mode"),
    targeting: z.record(z.any()).optional().describe("Targeting settings"),
    text_format_metadata: z
      .string()
      .optional()
      .describe("Text format metadata"),
    thumb: z.any().optional().describe("Thumbnail file"),
    time_since_original_post: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Time since original post"),
    title: z.string().optional().describe("Video title"),
    transcode_setting_properties: z
      .string()
      .optional()
      .describe("Transcode setting properties"),
    universal_video_id: z.string().optional().describe("Universal video ID"),
    unpublished_content_type: z
      .string()
      .optional()
      .describe("Unpublished content type"),
    upload_phase: z.string().optional().describe("Upload phase"),
    upload_session_id: z.string().optional().describe("Upload session ID"),
    upload_setting_properties: z
      .string()
      .optional()
      .describe("Upload setting properties"),
    video_asset_id: z.string().optional().describe("Video asset ID"),
    video_file_chunk: z.string().optional().describe("Video file chunk"),
    video_id_original: z.string().optional().describe("Original video ID"),
    video_start_time_ms: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Video start time in milliseconds"),
    waterfall_id: z.string().optional().describe("Waterfall ID"),
  })
  .strict()
  .describe("Parameters for creating a Facebook page video");

export type CreateVideoParams = z.infer<typeof CreateVideoSchema>;

export const CreateFBReelSchema = z.object({
  description: z.string().optional(),
  feed_targeting: z.object({}).optional(),
  place: z.string().optional(),
  scheduled_publish_time: z.number().optional(),
  targeting: z.object({}).optional(),
  title: z.string().optional(),
  upload_phase: z.enum(["start", "finish"]),
  video_id: z.string().optional(),
  video_state: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]),
});
