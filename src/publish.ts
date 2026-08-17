// The write surface activity-hub reaches over a service binding. A named
// entrypoint has no public URL and no caller identity: holding the binding is
// the authorization, and any Worker on the account can hold one. That makes
// this method list the security boundary, so it is upsert and delete for one
// activity and nothing else. No bulk write, no truncate, no read.
import { WorkerEntrypoint } from "cloudflare:workers";
import {
  d1Store,
  deleteActivity,
  publishActivity,
  publishPowerCurve,
} from "./activity/publish";

export { ValidationError } from "./activity/publish";
export type { PowerBest, PublishedActivity } from "./activity/publish";

export class Publish extends WorkerEntrypoint<Env> {
  async publishActivity(row: unknown): Promise<void> {
    await publishActivity(d1Store(this.env.ACTIVITY_DB), row);
  }

  async publishPowerCurve(activityId: unknown, bests: unknown): Promise<void> {
    await publishPowerCurve(d1Store(this.env.ACTIVITY_DB), activityId, bests);
  }

  async deleteActivity(activityId: unknown): Promise<void> {
    await deleteActivity(d1Store(this.env.ACTIVITY_DB), activityId);
  }
}
