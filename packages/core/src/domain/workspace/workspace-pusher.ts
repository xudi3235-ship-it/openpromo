import { Pusher } from "@core/helpers/pusher";

export class WorkspacePusher extends Pusher {
  static override upgradePath = "/api/workspaces/pusher";
}
