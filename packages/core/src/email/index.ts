import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { Log } from "../util/log";

export namespace Email {
  const log = Log.create({ namespace: "email" });
  export const Client = new SESv2Client({});

  export type Attachment = {
    filename: string;
    content: string;
    contentType?: string;
  };

  export async function send(
    from: string,
    to: string | string[],
    subject: string,
    body: string,
    options?: {
      attachments?: Attachment[];
      html?: string;
    },
  ) {
    // FIXME: we're moving off aws SES, we need to use 3P providers
    // for transactional/marketing, e.g. EmailOctopus.
    // from = `${from}@${Resource.Email.sender}`;
    log.info("sending email", { subject, from, to });

    // Convert to array if single string
    const toAddresses = Array.isArray(to) ? to : [to];

    // For SESv2, we need to manually construct the MIME message for attachments
    if (options?.attachments && options.attachments.length > 0) {
      // Create a unique boundary for the multipart message
      const boundary = `boundary-${Date.now().toString(16)}`;

      let rawMessageContent = [
        `From: OpenPromo <${from}>`,
        `To: ${toAddresses.join(", ")}`,
        `Subject: ${subject}`,
        "MIME-Version: 1.0",
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        "Content-Type: text/plain; charset=UTF-8",
        "",
        body,
        options?.html,
        "",
      ];

      // Add each attachment
      for (const attachment of options?.attachments ?? []) {
        const contentType =
          attachment.contentType ||
          (attachment.filename.endsWith(".csv")
            ? "text/csv"
            : "application/octet-stream");

        rawMessageContent = rawMessageContent.concat([
          `--${boundary}`,
          `Content-Type: ${contentType}; name="${attachment.filename}"`,
          "Content-Transfer-Encoding: base64",
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          "",
          Buffer.from(attachment.content).toString("base64"),
          "",
        ]);
      }

      // Close the MIME boundary
      rawMessageContent.push(`--${boundary}--`);

      // Create raw message
      const rawMessage = rawMessageContent.join("\r\n");

      await Client.send(
        new SendEmailCommand({
          Destination: {
            ToAddresses: toAddresses,
          },
          FromEmailAddress: `OpenPromo <${from}>`,
          Content: {
            Raw: {
              Data: Buffer.from(rawMessage),
            },
          },
        }),
      );
    } else {
      // Use simple format if no attachments
      await Client.send(
        new SendEmailCommand({
          Destination: {
            ToAddresses: toAddresses,
          },
          FromEmailAddress: `OpenPromo <${from}>`,
          Content: {
            Simple: {
              Subject: {
                Data: subject,
              },
              Body: {
                Text: {
                  Data: body,
                },
              },
            },
          },
        }),
      );
    }
  }
}
