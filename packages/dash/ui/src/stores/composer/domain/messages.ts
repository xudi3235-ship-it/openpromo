import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
} from "@core/domain/content/schema/placement";

export function propagateMessageToPlacements(
  facebookFeed: FBFeedPlacementSpec[] | undefined,
  instagramFeed: IGFeedPlacementSpec[] | undefined,
  oldMessage: string,
  newMessage: string,
) {
  facebookFeed?.forEach((spec) => {
    if (spec.postSpec.message === oldMessage)
      spec.postSpec.message = newMessage;
  });
  instagramFeed?.forEach((spec) => {
    if (spec.caption == null || spec.caption === oldMessage)
      spec.caption = newMessage;
  });
}
