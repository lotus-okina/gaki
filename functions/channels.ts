interface Env {
  DISCORD_API_TOKEN: string;
  CHANNELS_ACCESS_TOKEN: string;
  GUILD_ID: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const env = context.env;
  if (
    env.DISCORD_API_TOKEN == null ||
    env.CHANNELS_ACCESS_TOKEN == null ||
    env.GUILD_ID == null
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
  const access_token_expected = context.env.CHANNELS_ACCESS_TOKEN;
  const access_token_actual = context.request.headers.get("Authorization");
  if (access_token_expected !== access_token_actual) {
    return new Response(null, { status: 401, statusText: "Unauthorized" });
  }

  // fetch channels from Discord
  const guild_id = context.env.GUILD_ID;
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guild_id}/channels`,
    {
      method: "GET",
      headers: {
        Authorization: `Bot ${context.env.DISCORD_API_TOKEN}`,
      },
    }
  );
  const json: any[] = await res.json();

  const allowedTypes = [
    0, // GUILD_TEXT
    11, // PUBLIC_THREAD
    12, // PRIVATE_THREAD
  ];
  const channel_objects = json.map(({ id, name, type }) => {
    return { id, name, type };
  });
  const channel_map = {};
  for (let obj of channel_objects) {
    channel_map[obj.id] = obj.name;
  }

  const res2 = await fetch(
    `https://discord.com/api/v10/guilds/${guild_id}/threads/active`,
    {
      method: "GET",
      headers: {
        Authorization: `Bot ${context.env.DISCORD_API_TOKEN}`,
      },
    }
  );
  const json2: any = await res2.json();
  const thread_objects = json2.threads.map(({ id, name, type, parent_id }) => {
    return { id, name, type, parent_id };
  });

  let list: { id: string; name: string; thread: boolean }[] = [];
  for (const channel of channel_objects) {
    if (allowedTypes.includes(channel.type)) {
      list.push({ id: channel.id, name: channel.name, thread: false });
    }
  }
  for (const thread of thread_objects) {
    if (allowedTypes.includes(thread.type)) {
      let name: string;
      if (thread.parent_id in channel_map) {
        name = channel_map[thread.parent_id] + " / " + thread.name;
      } else {
        name = thread.name;
      }
      list.push({ id: thread.id, name: name, thread: true });
    }
  }

  list.sort((a, b) => {
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return 0;
  });

  return new Response(JSON.stringify({ channels: list }));
};
