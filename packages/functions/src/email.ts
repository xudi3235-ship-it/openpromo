import { Resource } from "sst";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const client = new SESv2Client();

export const handler = async ({to, subject, text}: {to: string, subject: string, text: string}) => {
    await client.send(
      new SendEmailCommand({    
        FromEmailAddress: Resource.Email.sender,
        Destination: {
          ToAddresses: [to],
        },
        Content: {
          Simple: {
            Subject: {
              Data: subject,
            },
            Body: {
              Text: {
                Data: text,
              },
            },
          },
        },
      })
    );
  
    return {
      statusCode: 200,
      body: "Sent!"
    };
  };