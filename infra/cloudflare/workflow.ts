/** biome-ignore-all lint/correctness/noUnusedFunctionParameters: valid */
/** biome-ignore-all lint/style/noNonNullAssertion: valid */

interface WorkflowInputs {
  name: string;
  accountId: string;
  apiToken: string;
  className: string;
  scriptName?: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

interface WorkflowStep {
  name: string;
  type: "step" | "sleep";
  config?: {
    retries?: {
      limit: number;
      delay: string;
      backoff?: "linear" | "exponential";
    };
    timeout?: string;
  };
}

interface WorkflowConfig {
  name: string;
  class_name: string;
  script_name?: string;
  parameters?: Record<string, unknown>;
  steps?: WorkflowStep[];
}

interface WorkflowInstanceStatus {
  id: string;
  status: string;
  created_on: string;
  modified_on: string;
  output?: unknown;
  error?: string;
}

class WorkflowProvider
  implements $util.dynamic.ResourceProvider<WorkflowInputs, WorkflowInputs>
{
  async create(props: WorkflowInputs) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${props.accountId}/workflows/${props.name}`;

    const workflowConfig: WorkflowConfig = {
      name: props.name,
      class_name: props.className,
      script_name: props.scriptName || props.name,
      parameters: props.parameters || {},
    };

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${props.apiToken}`,
      },
      body: JSON.stringify(workflowConfig),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create workflow: ${response.status} ${errorText}`,
      );
    }

    const result = await response.json();

    return {
      id: props.name,
      outs: {
        ...props,
        workflowId: result.result?.id || props.name,
        createdOn: result.result?.created_on,
        modifiedOn: result.result?.modified_on,
      },
    };
  }

  async update(id: string, oldProps: WorkflowInputs, newProps: WorkflowInputs) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${newProps.accountId}/workflows/${id}`;

    const workflowConfig: WorkflowConfig = {
      name: newProps.name,
      class_name: newProps.className,
      script_name: newProps.scriptName || newProps.name,
      parameters: newProps.parameters || {},
    };

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newProps.apiToken}`,
      },
      body: JSON.stringify(workflowConfig),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update workflow: ${response.status} ${errorText}`,
      );
    }

    const result = await response.json();

    return {
      id,
      outs: {
        ...newProps,
        workflowId: result.result?.id || newProps.name,
        createdOn: result.result?.created_on,
        modifiedOn: result.result?.modified_on,
      },
    };
  }

  async delete(id: string, props: WorkflowInputs) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${props.accountId}/workflows/${id}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${props.apiToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new Error(
        `Failed to delete workflow: ${response.status} ${errorText}`,
      );
    }
  }

  async diff(id: string, olds: WorkflowInputs, news: WorkflowInputs) {
    const { isDeepStrictEqual } = await import("node:util");
    const changes = !isDeepStrictEqual(olds, news);
    return { changes };
  }
}

type Primitive = string | number | boolean | null | undefined;
export type Input<T> = T extends Primitive
  ? $util.Input<T>
  : T extends (infer U)[]
    ? Input<U>[]
    : { [K in keyof T]: Input<T[K]> };

export interface CloudflareWorkflowProps {
  name: string;
  accountId: string;
  apiToken: string;
  className: string;
  scriptName?: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export class CloudflareWorkflow extends $util.dynamic.Resource {
  public declare readonly name: $util.Output<string>;
  public declare readonly accountId: $util.Output<string>;
  public declare readonly className: $util.Output<string>;
  public declare readonly scriptName: $util.Output<string>;
  public declare readonly workflowId: $util.Output<string>;
  public declare readonly createdOn: $util.Output<string>;
  public declare readonly modifiedOn: $util.Output<string>;
  public declare readonly apiToken: $util.Output<string>;

  constructor(
    name: string,
    props: Input<CloudflareWorkflowProps>,
    opts?: $util.CustomResourceOptions,
  ) {
    super(new WorkflowProvider(), name, props, opts);
  }

  /**
   * Create a new workflow instance
   */
  createInstance(parameters?: Record<string, unknown>) {
    return $util
      .all([this.accountId, this.name, this.apiToken])
      .apply(async ([accountId, workflowName, apiToken]) => {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workflows/${workflowName}/instances`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify({ parameters: parameters || {} }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to create workflow instance: ${response.status} ${errorText}`,
          );
        }

        const result = await response.json();
        return result.result.id;
      });
  }

  /**
   * Get workflow instance status
   */
  getInstanceStatus(instanceId: string) {
    return $util
      .all([this.accountId, this.name, this.apiToken])
      .apply(async ([accountId, workflowName, apiToken]) => {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workflows/${workflowName}/instances/${instanceId}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to get workflow instance status: ${response.status} ${errorText}`,
          );
        }

        const result = await response.json();
        return result.result as WorkflowInstanceStatus;
      });
  }

  /**
   * List all instances of this workflow
   */
  listInstances() {
    return $util
      .all([this.accountId, this.name, this.apiToken])
      .apply(async ([accountId, workflowName, apiToken]) => {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workflows/${workflowName}/instances`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to list workflow instances: ${response.status} ${errorText}`,
          );
        }

        const result = await response.json();
        return result.result as WorkflowInstanceStatus[];
      });
  }

  /**
   * Send an event to a workflow instance
   */
  sendEvent(instanceId: string, eventType: string, eventData?: unknown) {
    return $util
      .all([this.accountId, this.name, this.apiToken])
      .apply(async ([accountId, workflowName, apiToken]) => {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workflows/${workflowName}/instances/${instanceId}/events/${eventType}`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify(eventData || {}),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to send event to workflow instance: ${response.status} ${errorText}`,
          );
        }

        const result = await response.json();
        return result.result;
      });
  }

  /**
   * Change the status of a workflow instance
   */
  changeInstanceStatus(
    instanceId: string,
    status: "pause" | "resume" | "terminate",
  ) {
    return $util
      .all([this.accountId, this.name, this.apiToken])
      .apply(async ([accountId, workflowName, apiToken]) => {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workflows/${workflowName}/instances/${instanceId}/status`;

        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to change workflow instance status: ${response.status} ${errorText}`,
          );
        }

        const result = await response.json();
        return result.result;
      });
  }
}
