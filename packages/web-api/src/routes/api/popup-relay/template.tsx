/** @jsxImportSource hono/jsx */
import scriptRaw from "./script.raw.js";

export function PopupRelay({ message }: { message: string }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>OpenPromo Popup Relay</title>
      </head>
      <body>
        <p>{message}</p>
        {/** biome-ignore lint/security/noDangerouslySetInnerHtml: script is provided by the server */}
        <script dangerouslySetInnerHTML={{ __html: scriptRaw }}></script>
      </body>
    </html>
  );
}
