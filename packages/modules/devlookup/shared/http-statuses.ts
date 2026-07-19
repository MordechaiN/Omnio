/** The HTTP status registry — code, name, and the i18n key of its one-liner. */
export interface HttpStatus {
  code: number;
  name: string;
}

export const HTTP_STATUSES: HttpStatus[] = [
  { code: 100, name: "Continue" },
  { code: 101, name: "Switching Protocols" },
  { code: 200, name: "OK" },
  { code: 201, name: "Created" },
  { code: 202, name: "Accepted" },
  { code: 204, name: "No Content" },
  { code: 206, name: "Partial Content" },
  { code: 301, name: "Moved Permanently" },
  { code: 302, name: "Found" },
  { code: 303, name: "See Other" },
  { code: 304, name: "Not Modified" },
  { code: 307, name: "Temporary Redirect" },
  { code: 308, name: "Permanent Redirect" },
  { code: 400, name: "Bad Request" },
  { code: 401, name: "Unauthorized" },
  { code: 402, name: "Payment Required" },
  { code: 403, name: "Forbidden" },
  { code: 404, name: "Not Found" },
  { code: 405, name: "Method Not Allowed" },
  { code: 406, name: "Not Acceptable" },
  { code: 408, name: "Request Timeout" },
  { code: 409, name: "Conflict" },
  { code: 410, name: "Gone" },
  { code: 411, name: "Length Required" },
  { code: 412, name: "Precondition Failed" },
  { code: 413, name: "Content Too Large" },
  { code: 415, name: "Unsupported Media Type" },
  { code: 416, name: "Range Not Satisfiable" },
  { code: 418, name: "I'm a teapot" },
  { code: 422, name: "Unprocessable Content" },
  { code: 425, name: "Too Early" },
  { code: 426, name: "Upgrade Required" },
  { code: 428, name: "Precondition Required" },
  { code: 429, name: "Too Many Requests" },
  { code: 431, name: "Request Header Fields Too Large" },
  { code: 451, name: "Unavailable For Legal Reasons" },
  { code: 500, name: "Internal Server Error" },
  { code: 501, name: "Not Implemented" },
  { code: 502, name: "Bad Gateway" },
  { code: 503, name: "Service Unavailable" },
  { code: 504, name: "Gateway Timeout" },
  { code: 505, name: "HTTP Version Not Supported" },
  { code: 507, name: "Insufficient Storage" },
  { code: 508, name: "Loop Detected" },
  { code: 511, name: "Network Authentication Required" },
];

export function statusClass(code: number): "1xx" | "2xx" | "3xx" | "4xx" | "5xx" {
  return `${Math.floor(code / 100)}xx` as "1xx" | "2xx" | "3xx" | "4xx" | "5xx";
}
