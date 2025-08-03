import { AdVideo, FacebookAdsApi, Page } from "facebook-nodejs-business-sdk";
import { CreateFeedParams, CreateFeedSchema, CreateVideoParams } from "../types";
import { BaseFacebookPublisher } from "./base";
import { unifiedContentTable } from "../../../content.sql";
import z from "zod";
import { FBFeedPlacementSpec } from "../../../schema/placement/facebook";
import { IdentityService } from "../identity";
import { onlyOrThrow } from "../../../../util/iterable";
import { NotImplementedError } from "../../../../error";

type PublishResponse<T> = {
    data: T;
    success: boolean;
    error?: string;
};
/**
 * Heart of publishing to facebook feed.
 * It takes in the unifed content piece and
 * normalizes the data & publishes to feed.
 * Internally -- it supports various types of posts, text, link, photo, video, and carousel(multi-media).
 * It fans out the steps required.
 */
export class FacebookFeedPublisher extends BaseFacebookPublisher {
    private unifiedContent: typeof unifiedContentTable.$inferSelect;
    constructor(
        identity: IdentityService,
        unifiedContent: typeof unifiedContentTable.$inferSelect,
    ) {
        super(identity);
        this.unifiedContent = unifiedContent;
    }

    // 1. publish text post
    private async createTextPost() {
        const spec = this.assertSpec();
        const params: CreateFeedParams = {
            message: spec.postSpec.message,
            link: spec.postSpec.link,
            published: true, // publish immediately
        };
        return await this.createFeed(["id"], params);
    }

    // 2. publish photo post
    private async createMultiPhotoPost() {
        const spec = this.assertSpec();
        const {
            postSpec: { message, attachments },
        } = spec;
        // TODO: attachment should be a separate service
        // also the url seems to be wrong -- it should read from s3
        // we'd also need to sanitize the # of photos
        const img_urls = attachments?.map((a) => a.url) || [];
        if (img_urls.length === 0) {
            throw new Error("No image URLs provided for multi-photo post");
        }
        const photoIds: string[] = [];
        // 1. create unpublished photos
        for (const url of img_urls) {
            const photo = await this.createPhoto(["id"], {
                url,
                published: false, // unpublished photo
            });
            photoIds.push(photo.id);
        }
        const attachedMedia = photoIds.map((id) => ({
            media_fbid: id,
        }));
        // 2. create feed post w/ attached media
        const params: CreateFeedParams = {
            message,
            attached_media: attachedMedia,
            published: true,
        };
        return await this.createFeed(["id"], params);
    }

    // 3. publish video post(?)
    private async createVideoPost(videoUrl: string) {
        throw new NotImplementedError("fix this shit, need to poll & handle video uploading");
        const {
            postSpec: { _createFeedSchema: schema },
        } = this.assertSpec();

        // seems like we don't need to upload, FB just curls the video
        // and handles it
        const params: CreateVideoParams = {
            file_url: videoUrl,
            title: schema?.title!,
            description: schema?.description!,
            published: true, // publish immediately
        };
        return await this.createVideo(["id"], params);
    }
    /**
     * main entry point for publishing. NOTE that it could be long running process
     * due to video & photo uploads. it should be run in a BG job.
     * @returns
     */
    public async publish() {
        const spec = this.assertSpec();
        if (isTextPost(spec)) {
            const r = await this.createTextPost();
            return {
                success: true,
                data: r,
            } as PublishResponse<Page>;
        }
        if (hasPhotos(spec)) {
            const r = await this.createMultiPhotoPost();
            console.debug(`Published multi-photo post: ${r}`);
            return {
                success: true,
                data: r,
            } as PublishResponse<Page>;
        }
        if (isVideoPost(spec)) {
            const videoUrl = onlyOrThrow(spec.postSpec.attachments ?? []).url!;
            const r = await this.createVideoPost(videoUrl);
            console.debug(`Published video post: ${r}`);
            return {
                success: true,
                data: r,
            } as PublishResponse<AdVideo>;
        }
        throw new NotImplementedError("Unsupported post type");
    }

    private assertSpec(): z.infer<typeof FBFeedPlacementSpec> {
        const unifiedContent = this.unifiedContent;
        const { success, error, data } = FBFeedPlacementSpec.safeParse(
            unifiedContent.placement_spec,
        );
        if (!success) throw new Error(`Invalid placement_spec: ${error.message}`);

        if (unifiedContent.placement !== "FB_FEED") {
            throw new Error(`Expected placement to be FB_FEED, got ${unifiedContent.placement}`);
        }

        return data;
    }
}

// --------- helpers ---------
function hasPhotos(spec: z.infer<typeof FBFeedPlacementSpec>): boolean {
    return spec.postSpec.attachments?.some((a) => a.type === "photo") ?? false;
}
function hasVideos(spec: z.infer<typeof FBFeedPlacementSpec>): boolean {
    return spec.attachments?.some((a) => a.type === "video") ?? false;
}
function isTextPost(spec: z.infer<typeof FBFeedPlacementSpec>): boolean {
    return !hasPhotos(spec) && !hasVideos(spec);
}
function isVideoPost(spec: z.infer<typeof FBFeedPlacementSpec>): boolean {
    const att = onlyOrThrow(spec.postSpec.attachments ?? []);
    return att.type === "video" && att.url != null;
}
