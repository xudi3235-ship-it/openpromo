// not in use yet.
export const api = async (
  path: string,
  accessToken: string,
  fields: string[],
) => {
  const r = await fetch(
    `https://graph.facebook.com/v23.0/${path}?access_token=${accessToken}&fields=${fields.join(",")}`,
    {
      method: "POST",
    },
  );
  return await r.json();
};
