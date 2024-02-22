interface Env {
  DISCORD_API_TOKEN: string;
  POST_ACCESS_TOKEN: string;
  PASSWORD: string;
}

interface Data extends Record<string, string> {
  channel_id: string;
  message: string;
  password: string;
}

export const onRequestPost: PagesFunction<Env, any, Data> = async (context) => {
  // check token
  const access_token_expected = context.env.POST_ACCESS_TOKEN;
  const access_token_actual = context.request.headers.get("Authorization");
  if (access_token_expected !== access_token_actual) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "トークンが間違っています",
      }),
      { status: 401, statusText: "Unauthorized" }
    );
  }

  const data = context.data;
  // check password
  const password_expected = context.env.PASSWORD;
  const password_actual = data.password;
  if (password_expected !== password_actual) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "パスワードが間違っています",
      }),
      { status: 401, statusText: "Unauthorized" }
    );
  }

  // post message to Discord
  console.log(data);
  const res = fetch(
    `https://discord.com/api/v10/channels/${data.channel_id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${context.env.DISCORD_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: data.message,
      }),
    }
  );

  const resp = await res;
  if (!resp.ok) {
    console.error(resp.status, resp.statusText);
    console.error(await resp.json());
    return new Response(
      JSON.stringify({
        success: false,
        message: "メッセージの送信に失敗しました",
      }),
      { status: 500, statusText: "Internal Server Error" }
    );
  }
  return new Response(JSON.stringify({ success: true }));
};
