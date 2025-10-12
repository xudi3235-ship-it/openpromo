import type { Storage } from "@core/helpers/storage";
import type { ImageStorage } from "@core/helpers/storage/image";
import type { VideoStorage } from "@core/helpers/storage/video";
import type { SharedAttachmentSpec } from "@core/schemas/content.sql";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type AttachmentData,
  type AttachmentDependencies,
  type AttachmentLocation,
  EntAttachment,
} from "./EntAttachment";

describe("EntAttachment", () => {
  const workspaceId = "ws-123";
  const attachmentId = "att-123";

  const defaultPrimary: AttachmentLocation = {
    kind: "remote",
    platform: "external",
    url: "https://example.com/photo.jpg",
  };

  function createAttachment(
    overrides: Partial<AttachmentData> = {},
    dependencies: AttachmentDependencies = {},
  ): EntAttachment {
    const data: AttachmentData = {
      id: attachmentId,
      workspaceId,
      kind: "photo",
      state: "pending",
      primary: defaultPrimary,
      mirrors: [],
      metadata: { source: "test" },
      mimeType: "image/jpeg",
      dimensions: { width: 1024, height: 768 },
      duration: null,
      altText: "Sample attachment",
      ...overrides,
    };
    return new EntAttachment(data, dependencies);
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fromSharedSpec", () => {
    it("derives primary, preview, metadata, and state for photo attachments", () => {
      const spec = {
        type: "photo",
        id: attachmentId,
        publicUrl: "https://imagedelivery.net/mock/public",
        thumbnailUrl: "https://imagedelivery.net/mock/preview",
        mimeType: "image/png",
        metadata: { label: "cover" },
        width: 800,
        height: 600,
        altText: "cover art",
      } satisfies SharedAttachmentSpec;

      const attachment = EntAttachment.fromSharedSpec(workspaceId, spec);

      expect(attachment.kind).toBe("photo");
      expect(attachment.state).toBe("ready");
      expect(attachment.primaryLocation()).toEqual({
        kind: "cloudflare_image",
        imageId: attachmentId,
        variant: "public",
        url: spec.publicUrl,
      });
      expect(attachment.previewLocation()).toEqual({
        kind: "cloudflare_image",
        imageId: attachmentId,
        variant: "public",
        url: spec.thumbnailUrl,
      });
      expect(attachment.metadata).toEqual(spec.metadata);
    });

    it("falls back to remote location when spec lacks storage hints", () => {
      const spec = {
        type: "photo",
        id: attachmentId,
      } satisfies SharedAttachmentSpec;

      const attachment = EntAttachment.fromSharedSpec(workspaceId, spec);

      expect(attachment.primaryLocation()).toEqual({
        kind: "remote",
        platform: "unknown",
        id: attachmentId,
      });
      expect(attachment.state).toBe("uploaded");
    });
  });

  describe("location management", () => {
    const cloudflareImage: AttachmentLocation = {
      kind: "cloudflare_image",
      imageId: "img-1",
      variant: "public",
      url: "https://imagedelivery.net/mock/img-1/public",
    };

    it("adds mirrors without duplicating the same signature", () => {
      const attachment = createAttachment();

      attachment.addMirror(cloudflareImage);
      attachment.addMirror({ ...cloudflareImage });

      expect(attachment.mirrors()).toHaveLength(1);
      expect(attachment.mirrors()[0]).toEqual(cloudflareImage);
    });

    it("promotes mirror to primary and removes it from mirrors", () => {
      const attachment = createAttachment({ mirrors: [cloudflareImage] });

      attachment.promoteMirrorToPrimary("cloudflare_image");

      expect(attachment.primaryLocation()).toEqual(cloudflareImage);
      expect(attachment.mirrors()).toHaveLength(0);
    });

    it("removes mirrors by kind", () => {
      const r2Location: AttachmentLocation = {
        kind: "r2",
        key: "r2/key",
        bucket: "public",
        url: "https://public/mock/r2/key",
      };
      const attachment = createAttachment({
        mirrors: [cloudflareImage, r2Location],
      });

      attachment.removeMirror("cloudflare_image");

      expect(attachment.mirrors()).toEqual([r2Location]);
    });

    it("skips promotion when mirror of requested kind does not exist", () => {
      const attachment = createAttachment();

      attachment.promoteMirrorToPrimary("r2");

      expect(attachment.primaryLocation()).toBe(defaultPrimary);
    });
  });

  describe("ensureR2Mirror", () => {
    const mockBucket = {
      name: "public",
      publicUrl: "https://public.cdn",
    } as const;

    function createStorageMock() {
      const uploadMock = vi.fn(
        async (
          key: string,
          _body: ReadableStream<Uint8Array>,
          _bucket: unknown,
          _options?: unknown,
        ) => ({ key, url: `https://public.cdn/${key}` }),
      );
      const publicUrlMock = vi.fn((key: string) => `https://public.cdn/${key}`);

      const storage = {
        PUBLIC_BUCKET: mockBucket,
        upload: uploadMock,
        publicUrl: publicUrlMock,
      } as unknown as typeof Storage;

      return { storage, uploadMock, publicUrlMock };
    }

    it("returns existing R2 mirror when available and overwrite is false", async () => {
      const r2Mirror: AttachmentLocation = {
        kind: "r2",
        key: "attachments/ws-123/att-123/existing",
        bucket: mockBucket.name,
        url: "https://public.cdn/attachments/ws-123/att-123/existing",
      };

      const attachment = createAttachment({ mirrors: [r2Mirror] });

      const result = await attachment.ensureR2Mirror();

      expect(result).toEqual(r2Mirror);
      expect(attachment.state).not.toBe("mirrored");
    });

    it("uploads to R2 when mirror is missing", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response("payload", { status: 200 }));
      const { storage, uploadMock } = createStorageMock();

      const attachment = createAttachment(
        {
          primary: {
            kind: "remote",
            platform: "external",
            url: "https://example.com/file.mp4",
          },
          kind: "video",
          mimeType: "video/mp4",
        },
        { fetch: fetchMock, storage },
      );

      const mirror = await attachment.ensureR2Mirror();

      expect(fetchMock).toHaveBeenCalledWith("https://example.com/file.mp4");
      expect(uploadMock).toHaveBeenCalledTimes(1);
      const [key, _body, bucket, options] = uploadMock.mock.calls[0];
      expect(key).toMatch(
        new RegExp(`^attachments/${workspaceId}/${attachmentId}/[a-f0-9-]+$`),
      );
      expect(bucket).toBe(mockBucket);
      // @ts-expect-error what the fuck
      expect(options?.metadata).toEqual({
        workspaceId,
        attachmentId,
        originKind: "remote",
      });
      expect(attachment.state).toBe("mirrored");
      expect(mirror.kind).toBe("r2");
      expect(attachment.mirrors()).toContainEqual(mirror);
    });

    it("throws when primary location cannot resolve to a public URL", async () => {
      const videoStorage = {
        getVideoDetails: vi.fn().mockResolvedValue(undefined),
      } as unknown as typeof VideoStorage;

      const attachment = createAttachment(
        {
          primary: { kind: "cloudflare_stream", videoId: "vid-1" },
        },
        { videoStorage },
      );

      await expect(attachment.ensureR2Mirror()).rejects.toThrow(
        "attachment primary location does not expose a public URL",
      );
    });
  });

  describe("toSharedSpec", () => {
    const storageBucket = { name: "public", publicUrl: "https://public.cdn" };
    const publicUrlMock = vi.fn((key: string) => `https://public.cdn/${key}`);
    const storageMock = {
      PUBLIC_BUCKET: storageBucket,
      publicUrl: publicUrlMock,
    } as unknown as typeof Storage;

    it("serializes photo attachments using preferred R2 mirror and preview", async () => {
      const imageStorage = {
        getImageDeliveryUrl: vi
          .fn()
          .mockResolvedValue("https://imagedelivery.net/generated/preview"),
      } as unknown as typeof ImageStorage;

      const attachment = createAttachment(
        {
          primary: {
            kind: "remote",
            platform: "external",
            url: "https://example.com/original.jpg",
          },
          mirrors: [
            {
              kind: "r2",
              bucket: storageMock.PUBLIC_BUCKET.name,
              key: "attachments/ws-123/att-123/original.jpg",
            },
          ],
          preview: {
            kind: "cloudflare_image",
            imageId: "preview-1",
            variant: "thumbnail",
          },
          metadata: { source: "library" },
          dimensions: { width: 800, height: 600 },
          altText: "cover art",
        },
        { storage: storageMock, imageStorage },
      );

      const spec = await attachment.toSharedSpec();

      expect(publicUrlMock).toHaveBeenCalledWith(
        "attachments/ws-123/att-123/original.jpg",
        expect.objectContaining({ name: storageBucket.name }),
      );
      expect(imageStorage.getImageDeliveryUrl).toHaveBeenCalledWith(
        "preview-1",
        "thumbnail",
      );
      expect(spec).toMatchObject({
        type: "photo",
        id: attachmentId,
        s3Key: "attachments/ws-123/att-123/original.jpg",
        publicUrl: "https://public.cdn/attachments/ws-123/att-123/original.jpg",
        thumbnailUrl: "https://imagedelivery.net/generated/preview",
        metadata: { source: "library" },
        width: 800,
        height: 600,
        altText: "cover art",
      });
    });

    it("serializes video attachments pulling urls from cloudflare stream", async () => {
      const videoStorage = {
        getVideoDetails: vi.fn().mockResolvedValue({
          playback: { hls: "https://videodelivery.net/mock/hls.m3u8" },
        }),
      } as unknown as typeof VideoStorage;

      const attachment = createAttachment(
        {
          kind: "video",
          duration: 42,
          primary: { kind: "cloudflare_stream", videoId: "video-1" },
          mirrors: [
            {
              kind: "upload",
              url: "https://upload.example.com/video",
            },
          ],
          dimensions: { width: 1920, height: 1080 },
          preview: {
            kind: "remote",
            platform: "external",
            url: "https://example.com/preview.jpg",
          },
        },
        { videoStorage },
      );

      const spec = await attachment.toSharedSpec();

      expect(videoStorage.getVideoDetails).toHaveBeenCalledWith("video-1");
      expect(spec).toMatchObject({
        type: "video",
        id: attachmentId,
        publicUrl: "https://videodelivery.net/mock/hls.m3u8",
        presignedUrl: "https://upload.example.com/video",
        duration: 42,
        width: 1920,
        height: 1080,
        thumbnailUrl: "https://example.com/preview.jpg",
      });
    });
  });
});
