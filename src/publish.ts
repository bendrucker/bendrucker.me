// The write surface activity-hub reaches over a service binding. A named
// entrypoint has no public URL and no caller identity: holding the binding is
// the authorization, and any Worker on the account can hold one. That makes
// this method list the security boundary, so it is upsert, update, and delete
// for one activity and nothing else. An update sets only the whitelisted scalar
// columns of a row that already exists. No bulk write, no truncate, no read.
import { WorkerEntrypoint } from "cloudflare:workers";
import {
  deleteActivity,
  updateActivity,
  publishActivity,
  publishPowerCurve,
} from "./activity/publish";
import { d1Store } from "./activity/store";

export { ValidationError } from "./activity/publish";
export type {
  ActivityUpdate,
  PowerBest,
  PublishedActivity,
} from "./activity/publish";

export class Publish extends WorkerEntrypoint<Env> {
  async publishActivity(row: unknown): Promise<void> {
    await publishActivity(d1Store(this.env.ACTIVITY_DB), row);
  }

  async publishPowerCurve(activityId: unknown, bests: unknown): Promise<void> {
    await publishPowerCurve(d1Store(this.env.ACTIVITY_DB), activityId, bests);
  }

  async updateActivity(activityId: unknown, fields: unknown): Promise<void> {
    await updateActivity(d1Store(this.env.ACTIVITY_DB), activityId, fields);
  }

  async deleteActivity(activityId: unknown): Promise<void> {
    await deleteActivity(d1Store(this.env.ACTIVITY_DB), activityId);
  }
}
