/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type HttpsSchemasPlatformaticDevWattpm200Alpha19Json = {
  [k: string]: unknown;
} & {
  $schema?: string;
  preload?: string;
  entrypoint?: string;
  autoload?: {
    path: string;
    exclude?: string[];
    mappings?: {
      [k: string]: {
        id: string;
        config?: string;
        useHttp?: boolean;
      };
    };
  };
  services?: {
    [k: string]: unknown;
  }[];
  web?: {
    [k: string]: unknown;
  }[];
  logger?: {
    level: (
      | ("fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent")
      | {
          [k: string]: unknown;
        }
    ) &
      string;
    transport?:
      | {
          target?: string;
          options?: {
            [k: string]: unknown;
          };
        }
      | {
          targets?: {
            target?: string;
            options?: {
              [k: string]: unknown;
            };
            level?: string;
            additionalProperties?: never;
            [k: string]: unknown;
          }[];
          options?: {
            [k: string]: unknown;
          };
        };
    pipeline?: {
      target?: string;
      options?: {
        [k: string]: unknown;
      };
    };
    [k: string]: unknown;
  };
  server?: {
    hostname?: string;
    port?: number | string;
    http2?: boolean;
    https?: {
      key:
        | string
        | {
            path?: string;
          }
        | (
            | string
            | {
                path?: string;
              }
          )[];
      cert:
        | string
        | {
            path?: string;
          }
        | (
            | string
            | {
                path?: string;
              }
          )[];
    };
  };
  restartOnError?: boolean | number;
  undici?: {
    agentOptions?: {
      [k: string]: unknown;
    };
    interceptors?:
      | UndiciInterceptor[]
      | {
          Client?: UndiciInterceptor[];
          Pool?: UndiciInterceptor[];
          Agent?: UndiciInterceptor[];
          [k: string]: unknown;
        };
    [k: string]: unknown;
  };
  watch?: boolean | string;
  managementApi?:
    | boolean
    | string
    | {
        logs?: {
          maxSize?: number;
        };
      };
  metrics?:
    | boolean
    | {
        port?: number | string;
        hostname?: string;
        endpoint?: string;
        auth?: {
          username: string;
          password: string;
        };
        labels?: {
          [k: string]: string;
        };
      };
  telemetry?: OpenTelemetry;
  inspectorOptions?: {
    host?: string;
    port?: number;
    breakFirstLine?: boolean;
    watchDisabled?: boolean;
    [k: string]: unknown;
  };
};

export interface UndiciInterceptor {
  module: string;
  options: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
export interface OpenTelemetry {
  /**
   * The name of the service. Defaults to the folder name if not specified.
   */
  serviceName: string;
  /**
   * The version of the service (optional)
   */
  version?: string;
  /**
   * An array of paths to skip when creating spans. Useful for health checks and other endpoints that do not need to be traced.
   */
  skip?: {
    /**
     * The path to skip. Can be a string or a regex.
     */
    path?: string;
    /**
     * HTTP method to skip
     */
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
    [k: string]: unknown;
  }[];
  exporter?:
    | {
        type?: "console" | "otlp" | "zipkin" | "memory";
        /**
         * Options for the exporter. These are passed directly to the exporter.
         */
        options?: {
          /**
           * The URL to send the traces to. Not used for console or memory exporters.
           */
          url?: string;
          /**
           * Headers to send to the exporter. Not used for console or memory exporters.
           */
          headers?: {
            [k: string]: unknown;
          };
          [k: string]: unknown;
        };
        additionalProperties?: never;
        [k: string]: unknown;
      }[]
    | {
        type?: "console" | "otlp" | "zipkin" | "memory";
        /**
         * Options for the exporter. These are passed directly to the exporter.
         */
        options?: {
          /**
           * The URL to send the traces to. Not used for console or memory exporters.
           */
          url?: string;
          /**
           * Headers to send to the exporter. Not used for console or memory exporters.
           */
          headers?: {
            [k: string]: unknown;
          };
          [k: string]: unknown;
        };
        additionalProperties?: never;
        [k: string]: unknown;
      };
}