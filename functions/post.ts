interface Env {
	// biome-ignore lint/style/useNamingConvention: external env var
	DISCORD_API_TOKEN: string;
	// biome-ignore lint/style/useNamingConvention: external env var
	POST_ACCESS_TOKEN: string;
	// biome-ignore lint/style/useNamingConvention: external env var
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
			{ status: 500, statusText: "Internal Server Error" },
		);
	}

	// check token
	const accessTokenExpected = env.POST_ACCESS_TOKEN;
	const accessTokenActual = context.request.headers.get("Authorization");
	if (accessTokenExpected !== accessTokenActual) {
		return new Response(
			JSON.stringify({
				success: false,
				message: "トークンが間違っています",
			}),
			{ status: 401, statusText: "Unauthorized" },
		);
	}

	const data: { password: string; channelId: string; message: string } =
		await context.request.json();
	if (data.password == null || data.channelId == null || data.message == null) {
		return new Response(
			JSON.stringify({
				success: false,
				message: "パラメータ不足",
			}),
			{ status: 400, statusText: "Bad Request" },
		);
	}
	// check password
	const passwordExpected = env.PASSWORD;
	const passwordActual = data.password;
	if (passwordExpected !== passwordActual) {
		return new Response(
			JSON.stringify({
				success: false,
				message: "パスワードが間違っています",
			}),
			{ status: 401, statusText: "Unauthorized" },
		);
	}

	// post message to Discord
	const res = fetch(
		`https://discord.com/api/v10/channels/${data.channelId}/messages`,
		{
			method: "POST",
			headers: {
				// biome-ignore lint/style/useNamingConvention: HTTP header name
				Authorization: `Bot ${env.DISCORD_API_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				content: data.message,
			}),
		},
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
			{ status: 500, statusText: "Internal Server Error" },
		);
	}
	return new Response(JSON.stringify({ success: true }));
};
