interface Env {
  DISCORD_API_TOKEN: string;
  POST_ACCESS_TOKEN: string;
  PASSWORD: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const env = context.env;
  if (
    env.DISCORD_API_TOKEN == null ||
    env.POST_ACCESS_TOKEN == null ||
    env.PASSWORD == null
  ) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "サーバ設定エラー",
      }),
      { status: 500, statusText: "Internal Server Error" }
    );
  }

  // check token
  const access_token_expected = env.POST_ACCESS_TOKEN;
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

  const data = await context.request.json();
  if (
    data.password == null ||
    data.channel_id == null ||
    data.message == null
  ) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "パラメータ不足",
      }),
      { status: 400, statusText: "Bad Request" }
    );
  }
  // check password
  const password_expected = env.PASSWORD;
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
  const res = fetch(
    `https://discord.com/api/v10/channels/${data.channel_id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${env.DISCORD_API_TOKEN}`,
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
